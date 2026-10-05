package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.Customer;
import com.yourcompany.billing.entity.enums.CustomerSegment;
import com.yourcompany.billing.entity.enums.CustomerType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByCustomerCode(String customerCode);

    Optional<Customer> findByPhone(String phone);

    Optional<Customer> findByGstin(String gstin);

    @Query("SELECT c FROM Customer c WHERE c.isActive = true AND " +
           "(LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(c.companyName, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(c.contactPerson, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "c.phone LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(COALESCE(c.gstin, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "c.customerCode = :query)")
    Page<Customer> searchCustomers(@Param("query") String query, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.isActive = true AND " +
           "(:type IS NULL OR c.customerType = :type) AND " +
           "(:segment IS NULL OR c.customerSegment = :segment) AND " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(c.companyName, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(COALESCE(c.contactPerson, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "c.phone LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(COALESCE(c.gstin, '')) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "c.customerCode = :query)")
    Page<Customer> searchWithFilters(
            @Param("query") String query,
            @Param("type") CustomerType type,
            @Param("segment") CustomerSegment segment,
            Pageable pageable
    );
}
