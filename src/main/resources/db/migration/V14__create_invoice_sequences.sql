-- V14__create_invoice_sequences.sql
-- Concurrency-safe invoice sequence generator

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

COMMENT ON TABLE invoice_sequences IS 'Tracks monotonic sequence counters per financial year and prefix for gapless invoice numbers';
COMMENT ON COLUMN invoice_sequences.last_number IS 'Highest allocated sequence number; updated using SELECT ... FOR UPDATE';
