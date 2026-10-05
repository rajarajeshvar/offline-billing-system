package com.yourcompany.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FrequentlyPurchasedProductDto {
    private Long productId;
    private String productName;
    private String sku;
    private BigDecimal totalQuantity;
    private Long purchaseCount;
}
