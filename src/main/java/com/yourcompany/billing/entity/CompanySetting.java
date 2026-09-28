package com.yourcompany.billing.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "company_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanySetting {

    @Id
    @Column(name = "id")
    @Builder.Default
    private Long id = 1L;

    @NotBlank
    @Column(name = "company_name", nullable = false, length = 255)
    private String companyName;

    @Column(name = "legal_name", length = 255)
    private String legalName;

    @NotBlank
    @Column(name = "address_line1", nullable = false, length = 255)
    private String addressLine1;

    @Column(name = "address_line2", length = 255)
    private String addressLine2;

    @NotBlank
    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @NotBlank
    @Column(name = "state", nullable = false, length = 100)
    private String state;

    @NotBlank
    @Column(name = "state_code", nullable = false, length = 10)
    private String stateCode;

    @NotBlank
    @Column(name = "pincode", nullable = false, length = 20)
    private String pincode;

    @Column(name = "gstin", length = 20)
    private String gstin;

    @Column(name = "pan", length = 20)
    private String pan;

    @NotBlank
    @Column(name = "phone", nullable = false, length = 25)
    private String phone;

    @NotBlank
    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "logo_path", length = 500)
    private String logoPath;

    @Column(name = "currency_code", nullable = false, length = 10)
    @Builder.Default
    private String currencyCode = "INR";

    @Column(name = "financial_year_start", nullable = false, length = 5)
    @Builder.Default
    private String financialYearStart = "04-01";

    @Column(name = "invoice_prefix", nullable = false, length = 20)
    @Builder.Default
    private String invoicePrefix = "INV";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
