package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UnitRepository extends JpaRepository<Unit, Long> {
    Optional<Unit> findByName(String name);
    Optional<Unit> findBySymbol(String symbol);
    List<Unit> findAllByIsActiveTrue();
}
