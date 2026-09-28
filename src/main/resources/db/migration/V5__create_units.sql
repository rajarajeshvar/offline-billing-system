-- V5__create_units.sql
-- Product measurement units master (e.g., Piece, kg, Liter, Box)

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

COMMENT ON TABLE units IS 'Measurement units for billing and stock accounting';
COMMENT ON COLUMN units.symbol IS 'Short representation printed on invoices (e.g. kg, pcs, L)';
