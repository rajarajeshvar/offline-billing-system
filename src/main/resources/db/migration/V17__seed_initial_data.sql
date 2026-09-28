-- V17__seed_initial_data.sql
-- Initial system master data and configuration seeds

-- 1. Authorization Roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full system administrator with unrestricted privileges'),
    ('MANAGER', 'Store manager overseeing sales, inventory, and staff operations'),
    ('BILLER', 'Front-desk point of sale and invoice creation operator'),
    ('INVENTORY_MANAGER', 'Warehouse and inventory stock management specialist')
ON CONFLICT (name) DO NOTHING;

-- 2. Standard Measurement Units
INSERT INTO units (name, symbol) VALUES
    ('Piece', 'pcs'),
    ('Kilogram', 'kg'),
    ('Gram', 'g'),
    ('Liter', 'L'),
    ('Milliliter', 'mL'),
    ('Meter', 'm'),
    ('Box', 'box'),
    ('Pack', 'pack')
ON CONFLICT (name) DO NOTHING;

-- 3. Standard Tax Rates (Indian GST standard slabs)
INSERT INTO tax_rates (name, tax_type, cgst_rate, sgst_rate, igst_rate, cess_rate) VALUES
    ('Exempt (0%)', 'GST', 0.00, 0.00, 0.00, 0.00),
    ('GST 5%', 'GST', 2.50, 2.50, 5.00, 0.00),
    ('GST 12%', 'GST', 6.00, 6.00, 12.00, 0.00),
    ('GST 18%', 'GST', 9.00, 9.00, 18.00, 0.00),
    ('GST 28%', 'GST', 14.00, 14.00, 28.00, 0.00)
ON CONFLICT (name) DO NOTHING;

-- 4. Initial Default Company Settings (Singleton id = 1)
INSERT INTO company_settings (
    id, company_name, legal_name, address_line1, city, state, state_code, pincode, 
    phone, email, currency_code, financial_year_start, invoice_prefix
) VALUES (
    1,
    'My Retail Store',
    'My Retail Store Pvt Ltd',
    'Main Commercial Road',
    'Bengaluru',
    'Karnataka',
    '29',
    '560001',
    '+91 9876543210',
    'billing@myretailstore.local',
    'INR',
    '04-01',
    'INV'
) ON CONFLICT (id) DO NOTHING;

-- 5. Initial Invoice Sequence for Current Financial Year
INSERT INTO invoice_sequences (financial_year, prefix, last_number)
VALUES ('2026-2027', 'INV', 0)
ON CONFLICT (financial_year, prefix) DO NOTHING;
