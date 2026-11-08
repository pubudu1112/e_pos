
CREATE TABLE `ServiceCostComponent` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `serviceId` INT NOT NULL,
    `productId` INT NULL,
    `costType` ENUM('INVENTORY', 'MANUAL') NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    `unitCost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`),

    INDEX `ServiceCostComponent_serviceId_idx` (`serviceId`),
    INDEX `ServiceCostComponent_productId_idx` (`productId`),
    INDEX `ServiceCostComponent_costType_idx` (`costType`),

    CONSTRAINT `ServiceCostComponent_productId_fkey`
        FOREIGN KEY (`productId`)
        REFERENCES `Product` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `ServiceCostComponent_serviceId_fkey`
        FOREIGN KEY (`serviceId`)
        REFERENCES `Service` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
