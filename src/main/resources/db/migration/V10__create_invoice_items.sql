-- V10__create_invoice_items.sql
-- Invoice line items with immutable historical snapshots

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

COMMENT ON TABLE invoice_items IS 'Line items containing snapshot fields preserving legal tax & pricing records';
COMMENT ON COLUMN invoice_items.product_name IS 'Snapshot of product name at invoice generation time';
COMMENT ON COLUMN invoice_items.tax_rate IS 'Snapshot of total applied tax rate at invoice generation time';
