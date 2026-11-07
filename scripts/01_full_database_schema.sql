-- ============================================================
-- PUBUDU POS SYSTEM - COMPLETE DATABASE SCHEMA (MYSQL / MARIADB)
-- Created for full new installation
-- ============================================================

CREATE DATABASE IF NOT EXISTS `pubudu_pos` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pubudu_pos`;

SET FOREIGN_KEY_CHECKS = 0;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NULL,
    `entityId` VARCHAR(100) NULL,
    `details` TEXT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Brand` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Brand_name_key`(`name`),
    INDEX `Brand_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    INDEX `Category_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `creditLimit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `openingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_code_key`(`code`),
    INDEX `Customer_isActive_idx`(`isActive`),
    INDEX `Customer_name_idx`(`name`),
    INDEX `Customer_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerTransaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `saleId` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `debit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CustomerTransaction_createdAt_idx`(`createdAt`),
    INDEX `CustomerTransaction_customerId_idx`(`customerId`),
    INDEX `CustomerTransaction_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `expenseNo` VARCHAR(50) NOT NULL,
    `categoryId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMethodId` INTEGER NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Expense_expenseNo_key`(`expenseNo`),
    INDEX `Expense_categoryId_idx`(`categoryId`),
    INDEX `Expense_createdById_idx`(`createdById`),
    INDEX `Expense_expenseDate_idx`(`expenseDate`),
    INDEX `Expense_paymentMethodId_fkey`(`paymentMethodId`),
    INDEX `Expense_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExpenseCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobNo` VARCHAR(50) NOT NULL,
    `customerId` INTEGER NULL,
    `saleId` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('NEW', 'DESIGNING', 'WAITING_APPROVAL', 'APPROVED', 'PRINTING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `startDate` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `advanceAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balanceAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `isOutsourced` BOOLEAN NOT NULL DEFAULT false,
    `supplierId` INTEGER NULL,
    `outsourcedCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `supplierBillNo` VARCHAR(100) NULL,
    `supplierPaid` BOOLEAN NOT NULL DEFAULT false,
    `createdById` INTEGER NOT NULL,
    `assignedToId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Job_jobNo_key`(`jobNo`),
    INDEX `Job_assignedToId_idx`(`assignedToId`),
    INDEX `Job_createdById_idx`(`createdById`),
    INDEX `Job_customerId_idx`(`customerId`),
    INDEX `Job_dueDate_idx`(`dueDate`),
    INDEX `Job_saleId_idx`(`saleId`),
    INDEX `Job_status_idx`(`status`),
    INDEX `Job_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `serviceId` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,

    INDEX `JobItem_jobId_idx`(`jobId`),
    INDEX `JobItem_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,

    INDEX `JobPayment_jobId_idx`(`jobId`),
    INDEX `JobPayment_paymentDate_idx`(`paymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobStatusHistory` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `status` ENUM('NEW', 'DESIGNING', 'WAITING_APPROVAL', 'APPROVED', 'PRINTING', 'FINISHING', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JobStatusHistory_createdAt_idx`(`createdAt`),
    INDEX `JobStatusHistory_jobId_idx`(`jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `paymentMethodId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,

    INDEX `Payment_paymentDate_idx`(`paymentDate`),
    INDEX `Payment_paymentMethodId_idx`(`paymentMethodId`),
    INDEX `Payment_saleId_idx`(`saleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentMethod` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE', 'CREDIT', 'OTHER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentMethod_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `barcode` VARCHAR(100) NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(500) NULL,
    `categoryId` INTEGER NOT NULL,
    `brandId` INTEGER NULL,
    `unitId` INTEGER NOT NULL,
    `taxId` INTEGER NULL,
    `purchasePrice` DECIMAL(12, 2) NOT NULL,
    `sellingPrice` DECIMAL(12, 2) NOT NULL,
    `wholesalePrice` DECIMAL(12, 2) NULL,
    `minimumStock` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `warrantyMonths` INTEGER NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_code_key`(`code`),
    UNIQUE INDEX `Product_barcode_key`(`barcode`),
    INDEX `Product_brandId_idx`(`brandId`),
    INDEX `Product_categoryId_idx`(`categoryId`),
    INDEX `Product_status_idx`(`status`),
    INDEX `Product_taxId_idx`(`taxId`),
    INDEX `Product_unitId_idx`(`unitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseNo` VARCHAR(50) NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balanceAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Purchase_purchaseNo_key`(`purchaseNo`),
    INDEX `Purchase_createdById_idx`(`createdById`),
    INDEX `Purchase_purchaseDate_idx`(`purchaseDate`),
    INDEX `Purchase_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,

    INDEX `PurchaseItem_productId_idx`(`productId`),
    INDEX `PurchaseItem_purchaseId_idx`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchasePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchaseId` INTEGER NOT NULL,
    `paymentMethodId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,

    INDEX `PurchasePayment_paymentDate_idx`(`paymentDate`),
    INDEX `PurchasePayment_paymentMethodId_idx`(`paymentMethodId`),
    INDEX `PurchasePayment_purchaseId_idx`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RolePermission_permissionId_idx`(`permissionId`),
    INDEX `RolePermission_roleId_idx`(`roleId`),
    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNo` VARCHAR(50) NOT NULL,
    `customerId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `saleDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `balanceAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('COMPLETED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'COMPLETED',
    `paymentStatus` ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PAID',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sale_invoiceNo_key`(`invoiceNo`),
    INDEX `Sale_createdById_idx`(`createdById`),
    INDEX `Sale_customerId_idx`(`customerId`),
    INDEX `Sale_saleDate_idx`(`saleDate`),
    INDEX `Sale_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `serviceId` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `costPrice` DECIMAL(12, 2) NULL,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tax` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL,

    INDEX `SaleItem_productId_idx`(`productId`),
    INDEX `SaleItem_saleId_idx`(`saleId`),
    INDEX `SaleItem_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `categoryId` INTEGER NOT NULL,
    `taxId` INTEGER NULL,
    `basePrice` DECIMAL(12, 2) NOT NULL,
    `paperCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `tonerCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `machineCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Service_code_key`(`code`),
    INDEX `Service_categoryId_idx`(`categoryId`),
    INDEX `Service_status_idx`(`status`),
    INDEX `Service_taxId_idx`(`taxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceCategory_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePrice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServicePrice_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `reservedQuantity` DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Stock_productId_key`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAdjustment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adjustmentNo` VARCHAR(50) NOT NULL,
    `reason` VARCHAR(255) NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StockAdjustment_adjustmentNo_key`(`adjustmentNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockAdjustmentItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adjustmentId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `note` VARCHAR(255) NULL,

    INDEX `StockAdjustmentItem_adjustmentId_idx`(`adjustmentId`),
    INDEX `StockAdjustmentItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `type` ENUM('PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'DAMAGE', 'OPENING_STOCK', 'JOB_CONSUMPTION') NOT NULL,
    `quantity` DECIMAL(12, 3) NOT NULL,
    `referenceId` VARCHAR(100) NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_createdAt_idx`(`createdAt`),
    INDEX `StockMovement_productId_idx`(`productId`),
    INDEX `StockMovement_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `openingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Supplier_code_key`(`code`),
    INDEX `Supplier_isActive_idx`(`isActive`),
    INDEX `Supplier_name_idx`(`name`),
    INDEX `Supplier_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierTransaction` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `purchaseId` INTEGER NULL,
    `description` VARCHAR(255) NULL,
    `debit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `credit` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupplierTransaction_createdAt_idx`(`createdAt`),
    INDEX `SupplierTransaction_purchaseId_idx`(`purchaseId`),
    INDEX `SupplierTransaction_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tax` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tax_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `shortName` VARCHAR(20) NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Unit_name_key`(`name`),
    UNIQUE INDEX `Unit_shortName_key`(`shortName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(150) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `roleId` INTEGER NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_roleId_idx`(`roleId`),
    INDEX `User_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `referenceId` VARCHAR(100) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_isRead_idx`(`isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `sessionToken` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UserSession_sessionToken_key`(`sessionToken`),
    INDEX `UserSession_expiresAt_idx`(`expiresAt`),
    INDEX `UserSession_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warranty` (
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
    `updatedAt` DATETIME(3) NOT NULL,

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

-- CreateTable
CREATE TABLE `WarrantyClaim` (
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
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WarrantyClaim_claimNo_key`(`claimNo`),
    INDEX `WarrantyClaim_warrantyId_idx`(`warrantyId`),
    INDEX `WarrantyClaim_claimNo_idx`(`claimNo`),
    INDEX `WarrantyClaim_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTransaction` ADD CONSTRAINT `CustomerTransaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerTransaction` ADD CONSTRAINT `CustomerTransaction_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobItem` ADD CONSTRAINT `JobItem_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobItem` ADD CONSTRAINT `JobItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobPayment` ADD CONSTRAINT `JobPayment_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobStatusHistory` ADD CONSTRAINT `JobStatusHistory_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_taxId_fkey` FOREIGN KEY (`taxId`) REFERENCES `Tax`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePayment` ADD CONSTRAINT `PurchasePayment_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePayment` ADD CONSTRAINT `PurchasePayment_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ServiceCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_taxId_fkey` FOREIGN KEY (`taxId`) REFERENCES `Tax`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServicePrice` ADD CONSTRAINT `ServicePrice_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Stock` ADD CONSTRAINT `Stock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustmentItem` ADD CONSTRAINT `StockAdjustmentItem_adjustmentId_fkey` FOREIGN KEY (`adjustmentId`) REFERENCES `StockAdjustment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockAdjustmentItem` ADD CONSTRAINT `StockAdjustmentItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierTransaction` ADD CONSTRAINT `SupplierTransaction_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierTransaction` ADD CONSTRAINT `SupplierTransaction_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Warranty` ADD CONSTRAINT `Warranty_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarrantyClaim` ADD CONSTRAINT `WarrantyClaim_warrantyId_fkey` FOREIGN KEY (`warrantyId`) REFERENCES `Warranty`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarrantyClaim` ADD CONSTRAINT `WarrantyClaim_handledById_fkey` FOREIGN KEY (`handledById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

