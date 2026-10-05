package com.yourcompany.billing;

import com.yourcompany.billing.dto.CustomerSummaryDto;
import com.yourcompany.billing.entity.Customer;
import com.yourcompany.billing.entity.Invoice;
import com.yourcompany.billing.entity.InvoiceItem;
import com.yourcompany.billing.entity.enums.CustomerSegment;
import com.yourcompany.billing.entity.enums.CustomerType;
import com.yourcompany.billing.entity.enums.InvoiceStatus;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.repository.AuditLogRepository;
import com.yourcompany.billing.repository.CustomerRepository;
import com.yourcompany.billing.repository.InvoiceItemRepository;
import com.yourcompany.billing.repository.InvoiceRepository;
import com.yourcompany.billing.repository.UserRepository;
import com.yourcompany.billing.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private InvoiceItemRepository invoiceItemRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomerService customerService;

    private Customer sampleB2cCustomer;
    private Customer sampleB2bCustomer;

    @BeforeEach
    void setUp() {
        sampleB2cCustomer = Customer.builder()
                .id(1L)
                .customerCode("CUST-0001")
                .name("Ramesh Kumar")
                .customerType(CustomerType.B2C)
                .customerSegment(CustomerSegment.SMALL)
                .phone("9876543210")
                .city("Bengaluru")
                .defaultDiscountPercentage(BigDecimal.ZERO)
                .isActive(true)
                .build();

        sampleB2bCustomer = Customer.builder()
                .id(2L)
                .customerCode("CUST-0002")
                .name("Apex Enterprises")
                .companyName("Apex Enterprises Pvt Ltd")
                .contactPerson("Suresh Mehta")
                .customerType(CustomerType.B2B)
                .customerSegment(CustomerSegment.LARGE)
                .phone("9876500000")
                .gstin("29AAACG8976R1ZO")
                .gstRegistered(true)
                .defaultDiscountPercentage(new BigDecimal("5.00"))
                .city("Bengaluru")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("1. Create B2C Customer successfully with defaults")
    void testCreateB2cCustomer() {
        when(customerRepository.count()).thenReturn(0L);
        when(customerRepository.save(any(Customer.class))).thenAnswer(i -> {
            Customer c = i.getArgument(0);
            c.setId(10L);
            return c;
        });

        Customer input = Customer.builder()
                .name("Pooja Sharma")
                .phone("9123456780")
                .build();

        Customer saved = customerService.createCustomer(input, "admin");

        assertNotNull(saved);
        assertEquals(CustomerType.B2C, saved.getCustomerType());
        assertEquals(CustomerSegment.SMALL, saved.getCustomerSegment());
        assertEquals(BigDecimal.ZERO, saved.getDefaultDiscountPercentage());
        assertNotNull(saved.getCustomerCode());
        verify(customerRepository, times(1)).save(any(Customer.class));
    }

    @Test
    @DisplayName("2. Create B2B Customer successfully with GSTIN and Large segment")
    void testCreateB2bCustomer() {
        when(customerRepository.save(any(Customer.class))).thenReturn(sampleB2bCustomer);

        Customer saved = customerService.createCustomer(sampleB2bCustomer, "admin");

        assertNotNull(saved);
        assertEquals(CustomerType.B2B, saved.getCustomerType());
        assertEquals(CustomerSegment.LARGE, saved.getCustomerSegment());
        assertEquals("29AAACG8976R1ZO", saved.getGstin());
        assertEquals(new BigDecimal("5.00"), saved.getDefaultDiscountPercentage());
        verify(customerRepository, times(1)).save(any(Customer.class));
    }

    @Test
    @DisplayName("3. B2B Validation: Rejects invalid GSTIN format")
    void testB2bInvalidGstin() {
        Customer invalid = Customer.builder()
                .name("Invalid GSTIN Co")
                .customerType(CustomerType.B2B)
                .gstRegistered(true)
                .gstin("INVALID_GSTIN")
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                customerService.createCustomer(invalid, "admin"));

        assertTrue(ex.getMessage().contains("Invalid GSTIN format"));
    }

    @Test
    @DisplayName("4. B2B Validation: Requires GSTIN if marked as GST Registered")
    void testB2bMissingGstinWhenRegistered() {
        Customer invalid = Customer.builder()
                .name("Missing GSTIN Co")
                .customerType(CustomerType.B2B)
                .gstRegistered(true)
                .gstin("")
                .build();

        BusinessValidationException ex = assertThrows(BusinessValidationException.class, () ->
                customerService.createCustomer(invalid, "admin"));

        assertTrue(ex.getMessage().contains("GSTIN is required"));
    }

    @Test
    @DisplayName("5. Concession Validation: Rejects negative or greater than 100% concession")
    void testInvalidConcessionRange() {
        Customer invalidNegative = Customer.builder()
                .name("Negative Discount User")
                .defaultDiscountPercentage(new BigDecimal("-5.00"))
                .build();

        assertThrows(BusinessValidationException.class, () ->
                customerService.createCustomer(invalidNegative, "admin"));

        Customer invalidOver100 = Customer.builder()
                .name("Over 100 Discount User")
                .defaultDiscountPercentage(new BigDecimal("105.00"))
                .build();

        assertThrows(BusinessValidationException.class, () ->
                customerService.createCustomer(invalidOver100, "admin"));
    }

    @Test
    @DisplayName("6. Customer Search with query, type and segment filters")
    void testSearchCustomers() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Customer> mockPage = new PageImpl<>(List.of(sampleB2bCustomer));

        when(customerRepository.searchWithFilters("Apex", CustomerType.B2B, CustomerSegment.LARGE, pageable))
                .thenReturn(mockPage);

        Page<Customer> results = customerService.getCustomers("Apex", CustomerType.B2B, CustomerSegment.LARGE, pageable);

        assertEquals(1, results.getTotalElements());
        assertEquals("Apex Enterprises", results.getContent().get(0).getName());
    }

    @Test
    @DisplayName("7. Customer Summary: Computes total spent, average order value, returning status and top products")
    void testCustomerSummary() {
        when(customerRepository.findById(2L)).thenReturn(Optional.of(sampleB2bCustomer));
        when(invoiceRepository.countByCustomerIdAndInvoiceStatusNot(2L, InvoiceStatus.CANCELLED)).thenReturn(3L);
        when(invoiceRepository.sumGrandTotalByCustomerIdAndInvoiceStatusNot(2L, InvoiceStatus.CANCELLED))
                .thenReturn(new BigDecimal("30000.00"));

        Invoice inv1 = Invoice.builder()
                .id(101L)
                .invoiceNumber("INV/2026-27/00101")
                .invoiceDate(OffsetDateTime.now().minusDays(2))
                .grandTotal(new BigDecimal("10000.00"))
                .build();
        when(invoiceRepository.findTop5ByCustomerIdAndInvoiceStatusNotOrderByInvoiceDateDesc(2L, InvoiceStatus.CANCELLED))
                .thenReturn(List.of(inv1));

        List<Object[]> topProducts = new ArrayList<>();
        topProducts.add(new Object[]{5L, "Logitech Mouse", "ELEC-LOGI-M220", new BigDecimal("12.000"), 4L});
        when(invoiceItemRepository.findFrequentlyPurchasedProductsByCustomerId(eq(2L), any()))
                .thenReturn(topProducts);

        CustomerSummaryDto summary = customerService.getCustomerSummary(2L);

        assertNotNull(summary);
        assertTrue(summary.isReturningCustomer());
        assertEquals(3L, summary.getTotalOrders());
        assertEquals(new BigDecimal("30000.00"), summary.getTotalSpent());
        assertEquals(new BigDecimal("10000.00"), summary.getAverageOrderValue());
        assertEquals(1, summary.getRecentInvoices().size());
        assertEquals("INV/2026-27/00101", summary.getRecentInvoices().get(0).getInvoiceNumber());
        assertEquals(1, summary.getFrequentlyPurchasedProducts().size());
        assertEquals("Logitech Mouse", summary.getFrequentlyPurchasedProducts().get(0).getProductName());
    }
}
