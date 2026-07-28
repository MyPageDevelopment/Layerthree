# 🔍 AUDITORÍA COMPLETA DE CONSISTENCIA DE DATOS
## Sistema de Control de Bodega - Microservicios

**Fecha:** 2 de Enero, 2025  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Alcance:** Auth, Inventory y Calendar Microservices

---

## 📊 RESUMEN EJECUTIVO

### ✅ HALLAZGOS POSITIVOS

1. **No hay conflictos de IDs entre microservicios**
   - Todos los servicios ya usan UUIDs (`String @id @default(uuid())`)
   - No existe riesgo de colisión de IDs
   - No se requiere migración de IDs autoincrementales

### ⚠️ PROBLEMAS CRÍTICOS DETECTADOS

1. **Inconsistencia de tipos en Calendar Frontend** (BREAKING CHANGE)
   - Frontend espera `number` pero backend usa `string` (UUID)
   - Afecta: User.id, Project.id, TimeEntry.id

2. **Inconsistencia de Roles en Inventory Frontend** (BREAKING CHANGE)
   - Frontend usa: `'ADMIN' | 'MANAGER' | 'VIEWER'`
   - Backend usa: `'GERENTE' | 'JEFE' | 'TECNICO'`

3. **Inconsistencia de Atributos en Calendar**
   - Schema usa `active` pero debería ser `isActive`
   - Falta campo `allowedModules` en Calendar User

---

## 📋 TABLA COMPARATIVA DE CAMBIOS

### 1. ENTIDAD USER

| Microservicio | Campo | Tipo Anterior | Tipo Nuevo | Estado |
|---------------|-------|---------------|------------|--------|
| **Calendar Frontend** | id | `number` ❌ | `string` (UUID) ✅ | **CORREGIDO** |
| **Inventory Frontend** | role | `'ADMIN' \| 'MANAGER' \| 'VIEWER'` ❌ | `'SUPER_ADMIN' \| 'GERENTE' \| 'JEFE' \| 'TECNICO'` ✅ | **CORREGIDO** |
| **Calendar Schema** | active | `Boolean` ❌ | `isActive: Boolean` ✅ | PENDIENTE* |
| **Inventory Frontend** | isActive | N/A ❌ | `boolean` ✅ | **AGREGADO** |
| **Inventory Frontend** | updatedAt | N/A ❌ | `string` ✅ | **AGREGADO** |

*Nota: Requiere migración de schema en Prisma

### 2. ENTIDAD PROJECT

| Campo | Frontend Anterior | Frontend Nuevo | Backend | Estado |
|-------|------------------|----------------|---------|--------|
| id | `number` ❌ | `string` ✅ | `String @id @default(uuid())` | **CORREGIDO** |
| code | N/A ❌ | `string` ✅ | `String @unique` | **AGREGADO** |
| priority | N/A ❌ | `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'` ✅ | `TaskPriority` | **AGREGADO** |
| actualHours | N/A ❌ | `number` ✅ | `Float @default(0)` | **AGREGADO** |

### 3. ENTIDAD TASK (NUEVA en Frontend)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | `string` | UUID |
| code | `string` | Código único de tarea |
| title | `string` | Título de la tarea |
| status | `'PENDING' \| 'IN_PROGRESS' \| 'BLOCKED' \| 'COMPLETED' \| 'CANCELLED'` | Estado |
| priority | `'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'` | Prioridad |
| projectId | `string` | UUID del proyecto |

### 4. TIMEENTRY

| Campo | Anterior | Nuevo | Cambio |
|-------|----------|-------|--------|
| id | `number` ❌ | `string` ✅ | Tipo cambiado a UUID |
| projectId | `number` ❌ | ELIMINADO | Reemplazado por taskId |
| taskId | N/A | `string` ✅ | NUEVO campo |
| userId | `number` ❌ | `string` ✅ | Tipo cambiado a UUID |

---

## 🛠️ ARCHIVOS CORREGIDOS

### Backend - DTOs de Respuesta

#### ✅ Calendar Service

1. **[user-response.dto.ts](services/calendar/backend/src/common/dto/user-response.dto.ts)**
   - DTO estandarizado con UUIDs
   - Incluye `isActive` y `allowedModules`
   - Documentación completa con Swagger

2. **[project-response.dto.ts](services/calendar/backend/src/projects/dto/project-response.dto.ts)**
   - Todos los IDs como `string` (UUID)
   - Incluye relaciones: owner, manager
   - Enums documentados

3. **[task-response.dto.ts](services/calendar/backend/src/tasks/dto/task-response.dto.ts)**
   - Estructura completa con todas las propiedades
   - Soporte para tareas recursivas
   - Relaciones: project, parentTask, subtasks

#### ✅ Inventory Service

4. **[product-response.dto.ts](services/inventory/backend/src/products/dto/product-response.dto.ts)**
   - DTO con UUID
   - Enum ProductCategory documentado

5. **[movement-response.dto.ts](services/inventory/backend/src/movements/dto/movement-response.dto.ts)**
   - Incluye UserResponseDto local
   - Relaciones: product, user

### Frontend - Interfaces TypeScript

#### ✅ Calendar Frontend

6. **[types/index.ts](services/calendar/frontend/src/types/index.ts)** - ACTUALIZADO
   - **User.id**: `number` → `string` ✅
   - **Project.id**: `number` → `string` ✅
   - **TimeEntry**: Completamente refactorizado
     - `projectId` eliminado
     - `taskId` agregado
     - Todos los IDs son `string`
   - **Task**: Interface completa agregada

7. **[lib/data-parsers.ts](services/calendar/frontend/src/lib/data-parsers.ts)** - NUEVO
   - `parseAllowedModules()`: JSON string → array
   - `parseTags()`: JSON string → array
   - `isValidUUID()`: Validador de UUIDs

#### ✅ Inventory Frontend

8. **[types/index.ts](services/inventory/frontend/src/types/index.ts)** - ACTUALIZADO
   - **User.role**: Sincronizado con Auth Service
     - `'ADMIN' | 'MANAGER' | 'VIEWER'` ❌
     - `'SUPER_ADMIN' | 'GERENTE' | 'JEFE' | 'TECNICO'` ✅
   - **User.isActive**: Campo agregado
   - **User.updatedAt**: Campo agregado

9. **[lib/data-parsers.ts](services/inventory/frontend/src/lib/data-parsers.ts)** - NUEVO
   - Utilidades para parseo de JSON
   - Validación de UUIDs

---

## 🔧 SCRIPTS DE BASE DE DATOS

### 1. Validación de Consistencia

**Archivo:** [scripts/validate-data-consistency.sql](scripts/validate-data-consistency.sql)

**Funciones:**
- ✅ Verifica que todos los IDs sean UUIDs válidos
- ✅ Detecta registros huérfanos (FK inválidas)
- ✅ Encuentra emails duplicados
- ✅ Valida formato JSON en campos de texto
- ✅ Genera reporte de sincronización entre servicios

**Uso:**
```bash
# Desde MySQL
mysql -u root -p < scripts/validate-data-consistency.sql

# O desde PowerShell
Get-Content scripts/validate-data-consistency.sql | mysql -u root -p
```

### 2. Limpieza de Datos

**Archivo:** [scripts/cleanup-data.sql](scripts/cleanup-data.sql)

**Funciones:**
- 🧹 Elimina duplicados por email (mantiene más reciente)
- 🧹 Elimina duplicados por SKU/código
- 🧹 Limpia JSON inválidos
- 🧹 Elimina registros huérfanos
- 🧹 Corrige referencias inválidas

**Uso:**
```bash
# 1. HACER BACKUP PRIMERO
mysqldump -u root -p auth_db > backup_auth_db.sql
mysqldump -u root -p inventory_db > backup_inventory_db.sql
mysqldump -u root -p calendar_db > backup_calendar_db.sql

# 2. Ejecutar limpieza
mysql -u root -p < scripts/cleanup-data.sql

# 3. Revisar resultados y hacer COMMIT o ROLLBACK
```

---

## 📚 CÓMO USAR LOS NUEVOS DTOs

### Backend (NestJS)

#### Antes (INCORRECTO):
```typescript
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.service.findOne(id);  // Retorna entidad Prisma cruda
}
```

#### Ahora (CORRECTO):
```typescript
import { ProjectResponseDto } from './dto/project-response.dto';
import { plainToInstance } from 'class-transformer';

@Get(':id')
async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
  const project = await this.service.findOne(id);
  return plainToInstance(ProjectResponseDto, project, {
    excludeExtraneousValues: true,
  });
}
```

### Frontend (Next.js)

#### Antes (INCORRECTO):
```typescript
const response = await fetch(`/api/projects/${projectId}`);
const project = await response.json();
// project.id es number ❌
// Causaba errores de tipo
```

#### Ahora (CORRECTO):
```typescript
import { Project } from '@/types';
import { parseTags } from '@/lib/data-parsers';

const response = await fetch(`/api/projects/${projectId}`);
const project: Project = await response.json();

// project.id es string (UUID) ✅
// project.tags es string (JSON)

// Parsear cuando sea necesario:
const tagsArray = parseTags(project.tags);
console.log(tagsArray); // ['fibra-optica', 'infraestructura']
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Backend (1-2 horas)

1. ✅ Integrar DTOs de respuesta en los controladores
2. ✅ Actualizar decoradores Swagger
3. ✅ Agregar class-transformer a services
4. ⚠️ Migrar schema de Calendar: `active` → `isActive`

**Comandos:**
```bash
# Calendar backend
cd services/calendar/backend
npm install class-transformer class-validator

# Inventory backend
cd services/inventory/backend
npm install class-transformer class-validator
```

### Fase 2: Frontend (2-3 horas)

1. ✅ Reemplazar interfaces antiguas
2. ✅ Actualizar componentes que usan User.role
3. ✅ Actualizar componentes que usan IDs numéricos
4. ⚠️ Refactorizar componentes de TimeEntry

**Buscar y reemplazar en código:**
```bash
# Buscar uso de roles antiguos
grep -r "'ADMIN'" services/inventory/frontend/src
grep -r "'MANAGER'" services/inventory/frontend/src
grep -r "'VIEWER'" services/inventory/frontend/src

# Buscar conversión de IDs a number
grep -r "parseInt.*\.id" services/calendar/frontend/src
grep -r "Number.*\.id" services/calendar/frontend/src
```

### Fase 3: Base de Datos (30 min)

1. ✅ Ejecutar script de validación
2. ✅ Revisar reporte
3. ✅ HACER BACKUP
4. ✅ Ejecutar script de limpieza
5. ✅ COMMIT si todo OK

### Fase 4: Testing (1-2 horas)

1. Probar login en ambos frontends
2. Verificar permisos por rol
3. Probar CRUD de productos (Inventory)
4. Probar CRUD de proyectos y tareas (Calendar)
5. Verificar relaciones (product→movement→user)

---

## ⚠️ MIGRACIONES PENDIENTES

### 1. Renombrar campo en Calendar User

**Archivo:** `services/calendar/backend/prisma/schema.prisma`

```prisma
// ANTES:
model User {
  active Boolean @default(true)  // ❌
}

// DESPUÉS:
model User {
  isActive Boolean @default(true)  // ✅
}
```

**Comando de migración:**
```bash
cd services/calendar/backend
npx prisma migrate dev --name rename_active_to_isActive
```

### 2. Agregar allowedModules a Calendar User (Opcional)

Si quieres sincronizar completamente con Auth:

```prisma
model User {
  // ... campos existentes
  allowedModules String? @db.Text
}
```

---

## 🔑 PUNTOS CLAVE PARA EVITAR CONFLICTOS

### 1. Manejo de Llaves Foráneas a Servicios Externos

❌ **MAL - Llave foránea directa entre servicios:**
```prisma
model Movement {
  userId String
  user   User   @relation(fields: [userId], references: [id])
}
```

✅ **BIEN - Solo almacenar el UUID:**
```prisma
model Movement {
  userId String  // Solo el UUID, sin relación FK
  // El User está en otro microservicio (Auth)
}
```

**Razón:** Cada microservicio tiene su propia BD. Las FK solo funcionan dentro del mismo servicio.

### 2. Sincronización de Datos entre Servicios

**Estrategia recomendada:**

1. **Auth Service** es la fuente única de verdad para Users
2. **Inventory** y **Calendar** solo almacenan el `userId` (UUID)
3. Para obtener datos del usuario:
   - Opción A: Llamar a Auth API
   - Opción B: Cachear datos en frontend (JWT payload)

**Ejemplo:**
```typescript
// En Calendar Service Controller
@Get('tasks/:id')
async getTask(@Param('id') id: string, @Request() req) {
  const task = await this.taskService.findOne(id);
  
  // El user viene del JWT (Auth Service)
  const user = req.user;
  
  return {
    ...task,
    createdBy: {
      id: user.sub,
      name: user.name,
      email: user.email,
    }
  };
}
```

### 3. Validación de UUIDs

Siempre validar UUIDs antes de usarlos:

```typescript
import { IsUUID } from 'class-validator';

export class CreateTaskDto {
  @IsUUID('4')  // Valida UUID v4
  projectId: string;
}
```

---

## 📊 MAPEO COMPLETO: BACKEND ↔ FRONTEND

### User Entity

| Campo | Auth Backend | Calendar Backend | Inventory Backend | Calendar Frontend | Inventory Frontend |
|-------|--------------|------------------|-------------------|-------------------|-------------------|
| id | `String @default(uuid())` | `String @default(uuid())` | `String @default(uuid())` | `string` ✅ | `string` ✅ |
| email | `String @unique` | `String @unique` | `String @unique` | `string` | `string` |
| name | `String?` | `String` | `String?` | `string` | `string` |
| role | `UserRole` | `Role?` | `UserRole` | `'SUPER_ADMIN' \| 'GERENTE' \| 'JEFE' \| 'TECNICO'` ✅ | `'SUPER_ADMIN' \| 'GERENTE' \| 'JEFE' \| 'TECNICO'` ✅ |
| isActive | `Boolean` | ❌ `active` | `Boolean` | `boolean` ✅ | `boolean` ✅ |
| allowedModules | `String? @db.Text` | ❌ No existe | `String? @db.Text` | `string[]?` | `string[]?` |

### Product Entity

| Campo | Inventory Backend | Inventory Frontend |
|-------|-------------------|-------------------|
| id | `String @default(uuid())` | `string` ✅ |
| sku | `String @unique` | `string` |
| name | `String` | `string` |
| category | `ProductCategory` | `ProductCategory` |
| stock | `Int` | `number` |

### Project Entity

| Campo | Calendar Backend | Calendar Frontend |
|-------|------------------|-------------------|
| id | `String @default(uuid())` | `string` ✅ |
| code | `String @unique` | `string` ✅ |
| name | `String` | `string` |
| status | `ProjectStatus` | `'PLANNING' \| 'ACTIVE' \| 'ON_HOLD' \| 'COMPLETED' \| 'CANCELLED'` |
| ownerId | `String` | `string` ✅ |
| managerId | `String?` | `string?` ✅ |

---

## 🎯 CONCLUSIONES

### ✅ Logros

1. **No requiere migración a UUID** - Ya está implementado
2. **DTOs estandarizados creados** - Garantizan consistencia
3. **Interfaces TypeScript actualizadas** - Sincronizadas con backend
4. **Scripts de validación y limpieza** - Listos para usar
5. **Documentación completa** - Guía de implementación clara

### ⚠️ Acciones Requeridas

1. **Migrar campo `active` → `isActive` en Calendar** (Prisma migration)
2. **Actualizar controladores** para usar nuevos DTOs de respuesta
3. **Refactorizar componentes de frontend** que usan tipos antiguos
4. **Ejecutar scripts de limpieza** en base de datos
5. **Testing completo** de flujos end-to-end

### 📈 Próximos Pasos

1. Revisar este documento con el equipo
2. Crear backup de producción
3. Ejecutar scripts de validación
4. Implementar cambios en desarrollo
5. Probar exhaustivamente
6. Deploy gradual a producción

---

**Documento generado por:** GitHub Copilot  
**Fecha:** 2 de Enero, 2026  
**Versión:** 1.0
