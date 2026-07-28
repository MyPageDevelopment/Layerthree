-- Migration: Agregar shiftTypeId a la tabla tasks
-- Descripción: Permite asociar tareas con tipos de jornada
-- Fecha: 2026-01-02

USE calendar_db;

-- Agregar columna shiftTypeId a tasks
ALTER TABLE tasks 
  ADD COLUMN shiftTypeId VARCHAR(191) NULL AFTER milestoneId;

-- Agregar índice para mejorar performance en queries
ALTER TABLE tasks 
  ADD INDEX tasks_shiftTypeId_idx (shiftTypeId);

-- Agregar foreign key constraint
ALTER TABLE tasks
  ADD CONSTRAINT tasks_shiftTypeId_fkey 
  FOREIGN KEY (shiftTypeId) 
  REFERENCES shift_types(id) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Verificar cambios
DESC tasks;
SHOW INDEX FROM tasks WHERE Key_name = 'tasks_shiftTypeId_idx';
