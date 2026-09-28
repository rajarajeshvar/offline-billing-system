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
public class ProductResponse {

    private Long id;
    private String sku;
    private String barcode;
    private String name;
    private String description;
    private Long categoryId;
    private String categoryName;
    private Long unitId;
    private String unitSymbol;
    private Long taxRateId;
    private String taxRateName;
    private BigDecimal taxRatePercent;
    private String hsnCode;
    private BigDecimal costPrice;
    private BigDecimal sellingPrice;
    private Boolean trackStock;
    private BigDecimal currentStock;
    private BigDecimal minimumStock;
    private BigDecimal reorderLevel;
    private BigDecimal targetStock;
    private Boolean isActive;
}
