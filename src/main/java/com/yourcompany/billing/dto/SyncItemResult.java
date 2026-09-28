package com.yourcompany.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncItemResult {

    private String clientOfflineId;
    private Long serverInvoiceId;
    private String serverInvoiceNumber;
    private String status; // SUCCESS, CONFLICT_RESOLVED, ERROR
    private String message;
    private boolean stockDeficitDetected;
    private InvoiceResponse invoice;
}
