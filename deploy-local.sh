#!/bin/bash
# ====================================================================
# SCRIPT DE DESPLIEGUE LOCAL (LINUX SERVER / LOCAL LAN)
# Sistema Intranet Layerthree - Monolito Modular
# ====================================================================

set -e

echo "🚀 Iniciando despliegue de producción en servidor local..."

# 1. Construir e iniciar contenedores
echo "📦 Construyendo y levantando contenedores Docker..."
docker-compose up -d --build

# 2. Esperar salud de MySQL
echo "⏳ Esperando a que el contenedor de Base de Datos esté listo..."
until [ "$(docker inspect --format='{{json .State.Health.Status}}' bodega-mysql-monolith 2>/dev/null)" == '"healthy"' ]; do
    echo "   Esperando a MySQL..."
    sleep 2
done
echo "✅ Base de datos MySQL saludable. Esperando estabilización..."
sleep 5

# 3. Verificación y Seeding automático
echo "🌱 Verificando usuarios iniciales..."
docker exec -i bodega-backend-monolith node prisma/seed.js

echo "======================================================"
echo "🎉 DESPLIEGUE COMPLETADO CON ÉXITO EN EL SERVIDOR LOCAL"
echo "======================================================"
echo "🌐 Frontend Web: http://localhost (o http://<IP_LOCAL_SERVIDOR>)"
echo "⚡ Backend API:  http://localhost:3001/api"
echo ""
docker-compose ps
