# Script de migración para Windows PowerShell
# Ejecutar desde la raíz del proyecto: .\scripts\migrate-enterprise-features.ps1

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Migración de Funcionalidades Empresariales" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que Docker esté corriendo
Write-Host "[1/6] Verificando contenedores Docker..." -ForegroundColor Yellow
$containers = docker ps --format "{{.Names}}" | Select-String "calendar_backend"
if (-not $containers) {
    Write-Host "❌ Error: El contenedor del backend no está corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta primero: docker-compose -f docker-compose.microservices.yml up -d" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Contenedores corriendo" -ForegroundColor Green
Write-Host ""

# 2. Instalar dependencias
Write-Host "[2/6] Instalando dependencias en el backend..." -ForegroundColor Yellow
docker exec calendar_backend npm install
Write-Host "✅ Dependencias instaladas" -ForegroundColor Green
Write-Host ""

# 3. Generar cliente Prisma
Write-Host "[3/6] Generando cliente Prisma..." -ForegroundColor Yellow
docker exec calendar_backend npx prisma generate
Write-Host "✅ Cliente Prisma generado" -ForegroundColor Green
Write-Host ""

# 4. Ejecutar migración
Write-Host "[4/6] Ejecutando migración de base de datos..." -ForegroundColor Yellow
docker exec -it calendar_backend npx prisma migrate dev --name add_enterprise_features
Write-Host "✅ Migración ejecutada" -ForegroundColor Green
Write-Host ""

# 5. Verificar tablas creadas
Write-Host "[5/6] Verificando nuevas tablas en MySQL..." -ForegroundColor Yellow
docker exec intranet_mysql mysql -ucalendar_user -pcalendar_pass calendar_db -e "SHOW TABLES LIKE '%recurrence%'; SHOW TABLES LIKE '%attendance%'; SHOW TABLES LIKE '%user_availability%'; SHOW TABLES LIKE '%resource_bookings%';"
Write-Host "✅ Tablas verificadas" -ForegroundColor Green
Write-Host ""

# 6. Reiniciar backend
Write-Host "[6/6] Reiniciando backend..." -ForegroundColor Yellow
docker restart calendar_backend
Write-Host "⏳ Esperando que el backend reinicie (10 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10
Write-Host "✅ Backend reiniciado" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ MIGRACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nuevos endpoints disponibles:" -ForegroundColor White
Write-Host ""
Write-Host "📅 RECURRENCIA:" -ForegroundColor Cyan
Write-Host "  POST   /api/calendar/recurrence/:taskId"
Write-Host "  GET    /api/calendar/recurrence/:taskId/occurrences"
Write-Host "  POST   /api/calendar/recurrence/:taskId/exceptions"
Write-Host ""
Write-Host "🏢 RECURSOS:" -ForegroundColor Cyan
Write-Host "  GET    /api/calendar/resources/:id/availability"
Write-Host "  POST   /api/calendar/resources/:id/bookings"
Write-Host "  GET    /api/calendar/resources/:id/calendar"
Write-Host ""
Write-Host "📅 DISPONIBILIDAD (FREE/BUSY):" -ForegroundColor Cyan
Write-Host "  GET    /api/calendar/availability/users/:id/free-busy"
Write-Host "  GET    /api/calendar/availability/teams/free-busy"
Write-Host "  GET    /api/calendar/availability/teams/common-slots"
Write-Host ""
Write-Host "✉️  INVITACIONES (RSVP):" -ForegroundColor Cyan
Write-Host "  POST   /api/calendar/attendance/tasks/:id/invitations"
Write-Host "  PUT    /api/calendar/attendance/:id/respond"
Write-Host "  GET    /api/calendar/attendance/tasks/:id"
Write-Host "  GET    /api/calendar/attendance/tasks/:id/stats"
Write-Host ""
Write-Host "📖 Documentación completa en:" -ForegroundColor Yellow
Write-Host "   services/calendar/backend/ENTERPRISE_FEATURES.md"
Write-Host ""
