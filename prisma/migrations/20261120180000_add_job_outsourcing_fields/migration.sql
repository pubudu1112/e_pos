ALTER TABLE `Job`
    ADD COLUMN `isOutsourced` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `supplierId` INTEGER NULL,
    ADD COLUMN `outsourcedCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `supplierBillNo` VARCHAR(100) NULL,
    ADD COLUMN `supplierPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD INDEX `Job_supplierId_idx` (`supplierId`);

ALTER TABLE `Job`
    ADD CONSTRAINT `Job_supplierId_fkey`
    FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
