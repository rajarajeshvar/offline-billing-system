package com.yourcompany.billing.repository;

import com.yourcompany.billing.entity.InvoiceItem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {

    List<InvoiceItem> findAllByInvoiceId(Long invoiceId);

    @Query("SELECT ii.product.id, ii.productName, ii.sku, " +
           "SUM(ii.quantity), COUNT(ii.id) " +
           "FROM InvoiceItem ii JOIN ii.invoice i " +
           "WHERE i.customer.id = :customerId AND i.invoiceStatus <> 'CANCELLED' " +
           "GROUP BY ii.product.id, ii.productName, ii.sku " +
           "ORDER BY COUNT(ii.id) DESC, SUM(ii.quantity) DESC")
    List<Object[]> findFrequentlyPurchasedProductsByCustomerId(
            @Param("customerId") Long customerId,
            Pageable pageable
    );
}
