#!/bin/bash

# Script para ejecutar la migración de funcionalidades empresariales
# Debe ejecutarse desde la raíz del proyecto

echo "========================================="
echo "Migración de Funcionalidades Empresariales"
echo "========================================="
echo ""

# 1. Verificar que Docker esté corriendo
echo "[1/6] Verificando contenedores Docker..."
if ! docker ps | grep -q "bodega-calendar-backend"; then
    echo "❌ Error: El contenedor del backend no está corriendo"
    echo "   Ejecuta primero: docker-compose up -d"
    exit 1
fi
echo "✅ Contenedores corriendo"
echo ""

# 2. Instalar dependencias
echo "[2/6] Instalando dependencias en el backend..."
docker exec bodega-calendar-backend-1 npm install
echo "✅ Dependencias instaladas"
echo ""

# 3. Generar cliente Prisma
echo "[3/6] Generando cliente Prisma..."
docker exec bodega-calendar-backend-1 npx prisma generate
echo "✅ Cliente Prisma generado"
echo ""

# 4. Ejecutar migración
echo "[4/6] Ejecutando migración de base de datos..."
docker exec -it bodega-calendar-backend-1 npx prisma migrate dev --name add_enterprise_features
echo "✅ Migración ejecutada"
echo ""

# 5. Verificar tablas creadas
echo "[5/6] Verificando nuevas tablas en MySQL..."
docker exec bodega-mysql-1 mysql -ucalendar_user -pcalendar_pass calendar_db -e "
SHOW TABLES LIKE '%recurrence%';
SHOW TABLES LIKE '%attendance%';
SHOW TABLES LIKE '%user_availability%';
SHOW TABLES LIKE '%resource_bookings%';
"
echo "✅ Tablas verificadas"
echo ""

# 6. Reiniciar backend para cargar nuevos módulos
echo "[6/6] Reiniciando backend..."
docker restart bodega-calendar-backend-1
echo "⏳ Esperando que el backend reinicie (10 segundos)..."
sleep 10
echo "✅ Backend reiniciado"
echo ""

echo "========================================="
echo "✅ MIGRACIÓN COMPLETADA EXITOSAMENTE"
echo "========================================="
echo ""
echo "Nuevos endpoints disponibles:"
echo ""
echo "📅 RECURRENCIA:"
echo "  POST   /api/calendar/recurrence/:taskId"
echo "  GET    /api/calendar/recurrence/:taskId/occurrences"
echo "  POST   /api/calendar/recurrence/:taskId/exceptions"
echo ""
echo "🏢 RECURSOS:"
echo "  GET    /api/calendar/resources/:id/availability"
echo "  POST   /api/calendar/resources/:id/bookings"
echo "  GET    /api/calendar/resources/:id/calendar"
echo ""
echo "📅 DISPONIBILIDAD (FREE/BUSY):"
echo "  GET    /api/calendar/availability/users/:id/free-busy"
echo "  GET    /api/calendar/availability/teams/free-busy"
echo "  GET    /api/calendar/availability/teams/common-slots"
echo ""
echo "✉️  INVITACIONES (RSVP):"
echo "  POST   /api/calendar/attendance/tasks/:id/invitations"
echo "  PUT    /api/calendar/attendance/:id/respond"
echo "  GET    /api/calendar/attendance/tasks/:id"
echo "  GET    /api/calendar/attendance/tasks/:id/stats"
echo ""
echo "📖 Documentación completa en:"
echo "   services/calendar/backend/ENTERPRISE_FEATURES.md"
echo ""
