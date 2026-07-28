-- ====================================================================
-- ÍNDICE OPTIMIZADO PARA LOW STOCK
-- Sistema de Intranet Layerthree - Microservicio Inventory
-- ====================================================================
-- 
-- Este índice mejora el rendimiento de la consulta getLowStock()
-- que compara stock <= minStock
--
-- NOTA: Este índice funcional solo está disponible en MySQL 8.0.13+
-- ====================================================================

USE inventory_db;

-- Verificar versión de MySQL (debe ser 8.0.13+)
SELECT VERSION();

-- Crear índice funcional para productos con stock bajo
-- Mejora la consulta: SELECT * FROM products WHERE stock <= minStock
ALTER TABLE products 
ADD INDEX idx_low_stock ((CAST((stock <= minStock) AS UNSIGNED)));

-- Índice alternativo basado en expresión calculada
-- Útil para ordenar por urgencia (cuánto falta para llegar a stock mínimo)
ALTER TABLE products
ADD INDEX idx_stock_deficit ((minStock - stock));

-- ====================================================================
-- VERIFICAR ÍNDICES CREADOS
-- ====================================================================

SHOW INDEXES FROM products;

-- ====================================================================
-- PRUEBA DE PERFORMANCE
-- ====================================================================

-- Antes del índice: Full table scan
EXPLAIN SELECT * FROM products WHERE stock <= minStock;

-- Después del índice: Index scan (más rápido)
EXPLAIN SELECT * FROM products WHERE stock <= minStock ORDER BY (minStock - stock) DESC;

-- ====================================================================
-- NOTAS
-- ====================================================================
-- 
-- 1. El índice funcional es más eficiente que escanear toda la tabla
-- 2. Para bases de datos grandes (>10,000 productos), mejora significativa
-- 3. El índice se actualiza automáticamente en INSERT/UPDATE
-- 4. Si MySQL < 8.0.13, usar vista materializada como alternativa
-- 
-- ====================================================================
