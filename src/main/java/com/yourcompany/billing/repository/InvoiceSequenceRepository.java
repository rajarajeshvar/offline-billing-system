package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.InvoiceSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Long> {

    Optional<InvoiceSequence> findByFinancialYearAndPrefix(String financialYear, String prefix);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.financialYear = :fy AND s.prefix = :prefix")
    Optional<InvoiceSequence> findByFinancialYearAndPrefixForUpdate(
            @Param("fy") String financialYear, 
            @Param("prefix") String prefix
    );
}
