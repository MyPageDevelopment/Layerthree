-- ====================================================================
-- INICIALIZACIÓN DE BASES DE DATOS - MICROSERVICIOS
-- Sistema Intranet Layerthree
-- ====================================================================

-- Crear base de datos para el microservicio de Inventario
CREATE DATABASE IF NOT EXISTS inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear base de datos para el microservicio de Calendario
CREATE DATABASE IF NOT EXISTS calendar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear base de datos para futuros microservicios
CREATE DATABASE IF NOT EXISTS payments_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS hr_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS projects_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Base de datos general para datos compartidos (si se necesita)
CREATE DATABASE IF NOT EXISTS shared_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Mensaje de confirmación
SELECT 'Bases de datos creadas exitosamente' AS status;
