-- ============================================================================
-- Complete Production Database Schema for Offline Billing System
-- Database Engine: PostgreSQL 14+
-- Concurrency, Referential Integrity, Financial Accuracy & Audit Compliance
-- ============================================================================

-- Enable required extensions if necessary
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean drop for standalone fresh installs (comment out in production)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS stock_movements CASCADE;
-- DROP TABLE IF EXISTS stock CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS invoice_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS invoice_sequences CASCADE;
-- DROP TABLE IF EXISTS company_settings CASCADE;
-- DROP TABLE IF EXISTS customers CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS tax_rates CASCADE;
-- DROP TABLE IF EXISTS units CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- ----------------------------------------------------------------------------
-- 1. ROLES
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_name UNIQUE (name),
    CONSTRAINT chk_roles_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ----------------------------------------------------------------------------
-- 2. EMPLOYEES
-- ----------------------------------------------------------------------------
CREATE TABLE employees (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    designation VARCHAR(100),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_employee_code UNIQUE (employee_code),
    CONSTRAINT chk_employees_first_name_not_empty CHECK (length(trim(first_name)) > 0),
    CONSTRAINT chk_employees_code_not_empty CHECK (length(trim(employee_code)) > 0)
);

CREATE INDEX idx_employees_is_active ON employees (is_active);
CREATE INDEX idx_employees_phone ON employees (phone) WHERE phone IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. USERS
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_employee_id UNIQUE (employee_id),
    CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) 
        REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_users_username_not_empty CHECK (length(trim(username)) > 0),
    CONSTRAINT chk_users_password_hash_not_empty CHECK (length(trim(password_hash)) > 0)
);

CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_is_active ON users (is_active);

-- ----------------------------------------------------------------------------
-- 4. CATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT chk_categories_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_categories_is_active ON categories (is_active);

-- ----------------------------------------------------------------------------
-- 5. UNITS
-- ----------------------------------------------------------------------------
CREATE TABLE units (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(15) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_units_name UNIQUE (name),
    CONSTRAINT uq_units_symbol UNIQUE (symbol),
    CONSTRAINT chk_units_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_units_symbol_not_empty CHECK (length(trim(symbol)) > 0)
);

CREATE INDEX idx_units_is_active ON units (is_active);

-- ----------------------------------------------------------------------------
-- 6. TAX RATES
-- ----------------------------------------------------------------------------
CREATE TABLE tax_rates (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(50) NOT NULL DEFAULT 'GST',
    cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    cess_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tax_rates_name UNIQUE (name),
    CONSTRAINT chk_tax_rates_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_tax_rates_cgst_range CHECK (cgst_rate >= 0.00 AND cgst_rate <= 100.00),
    CONSTRAINT chk_tax_rates_sgst_range CHECK (sgst_rate >= 0.00 AND sgst_rate <= 100.00),
    CONSTRAINT chk_tax_rates_igst_range CHECK (igst_rate >= 0.00 AND igst_rate <= 100.00),
    CONSTRAINT chk_tax_rates_cess_range CHECK (cess_rate >= 0.00 AND cess_rate <= 100.00),
    CONSTRAINT chk_tax_rates_combined CHECK (cgst_rate + sgst_rate <= 100.00)
);

CREATE INDEX idx_tax_rates_is_active ON tax_rates (is_active);

-- ----------------------------------------------------------------------------
-- 7. PRODUCTS
-- ----------------------------------------------------------------------------
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

CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_unit_id ON products (unit_id);
CREATE INDEX idx_products_tax_rate_id ON products (tax_rate_id);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_is_active ON products (is_active);

-- ----------------------------------------------------------------------------
-- 8. CUSTOMERS
-- ----------------------------------------------------------------------------
CREATE TABLE customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_code VARCHAR(50),
    customer_type VARCHAR(20) NOT NULL DEFAULT 'B2C',
    customer_segment VARCHAR(20) NOT NULL DEFAULT 'SMALL',
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    contact_person VARCHAR(100),
    phone VARCHAR(25),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    state_code VARCHAR(10),
    pincode VARCHAR(20),
    shipping_address TEXT,
    gstin VARCHAR(20),
    gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    default_discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customers_customer_code UNIQUE (customer_code),
    CONSTRAINT chk_customers_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT chk_customers_type CHECK (customer_type IN ('B2C', 'B2B')),
    CONSTRAINT chk_customers_segment CHECK (customer_segment IN ('SMALL', 'LARGE')),
    CONSTRAINT chk_customers_discount_range CHECK (default_discount_percentage >= 0.00 AND default_discount_percentage <= 100.00)
);

CREATE INDEX idx_customers_phone ON customers (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_name ON customers (name);
CREATE INDEX idx_customers_is_active ON customers (is_active);
CREATE INDEX idx_customers_type ON customers (customer_type);
CREATE INDEX idx_customers_segment ON customers (customer_segment);
CREATE INDEX idx_customers_company_name ON customers (company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_customers_gstin ON customers (gstin) WHERE gstin IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. INVOICES
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_id BIGINT,
    employee_id BIGINT NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cess_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    invoice_status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoices_invoice_number UNIQUE (invoice_number),
    CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) 
        REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_invoices_employee FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_invoices_number_not_empty CHECK (length(trim(invoice_number)) > 0),
    CONSTRAINT chk_invoices_subtotal CHECK (subtotal >= 0.00),
    CONSTRAINT chk_invoices_discount_total CHECK (discount_total >= 0.00),
    CONSTRAINT chk_invoices_taxable_amount CHECK (taxable_amount >= 0.00),
    CONSTRAINT chk_invoices_cgst_total CHECK (cgst_total >= 0.00),
    CONSTRAINT chk_invoices_sgst_total CHECK (sgst_total >= 0.00),
    CONSTRAINT chk_invoices_igst_total CHECK (igst_total >= 0.00),
    CONSTRAINT chk_invoices_cess_total CHECK (cess_total >= 0.00),
    CONSTRAINT chk_invoices_round_off CHECK (round_off >= -5.00 AND round_off <= 5.00),
    CONSTRAINT chk_invoices_grand_total CHECK (grand_total >= 0.00),
    CONSTRAINT chk_invoices_payment_status CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    CONSTRAINT chk_invoices_invoice_status CHECK (invoice_status IN ('DRAFT', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX idx_invoices_employee_id ON invoices (employee_id);
CREATE INDEX idx_invoices_invoice_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_payment_status ON invoices (payment_status);
CREATE INDEX idx_invoices_invoice_status ON invoices (invoice_status);

-- ----------------------------------------------------------------------------
-- 10. INVOICE ITEMS (Snapshot Fields Guarantee Historical Correctness)
-- ----------------------------------------------------------------------------
CREATE TABLE invoice_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    hsn_code VARCHAR(20),
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cess_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) 
        REFERENCES invoices (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_items_product FOREIGN KEY (product_id) 
        REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_invoice_items_qty CHECK (quantity > 0.000),
    CONSTRAINT chk_invoice_items_unit_price CHECK (unit_price >= 0.00),
    CONSTRAINT chk_invoice_items_disc_pct CHECK (discount_percentage >= 0.00 AND discount_percentage <= 100.00),
    CONSTRAINT chk_invoice_items_disc_amt CHECK (discount_amount >= 0.00),
    CONSTRAINT chk_invoice_items_tax_rate CHECK (tax_rate >= 0.00 AND tax_rate <= 100.00),
    CONSTRAINT chk_invoice_items_taxable_amt CHECK (taxable_amount >= 0.00),
    CONSTRAINT chk_invoice_items_cgst CHECK (cgst_amount >= 0.00),
    CONSTRAINT chk_invoice_items_sgst CHECK (sgst_amount >= 0.00),
    CONSTRAINT chk_invoice_items_igst CHECK (igst_amount >= 0.00),
    CONSTRAINT chk_invoice_items_cess CHECK (cess_amount >= 0.00),
    CONSTRAINT chk_invoice_items_line_total CHECK (line_total >= 0.00)
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items (product_id);

-- ----------------------------------------------------------------------------
-- 11. PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_reference VARCHAR(100),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) 
        REFERENCES invoices (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_payments_amount CHECK (amount > 0.00),
    CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'))
);

CREATE INDEX idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX idx_payments_payment_date ON payments (payment_date);
CREATE INDEX idx_payments_payment_method ON payments (payment_method);

-- ----------------------------------------------------------------------------
-- 12. STOCK
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 13. STOCK MOVEMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE stock_movements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    quantity_before NUMERIC(12, 3) NOT NULL,
    quantity_after NUMERIC(12, 3) NOT NULL,
    reason TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) 
        REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) 
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_stock_movements_qty CHECK (quantity > 0.000),
    CONSTRAINT chk_stock_movements_qty_before CHECK (quantity_before >= 0.000),
    CONSTRAINT chk_stock_movements_qty_after CHECK (quantity_after >= 0.000),
    CONSTRAINT chk_stock_movements_type CHECK (
        movement_type IN ('OPENING', 'SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE')
    )
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at);
CREATE INDEX idx_stock_movements_created_by ON stock_movements (created_by);
CREATE INDEX idx_stock_movements_ref ON stock_movements (reference_type, reference_id) 
    WHERE reference_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 14. INVOICE SEQUENCES
-- ----------------------------------------------------------------------------
CREATE TABLE invoice_sequences (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    financial_year VARCHAR(10) NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    last_number BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invoice_sequences_fy_prefix UNIQUE (financial_year, prefix),
    CONSTRAINT chk_invoice_sequences_fy_not_empty CHECK (length(trim(financial_year)) > 0),
    CONSTRAINT chk_invoice_sequences_prefix_not_empty CHECK (length(trim(prefix)) > 0),
    CONSTRAINT chk_invoice_sequences_last_num CHECK (last_number >= 0)
);

-- ----------------------------------------------------------------------------
-- 15. COMPANY SETTINGS (Singleton Pattern)
-- ----------------------------------------------------------------------------
CREATE TABLE company_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    company_name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    gstin VARCHAR(20),
    pan VARCHAR(20),
    phone VARCHAR(25) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    logo_path VARCHAR(500),
    currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
    financial_year_start VARCHAR(5) NOT NULL DEFAULT '04-01',
    invoice_prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_company_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_company_settings_name_not_empty CHECK (length(trim(company_name)) > 0)
);

-- ----------------------------------------------------------------------------
-- 16. AUDIT LOGS (Append-Only Enforcement)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_audit_logs_action_not_empty CHECK (length(trim(action)) > 0),
    CONSTRAINT chk_audit_logs_entity_type_not_empty CHECK (length(trim(entity_type)) > 0),
    CONSTRAINT chk_audit_logs_entity_id_not_empty CHECK (length(trim(entity_id)) > 0)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

-- Enforce immutability via PostgreSQL trigger
CREATE OR REPLACE FUNCTION trg_audit_logs_prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs entries are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_logs_prevent_modification();
