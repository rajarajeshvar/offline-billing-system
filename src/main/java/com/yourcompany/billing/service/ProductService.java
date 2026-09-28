package com.yourcompany.billing.service;

import com.yourcompany.billing.dto.ProductRequest;
import com.yourcompany.billing.dto.ProductResponse;
import com.yourcompany.billing.entity.*;
import com.yourcompany.billing.exception.BusinessValidationException;
import com.yourcompany.billing.exception.ResourceNotFoundException;
import com.yourcompany.billing.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final TaxRateRepository taxRateRepository;
    private final StockRepository stockRepository;

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.findBySku(request.getSku()).isPresent()) {
            throw new BusinessValidationException("Product with SKU '" + request.getSku() + "' already exists.");
        }
        if (request.getBarcode() != null && !request.getBarcode().isBlank() &&
                productRepository.findByBarcode(request.getBarcode()).isPresent()) {
            throw new BusinessValidationException("Product with barcode '" + request.getBarcode() + "' already exists.");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
        Unit unit = unitRepository.findById(request.getUnitId())
                .orElseThrow(() -> new ResourceNotFoundException("Unit not found with ID: " + request.getUnitId()));
        TaxRate taxRate = taxRateRepository.findById(request.getTaxRateId())
                .orElseThrow(() -> new ResourceNotFoundException("Tax Rate not found with ID: " + request.getTaxRateId()));

        Product product = Product.builder()
                .sku(request.getSku().trim())
                .barcode(request.getBarcode() != null ? request.getBarcode().trim() : null)
                .name(request.getName().trim())
                .description(request.getDescription())
                .category(category)
                .unit(unit)
                .taxRate(taxRate)
                .hsnCode(request.getHsnCode())
                .costPrice(request.getCostPrice())
                .sellingPrice(request.getSellingPrice())
                .trackStock(request.getTrackStock() != null ? request.getTrackStock() : true)
                .minimumStock(request.getMinimumStock() != null ? request.getMinimumStock() : BigDecimal.ZERO)
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : BigDecimal.ZERO)
                .targetStock(request.getTargetStock() != null ? request.getTargetStock() : BigDecimal.ZERO)
                .isActive(true)
                .build();

        Product savedProduct = productRepository.save(product);

        // Initialize 1:1 stock record
        BigDecimal initialQty = request.getInitialStock() != null ? request.getInitialStock() : BigDecimal.ZERO;
        Stock stock = Stock.builder()
                .product(savedProduct)
                .quantity(initialQty)
                .build();
        stockRepository.save(stock);

        return mapToResponse(savedProduct, initialQty);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getProducts(String query, Pageable pageable) {
        if (query != null && !query.isBlank()) {
            return productRepository.searchProducts(query.trim(), pageable)
                    .map(p -> mapToResponse(p, getCurrentStock(p.getId())));
        }
        return productRepository.findAllByIsActiveTrue(pageable)
                .map(p -> mapToResponse(p, getCurrentStock(p.getId())));
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return mapToResponse(product, getCurrentStock(product.getId()));
    }

    @Transactional
    public ProductResponse updateProductPrice(Long id, BigDecimal newSellingPrice, BigDecimal newCostPrice) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        if (newSellingPrice != null) {
            if (newSellingPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessValidationException("Selling price cannot be negative");
            }
            product.setSellingPrice(newSellingPrice);
        }

        if (newCostPrice != null) {
            if (newCostPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessValidationException("Cost price cannot be negative");
            }
            product.setCostPrice(newCostPrice);
        }

        Product saved = productRepository.save(product);
        log.info("Product ID {} price updated. Selling Price: {}, Cost Price: {}",
                id, saved.getSellingPrice(), saved.getCostPrice());

        return mapToResponse(saved, getCurrentStock(saved.getId()));
    }

    private BigDecimal getCurrentStock(Long productId) {
        return stockRepository.findByProductId(productId)
                .map(Stock::getQuantity)
                .orElse(BigDecimal.ZERO);
    }

    private ProductResponse mapToResponse(Product product, BigDecimal currentStock) {
        return ProductResponse.builder()
                .id(product.getId())
                .sku(product.getSku())
                .barcode(product.getBarcode())
                .name(product.getName())
                .description(product.getDescription())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .unitId(product.getUnit().getId())
                .unitSymbol(product.getUnit().getSymbol())
                .taxRateId(product.getTaxRate().getId())
                .taxRateName(product.getTaxRate().getName())
                .taxRatePercent(product.getTaxRate().getTotalTaxRate())
                .hsnCode(product.getHsnCode())
                .costPrice(product.getCostPrice())
                .sellingPrice(product.getSellingPrice())
                .trackStock(product.getTrackStock())
                .currentStock(currentStock)
                .minimumStock(product.getMinimumStock())
                .reorderLevel(product.getReorderLevel())
                .targetStock(product.getTargetStock())
                .isActive(product.getIsActive())
                .build();
    }
}
