#!/bin/sh
set -e

echo "🔄 Ejecutando prisma db push para sincronizar esquemas de base de datos..."
npx prisma db push

echo "🌱 Ejecutando seed de base de datos para usuarios iniciales..."
npx prisma db seed || true

echo "🚀 Iniciando Backend NestJS..."
if [ -f "dist/main.js" ]; then
  exec node dist/main.js
elif [ -f "dist/src/main.js" ]; then
  exec node dist/src/main.js
else
  exec "$@"
fi
