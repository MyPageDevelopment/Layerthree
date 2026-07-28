# 🚀 GUÍA RÁPIDA - MICROSERVICIO CALENDARIO

## ⚡ Despliegue en 3 Pasos

### Paso 1: Verificar Pre-requisitos
```powershell
# Asegurarse de estar en la raíz del proyecto
cd "d:\Páginas Web\Bodega"

# Verificar Docker
docker --version
```

### Paso 2: Desplegar
```powershell
.\deploy-calendar.ps1
```

### Paso 3: Verificar
Abrir en el navegador:
```
http://localhost/api/calendar/api/docs
```

---

## 📌 URLs Principales

| Servicio | URL |
|----------|-----|
| **Swagger UI** | http://localhost/api/calendar/api/docs |
| **Health Check** | http://localhost/api/calendar/health |
| **Service Info** | http://localhost/api/calendar |

---

## 🎯 Casos de Uso Principales

### 1️⃣ Crear Proyecto
**POST** `/api/calendar/projects`
```json
{
  "code": "PROJ-2024-001",
  "name": "Migración a Microservicios",
  "status": "ACTIVE",
  "priority": "HIGH",
  "startDate": "2024-02-01",
  "endDate": "2024-06-30",
  "budget": 100000,
  "estimatedHours": 800,
  "ownerId": "UUID-del-usuario"
}
```

### 2️⃣ Crear Tarea
**POST** `/api/calendar/tasks`
```json
{
  "code": "TASK-2024-001",
  "title": "Implementar Backend Calendario",
  "status": "PENDING",
  "priority": "HIGH",
  "projectId": "UUID-del-proyecto",
  "startDate": "2024-02-01T08:00:00.000Z",
  "endDate": "2024-02-15T17:00:00.000Z",
  "estimatedHours": 80
}
```

### 3️⃣ Asignar Usuario a Tarea (CON VALIDACIÓN)
**POST** `/api/calendar/tasks/{taskId}/assign`
```json
{
  "userIds": ["UUID-usuario-1", "UUID-usuario-2"],
  "role": "RESPONSIBLE",
  "allocatedHours": 40,
  "startDate": "2024-02-01T08:00:00.000Z",
  "endDate": "2024-02-15T17:00:00.000Z"
}
```

**Respuesta si hay conflictos:**
```json
{
  "statusCode": 400,
  "message": "Algunos usuarios tienen conflictos de disponibilidad",
  "conflicts": [
    {
      "userId": "UUID-usuario-1",
      "userEmail": "juan@empresa.com",
      "conflicts": [
        {
          "id": "task-xyz",
          "description": "Usuario asignado a Tarea XYZ",
          "startDate": "2024-02-05T08:00:00.000Z",
          "endDate": "2024-02-10T17:00:00.000Z"
        }
      ]
    }
  ]
}
```

### 4️⃣ Validar Disponibilidad de Usuario
**POST** `/api/calendar/availability/check-user`
```json
{
  "userId": "UUID-del-usuario",
  "startDate": "2024-02-15T08:00:00.000Z",
  "endDate": "2024-02-20T17:00:00.000Z"
}
```

**Respuesta:**
```json
{
  "hasConflict": false,
  "conflicts": []
}
```

### 5️⃣ Buscar Espacios Disponibles
**POST** `/api/calendar/availability/find-slots`
```json
{
  "userId": "UUID-del-usuario",
  "startDate": "2024-02-01",
  "endDate": "2024-02-07",
  "durationHours": 2
}
```

**Respuesta:**
```json
[
  {
    "startDate": "2024-02-01T08:00:00.000Z",
    "endDate": "2024-02-01T10:00:00.000Z"
  },
  {
    "startDate": "2024-02-01T14:00:00.000Z",
    "endDate": "2024-02-01T16:00:00.000Z"
  }
]
```

---

## 🔧 Comandos Útiles

### Ver Logs
```powershell
docker-compose -f docker-compose.microservices.yml logs -f calendar-backend
```

### Reiniciar Servicio
```powershell
docker-compose -f docker-compose.microservices.yml restart calendar-backend
```

### Detener Servicio
```powershell
docker-compose -f docker-compose.microservices.yml stop calendar-backend
```

### Entrar al Contenedor
```powershell
docker exec -it calendar_backend sh
```

### Ejecutar Migraciones Prisma
```powershell
docker exec -it calendar_backend npx prisma db push
```

### Ver Base de Datos
```powershell
docker exec -it calendar_backend npx prisma studio
# Abre en http://localhost:5555
```

---

## 📊 Monitoreo

### Health Check
```bash
curl http://localhost/api/calendar/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-02-XX..."
}
```

### Service Info
```bash
curl http://localhost/api/calendar
```

**Respuesta esperada:**
```json
{
  "service": "Calendar Management API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "docs": "/api/docs",
    "projects": "/projects",
    "tasks": "/tasks",
    "availability": "/availability"
  }
}
```

---

## ⚠️ Solución de Problemas

### Problema: Servicio no responde
```powershell
# Ver logs
docker-compose -f docker-compose.microservices.yml logs calendar-backend

# Verificar que MySQL esté corriendo
docker ps | findstr mysql

# Reiniciar
docker-compose -f docker-compose.microservices.yml restart calendar-backend
```

### Problema: Error de base de datos
```powershell
# Ejecutar migraciones
docker exec -it calendar_backend npx prisma db push

# Si persiste, recrear BD
docker exec -it intranet_mysql mysql -uroot -p
> DROP DATABASE calendar_db;
> CREATE DATABASE calendar_db;
> exit

# Volver a ejecutar migraciones
docker exec -it calendar_backend npx prisma db push
```

### Problema: Gateway no enruta
```powershell
# Reiniciar gateway
docker-compose -f docker-compose.microservices.yml restart gateway

# Verificar logs
docker-compose -f docker-compose.microservices.yml logs gateway
```

---

## 📚 Documentación Completa

- **README Principal**: [README_MICROSERVICES.md](../../README_MICROSERVICES.md)
- **Arquitectura**: [MICROSERVICES_ARCHITECTURE.md](../../MICROSERVICES_ARCHITECTURE.md)
- **Implementación Completa**: [CALENDAR_MICROSERVICE_COMPLETE.md](./CALENDAR_MICROSERVICE_COMPLETE.md)
- **Resumen**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
- **Backend README**: [backend/README.md](./backend/README.md)

---

## 🎯 Próximos Pasos

1. ✅ Desplegar microservicio
2. ✅ Probar endpoints en Swagger
3. ✅ Crear usuarios de prueba en BD
4. ✅ Configurar jornadas laborales
5. ✅ Crear proyectos y tareas
6. ✅ Probar sistema anti-solapamiento
7. ⏳ Implementar frontend (opcional)

---

**¿Necesitas ayuda?** Consulta la documentación completa en [CALENDAR_MICROSERVICE_COMPLETE.md](./CALENDAR_MICROSERVICE_COMPLETE.md)
