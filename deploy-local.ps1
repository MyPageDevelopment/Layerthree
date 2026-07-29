# ====================================================================
# SCRIPT DE DESPLIEGUE LOCAL (WINDOWS SERVER / LOCAL LAN)
# Sistema Intranet Layerthree - Monolito Modular
# ====================================================================

Write-Host "Iniciando despliegue de produccion en servidor local..." -ForegroundColor Cyan

# 1. Levantar contenedores en modo desatendido
Write-Host "Construyendo y levantando contenedores Docker..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al construir o iniciar los contenedores Docker." -ForegroundColor Red
    exit 1
}

# 2. Esperar a que la base de datos MySQL esté lista
Write-Host "Esperando a que el contenedor de Base de Datos este listo..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    $attempt++
    Start-Sleep -Seconds 2
    $status = docker inspect --format='{{json .State.Health.Status}}' bodega-mysql-monolith 2>$null
    if ($status -eq '"healthy"') {
        $healthy = $true
        Write-Host "Base de datos MySQL esta saludable. Esperando estabilizacion..." -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Intentando conectar a MySQL ($attempt/$maxAttempts)..." -ForegroundColor Gray
    }
}

if (-not $healthy) {
    Write-Host "La base de datos tardo demasiado en iniciar. Revisa los logs con: docker logs bodega-mysql-monolith" -ForegroundColor Red
    exit 1
}

# 3. Sincronización y Seeding automático mediante docker-entrypoint del Backend
Write-Host "Verificando inicializacion de esquemas y usuarios base..." -ForegroundColor Yellow
docker exec -i bodega-backend-monolith node prisma/seed.js

Write-Host "======================================================" -ForegroundColor Green
Write-Host "DESPLIEGUE COMPLETADO CON EXITO EN EL SERVIDOR LOCAL" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Frontend Web: http://localhost (o http://<IP_LOCAL_SERVIDOR>)" -ForegroundColor Cyan
Write-Host "Backend API:  http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
docker-compose ps
