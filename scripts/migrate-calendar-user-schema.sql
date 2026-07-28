-- Migración: Renombrar active a isActive y agregar allowedModules
-- Base de datos: calendar_db
-- Fecha: 2025-01-02

USE calendar_db;

-- PASO 1: Migrar tabla users
-- ========================================

-- Agregar nueva columna isActive
ALTER TABLE users ADD COLUMN isActive BOOLEAN DEFAULT true AFTER position;

-- Copiar datos de active a isActive
UPDATE users SET isActive = active;

-- Eliminar columna antigua active
ALTER TABLE users DROP COLUMN active;

-- Agregar columna allowedModules
ALTER TABLE users ADD COLUMN allowedModules TEXT AFTER isActive;

-- PASO 2: Migrar tabla work_schedules
-- ========================================

-- Agregar nueva columna isActive
ALTER TABLE work_schedules ADD COLUMN isActive BOOLEAN DEFAULT true AFTER validUntil;

-- Copiar datos de active a isActive
UPDATE work_schedules SET isActive = active;

-- Eliminar columna antigua active
ALTER TABLE work_schedules DROP COLUMN active;

-- Verificar cambios
DESCRIBE users;
DESCRIBE work_schedules;

SELECT 'Migración completada exitosamente' AS status;
