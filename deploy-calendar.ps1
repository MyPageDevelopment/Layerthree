# ====================================================================
# SCRIPT DE DESPLIEGUE - MICROSERVICIO CALENDARIO
# ====================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DESPLEGANDO MICROSERVICIO CALENDARIO  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-Not (Test-Path "docker-compose.microservices.yml")) {
    Write-Host "ERROR: Debes ejecutar este script desde la raíz del proyecto" -ForegroundColor Red
    exit 1
}

# Detener contenedor anterior si existe
Write-Host "[1/6] Deteniendo contenedor anterior (si existe)..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml stop calendar-backend 2>$null
docker-compose -f docker-compose.microservices.yml rm -f calendar-backend 2>$null

# Verificar que MySQL esté corriendo
Write-Host "[2/6] Verificando MySQL..." -ForegroundColor Yellow
$mysqlStatus = docker ps --filter "name=intranet_mysql" --format "{{.Status}}"
if (-Not $mysqlStatus) {
    Write-Host "   MySQL no está corriendo. Iniciando servicios base..." -ForegroundColor Cyan
    docker-compose -f docker-compose.microservices.yml up -d mysql
    Write-Host "   Esperando 30 segundos a que MySQL esté listo..." -ForegroundColor Cyan
    Start-Sleep -Seconds 30
}
Write-Host "   MySQL: OK" -ForegroundColor Green

# Build del servicio
Write-Host "[3/6] Construyendo imagen Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml build calendar-backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló la construcción de la imagen" -ForegroundColor Red
    exit 1
}
Write-Host "   Build: OK" -ForegroundColor Green

# Levantar servicio
Write-Host "[4/6] Iniciando contenedor..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml up -d calendar-backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Falló el inicio del contenedor" -ForegroundColor Red
    exit 1
}

# Esperar a que el servicio esté listo
Write-Host "[5/6] Esperando a que el servicio esté listo..." -ForegroundColor Yellow
$maxRetries = 30
$retries = 0
$serviceReady = $false

while ($retries -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serviceReady = $true
            break
        }
    } catch {
        # Servicio no está listo aún
    }
    
    Write-Host "   Intento $($retries + 1)/$maxRetries..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $retries++
}

if (-Not $serviceReady) {
    Write-Host "ERROR: El servicio no respondió después de $maxRetries intentos" -ForegroundColor Red
    Write-Host "Mostrando logs..." -ForegroundColor Yellow
    docker-compose -f docker-compose.microservices.yml logs --tail=50 calendar-backend
    exit 1
}

Write-Host "   Servicio: OK" -ForegroundColor Green

# Reiniciar gateway para aplicar nueva configuración
Write-Host "[6/6] Reiniciando API Gateway..." -ForegroundColor Yellow
docker-compose -f docker-compose.microservices.yml restart gateway
Start-Sleep -Seconds 5

# Verificar que el gateway responde
try {
    $gatewayResponse = Invoke-WebRequest -Uri "http://localhost/api/calendar/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Gateway: OK" -ForegroundColor Green
} catch {
    Write-Host "   ADVERTENCIA: El gateway no responde aún. Puede tardar unos segundos." -ForegroundColor Yellow
}

# Resumen
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO EXITOSAMENTE  " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints disponibles:" -ForegroundColor Cyan
Write-Host "  - Directo:       http://localhost:3003/health" -ForegroundColor White
Write-Host "  - Gateway:       http://localhost/api/calendar/health" -ForegroundColor White
Write-Host "  - Swagger UI:    http://localhost/api/calendar/api/docs" -ForegroundColor White
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  Ver logs:        docker-compose -f docker-compose.microservices.yml logs -f calendar-backend" -ForegroundColor White
Write-Host "  Entrar al shell: docker exec -it calendar_backend sh" -ForegroundColor White
Write-Host "  Detener:         docker-compose -f docker-compose.microservices.yml stop calendar-backend" -ForegroundColor White
Write-Host ""
Write-Host "Estado de contenedores:" -ForegroundColor Cyan
docker ps --filter "name=calendar_backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
Write-Host ""
