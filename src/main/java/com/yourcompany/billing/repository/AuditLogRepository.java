package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);
    Page<AuditLog> findAllByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end, Pageable pageable);
    List<AuditLog> findAllByUserId(Long userId);
}
