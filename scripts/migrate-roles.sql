-- Migración de Roles
-- De: SUPER_ADMIN, ADMIN, MANAGER, VIEWER
-- A: SUPER_ADMIN, GERENTE, JEFE, TECNICO

-- Paso 1: Crear tabla temporal para mapeo
CREATE TEMPORARY TABLE role_mapping (
  old_role VARCHAR(50),
  new_role VARCHAR(50)
);

-- Paso 2: Insertar mapeos
INSERT INTO role_mapping (old_role, new_role) VALUES
('SUPER_ADMIN', 'SUPER_ADMIN'),  -- Sin cambios
('ADMIN', 'GERENTE'),             -- Admin -> Gerente
('MANAGER', 'JEFE'),               -- Manager -> Jefe  
('VIEWER', 'TECNICO'),             -- Viewer -> Técnico
('EMPLOYEE', 'TECNICO');           -- Employee (calendar) -> Técnico

-- Paso 3: Actualizar usuarios en auth
UPDATE users u
INNER JOIN role_mapping rm ON u.role = rm.old_role
SET u.role = rm.new_role;

-- Paso 4: Actualizar usuarios en calendar (si existe la tabla)
UPDATE calendar_users cu
INNER JOIN role_mapping rm ON cu.role = rm.old_role
SET cu.role = rm.new_role
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'calendar_users');

-- Paso 5: Verificar cambios
SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role;

-- Paso 6: Limpiar
DROP TEMPORARY TABLE role_mapping;
