# Calendar Microservice - Backend

## Descripción
Microservicio de Calendario para gestión de proyectos, tareas, horarios laborales y recursos con sistema de validación de disponibilidad (double booking prevention).

## Stack Tecnológico
- **Framework**: NestJS 10
- **ORM**: Prisma 5.22
- **Base de Datos**: MySQL 8.0
- **Validación**: class-validator + class-transformer
- **Documentación**: Swagger/OpenAPI
- **Programación**: @nestjs/schedule (cron jobs)

## Características Principales

### 1. Gestión de Proyectos
- CRUD completo de proyectos
- Códigos únicos (ej: `PROJ-2024-001`)
- Estados: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- Prioridades: LOW, MEDIUM, HIGH, CRITICAL
- Tracking de presupuesto y horas estimadas
- Asignación de propietarios y managers
- Estadísticas de progreso

### 2. Gestión de Tareas
- CRUD completo con validaciones
- Códigos únicos (ej: `TASK-2024-001`)
- Estados: PENDING, IN_PROGRESS, BLOCKED, COMPLETED, CANCELLED
- Prioridades: LOW, MEDIUM, HIGH, CRITICAL
- Tareas padre-hijo (jerarquía)
- Milestones y dependencias
- Asignación de usuarios con roles (RESPONSIBLE, COLLABORATOR, REVIEWER)
- **Validación automática de disponibilidad** al asignar

### 3. Sistema de Bloqueos (Double Booking Prevention)
El sistema valida 4 capas antes de permitir asignaciones:

#### Validación de Usuario
- ✅ Verifica jornada laboral (WorkSchedule por día de semana)
- ✅ Detecta festivos nacionales/regionales
- ✅ Previene solapamiento con otras tareas asignadas
- ✅ Calcula horas efectivas considerando breaks

#### Validación de Recursos
- ✅ Equipos (computadoras, herramientas)
- ✅ Salas de reuniones
- ✅ Vehículos corporativos
- ✅ Personas (consultores externos)

#### Endpoints de Validación
```
POST /api/calendar/availability/check-user
POST /api/calendar/availability/check-resource
POST /api/calendar/availability/find-slots
POST /api/calendar/availability/check-multiple-users
```

### 4. Recursos y Reservas
- Tipos: PERSON, EQUIPMENT, ROOM, VEHICLE
- Control de capacidad
- Sistema de reservas con horarios
- Validación de solapamientos

### 5. Jornadas Laborales
- Configuración por usuario
- Horarios por día de semana (0=Domingo, 6=Sábado)
- Gestión de pausas (ej: 1 hora de almuerzo)
- Festivos con recurrencia anual

### 6. Time Tracking
- Registro de tiempo real trabajado
- Comparación estimado vs actual
- Tracking por tarea y usuario
- Generación de reportes

### 7. Notificaciones
- TASK_ASSIGNED: Nueva tarea asignada
- TASK_DUE_SOON: Tarea próxima a vencer
- TASK_OVERDUE: Tarea vencida
- MILESTONE_APPROACHING: Hito próximo
- CONFLICT_DETECTED: Solapamiento detectado
- Cron jobs automáticos para alertas

## Instalación

```bash
# Instalar dependencias
npm install

# Generar Prisma Client
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Modo desarrollo
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
DATABASE_URL="mysql://user:password@localhost:3306/calendar_db"
PORT=3003
JWT_SECRET=your_secret_key
```

## API Documentation

Swagger UI disponible en: `http://localhost:3003/api/docs`

### Endpoints Principales

#### Proyectos
```
GET    /projects              - Listar proyectos (filtro por status)
POST   /projects              - Crear proyecto
GET    /projects/:id          - Obtener proyecto por ID
PATCH  /projects/:id          - Actualizar proyecto
DELETE /projects/:id          - Eliminar proyecto
GET    /projects/:id/statistics - Estadísticas del proyecto
```

#### Tareas
```
GET    /tasks                 - Listar tareas (filtros: projectId, status)
POST   /tasks                 - Crear tarea
GET    /tasks/:id             - Obtener tarea con detalles
PATCH  /tasks/:id             - Actualizar tarea
DELETE /tasks/:id             - Eliminar tarea
POST   /tasks/:id/assign      - Asignar usuarios (CON VALIDACIÓN)
GET    /tasks/:id/statistics  - Estadísticas de la tarea
```

#### Disponibilidad
```
POST   /availability/check-user           - Validar usuario
POST   /availability/check-resource       - Validar recurso
POST   /availability/find-slots           - Buscar espacios libres
POST   /availability/check-multiple-users - Validar grupo
```

## Modelo de Datos

### User
- id, email, password, name, role, department
- Relaciones: workSchedules, taskAssignments, timeEntries

### Project
- code (único), name, status, priority, dates, budget
- Relaciones: tasks, milestones, resources, owner, manager

### Task
- code (único), title, status, priority, dates, progress
- Relaciones: project, assignments, subtasks, milestone, comments

### TaskAssignment
- userId + taskId + role (RESPONSIBLE/COLLABORATOR/REVIEWER)
- allocatedHours, startDate, endDate

### Milestone
- projectId, title, dueDate, order
- Relaciones: tasks

### Resource
- name, type (PERSON/EQUIPMENT/ROOM/VEHICLE), capacity
- Relaciones: schedules (reservas)

### WorkSchedule
- userId, dayOfWeek (0-6), startTime, endTime, breakMinutes

### Holiday
- date, name, isRecurring, type (NATIONAL/REGIONAL)

### ResourceSchedule
- resourceId, startDateTime, endDateTime, userId, purpose

### TimeEntry
- userId, taskId, startTime, endTime, description

### Notification
- userId, type, title, message, relatedTaskId, isRead

## Algoritmo de Validación de Disponibilidad

```typescript
async checkUserAvailability(userId, startDate, endDate) {
  // 1. Verificar jornada laboral
  const scheduleConflict = await checkWorkScheduleConflict();
  
  // 2. Verificar festivos
  const holidayConflict = await checkHolidayConflict();
  
  // 3. Verificar tareas asignadas (SQL con OR conditions)
  const taskConflict = await checkTaskAssignmentConflict();
  
  // 4. Retornar resultado
  return {
    hasConflict: boolean,
    conflicts: [{ id, description, dates }]
  };
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Docker

```bash
# Build
docker build -t calendar-backend .

# Run
docker run -p 3003:3003 \
  -e DATABASE_URL="mysql://..." \
  calendar-backend
```

## Estructura del Proyecto

```
src/
├── app.module.ts              # Módulo principal
├── main.ts                    # Bootstrap
├── prisma/                    # Database layer
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/                    # Shared resources
│   └── filters/
│       └── all-exceptions.filter.ts
├── projects/                  # Projects module
│   ├── dto/
│   ├── projects.controller.ts
│   ├── projects.service.ts
│   └── projects.module.ts
├── tasks/                     # Tasks module
│   ├── dto/
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   └── tasks.module.ts
├── availability/              # Availability validation
│   ├── dto/
│   ├── availability.controller.ts
│   ├── availability.service.ts
│   └── availability.module.ts
├── notifications/             # Notifications & alerts
├── work-schedules/            # Work schedules
├── resources/                 # Resources & bookings
└── time-tracking/             # Time entries
```

## Próximos Pasos

- [ ] Implementar autenticación JWT
- [ ] Agregar sistema de permisos por rol
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Exportar reportes a PDF/Excel
- [ ] Dashboard de métricas
- [ ] Integración con calendario externo (Google Calendar, Outlook)

## Licencia

Propiedad de la empresa - Uso interno solamente
