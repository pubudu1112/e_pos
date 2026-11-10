CREATE TABLE `BusinessEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(150) NOT NULL,
    `description` VARCHAR(500) NULL,
    `eventType` VARCHAR(50) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BusinessEvent_startDate_endDate_isActive_idx` (`startDate`, `endDate`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `ForecastAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dedupeKey` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` VARCHAR(1000) NOT NULL,
    `alertType` VARCHAR(50) NOT NULL,
    `priority` VARCHAR(20) NOT NULL,
    `recommendedAction` VARCHAR(500) NULL,
    `productId` INTEGER NULL,
    `categoryId` INTEGER NULL,
    `forecastStart` DATETIME(3) NULL,
    `forecastEnd` DATETIME(3) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ForecastAlert_dedupeKey_key` (`dedupeKey`),
    INDEX `ForecastAlert_isActive_isRead_priority_idx` (`isActive`, `isRead`, `priority`),
    INDEX `ForecastAlert_alertType_createdAt_idx` (`alertType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;