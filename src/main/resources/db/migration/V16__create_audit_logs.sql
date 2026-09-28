-- V16__create_audit_logs.sql
-- Production tamper-proof append-only audit trail

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) 
        REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_audit_logs_action_not_empty CHECK (length(trim(action)) > 0),
    CONSTRAINT chk_audit_logs_entity_type_not_empty CHECK (length(trim(entity_type)) > 0),
    CONSTRAINT chk_audit_logs_entity_id_not_empty CHECK (length(trim(entity_id)) > 0)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

-- Enforce append-only immutability at the database engine level
CREATE OR REPLACE FUNCTION trg_audit_logs_prevent_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs entries are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_audit_logs_prevent_modification();

COMMENT ON TABLE audit_logs IS 'Append-only ledger capturing security, domain entity, and financial modifications';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON snapshot of entity state prior to mutation';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON snapshot of entity state following mutation';
