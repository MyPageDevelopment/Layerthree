-- CreateTable: shift_types
CREATE TABLE `shift_types` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(7) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `shift_types_code_key`(`code`),
    INDEX `shift_types_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: work_schedules - Agregar shiftTypeId
ALTER TABLE `work_schedules` ADD COLUMN `shiftTypeId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `work_schedules_shiftTypeId_idx` ON `work_schedules`(`shiftTypeId`);

-- AddForeignKey
ALTER TABLE `work_schedules` ADD CONSTRAINT `work_schedules_shiftTypeId_fkey` FOREIGN KEY (`shiftTypeId`) REFERENCES `shift_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
