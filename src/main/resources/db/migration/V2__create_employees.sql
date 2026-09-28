-- V2__create_employees.sql
-- Business employee master table

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

COMMENT ON TABLE employees IS 'Master registry of business staff members';
COMMENT ON COLUMN employees.employee_code IS 'Unique business identifier for employee';
COMMENT ON COLUMN employees.is_active IS 'Soft deactivation flag to prevent data loss';
