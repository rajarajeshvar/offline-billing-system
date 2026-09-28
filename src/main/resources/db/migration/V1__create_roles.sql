-- V1__create_roles.sql
-- Application authorization roles

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_name UNIQUE (name),
    CONSTRAINT chk_roles_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Comments for documentation & schema introspection
COMMENT ON TABLE roles IS 'Stores system authorization roles (e.g. ADMIN, MANAGER, BILLER, INVENTORY_MANAGER)';
COMMENT ON COLUMN roles.id IS 'Internal surrogate primary key';
COMMENT ON COLUMN roles.name IS 'Unique role identifier name used for Spring Security authorities';
