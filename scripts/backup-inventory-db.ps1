# ====================================================================
# SCRIPT DE BACKUP AUTOMATIZADO - INVENTARIO
# Sistema de Intranet Layerthree
# ====================================================================

param(
    [string]$BackupPath = "D:\backups\inventory",
    [int]$RetentionDays = 30
)

# Configuración
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupPath "inventory_backup_$Timestamp.sql"
$LogFile = Join-Path $BackupPath "backup_log_$Timestamp.log"

# Crear directorio de backups si no existe
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "✅ Directorio de backups creado: $BackupPath" -ForegroundColor Green
}

# Función de logging
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

Write-Log "=== INICIO DE BACKUP DE BASE DE DATOS INVENTARIO ===" "INFO"

# Configuración de la base de datos
$DbHost = "localhost"
$DbPort = "3307"
$DbUser = "root"
$DbPassword = "rootpassword"  # ⚠️ CAMBIAR EN PRODUCCIÓN - Usar secrets
$DbName = "inventory_db"

# Path al ejecutable de mysqldump (ajustar según instalación)
$MysqldumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"

# Verificar si mysqldump existe
if (-not (Test-Path $MysqldumpPath)) {
    # Intentar buscar en PATH
    $MysqldumpPath = (Get-Command mysqldump -ErrorAction SilentlyContinue).Source
    if (-not $MysqldumpPath) {
        Write-Log "❌ mysqldump no encontrado. Instalar MySQL Server o ajustar ruta." "ERROR"
        exit 1
    }
}

Write-Log "Iniciando backup de base de datos: $DbName" "INFO"
Write-Log "Archivo de destino: $BackupFile" "INFO"

try {
    # Realizar backup
    $Arguments = @(
        "-h", $DbHost,
        "-P", $DbPort,
        "-u", $DbUser,
        "-p$DbPassword",
        "--databases", $DbName,
        "--single-transaction",
        "--quick",
        "--lock-tables=false",
        "--routines",
        "--triggers",
        "--events",
        "--result-file=$BackupFile"
    )

    $Process = Start-Process -FilePath $MysqldumpPath -ArgumentList $Arguments -Wait -NoNewWindow -PassThru

    if ($Process.ExitCode -eq 0) {
        $FileSize = (Get-Item $BackupFile).Length / 1MB
        Write-Log "✅ Backup completado exitosamente. Tamaño: $([math]::Round($FileSize, 2)) MB" "SUCCESS"
        
        # Comprimir backup
        $ZipFile = "$BackupFile.zip"
        Compress-Archive -Path $BackupFile -DestinationPath $ZipFile -Force
        Remove-Item $BackupFile  # Eliminar SQL sin comprimir
        
        $ZipSize = (Get-Item $ZipFile).Length / 1MB
        Write-Log "📦 Backup comprimido: $([math]::Round($ZipSize, 2)) MB" "SUCCESS"
        
    } else {
        Write-Log "❌ Error al realizar backup. Código de salida: $($Process.ExitCode)" "ERROR"
        exit 1
    }

} catch {
    Write-Log "❌ Excepción durante el backup: $_" "ERROR"
    exit 1
}

# Limpieza de backups antiguos
Write-Log "Iniciando limpieza de backups antiguos (retención: $RetentionDays días)" "INFO"
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
$OldBackups = Get-ChildItem -Path $BackupPath -Filter "inventory_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate }

if ($OldBackups) {
    foreach ($OldBackup in $OldBackups) {
        try {
            Remove-Item $OldBackup.FullName -Force
            Write-Log "🗑️  Backup antiguo eliminado: $($OldBackup.Name)" "INFO"
        } catch {
            Write-Log "⚠️  No se pudo eliminar: $($OldBackup.Name) - $_" "WARNING"
        }
    }
} else {
    Write-Log "No hay backups antiguos para eliminar" "INFO"
}

Write-Log "=== BACKUP FINALIZADO EXITOSAMENTE ===" "SUCCESS"

# Resumen
Write-Host "`n📊 RESUMEN DEL BACKUP" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "Base de datos: $DbName"
Write-Host "Archivo: $ZipFile"
Write-Host "Timestamp: $Timestamp"
Write-Host "Log: $LogFile"
Write-Host ""
