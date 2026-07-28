# ✅ CHECKLIST DE DESPLIEGUE - MICROSERVICIO CALENDARIO

## Pre-Despliegue

- [ ] Docker Desktop está instalado y corriendo
- [ ] Puerto 3003 está disponible
- [ ] MySQL está corriendo (contenedor `intranet_mysql`)
- [ ] Gateway Nginx está corriendo
- [ ] Ubicado en directorio raíz: `d:\Páginas Web\Bodega`

## Archivos Creados (Verificar)

### Backend Core
- [ ] `services/calendar/backend/package.json` ✅
- [ ] `services/calendar/backend/tsconfig.json` ✅
- [ ] `services/calendar/backend/nest-cli.json` ✅
- [ ] `services/calendar/backend/Dockerfile` ✅
- [ ] `services/calendar/backend/.env.example` ✅
- [ ] `services/calendar/backend/.gitignore` ✅
- [ ] `services/calendar/backend/.dockerignore` ✅

### Database
- [ ] `services/calendar/backend/prisma/schema.prisma` ✅

### Source Code
- [ ] `src/main.ts` ✅
- [ ] `src/app.module.ts` ✅
- [ ] `src/app.controller.ts` ✅
- [ ] `src/prisma/prisma.module.ts` ✅
- [ ] `src/prisma/prisma.service.ts` ✅
- [ ] `src/common/filters/all-exceptions.filter.ts` ✅

### Projects Module
- [ ] `src/projects/dto/create-project.dto.ts` ✅
- [ ] `src/projects/dto/update-project.dto.ts` ✅
- [ ] `src/projects/projects.service.ts` ✅
- [ ] `src/projects/projects.controller.ts` ✅
- [ ] `src/projects/projects.module.ts` ✅

### Tasks Module
- [ ] `src/tasks/dto/create-task.dto.ts` ✅
- [ ] `src/tasks/dto/update-task.dto.ts` ✅
- [ ] `src/tasks/dto/assign-user.dto.ts` ✅
- [ ] `src/tasks/tasks.service.ts` ✅
- [ ] `src/tasks/tasks.controller.ts` ✅
- [ ] `src/tasks/tasks.module.ts` ✅

### Availability Module
- [ ] `src/availability/dto/check-availability.dto.ts` ✅
- [ ] `src/availability/availability.service.ts` ✅
- [ ] `src/availability/availability.controller.ts` ✅
- [ ] `src/availability/availability.module.ts` ✅

### Infrastructure
- [ ] `docker-compose.microservices.yml` (actualizado) ✅
- [ ] `gateway/nginx.conf` (actualizado) ✅
- [ ] `infrastructure/mysql/init/01-create-databases.sql` (actualizado) ✅

### Scripts
- [ ] `deploy-calendar.ps1` ✅

### Documentation
- [ ] `services/calendar/backend/README.md` ✅
- [ ] `services/calendar/CALENDAR_MICROSERVICE_COMPLETE.md` ✅
- [ ] `services/calendar/IMPLEMENTATION_SUMMARY.md` ✅
- [ ] `services/calendar/QUICK_START.md` ✅
- [ ] `services/calendar/DEPLOYMENT_CHECKLIST.md` ✅ (este archivo)

## Despliegue

### Opción 1: Script Automático (Recomendado)
```powershell
# Desde la raíz del proyecto
.\deploy-calendar.ps1
```

### Opción 2: Manual

#### Paso 1: Verificar MySQL
```powershell
docker ps | findstr mysql
```
- [ ] MySQL está corriendo

#### Paso 2: Build
```powershell
docker-compose -f docker-compose.microservices.yml build calendar-backend
```
- [ ] Build completado sin errores

#### Paso 3: Start
```powershell
docker-compose -f docker-compose.microservices.yml up -d calendar-backend
```
- [ ] Contenedor iniciado

#### Paso 4: Ver Logs
```powershell
docker-compose -f docker-compose.microservices.yml logs -f calendar-backend
```
- [ ] Sin errores en logs
- [ ] Mensaje "Application listening on port 3003"

#### Paso 5: Ejecutar Migraciones
```powershell
docker exec -it calendar_backend npx prisma db push
```
- [ ] Migraciones ejecutadas correctamente

#### Paso 6: Reiniciar Gateway
```powershell
docker-compose -f docker-compose.microservices.yml restart gateway
```
- [ ] Gateway reiniciado

## Verificación

### Health Checks
```bash
# Directo al contenedor
curl http://localhost:3003/health
```
- [ ] Respuesta: `{"status":"ok",...}`

```bash
# A través del gateway
curl http://localhost/api/calendar/health
```
- [ ] Respuesta: `{"status":"ok",...}`

### Swagger UI
```
http://localhost/api/calendar/api/docs
```
- [ ] Swagger carga correctamente
- [ ] Se muestran 7 tags (projects, tasks, availability, resources, schedules, notifications, time-tracking)
- [ ] Se pueden expandir endpoints

### Service Info
```bash
curl http://localhost/api/calendar
```
- [ ] Respuesta con información del servicio

## Testing Básico

### 1. Crear Usuario de Prueba (en MySQL)
```sql
docker exec -it intranet_mysql mysql -uroot -p

USE calendar_db;

INSERT INTO User (id, email, password, name, role, department) VALUES
('user-test-123', 'test@empresa.com', '$2b$10$abcdef...', 'Usuario Test', 'EMPLOYEE', 'IT');
```
- [ ] Usuario creado

### 2. Crear Jornada Laboral
```sql
INSERT INTO WorkSchedule (userId, dayOfWeek, startTime, endTime, breakMinutes) VALUES
('user-test-123', 1, '08:00', '17:00', 60),
('user-test-123', 2, '08:00', '17:00', 60),
('user-test-123', 3, '08:00', '17:00', 60),
('user-test-123', 4, '08:00', '17:00', 60),
('user-test-123', 5, '08:00', '17:00', 60);
```
- [ ] Jornadas creadas

### 3. Crear Proyecto vía API
```bash
curl -X POST http://localhost/api/calendar/projects \
  -H "Content-Type: application/json" \
  -d '{
    "code": "PROJ-TEST-001",
    "name": "Proyecto de Prueba",
    "status": "ACTIVE",
    "priority": "HIGH",
    "startDate": "2024-02-01",
    "endDate": "2024-06-30",
    "budget": 50000,
    "estimatedHours": 400,
    "ownerId": "user-test-123"
  }'
```
- [ ] Proyecto creado exitosamente (status 201)

### 4. Listar Proyectos
```bash
curl http://localhost/api/calendar/projects
```
- [ ] Se muestra el proyecto creado

### 5. Crear Tarea
```bash
curl -X POST http://localhost/api/calendar/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TASK-TEST-001",
    "title": "Tarea de Prueba",
    "status": "PENDING",
    "priority": "HIGH",
    "projectId": "ID-DEL-PROYECTO-CREADO",
    "startDate": "2024-02-05T08:00:00.000Z",
    "endDate": "2024-02-10T17:00:00.000Z",
    "estimatedHours": 40
  }'
```
- [ ] Tarea creada exitosamente

### 6. Validar Disponibilidad
```bash
curl -X POST http://localhost/api/calendar/availability/check-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-test-123",
    "startDate": "2024-02-15T08:00:00.000Z",
    "endDate": "2024-02-20T17:00:00.000Z"
  }'
```
- [ ] Respuesta: `{"hasConflict":false,"conflicts":[]}`

## Monitoreo Continuo

### Ver Logs en Tiempo Real
```powershell
docker-compose -f docker-compose.microservices.yml logs -f calendar-backend
```
- [ ] Logs se actualizan sin errores

### Verificar Contenedor
```powershell
docker ps | findstr calendar
```
- [ ] Estado: Up X minutes

### Verificar Red
```powershell
docker network inspect bodega_intranet
```
- [ ] calendar-backend tiene IP 172.20.0.51

## Troubleshooting

Si algo falla:

### 1. Ver Logs Completos
```powershell
docker-compose -f docker-compose.microservices.yml logs calendar-backend
```

### 2. Entrar al Contenedor
```powershell
docker exec -it calendar_backend sh
```

### 3. Verificar Variables de Entorno
```powershell
docker exec -it calendar_backend env | findstr DATABASE
```

### 4. Recrear Contenedor
```powershell
docker-compose -f docker-compose.microservices.yml down calendar-backend
docker-compose -f docker-compose.microservices.yml up -d calendar-backend
```

### 5. Recrear Base de Datos
```sql
docker exec -it intranet_mysql mysql -uroot -p
DROP DATABASE calendar_db;
CREATE DATABASE calendar_db;
exit
```

Luego volver a ejecutar migraciones.

## Post-Despliegue

- [ ] Servicio accesible en `http://localhost/api/calendar/`
- [ ] Swagger funcional en `http://localhost/api/calendar/api/docs`
- [ ] Health check responde
- [ ] API responde a requests
- [ ] Sin errores en logs
- [ ] Gateway enruta correctamente
- [ ] Base de datos creada con todas las tablas

## Documentación

- [ ] Leer [QUICK_START.md](./QUICK_START.md)
- [ ] Leer [CALENDAR_MICROSERVICE_COMPLETE.md](./CALENDAR_MICROSERVICE_COMPLETE.md)
- [ ] Revisar [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Próximos Pasos

- [ ] Implementar autenticación JWT
- [ ] Crear módulos restantes (notifications, resources, work-schedules, time-tracking)
- [ ] Agregar tests E2E
- [ ] Crear frontend (opcional)
- [ ] Implementar WebSockets para notificaciones
- [ ] Agregar sistema de permisos

---

## ✅ CHECKLIST RÁPIDO

Para verificar rápidamente que todo está funcionando:

```powershell
# 1. Health check
curl http://localhost/api/calendar/health

# 2. Service info
curl http://localhost/api/calendar

# 3. Swagger
start http://localhost/api/calendar/api/docs

# 4. Ver logs
docker-compose -f docker-compose.microservices.yml logs --tail=20 calendar-backend
```

Si todos estos comandos funcionan, **el microservicio está operativo** ✅

---

**Fecha de Despliegue**: _______________  
**Desplegado por**: _______________  
**Versión**: 1.0.0  
**Estado**: ⬜ Desarrollo | ⬜ Staging | ⬜ Producción
