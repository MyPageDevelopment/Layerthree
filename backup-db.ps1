# ====================================================================
# SCRIPT DE RESPALDO DE BASE DE DATOS MYSQL (POWERSHELL)
# Sistema Intranet Layerthree
# ====================================================================

$backupDir = Join-Path -Path $PSScriptRoot -ChildPath "backups"

# Crear directorio backups si no existe
if (-not (Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Creada carpeta de respaldos: $backupDir" -ForegroundColor Gray
}

# Timestamp para el archivo
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$backupFile = Join-Path -Path $backupDir -ChildPath "intranet_db_$timestamp.sql"

Write-Host "Generando respaldo de la base de datos MySQL..." -ForegroundColor Yellow

# Ejecutar mysqldump dentro del contenedor MySQL con Root Admin Password
docker exec -i bodega-mysql-monolith mysqldump -u root -pR8mX4vP9qL2zW7rN5tJ1yC3uK6bQ8zP intranet_layerthree_db > $backupFile

if (Test-Path -Path $backupFile) {
    $size = (Get-Item $backupFile).Length / 1KB
    Write-Host "Respaldo creado exitosamente: $backupFile ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "Error al generar el respaldo de base de datos." -ForegroundColor Red
}

# Eliminar respaldos antiguos con más de 30 días de antigüedad
Write-Host "Eliminando respaldos con mas de 30 dias de antiguedad..." -ForegroundColor Yellow
$limitDate = (Get-Date).AddDays(-30)
Get-ChildItem -Path $backupDir -Filter "intranet_db_*.sql" | Where-Object { $_.LastWriteTime -lt $limitDate } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Eliminado respaldo antiguo: $($_.Name)" -ForegroundColor Gray
}

Write-Host "Proceso de respaldo completado." -ForegroundColor Green
