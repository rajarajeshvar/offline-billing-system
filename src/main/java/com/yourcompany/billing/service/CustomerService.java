package com.yourcompany.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.billing.dto.CustomerOrderSummaryDto;
import com.yourcompany.billing.dto.CustomerSummaryDto;
import com.yourcompany.billing.dto.FrequentlyPurchasedProductDto;
import com.yourcompany.billing.entity.AuditLog;
import com.yourcompany.billing.entity.Customer;
import com.yourcompany.billing.entity.Invoice;
import com.yourcompany.billing.entity.User;
import com.yourcompany.billing.entity.enums.CustomerSegment;
import com.yourcompany.billing.entity.enums.CustomerType;
import com.yourcompany.billing.entity.enums.InvoiceStatus;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.AuditLogRepository;
import com.yourcompany.billing.repository.CustomerRepository;
import com.yourcompany.billing.repository.InvoiceItemRepository;
import com.yourcompany.billing.repository.InvoiceRepository;
import com.yourcompany.billing.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class CustomerService {

    private static final Pattern GSTIN_PATTERN = Pattern.compile("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");

    private final CustomerRepository customerRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Customer createCustomer(Customer customer, String currentUsername) {
        validateCustomerDetails(customer);

        if (customer.getCustomerCode() != null && !customer.getCustomerCode().isBlank()) {
            if (customerRepository.findByCustomerCode(customer.getCustomerCode().trim()).isPresent()) {
                throw new BusinessValidationException("Customer with code '" + customer.getCustomerCode() + "' already exists.");
            }
        } else {
            long count = customerRepository.count();
            customer.setCustomerCode(String.format("CUST-%04d", count + 1));
        }

        if (customer.getGstin() != null && !customer.getGstin().isBlank()) {
            customer.setGstin(customer.getGstin().trim().toUpperCase());
        }

        Customer saved = customerRepository.save(customer);

        recordCustomerAudit("CUSTOMER_CREATED", String.valueOf(saved.getId()), null, saved, currentUsername);
        return saved;
    }

    @Transactional
    public Customer updateCustomer(Long id, Customer incoming, String currentUsername) {
        Customer existing = getCustomerById(id);
        validateCustomerDetails(incoming);

        String oldValuesJson = serializeCustomer(existing);

        existing.setName(incoming.getName().trim());
        existing.setCustomerType(incoming.getCustomerType() != null ? incoming.getCustomerType() : CustomerType.B2C);
        existing.setCustomerSegment(incoming.getCustomerSegment() != null ? incoming.getCustomerSegment() : CustomerSegment.SMALL);
        existing.setCompanyName(incoming.getCompanyName());
        existing.setContactPerson(incoming.getContactPerson());
        existing.setPhone(incoming.getPhone());
        existing.setEmail(incoming.getEmail());
        existing.setAddressLine1(incoming.getAddressLine1());
        existing.setAddressLine2(incoming.getAddressLine2());
        existing.setCity(incoming.getCity());
        existing.setState(incoming.getState());
        existing.setStateCode(incoming.getStateCode());
        existing.setPincode(incoming.getPincode());
        existing.setShippingAddress(incoming.getShippingAddress());
        existing.setGstRegistered(Boolean.TRUE.equals(incoming.getGstRegistered()));
        existing.setNotes(incoming.getNotes());

        if (incoming.getGstin() != null && !incoming.getGstin().isBlank()) {
            existing.setGstin(incoming.getGstin().trim().toUpperCase());
        } else {
            existing.setGstin(null);
        }

        if (incoming.getDefaultDiscountPercentage() != null) {
            existing.setDefaultDiscountPercentage(incoming.getDefaultDiscountPercentage());
        }

        if (incoming.getIsActive() != null) {
            existing.setIsActive(incoming.getIsActive());
        }

        Customer updated = customerRepository.save(existing);
        recordCustomerAudit("CUSTOMER_UPDATED", String.valueOf(updated.getId()), oldValuesJson, updated, currentUsername);
        return updated;
    }

    @Transactional(readOnly = true)
    public Page<Customer> getCustomers(String query, CustomerType type, CustomerSegment segment, Pageable pageable) {
        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;
        return customerRepository.searchWithFilters(cleanQuery, type, segment, pageable);
    }

    @Transactional(readOnly = true)
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + id));
    }

    @Transactional(readOnly = true)
    public CustomerSummaryDto getCustomerSummary(Long id) {
        Customer customer = getCustomerById(id);

        long totalOrders = invoiceRepository.countByCustomerIdAndInvoiceStatusNot(id, InvoiceStatus.CANCELLED);
        BigDecimal totalSpent = invoiceRepository.sumGrandTotalByCustomerIdAndInvoiceStatusNot(id, InvoiceStatus.CANCELLED);
        if (totalSpent == null) totalSpent = BigDecimal.ZERO;

        BigDecimal averageOrderValue = BigDecimal.ZERO;
        if (totalOrders > 0) {
            averageOrderValue = totalSpent.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP);
        }

        List<Invoice> recentInvoicesEntities = invoiceRepository
                .findTop5ByCustomerIdAndInvoiceStatusNotOrderByInvoiceDateDesc(id, InvoiceStatus.CANCELLED);

        OffsetDateTime lastPurchaseDate = null;
        if (!recentInvoicesEntities.isEmpty()) {
            lastPurchaseDate = recentInvoicesEntities.get(0).getInvoiceDate();
        }

        List<CustomerOrderSummaryDto> recentInvoices = recentInvoicesEntities.stream()
                .map(inv -> CustomerOrderSummaryDto.builder()
                        .invoiceId(inv.getId())
                        .invoiceNumber(inv.getInvoiceNumber())
                        .invoiceDate(inv.getInvoiceDate())
                        .grandTotal(inv.getGrandTotal())
                        .paymentStatus(inv.getPaymentStatus() != null ? inv.getPaymentStatus().name() : "UNPAID")
                        .invoiceStatus(inv.getInvoiceStatus() != null ? inv.getInvoiceStatus().name() : "COMPLETED")
                        .itemCount(inv.getItems() != null ? inv.getItems().size() : 0)
                        .build())
                .collect(Collectors.toList());

        List<Object[]> rawTopProducts = invoiceItemRepository.findFrequentlyPurchasedProductsByCustomerId(
                id, PageRequest.of(0, 5));

        List<FrequentlyPurchasedProductDto> topProducts = new ArrayList<>();
        for (Object[] row : rawTopProducts) {
            topProducts.add(FrequentlyPurchasedProductDto.builder()
                    .productId(row[0] != null ? ((Number) row[0]).longValue() : null)
                    .productName((String) row[1])
                    .sku((String) row[2])
                    .totalQuantity(row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO)
                    .purchaseCount(row[4] != null ? ((Number) row[4]).longValue() : 0L)
                    .build());
        }

        return CustomerSummaryDto.builder()
                .customer(customer)
                .totalOrders(totalOrders)
                .totalSpent(totalSpent)
                .averageOrderValue(averageOrderValue)
                .lastPurchaseDate(lastPurchaseDate)
                .isReturningCustomer(totalOrders > 0)
                .recentInvoices(recentInvoices)
                .frequentlyPurchasedProducts(topProducts)
                .build();
    }

    private void validateCustomerDetails(Customer customer) {
        if (customer.getName() == null || customer.getName().trim().isBlank()) {
            throw new BusinessValidationException("Customer name is required.");
        }

        if (customer.getCustomerType() == null) {
            customer.setCustomerType(CustomerType.B2C);
        }
        if (customer.getCustomerSegment() == null) {
            customer.setCustomerSegment(CustomerSegment.SMALL);
        }
        if (customer.getDefaultDiscountPercentage() == null) {
            customer.setDefaultDiscountPercentage(BigDecimal.ZERO);
        }

        if (customer.getDefaultDiscountPercentage().compareTo(BigDecimal.ZERO) < 0 ||
            customer.getDefaultDiscountPercentage().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BusinessValidationException("Customer concession percentage must be between 0.00% and 100.00%.");
        }

        if (customer.getCustomerType() == CustomerType.B2B) {
            if (Boolean.TRUE.equals(customer.getGstRegistered())) {
                if (customer.getGstin() == null || customer.getGstin().trim().isBlank()) {
                    throw new BusinessValidationException("GSTIN is required for GST-registered B2B customers.");
                }
            }
            if (customer.getGstin() != null && !customer.getGstin().trim().isBlank()) {
                String gstinTrim = customer.getGstin().trim().toUpperCase();
                if (gstinTrim.length() != 15 || !GSTIN_PATTERN.matcher(gstinTrim).matches()) {
                    throw new BusinessValidationException("Invalid GSTIN format. Expected 15-character Indian GSTIN (e.g., 29AAACG8976R1ZO).");
                }
            }
        }
    }

    private void recordCustomerAudit(String action, String entityId, String oldValues, Customer customer, String currentUsername) {
        try {
            User currentUser = null;
            if (currentUsername != null) {
                currentUser = userRepository.findByUsername(currentUsername).orElse(null);
            }
            if (currentUser == null) {
                currentUser = userRepository.findAll().stream().findFirst().orElse(null);
            }

            if (currentUser != null) {
                AuditLog logEntry = AuditLog.builder()
                        .user(currentUser)
                        .action(action)
                        .entityType("CUSTOMER")
                        .entityId(entityId)
                        .oldValues(oldValues)
                        .newValues(serializeCustomer(customer))
                        .build();
                auditLogRepository.save(logEntry);
            }
        } catch (Exception e) {
            log.warn("Failed to write audit log for customer: {}", e.getMessage());
        }
    }

    private String serializeCustomer(Customer customer) {
        try {
            return String.format(
                    "{\"id\":%d,\"name\":\"%s\",\"type\":\"%s\",\"segment\":\"%s\",\"concession\":%s,\"gstin\":\"%s\"}",
                    customer.getId() != null ? customer.getId() : 0,
                    customer.getName().replace("\"", "\\\""),
                    customer.getCustomerType(),
                    customer.getCustomerSegment(),
                    customer.getDefaultDiscountPercentage(),
                    customer.getGstin() != null ? customer.getGstin() : ""
            );
        } catch (Exception e) {
            return "{}";
        }
    }
}
