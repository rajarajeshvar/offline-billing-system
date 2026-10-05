package com.yourcompany.billing.service;

import com.yourcompany.billing.dto.*;
import com.yourcompany.billing.entity.*;
import com.yourcompany.billing.entity.enums.InvoiceStatus;
import com.yourcompany.billing.entity.enums.PaymentStatus;
import com.yourcompany.billing.entity.enums.StockMovementType;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.exception.InsufficientStockException;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final InvoiceSequenceRepository invoiceSequenceRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanySettingRepository companySettingRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Executes the critical 10-step billing transaction:
     * 1. Validate request
     * 2. Concurrency-safe invoice sequence generation (SELECT ... FOR UPDATE)
     * 3. Concurrency-safe stock validation and locking (SELECT ... FOR UPDATE ORDER BY product_id)
     * 4. Build invoice header
     * 5. Build invoice items with historical immutable snapshots
     * 6. Record payments and compute payment status
     * 7. Decrement stock
     * 8. Record stock movements
     * 9. Write audit log
     * 10. Commit transaction
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public InvoiceResponse createInvoice(CreateInvoiceRequest request, String currentUsername) {
        log.info("Starting billing transaction for employee ID: {}", request.getEmployeeId());

        // 1. Resolve biller employee
        Employee biller = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with ID: " + request.getEmployeeId()));
        if (!Boolean.TRUE.equals(biller.getIsActive())) {
            throw new BusinessValidationException("Employee " + biller.getEmployeeCode() + " is inactive and cannot bill.");
        }

        // Resolve customer if provided
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + request.getCustomerId()));
        }

        // Resolve authenticated user for movement and audit logging
        User currentUser = null;
        if (currentUsername != null) {
            currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        }
        if (currentUser == null) {
            // Fallback to first available active user if running internal tasks
            currentUser = userRepository.findAll().stream().findFirst().orElse(null);
        }

        // 2. Concurrency-safe invoice number generation
        CompanySetting companySetting = companySettingRepository.findSingleton()
                .orElseThrow(() -> new ResourceNotFoundException("Company settings not configured"));

        String financialYear = calculateCurrentFinancialYear();
        String prefix = companySetting.getInvoicePrefix();

        InvoiceSequence sequence = invoiceSequenceRepository
                .findByFinancialYearAndPrefixForUpdate(financialYear, prefix)
                .orElseGet(() -> {
                    InvoiceSequence newSeq = InvoiceSequence.builder()
                            .financialYear(financialYear)
                            .prefix(prefix)
                            .lastNumber(0L)
                            .build();
                    return invoiceSequenceRepository.save(newSeq);
                });

        long allocatedNumber = sequence.getLastNumber() + 1;
        sequence.setLastNumber(allocatedNumber);
        invoiceSequenceRepository.save(sequence);

        String generatedInvoiceNumber = String.format("%s/%s/%05d", prefix, financialYear, allocatedNumber);

        // 3. Acquire locks on all involved products in deterministic sorted order to prevent deadlocks
        List<Long> productIds = request.getItems().stream()
                .map(CreateInvoiceItemDto::getProductId)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<Stock> lockedStockRows = stockRepository.findAllByProductIdInOrderByIdForUpdate(productIds);
        Map<Long, Stock> stockMap = lockedStockRows.stream()
                .collect(Collectors.toMap(s -> s.getProduct().getId(), s -> s));

        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        // 4 & 5. Build invoice items and calculate line amounts
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal taxableAmountTotal = BigDecimal.ZERO;
        BigDecimal cgstTotal = BigDecimal.ZERO;
        BigDecimal sgstTotal = BigDecimal.ZERO;
        BigDecimal igstTotal = BigDecimal.ZERO;
        BigDecimal cessTotal = BigDecimal.ZERO;

        BigDecimal customerConcession = (customer != null && customer.getDefaultDiscountPercentage() != null)
                ? customer.getDefaultDiscountPercentage()
                : BigDecimal.ZERO;

        List<InvoiceItem> invoiceItems = new ArrayList<>();
        List<StockMovement> stockMovements = new ArrayList<>();

        for (CreateInvoiceItemDto itemDto : request.getItems()) {
            Product product = productMap.get(itemDto.getProductId());
            if (product == null) {
                throw new ResourceNotFoundException("Product not found with ID: " + itemDto.getProductId());
            }
            if (!Boolean.TRUE.equals(product.getIsActive())) {
                throw new BusinessValidationException("Product '" + product.getName() + "' is inactive and cannot be billed.");
            }

            BigDecimal quantity = itemDto.getQuantity();

            // Stock check
            if (Boolean.TRUE.equals(product.getTrackStock())) {
                Stock stock = stockMap.get(product.getId());
                if (stock == null || stock.getQuantity().compareTo(quantity) < 0) {
                    BigDecimal available = stock != null ? stock.getQuantity() : BigDecimal.ZERO;
                    throw new InsufficientStockException(product.getId(), product.getName(), quantity, available);
                }

                // Prepare stock decrement and movement ledger
                BigDecimal qtyBefore = stock.getQuantity();
                BigDecimal qtyAfter = qtyBefore.subtract(quantity);
                stock.setQuantity(qtyAfter);

                if (currentUser != null) {
                    StockMovement movement = StockMovement.builder()
                            .product(product)
                            .movementType(StockMovementType.SALE)
                            .quantity(quantity)
                            .referenceType("INVOICE")
                            .quantityBefore(qtyBefore)
                            .quantityAfter(qtyAfter)
                            .reason("Invoice sale: " + generatedInvoiceNumber)
                            .createdBy(currentUser)
                            .build();
                    stockMovements.add(movement);
                }
            }

            // Price & Tax calculation (Concession & Safety)
            BigDecimal unitPrice = itemDto.getUnitPrice();
            if (unitPrice == null) {
                unitPrice = product.getSellingPrice();
            } else if (!isManagerOrAdmin(currentUser) && unitPrice.compareTo(product.getSellingPrice()) != 0) {
                unitPrice = product.getSellingPrice();
            }
            if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessValidationException("Unit price cannot be negative.");
            }

            BigDecimal rawLineTotal = unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);

            BigDecimal discountPct = itemDto.getDiscountPercentage();
            if (discountPct == null) {
                discountPct = customerConcession;
            }

            if (discountPct.compareTo(BigDecimal.ZERO) < 0 || discountPct.compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new BusinessValidationException("Discount percentage must be between 0.00% and 100.00%.");
            }

            if (!isManagerOrAdmin(currentUser) && discountPct.compareTo(customerConcession) > 0) {
                throw new BusinessValidationException(String.format(
                        "Biller role cannot apply a discount of %.2f%% exceeding authorized customer concession of %.2f%%. Manager authorization required.",
                        discountPct, customerConcession));
            }

            BigDecimal discountAmt = rawLineTotal.multiply(discountPct)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal itemTaxableAmt = rawLineTotal.subtract(discountAmt);

            TaxRate taxRate = product.getTaxRate();
            BigDecimal cgstAmt = itemTaxableAmt.multiply(taxRate.getCgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal sgstAmt = itemTaxableAmt.multiply(taxRate.getSgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal igstAmt = itemTaxableAmt.multiply(taxRate.getIgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal cessAmt = itemTaxableAmt.multiply(taxRate.getCessRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal finalLineTotal = itemTaxableAmt.add(cgstAmt).add(sgstAmt).add(cessAmt);

            // Accumulate invoice totals
            subtotal = subtotal.add(rawLineTotal);
            discountTotal = discountTotal.add(discountAmt);
            taxableAmountTotal = taxableAmountTotal.add(itemTaxableAmt);
            cgstTotal = cgstTotal.add(cgstAmt);
            sgstTotal = sgstTotal.add(sgstAmt);
            igstTotal = igstTotal.add(igstAmt);
            cessTotal = cessTotal.add(cessAmt);

            // Create historical snapshot record
            InvoiceItem invoiceItem = InvoiceItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .sku(product.getSku())
                    .hsnCode(product.getHsnCode())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .discountPercentage(discountPct)
                    .discountAmount(discountAmt)
                    .taxRate(taxRate.getTotalTaxRate())
                    .taxableAmount(itemTaxableAmt)
                    .cgstAmount(cgstAmt)
                    .sgstAmount(sgstAmt)
                    .igstAmount(igstAmt)
                    .cessAmount(cessAmt)
                    .lineTotal(finalLineTotal)
                    .build();

            invoiceItems.add(invoiceItem);
        }

        BigDecimal roundOff = request.getRoundOff() != null ? request.getRoundOff() : BigDecimal.ZERO;
        BigDecimal grandTotal = taxableAmountTotal.add(cgstTotal).add(sgstTotal).add(cessTotal).add(roundOff);

        // 6. Payments and Payment Status
        BigDecimal paidTotal = BigDecimal.ZERO;
        List<Payment> payments = new ArrayList<>();
        if (request.getPayments() != null && !request.getPayments().isEmpty()) {
            for (CreatePaymentDto pDto : request.getPayments()) {
                paidTotal = paidTotal.add(pDto.getAmount());
                Payment payment = Payment.builder()
                        .paymentMethod(pDto.getPaymentMethod())
                        .amount(pDto.getAmount())
                        .paymentReference(pDto.getPaymentReference())
                        .notes(pDto.getNotes())
                        .build();
                payments.add(payment);
            }
        }

        PaymentStatus paymentStatus;
        if (paidTotal.compareTo(BigDecimal.ZERO) == 0) {
            paymentStatus = PaymentStatus.UNPAID;
        } else if (paidTotal.compareTo(grandTotal) >= 0) {
            paymentStatus = PaymentStatus.PAID;
        } else {
            paymentStatus = PaymentStatus.PARTIALLY_PAID;
        }

        // Assemble and save Invoice
        Invoice invoice = Invoice.builder()
                .invoiceNumber(generatedInvoiceNumber)
                .invoiceDate(OffsetDateTime.now())
                .customer(customer)
                .employee(biller)
                .subtotal(subtotal)
                .discountTotal(discountTotal)
                .taxableAmount(taxableAmountTotal)
                .cgstTotal(cgstTotal)
                .sgstTotal(sgstTotal)
                .igstTotal(igstTotal)
                .cessTotal(cessTotal)
                .roundOff(roundOff)
                .grandTotal(grandTotal)
                .paymentStatus(paymentStatus)
                .invoiceStatus(InvoiceStatus.COMPLETED)
                .notes(request.getNotes())
                .build();

        for (InvoiceItem item : invoiceItems) {
            invoice.addItem(item);
        }
        for (Payment payment : payments) {
            invoice.addPayment(payment);
        }

        Invoice savedInvoice = invoiceRepository.save(invoice);

        // Update stock in database
        stockRepository.saveAll(lockedStockRows);

        // Save stock movements with invoice ID reference
        for (StockMovement movement : stockMovements) {
            movement.setReferenceId(savedInvoice.getId());
        }
        stockMovementRepository.saveAll(stockMovements);

        // 9. Audit Log
        if (currentUser != null) {
            AuditLog auditLog = AuditLog.builder()
                    .user(currentUser)
                    .action("INVOICE_CREATED")
                    .entityType("INVOICE")
                    .entityId(String.valueOf(savedInvoice.getId()))
                    .newValues(String.format("{\"invoiceNumber\":\"%s\",\"grandTotal\":%s,\"itemsCount\":%d}",
                            savedInvoice.getInvoiceNumber(), savedInvoice.getGrandTotal(), invoiceItems.size()))
                    .build();
            auditLogRepository.save(auditLog);
        }

        log.info("Invoice {} generated successfully with ID: {}", savedInvoice.getInvoiceNumber(), savedInvoice.getId());
        return mapToResponse(savedInvoice);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public SyncItemResult syncOfflineInvoice(SyncInvoiceRequest request, String currentUsername) {
        log.info("Processing offline invoice sync for client ID: {}", request.getClientOfflineId());

        String offlineMarker = "[OfflineID: " + request.getClientOfflineId() + "]";
        Optional<Invoice> existing = invoiceRepository.findByOfflineMarker(offlineMarker);

        if (existing.isPresent()) {
            Invoice inv = existing.get();
            log.info("Offline invoice {} already synced as {}", request.getClientOfflineId(), inv.getInvoiceNumber());
            return SyncItemResult.builder()
                    .clientOfflineId(request.getClientOfflineId())
                    .serverInvoiceId(inv.getId())
                    .serverInvoiceNumber(inv.getInvoiceNumber())
                    .status("ALREADY_SYNCED")
                    .message("Invoice was previously synchronized")
                    .stockDeficitDetected(false)
                    .invoice(mapToResponse(inv))
                    .build();
        }

        boolean stockDeficitDetected = false;
        StringBuilder conflictNotes = new StringBuilder();

        Employee biller = employeeRepository.findById(request.getEmployeeId())
                .orElseGet(() -> employeeRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("No employee found for billing")));

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }

        User currentUser = null;
        if (currentUsername != null) {
            currentUser = userRepository.findByUsername(currentUsername).orElse(null);
        }
        if (currentUser == null) {
            currentUser = userRepository.findAll().stream().findFirst().orElse(null);
        }

        CompanySetting companySetting = companySettingRepository.findSingleton()
                .orElseThrow(() -> new ResourceNotFoundException("Company settings not configured"));

        String financialYear = calculateCurrentFinancialYear();
        String prefix = companySetting.getInvoicePrefix();

        InvoiceSequence sequence = invoiceSequenceRepository
                .findByFinancialYearAndPrefixForUpdate(financialYear, prefix)
                .orElseGet(() -> {
                    InvoiceSequence newSeq = InvoiceSequence.builder()
                            .financialYear(financialYear)
                            .prefix(prefix)
                            .lastNumber(0L)
                            .build();
                    return invoiceSequenceRepository.save(newSeq);
                });

        long allocatedNumber = sequence.getLastNumber() + 1;
        sequence.setLastNumber(allocatedNumber);
        invoiceSequenceRepository.save(sequence);

        String generatedInvoiceNumber = String.format("%s/%s/%05d", prefix, financialYear, allocatedNumber);

        List<Long> productIds = request.getItems().stream()
                .map(CreateInvoiceItemDto::getProductId)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<Product> products = productRepository.findAllById(productIds);
        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        BigDecimal customerConcession = (customer != null && customer.getDefaultDiscountPercentage() != null)
                ? customer.getDefaultDiscountPercentage()
                : BigDecimal.ZERO;

        List<Stock> lockedStockRows = new ArrayList<>();
        List<StockMovement> stockMovements = new ArrayList<>();
        List<InvoiceItem> invoiceItems = new ArrayList<>();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal taxableAmountTotal = BigDecimal.ZERO;
        BigDecimal cgstTotal = BigDecimal.ZERO;
        BigDecimal sgstTotal = BigDecimal.ZERO;
        BigDecimal igstTotal = BigDecimal.ZERO;
        BigDecimal cessTotal = BigDecimal.ZERO;

        for (CreateInvoiceItemDto itemDto : request.getItems()) {
            Product product = productMap.get(itemDto.getProductId());
            if (product == null) {
                throw new ResourceNotFoundException("Product not found with ID: " + itemDto.getProductId());
            }

            BigDecimal quantity = itemDto.getQuantity();

            if (Boolean.TRUE.equals(product.getTrackStock())) {
                Stock stock = stockRepository.findByProductIdForUpdate(product.getId()).orElse(null);
                if (stock != null) {
                    BigDecimal qtyBefore = stock.getQuantity();
                    BigDecimal qtyAfter;
                    if (qtyBefore.compareTo(quantity) < 0) {
                        stockDeficitDetected = true;
                        BigDecimal deficit = quantity.subtract(qtyBefore);
                        conflictNotes.append(String.format("Stock deficit on %s: requested %s, available was %s (deficit: %s). ",
                                product.getName(), quantity, qtyBefore, deficit));
                        qtyAfter = BigDecimal.ZERO;
                    } else {
                        qtyAfter = qtyBefore.subtract(quantity);
                    }

                    stock.setQuantity(qtyAfter);
                    lockedStockRows.add(stock);

                    if (currentUser != null) {
                        StockMovement movement = StockMovement.builder()
                                .product(product)
                                .movementType(StockMovementType.SALE)
                                .quantity(quantity)
                                .referenceType("INVOICE")
                                .quantityBefore(qtyBefore)
                                .quantityAfter(qtyAfter)
                                .reason("Offline sync sale: " + generatedInvoiceNumber + " (Original: " + request.getOfflineInvoiceNumber() + ")")
                                .createdBy(currentUser)
                                .build();
                        stockMovements.add(movement);
                    }
                }
            }

            BigDecimal unitPrice = itemDto.getUnitPrice() != null ? itemDto.getUnitPrice() : product.getSellingPrice();
            if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
                unitPrice = product.getSellingPrice();
            }
            BigDecimal rawLineTotal = unitPrice.multiply(quantity).setScale(2, RoundingMode.HALF_UP);

            BigDecimal discountPct = itemDto.getDiscountPercentage() != null ? itemDto.getDiscountPercentage() : customerConcession;
            if (discountPct.compareTo(BigDecimal.ZERO) < 0) discountPct = BigDecimal.ZERO;
            if (discountPct.compareTo(BigDecimal.valueOf(100)) > 0) discountPct = BigDecimal.valueOf(100);

            BigDecimal discountAmt = rawLineTotal.multiply(discountPct)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal itemTaxableAmt = rawLineTotal.subtract(discountAmt);

            TaxRate taxRate = product.getTaxRate();
            BigDecimal cgstAmt = itemTaxableAmt.multiply(taxRate.getCgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal sgstAmt = itemTaxableAmt.multiply(taxRate.getSgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal igstAmt = itemTaxableAmt.multiply(taxRate.getIgstRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal cessAmt = itemTaxableAmt.multiply(taxRate.getCessRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal finalLineTotal = itemTaxableAmt.add(cgstAmt).add(sgstAmt).add(cessAmt);

            subtotal = subtotal.add(rawLineTotal);
            discountTotal = discountTotal.add(discountAmt);
            taxableAmountTotal = taxableAmountTotal.add(itemTaxableAmt);
            cgstTotal = cgstTotal.add(cgstAmt);
            sgstTotal = sgstTotal.add(sgstAmt);
            igstTotal = igstTotal.add(igstAmt);
            cessTotal = cessTotal.add(cessAmt);

            InvoiceItem invoiceItem = InvoiceItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .sku(product.getSku())
                    .hsnCode(product.getHsnCode())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .discountPercentage(discountPct)
                    .discountAmount(discountAmt)
                    .taxRate(taxRate.getTotalTaxRate())
                    .taxableAmount(itemTaxableAmt)
                    .cgstAmount(cgstAmt)
                    .sgstAmount(sgstAmt)
                    .igstAmount(igstAmt)
                    .cessAmount(cessAmt)
                    .lineTotal(finalLineTotal)
                    .build();
            invoiceItems.add(invoiceItem);
        }

        BigDecimal calculatedTotal = taxableAmountTotal.add(cgstTotal).add(sgstTotal).add(cessTotal);
        BigDecimal roundOff = request.getRoundOff() != null ? request.getRoundOff() : BigDecimal.ZERO;
        BigDecimal grandTotal = calculatedTotal.add(roundOff).setScale(2, RoundingMode.HALF_UP);

        List<Payment> payments = new ArrayList<>();
        BigDecimal totalPaid = BigDecimal.ZERO;
        if (request.getPayments() != null) {
            for (CreatePaymentDto payDto : request.getPayments()) {
                Payment payment = Payment.builder()
                        .paymentMethod(payDto.getPaymentMethod())
                        .amount(payDto.getAmount())
                        .paymentReference(payDto.getPaymentReference())
                        .notes(payDto.getNotes())
                        .build();
                payments.add(payment);
                totalPaid = totalPaid.add(payDto.getAmount());
            }
        }

        PaymentStatus paymentStatus;
        if (totalPaid.compareTo(BigDecimal.ZERO) == 0) {
            paymentStatus = PaymentStatus.UNPAID;
        } else if (totalPaid.compareTo(grandTotal) >= 0) {
            paymentStatus = PaymentStatus.PAID;
        } else {
            paymentStatus = PaymentStatus.PARTIALLY_PAID;
        }

        StringBuilder fullNotes = new StringBuilder();
        fullNotes.append(offlineMarker).append(" ");
        if (request.getOfflineInvoiceNumber() != null) {
            fullNotes.append("[Original: ").append(request.getOfflineInvoiceNumber()).append("] ");
        }
        if (conflictNotes.length() > 0) {
            fullNotes.append("[Conflict: ").append(conflictNotes).append("] ");
        }
        if (request.getNotes() != null) {
            fullNotes.append(request.getNotes());
        }

        OffsetDateTime invoiceDate = request.getOfflineTimestamp() != null 
                ? request.getOfflineTimestamp() 
                : OffsetDateTime.now();

        Invoice invoice = Invoice.builder()
                .invoiceNumber(generatedInvoiceNumber)
                .invoiceDate(invoiceDate)
                .customer(customer)
                .employee(biller)
                .subtotal(subtotal)
                .discountTotal(discountTotal)
                .taxableAmount(taxableAmountTotal)
                .cgstTotal(cgstTotal)
                .sgstTotal(sgstTotal)
                .igstTotal(igstTotal)
                .cessTotal(cessTotal)
                .roundOff(roundOff)
                .grandTotal(grandTotal)
                .paymentStatus(paymentStatus)
                .invoiceStatus(InvoiceStatus.COMPLETED)
                .notes(fullNotes.toString().trim())
                .build();

        for (InvoiceItem item : invoiceItems) {
            invoice.addItem(item);
        }
        for (Payment payment : payments) {
            invoice.addPayment(payment);
        }

        Invoice savedInvoice = invoiceRepository.save(invoice);
        if (!lockedStockRows.isEmpty()) {
            stockRepository.saveAll(lockedStockRows);
        }
        for (StockMovement movement : stockMovements) {
            movement.setReferenceId(savedInvoice.getId());
        }
        if (!stockMovements.isEmpty()) {
            stockMovementRepository.saveAll(stockMovements);
        }

        if (currentUser != null) {
            AuditLog auditLog = AuditLog.builder()
                    .user(currentUser)
                    .action(stockDeficitDetected ? "OFFLINE_SYNC_STOCK_DEFICIT" : "OFFLINE_INVOICE_SYNCED")
                    .entityType("INVOICE")
                    .entityId(String.valueOf(savedInvoice.getId()))
                    .newValues(String.format("{\"clientOfflineId\":\"%s\",\"serverInvoiceNumber\":\"%s\",\"stockDeficit\":%b}",
                            request.getClientOfflineId(), savedInvoice.getInvoiceNumber(), stockDeficitDetected))
                    .build();
            auditLogRepository.save(auditLog);
        }

        return SyncItemResult.builder()
                .clientOfflineId(request.getClientOfflineId())
                .serverInvoiceId(savedInvoice.getId())
                .serverInvoiceNumber(savedInvoice.getInvoiceNumber())
                .status(stockDeficitDetected ? "CONFLICT_RESOLVED" : "SUCCESS")
                .message(stockDeficitDetected ? "Synced with stock deficit alert" : "Synchronized successfully")
                .stockDeficitDetected(stockDeficitDetected)
                .invoice(mapToResponse(savedInvoice))
                .build();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public SyncBatchResponse syncBatchInvoices(SyncBatchRequest batchRequest, String currentUsername) {
        List<SyncItemResult> results = new ArrayList<>();
        int successCount = 0;
        int conflictCount = 0;
        int failCount = 0;

        for (SyncInvoiceRequest req : batchRequest.getInvoices()) {
            try {
                SyncItemResult res = syncOfflineInvoice(req, currentUsername);
                results.add(res);
                if ("CONFLICT_RESOLVED".equals(res.getStatus())) {
                    conflictCount++;
                    successCount++;
                } else if ("FAILED".equals(res.getStatus())) {
                    failCount++;
                } else {
                    successCount++;
                }
            } catch (Exception ex) {
                log.error("Failed to sync offline invoice {}", req.getClientOfflineId(), ex);
                failCount++;
                results.add(SyncItemResult.builder()
                        .clientOfflineId(req.getClientOfflineId())
                        .status("FAILED")
                        .message("Sync error: " + ex.getMessage())
                        .build());
            }
        }

        return SyncBatchResponse.builder()
                .totalProcessed(batchRequest.getInvoices().size())
                .totalSucceeded(successCount)
                .totalConflicts(conflictCount)
                .totalFailed(failCount)
                .results(results)
                .build();
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long id) {
        Invoice invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with ID: " + id));
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found with number: " + invoiceNumber));
        return mapToResponse(invoice);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResponse> getInvoices(InvoiceStatus status, PaymentStatus paymentStatus,
                                            OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable) {
        if (status == null && paymentStatus == null && startDate == null && endDate == null) {
            return invoiceRepository.findAll(pageable).map(this::mapToResponse);
        }
        return invoiceRepository.findInvoicesWithFilters(status, paymentStatus, startDate, endDate, pageable)
                .map(this::mapToResponse);
    }

    private String calculateCurrentFinancialYear() {
        LocalDate today = LocalDate.now();
        int year = today.getYear();
        if (today.getMonthValue() >= 4) {
            return year + "-" + (year + 1);
        } else {
            return (year - 1) + "-" + year;
        }
    }

    private InvoiceResponse mapToResponse(Invoice invoice) {
        List<InvoiceItemResponse> items = invoice.getItems().stream()
                .map(i -> InvoiceItemResponse.builder()
                        .id(i.getId())
                        .productId(i.getProduct().getId())
                        .productName(i.getProductName())
                        .sku(i.getSku())
                        .hsnCode(i.getHsnCode())
                        .quantity(i.getQuantity())
                        .unitPrice(i.getUnitPrice())
                        .discountPercentage(i.getDiscountPercentage())
                        .discountAmount(i.getDiscountAmount())
                        .taxRate(i.getTaxRate())
                        .taxableAmount(i.getTaxableAmount())
                        .cgstAmount(i.getCgstAmount())
                        .sgstAmount(i.getSgstAmount())
                        .igstAmount(i.getIgstAmount())
                        .cessAmount(i.getCessAmount())
                        .lineTotal(i.getLineTotal())
                        .build())
                .collect(Collectors.toList());

        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceDate(invoice.getInvoiceDate())
                .customerId(invoice.getCustomer() != null ? invoice.getCustomer().getId() : null)
                .customerName(invoice.getCustomer() != null ? invoice.getCustomer().getName() : "Walk-in Customer")
                .employeeId(invoice.getEmployee().getId())
                .employeeName(invoice.getEmployee().getFullName())
                .subtotal(invoice.getSubtotal())
                .discountTotal(invoice.getDiscountTotal())
                .taxableAmount(invoice.getTaxableAmount())
                .cgstTotal(invoice.getCgstTotal())
                .sgstTotal(invoice.getSgstTotal())
                .igstTotal(invoice.getIgstTotal())
                .cessTotal(invoice.getCessTotal())
                .roundOff(invoice.getRoundOff())
                .grandTotal(invoice.getGrandTotal())
                .paymentStatus(invoice.getPaymentStatus())
                .invoiceStatus(invoice.getInvoiceStatus())
                .notes(invoice.getNotes())
                .items(items)
                .build();
    }

    private boolean isManagerOrAdmin(User user) {
        if (user == null || user.getRole() == null) return false;
        String roleName = user.getRole().getName();
        return "ADMIN".equalsIgnoreCase(roleName) || "MANAGER".equalsIgnoreCase(roleName);
    }
}

