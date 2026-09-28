-- V6__create_tax_rates.sql
-- Reusable tax configuration table (GST/VAT/Cess)

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

COMMENT ON TABLE tax_rates IS 'Standard tax slabs (e.g. GST 5%, GST 18%, Exempt) referencing CGST/SGST/IGST breakdown';
