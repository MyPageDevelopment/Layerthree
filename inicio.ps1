# Script maestro para iniciar el sistema completo

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  BODEGA LAYERTHREE - Sistema Completo  " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptPath

# Menú de opciones
Write-Host "Selecciona una opción:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configurar base de datos (primera vez)" -ForegroundColor White
Write-Host "2. Iniciar backend solamente" -ForegroundColor White
Write-Host "3. Iniciar frontend solamente" -ForegroundColor White
Write-Host "4. Iniciar backend + frontend (en ventanas separadas)" -ForegroundColor White
Write-Host "5. Ver estado de MySQL" -ForegroundColor White
Write-Host "0. Salir" -ForegroundColor White
Write-Host ""

$option = Read-Host "Opción"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "Ejecutando configuración de base de datos..." -ForegroundColor Yellow
        Write-Host ""
        & ".\setup-database.ps1"
    }
    "2" {
        Write-Host ""
        Write-Host "Iniciando backend..." -ForegroundColor Yellow
        Write-Host ""
        & ".\start-backend.ps1"
    }
    "3" {
        Write-Host ""
        Write-Host "Iniciando frontend..." -ForegroundColor Yellow
        Write-Host ""
        & ".\start-frontend.ps1"
    }
    "4" {
        Write-Host ""
        Write-Host "Iniciando backend y frontend en ventanas separadas..." -ForegroundColor Yellow
        Write-Host ""
        
        # Iniciar backend en nueva ventana
        Write-Host "▶️  Abriendo ventana para backend..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-File", ".\start-backend.ps1"
        
        # Esperar 5 segundos para que el backend inicie
        Write-Host "⏳ Esperando 5 segundos para que el backend inicie..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        # Iniciar frontend en nueva ventana
        Write-Host "▶️  Abriendo ventana para frontend..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-File", ".\start-frontend.ps1"
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ Servidores iniciados en ventanas separadas" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "Frontend (Red): http://172.16.11.174:3000" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para detener, cierra las ventanas de PowerShell" -ForegroundColor Yellow
        Write-Host ""
        
        Read-Host "Presiona Enter para cerrar este menú"
    }
    "5" {
        Write-Host ""
        Write-Host "Estado de MySQL:" -ForegroundColor Yellow
        Write-Host ""
        
        $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
        
        if ($null -eq $mysqlService) {
            Write-Host "❌ MySQL no está instalado" -ForegroundColor Red
        } else {
            Write-Host "Servicio: $($mysqlService.Name)" -ForegroundColor Cyan
            Write-Host "Estado: $($mysqlService.Status)" -ForegroundColor Cyan
            Write-Host "Tipo de inicio: $($mysqlService.StartType)" -ForegroundColor Cyan
            
            if ($mysqlService.Status -eq "Running") {
                Write-Host ""
                Write-Host "✅ MySQL está corriendo correctamente" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "❌ MySQL no está corriendo" -ForegroundColor Red
                Write-Host ""
                $start = Read-Host "¿Deseas iniciar MySQL? (s/n)"
                if ($start -eq "s") {
                    Start-Service $mysqlService.Name
                    Write-Host "✅ MySQL iniciado" -ForegroundColor Green
                }
            }
        }
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        
        # Volver a mostrar el menú
        & $MyInvocation.MyCommand.Path
    }
    "0" {
        Write-Host ""
        Write-Host "Saliendo..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        
        # Volver a mostrar el menú
        & $MyInvocation.MyCommand.Path
    }
}
