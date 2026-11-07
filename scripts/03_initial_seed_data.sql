-- ============================================================
-- PUBUDU POS SYSTEM - COMPLETE INITIAL SEED DATA (SQL)
-- Run this script to populate fresh database with baseline data:
-- Admin User, Roles, Permissions, Service Categories, Services,
-- Product Categories, Units, Brands, Products, Stocks & Warranties
-- ============================================================

USE `pubudu_pos`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. SYSTEM ROLES
-- ------------------------------------------------------------
INSERT INTO `Role` (`id`, `name`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    (1, 'SUPER_ADMIN', 'Full system super administrator with all permissions', true, NOW(), NOW()),
    (2, 'ADMIN', 'Store manager and administrator', true, NOW(), NOW()),
    (3, 'CASHIER', 'POS cashier operator for billing and sales', true, NOW(), NOW()),
    (4, 'TECHNICIAN', 'Workshop service and job operator', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `isActive` = true;

-- ------------------------------------------------------------
-- 2. DEFAULT SUPER ADMIN USER
-- Username: admin
-- Password: pubuduPS@97
-- ------------------------------------------------------------
INSERT INTO `User` (`id`, `username`, `email`, `passwordHash`, `fullName`, `status`, `roleId`, `createdAt`, `updatedAt`)
VALUES
    (1, 'admin', 'admin@pubudupos.lk', '$2b$12$hM1J8xDKTbjq4VfzuRR4f.vQcCvKNmFCs1NJPQg2ovMX8JRBxH7l2', 'System Administrator', 'ACTIVE', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `passwordHash` = VALUES(`passwordHash`), `status` = 'ACTIVE';

-- ------------------------------------------------------------
-- 3. SYSTEM PERMISSIONS & ROLE ASSIGNMENTS
-- ------------------------------------------------------------
INSERT INTO `Permission` (`code`, `name`, `description`, `createdAt`)
VALUES
    ('DASHBOARD_VIEW', 'Dashboard View', 'Access to dashboard', NOW()),
    ('POS_VIEW', 'Pos View', 'Access to pos', NOW()),
    ('JOB_VIEW', 'Job View', 'Access to job view', NOW()),
    ('JOB_CREATE', 'Job Create', 'Access to job create', NOW()),
    ('JOB_UPDATE', 'Job Update', 'Access to job update', NOW()),
    ('PRODUCT_VIEW', 'Product View', 'Access to product view', NOW()),
    ('PRODUCT_CREATE', 'Product Create', 'Access to product create', NOW()),
    ('PRODUCT_UPDATE', 'Product Update', 'Access to product update', NOW()),
    ('PRODUCT_DELETE', 'Product Delete', 'Access to product delete', NOW()),
    ('CATEGORY_VIEW', 'Category View', 'Access to category view', NOW()),
    ('CATEGORY_CREATE', 'Category Create', 'Access to category create', NOW()),
    ('CATEGORY_UPDATE', 'Category Update', 'Access to category update', NOW()),
    ('CATEGORY_DELETE', 'Category Delete', 'Access to category delete', NOW()),
    ('BRAND_VIEW', 'Brand View', 'Access to brand view', NOW()),
    ('BRAND_CREATE', 'Brand Create', 'Access to brand create', NOW()),
    ('BRAND_UPDATE', 'Brand Update', 'Access to brand update', NOW()),
    ('BRAND_DELETE', 'Brand Delete', 'Access to brand delete', NOW()),
    ('UNIT_VIEW', 'Unit View', 'Access to unit view', NOW()),
    ('UNIT_CREATE', 'Unit Create', 'Access to unit create', NOW()),
    ('UNIT_UPDATE', 'Unit Update', 'Access to unit update', NOW()),
    ('UNIT_DELETE', 'Unit Delete', 'Access to unit delete', NOW()),
    ('TAX_VIEW', 'Tax View', 'Access to tax view', NOW()),
    ('TAX_CREATE', 'Tax Create', 'Access to tax create', NOW()),
    ('TAX_UPDATE', 'Tax Update', 'Access to tax update', NOW()),
    ('TAX_DELETE', 'Tax Delete', 'Access to tax delete', NOW()),
    ('SERVICE_VIEW', 'Service View', 'Access to service view', NOW()),
    ('SERVICE_CREATE', 'Service Create', 'Access to service create', NOW()),
    ('SERVICE_UPDATE', 'Service Update', 'Access to service update', NOW()),
    ('SERVICE_DELETE', 'Service Delete', 'Access to service delete', NOW()),
    ('SERVICE_CATEGORY_VIEW', 'Service Category View', 'Access to service category view', NOW()),
    ('SERVICE_CATEGORY_CREATE', 'Service Category Create', 'Access to service category create', NOW()),
    ('SERVICE_CATEGORY_UPDATE', 'Service Category Update', 'Access to service category update', NOW()),
    ('SERVICE_CATEGORY_DELETE', 'Service Category Delete', 'Access to service category delete', NOW()),
    ('INVENTORY_VIEW', 'Inventory View', 'Access to inventory view', NOW()),
    ('INVENTORY_VIEW_MOVEMENTS', 'Inventory View Movements', 'Access to inventory view movements', NOW()),
    ('PURCHASE_VIEW', 'Purchase View', 'Access to purchase view', NOW()),
    ('PURCHASE_CREATE', 'Purchase Create', 'Access to purchase create', NOW()),
    ('PURCHASE_UPDATE', 'Purchase Update', 'Access to purchase update', NOW()),
    ('SALE_VIEW', 'Sale View', 'Access to sale view', NOW()),
    ('SALE_CREATE', 'Sale Create', 'Access to sale create', NOW()),
    ('CUSTOMER_VIEW', 'Customer View', 'Access to customer view', NOW()),
    ('CUSTOMER_CREATE', 'Customer Create', 'Access to customer create', NOW()),
    ('CUSTOMER_UPDATE', 'Customer Update', 'Access to customer update', NOW()),
    ('CUSTOMER_DELETE', 'Customer Delete', 'Access to customer delete', NOW()),
    ('SUPPLIER_VIEW', 'Supplier View', 'Access to supplier view', NOW()),
    ('SUPPLIER_CREATE', 'Supplier Create', 'Access to supplier create', NOW()),
    ('SUPPLIER_UPDATE', 'Supplier Update', 'Access to supplier update', NOW()),
    ('SUPPLIER_DELETE', 'Supplier Delete', 'Access to supplier delete', NOW()),
    ('EXPENSE_VIEW', 'Expense View', 'Access to expense view', NOW()),
    ('EXPENSE_CREATE', 'Expense Create', 'Access to expense create', NOW()),
    ('EXPENSE_UPDATE', 'Expense Update', 'Access to expense update', NOW()),
    ('EXPENSE_DELETE', 'Expense Delete', 'Access to expense delete', NOW()),
    ('REPORT_SALES_VIEW', 'Report Sales View', 'Access to report sales view', NOW()),
    ('REPORT_FINANCIAL_VIEW', 'Report Financial View', 'Access to report financial view', NOW()),
    ('REPORT_ACTIVITY_VIEW', 'Report Activity View', 'Access to report activity view', NOW()),
    ('SETTINGS_VIEW', 'Settings View', 'Access to settings view', NOW()),
    ('USER_VIEW', 'User View', 'Access to user view', NOW()),
    ('USER_CREATE', 'User Create', 'Access to user create', NOW()),
    ('USER_UPDATE', 'User Update', 'Access to user update', NOW()),
    ('USER_DELETE', 'User Delete', 'Access to user delete', NOW()),
    ('ROLE_VIEW', 'Role View', 'Access to role view', NOW()),
    ('ROLE_CREATE', 'Role Create', 'Access to role create', NOW()),
    ('ROLE_UPDATE', 'Role Update', 'Access to role update', NOW()),
    ('ROLE_DELETE', 'Role Delete', 'Access to role delete', NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Assign all permissions to SUPER_ADMIN role (id 1)
INSERT IGNORE INTO `RolePermission` (`roleId`, `permissionId`, `createdAt`)
SELECT 1, p.id, NOW() FROM `Permission` p;

-- ------------------------------------------------------------
-- 4. UNITS OF MEASUREMENT
-- ------------------------------------------------------------
INSERT INTO `Unit` (`name`, `shortName`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Pages', 'Pages', 'Document pages', true, NOW(), NOW()),
    ('Copies', 'Copies', 'Photocopy or print copies', true, NOW(), NOW()),
    ('Pieces', 'Pcs', 'Individual item or unit', true, NOW(), NOW()),
    ('Books', 'Books', 'Bound books or notebooks', true, NOW(), NOW()),
    ('Sheets', 'Sheets', 'Laminated or printed sheets', true, NOW(), NOW()),
    ('Sets', 'Sets', 'Set of items or photos', true, NOW(), NOW()),
    ('Packs', 'Packs', 'Paper or supply packs', true, NOW(), NOW()),
    ('Boxes', 'Boxes', 'Item boxes', true, NOW(), NOW()),
    ('Photos', 'Photos', 'Scanned or printed photos', true, NOW(), NOW()),
    ('Jobs', 'Jobs', 'Service jobs', true, NOW(), NOW()),
    ('Cards', 'Cards', 'ID or license cards', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `isActive` = true;

-- ------------------------------------------------------------
-- 5. PAYMENT METHODS
-- ------------------------------------------------------------
INSERT INTO `PaymentMethod` (`name`, `type`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Cash', 'CASH', true, NOW(), NOW()),
    ('Card', 'CARD', true, NOW(), NOW()),
    ('Bank Transfer', 'BANK_TRANSFER', true, NOW(), NOW()),
    ('Online QR', 'ONLINE', true, NOW(), NOW()),
    ('Credit', 'CREDIT', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `type` = VALUES(`type`), `isActive` = true;

-- ------------------------------------------------------------
-- 6. DEFAULT CUSTOMERS
-- ------------------------------------------------------------
INSERT INTO `Customer` (`code`, `name`, `phone`, `email`, `address`, `creditLimit`, `openingBalance`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('CUST-001', 'Walk-in Customer', '', '', 'In Store', 0.00, 0.00, true, NOW(), NOW()),
    ('CUST-002', 'Kamal Perera', '0771234567', 'kamal@gmail.com', 'Colombo 03', 25000.00, 0.00, true, NOW(), NOW()),
    ('CUST-003', 'Nimal Silva', '0719876543', 'nimal.s@yahoo.com', 'Kandy', 15000.00, 0.00, true, NOW(), NOW()),
    ('CUST-004', 'Dilshan Jayawardena', '0755554321', 'dilshan.j@gmail.com', 'Galle', 20000.00, 0.00, true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `phone` = VALUES(`phone`), `isActive` = true;

-- ------------------------------------------------------------
-- 7. SERVICE CATEGORIES
-- ------------------------------------------------------------
INSERT INTO `ServiceCategory` (`name`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Photocopy', 'Black & white and photocopy services', true, NOW(), NOW()),
    ('Color printing', 'Laser and inkjet color print services', true, NOW(), NOW()),
    ('Binding', 'Spiral, tape, hard cover and comb binding services', true, NOW(), NOW()),
    ('Laminating', 'Thermal document and ID pouch laminating services', true, NOW(), NOW()),
    ('Scanning', 'Document and photo digital scanning to PDF/Email', true, NOW(), NOW()),
    ('Mobile accessories', 'Phone accessories warranty and related services', true, NOW(), NOW()),
    ('Stationary', 'Office and school stationery services', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `isActive` = true;

-- ------------------------------------------------------------
-- 8. SERVICES WITH UNIT & HIDDEN PRODUCTION COSTS
-- ------------------------------------------------------------
-- Photocopy Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A4-SS', 'A4 One Side Photocopy', 'Standard A4 single-sided black & white photocopy', sc.id, 10.00, 2.50, 1.00, 0.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 10.00, `paperCost` = 2.50, `tonerCost` = 1.00, `machineCost` = 0.50;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A4-DS', 'A4 Double Side Photocopy', 'Standard A4 double-sided black & white photocopy', sc.id, 15.00, 2.50, 2.00, 1.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 15.00, `paperCost` = 2.50, `tonerCost` = 2.00, `machineCost` = 1.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A3-SS', 'A3 One Side Photocopy', 'Large format A3 single-sided black & white photocopy', sc.id, 25.00, 6.00, 2.50, 1.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 25.00, `paperCost` = 6.00, `tonerCost` = 2.50, `machineCost` = 1.50;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A3-DS', 'A3 Double Side Photocopy', 'Large format A3 double-sided black & white photocopy', sc.id, 40.00, 6.00, 5.00, 2.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 40.00, `paperCost` = 6.00, `tonerCost` = 5.00, `machineCost` = 2.50;

-- Color Printing Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-CP-A4', 'Colour Printing (A4)', 'High-resolution full color laser printing on A4 paper', sc.id, 50.00, 4.00, 12.00, 3.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Color printing' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 50.00, `paperCost` = 4.00, `tonerCost` = 12.00, `machineCost` = 3.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-STK-A4', 'Sticker Printing (A4 Glossy)', 'Glossy adhesive sticker paper color printing', sc.id, 120.00, 30.00, 18.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Color printing' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 120.00, `paperCost` = 30.00, `tonerCost` = 18.00, `machineCost` = 5.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PH-4X6', 'Photo Printing (4x6 Glossy)', 'Standard 4R (4x6 inch) glossy photo paper print', sc.id, 80.00, 15.00, 16.00, 4.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Color printing' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 80.00, `paperCost` = 15.00, `tonerCost` = 16.00, `machineCost` = 4.00;

-- Binding Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-SP-SM', 'A4 Spiral Binding (Small: 1-50 pages)', 'Spiral wire/plastic coil with clear PVC front and card back cover', sc.id, 150.00, 25.00, 30.00, 15.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 150.00, `paperCost` = 25.00, `tonerCost` = 30.00, `machineCost` = 15.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-SP-MD', 'A4 Spiral Binding (Medium: 51-150 pages)', 'Medium spiral wire/plastic coil with clear PVC front and card back cover', sc.id, 220.00, 40.00, 35.00, 20.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 220.00, `paperCost` = 40.00, `tonerCost` = 35.00, `machineCost` = 20.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-TP-A4', 'A4 Tape Binding', 'Cloth spine tape binding with transparent front cover', sc.id, 120.00, 20.00, 25.00, 15.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 120.00, `paperCost` = 20.00, `tonerCost` = 25.00, `machineCost` = 15.00;

-- Laminating Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-LAM-A4', 'A4 Document Laminating', 'Heavy 100-micron thermal lamination for A4 certificates and documents', sc.id, 80.00, 25.00, 8.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Laminating' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 80.00, `paperCost` = 25.00, `tonerCost` = 8.00, `machineCost` = 5.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-LAM-ID', 'ID Card / Badge Laminating', 'Compact high-gloss pouch lamination for ID cards and badges', sc.id, 40.00, 8.00, 3.00, 2.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Laminating' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 40.00, `paperCost` = 8.00, `tonerCost` = 3.00, `machineCost` = 2.00;

-- Scanning Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-SCN-DOC', 'Document Scanning to PDF / Email', 'High-resolution optical scanning sent to email or saved to USB', sc.id, 30.00, 0.00, 5.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Scanning' LIMIT 1
ON DUPLICATE KEY UPDATE `basePrice` = 30.00, `paperCost` = 0.00, `tonerCost` = 5.00, `machineCost` = 5.00;

-- ------------------------------------------------------------
-- 9. PRODUCT CATEGORIES & BRANDS
-- ------------------------------------------------------------
INSERT INTO `Category` (`name`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Mobile accessories', 'Phone chargers, cables, audio, power banks and accessories', true, NOW(), NOW()),
    ('Stationary', 'Office stationery, paper reams, pens and writing materials', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `isActive` = true;

INSERT INTO `Brand` (`name`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Double A', 'Premium photocopy and printing paper', true, NOW(), NOW()),
    ('Atlas', 'Sri Lankan stationery and school supplies', true, NOW(), NOW()),
    ('Remax', 'Mobile chargers, cables and accessories', true, NOW(), NOW()),
    ('Generic', 'Standard shop accessories and packaging', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`), `isActive` = true;

-- ------------------------------------------------------------
-- 10. PRODUCTS WITH WARRANTY & INVENTORY MATERIALS
-- ------------------------------------------------------------
-- Charger (6 Months Warranty)
INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 101, 'MA-004', 'MA004', '20W PD Dual Port Fast Wall Charger', 'High-speed PD adapter with 6 Months Warranty', c.id, u.id, b.id, 1100.00, 1750.00, 5, 6, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Mobile accessories' AND u.shortName = 'Pcs' AND b.name = 'Remax' LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 6, `sellingPrice` = 1750.00;

-- Type-C Data Cable (3 Months Warranty)
INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 102, 'MA-001', 'MA001', 'USB Type-C Fast Charging Cable (1.2m, 3A)', 'Braided 3A fast charging data cable with 3 Months Warranty', c.id, u.id, b.id, 350.00, 650.00, 10, 3, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Mobile accessories' AND u.shortName = 'Pcs' AND b.name = 'Remax' LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 3, `sellingPrice` = 650.00;

-- Earphones (3 Months Warranty)
INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 103, 'MA-005', 'MA005', '3.5mm Stereo In-Ear Earphones with Mic', 'Clear audio bass boost earphones with 3 Months Warranty', c.id, u.id, b.id, 450.00, 850.00, 8, 3, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Mobile accessories' AND u.shortName = 'Pcs' AND b.name = 'Remax' LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 3, `sellingPrice` = 850.00;

-- Power Bank (12 Months Warranty)
INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 104, 'MA-009', 'MA009', 'Remax 10,000mAh Dual USB Power Bank', '10000mAh power bank with 12 Months (1 Year) Warranty', c.id, u.id, b.id, 2600.00, 3850.00, 3, 12, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Mobile accessories' AND u.shortName = 'Pcs' AND b.name = 'Remax' LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 12, `sellingPrice` = 3850.00;

-- Stationery & Workshop Consumables
INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 105, 'ST-001', 'ST001', 'Double A 80gsm A4 Paper Ream (500 Sheets)', 'High-opacity bright white multipurpose photocopy paper', c.id, u.id, b.id, 1250.00, 1550.00, 10, 0, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Stationary' AND u.shortName = 'Packs' AND b.name = 'Double A' LIMIT 1
ON DUPLICATE KEY UPDATE `sellingPrice` = 1550.00;

INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 106, 'BD-001', 'BD001', 'Spiral Coil Ring 10mm (1-50 pages)', 'Plastic spiral coil for document binding', c.id, u.id, b.id, 15.00, 35.00, 50, 0, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Stationary' AND u.shortName = 'Pcs' AND b.name = 'Generic' LIMIT 1
ON DUPLICATE KEY UPDATE `sellingPrice` = 35.00;

INSERT INTO `Product` (`id`, `code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `brandId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 107, 'LM-001', 'LM001', 'A4 Thermal Laminating Pouch Film (100 mic)', 'High transparency thermal laminating pouches', c.id, u.id, b.id, 18.00, 45.00, 50, 0, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u, `Brand` b WHERE c.name = 'Stationary' AND u.shortName = 'Pcs' AND b.name = 'Generic' LIMIT 1
ON DUPLICATE KEY UPDATE `sellingPrice` = 45.00;

-- ------------------------------------------------------------
-- 11. INVENTORY STOCKS FOR PRODUCTS
-- ------------------------------------------------------------
INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 25, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 101
ON DUPLICATE KEY UPDATE `quantity` = 25;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 40, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 102
ON DUPLICATE KEY UPDATE `quantity` = 40;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 30, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 103
ON DUPLICATE KEY UPDATE `quantity` = 30;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 15, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 104
ON DUPLICATE KEY UPDATE `quantity` = 15;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 60, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 105
ON DUPLICATE KEY UPDATE `quantity` = 60;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 150, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 106
ON DUPLICATE KEY UPDATE `quantity` = 150;

INSERT INTO `Stock` (`productId`, `quantity`, `reservedQuantity`, `createdAt`, `updatedAt`)
SELECT p.id, 100, 0, NOW(), NOW() FROM `Product` p WHERE p.id = 107
ON DUPLICATE KEY UPDATE `quantity` = 100;

SET FOREIGN_KEY_CHECKS = 1;

-- Finished successfully!
SELECT 'Seed data populated successfully! Admin username: admin | Password: pubuduPS@97' AS Result;

