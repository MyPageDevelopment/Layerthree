# 🚀 GUÍA DE DEPLOYMENT - MICROSERVICIO INVENTARIO
## Sistema de Intranet Layerthree

---

## 📋 ÍNDICE

1. [Pre-requisitos](#pre-requisitos)
2. [Checklist de Seguridad](#checklist-de-seguridad)
3. [Configuración de Persistencia](#configuración-de-persistencia)
4. [Sistema de Auditoría](#sistema-de-auditoría)
5. [Deployment Paso a Paso](#deployment-paso-a-paso)
6. [Verificación Post-Deployment](#verificación-post-deployment)
7. [Backups y Recuperación](#backups-y-recuperación)
8. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## 🔐 PRE-REQUISITOS

### Software Requerido
- ✅ Docker Desktop (v20.10+)
- ✅ Docker Compose (v2.0+)
- ✅ MySQL Client (para backups manuales)
- ✅ PowerShell 7+ (para scripts de automatización)

### Recursos del Servidor
- **CPU**: Mínimo 4 cores (recomendado 8)
- **RAM**: Mínimo 8GB (recomendado 16GB)
- **Disco**: Mínimo 100GB libres
- **Red**: Puerto 80, 443, 3001, 3307 disponibles

### Credenciales y Secrets
```powershell
# Verificar que existen los archivos de secrets
ls D:\Páginas Web\Bodega\secrets\
# Debe contener:
# - jwt_secret.txt
# - jwt_refresh_secret.txt
```

---

## 🔒 CHECKLIST DE SEGURIDAD

### ✅ Variables de Entorno

**CRÍTICO**: Antes de deployment, actualizar los siguientes valores en producción:

```env
# ⚠️ CAMBIAR ESTOS VALORES
MYSQL_ROOT_PASSWORD=<generar-password-fuerte>
JWT_SECRET=<generar-secret-256-bits>
JWT_REFRESH_SECRET=<generar-secret-256-bits>
```

#### Generar Secrets Seguros
```powershell
# Ejecutar para generar nuevos secrets
.\scripts\rotate-jwt-secrets.ps1
```

### ✅ Configuraciones de Seguridad Implementadas

| Característica | Estado | Descripción |
|---------------|--------|-------------|
| Rate Limiting | ✅ | 100 req/15min por IP |
| Security Headers | ✅ | XSS, CSRF, Clickjacking protection |
| JWT Authentication | ✅ | Tokens firmados con RS256 |
| Request Logging | ✅ | Logs estructurados con timestamps |
| Input Validation | ✅ | class-validator en todos los DTOs |
| SQL Injection Protection | ✅ | Prisma ORM con prepared statements |
| CORS | ✅ | Manejado por Nginx Gateway |
| HTTPS | ⚠️ | Configurar certificados SSL |

### ✅ Firewall
```powershell
# Abrir puertos necesarios
.\abrir-firewall.ps1

# Verificar puertos
netstat -an | findstr "3001 3307 80 443"
```

---

## 💾 CONFIGURACIÓN DE PERSISTENCIA

### Volúmenes de Docker

El sistema utiliza volúmenes nombrados para persistencia de datos:

```yaml
volumes:
  mysql_inventory_data:
    driver: local
```

**Ubicación física**:
- Windows: `C:\ProgramData\Docker\volumes\mysql_inventory_data\_data`
- Linux: `/var/lib/docker/volumes/mysql_inventory_data/_data`

### Verificar Volúmenes
```powershell
# Listar volúmenes
docker volume ls | Select-String "inventory"

# Inspeccionar volumen
docker volume inspect mysql_inventory_data

# Verificar espacio disponible
docker volume inspect mysql_inventory_data | ConvertFrom-Json | Select-Object -ExpandProperty Mountpoint
```

### Backup de Volúmenes
```powershell
# Backup manual del volumen
docker run --rm -v mysql_inventory_data:/data -v D:\backups\volumes:/backup alpine tar czf /backup/mysql_inventory_$(Get-Date -Format "yyyyMMdd_HHmmss").tar.gz -C /data .
```

---

## 📊 SISTEMA DE AUDITORÍA

### Características Implementadas

El sistema ahora incluye **auditoría completa** de cambios en productos:

#### Tabla de Auditoría

```sql
CREATE TABLE product_audits (
  id VARCHAR(191) PRIMARY KEY,
  productId VARCHAR(191),
  productSku VARCHAR(191),
  productName VARCHAR(191),
  action VARCHAR(191),          -- CREATE, UPDATE, DELETE
  userId VARCHAR(191),
  userName VARCHAR(191),
  userEmail VARCHAR(191),
  userRole ENUM(...),
  changes TEXT,                 -- JSON con cambios antes/después
  ipAddress VARCHAR(191),
  userAgent VARCHAR(191),
  createdAt DATETIME
);
```

#### Endpoints de Auditoría

| Endpoint | Método | Descripción | Roles |
|----------|--------|-------------|-------|
| `/products/:id/audit` | GET | Historial de un producto | SUPER_ADMIN, GERENTE |
| `/products/audit/all` | GET | Todos los registros | SUPER_ADMIN, GERENTE |
| `/products/audit/stats` | GET | Estadísticas de auditoría | SUPER_ADMIN, GERENTE |

#### Ejemplo de Uso
```bash
# Ver historial de un producto
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost/api/inventory/products/{id}/audit

# Filtrar por usuario
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost/api/inventory/products/audit/all?userId=user-id&action=UPDATE"
```

### Formato de Registro de Auditoría

```json
{
  "id": "uuid",
  "productId": "prod-123",
  "productSku": "SKU-001",
  "productName": "Cable UTP Cat6",
  "action": "UPDATE",
  "userId": "user-456",
  "userName": "Juan Pérez",
  "userEmail": "juan.perez@empresa.com",
  "userRole": "GERENTE",
  "changes": {
    "unitPrice": {
      "old": 1500,
      "new": 1800
    },
    "stock": {
      "old": 100,
      "new": 85
    }
  },
  "ipAddress": "192.168.1.100",
  "createdAt": "2026-01-05T10:30:00Z"
}
```

### Retención de Datos de Auditoría

**Importante**: Los registros de auditoría se mantienen indefinidamente. Para limpiar:

```sql
-- Eliminar auditorías de más de 2 años
DELETE FROM product_audits 
WHERE createdAt < DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

---

## 🚀 DEPLOYMENT PASO A PASO

### 1. Preparación

```powershell
# 1.1 - Navegar al directorio del proyecto
cd "D:\Páginas Web\Bodega"

# 1.2 - Detener servicios existentes (si los hay)
.\stop-microservices.ps1

# 1.3 - Verificar que no hay contenedores corriendo
docker ps
```

### 2. Configuración de Variables de Entorno

```powershell
# 2.1 - Copiar archivo de producción
Copy-Item services\inventory\backend\.env.production services\inventory\backend\.env

# 2.2 - EDITAR con valores reales
notepad services\inventory\backend\.env

# 2.3 - Verificar secrets
Get-Content secrets\jwt_secret.txt
Get-Content secrets\jwt_refresh_secret.txt
```

### 3. Construir Imágenes

```powershell
# 3.1 - Build de imágenes
docker-compose -f docker-compose.microservices.yml build inventory-backend inventory-frontend

# 3.2 - Verificar imágenes creadas
docker images | Select-String "inventory"
```

### 4. Migración de Base de Datos

```powershell
# 4.1 - Levantar solo MySQL
docker-compose -f docker-compose.microservices.yml up -d mysql

# 4.2 - Esperar que MySQL esté listo
Start-Sleep -Seconds 30

# 4.3 - Ejecutar migraciones
docker-compose -f docker-compose.microservices.yml run --rm inventory-backend npx prisma migrate deploy

# 4.4 - Verificar migración de auditoría
docker exec -it intranet_mysql mysql -uroot -p inventory_db -e "SHOW TABLES LIKE 'product_audits';"
```

### 5. Iniciar Servicios

```powershell
# 5.1 - Levantar todos los servicios
.\start-microservices.ps1

# 5.2 - Verificar estado de contenedores
docker-compose -f docker-compose.microservices.yml ps

# 5.3 - Ver logs en tiempo real
docker-compose -f docker-compose.microservices.yml logs -f inventory-backend
```

### 6. Verificación de Salud

```powershell
# 6.1 - Health check del backend
curl http://localhost:3001/health

# 6.2 - Health check del frontend
curl http://localhost/inventory

# 6.3 - Verificar autenticación
curl -X POST http://localhost/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"admin@empresa.com","password":"Admin123!"}'
```

---

## ✅ VERIFICACIÓN POST-DEPLOYMENT

### Checklist de Verificación

```powershell
# ✅ 1. Contenedores corriendo
docker ps --filter "name=inventory"

# ✅ 2. Base de datos conectada
docker exec -it intranet_mysql mysql -uroot -p -e "SELECT COUNT(*) FROM inventory_db.products;"

# ✅ 3. Volúmenes persistentes
docker volume inspect mysql_inventory_data

# ✅ 4. Logs sin errores críticos
docker logs inventory_backend --tail 50

# ✅ 5. Endpoints respondiendo
curl http://localhost/api/inventory/products -H "Authorization: Bearer TOKEN"

# ✅ 6. Sistema de auditoría funcionando
curl http://localhost/api/inventory/products/audit/stats -H "Authorization: Bearer TOKEN"
```

### Tests Funcionales

```powershell
# Test 1: Crear producto (debe generar auditoría CREATE)
curl -X POST http://localhost/api/inventory/products `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{
    "sku": "TEST-001",
    "name": "Producto de Prueba",
    "category": "EQUIPOS",
    "stock": 10,
    "minStock": 5,
    "unitPrice": 1000
  }'

# Test 2: Actualizar producto (debe generar auditoría UPDATE)
curl -X PATCH http://localhost/api/inventory/products/{id} `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"stock": 15}'

# Test 3: Verificar auditoría
curl http://localhost/api/inventory/products/{id}/audit `
  -H "Authorization: Bearer $TOKEN"

# Test 4: Rate limiting
for ($i=0; $i -lt 110; $i++) {
  curl http://localhost/api/inventory/products -H "Authorization: Bearer $TOKEN"
}
# Debería retornar 429 después de 100 requests
```

---

## 🔄 BACKUPS Y RECUPERACIÓN

### Configuración de Backups Automáticos

#### Script de Backup
```powershell
# Ejecutar backup manual
.\scripts\backup-inventory-db.ps1

# Backup con retención personalizada
.\scripts\backup-inventory-db.ps1 -BackupPath "E:\Backups\Inventory" -RetentionDays 60
```

#### Programar Tarea en Windows

```powershell
# Crear tarea programada para backup diario a las 2 AM
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
  -Argument "-File 'D:\Páginas Web\Bodega\scripts\backup-inventory-db.ps1'"
  
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "BackupInventoryDB" `
  -Action $Action `
  -Trigger $Trigger `
  -User "SYSTEM" `
  -RunLevel Highest

# Verificar tarea
Get-ScheduledTask -TaskName "BackupInventoryDB"
```

### Restauración de Backups

```powershell
# Listar backups disponibles
Get-ChildItem D:\backups\inventory\*.zip | Sort-Object LastWriteTime -Descending

# Restaurar backup específico
.\scripts\restore-inventory-db.ps1 -BackupFile "D:\backups\inventory\inventory_backup_20260105_140000.zip"
```

### Plan de Recuperación ante Desastres

1. **Nivel 1 - Fallo de Contenedor**
   ```powershell
   docker-compose -f docker-compose.microservices.yml restart inventory-backend
   ```

2. **Nivel 2 - Corrupción de Datos**
   ```powershell
   # Restaurar backup más reciente
   .\scripts\restore-inventory-db.ps1 -BackupFile "path\to\backup.zip"
   ```

3. **Nivel 3 - Fallo Total del Servidor**
   ```powershell
   # En servidor nuevo:
   # 1. Instalar Docker
   # 2. Clonar repositorio
   # 3. Restaurar volúmenes desde backup
   docker run --rm -v mysql_inventory_data:/data -v D:\backups\volumes:/backup alpine tar xzf /backup/mysql_inventory_YYYYMMDD.tar.gz -C /data
   # 4. Levantar servicios
   .\start-microservices.ps1
   ```

---

## 📈 MONITOREO Y MANTENIMIENTO

### Logs

```powershell
# Ver logs en tiempo real
docker-compose -f docker-compose.microservices.yml logs -f inventory-backend

# Buscar errores
docker logs inventory_backend 2>&1 | Select-String "ERROR"

# Exportar logs
docker logs inventory_backend > "D:\logs\inventory_$(Get-Date -Format 'yyyyMMdd').log"
```

### Métricas de Performance

```powershell
# Stats de contenedor
docker stats inventory_backend --no-stream

# Espacio en disco del volumen
docker system df -v | Select-String "inventory"

# Consultas lentas en MySQL
docker exec -it intranet_mysql mysql -uroot -p -e "
  SELECT * FROM information_schema.processlist 
  WHERE TIME > 5 AND COMMAND != 'Sleep';
"
```

### Mantenimiento Mensual

```powershell
# 1. Verificar espacio en disco
Get-PSDrive C | Select-Object Used,Free

# 2. Limpiar logs antiguos
Get-ChildItem D:\logs\*.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item

# 3. Optimizar base de datos
docker exec -it intranet_mysql mysql -uroot -p inventory_db -e "
  OPTIMIZE TABLE products;
  OPTIMIZE TABLE movements;
  OPTIMIZE TABLE product_audits;
"

# 4. Verificar integridad de backups
.\scripts\backup-inventory-db.ps1
Get-ChildItem D:\backups\inventory\*.zip | Select-Object -First 1 | Test-Path

# 5. Actualizar imágenes de Docker
docker-compose -f docker-compose.microservices.yml pull
docker-compose -f docker-compose.microservices.yml up -d
```

---

## 🚨 TROUBLESHOOTING

### Problema: Contenedor no inicia

```powershell
# Ver logs completos
docker logs inventory_backend --tail 100

# Verificar configuración
docker inspect inventory_backend

# Reiniciar contenedor
docker-compose -f docker-compose.microservices.yml restart inventory-backend
```

### Problema: No se conecta a la base de datos

```powershell
# Verificar que MySQL está corriendo
docker ps | Select-String "mysql"

# Test de conexión
docker exec -it intranet_mysql mysql -uroot -p -e "SELECT 1"

# Verificar red de Docker
docker network inspect intranet
```

### Problema: Auditoría no registra cambios

```powershell
# Verificar que la tabla existe
docker exec -it intranet_mysql mysql -uroot -p inventory_db -e "DESCRIBE product_audits;"

# Ejecutar migración manualmente
docker-compose -f docker-compose.microservices.yml run --rm inventory-backend npx prisma migrate deploy

# Ver logs del servicio de auditoría
docker logs inventory_backend | Select-String "audit"
```

---

## 📞 CONTACTO Y SOPORTE

Para problemas o consultas:
- **Responsable**: Administrador de Sistemas
- **Logs**: `D:\logs\inventory\`
- **Backups**: `D:\backups\inventory\`

---

## 📝 HISTORIAL DE CAMBIOS

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-05 | 1.1.0 | ✅ Sistema de auditoría implementado |
| 2026-01-05 | 1.0.5 | ✅ Rate limiting y security headers |
| 2026-01-05 | 1.0.0 | ✅ Versión inicial de producción |

---

**✅ Sistema listo para producción con:**
- 💾 Persistencia de datos garantizada
- 📊 Auditoría completa de cambios
- 🔒 Seguridad reforzada
- 🔄 Backups automatizados
- 📈 Monitoreo y logs
