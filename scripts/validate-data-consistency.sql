-- ==========================================
-- SCRIPT DE VALIDACIÓN Y LIMPIEZA DE DATOS
-- Sistema de Control de Bodega
-- Fecha: 2025-01-02
-- ==========================================

-- PASO 1: Verificar que todos los IDs son UUIDs válidos
-- ==========================================

-- Verificar tabla users en auth_db
SELECT 
    'auth_db.users' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM auth_db.users;

-- Verificar tabla users en inventory_db
SELECT 
    'inventory_db.users' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM inventory_db.users;

-- Verificar tabla users en calendar_db
SELECT 
    'calendar_db.users' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM calendar_db.users;

-- Verificar productos
SELECT 
    'inventory_db.products' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM inventory_db.products;

-- Verificar proyectos
SELECT 
    'calendar_db.projects' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM calendar_db.projects;

-- Verificar tareas
SELECT 
    'calendar_db.tasks' AS tabla,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN id REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_validos,
    SUM(CASE WHEN id NOT REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 ELSE 0 END) AS uuids_invalidos
FROM calendar_db.tasks;


-- PASO 2: Verificar integridad referencial entre microservicios
-- ==========================================

-- Verificar que los userId en movements existan en users
SELECT 
    'Movements con userId inválido' AS verificacion,
    COUNT(*) AS registros_huerfanos
FROM inventory_db.movements m
LEFT JOIN inventory_db.users u ON m.userId = u.id
WHERE u.id IS NULL;

-- Verificar que los productId en movements existan en products
SELECT 
    'Movements con productId inválido' AS verificacion,
    COUNT(*) AS registros_huerfanos
FROM inventory_db.movements m
LEFT JOIN inventory_db.products p ON m.productId = p.id
WHERE p.id IS NULL;

-- Verificar que los ownerId en projects existan en users
SELECT 
    'Projects con ownerId inválido' AS verificacion,
    COUNT(*) AS registros_huerfanos
FROM calendar_db.projects p
LEFT JOIN calendar_db.users u ON p.ownerId = u.id
WHERE u.id IS NULL;

-- Verificar que los managerId en projects existan en users
SELECT 
    'Projects con managerId inválido' AS verificacion,
    COUNT(*) AS registros_huerfanos
FROM calendar_db.projects p
LEFT JOIN calendar_db.users u ON p.managerId = u.id
WHERE p.managerId IS NOT NULL AND u.id IS NULL;


-- PASO 3: Detectar posibles duplicados por email
-- ==========================================

-- Usuarios duplicados en auth_db
SELECT 
    'auth_db - Emails duplicados' AS verificacion,
    email,
    COUNT(*) AS cantidad
FROM auth_db.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Usuarios duplicados en inventory_db
SELECT 
    'inventory_db - Emails duplicados' AS verificacion,
    email,
    COUNT(*) AS cantidad
FROM inventory_db.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Usuarios duplicados en calendar_db
SELECT 
    'calendar_db - Emails duplicados' AS verificacion,
    email,
    COUNT(*) AS cantidad
FROM calendar_db.users
GROUP BY email
HAVING COUNT(*) > 1;

-- Productos duplicados por SKU
SELECT 
    'inventory_db - SKUs duplicados' AS verificacion,
    sku,
    COUNT(*) AS cantidad
FROM inventory_db.products
GROUP BY sku
HAVING COUNT(*) > 1;

-- Proyectos duplicados por código
SELECT 
    'calendar_db - Códigos de proyecto duplicados' AS verificacion,
    code,
    COUNT(*) AS cantidad
FROM calendar_db.projects
GROUP BY code
HAVING COUNT(*) > 1;

-- Tareas duplicadas por código
SELECT 
    'calendar_db - Códigos de tarea duplicados' AS verificacion,
    code,
    COUNT(*) AS cantidad
FROM calendar_db.tasks
GROUP BY code
HAVING COUNT(*) > 1;


-- PASO 4: Verificar campos que deberían ser JSON
-- ==========================================

-- Verificar formato JSON en allowedModules (auth_db)
SELECT 
    id,
    email,
    allowedModules,
    CASE 
        WHEN allowedModules IS NULL THEN 'NULL'
        WHEN JSON_VALID(allowedModules) THEN 'JSON_VALIDO'
        ELSE 'JSON_INVALIDO'
    END AS estado_json
FROM auth_db.users
WHERE allowedModules IS NOT NULL AND NOT JSON_VALID(allowedModules);

-- Verificar formato JSON en allowedModules (inventory_db)
SELECT 
    id,
    email,
    allowedModules,
    CASE 
        WHEN allowedModules IS NULL THEN 'NULL'
        WHEN JSON_VALID(allowedModules) THEN 'JSON_VALIDO'
        ELSE 'JSON_INVALIDO'
    END AS estado_json
FROM inventory_db.users
WHERE allowedModules IS NOT NULL AND NOT JSON_VALID(allowedModules);

-- Verificar formato JSON en tags (projects)
SELECT 
    id,
    code,
    tags,
    CASE 
        WHEN tags IS NULL THEN 'NULL'
        WHEN JSON_VALID(tags) THEN 'JSON_VALIDO'
        ELSE 'JSON_INVALIDO'
    END AS estado_json
FROM calendar_db.projects
WHERE tags IS NOT NULL AND NOT JSON_VALID(tags);


-- PASO 5: Generar reporte de sincronización de usuarios entre servicios
-- ==========================================

-- Usuarios en auth_db que NO están en calendar_db
SELECT 
    'Usuario en Auth pero NO en Calendar' AS estado,
    a.id,
    a.email,
    a.name,
    a.role
FROM auth_db.users a
LEFT JOIN calendar_db.users c ON a.id = c.id
WHERE c.id IS NULL;

-- Usuarios en auth_db que NO están en inventory_db
SELECT 
    'Usuario en Auth pero NO en Inventory' AS estado,
    a.id,
    a.email,
    a.name,
    a.role
FROM auth_db.users a
LEFT JOIN inventory_db.users i ON a.id = i.id
WHERE i.id IS NULL;


-- PASO 6: Resumen ejecutivo
-- ==========================================

SELECT 
    'RESUMEN GENERAL' AS seccion,
    (SELECT COUNT(*) FROM auth_db.users) AS total_users_auth,
    (SELECT COUNT(*) FROM inventory_db.users) AS total_users_inventory,
    (SELECT COUNT(*) FROM calendar_db.users) AS total_users_calendar,
    (SELECT COUNT(*) FROM inventory_db.products) AS total_products,
    (SELECT COUNT(*) FROM inventory_db.movements) AS total_movements,
    (SELECT COUNT(*) FROM calendar_db.projects) AS total_projects,
    (SELECT COUNT(*) FROM calendar_db.tasks) AS total_tasks;
