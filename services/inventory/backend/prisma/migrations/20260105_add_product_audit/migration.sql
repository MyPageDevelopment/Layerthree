-- CreateTable
CREATE TABLE `product_audits` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productSku` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userEmail` VARCHAR(191) NOT NULL,
    `userRole` ENUM('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO') NOT NULL,
    `changes` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_audits_productId_idx`(`productId`),
    INDEX `product_audits_userId_idx`(`userId`),
    INDEX `product_audits_action_idx`(`action`),
    INDEX `product_audits_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
