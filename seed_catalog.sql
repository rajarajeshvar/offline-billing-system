-- 1. Default Employee
INSERT INTO employees (employee_code, first_name, last_name, phone, email, designation, joining_date, is_active)
VALUES ('EMP-001', 'Rajan', 'Admin', '9876543210', 'admin@offlinebilling.local', 'Store Admin & Cashier', CURRENT_DATE, TRUE)
ON CONFLICT (employee_code) DO NOTHING;

-- Link admin user to this employee
UPDATE users SET employee_id = (SELECT id FROM employees WHERE employee_code = 'EMP-001') WHERE username = 'admin';

-- 2. Categories
INSERT INTO categories (name, description, is_active) VALUES
('Electronics & Audio', 'Gadgets, peripherals and audio equipment', TRUE),
('Groceries & Provisions', 'Daily staple foods and supplies', TRUE),
('Stationery & Office', 'Office paper, pens, and packing materials', TRUE),
('Hardware & Tools', 'Cables, fasteners, and maintenance tools', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 3. Customers
INSERT INTO customers (customer_code, name, phone, email, address_line1, city, state, state_code, pincode, gstin, is_active)
VALUES
('CUST-001', 'Rahul Sharma', '9845012345', 'rahul.s@outlook.com', '4th Block, Koramangala', 'Bengaluru', 'Karnataka', '29', '560034', NULL, TRUE),
('CUST-002', 'GreenField Tech Solutions', '9880098800', 'accounts@greenfieldtech.in', 'Tower B, Tech Park', 'Bengaluru', 'Karnataka', '29', '560103', '29AAACG8976R1ZO', TRUE)
ON CONFLICT (customer_code) DO NOTHING;

-- 4. Products & Stock
-- Logitech Mouse
INSERT INTO products (sku, barcode, name, description, category_id, unit_id, tax_rate_id, hsn_code, cost_price, selling_price, track_stock, minimum_stock, reorder_level, target_stock, is_active)
SELECT 'ELEC-LOGI-M220', '8901234567890', 'Logitech M220 Silent Wireless Mouse', 'Ultra-quiet 2.4GHz optical mouse with 18-month battery life', c.id, u.id, t.id, '84716060', 550.00, 799.00, TRUE, 10.000, 15.000, 60.000, TRUE
FROM categories c, units u, tax_rates t
WHERE c.name = 'Electronics & Audio' AND u.symbol = 'pcs' AND t.name = 'GST 18%'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, quantity, version)
SELECT p.id, 48.000, 0 FROM products p WHERE p.sku = 'ELEC-LOGI-M220'
ON CONFLICT (product_id) DO UPDATE SET quantity = 48.000;

-- boAt Earbuds
INSERT INTO products (sku, barcode, name, description, category_id, unit_id, tax_rate_id, hsn_code, cost_price, selling_price, track_stock, minimum_stock, reorder_level, target_stock, is_active)
SELECT 'ELEC-BOAT-141', '8909876543210', 'boAt Airdopes 141 ANC Earbuds', 'Active noise cancelling wireless bluetooth earphones 42H playtime', c.id, u.id, t.id, '85183000', 900.00, 1299.00, TRUE, 8.000, 12.000, 40.000, TRUE
FROM categories c, units u, tax_rates t
WHERE c.name = 'Electronics & Audio' AND u.symbol = 'pcs' AND t.name = 'GST 18%'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, quantity, version)
SELECT p.id, 25.000, 0 FROM products p WHERE p.sku = 'ELEC-BOAT-141'
ON CONFLICT (product_id) DO UPDATE SET quantity = 25.000;

-- Basmati Rice
INSERT INTO products (sku, barcode, name, description, category_id, unit_id, tax_rate_id, hsn_code, cost_price, selling_price, track_stock, minimum_stock, reorder_level, target_stock, is_active)
SELECT 'GROC-DAAWAT-BAS', '8901058852331', 'Daawat Rozana Super Basmati Rice 5kg', 'Long grain aromatic basmati rice for daily dining', c.id, u.id, t.id, '10063020', 380.00, 475.00, TRUE, 10.000, 15.000, 50.000, TRUE
FROM categories c, units u, tax_rates t
WHERE c.name = 'Groceries & Provisions' AND u.symbol = 'box' AND t.name = 'GST 5%'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, quantity, version)
SELECT p.id, 34.000, 0 FROM products p WHERE p.sku = 'GROC-DAAWAT-BAS'
ON CONFLICT (product_id) DO UPDATE SET quantity = 34.000;

-- JK Copier
INSERT INTO products (sku, barcode, name, description, category_id, unit_id, tax_rate_id, hsn_code, cost_price, selling_price, track_stock, minimum_stock, reorder_level, target_stock, is_active)
SELECT 'STAT-JK-A4-75', '8902514001015', 'JK Copier A4 Paper Ream (500 Sheets, 75 GSM)', 'High brightness premium multipurpose photocopy & printer paper', c.id, u.id, t.id, '48025610', 220.00, 299.00, TRUE, 20.000, 30.000, 120.000, TRUE
FROM categories c, units u, tax_rates t
WHERE c.name = 'Stationery & Office' AND u.symbol = 'pack' AND t.name = 'GST 12%'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, quantity, version)
SELECT p.id, 92.000, 0 FROM products p WHERE p.sku = 'STAT-JK-A4-75'
ON CONFLICT (product_id) DO UPDATE SET quantity = 92.000;

-- SanDisk Pen Drive
INSERT INTO products (sku, barcode, name, description, category_id, unit_id, tax_rate_id, hsn_code, cost_price, selling_price, track_stock, minimum_stock, reorder_level, target_stock, is_active)
SELECT 'ELEC-SAND-64G', '8904123890123', 'SanDisk Ultra 64GB USB 3.0 Flash Drive', 'High-speed metal pen drive up to 130MB/s transfer speed', c.id, u.id, t.id, '85235100', 380.00, 549.00, TRUE, 10.000, 15.000, 50.000, TRUE
FROM categories c, units u, tax_rates t
WHERE c.name = 'Electronics & Audio' AND u.symbol = 'pcs' AND t.name = 'GST 18%'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO stock (product_id, quantity, version)
SELECT p.id, 6.000, 0 FROM products p WHERE p.sku = 'ELEC-SAND-64G'
ON CONFLICT (product_id) DO UPDATE SET quantity = 6.000;
