# ====================================================================
# SCRIPT DE GENERACIÓN Y ROTACIÓN DE JWT SECRETS
# Sistema de Intranet Layerthree
# ====================================================================
# Uso: .\scripts\rotate-jwt-secrets.ps1

param(
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
====================================================================
SCRIPT DE ROTACIÓN DE JWT SECRETS
====================================================================

USO:
    .\scripts\rotate-jwt-secrets.ps1 [OPCIONES]

OPCIONES:
    -Force      Rotar secrets sin confirmación
    -Help       Mostrar esta ayuda

DESCRIPCIÓN:
    Este script genera secrets criptográficamente seguros para JWT
    y los almacena en ./secrets/

SEGURIDAD:
    - Genera 64 bytes aleatorios (512 bits)
    - Codificación Base64 para compatibilidad
    - Crea backup de secrets anteriores
    - No commitea secrets a Git

DESPUÉS DE EJECUTAR:
    1. Reiniciar todos los servicios
    2. Los tokens antiguos quedarán invalidados
    3. Los usuarios deberán volver a loguearse

====================================================================
"@
    exit 0
}

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "     ROTACIÓN DE JWT SECRETS - Sistema Intranet Layerthree" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la raíz del proyecto
if (-not (Test-Path ".\docker-compose.microservices.yml")) {
    Write-Host "❌ ERROR: Ejecuta este script desde la raíz del proyecto" -ForegroundColor Red
    Write-Host "   Ruta actual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Crear directorio secrets si no existe
if (-not (Test-Path ".\secrets")) {
    Write-Host "📁 Creando directorio secrets..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path ".\secrets" | Out-Null
}

# Función para generar secret aleatorio
function Generate-SecureSecret {
    $bytes = New-Object byte[] 64
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Advertencia
if (-not $Force) {
    Write-Host "⚠️  ADVERTENCIA:" -ForegroundColor Yellow
    Write-Host "   - Esta acción generará nuevos JWT secrets" -ForegroundColor Yellow
    Write-Host "   - TODOS los tokens existentes quedarán INVALIDADOS" -ForegroundColor Yellow
    Write-Host "   - Los usuarios deberán volver a loguearse" -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "¿Deseas continuar? (S/N)"
    if ($confirmation -ne 'S' -and $confirmation -ne 's') {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 0
    }
}

Write-Host ""

# Crear backup de secrets existentes
$backupDir = ".\secrets\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if ((Test-Path ".\secrets\jwt_secret.txt") -or (Test-Path ".\secrets\jwt_refresh_secret.txt")) {
    Write-Host "💾 Creando backup de secrets anteriores..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    if (Test-Path ".\secrets\jwt_secret.txt") {
        Copy-Item ".\secrets\jwt_secret.txt" "$backupDir\jwt_secret.txt"
    }
    if (Test-Path ".\secrets\jwt_refresh_secret.txt") {
        Copy-Item ".\secrets\jwt_refresh_secret.txt" "$backupDir\jwt_refresh_secret.txt"
    }
    
    Write-Host "   ✅ Backup creado en: $backupDir" -ForegroundColor Green
}

# Generar nuevos secrets
Write-Host ""
Write-Host "🔐 Generando nuevos JWT secrets..." -ForegroundColor Cyan

$jwtSecret = Generate-SecureSecret
$jwtRefreshSecret = Generate-SecureSecret

# Guardar secrets en archivos
Set-Content -Path ".\secrets\jwt_secret.txt" -Value $jwtSecret -NoNewline
Set-Content -Path ".\secrets\jwt_refresh_secret.txt" -Value $jwtRefreshSecret -NoNewline

Write-Host "   ✅ jwt_secret.txt creado ($(($jwtSecret.Length)) caracteres)" -ForegroundColor Green
Write-Host "   ✅ jwt_refresh_secret.txt creado ($(($jwtRefreshSecret.Length)) caracteres)" -ForegroundColor Green

# Actualizar .gitignore
$gitignorePath = ".\.gitignore"
if (Test-Path $gitignorePath) {
    $gitignoreContent = Get-Content $gitignorePath -Raw
    if ($gitignoreContent -notmatch "secrets/") {
        Write-Host ""
        Write-Host "📝 Agregando secrets/ a .gitignore..." -ForegroundColor Cyan
        Add-Content -Path $gitignorePath -Value "`n# JWT Secrets (NO COMMITEAR)`nsecrets/"
        Write-Host "   ✅ .gitignore actualizado" -ForegroundColor Green
    }
}

# Instrucciones finales
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "     ✅ SECRETS GENERADOS EXITOSAMENTE" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Reiniciar los servicios:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.microservices.yml restart" -ForegroundColor White
Write-Host ""
Write-Host "2. O reconstruir completamente:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.microservices.yml down" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.microservices.yml up -d" -ForegroundColor White
Write-Host ""
Write-Host "3. Verificar que los servicios levantaron correctamente:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.microservices.yml ps" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Los usuarios existentes deberán volver a loguearse" -ForegroundColor Yellow
Write-Host "   - Los tokens antiguos ya NO son válidos" -ForegroundColor Yellow
Write-Host "   - NO commitees los archivos en ./secrets/ a Git" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 TIP: Programa rotaciones periódicas cada 90 días" -ForegroundColor Cyan
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
