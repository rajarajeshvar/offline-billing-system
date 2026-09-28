-- V7__create_products.sql
-- Product master catalog

CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    barcode VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id BIGINT NOT NULL,
    unit_id BIGINT NOT NULL,
    tax_rate_id BIGINT NOT NULL,
    hsn_code VARCHAR(20),
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    track_stock BOOLEAN NOT NULL DEFAULT TRUE,
    minimum_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    reorder_level NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    target_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_products_sku UNIQUE (sku),
    CONSTRAINT uq_products_barcode UNIQUE (barcode),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) 
        REFERENCES units (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_products_tax_rate FOREIGN KEY (tax_rate_id) 
        REFERENCES tax_rates (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_products_sku_not_empty CHECK (length(trim(sku)) > 0),
    CONSTRAINT chk_products_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_products_cost_price CHECK (cost_price >= 0.00),
    CONSTRAINT chk_products_selling_price CHECK (selling_price >= 0.00),
    CONSTRAINT chk_products_min_stock CHECK (minimum_stock >= 0.000),
    CONSTRAINT chk_products_reorder_level CHECK (reorder_level >= 0.000),
    CONSTRAINT chk_products_target_stock CHECK (target_stock >= 0.000),
    CONSTRAINT chk_products_target_vs_reorder CHECK (target_stock >= reorder_level)
);

-- Foreign key indexes (vital for JOIN performance & referential check locks)
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_unit_id ON products (unit_id);
CREATE INDEX idx_products_tax_rate_id ON products (tax_rate_id);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_is_active ON products (is_active);

COMMENT ON TABLE products IS 'Master catalog of billable inventory items and services';
COMMENT ON COLUMN products.sku IS 'Internal Stock Keeping Unit code';
COMMENT ON COLUMN products.barcode IS 'Scannable barcode/EAN/UPC identifier';
COMMENT ON COLUMN products.track_stock IS 'Toggle whether inventory is decremented upon sale';
