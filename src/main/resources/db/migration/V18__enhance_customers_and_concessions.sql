-- ============================================================================
-- V18__enhance_customers_and_concessions.sql
-- Customer Segmentation (B2B/B2C, Small/Large), Commercial Concessions & Search
-- ============================================================================

-- 1. Add B2B/B2C, segmentation, concession, and contact columns
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) NOT NULL DEFAULT 'B2C',
    ADD COLUMN IF NOT EXISTS customer_segment VARCHAR(20) NOT NULL DEFAULT 'SMALL',
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100),
    ADD COLUMN IF NOT EXISTS shipping_address TEXT,
    ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS default_discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Enforce domain integrity constraints
ALTER TABLE customers
    ADD CONSTRAINT chk_customers_type CHECK (customer_type IN ('B2C', 'B2B')),
    ADD CONSTRAINT chk_customers_segment CHECK (customer_segment IN ('SMALL', 'LARGE')),
    ADD CONSTRAINT chk_customers_discount_range CHECK (default_discount_percentage >= 0.00 AND default_discount_percentage <= 100.00);

-- 3. High-performance indexes for POS lookups
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers (customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers (customer_segment);
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers (company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON customers (gstin) WHERE gstin IS NOT NULL;

-- 4. Update existing seeded customers to reflect accurate B2B and B2C categorizations
UPDATE customers
SET customer_type = 'B2B',
    customer_segment = 'LARGE',
    gst_registered = TRUE,
    company_name = name,
    default_discount_percentage = 5.00
WHERE gstin IS NOT NULL AND length(trim(gstin)) > 0;

UPDATE customers
SET customer_type = 'B2C',
    customer_segment = 'SMALL',
    gst_registered = FALSE,
    default_discount_percentage = 0.00
WHERE gstin IS NULL OR length(trim(gstin)) = 0;
