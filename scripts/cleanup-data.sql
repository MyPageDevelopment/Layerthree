-- ==========================================
-- SCRIPT DE LIMPIEZA DE DATOS
-- Sistema de Control de Bodega
-- Fecha: 2025-01-02
-- ==========================================
-- IMPORTANTE: Este script asume que ya tienes UUIDs.
-- Solo corrige inconsistencias menores.
-- ==========================================

START TRANSACTION;

-- LIMPIEZA 1: Eliminar duplicados de email (mantener el más reciente)
-- ==========================================

-- En auth_db
DELETE u1 FROM auth_db.users u1
INNER JOIN auth_db.users u2 
WHERE u1.email = u2.email 
AND u1.createdAt < u2.createdAt;

-- En inventory_db
DELETE u1 FROM inventory_db.users u1
INNER JOIN inventory_db.users u2 
WHERE u1.email = u2.email 
AND u1.createdAt < u2.createdAt;

-- En calendar_db
DELETE u1 FROM calendar_db.users u1
INNER JOIN calendar_db.users u2 
WHERE u1.email = u2.email 
AND u1.createdAt < u2.createdAt;


-- LIMPIEZA 2: Eliminar duplicados de SKU en productos
-- ==========================================

DELETE p1 FROM inventory_db.products p1
INNER JOIN inventory_db.products p2 
WHERE p1.sku = p2.sku 
AND p1.createdAt < p2.createdAt;


-- LIMPIEZA 3: Eliminar duplicados de código en proyectos
-- ==========================================

DELETE p1 FROM calendar_db.projects p1
INNER JOIN calendar_db.projects p2 
WHERE p1.code = p2.code 
AND p1.createdAt < p2.createdAt;


-- LIMPIEZA 4: Eliminar duplicados de código en tareas
-- ==========================================

DELETE t1 FROM calendar_db.tasks t1
INNER JOIN calendar_db.tasks t2 
WHERE t1.code = t2.code 
AND t1.createdAt < t2.createdAt;


-- LIMPIEZA 5: Corregir allowedModules que no son JSON válidos
-- ==========================================

-- En auth_db: Convertir a NULL si no es JSON válido
UPDATE auth_db.users
SET allowedModules = NULL
WHERE allowedModules IS NOT NULL 
AND NOT JSON_VALID(allowedModules);

-- En inventory_db: Convertir a NULL si no es JSON válido
UPDATE inventory_db.users
SET allowedModules = NULL
WHERE allowedModules IS NOT NULL 
AND NOT JSON_VALID(allowedModules);


-- LIMPIEZA 6: Corregir tags que no son JSON válidos
-- ==========================================

UPDATE calendar_db.projects
SET tags = NULL
WHERE tags IS NOT NULL 
AND NOT JSON_VALID(tags);

UPDATE calendar_db.tasks
SET tags = NULL
WHERE tags IS NOT NULL 
AND NOT JSON_VALID(tags);


-- LIMPIEZA 7: Eliminar movimientos huérfanos (sin producto o usuario)
-- ==========================================

DELETE m FROM inventory_db.movements m
LEFT JOIN inventory_db.products p ON m.productId = p.id
WHERE p.id IS NULL;

DELETE m FROM inventory_db.movements m
LEFT JOIN inventory_db.users u ON m.userId = u.id
WHERE u.id IS NULL;


-- LIMPIEZA 8: Corregir proyectos huérfanos (sin owner válido)
-- ==========================================

-- Eliminar proyectos sin owner válido
DELETE p FROM calendar_db.projects p
LEFT JOIN calendar_db.users u ON p.ownerId = u.id
WHERE u.id IS NULL;

-- Limpiar managerId inválidos (poner NULL en lugar de eliminar)
UPDATE calendar_db.projects p
LEFT JOIN calendar_db.users u ON p.managerId = u.id
SET p.managerId = NULL
WHERE p.managerId IS NOT NULL AND u.id IS NULL;


-- LIMPIEZA 9: Limpiar tareas huérfanas
-- ==========================================

-- Eliminar tareas sin proyecto válido
DELETE t FROM calendar_db.tasks t
LEFT JOIN calendar_db.projects p ON t.projectId = p.id
WHERE p.id IS NULL;

-- Limpiar parentTaskId inválidos
UPDATE calendar_db.tasks t1
LEFT JOIN calendar_db.tasks t2 ON t1.parentTaskId = t2.id
SET t1.parentTaskId = NULL
WHERE t1.parentTaskId IS NOT NULL AND t2.id IS NULL;

-- Limpiar milestoneId inválidos
UPDATE calendar_db.tasks t
LEFT JOIN calendar_db.milestones m ON t.milestoneId = m.id
SET t.milestoneId = NULL
WHERE t.milestoneId IS NOT NULL AND m.id IS NULL;


-- LIMPIEZA 10: Sincronizar campo active -> isActive en calendar_db
-- ==========================================

-- Renombrar columna si existe 'active' en lugar de 'isActive'
-- Nota: Solo ejecutar si tu esquema actual usa 'active'
-- ALTER TABLE calendar_db.users CHANGE COLUMN active isActive BOOLEAN DEFAULT true;


-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================

SELECT '=== VERIFICACIÓN POST-LIMPIEZA ===' AS info;

-- Contar registros después de limpieza
SELECT 
    'Usuarios en auth_db' AS tabla,
    COUNT(*) AS total
FROM auth_db.users
UNION ALL
SELECT 
    'Usuarios en inventory_db',
    COUNT(*)
FROM inventory_db.users
UNION ALL
SELECT 
    'Usuarios en calendar_db',
    COUNT(*)
FROM calendar_db.users
UNION ALL
SELECT 
    'Productos',
    COUNT(*)
FROM inventory_db.products
UNION ALL
SELECT 
    'Movimientos',
    COUNT(*)
FROM inventory_db.movements
UNION ALL
SELECT 
    'Proyectos',
    COUNT(*)
FROM calendar_db.projects
UNION ALL
SELECT 
    'Tareas',
    COUNT(*)
FROM calendar_db.tasks;

-- Si todo está OK, hacer commit
-- COMMIT;

-- Si algo salió mal, deshacer cambios
-- ROLLBACK;

-- ==========================================
-- INSTRUCCIONES DE USO:
-- ==========================================
-- 1. Ejecutar primero validate-data-consistency.sql
-- 2. Revisar los resultados
-- 3. Hacer BACKUP de las bases de datos:
--    mysqldump -u root -p auth_db > backup_auth_db.sql
--    mysqldump -u root -p inventory_db > backup_inventory_db.sql
--    mysqldump -u root -p calendar_db > backup_calendar_db.sql
-- 4. Ejecutar este script
-- 5. Revisar los resultados de la verificación final
-- 6. Si todo está OK: ejecutar COMMIT;
-- 7. Si algo falló: ejecutar ROLLBACK;
-- ==========================================
