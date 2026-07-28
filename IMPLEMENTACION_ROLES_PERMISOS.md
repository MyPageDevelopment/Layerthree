# Implementación de Sistema de Roles y Permisos

## Resumen

Se ha implementado un sistema completo de roles y permisos para el microservicio de calendario, incluyendo:
- Cambio de roles del sistema
- Guards de autorización en backend
- Controles de permisos en frontend
- Botones de acción rápida para completar tareas y proyectos

## Cambios en Roles

### Roles Anteriores → Roles Nuevos
- `SUPER_ADMIN` → `SUPER_ADMIN` (sin cambios)
- `ADMIN` → `GERENTE`
- `MANAGER` → `JEFE`
- `VIEWER` / `EMPLOYEE` → `TECNICO`

### Permisos por Rol

#### SUPER_ADMIN
- ✅ Acceso completo a todo el sistema
- ✅ Crear, editar, eliminar proyectos y tareas
- ✅ Ver todas las tareas (propias y de otros)
- ✅ Cambiar estados de tareas y proyectos

#### GERENTE
- ✅ Crear, editar, eliminar proyectos y tareas
- ✅ Ver todas las tareas
- ✅ Cambiar estados de tareas y proyectos
- ❌ Acceso limitado a configuración del sistema

#### JEFE
- ✅ Crear, editar tareas
- ✅ Ver todas las tareas
- ✅ Cambiar estados de tareas y proyectos
- ❌ No puede eliminar proyectos

#### TECNICO
- ✅ Ver solo tareas asignadas a él
- ✅ Cambiar estado de tareas asignadas
- ❌ No puede crear, editar o eliminar tareas
- ❌ No puede ver tareas de otros técnicos

## Cambios en Backend

### 1. Schemas Actualizados

**Archivos modificados:**
- `services/auth/backend/prisma/schema.prisma`
- `services/calendar/backend/prisma/schema.prisma`
- `services/inventory/backend/prisma/schema.prisma`

**Cambio en enum:**
```prisma
enum UserRole {
  SUPER_ADMIN
  GERENTE
  JEFE
  TECNICO
}
```

### 2. Guards Creados

#### RolesGuard
**Ubicación:** `services/calendar/backend/src/common/guards/roles.guard.ts`

Verifica que el usuario tenga uno de los roles especificados en el decorador `@Roles()`.

```typescript
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
async createTask() { ... }
```

#### TaskAssignmentGuard
**Ubicación:** `services/calendar/backend/src/common/guards/task-assignment.guard.ts`

Verifica que un TECNICO solo pueda acceder a tareas que le están asignadas.

```typescript
@UseGuards(RolesGuard, TaskAssignmentGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO')
async getTaskById() { ... }
```

### 3. Decorador @Roles

**Ubicación:** `services/calendar/backend/src/common/decorators/roles.decorator.ts`

```typescript
import { Roles } from '@/common/decorators/roles.decorator';

@Roles('SUPER_ADMIN', 'GERENTE')
async deleteProject() { ... }
```

### 4. Endpoints Actualizados

#### Tasks Controller
**Archivo:** `services/calendar/backend/src/tasks/tasks.controller.ts`

Todos los endpoints ahora están protegidos con guards y decoradores de roles:

```typescript
// Crear tarea - Solo SUPER_ADMIN, GERENTE, JEFE
@Post()
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
async create(@Body() createTaskDto: CreateTaskDto)

// Ver tarea - Todos con restricciones para TECNICO
@Get(':id')
@UseGuards(RolesGuard, TaskAssignmentGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO')
async findOne(@Param('id') id: string)

// Cambiar estado - Todos pueden (TECNICO solo sus tareas)
@Patch(':id/status')
@UseGuards(RolesGuard, TaskAssignmentGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO')
async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto)

// Actualizar tarea - Solo SUPER_ADMIN, GERENTE, JEFE
@Patch(':id')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto)

// Eliminar tarea - Solo SUPER_ADMIN, GERENTE
@Delete(':id')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE')
async remove(@Param('id') id: string)
```

#### Projects Controller
**Archivo:** `services/calendar/backend/src/projects/projects.controller.ts`

Similar protección aplicada a proyectos:

```typescript
// Crear proyecto
@Post()
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
async create(@Body() createProjectDto: CreateProjectDto)

// Cambiar estado de proyecto
@Patch(':id/status')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto)

// Eliminar proyecto
@Delete(':id')
@UseGuards(RolesGuard)
@Roles('SUPER_ADMIN', 'GERENTE')
async remove(@Param('id') id: string)
```

### 5. Nuevos Métodos en Services

#### TasksService
```typescript
async updateStatus(id: string, status: string): Promise<Task> {
  return this.prisma.task.update({
    where: { id },
    data: { status },
    include: {
      project: true,
      assignments: { include: { user: true } }
    }
  });
}
```

#### ProjectsService
```typescript
async updateStatus(id: string, status: ProjectStatus): Promise<Project> {
  return this.prisma.project.update({
    where: { id },
    data: { status },
    include: {
      owner: true,
      manager: true,
      _count: { select: { tasks: true, milestones: true } }
    }
  });
}
```

## Cambios en Frontend

### 1. Helper de Permisos

**Ubicación:** `services/calendar/frontend/src/lib/permissions.ts`

Funciones para verificar permisos:

```typescript
// Verificar si puede crear/editar
canCreateEdit(user: User): boolean

// Verificar si puede eliminar
canDelete(user: User): boolean

// Verificar si puede cambiar estados
canChangeStatus(user: User): boolean

// Verificar si puede ver todo
canViewAll(user: User): boolean

// Verificar si es técnico
isTecnico(user: User): boolean

// Obtener etiqueta de rol
getRoleLabel(role: UserRole): string
```

### 2. Páginas Actualizadas

#### Calendario (`app/calendario/page.tsx`)

**Cambios:**
- ✅ Botón "Nueva Tarea" solo visible para SUPER_ADMIN, GERENTE, JEFE
- ✅ Botón "Eliminar" en modal solo visible para SUPER_ADMIN, GERENTE
- ✅ Botón "Guardar/Crear" solo visible para usuarios con permisos
- ✅ Botón "Completar Tarea" visible para todos con permisos (incluye TECNICO)

```typescript
// Importar permisos
import { canCreateEdit, canDelete, canChangeStatus } from '@/lib/permissions'

// Cargar usuario
const [user, setUser] = useState<any>(null)
useEffect(() => {
  const userData = getUserData()
  if (userData) setUser(userData)
}, [])

// Proteger botón Nueva Tarea
{user && canCreateEdit(user) && (
  <Button onClick={handleCreateTaskFromButton}>Nueva Tarea</Button>
)}

// Proteger botón Eliminar
{selectedTask && user && canDelete(user) && (
  <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
)}

// Botón Completar Tarea
{selectedTask && user && canChangeStatus(user) && selectedTask.status !== 'COMPLETED' && (
  <Button onClick={() => handleCompleteTask(selectedTask.id, selectedTask.status)}>
    ✓ Completar Tarea
  </Button>
)}
```

**Nueva función:**
```typescript
const handleCompleteTask = async (taskId: string, currentStatus: string) => {
  if (currentStatus === 'COMPLETED') {
    alert('Esta tarea ya está completada')
    return
  }

  const response = await fetch(`${apiUrl}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'COMPLETED' })
  })

  if (response.ok) {
    await loadTasks()
    handleCloseModal()
  }
}
```

#### Proyectos (`app/proyectos/page.tsx`)

**Cambios:**
- ✅ Botón "Nuevo Proyecto" solo visible para usuarios con permisos
- ✅ Botones de editar/eliminar en tarjetas protegidos
- ✅ Botón "Completar Proyecto" agregado en tarjetas

```typescript
// Proteger botón Nuevo Proyecto
{user && canCreateEdit(user) && (
  <Button onClick={() => handleOpenModal()}>Nuevo Proyecto</Button>
)}

// En tarjeta de proyecto
{user && canCreateEdit(user) && (
  <button onClick={() => handleOpenModal(project)}>Editar</button>
)}
{user && canDelete(user) && (
  <button onClick={() => handleDelete(project.id)}>Eliminar</button>
)}
{user && canChangeStatus(user) && project.status !== 'COMPLETED' && (
  <button onClick={() => handleCompleteProject(project.id, project.status)}>
    Completar Proyecto
  </button>
)}
```

**Nueva función:**
```typescript
const handleCompleteProject = async (projectId: string, currentStatus: string) => {
  if (currentStatus === 'COMPLETED') {
    alert('Este proyecto ya está completado')
    return
  }

  if (!confirm('¿Deseas marcar este proyecto como completado?')) {
    return
  }

  const response = await fetch(`${apiUrl}/projects/${projectId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status: 'COMPLETED' })
  })

  if (response.ok) {
    await loadProjects()
  }
}
```

#### Kanban (`app/kanban/page.tsx`)

**Cambios:**
- ✅ Verificación de permisos antes de permitir arrastrar y soltar tareas

```typescript
const handleDrop = (e: React.DragEvent, newStatus: string) => {
  e.preventDefault()
  
  if (!user || !canChangeStatus(user)) {
    alert('No tienes permisos para cambiar el estado de las tareas')
    setDraggedTask(null)
    return
  }
  
  if (draggedTask && draggedTask.status !== newStatus) {
    updateTaskStatus(draggedTask.id, newStatus)
  }
  setDraggedTask(null)
}
```

#### Navbar (`components/Navbar.tsx`)

**Cambios:**
- ✅ Etiquetas de roles actualizadas

```typescript
{user.role === 'GERENTE' && 'Gerente'}
{user.role === 'JEFE' && 'Jefe'}
{user.role === 'TECNICO' && 'Técnico'}
{user.role === 'SUPER_ADMIN' && 'Super Admin'}
```

## Migración de Datos

### Script SQL
**Ubicación:** `scripts/migrate-roles.sql`

Este script migra los roles existentes al nuevo sistema:

```sql
-- Mapeo de roles:
ADMIN -> GERENTE
MANAGER -> JEFE
VIEWER/EMPLOYEE -> TECNICO
SUPER_ADMIN -> SUPER_ADMIN (sin cambios)
```

**Ejecutar con:**
```bash
# Desde contenedor MySQL
docker exec -it bodega_mysql mysql -u root -p

# Dentro de MySQL
USE auth_db;
source /path/to/scripts/migrate-roles.sql;

USE calendar_db;
source /path/to/scripts/migrate-roles.sql;
```

## Pasos de Deployment

### 1. Backup de Base de Datos
```bash
docker exec bodega_mysql mysqldump -u root -p --all-databases > backup_pre_roles_$(date +%Y%m%d).sql
```

### 2. Actualizar Schemas de Prisma
```bash
cd services/auth/backend
npx prisma migrate dev --name update_roles

cd ../../calendar/backend
npx prisma migrate dev --name update_roles

cd ../../inventory/backend
npx prisma migrate dev --name update_roles
```

### 3. Ejecutar Script de Migración
```bash
docker exec -i bodega_mysql mysql -u root -p < scripts/migrate-roles.sql
```

### 4. Rebuild y Restart de Servicios
```bash
docker-compose down
docker-compose up -d --build
```

### 5. Verificar Cambios
```bash
# Verificar roles en base de datos
docker exec -it bodega_mysql mysql -u root -p -e "USE auth_db; SELECT role, COUNT(*) as count FROM users GROUP BY role;"

# Verificar logs de servicios
docker-compose logs -f calendar-backend
docker-compose logs -f auth-backend
```

## Testing

### 1. Crear Usuarios de Prueba

```sql
-- TECNICO
INSERT INTO users (email, name, password, role, allowedModules) 
VALUES ('tecnico@test.com', 'Juan Técnico', 'hashed_password', 'TECNICO', '["projects"]');

-- JEFE
INSERT INTO users (email, name, password, role, allowedModules) 
VALUES ('jefe@test.com', 'María Jefe', 'hashed_password', 'JEFE', '["projects"]');

-- GERENTE
INSERT INTO users (email, name, password, role, allowedModules) 
VALUES ('gerente@test.com', 'Pedro Gerente', 'hashed_password', 'GERENTE', '["projects", "users"]');
```

### 2. Casos de Prueba

#### TECNICO
- ✅ Puede ver solo sus tareas asignadas
- ✅ Puede cambiar estado de sus tareas
- ❌ No ve botón "Nueva Tarea"
- ❌ No ve botón "Eliminar"
- ❌ No puede editar tareas de otros
- ✅ Ve botón "Completar Tarea" en sus tareas

#### JEFE
- ✅ Ve botón "Nueva Tarea"
- ✅ Puede crear y editar tareas
- ✅ Ve botón "Completar Tarea" y "Completar Proyecto"
- ❌ No puede eliminar proyectos (solo SUPER_ADMIN y GERENTE)
- ✅ Ve todas las tareas

#### GERENTE
- ✅ Ve botón "Nueva Tarea" y "Nuevo Proyecto"
- ✅ Puede crear, editar tareas y proyectos
- ✅ Puede eliminar tareas
- ✅ Ve botones de completar
- ✅ Ve todas las tareas

#### SUPER_ADMIN
- ✅ Acceso completo a todo
- ✅ Todos los botones visibles
- ✅ Puede eliminar proyectos y tareas

## Nuevas Características

### Botones de Completar

#### En Tareas
- Botón verde "✓ Completar Tarea" en modal de tarea
- Solo visible si el usuario tiene permiso `canChangeStatus()`
- Solo visible si la tarea no está ya completada
- Llama al endpoint `PATCH /tasks/:id/status` con `status: 'COMPLETED'`
- Cierra el modal automáticamente después de completar

#### En Proyectos
- Botón de check verde en tarjeta de proyecto
- Solo visible si el usuario tiene permiso `canChangeStatus()`
- Solo visible si el proyecto no está completado
- Muestra confirmación antes de completar
- Llama al endpoint `PATCH /projects/:id/status` con `status: 'COMPLETED'`
- Recarga la lista de proyectos automáticamente

## Endpoints API Nuevos

### Tasks
```
PATCH /api/calendar/tasks/:id/status
Body: { status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "BLOCKED" }
Auth: Bearer token
Roles: SUPER_ADMIN, GERENTE, JEFE, TECNICO (solo tareas asignadas)
```

### Projects
```
PATCH /api/calendar/projects/:id/status
Body: { status: "COMPLETED" | "PLANNING" | "ACTIVE" | "ON_HOLD" | "CANCELLED" }
Auth: Bearer token
Roles: SUPER_ADMIN, GERENTE, JEFE
```

## Archivos Creados/Modificados

### Creados
- `services/calendar/backend/src/common/guards/roles.guard.ts`
- `services/calendar/backend/src/common/guards/task-assignment.guard.ts`
- `services/calendar/backend/src/common/decorators/roles.decorator.ts`
- `services/calendar/frontend/src/lib/permissions.ts`
- `scripts/migrate-roles.sql`
- `IMPLEMENTACION_ROLES_PERMISOS.md` (este archivo)

### Modificados
- `services/auth/backend/prisma/schema.prisma`
- `services/calendar/backend/prisma/schema.prisma`
- `services/inventory/backend/prisma/schema.prisma`
- `services/calendar/backend/src/tasks/tasks.controller.ts`
- `services/calendar/backend/src/tasks/tasks.service.ts`
- `services/calendar/backend/src/projects/projects.controller.ts`
- `services/calendar/backend/src/projects/projects.service.ts`
- `services/calendar/frontend/app/calendario/page.tsx`
- `services/calendar/frontend/app/proyectos/page.tsx`
- `services/calendar/frontend/app/kanban/page.tsx`
- `services/calendar/frontend/components/Navbar.tsx`

## Notas Importantes

1. **TECNICO** es el rol con más restricciones:
   - Solo ve tareas asignadas a él
   - No puede crear o editar tareas
   - Solo puede cambiar estados de sus tareas

2. **TaskAssignmentGuard** solo se activa para usuarios TECNICO:
   - Para otros roles, el guard pasa directamente
   - Consulta la tabla `TaskAssignment` para verificar asignación

3. **Endpoints de status separados**:
   - Permiten cambios de estado sin modificar otros campos
   - Más simple y seguro para usuarios con permisos limitados

4. **Retrocompatibilidad**:
   - El script SQL migra datos existentes
   - No se pierden datos durante la migración
   - SUPER_ADMIN mantiene todos sus privilegios

## Troubleshooting

### Error: "No tienes permisos"
- Verificar que el usuario tenga el rol correcto en la base de datos
- Verificar que el token JWT contenga la información del rol
- Verificar que `getUserData()` esté retornando el usuario correctamente

### Guards no funcionan
- Verificar que los guards estén registrados en el módulo
- Verificar que `PrismaService` esté inyectado en `TaskAssignmentGuard`
- Verificar que el decorador `@Roles()` esté antes del endpoint

### Botones no se ocultan
- Verificar que el estado `user` esté poblado
- Verificar imports de funciones de permisos
- Verificar que `getUserData()` retorne objeto con campo `role`

## Próximos Pasos

1. Agregar tests unitarios para guards
2. Agregar tests E2E para flujos de permisos
3. Implementar logs de auditoría para cambios críticos
4. Agregar notificaciones cuando se cambian estados
5. Implementar permisos a nivel de campo (field-level permissions)
