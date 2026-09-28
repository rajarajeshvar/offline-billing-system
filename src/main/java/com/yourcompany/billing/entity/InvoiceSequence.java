package com.yourcompany.billing.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "invoice_sequences", uniqueConstraints = {
    @UniqueConstraint(name = "uq_invoice_sequences_fy_prefix", columnNames = {"financial_year", "prefix"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceSequence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "financial_year", nullable = false, length = 10)
    private String financialYear;

    @NotBlank
    @Column(name = "prefix", nullable = false, length = 20)
    private String prefix;

    @Column(name = "last_number", nullable = false)
    @Builder.Default
    private Long lastNumber = 0L;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
