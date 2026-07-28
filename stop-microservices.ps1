# ====================================================================
# DETENER SISTEMA DE MICROSERVICIOS
# ====================================================================

Write-Host "🛑 Deteniendo Sistema de Microservicios..." -ForegroundColor Yellow
Write-Host ""

docker-compose -f docker-compose.microservices.yml down

Write-Host ""
Write-Host "✅ Todos los servicios han sido detenidos" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Para eliminar también los volúmenes de datos:" -ForegroundColor Cyan
Write-Host "   docker-compose -f docker-compose.microservices.yml down -v" -ForegroundColor Gray
Write-Host ""
