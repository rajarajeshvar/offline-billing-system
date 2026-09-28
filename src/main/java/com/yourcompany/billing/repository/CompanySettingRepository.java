package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.CompanySetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanySettingRepository extends JpaRepository<CompanySetting, Long> {
    default Optional<CompanySetting> findSingleton() {
        return findById(1L);
    }
}
