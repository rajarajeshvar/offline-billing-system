package com.yourcompany.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvoiceRequest {

    private Long customerId; // Nullable for walk-in retail sales

    @NotNull(message = "Employee ID (biller) is required")
    private Long employeeId;

    private String notes;

    @NotEmpty(message = "Invoice must contain at least one line item")
    @Valid
    private List<CreateInvoiceItemDto> items;

    @Valid
    private List<CreatePaymentDto> payments;

    private BigDecimal roundOff;
}
