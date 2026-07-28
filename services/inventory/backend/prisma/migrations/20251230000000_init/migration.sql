-- CreateTable
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `allowedModules` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('EQUIPOS', 'RED', 'FIBRA_OPTICA', 'ELECTRICIDAD', 'CANALIZACION', 'INSUMOS') NOT NULL DEFAULT 'EQUIPOS',
    `subcategory` VARCHAR(191) NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `minStock` INTEGER NOT NULL DEFAULT 0,
    `unitPrice` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    INDEX `products_sku_idx`(`sku`),
    INDEX `products_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `movements` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NULL,
    `type` ENUM('ENTRY', 'EXIT') NOT NULL,
    `quantity` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `movements_productId_idx`(`productId`),
    INDEX `movements_projectId_idx`(`projectId`),
    INDEX `movements_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movements` ADD CONSTRAINT `movements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE CASCADE;
