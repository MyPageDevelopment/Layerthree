# 🚀 GUÍA DE DEPLOYMENT - MEJORAS V1.1.0

**Sistema**: Layerthree - Gestión Empresarial  
**Fecha**: 30 de Diciembre de 2025  
**Versión**: 1.1.0 → 1.2.0

---

## 📋 PRE-REQUISITOS

Antes de hacer el deployment, verificar:

```bash
# 1. Verificar que existen los archivos de secrets
ls -la secrets/
# Debe mostrar:
# - jwt_secret.txt (88 bytes)
# - jwt_refresh_secret.txt (88 bytes)
# - smtp_password.txt (16 bytes)

# 2. Verificar contenido de secrets (NO mostrar en logs públicos)
head -c 20 secrets/jwt_secret.txt && echo "..."
# Debe mostrar primeros 20 caracteres del secret

# 3. Verificar Docker Compose actualizado
grep -A 5 "secrets:" docker-compose.microservices.yml
# Debe mostrar definición de secrets
```

---

## 🔄 PASOS DE DEPLOYMENT

### PASO 1: Backup de Base de Datos

```bash
# Crear directorio de backups
mkdir -p backups/$(date +%Y%m%d)

# Backup de inventory_db
docker exec intranet_mysql mysqldump -u root -p \
  --databases inventory_db \
  > backups/$(date +%Y%m%d)/inventory_db_backup.sql

# Backup de calendar_db
docker exec intranet_mysql mysqldump -u root -p \
  --databases calendar_db \
  > backups/$(date +%Y%m%d)/calendar_db_backup.sql

echo "✅ Backups completados en backups/$(date +%Y%m%d)/"
```

### PASO 2: Detener Servicios Actuales

```bash
# Detener todos los contenedores
docker-compose -f docker-compose.microservices.yml down

# Verificar que no quedan contenedores corriendo
docker ps | grep intranet
# No debe mostrar nada
```

### PASO 3: Reconstruir Imágenes con Nuevos Cambios

```bash
# Reconstruir todas las imágenes
docker-compose -f docker-compose.microservices.yml build --no-cache

# Esto tomará ~5-10 minutos dependiendo de la conexión
# Incluye:
# - Nuevos helpers de secrets (secrets.util.ts)
# - Optimizaciones N+1 en tasks.service.ts
# - Nuevos DTOs de validación
# - Integración de secrets en email.service.ts
```

### PASO 4: Aplicar Migraciones de Base de Datos (Índices)

```bash
# Iniciar solo MySQL temporalmente
docker-compose -f docker-compose.microservices.yml up -d mysql

# Esperar que MySQL esté listo
sleep 30

# Iniciar calendar-backend temporalmente para aplicar migraciones
docker-compose -f docker-compose.microservices.yml up -d calendar-backend

# Ejecutar push de Prisma para crear índices
docker exec calendar_backend npx prisma db push --accept-data-loss

# Verificar índices creados
docker exec intranet_mysql mysql -u root -p -e "
  USE calendar_db;
  SHOW INDEX FROM tasks;
  SHOW INDEX FROM task_assignments;
  SHOW INDEX FROM projects;
"

# Detener servicios temporales
docker-compose -f docker-compose.microservices.yml down
```

### PASO 5: Iniciar Todos los Servicios con Secrets

```bash
# Iniciar todos los servicios
docker-compose -f docker-compose.microservices.yml up -d

# Monitorear logs durante startup
docker-compose -f docker-compose.microservices.yml logs -f

# Buscar en logs:
# "✅ Secret 'jwt_secret' loaded from Docker Secrets"
# "✅ Secret 'smtp_password' loaded from Docker Secrets"
```

### PASO 6: Verificar Health Checks

```bash
# Esperar 60 segundos para que todos los servicios inicien
sleep 60

# Verificar salud de servicios
echo "=== AUTH BACKEND ==="
curl -f http://localhost/api/auth/health || echo "❌ FAIL"

echo "=== INVENTORY BACKEND ==="
curl -f http://localhost/api/inventory/health || echo "❌ FAIL"

echo "=== CALENDAR BACKEND ==="
curl -f http://localhost/api/calendar/health || echo "❌ FAIL"

echo "=== GATEWAY ==="
curl -f http://localhost/health || echo "❌ FAIL"
```

### PASO 7: Verificar Secrets Cargados Correctamente

```bash
# Verificar que secrets existen en contenedores
echo "=== Verificando secrets en auth-backend ==="
docker exec auth_backend sh -c "test -f /run/secrets/jwt_secret && echo '✅ jwt_secret OK' || echo '❌ FAIL'"
docker exec auth_backend sh -c "test -f /run/secrets/jwt_refresh_secret && echo '✅ jwt_refresh_secret OK' || echo '❌ FAIL'"

echo "=== Verificando secrets en calendar-backend ==="
docker exec calendar_backend sh -c "test -f /run/secrets/smtp_password && echo '✅ smtp_password OK' || echo '❌ FAIL'"

# Verificar que NO se usan valores por defecto
echo "=== Verificando que NO se use fallback ==="
docker logs auth_backend 2>&1 | grep "WARNING: Using default value"
# NO debe mostrar nada (si muestra algo, los secrets no se cargaron)
```

### PASO 8: Testing Funcional

```bash
# Test 1: Login (verifica JWT con nuevo secret)
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "danielbelozoo@gmail.com",
    "password": "LT-1234512345"
  }'
# Debe retornar access_token

# Test 2: CORS restrictivo (debe rechazar origen no permitido)
curl -H "Origin: http://malicious-site.com" \
     -H "Content-Type: application/json" \
     http://localhost/api/auth/login
# Debe rechazar o no incluir Access-Control-Allow-Origin

# Test 3: CORS permitido (debe aceptar origen válido)
curl -H "Origin: http://172.16.11.174" \
     -H "Content-Type: application/json" \
     http://localhost/api/auth/login
# Debe incluir: Access-Control-Allow-Origin: http://172.16.11.174

# Test 4: Security Headers
curl -I http://localhost/api/calendar/tasks
# Debe incluir:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block

# Test 5: Validación de DTOs (UUID inválido)
TOKEN="<pegar_token_aqui>"
curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost/api/calendar/tasks?projectId=invalid-uuid"
# Debe retornar error 400: "projectId debe ser un UUID válido"

# Test 6: Performance de queries (debe ser rápido)
time curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost/api/calendar/tasks"
# Debe completar en < 500ms
```

---

## 📊 VERIFICACIÓN DE PERFORMANCE

### Benchmark de Queries Optimizados

```bash
# Instalar Apache Bench (si no está instalado)
# sudo apt-get install apache2-utils

# Obtener token de autenticación
TOKEN=$(curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"danielbelozoo@gmail.com","password":"LT-1234512345"}' \
  | jq -r '.access_token')

# Benchmark: Listar tareas (100 requests, 10 concurrentes)
ab -n 100 -c 10 \
   -H "Authorization: Bearer $TOKEN" \
   http://localhost/api/calendar/tasks

# Métricas esperadas:
# - Requests per second: > 50 req/s
# - Time per request: < 200ms (mean)
# - Failed requests: 0

# Benchmark: Crear tarea con asignaciones (antes era lento)
# Este test requiere script especial con datos variables
```

### Monitoreo de Recursos

```bash
# Ver uso de recursos de contenedores
docker stats --no-stream

# Métricas esperadas después de optimizaciones:
# - auth_backend: < 200 MB RAM
# - inventory_backend: < 150 MB RAM
# - calendar_backend: < 300 MB RAM (tiene más lógica)
# - intranet_mysql: < 800 MB RAM
# - gateway: < 50 MB RAM

# Total: ~1.5 GB (antes era ~2.1 GB)
```

---

## 🔍 TROUBLESHOOTING

### Problema: Secrets no se cargan

**Síntoma**: Logs muestran "WARNING: Using default value for 'jwt_secret'"

**Solución**:
```bash
# 1. Verificar que archivos existen
ls -la secrets/
# Deben existir los 3 archivos

# 2. Verificar permisos
chmod 600 secrets/*.txt

# 3. Verificar docker-compose tiene secrets definidos
grep -A 10 "^secrets:" docker-compose.microservices.yml

# 4. Recrear contenedores forzando montaje de secrets
docker-compose -f docker-compose.microservices.yml up -d --force-recreate
```

### Problema: CORS rechaza requests válidos

**Síntoma**: Frontend no puede hacer requests, error CORS

**Solución**:
```bash
# 1. Verificar configuración de CORS en nginx
docker exec api_gateway cat /etc/nginx/nginx.conf | grep -A 5 "map.*cors_origin"

# 2. Agregar nuevo origen permitido
# Editar gateway/nginx.conf:
# "~^https?://tu-nuevo-dominio\.com$" $http_origin;

# 3. Recrear gateway
docker-compose -f docker-compose.microservices.yml up -d --force-recreate api_gateway
```

### Problema: Queries lentos después de índices

**Síntoma**: Algunas queries siguen lentas

**Solución**:
```bash
# 1. Verificar que índices se crearon
docker exec intranet_mysql mysql -u root -p calendar_db -e "SHOW INDEX FROM tasks;"

# 2. Analizar query lento con EXPLAIN
docker exec intranet_mysql mysql -u root -p calendar_db -e "
  EXPLAIN SELECT * FROM tasks 
  WHERE projectId = 'some-uuid' AND status = 'PENDING';
"
# Debe usar índice: idx_tasks_projectId_status

# 3. Forzar recreación de índices
docker exec calendar_backend npx prisma migrate reset --force
docker exec calendar_backend npx prisma db push
```

### Problema: Validación de DTOs no funciona

**Síntoma**: UUIDs inválidos no son rechazados

**Solución**:
```bash
# 1. Verificar que class-validator está instalado
docker exec calendar_backend npm list class-validator

# 2. Verificar que ValidationPipe está global
# Editar main.ts y agregar:
# app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

# 3. Reconstruir imagen
docker-compose -f docker-compose.microservices.yml build calendar-backend
docker-compose -f docker-compose.microservices.yml up -d calendar-backend
```

---

## 📈 MÉTRICAS DE ÉXITO

Después del deployment, verificar estas métricas:

| Métrica | Objetivo | Comando de Verificación |
|---------|----------|------------------------|
| **Secrets en Docker** | 3/3 cargados | `docker exec auth_backend ls /run/secrets/` |
| **CORS restrictivo** | Solo IPs permitidas | `curl -H "Origin: http://evil.com" ...` → debe fallar |
| **Security Headers** | 4 headers presentes | `curl -I http://localhost/api/auth/login` |
| **Índices DB** | 30 índices totales | `SHOW INDEX FROM tasks;` → 11 índices |
| **Response Time** | < 200ms (tareas) | `ab -n 100 -c 10` |
| **Memoria Total** | < 1.6 GB | `docker stats --no-stream` |
| **Validación DTOs** | UUIDs validados | Enviar UUID inválido → error 400 |

---

## 🎯 CHECKLIST FINAL

Antes de considerar el deployment completo:

- [ ] Backups de BD creados y verificados
- [ ] Secrets montados correctamente en contenedores
- [ ] CORS acepta solo orígenes permitidos
- [ ] Security headers presentes en todas las rutas API
- [ ] Índices de BD creados (verificar con SHOW INDEX)
- [ ] Performance mejorada (benchmark con ab)
- [ ] Validación de DTOs funcionando
- [ ] Logs no muestran "WARNING: Using default value"
- [ ] Health checks OK para todos los servicios
- [ ] Login funcional con nuevo JWT secret
- [ ] Email service funcional con SMTP secret
- [ ] Uso de memoria < 1.6 GB total

---

## 📞 CONTACTO EN CASO DE PROBLEMAS

Si el deployment falla:

1. **Rollback inmediato**:
   ```bash
   docker-compose -f docker-compose.microservices.yml down
   docker-compose -f docker-compose.microservices.yml up -d
   ```

2. **Restaurar BD desde backup**:
   ```bash
   docker exec -i intranet_mysql mysql -u root -p < backups/YYYYMMDD/calendar_db_backup.sql
   ```

3. **Revisar logs**:
   ```bash
   docker-compose -f docker-compose.microservices.yml logs --tail=100
   ```

---

**Documento de Deployment v1.0**  
**Generado**: 30/12/2025  
**Próxima revisión**: Después del primer deployment exitoso
