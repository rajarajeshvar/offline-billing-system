-- V13__create_stock_movements.sql
-- Complete audit ledger of all physical inventory changes

CREATE TABLE stock_movements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(12, 3) NOT NULL,
    reference_type VARCHAR(50),
    reference_id BIGINT,
    quantity_before NUMERIC(12, 3) NOT NULL,
    quantity_after NUMERIC(12, 3) NOT NULL,
    reason TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) 
        REFERENCES products (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) 
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_stock_movements_qty CHECK (quantity > 0.000),
    CONSTRAINT chk_stock_movements_qty_before CHECK (quantity_before >= 0.000),
    CONSTRAINT chk_stock_movements_qty_after CHECK (quantity_after >= 0.000),
    CONSTRAINT chk_stock_movements_type CHECK (
        movement_type IN ('OPENING', 'SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE')
    )
);

CREATE INDEX idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements (created_at);
CREATE INDEX idx_stock_movements_created_by ON stock_movements (created_by);
CREATE INDEX idx_stock_movements_ref ON stock_movements (reference_type, reference_id) 
    WHERE reference_id IS NOT NULL;

COMMENT ON TABLE stock_movements IS 'Immutable historical ledger recording every inward and outward inventory transaction';
COMMENT ON COLUMN stock_movements.quantity IS 'Absolute magnitude of the stock change';
COMMENT ON COLUMN stock_movements.quantity_before IS 'Stock balance immediately prior to this movement';
COMMENT ON COLUMN stock_movements.quantity_after IS 'Stock balance immediately following this movement';
