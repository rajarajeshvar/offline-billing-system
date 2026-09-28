package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findAllByInvoiceId(Long invoiceId);
    List<Payment> findAllByPaymentDateBetween(OffsetDateTime start, OffsetDateTime end);
}
