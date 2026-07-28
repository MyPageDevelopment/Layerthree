# ====================================================================
# INICIAR SISTEMA DE MICROSERVICIOS
# ====================================================================

Write-Host "🚀 Iniciando Sistema de Intranet - Arquitectura de Microservicios" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Docker
Write-Host "📋 Verificando Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if (-not $dockerVersion) {
    Write-Host "❌ Docker no está instalado o no está en PATH" -ForegroundColor Red
    Write-Host "   Descarga Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green

# Verificar Docker Compose
$dockerComposeVersion = docker-compose --version 2>$null
if (-not $dockerComposeVersion) {
    Write-Host "❌ Docker Compose no está instalado" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker Compose: $dockerComposeVersion" -ForegroundColor Green
Write-Host ""

# Detener contenedores anteriores si existen
Write-Host "🛑 Deteniendo contenedores anteriores..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml down 2>$null
Write-Host ""

# Construir imágenes
Write-Host "🔨 Construyendo imágenes de Docker..." -ForegroundColor Yellow
Write-Host "   Esto puede tomar varios minutos la primera vez..." -ForegroundColor Gray
docker-compose -f docker-compose.microservices.yml build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir las imágenes" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Imágenes construidas" -ForegroundColor Green
Write-Host ""

# Iniciar servicios
Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al iniciar los servicios" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar estado de los servicios
Write-Host ""
Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
docker-compose -f docker-compose.microservices.yml ps

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "✅ SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 URLS DE ACCESO:" -ForegroundColor Yellow
Write-Host "   🌐 Gateway Principal:    http://localhost" -ForegroundColor White
Write-Host "   📦 Inventario (Bodega):  http://localhost" -ForegroundColor White
Write-Host "   🔌 API Inventario:       http://localhost/api/inventory" -ForegroundColor White
Write-Host "   ❤️  Health Check:         http://localhost/health" -ForegroundColor White
Write-Host ""
Write-Host "🔑 CREDENCIALES DE ACCESO:" -ForegroundColor Yellow
Write-Host "   Admin:  admin@bodega.com / Admin123!" -ForegroundColor White
Write-Host "   Viewer: viewer@bodega.com / Viewer123!" -ForegroundColor White
Write-Host ""
Write-Host "📝 COMANDOS ÚTILES:" -ForegroundColor Yellow
Write-Host "   Ver logs:           docker-compose -f docker-compose.microservices.yml logs -f" -ForegroundColor Gray
Write-Host "   Ver logs de 1 srv:  docker-compose -f docker-compose.microservices.yml logs -f [servicio]" -ForegroundColor Gray
Write-Host "   Detener todo:       docker-compose -f docker-compose.microservices.yml down" -ForegroundColor Gray
Write-Host "   Reiniciar:          docker-compose -f docker-compose.microservices.yml restart" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Lee MICROSERVICES_ARCHITECTURE.md para más información" -ForegroundColor Cyan
Write-Host ""
