package com.yourcompany.billing.exception;

import java.math.BigDecimal;

public class InsufficientStockException extends RuntimeException {

    private final Long productId;
    private final String productName;
    private final BigDecimal requested;
    private final BigDecimal available;

    public InsufficientStockException(Long productId, String productName, BigDecimal requested, BigDecimal available) {
        super(String.format("Insufficient stock for product '%s' (ID: %d). Requested: %s, Available: %s",
                productName, productId, requested, available));
        this.productId = productId;
        this.productName = productName;
        this.requested = requested;
        this.available = available;
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public BigDecimal getRequested() {
        return requested;
    }

    public BigDecimal getAvailable() {
        return available;
    }
}
