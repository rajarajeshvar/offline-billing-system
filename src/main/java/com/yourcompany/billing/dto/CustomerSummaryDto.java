package com.yourcompany.billing.dto;

import com.yourcompany.billing.entity.Customer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerSummaryDto {
    private Customer customer;
    private long totalOrders;
    private BigDecimal totalSpent;
    private BigDecimal averageOrderValue;
    private OffsetDateTime lastPurchaseDate;
    private boolean isReturningCustomer;
    private List<CustomerOrderSummaryDto> recentInvoices;
    private List<FrequentlyPurchasedProductDto> frequentlyPurchasedProducts;
}
