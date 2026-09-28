package com.yourcompany.billing.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "SKU is required")
    private String sku;

    private String barcode;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "Unit ID is required")
    private Long unitId;

    @NotNull(message = "Tax Rate ID is required")
    private Long taxRateId;

    private String hsnCode;

    @NotNull
    @DecimalMin(value = "0.00", message = "Cost price cannot be negative")
    private BigDecimal costPrice;

    @NotNull
    @DecimalMin(value = "0.00", message = "Selling price cannot be negative")
    private BigDecimal sellingPrice;

    @Builder.Default
    private Boolean trackStock = true;

    @DecimalMin(value = "0.000", message = "Minimum stock cannot be negative")
    @Builder.Default
    private BigDecimal minimumStock = BigDecimal.ZERO;

    @DecimalMin(value = "0.000", message = "Reorder level cannot be negative")
    @Builder.Default
    private BigDecimal reorderLevel = BigDecimal.ZERO;

    @DecimalMin(value = "0.000", message = "Target stock cannot be negative")
    @Builder.Default
    private BigDecimal targetStock = BigDecimal.ZERO;

    // Initial stock quantity when creating a new product
    private BigDecimal initialStock;
}
