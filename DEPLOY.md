# Guía Rápida de Despliegue

## Instalación Rápida con Docker

1. Asegúrate de tener Docker Desktop instalado y corriendo
2. Abre PowerShell en esta carpeta
3. Ejecuta:
```powershell
docker-compose up -d --build
```

4. Espera 2-3 minutos para que todos los servicios inicien
5. Accede a: http://localhost:3000

## Usuarios de Prueba

**Administrador:**
- Email: admin@bodega.com
- Password: Admin123!

**Visualizador:**
- Email: viewer@bodega.com
- Password: Viewer123!

## Configuración para Servidor de Intranet

1. En el servidor, edita `docker-compose.yml`:
   - Cambia `NEXT_PUBLIC_API_URL` a la IP del servidor
   
2. Levanta los servicios:
```bash
docker-compose up -d --build
```

3. Configura el firewall para permitir acceso a los puertos 3000 y 3001

4. Los usuarios acceden desde: `http://IP_SERVIDOR:3000`

## Comandos Útiles

```powershell
# Ver estado de servicios
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down
```

## Respaldo de Base de Datos

```powershell
# Exportar
docker exec bodega_mysql mysqldump -u bodega -pbodega123 bodega_db > backup.sql

# Importar
docker exec -i bodega_mysql mysql -u bodega -pbodega123 bodega_db < backup.sql
```
