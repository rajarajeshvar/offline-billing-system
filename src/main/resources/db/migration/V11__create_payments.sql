-- V11__create_payments.sql
-- Invoice payment settlement records

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

COMMENT ON TABLE payments IS 'Settlement transactions linked to sales invoices';
COMMENT ON COLUMN payments.payment_reference IS 'Transaction reference, e.g., UPI ref, Card auth code, Cheque no.';
