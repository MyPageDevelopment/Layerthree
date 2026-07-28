# ====================================================================
# SCRIPT DE RESTAURACIÓN - INVENTARIO
# Sistema de Intranet Layerthree
# ====================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

# Validar que el archivo existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ Error: Archivo de backup no encontrado: $BackupFile" -ForegroundColor Red
    exit 1
}

# Configuración
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogFile = "D:\backups\inventory\restore_log_$Timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $LogFile -Value $LogMessage
    
    switch ($Level) {
        "ERROR" { Write-Host $LogMessage -ForegroundColor Red }
        "WARNING" { Write-Host $LogMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $LogMessage -ForegroundColor Green }
        default { Write-Host $LogMessage }
    }
}

Write-Log "=== INICIO DE RESTAURACIÓN DE BASE DE DATOS ===" "WARNING"

# Configuración de la base de datos
$DbHost = "localhost"
$DbPort = "3307"
$DbUser = "root"
$DbPassword = "rootpassword"  # ⚠️ CAMBIAR EN PRODUCCIÓN
$DbName = "inventory_db"

# Path a mysql
$MysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (-not (Test-Path $MysqlPath)) {
    $MysqlPath = (Get-Command mysql -ErrorAction SilentlyContinue).Source
}

# Descomprimir si es ZIP
$SqlFile = $BackupFile
if ($BackupFile -match '\.zip$') {
    Write-Log "Descomprimiendo archivo ZIP..." "INFO"
    $TempDir = Join-Path $env:TEMP "inventory_restore_$Timestamp"
    Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force
    $SqlFile = Get-ChildItem -Path $TempDir -Filter "*.sql" | Select-Object -First 1 -ExpandProperty FullName
}

Write-Log "Archivo SQL a restaurar: $SqlFile" "INFO"

# Confirmación
Write-Host "`n⚠️  ADVERTENCIA: Esta operación SOBRESCRIBIRÁ la base de datos actual." -ForegroundColor Yellow
Write-Host "Base de datos: $DbName" -ForegroundColor Yellow
$Confirmation = Read-Host "¿Desea continuar? (escriba 'SI' para confirmar)"

if ($Confirmation -ne 'SI') {
    Write-Log "Restauración cancelada por el usuario" "WARNING"
    exit 0
}

try {
    Write-Log "Iniciando restauración..." "INFO"
    
    $Arguments = @(
        "-h", $DbHost,
        "-P", $DbPort,
        "-u", $DbUser,
        "-p$DbPassword",
        $DbName
    )

    Get-Content $SqlFile | & $MysqlPath @Arguments

    Write-Log "✅ Base de datos restaurada exitosamente" "SUCCESS"

} catch {
    Write-Log "❌ Error durante la restauración: $_" "ERROR"
    exit 1
} finally {
    # Limpiar archivos temporales
    if ($BackupFile -match '\.zip$' -and (Test-Path $TempDir)) {
        Remove-Item -Path $TempDir -Recurse -Force
    }
}

Write-Log "=== RESTAURACIÓN FINALIZADA ===" "SUCCESS"
