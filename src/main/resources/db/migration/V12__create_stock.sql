-- V12__create_stock.sql
-- Real-time inventory balance per product

CREATE TABLE stock (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stock_product_id UNIQUE (product_id),
    CONSTRAINT fk_stock_product FOREIGN KEY (product_id) 
        REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_stock_quantity_non_negative CHECK (quantity >= 0.000),
    CONSTRAINT chk_stock_version_non_negative CHECK (version >= 0)
);

COMMENT ON TABLE stock IS 'Current on-hand inventory levels for stock-tracked products';
COMMENT ON COLUMN stock.quantity IS 'Current available quantity (constrained >= 0 to prevent overselling)';
COMMENT ON COLUMN stock.version IS 'Optimistic locking version counter for JPA transactions';
