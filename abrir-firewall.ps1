# Script para abrir puertos del firewall para Bodega Layerthree
# EJECUTAR COMO ADMINISTRADOR

Write-Host "🔧 Configurando Firewall de Windows para Bodega Layerthree..." -ForegroundColor Cyan
Write-Host ""

# Verificar si se está ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para ejecutar como administrador:" -ForegroundColor Yellow
    Write-Host "1. Cierra esta ventana" -ForegroundColor Yellow
    Write-Host "2. Haz clic derecho en PowerShell" -ForegroundColor Yellow
    Write-Host "3. Selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    Write-Host "4. Vuelve a ejecutar este script" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Ejecutando como Administrador" -ForegroundColor Green
Write-Host ""

# Función para crear regla de firewall
function New-BodegaFirewallRule {
    param(
        [string]$DisplayName,
        [int]$Port
    )
    
    try {
        # Verificar si la regla ya existe
        $existingRule = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
        
        if ($existingRule) {
            Write-Host "⚠️  La regla '$DisplayName' ya existe. Eliminando..." -ForegroundColor Yellow
            Remove-NetFirewallRule -DisplayName $DisplayName
        }
        
        # Crear la regla
        New-NetFirewallRule `
            -DisplayName $DisplayName `
            -Direction Inbound `
            -LocalPort $Port `
            -Protocol TCP `
            -Action Allow `
            -Profile Any `
            -RemoteAddress Any | Out-Null
        
        Write-Host "✅ Regla creada: $DisplayName (Puerto $Port)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error creando regla '$DisplayName': $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Crear reglas
Write-Host "Creando reglas de firewall..." -ForegroundColor Cyan
Write-Host ""

New-BodegaFirewallRule -DisplayName "Bodega Layerthree - Frontend" -Port 3000
New-BodegaFirewallRule -DisplayName "Bodega Layerthree - Backend API" -Port 3001
New-BodegaFirewallRule -DisplayName "Bodega Layerthree - MySQL" -Port 3307

Write-Host ""
Write-Host "📋 Verificando reglas creadas..." -ForegroundColor Cyan
Write-Host ""

Get-NetFirewallRule -DisplayName "*Bodega*" | Select-Object DisplayName, Enabled, Direction, Action | Format-Table -AutoSize

Write-Host ""
Write-Host "🎉 ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes acceder al sistema desde tu móvil:" -ForegroundColor Yellow
Write-Host "http://172.16.11.174:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciales:" -ForegroundColor Yellow
Write-Host "Email: admin@bodega.com" -ForegroundColor White
Write-Host "Password: Admin123!" -ForegroundColor White
Write-Host ""

Read-Host "Presiona Enter para salir"
