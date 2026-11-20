CREATE TABLE `AppSetting` (
    `key` VARCHAR(100) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `LoginAttempt` (
    `key` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `LoginAttempt_createdAt_idx` (`createdAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

INSERT IGNORE INTO `Permission` (`code`, `name`, `description`, `createdAt`)
VALUES ('INVENTORY_ADJUST', 'Inventory Adjust', 'Access to inventory adjustments', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO `Permission` (`code`, `name`, `description`, `createdAt`)
VALUES ('SETTINGS_UPDATE', 'Settings Update', 'Access to update general settings', CURRENT_TIMESTAMP(3));
