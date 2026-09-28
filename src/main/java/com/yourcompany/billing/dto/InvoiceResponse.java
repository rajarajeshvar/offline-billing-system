package com.yourcompany.billing.dto;

import com.yourcompany.billing.entity.enums.InvoiceStatus;
import com.yourcompany.billing.entity.enums.PaymentStatus;
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
public class InvoiceResponse {

    private Long id;
    private String invoiceNumber;
    private OffsetDateTime invoiceDate;
    private Long customerId;
    private String customerName;
    private Long employeeId;
    private String employeeName;
    private BigDecimal subtotal;
    private BigDecimal discountTotal;
    private BigDecimal taxableAmount;
    private BigDecimal cgstTotal;
    private BigDecimal sgstTotal;
    private BigDecimal igstTotal;
    private BigDecimal cessTotal;
    private BigDecimal roundOff;
    private BigDecimal grandTotal;
    private PaymentStatus paymentStatus;
    private InvoiceStatus invoiceStatus;
    private String notes;
    private List<InvoiceItemResponse> items;
}
