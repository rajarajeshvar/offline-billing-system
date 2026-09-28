-- V3__create_users.sql
-- Authentication/login identity table

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id BIGINT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_employee_id UNIQUE (employee_id),
    CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) 
        REFERENCES employees (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) 
        REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_users_username_not_empty CHECK (length(trim(username)) > 0),
    CONSTRAINT chk_users_password_hash_not_empty CHECK (length(trim(password_hash)) > 0)
);

CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_users_is_active ON users (is_active);

COMMENT ON TABLE users IS 'System authentication accounts mapped to employees or system administrators';
COMMENT ON COLUMN users.employee_id IS 'Associated employee record (nullable to support bootstrap/system admin accounts)';
COMMENT ON COLUMN users.password_hash IS 'BCrypt/Argon2 encrypted password hash. Never store plaintext!';
