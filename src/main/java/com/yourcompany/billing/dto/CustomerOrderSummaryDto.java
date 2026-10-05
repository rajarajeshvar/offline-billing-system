package com.yourcompany.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerOrderSummaryDto {
    private Long invoiceId;
    private String invoiceNumber;
    private OffsetDateTime invoiceDate;
    private BigDecimal grandTotal;
    private String paymentStatus;
    private String invoiceStatus;
    private Integer itemCount;
}
