package com.yourcompany.billing.service;

import com.yourcompany.billing.dto.StockAdjustmentRequest;
import com.yourcompany.billing.entity.*;
import com.yourcompany.billing.entity.enums.StockMovementType;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class StockService {

    private final StockRepository stockRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void adjustStock(StockAdjustmentRequest request, String currentUsername) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + request.getProductId()));

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        // Lock stock row pessimistically
        Stock stock = stockRepository.findByProductIdForUpdate(product.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Stock record not found for product ID: " + product.getId()));

        BigDecimal qtyBefore = stock.getQuantity();
        BigDecimal qtyAfter;
        BigDecimal magnitude = request.getQuantity();

        StockMovementType type = request.getMovementType();
        if (type == StockMovementType.ADJUSTMENT_IN || type == StockMovementType.PURCHASE || type == StockMovementType.RETURN_IN) {
            qtyAfter = qtyBefore.add(magnitude);
        } else if (type == StockMovementType.ADJUSTMENT_OUT || type == StockMovementType.DAMAGE || type == StockMovementType.RETURN_OUT) {
            if (qtyBefore.compareTo(magnitude) < 0) {
                throw new BusinessValidationException(String.format(
                        "Cannot reduce stock by %s. Current available stock is only %s.", magnitude, qtyBefore));
            }
            qtyAfter = qtyBefore.subtract(magnitude);
        } else {
            throw new BusinessValidationException("Unsupported manual stock adjustment type: " + type);
        }

        stock.setQuantity(qtyAfter);
        stockRepository.save(stock);

        StockMovement movement = StockMovement.builder()
                .product(product)
                .movementType(type)
                .quantity(magnitude)
                .referenceType("MANUAL_ADJUSTMENT")
                .quantityBefore(qtyBefore)
                .quantityAfter(qtyAfter)
                .reason(request.getReason())
                .createdBy(currentUser)
                .build();
        stockMovementRepository.save(movement);

        AuditLog auditLog = AuditLog.builder()
                .user(currentUser)
                .action("STOCK_ADJUSTED")
                .entityType("STOCK")
                .entityId(String.valueOf(stock.getId()))
                .oldValues(String.format("{\"quantity\":%s}", qtyBefore))
                .newValues(String.format("{\"quantity\":%s,\"type\":\"%s\",\"reason\":\"%s\"}", qtyAfter, type, request.getReason()))
                .build();
        auditLogRepository.save(auditLog);

        log.info("Stock adjusted for product {} ({}): {} -> {}", product.getSku(), type, qtyBefore, qtyAfter);
    }
}
