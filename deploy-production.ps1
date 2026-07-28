# Script de despliegue en producción - Windows PowerShell

param(
    [string]$ServerIP = "localhost"
)

Write-Host "🚀 Iniciando despliegue en producción..." -ForegroundColor Green
Write-Host "IP del Servidor: $ServerIP" -ForegroundColor Cyan

# Verificar Docker
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

# Actualizar docker-compose.yml con la IP del servidor
Write-Host "📝 Configurando variables de entorno..." -ForegroundColor Yellow

$dockerComposeContent = @"
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: bodega_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: bodega_db
      MYSQL_USER: bodega
      MYSQL_PASSWORD: bodega123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - bodega_network
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: bodega_backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "mysql://bodega:bodega123@mysql:3306/bodega_db"
      JWT_SECRET: "tu_secreto_jwt_muy_seguro_cambialo_en_produccion"
      JWT_EXPIRES_IN: "7d"
      PORT: 3001
      NODE_ENV: production
    depends_on:
      mysql:
        condition: service_healthy
    networks:
      - bodega_network
    command: >
      sh -c "npx prisma migrate deploy &&
             npx prisma db seed &&
             npm run start:prod"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: bodega_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://${ServerIP}:3001"
      NODE_ENV: production
    depends_on:
      - backend
    networks:
      - bodega_network

networks:
  bodega_network:
    driver: bridge

volumes:
  mysql_data:
"@

# Guardar configuración
$dockerComposeContent | Out-File -FilePath "docker-compose.prod.yml" -Encoding UTF8

Write-Host "✅ Configuración creada en docker-compose.prod.yml" -ForegroundColor Green

# Detener servicios existentes
Write-Host "🛑 Deteniendo servicios existentes..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down 2>$null

# Construir e iniciar servicios
Write-Host "🔨 Construyendo e iniciando servicios..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d --build

# Esperar a que los servicios estén listos
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Mostrar estado
Write-Host ""
Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Accesos:" -ForegroundColor Cyan
Write-Host "  Frontend: http://${ServerIP}:3000" -ForegroundColor White
Write-Host "  Backend API: http://${ServerIP}:3001" -ForegroundColor White
Write-Host ""
Write-Host "👥 Usuarios de prueba:" -ForegroundColor Cyan
Write-Host "  Admin: admin@bodega.com / Admin123!" -ForegroundColor White
Write-Host "  Viewer: viewer@bodega.com / Viewer123!" -ForegroundColor White
Write-Host ""
Write-Host "📝 Para ver los logs:" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
Write-Host ""
