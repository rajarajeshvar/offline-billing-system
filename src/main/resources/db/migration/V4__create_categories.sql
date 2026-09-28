-- V4__create_categories.sql
-- Product categories master

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

COMMENT ON TABLE categories IS 'Classification hierarchy for inventory products';
