package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
    Page<StockMovement> findAllByProductId(Long productId, Pageable pageable);
    List<StockMovement> findAllByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
    Page<StockMovement> findAllByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);
}
