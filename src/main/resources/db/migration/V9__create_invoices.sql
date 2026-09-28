-- V9__create_invoices.sql
-- Invoice header records

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

COMMENT ON TABLE invoices IS 'Header ledger for customer sales invoices';
COMMENT ON COLUMN invoices.customer_id IS 'Associated customer (nullable to seamlessly accommodate walk-in retail buyers)';
COMMENT ON COLUMN invoices.round_off IS 'Cash rounding adjustment (typically between -0.99 and +0.99)';
