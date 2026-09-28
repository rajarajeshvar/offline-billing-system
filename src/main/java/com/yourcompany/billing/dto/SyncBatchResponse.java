package com.yourcompany.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncBatchResponse {

    private int totalProcessed;
    private int totalSucceeded;
    private int totalConflicts;
    private int totalFailed;
    private List<SyncItemResult> results;
}
