package com.yourcompany.billing;

import com.yourcompany.billing.dto.*;
import com.yourcompany.billing.entity.*;
import com.yourcompany.billing.entity.enums.*;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.repository.*;
import com.yourcompany.billing.service.InvoiceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceConcessionTest {

    @Mock
    private InvoiceRepository invoiceRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private StockRepository stockRepository;
    @Mock
    private StockMovementRepository stockMovementRepository;
    @Mock
    private InvoiceSequenceRepository invoiceSequenceRepository;
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private CompanySettingRepository companySettingRepository;
    @Mock
    private AuditLogRepository auditLogRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InvoiceService invoiceService;

    private Employee activeBiller;
    private User billerUser;
    private User managerUser;
    private Product productA;
    private Stock stockA;
    private Customer b2bCustomerWith5PctConcession;
    private CompanySetting companySetting;
    private InvoiceSequence invoiceSequence;

    @BeforeEach
    void setUp() {
        Role billerRole = Role.builder().id(3L).name("BILLER").build();
        Role managerRole = Role.builder().id(2L).name("MANAGER").build();

        activeBiller = Employee.builder()
                .id(1L)
                .employeeCode("EMP-001")
                .firstName("Priya")
                .lastName("Sharma")
                .isActive(true)
                .build();

        billerUser = User.builder()
                .id(2L)
                .username("cashier1")
                .employee(activeBiller)
                .role(billerRole)
                .isActive(true)
                .build();

        managerUser = User.builder()
                .id(3L)
                .username("manager")
                .employee(activeBiller)
                .role(managerRole)
                .isActive(true)
                .build();

        TaxRate gst18 = TaxRate.builder()
                .id(1L)
                .name("GST 18%")
                .taxType("GST")
                .cgstRate(new BigDecimal("9.00"))
                .sgstRate(new BigDecimal("9.00"))
                .igstRate(new BigDecimal("18.00"))
                .cessRate(BigDecimal.ZERO)
                .isActive(true)
                .build();

        productA = Product.builder()
                .id(10L)
                .sku("PROD-001")
                .name("Industrial Printer Cable")
                .sellingPrice(new BigDecimal("1000.00"))
                .costPrice(new BigDecimal("600.00"))
                .taxRate(gst18)
                .trackStock(true)
                .isActive(true)
                .build();

        stockA = Stock.builder()
                .id(100L)
                .product(productA)
                .quantity(new BigDecimal("50.000"))
                .version(0L)
                .build();

        b2bCustomerWith5PctConcession = Customer.builder()
                .id(20L)
                .customerCode("CUST-0020")
                .name("Star Industries")
                .customerType(CustomerType.B2B)
                .customerSegment(CustomerSegment.LARGE)
                .gstin("29AAACG8976R1ZO")
                .gstRegistered(true)
                .defaultDiscountPercentage(new BigDecimal("5.00"))
                .isActive(true)
                .build();

        companySetting = CompanySetting.builder()
                .id(1L)
                .companyName("Test Enterprise")
                .invoicePrefix("INV")
                .build();

        invoiceSequence = InvoiceSequence.builder()
                .id(1L)
                .financialYear("2026-2027")
                .prefix("INV")
                .lastNumber(10L)
                .build();
    }

    @Test
    @DisplayName("1. Automatic Customer Concession & GST Calculation (5% B2B discount)")
    void testAutomaticCustomerConcession() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(customerRepository.findById(20L)).thenReturn(Optional.of(b2bCustomerWith5PctConcession));
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.of(billerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> {
            Invoice inv = i.getArgument(0);
            inv.setId(999L);
            return inv;
        });

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .customerId(20L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(new BigDecimal("2.000"))
                                // discountPercentage not passed; should automatically adopt 5.00% concession
                                .build()
                ))
                .payments(List.of(
                        CreatePaymentDto.builder()
                                .paymentMethod(PaymentMethod.UPI)
                                .amount(new BigDecimal("2242.00"))
                                .build()
                ))
                .build();

        InvoiceResponse response = invoiceService.createInvoice(request, "cashier1");

        assertNotNull(response);
        // Base for 2 items = 2000.00
        assertEquals(new BigDecimal("2000.00"), response.getSubtotal());
        // 5% concession of 2000 = 100.00 discount
        assertEquals(new BigDecimal("100.00"), response.getDiscountTotal());
        // Taxable = 2000 - 100 = 1900.00
        assertEquals(new BigDecimal("1900.00"), response.getTaxableAmount());
        // 9% CGST of 1900 = 171.00
        assertEquals(new BigDecimal("171.00"), response.getCgstTotal());
        // 9% SGST of 1900 = 171.00
        assertEquals(new BigDecimal("171.00"), response.getSgstTotal());
        // Grand total = 1900 + 171 + 171 = 2242.00
        assertEquals(new BigDecimal("2242.00"), response.getGrandTotal());

        // Stock deduction check
        assertEquals(new BigDecimal("48.000"), stockA.getQuantity());
        verify(stockRepository, times(1)).saveAll(any());
        verify(stockMovementRepository, times(1)).saveAll(any());
    }

    @Test
    @DisplayName("2. Unauthorized Discount Override: Biller cannot exceed configured customer concession")
    void testBillerCannotExceedConcession() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(customerRepository.findById(20L)).thenReturn(Optional.of(b2bCustomerWith5PctConcession));
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.of(billerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .customerId(20L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .discountPercentage(new BigDecimal("15.00")) // Exceeds 5% concession!
                                .build()
                ))
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                invoiceService.createInvoice(request, "cashier1"));

        assertTrue(ex.getMessage().contains("exceeding authorized customer concession"));
    }

    @Test
    @DisplayName("3. Authorized Override: Manager can apply higher discount override")
    void testManagerCanOverrideDiscount() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(customerRepository.findById(20L)).thenReturn(Optional.of(b2bCustomerWith5PctConcession));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(managerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> {
            Invoice inv = i.getArgument(0);
            inv.setId(1001L);
            return inv;
        });

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .customerId(20L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .discountPercentage(new BigDecimal("20.00")) // Manager authorized 20%
                                .build()
                ))
                .build();

        InvoiceResponse response = invoiceService.createInvoice(request, "manager");

        assertNotNull(response);
        assertEquals(new BigDecimal("200.00"), response.getDiscountTotal());
        assertEquals(new BigDecimal("800.00"), response.getTaxableAmount());
    }

    @Test
    @DisplayName("4. Walk-in billing without customer works with zero concession")
    void testWalkInCustomerBilling() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.of(billerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> {
            Invoice inv = i.getArgument(0);
            inv.setId(1002L);
            return inv;
        });

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .customerId(null) // Walk-in
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .build()
                ))
                .build();

        InvoiceResponse response = invoiceService.createInvoice(request, "cashier1");

        assertNotNull(response);
        assertEquals(BigDecimal.ZERO, response.getDiscountTotal());
        assertEquals(new BigDecimal("1000.00"), response.getTaxableAmount());
        assertEquals("Walk-in Customer", response.getCustomerName());
    }

    @Test
    @DisplayName("5. Rejects negative discount percentage")
    void testRejectsNegativeDiscount() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(managerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .discountPercentage(new BigDecimal("-10.00"))
                                .build()
                ))
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                invoiceService.createInvoice(request, "manager"));

        assertTrue(ex.getMessage().contains("must be between 0.00% and 100.00%"));
    }

    @Test
    @DisplayName("6. Rejects discount percentage greater than 100%")
    void testRejectsDiscountOver100() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(managerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .discountPercentage(new BigDecimal("105.00"))
                                .build()
                ))
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                invoiceService.createInvoice(request, "manager"));

        assertTrue(ex.getMessage().contains("must be between 0.00% and 100.00%"));
    }

    @Test
    @DisplayName("7. Rejects negative unit price")
    void testRejectsNegativeUnitPrice() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(userRepository.findByUsername("manager")).thenReturn(Optional.of(managerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .unitPrice(new BigDecimal("-50.00"))
                                .build()
                ))
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                invoiceService.createInvoice(request, "manager"));

        assertTrue(ex.getMessage().contains("Unit price cannot be negative"));
    }

    @Test
    @DisplayName("8. Historical Immutability: Past invoice is unaffected when customer concession changes later")
    void testHistoricalInvoiceUnaffectedByCustomerConcessionChange() {
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(activeBiller));
        when(customerRepository.findById(20L)).thenReturn(Optional.of(b2bCustomerWith5PctConcession));
        when(userRepository.findByUsername("cashier1")).thenReturn(Optional.of(billerUser));
        when(companySettingRepository.findSingleton()).thenReturn(Optional.of(companySetting));
        when(invoiceSequenceRepository.findByFinancialYearAndPrefixForUpdate(any(), any()))
                .thenReturn(Optional.of(invoiceSequence));
        when(stockRepository.findAllByProductIdInOrderByIdForUpdate(anyList())).thenReturn(List.of(stockA));
        when(productRepository.findAllById(anyList())).thenReturn(List.of(productA));

        // 1. Create invoice with 5% customer concession
        when(invoiceRepository.save(any(Invoice.class))).thenAnswer(i -> {
            Invoice inv = i.getArgument(0);
            inv.setId(2001L);
            return inv;
        });

        CreateInvoiceRequest request = CreateInvoiceRequest.builder()
                .employeeId(1L)
                .customerId(20L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .build()
                ))
                .build();

        InvoiceResponse originalInvoice = invoiceService.createInvoice(request, "cashier1");

        // Verify initial snapshot: 5% of 1000 = 50.00 discount, taxable 950.00
        assertEquals(new BigDecimal("50.00"), originalInvoice.getDiscountTotal());
        assertEquals(new BigDecimal("950.00"), originalInvoice.getTaxableAmount());
        assertEquals(new BigDecimal("1121.00"), originalInvoice.getGrandTotal());

        // 2. Customer concession is now updated to 10% in master catalog
        b2bCustomerWith5PctConcession.setDefaultDiscountPercentage(new BigDecimal("10.00"));

        // 3. Retrieve historical invoice from repository
        Invoice historicalStoredInvoice = Invoice.builder()
                .id(2001L)
                .invoiceNumber("INV/2026-2027/00011")
                .customer(b2bCustomerWith5PctConcession)
                .employee(activeBiller)
                .subtotal(new BigDecimal("1000.00"))
                .discountTotal(new BigDecimal("50.00"))
                .taxableAmount(new BigDecimal("950.00"))
                .cgstTotal(new BigDecimal("85.50"))
                .sgstTotal(new BigDecimal("85.50"))
                .grandTotal(new BigDecimal("1121.00"))
                .items(List.of(
                        InvoiceItem.builder()
                                .id(501L)
                                .product(productA)
                                .productName("Industrial Printer Cable")
                                .sku("PROD-001")
                                .quantity(BigDecimal.ONE)
                                .unitPrice(new BigDecimal("1000.00"))
                                .discountPercentage(new BigDecimal("5.00")) // Immutable snapshot!
                                .discountAmount(new BigDecimal("50.00"))
                                .taxableAmount(new BigDecimal("950.00"))
                                .cgstAmount(new BigDecimal("85.50"))
                                .sgstAmount(new BigDecimal("85.50"))
                                .lineTotal(new BigDecimal("1121.00"))
                                .build()
                ))
                .build();

        when(invoiceRepository.findById(2001L)).thenReturn(Optional.of(historicalStoredInvoice));

        InvoiceResponse retrieved = invoiceService.getInvoiceById(2001L);

        // Historical invoice values must remain identical to snapshot!
        assertEquals(new BigDecimal("50.00"), retrieved.getDiscountTotal());
        assertEquals(new BigDecimal("950.00"), retrieved.getTaxableAmount());
        assertEquals(new BigDecimal("1121.00"), retrieved.getGrandTotal());
        assertEquals(new BigDecimal("5.00"), retrieved.getItems().get(0).getDiscountPercentage());
        assertEquals(new BigDecimal("50.00"), retrieved.getItems().get(0).getDiscountAmount());
    }

    @Test
    @DisplayName("9. Offline Sync: Replayed offline invoice is idempotent (ALREADY_SYNCED)")
    void testOfflineSyncIdempotency() {
        String clientOfflineId = "OFFLINE-TEST-UUID-999";
        String marker = "[OfflineID: " + clientOfflineId + "]";

        Invoice existingInvoice = Invoice.builder()
                .id(888L)
                .invoiceNumber("INV/2026-2027/00088")
                .notes(marker)
                .employee(activeBiller)
                .subtotal(new BigDecimal("1000.00"))
                .discountTotal(new BigDecimal("50.00"))
                .taxableAmount(new BigDecimal("950.00"))
                .grandTotal(new BigDecimal("1121.00"))
                .build();

        when(invoiceRepository.findByOfflineMarker(marker)).thenReturn(Optional.of(existingInvoice));

        SyncInvoiceRequest request = SyncInvoiceRequest.builder()
                .clientOfflineId(clientOfflineId)
                .employeeId(1L)
                .items(List.of(
                        CreateInvoiceItemDto.builder()
                                .productId(10L)
                                .quantity(BigDecimal.ONE)
                                .build()
                ))
                .build();

        SyncItemResult result = invoiceService.syncOfflineInvoice(request, "cashier1");

        assertNotNull(result);
        assertEquals("ALREADY_SYNCED", result.getStatus());
        assertEquals("INV/2026-2027/00088", result.getServerInvoiceNumber());
        assertEquals(888L, result.getServerInvoiceId());
        // Must not call invoice save or sequence generation
        verify(invoiceRepository, never()).save(any());
        verify(invoiceSequenceRepository, never()).findByFinancialYearAndPrefixForUpdate(any(), any());
    }
}
