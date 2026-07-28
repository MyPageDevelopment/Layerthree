# Funcionalidades Corporativas del Calendario - Enterprise Features

## 📋 Resumen Ejecutivo

Este documento describe las funcionalidades empresariales implementadas en el sistema de calendario, diseñadas para igualar las capacidades de Microsoft Outlook/365:

1. **Gestión de Participantes**: Asignar múltiples usuarios a tareas y permitirles ver sus asignaciones
2. **Recurrencia de Eventos (RFC 5545)**: Eventos que se repiten con patrones complejos
3. **Reserva de Recursos**: Control de salas, equipos y vehículos con prevención de doble reserva
4. **Free/Busy (Disponibilidad)**: Visualización de horarios libres y ocupados
5. **RSVP/Invitaciones**: Sistema de invitaciones con respuestas Aceptar/Rechazar/Quizás
6. **Soporte de Zonas Horarias**: Almacenamiento UTC con conversión a zona local

---

## 👥 1. Gestión de Participantes en Tareas

### Descripción
Permite asignar múltiples usuarios como participantes de una tarea y consultar todas las tareas en las que un usuario está participando. Usa la tabla `TaskAssignment` existente para mantener la relación muchos-a-muchos entre usuarios y tareas.

### Modelo de Base de Datos

```prisma
model TaskAssignment {
  id             String    @id @default(uuid())
  taskId         String
  task           Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId         String
  user           User      @relation(fields: [userId], references: [id])
  role           String?   // "Participante", "Responsable", "Colaborador", "Revisor"
  allocatedHours Float?
  startDate      DateTime?
  endDate        DateTime?
  assignedAt     DateTime  @default(now())
  assignedBy     String?
  
  @@unique([taskId, userId])
}
```

### API Endpoints

#### POST `/api/calendar/tasks/:taskId/participants/:userId`
Agrega un usuario como participante de una tarea.

**Response:**
```json
{
  "message": "Participante agregado exitosamente",
  "assignment": {
    "id": "assignment-uuid",
    "taskId": "task-uuid",
    "userId": "user-uuid",
    "role": "Participante",
    "assignedAt": "2025-12-29T20:08:42.764Z",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "Usuario",
      "role": "EMPLOYEE"
    }
  }
}
```

#### DELETE `/api/calendar/tasks/:taskId/participants/:userId`
Elimina un participante de una tarea.

**Response:**
```json
{
  "message": "Participante eliminado exitosamente"
}
```

#### GET `/api/calendar/tasks/:taskId/participants`
Lista todos los participantes de una tarea.

**Response:**
```json
{
  "taskId": "task-uuid",
  "taskCode": "TASK-001",
  "taskTitle": "Implementar nueva funcionalidad",
  "participants": [
    {
      "assignmentId": "assignment-uuid",
      "role": "Participante",
      "allocatedHours": null,
      "user": {
        "id": "user-uuid",
        "email": "developer@example.com",
        "name": "Developer",
        "role": "EMPLOYEE",
        "department": "Tecnología",
        "position": "Desarrollador"
      },
      "assignedAt": "2025-12-29T20:08:42.764Z"
    }
  ],
  "totalParticipants": 1
}
```

#### GET `/api/calendar/tasks/user/:userId/assigned`
Lista todas las tareas donde un usuario es participante.

**Query Parameters:**
- `status` (opcional): Filtrar por estado de tarea (PENDING, IN_PROGRESS, COMPLETED, etc.)

**Response:**
```json
[
  {
    "id": "task-uuid",
    "code": "TASK-001",
    "title": "Implementar nueva funcionalidad",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2025-12-31T23:59:59.000Z",
    "project": {
      "id": "project-uuid",
      "code": "PRJ-001",
      "name": "Proyecto Alpha",
      "status": "ACTIVE"
    },
    "assignments": [
      {
        "id": "assignment-uuid",
        "role": "Participante",
        "user": {
          "id": "user-uuid",
          "email": "developer@example.com",
          "name": "Developer",
          "role": "EMPLOYEE"
        }
      }
    ],
    "milestone": {
      "id": "milestone-uuid",
      "name": "Sprint 1",
      "dueDate": "2025-12-31T00:00:00.000Z"
    },
    "_count": {
      "subtasks": 3,
      "comments": 5
    }
  }
]
```

#### GET `/api/calendar/tasks?userId=:userId`
Filtro adicional en el endpoint principal de tareas para obtener solo las tareas donde un usuario es participante.

**Query Parameters:**
- `projectId` (opcional): Filtrar por proyecto
- `status` (opcional): Filtrar por estado
- `userId` (opcional): **NUEVO** - Filtrar tareas donde este usuario es participante

**Example:**
```bash
GET /api/calendar/tasks?userId=user-uuid-123&status=IN_PROGRESS
```

### Casos de Uso

1. **Asignar colaboradores a una tarea**:
   ```bash
   POST /api/calendar/tasks/task-uuid/participants/user-uuid-1
   POST /api/calendar/tasks/task-uuid/participants/user-uuid-2
   ```

2. **Ver mis tareas asignadas**:
   ```bash
   GET /api/calendar/tasks/user/my-user-uuid/assigned
   ```

3. **Ver participantes de una tarea**:
   ```bash
   GET /api/calendar/tasks/task-uuid/participants
   ```

4. **Remover un participante**:
   ```bash
   DELETE /api/calendar/tasks/task-uuid/participants/user-uuid
   ```

### Validaciones

- ✅ Verifica que la tarea existe antes de agregar participantes
- ✅ Verifica que el usuario existe antes de agregarlo
- ✅ Previene duplicados (un usuario no puede ser agregado dos veces a la misma tarea)
- ✅ Error 404 si se intenta eliminar un participante que no existe en esa tarea

---

## 🔄 2. Recurrencia de Eventos (RFC 5545)

### Descripción
Permite crear eventos que se repiten siguiendo patrones estándar RFC 5545 (RRULE), con soporte para excepciones y modificaciones de instancias específicas.

### Modelos de Base de Datos

```prisma
model RecurrenceRule {
  id          String               @id @default(uuid())
  taskId      String               @unique
  rrule       String               @db.Text
  frequency   RecurrenceFrequency
  interval    Int                  @default(1)
  count       Int?
  until       DateTime?
  byWeekDay   String?              @db.Text // JSON: ["MO","WE","FR"]
  byMonthDay  String?              @db.Text // JSON: [1,15,30]
  byMonth     String?              @db.Text // JSON: [1,6,12]
  exdates     String?              @db.Text // Fechas excluidas
  timezone    String               @default("UTC")
}

model EventOccurrence {
  id                String    @id @default(uuid())
  taskId            String
  originalStartDate DateTime
  originalEndDate   DateTime?
  title             String?
  description       String?
  startDate         DateTime?
  dueDate           DateTime?
  location          String?
  isCancelled       Boolean   @default(false)
}
```

### API Endpoints

#### POST `/api/calendar/recurrence/:taskId`
Crea una regla de recurrencia para una tarea.

**Request Body:**
```json
{
  "frequency": "WEEKLY",
  "interval": 1,
  "byWeekDay": ["MO", "WE", "FR"],
  "count": 10,
  "timezone": "America/Santiago"
}
```

**Response:**
```json
{
  "id": "rec-uuid-123",
  "taskId": "task-uuid-456",
  "rrule": "FREQ=WEEKLY;INTERVAL=1;COUNT=10;BYDAY=MO,WE,FR",
  "frequency": "WEEKLY",
  "interval": 1,
  "count": 10
}
```

#### GET `/api/calendar/recurrence/:taskId/occurrences?start=2025-01-01&end=2025-03-31`
Obtiene todas las ocurrencias generadas en un rango de fechas.

**Response:**
```json
[
  {
    "start": "2025-01-06T09:00:00.000Z",
    "end": "2025-01-06T10:00:00.000Z",
    "isException": false,
    "originalTask": { "id": "...", "title": "Reunión Semanal" }
  },
  {
    "start": "2025-01-08T09:00:00.000Z",
    "end": "2025-01-08T10:00:00.000Z",
    "isException": false,
    "originalTask": { "id": "...", "title": "Reunión Semanal" }
  }
]
```

#### POST `/api/calendar/recurrence/:taskId/exceptions`
Crea una excepción para una ocurrencia específica (mover, editar o cancelar).

**Request Body:**
```json
{
  "originalStartDate": "2025-01-15T09:00:00.000Z",
  "startDate": "2025-01-15T14:00:00.000Z",
  "dueDate": "2025-01-15T15:00:00.000Z",
  "location": "Sala de Conferencias B"
}
```

### Ejemplos de Uso

#### Reunión Diaria
```typescript
const dailyMeeting = await fetch('/api/calendar/recurrence/task-123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    frequency: 'DAILY',
    interval: 1,
    byWeekDay: ['MO', 'TU', 'WE', 'TH', 'FR'], // Lunes a Viernes
    until: '2025-12-31T23:59:59.000Z',
    timezone: 'America/Santiago'
  })
});
```

#### Reunión Mensual el Primer Lunes
```typescript
const monthlyMeeting = await fetch('/api/calendar/recurrence/task-456', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    frequency: 'MONTHLY',
    interval: 1,
    byWeekDay: ['MO'],
    byMonthDay: [1, 2, 3, 4, 5, 6, 7], // Primera semana
    count: 12
  })
});
```

#### Cancelar una Instancia Específica
```typescript
await fetch('/api/calendar/recurrence/task-123/exceptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    originalStartDate: '2025-01-20T09:00:00.000Z',
    isCancelled: true
  })
});
```

---

## 🏢 2. Reserva de Recursos

### Descripción
Sistema de reserva de recursos físicos (salas, equipos, vehículos) con validación automática para prevenir doble reserva (double booking).

### Modelo de Base de Datos

```prisma
model ResourceBooking {
  id          String    @id @default(uuid())
  resourceId  String
  taskId      String
  userId      String
  startTime   DateTime
  endTime     DateTime
  purpose     String?
  isConfirmed Boolean   @default(false)
  isCancelled Boolean   @default(false)
}
```

### API Endpoints

#### GET `/api/calendar/resources/:resourceId/availability?start=...&end=...`
Verifica si un recurso está disponible.

**Response:**
```json
{
  "isAvailable": false,
  "conflicts": [
    {
      "id": "booking-123",
      "taskId": "task-789",
      "userId": "user-456",
      "userName": "Juan Pérez",
      "startTime": "2025-01-15T09:00:00.000Z",
      "endTime": "2025-01-15T11:00:00.000Z",
      "purpose": "Capacitación de Personal"
    }
  ]
}
```

#### POST `/api/calendar/resources/:resourceId/bookings`
Crea una reserva de recurso (con validación de conflictos).

**Request Body:**
```json
{
  "taskId": "task-uuid-123",
  "userId": "user-uuid-456",
  "startTime": "2025-01-15T14:00:00.000Z",
  "endTime": "2025-01-15T16:00:00.000Z",
  "purpose": "Reunión con Cliente",
  "autoConfirm": true
}
```

**Response (Éxito):**
```json
{
  "id": "booking-uuid-789",
  "resourceId": "resource-sala-a",
  "resourceName": "Sala de Conferencias A",
  "taskId": "task-uuid-123",
  "userId": "user-uuid-456",
  "userName": "María González",
  "startTime": "2025-01-15T14:00:00.000Z",
  "endTime": "2025-01-15T16:00:00.000Z",
  "purpose": "Reunión con Cliente",
  "isConfirmed": true,
  "isCancelled": false
}
```

**Response (Conflicto - 409):**
```json
{
  "statusCode": 409,
  "message": "Resource is not available at the requested time",
  "error": "Conflict",
  "details": [...]
}
```

#### GET `/api/calendar/resources/:resourceId/calendar?start=...&end=...`
Obtiene todas las reservas de un recurso.

#### GET `/api/calendar/resources/available?type=MEETING_ROOM&start=...&end=...`
Encuentra todos los recursos disponibles de un tipo específico.

### Ejemplo de Uso

```typescript
// 1. Verificar disponibilidad
const checkAvailability = await fetch(
  '/api/calendar/resources/sala-a-uuid/availability?' +
  'start=2025-01-15T14:00:00.000Z&end=2025-01-15T16:00:00.000Z'
);
const { isAvailable, conflicts } = await checkAvailability.json();

if (isAvailable) {
  // 2. Reservar recurso
  const booking = await fetch('/api/calendar/resources/sala-a-uuid/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId: 'task-123',
      userId: 'user-456',
      startTime: '2025-01-15T14:00:00.000Z',
      endTime: '2025-01-15T16:00:00.000Z',
      purpose: 'Presentación de Proyecto',
      autoConfirm: true
    })
  });
} else {
  console.log('Recurso no disponible:', conflicts);
}
```

---

## 📅 3. Free/Busy (Disponibilidad)

### Descripción
Visualización de horarios libres y ocupados de usuarios, similar a la función "Scheduling Assistant" de Outlook.

### Modelo de Base de Datos

```prisma
model UserAvailability {
  id          String         @id @default(uuid())
  userId      String
  startTime   DateTime
  endTime     DateTime
  status      FreeBusyStatus // FREE, BUSY, TENTATIVE, OUT_OF_OFFICE
  description String?
  taskId      String?
  isManual    Boolean        @default(false)
}
```

### API Endpoints

#### GET `/api/calendar/availability/users/:userId/free-busy?start=...&end=...`
Obtiene el calendario Free/Busy de un usuario.

**Response:**
```json
[
  {
    "start": "2025-01-15T09:00:00.000Z",
    "end": "2025-01-15T10:00:00.000Z",
    "status": "BUSY",
    "description": "Reunión Semanal",
    "taskId": "task-123"
  },
  {
    "start": "2025-01-15T14:00:00.000Z",
    "end": "2025-01-15T17:00:00.000Z",
    "status": "OUT_OF_OFFICE",
    "description": "Visita a Cliente"
  }
]
```

#### GET `/api/calendar/availability/teams/free-busy?userIds=user1,user2,user3&start=...&end=...`
Obtiene disponibilidad de múltiples usuarios (vista de equipo).

**Response:**
```json
[
  {
    "userId": "user-uuid-1",
    "userName": "Juan Pérez",
    "slots": [...],
    "availableSlots": [
      {
        "start": "2025-01-15T10:00:00.000Z",
        "end": "2025-01-15T12:00:00.000Z"
      }
    ]
  },
  {
    "userId": "user-uuid-2",
    "userName": "María González",
    "slots": [...],
    "availableSlots": [...]
  }
]
```

#### GET `/api/calendar/availability/teams/common-slots?userIds=user1,user2&start=...&end=...&duration=60`
Encuentra horarios libres comunes para todo el equipo.

**Response:**
```json
[
  {
    "start": "2025-01-15T10:30:00.000Z",
    "end": "2025-01-15T11:30:00.000Z"
  },
  {
    "start": "2025-01-15T15:00:00.000Z",
    "end": "2025-01-15T16:00:00.000Z"
  }
]
```

#### POST `/api/calendar/availability/users/:userId/block-time`
Bloquea tiempo manualmente (ej: "Fuera de oficina", "No molestar").

**Request Body:**
```json
{
  "startTime": "2025-01-20T00:00:00.000Z",
  "endTime": "2025-01-22T23:59:59.000Z",
  "status": "OUT_OF_OFFICE",
  "description": "Vacaciones"
}
```

### Ejemplo de Uso (Frontend)

```typescript
// Componente React para agendar reunión con equipo
const MeetingScheduler = () => {
  const [teamAvailability, setTeamAvailability] = useState([]);
  const [commonSlots, setCommonSlots] = useState([]);

  useEffect(() => {
    // Obtener disponibilidad del equipo
    fetch(
      `/api/calendar/availability/teams/free-busy?` +
      `userIds=${team.map(u => u.id).join(',')}&` +
      `start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    )
      .then(res => res.json())
      .then(setTeamAvailability);

    // Encontrar slots comunes
    fetch(
      `/api/calendar/availability/teams/common-slots?` +
      `userIds=${team.map(u => u.id).join(',')}&` +
      `start=${startDate.toISOString()}&end=${endDate.toISOString()}&` +
      `duration=60`
    )
      .then(res => res.json())
      .then(setCommonSlots);
  }, [team, startDate, endDate]);

  return (
    <div>
      <h3>Disponibilidad del Equipo</h3>
      <FreeBusyGrid data={teamAvailability} />
      
      <h3>Horarios Sugeridos</h3>
      <SlotSelector slots={commonSlots} />
    </div>
  );
};
```

---

## ✉️ 4. RSVP/Invitaciones

### Descripción
Sistema de invitaciones a eventos con respuestas (Aceptar, Rechazar, Quizás), similar a las invitaciones de Outlook.

### Modelo de Base de Datos

```prisma
model Attendance {
  id           String         @id @default(uuid())
  taskId       String
  userId       String
  status       AttendeeStatus // PENDING, ACCEPTED, DECLINED, TENTATIVE
  isOrganizer  Boolean        @default(false)
  isRequired   Boolean        @default(true)
  comment      String?
  respondedAt  DateTime?
  notified     Boolean        @default(false)
}
```

### API Endpoints

#### POST `/api/calendar/attendance/tasks/:taskId/invitations`
Crea invitaciones para un evento.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "organizerId": "user-organizer"
}
```

**Response:**
```json
[
  {
    "id": "attendance-uuid-1",
    "userId": "user-1",
    "userName": "Juan Pérez",
    "email": "juan@empresa.com",
    "status": "PENDING",
    "isOrganizer": false,
    "isRequired": true
  },
  {
    "id": "attendance-uuid-2",
    "userId": "user-organizer",
    "userName": "María González",
    "email": "maria@empresa.com",
    "status": "ACCEPTED",
    "isOrganizer": true,
    "isRequired": true
  }
]
```

#### PUT `/api/calendar/attendance/:attendanceId/respond`
Responder a una invitación.

**Request Body:**
```json
{
  "userId": "user-1",
  "status": "ACCEPTED",
  "comment": "Estaré ahí puntualmente"
}
```

**Response:**
```json
{
  "attendanceId": "attendance-uuid-1",
  "status": "ACCEPTED",
  "comment": "Estaré ahí puntualmente"
}
```

#### GET `/api/calendar/attendance/tasks/:taskId`
Obtiene lista de asistentes y sus respuestas.

#### GET `/api/calendar/attendance/tasks/:taskId/stats`
Estadísticas de respuestas.

**Response:**
```json
{
  "total": 10,
  "accepted": 7,
  "declined": 1,
  "tentative": 1,
  "pending": 1
}
```

#### GET `/api/calendar/attendance/users/:userId/pending`
Obtiene invitaciones pendientes de un usuario.

### Ejemplo de Uso

```typescript
// 1. Crear evento y enviar invitaciones
const createEvent = async () => {
  // Crear tarea/evento
  const task = await fetch('/api/calendar/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Reunión de Planificación Q1',
      description: 'Revisión de objetivos trimestrales',
      startDate: '2025-01-20T10:00:00.000Z',
      dueDate: '2025-01-20T11:00:00.000Z',
      location: 'Sala de Conferencias A',
      projectId: 'project-123'
    })
  });
  
  const { id: taskId } = await task.json();
  
  // Enviar invitaciones
  const invitations = await fetch(`/api/calendar/attendance/tasks/${taskId}/invitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userIds: ['user-1', 'user-2', 'user-3'],
      organizerId: currentUserId
    })
  });
};

// 2. Usuario responde a invitación
const respondToInvitation = async (attendanceId: string) => {
  await fetch(`/api/calendar/attendance/${attendanceId}/respond`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUserId,
      status: 'ACCEPTED',
      comment: 'Confirmo asistencia'
    })
  });
};

// 3. Organizador consulta respuestas
const checkResponses = async (taskId: string) => {
  const stats = await fetch(`/api/calendar/attendance/tasks/${taskId}/stats`);
  const data = await stats.json();
  console.log(`${data.accepted}/${data.total} han aceptado`);
};
```

---

## 🌍 5. Soporte de Zonas Horarias

### Descripción
Todas las fechas se almacenan en UTC y se convierten a la zona horaria del usuario para visualización.

### Campos de Base de Datos

```prisma
model Task {
  startDate    DateTime?
  dueDate      DateTime?
  timezone     String    @default("UTC") @db.VarChar(100)
}
```

### Conversión UTC

```typescript
import { DateTime } from 'luxon';

// Almacenar en UTC
const storeInUTC = (localDate: Date, userTimezone: string): Date => {
  const dt = DateTime.fromJSDate(localDate, { zone: userTimezone });
  return dt.toUTC().toJSDate();
};

// Mostrar en zona local
const displayInLocal = (utcDate: Date, userTimezone: string): Date => {
  const dt = DateTime.fromJSDate(utcDate, { zone: 'UTC' });
  return dt.setZone(userTimezone).toJSDate();
};

// Ejemplo de uso
const userInput = new Date('2025-01-15T14:00:00'); // Input del usuario en su zona
const utcDate = storeInUTC(userInput, 'America/Santiago'); // Guardar en DB

// Al mostrar
const displayDate = displayInLocal(utcDate, 'America/Santiago');
```

### Ejemplo Frontend (React)

```typescript
// Hook para manejar timezones
const useTimezoneConversion = () => {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const toUTC = (date: Date) => {
    return DateTime.fromJSDate(date, { zone: userTimezone })
      .toUTC()
      .toISO();
  };
  
  const fromUTC = (isoString: string) => {
    return DateTime.fromISO(isoString, { zone: 'UTC' })
      .setZone(userTimezone)
      .toJSDate();
  };
  
  return { toUTC, fromUTC, userTimezone };
};

// Componente
const EventForm = () => {
  const { toUTC, fromUTC, userTimezone } = useTimezoneConversion();
  
  const handleSubmit = async (formData) => {
    await fetch('/api/calendar/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        startDate: toUTC(formData.startDate),
        dueDate: toUTC(formData.dueDate),
        timezone: userTimezone
      })
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
};
```

---

## 🔧 Migración de Base de Datos

### Ejecutar desde el Contenedor Docker

```bash
# 1. Acceder al contenedor del backend
docker exec -it bodega-calendar-backend-1 bash

# 2. Generar la migración
npx prisma migrate dev --name add_enterprise_features

# 3. Salir del contenedor
exit
```

### Ejecutar Localmente (Desarrollo)

```bash
cd services/calendar/backend

# Asegurarse de tener .env configurado
cat > .env << EOL
DATABASE_URL="mysql://calendar_user:calendar_pass@localhost:3306/calendar_db"
NODE_ENV=development
PORT=3003
EOL

# Generar cliente Prisma
npx prisma generate

# Crear migración
npx prisma migrate dev --name add_enterprise_features
```

---

## 📦 Instalación de Dependencias

```bash
cd services/calendar/backend

# Instalar nuevas dependencias
npm install rrule luxon date-fns-tz
npm install -D @types/luxon
```

---

## 🧪 Testing de las APIs

### 1. Crear Evento Recurrente

```bash
curl -X POST http://localhost/api/calendar/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MEET-2025-001",
    "title": "Reunión Semanal de Equipo",
    "description": "Sincronización semanal del equipo",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "startDate": "2025-01-13T09:00:00.000Z",
    "dueDate": "2025-01-13T10:00:00.000Z",
    "projectId": "<PROJECT_ID>",
    "isRecurring": true,
    "location": "Sala de Conferencias A",
    "timezone": "America/Santiago"
  }'

# Luego crear la regla de recurrencia
curl -X POST http://localhost/api/calendar/recurrence/<TASK_ID> \
  -H "Content-Type: application/json" \
  -d '{
    "frequency": "WEEKLY",
    "interval": 1,
    "byWeekDay": ["MO", "WE", "FR"],
    "count": 20,
    "timezone": "America/Santiago"
  }'
```

### 2. Reservar Sala

```bash
# Verificar disponibilidad
curl "http://localhost/api/calendar/resources/<RESOURCE_ID>/availability?start=2025-01-15T14:00:00.000Z&end=2025-01-15T16:00:00.000Z"

# Crear reserva
curl -X POST http://localhost/api/calendar/resources/<RESOURCE_ID>/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<TASK_ID>",
    "userId": "<USER_ID>",
    "startTime": "2025-01-15T14:00:00.000Z",
    "endTime": "2025-01-15T16:00:00.000Z",
    "purpose": "Presentación de Proyecto",
    "autoConfirm": true
  }'
```

### 3. Consultar Disponibilidad

```bash
# Free/Busy de un usuario
curl "http://localhost/api/calendar/availability/users/<USER_ID>/free-busy?start=2025-01-13T00:00:00.000Z&end=2025-01-20T23:59:59.000Z"

# Disponibilidad de equipo
curl "http://localhost/api/calendar/availability/teams/free-busy?userIds=<USER1>,<USER2>,<USER3>&start=2025-01-13T00:00:00.000Z&end=2025-01-20T23:59:59.000Z"

# Slots comunes libres
curl "http://localhost/api/calendar/availability/teams/common-slots?userIds=<USER1>,<USER2>&start=2025-01-15T00:00:00.000Z&end=2025-01-15T23:59:59.000Z&duration=60"
```

### 4. Gestionar Invitaciones

```bash
# Crear invitaciones
curl -X POST http://localhost/api/calendar/attendance/tasks/<TASK_ID>/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["<USER1>", "<USER2>", "<USER3>"],
    "organizerId": "<ORGANIZER_ID>"
  }'

# Responder invitación
curl -X PUT http://localhost/api/calendar/attendance/<ATTENDANCE_ID>/respond \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<USER_ID>",
    "status": "ACCEPTED",
    "comment": "Confirmo asistencia"
  }'

# Ver estadísticas
curl "http://localhost/api/calendar/attendance/tasks/<TASK_ID>/stats"
```

---

## 🎨 Guía de Integración Frontend

### Componente de Calendario con Recurrencia

```typescript
// components/RecurringEventForm.tsx
import { useState } from 'react';

const RecurringEventForm = ({ taskId, onSuccess }) => {
  const [recurrence, setRecurrence] = useState({
    frequency: 'WEEKLY',
    interval: 1,
    byWeekDay: [],
    count: null,
    until: null
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch(`/api/calendar/recurrence/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recurrence)
    });
    
    if (response.ok) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select 
        value={recurrence.frequency}
        onChange={e => setRecurrence({...recurrence, frequency: e.target.value})}
      >
        <option value="DAILY">Diario</option>
        <option value="WEEKLY">Semanal</option>
        <option value="MONTHLY">Mensual</option>
        <option value="YEARLY">Anual</option>
      </select>
      
      {recurrence.frequency === 'WEEKLY' && (
        <div>
          <label>
            <input type="checkbox" value="MO" 
              onChange={e => {
                const days = e.target.checked
                  ? [...recurrence.byWeekDay, 'MO']
                  : recurrence.byWeekDay.filter(d => d !== 'MO');
                setRecurrence({...recurrence, byWeekDay: days});
              }}
            /> Lunes
          </label>
          {/* Repetir para otros días */}
        </div>
      )}
      
      <input 
        type="number"
        placeholder="Número de repeticiones"
        value={recurrence.count || ''}
        onChange={e => setRecurrence({...recurrence, count: parseInt(e.target.value)})}
      />
      
      <button type="submit">Crear Recurrencia</button>
    </form>
  );
};
```

### Componente de Disponibilidad del Equipo

```typescript
// components/TeamAvailability.tsx
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

const TeamAvailability = ({ userIds, startDate, endDate }) => {
  const [availability, setAvailability] = useState([]);
  const [commonSlots, setCommonSlots] = useState([]);

  useEffect(() => {
    const fetchAvailability = async () => {
      const response = await fetch(
        `/api/calendar/availability/teams/free-busy?` +
        `userIds=${userIds.join(',')}&` +
        `start=${startDate.toISOString()}&` +
        `end=${endDate.toISOString()}`
      );
      setAvailability(await response.json());
    };

    const fetchCommonSlots = async () => {
      const response = await fetch(
        `/api/calendar/availability/teams/common-slots?` +
        `userIds=${userIds.join(',')}&` +
        `start=${startDate.toISOString()}&` +
        `end=${endDate.toISOString()}&` +
        `duration=60`
      );
      setCommonSlots(await response.json());
    };

    fetchAvailability();
    fetchCommonSlots();
  }, [userIds, startDate, endDate]);

  return (
    <div className="team-availability">
      <h3>Disponibilidad del Equipo</h3>
      
      {availability.map(user => (
        <div key={user.userId} className="user-row">
          <div className="user-name">{user.userName}</div>
          <div className="timeline">
            {user.slots.map((slot, idx) => (
              <div 
                key={idx}
                className={`slot ${slot.status.toLowerCase()}`}
                title={slot.description}
              >
                {format(new Date(slot.start), 'HH:mm')} - 
                {format(new Date(slot.end), 'HH:mm')}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <h4>Horarios Sugeridos (Todos Disponibles)</h4>
      <ul>
        {commonSlots.map((slot, idx) => (
          <li key={idx}>
            {format(new Date(slot.start), 'dd/MM/yyyy HH:mm')} - 
            {format(new Date(slot.end), 'HH:mm')}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## 📊 Diagramas de Flujo

### Flujo de Creación de Evento Recurrente

```
Usuario → Frontend
  ↓
  Crear Tarea con isRecurring=true
  ↓
  Backend: POST /api/calendar/tasks
  ↓
  DB: Insertar en tabla tasks
  ↓
  Frontend: Recibe taskId
  ↓
  Configurar regla de recurrencia
  ↓
  Backend: POST /api/calendar/recurrence/:taskId
  ↓
  RecurrenceService.generateRRule()
  ↓
  DB: Insertar en tabla recurrence_rules
  ↓
  Frontend: Confirmación
```

### Flujo de Reserva de Recurso

```
Usuario → Selecciona Sala + Horario
  ↓
  Frontend: GET /resources/:id/availability
  ↓
  ResourceBookingService.checkResourceAvailability()
  ↓
  DB: Query resourceBookings con OR overlap
  ↓
  ¿Conflictos?
  ├─ SÍ → Frontend: Mostrar conflictos
  └─ NO → Frontend: Permitir reserva
        ↓
        POST /resources/:id/bookings
        ↓
        Validación doble (por seguridad)
        ↓
        DB: INSERT resourceBooking
        ↓
        Frontend: Confirmación
```

---

## 🔒 Consideraciones de Seguridad

1. **Validación de Permisos**: Asegurar que solo el organizador pueda modificar invitaciones
2. **Validación de Doble Reserva**: Siempre validar en el backend, nunca solo en frontend
3. **Timezone Attacks**: Validar que los timezones sean válidos (usar biblioteca como `luxon`)
4. **Rate Limiting**: Limitar creación masiva de recurrencias (máximo 365 ocurrencias)

---

## 📈 Métricas y Monitoreo

Endpoints recomendados para monitorear:

- `/api/calendar/recurrence/:taskId/occurrences` - Puede ser costoso computacionalmente
- `/api/calendar/resources/:id/availability` - Alta frecuencia de uso
- `/api/calendar/availability/teams/common-slots` - Requiere múltiples queries

Índices recomendados en MySQL:

```sql
CREATE INDEX idx_user_availability_user_time ON user_availability(userId, startTime, endTime);
CREATE INDEX idx_resource_bookings_resource_time ON resource_bookings(resourceId, startTime, endTime);
CREATE INDEX idx_attendance_task_user ON attendance(taskId, userId);
```

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"
```bash
# Verificar que el contenedor MySQL esté corriendo
docker ps | grep mysql

# Verificar conexión
docker exec -it bodega-mysql-1 mysql -u calendar_user -p
```

### Error: "Unknown authentication plugin sha256_password"
```bash
# Ejecutar migración desde dentro del contenedor
docker exec -it bodega-calendar-backend-1 npx prisma migrate dev
```

### Recurrencias no se generan correctamente
- Verificar que la librería `rrule` esté instalada
- Validar que el timezone sea válido
- Revisar logs del servicio RecurrenceService

---

## 📚 Referencias

- [RFC 5545 - iCalendar](https://tools.ietf.org/html/rfc5545)
- [RRULE Library Documentation](https://github.com/jakubroztocil/rrule)
- [Luxon Timezone Documentation](https://moment.github.io/luxon/#/zones)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

---

## ✅ Checklist de Implementación

- [x] Extender Prisma schema con nuevos modelos
- [x] Crear RecurrenceService con RRULE
- [x] Crear AttendanceService con RSVP
- [x] Crear ResourceBookingService con anti-doble-reserva
- [x] Extender AvailabilityService con Free/Busy
- [x] Crear controladores REST
- [x] Actualizar app.module con nuevos módulos
- [x] Instalar dependencias (rrule, luxon)
- [ ] Ejecutar migración de base de datos
- [ ] Probar endpoints con curl/Postman
- [ ] Implementar componentes React frontend
- [ ] Agregar tests unitarios
- [ ] Documentar en Swagger
- [ ] Deploy a producción

---

**Autor**: Sistema de Control de Bodega - Telecomunicaciones  
**Versión**: 1.0.0  
**Fecha**: Enero 2025
