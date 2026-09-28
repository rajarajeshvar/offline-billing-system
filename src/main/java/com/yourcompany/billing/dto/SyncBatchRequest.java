package com.yourcompany.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncBatchRequest {

    @NotEmpty(message = "Sync batch must contain at least one invoice")
    @Valid
    private List<SyncInvoiceRequest> invoices;
}
