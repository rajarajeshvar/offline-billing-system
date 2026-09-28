package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.Invoice;
import com.yourcompany.billing.entity.enums.InvoiceStatus;
import com.yourcompany.billing.entity.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    @Query("SELECT DISTINCT i FROM Invoice i LEFT JOIN FETCH i.items WHERE i.notes LIKE CONCAT('%', :marker, '%')")
    Optional<Invoice> findByOfflineMarker(@Param("marker") String marker);

    Page<Invoice> findAllByInvoiceDateBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);

    Page<Invoice> findAllByPaymentStatus(PaymentStatus paymentStatus, Pageable pageable);

    Page<Invoice> findAllByInvoiceStatus(InvoiceStatus invoiceStatus, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE " +
           "(CAST(:status AS string) IS NULL OR i.invoiceStatus = :status) AND " +
           "(CAST(:paymentStatus AS string) IS NULL OR i.paymentStatus = :paymentStatus) AND " +
           "(CAST(:startDate AS java.time.OffsetDateTime) IS NULL OR i.invoiceDate >= :startDate) AND " +
           "(CAST(:endDate AS java.time.OffsetDateTime) IS NULL OR i.invoiceDate <= :endDate)")
    Page<Invoice> findInvoicesWithFilters(
            @Param("status") InvoiceStatus status,
            @Param("paymentStatus") PaymentStatus paymentStatus,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            Pageable pageable
    );
}
