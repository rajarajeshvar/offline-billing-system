-- V15__create_company_settings.sql
-- Company-specific profile and billing configuration (Singleton pattern)

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

COMMENT ON TABLE company_settings IS 'Singleton configuration table holding business details for printed invoices and tax compliance';
COMMENT ON COLUMN company_settings.id IS 'Enforced to 1 by CHECK constraint to guarantee exactly one active configuration';
