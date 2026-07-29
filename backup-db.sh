#!/bin/bash
# ====================================================================
# SCRIPT DE RESPALDO DE BASE DE DATOS MYSQL (BASH)
# Sistema Intranet Layerthree
# ====================================================================

set -e

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
BACKUP_FILE="$BACKUP_DIR/intranet_db_$TIMESTAMP.sql"

echo "💾 Generando respaldo de la base de datos MySQL en: $BACKUP_FILE ..."

docker exec -i bodega-mysql-monolith mysqldump -u root -pR8mX4vP9qL2zW7rN5tJ1yC3uK6bQ8zP intranet_layerthree_db > "$BACKUP_FILE"

echo "✅ Respaldo generado correctamente ($(du -h "$BACKUP_FILE" | cut -f1))."

echo "🧹 Eliminando respaldos con más de 30 días de antigüedad..."
find "$BACKUP_DIR" -name "intranet_db_*.sql" -type f -mtime +30 -exec rm -f {} \;

echo "🎉 Proceso de respaldo completado."
