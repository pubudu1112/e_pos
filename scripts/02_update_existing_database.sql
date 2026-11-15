-- ============================================================
-- PUBUDU POS SYSTEM - DATABASE UPDATE MIGRATION SCRIPT
-- Use this script to update an EXISTING database with all NEW features:
-- 1. Product Warranty Duration (warrantyMonths)
-- 2. Services Unit Cost Breakdown (paperCost, tonerCost, machineCost)
-- 3. Warranty & Warranty Claims Tables
-- 4. New Service Categories (Binding, Laminating, Scanning, Mobile Accessories)
-- 5. Seed Services with Hidden/Unit Cost Breakdown
-- 6. Sample Phone Accessories with Warranty
-- ============================================================

USE `pubudu_pos`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. ADD warrantyMonths TO Product TABLE IF NOT PRESENT
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `AddWarrantyMonthsToProduct`;
DELIMITER $$
CREATE PROCEDURE `AddWarrantyMonthsToProduct`()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Product'
          AND COLUMN_NAME = 'warrantyMonths'
    ) THEN
        ALTER TABLE `Product` ADD COLUMN `warrantyMonths` INT NULL DEFAULT 0 AFTER `minimumStock`;
    END IF;
END$$
DELIMITER ;
CALL `AddWarrantyMonthsToProduct`();
DROP PROCEDURE `AddWarrantyMonthsToProduct`;

-- ------------------------------------------------------------
-- 1.1 ADD warrantyEnabled TO Category TABLE IF NOT PRESENT
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `AddWarrantyEnabledToCategory`;
DELIMITER $$
CREATE PROCEDURE `AddWarrantyEnabledToCategory`()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Category'
          AND COLUMN_NAME = 'warrantyEnabled'
    ) THEN
        ALTER TABLE `Category` ADD COLUMN `warrantyEnabled` BOOLEAN NOT NULL DEFAULT false AFTER `isActive`;
    END IF;
END$$
DELIMITER ;
CALL `AddWarrantyEnabledToCategory`();
DROP PROCEDURE `AddWarrantyEnabledToCategory`;

-- ------------------------------------------------------------
-- 2. ADD Cost Breakdown Columns TO Service TABLE IF NOT PRESENT
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `AddCostColumnsToService`;
DELIMITER $$
CREATE PROCEDURE `AddCostColumnsToService`()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Service'
          AND COLUMN_NAME = 'paperCost'
    ) THEN
        ALTER TABLE `Service` ADD COLUMN `paperCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `basePrice`;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Service'
          AND COLUMN_NAME = 'tonerCost'
    ) THEN
        ALTER TABLE `Service` ADD COLUMN `tonerCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `paperCost`;
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Service'
          AND COLUMN_NAME = 'machineCost'
    ) THEN
        ALTER TABLE `Service` ADD COLUMN `machineCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER `tonerCost`;
    END IF;
END$$
DELIMITER ;
CALL `AddCostColumnsToService`();
DROP PROCEDURE `AddCostColumnsToService`;

-- ------------------------------------------------------------
-- 3. CREATE Warranty TABLE IF NOT EXISTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Warranty` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warrantyCode` VARCHAR(50) NOT NULL,
    `saleId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `customerName` VARCHAR(150) NULL,
    `customerPhone` VARCHAR(30) NULL,
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `durationMonths` INTEGER NOT NULL DEFAULT 0,
    `expiryDate` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Warranty_warrantyCode_key`(`warrantyCode`),
    INDEX `Warranty_warrantyCode_idx`(`warrantyCode`),
    INDEX `Warranty_saleId_idx`(`saleId`),
    INDEX `Warranty_productId_idx`(`productId`),
    INDEX `Warranty_customerId_idx`(`customerId`),
    INDEX `Warranty_customerPhone_idx`(`customerPhone`),
    INDEX `Warranty_status_idx`(`status`),
    INDEX `Warranty_expiryDate_idx`(`expiryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. CREATE WarrantyClaim TABLE IF NOT EXISTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `WarrantyClaim` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `claimNo` VARCHAR(50) NOT NULL,
    `warrantyId` INTEGER NOT NULL,
    `issue` TEXT NOT NULL,
    `actionTaken` TEXT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'REPLACED', 'REPAIRED', 'REJECTED', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `handledById` INTEGER NULL,
    `claimDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WarrantyClaim_claimNo_key`(`claimNo`),
    INDEX `WarrantyClaim_warrantyId_idx`(`warrantyId`),
    INDEX `WarrantyClaim_claimNo_idx`(`claimNo`),
    INDEX `WarrantyClaim_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. ADD FOREIGN KEYS FOR Warranty & WarrantyClaim (Safe Procedure)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS `AddWarrantyForeignKeys`;
DELIMITER $$
CREATE PROCEDURE `AddWarrantyForeignKeys`()
BEGIN
    -- Warranty -> Sale
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Warranty'
          AND CONSTRAINT_NAME = 'Warranty_saleId_fkey'
    ) THEN
        ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Warranty -> Product
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Warranty'
          AND CONSTRAINT_NAME = 'Warranty_productId_fkey'
    ) THEN
        ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Warranty -> Customer
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Warranty'
          AND CONSTRAINT_NAME = 'Warranty_customerId_fkey'
    ) THEN
        ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- WarrantyClaim -> Warranty
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'WarrantyClaim'
          AND CONSTRAINT_NAME = 'WarrantyClaim_warrantyId_fkey'
    ) THEN
        ALTER TABLE `WarrantyClaim` ADD CONSTRAINT `WarrantyClaim_warrantyId_fkey` FOREIGN KEY (`warrantyId`) REFERENCES `Warranty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- WarrantyClaim -> User
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE()
          AND TABLE_NAME = 'WarrantyClaim'
          AND CONSTRAINT_NAME = 'WarrantyClaim_handledById_fkey'
    ) THEN
        ALTER TABLE `WarrantyClaim` ADD CONSTRAINT `WarrantyClaim_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$
DELIMITER ;
CALL `AddWarrantyForeignKeys`();
DROP PROCEDURE `AddWarrantyForeignKeys`;

-- ------------------------------------------------------------
-- 6. INSERT NEW SERVICE CATEGORIES (Binding, Laminating, Scanning, Photocopy, Color Printing)
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
-- 7. INSERT / UPDATE DEFAULT PRINTING, PHOTOCOPY, BINDING SERVICES
-- ------------------------------------------------------------
-- Photocopy Category Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A4-SS', 'A4 One Side Photocopy', 'Standard A4 single-sided black & white photocopy', sc.id, 10.00, 2.50, 1.00, 0.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 2.50, `tonerCost` = 1.00, `machineCost` = 0.50;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A4-DS', 'A4 Double Side Photocopy', 'Standard A4 double-sided black & white photocopy', sc.id, 15.00, 2.50, 2.00, 1.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 2.50, `tonerCost` = 2.00, `machineCost` = 1.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A3-SS', 'A3 One Side Photocopy', 'Large format A3 single-sided black & white photocopy', sc.id, 25.00, 6.00, 2.50, 1.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 6.00, `tonerCost` = 2.50, `machineCost` = 1.50;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-PC-A3-DS', 'A3 Double Side Photocopy', 'Large format A3 double-sided black & white photocopy', sc.id, 40.00, 6.00, 5.00, 2.50, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Photocopy' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 6.00, `tonerCost` = 5.00, `machineCost` = 2.50;

-- Color Printing Category Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-CP-A4', 'Colour Printing (A4)', 'High-resolution full color laser printing on A4 paper', sc.id, 50.00, 4.00, 12.00, 3.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Color printing' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 4.00, `tonerCost` = 12.00, `machineCost` = 3.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-STK-A4', 'Sticker Printing (A4 Glossy)', 'Glossy adhesive sticker paper color printing', sc.id, 120.00, 30.00, 18.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Color printing' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 30.00, `tonerCost` = 18.00, `machineCost` = 5.00;

-- Binding Category Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-SP-SM', 'A4 Spiral Binding (Small: 1-50 pages)', 'Spiral wire/plastic coil with clear PVC front and card back cover', sc.id, 150.00, 25.00, 30.00, 15.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 25.00, `tonerCost` = 30.00, `machineCost` = 15.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-SP-MD', 'A4 Spiral Binding (Medium: 51-150 pages)', 'Medium spiral wire/plastic coil with clear PVC front and card back cover', sc.id, 220.00, 40.00, 35.00, 20.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 40.00, `tonerCost` = 35.00, `machineCost` = 20.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-BND-TP-A4', 'A4 Tape Binding', 'Cloth spine tape binding with transparent front cover', sc.id, 120.00, 20.00, 25.00, 15.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Binding' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 20.00, `tonerCost` = 25.00, `machineCost` = 15.00;

-- Laminating Category Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-LAM-A4', 'A4 Document Laminating', 'Heavy 100-micron thermal lamination for A4 certificates and documents', sc.id, 80.00, 25.00, 8.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Laminating' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 25.00, `tonerCost` = 8.00, `machineCost` = 5.00;

INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-LAM-ID', 'ID Card / Badge Laminating', 'Compact high-gloss pouch lamination for ID cards and badges', sc.id, 40.00, 8.00, 3.00, 2.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Laminating' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 8.00, `tonerCost` = 3.00, `machineCost` = 2.00;

-- Scanning Category Services
INSERT INTO `Service` (`code`, `name`, `description`, `categoryId`, `basePrice`, `paperCost`, `tonerCost`, `machineCost`, `status`, `createdAt`, `updatedAt`)
SELECT 'SRV-SCN-DOC', 'Document Scanning to PDF / Email', 'High-resolution optical scanning sent to email or saved to USB', sc.id, 30.00, 0.00, 5.00, 5.00, 'ACTIVE', NOW(), NOW()
FROM `ServiceCategory` sc WHERE sc.name = 'Scanning' LIMIT 1
ON DUPLICATE KEY UPDATE `paperCost` = 0.00, `tonerCost` = 5.00, `machineCost` = 5.00;

-- ------------------------------------------------------------
-- 8. INSERT PRODUCT CATEGORY & PHONE ACCESSORIES WITH WARRANTY
-- ------------------------------------------------------------
INSERT INTO `Category` (`name`, `description`, `isActive`, `createdAt`, `updatedAt`)
VALUES
    ('Mobile accessories', 'Phone chargers, cables, audio, power banks and accessories', true, NOW(), NOW()),
    ('Stationary', 'Office stationery, paper reams and writing materials', true, NOW(), NOW())
ON DUPLICATE KEY UPDATE `isActive` = true;

-- Sample Phone Accessories with warrantyMonths configured
-- Charger (6 Months warranty)
INSERT INTO `Product` (`code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 'PRD-ACC-CHG20W', '8901234001', 'Fast Charger Adapter 20W Type-C', 'High-speed PD adapter for mobile phones with 6 months warranty', c.id, u.id, 1200.00, 1850.00, 5, 6, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u WHERE c.name = 'Mobile accessories' AND u.shortName IN ('Pcs', 'Pieces') LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 6, `sellingPrice` = 1850.00;

-- Data Cable (3 Months warranty)
INSERT INTO `Product` (`code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 'PRD-ACC-CBL-TC', '8901234002', 'Fast Charging Type-C Braided Cable (1m)', 'Durable nylon braided quick-charge cable with 3 months warranty', c.id, u.id, 450.00, 750.00, 10, 3, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u WHERE c.name = 'Mobile accessories' AND u.shortName IN ('Pcs', 'Pieces') LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 3, `sellingPrice` = 750.00;

-- Earphones (3 Months warranty)
INSERT INTO `Product` (`code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 'PRD-ACC-EAR-35', '8901234003', 'Stereo In-Ear Earphones 3.5mm Jack', 'Bass boost earphones with in-line microphone and 3 months warranty', c.id, u.id, 500.00, 850.00, 8, 3, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u WHERE c.name = 'Mobile accessories' AND u.shortName IN ('Pcs', 'Pieces') LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 3, `sellingPrice` = 850.00;

-- Power Bank (12 Months warranty)
INSERT INTO `Product` (`code`, `barcode`, `name`, `description`, `categoryId`, `unitId`, `purchasePrice`, `sellingPrice`, `minimumStock`, `warrantyMonths`, `status`, `createdAt`, `updatedAt`)
SELECT 'PRD-ACC-PB-10K', '8901234004', '10000mAh Ultra-Slim Fast Power Bank', 'Dual USB + Type-C 22.5W fast power bank with 1 Year (12 Months) warranty', c.id, u.id, 2800.00, 4200.00, 3, 12, 'ACTIVE', NOW(), NOW()
FROM `Category` c, `Unit` u WHERE c.name = 'Mobile accessories' AND u.shortName IN ('Pcs', 'Pieces') LIMIT 1
ON DUPLICATE KEY UPDATE `warrantyMonths` = 12, `sellingPrice` = 4200.00;

SET FOREIGN_KEY_CHECKS = 1;

-- Finished successfully!
SELECT 'Database update completed successfully!' AS Result;

