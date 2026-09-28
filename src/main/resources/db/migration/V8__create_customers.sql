-- V8__create_customers.sql
-- Customer master registry

CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(10),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customers_customer_code UNIQUE (customer_code),
    CONSTRAINT chk_customers_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_customers_phone ON customers (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_name ON customers (name);
CREATE INDEX idx_customers_is_active ON customers (is_active);

COMMENT ON TABLE customers IS 'Master record of registered buyers and corporate clients';
COMMENT ON COLUMN customers.gstin IS 'Goods and Services Tax Identification Number for B2B billing';
