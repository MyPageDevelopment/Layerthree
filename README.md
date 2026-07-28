# 🏢 Sistema de Intranet Empresarial - Layerthree

<div align="center">

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

**Sistema integral de gestión empresarial basado en arquitectura de microservicios**

[Documentación](#-documentación) •
[Instalación](#-instalación-rápida) •
[Desarrollo](#-desarrollo-local) •
[Despliegue](#-despliegue-en-producción) •
[API](#-documentación-de-api)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Microservicios Disponibles](#-microservicios-disponibles)
- [Requisitos Previos](#-requisitos-previos)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación Rápida](#-instalación-rápida)
- [Configuración del Entorno](#-configuración-del-entorno)
- [Despliegue en Producción](#-despliegue-en-producción)
- [Gestión de Contenedores](#-gestión-de-contenedores)
- [Red Interna Docker](#-red-interna-docker)
- [Puertos y Servicios](#-puertos-y-servicios)
- [Documentación de API](#-documentación-de-api)
- [Seguridad](#-seguridad)
- [Backup y Mantenimiento](#-backup-y-mantenimiento)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)

---

## 🎯 Descripción General

Sistema modular de intranet empresarial diseñado para gestionar operaciones críticas de negocio mediante una arquitectura de microservicios. Cada módulo es independiente, escalable y puede desplegarse de forma aislada.

### ¿Por qué Microservicios?

- **✅ Escalabilidad independiente**: Cada servicio puede escalar según su demanda
- **✅ Despliegue continuo**: Actualizar un módulo sin afectar los demás
- **✅ Tecnologías específicas**: Usar el mejor stack para cada problema
- **✅ Resiliencia**: Si un servicio falla, los demás siguen operando
- **✅ Equipos autónomos**: Desarrollar módulos en paralelo
- **✅ Mantenimiento simplificado**: Código organizado y desacoplado

### Características Principales

- 🔐 **Autenticación centralizada** con JWT y refresh tokens
- 📦 **Gestión de inventario** completa con auditoría
- 📅 **Sistema de calendario** para proyectos y tareas
- 📊 **Reportes y exportaciones** a Excel/CSV
- 🔄 **Sistema de archivos** para documentación de proyectos
- 🚀 **API REST** documentada con Swagger
- 🐳 **Containerización completa** con Docker
- 🔒 **Secrets management** para credenciales sensibles
- 🌐 **Proxy inverso Nginx** para enrutamiento inteligente
- 💾 **Persistencia de datos** con volúmenes Docker

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NGINX GATEWAY (Puerto 80)                    │
│                    Proxy Inverso & Load Balancer                    │
└───────────┬─────────────────────────────────────────────────────────┘
            │
            ├─── /api/auth ────────► Auth Backend (Puerto 3002)
            │                        ├─ Login/Logout
            │                        ├─ JWT Validation
            │                        └─ User Management
            │
            ├─── /api/inventory ───► Inventory Backend (Puerto 3001)
            │                        ├─ Products CRUD
            │                        ├─ Movements (IN/OUT)
            │                        ├─ Stock Control
            │                        └─ Reports (Excel)
            │
            ├─── /api/calendar ────► Calendar Backend (Puerto 3003)
            │                        ├─ Projects Management
            │                        ├─ Tasks & Schedule
            │                        ├─ File Management
            │                        └─ Attendance Tracking
            │
            ├─── / ────────────────► Inventory Frontend (Puerto 3010)
            │                        React App (Next.js)
            │
            └─── /calendario ──────► Calendar Frontend (Puerto 3020)
                                     React App (Next.js)

┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA                             │
├─────────────────────────────────────────────────────────────────────┤
│  MySQL (Puerto 3307)          Redis (Puerto 6379)                   │
│  ├─ inventory_db              ├─ Session Cache                      │
│  ├─ calendar_db               └─ Rate Limiting                      │
│  └─ auth_db                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Red Docker Interna

```
Subnet: 172.20.0.0/16

172.20.0.10  →  MySQL Server
172.20.0.11  →  Redis Server
172.20.0.20  →  API Gateway (Nginx)
172.20.0.21  →  Inventory Backend
172.20.0.22  →  Inventory Frontend
172.20.0.51  →  Calendar Backend
172.20.0.52  →  Calendar Frontend
172.20.0.61  →  Auth Backend
```

---

## 🔧 Microservicios Disponibles

### 1. 🔐 **Autenticación Global** (`auth-backend`)

Sistema centralizado de autenticación y autorización.

**Características:**
- Login con email/password
- JWT Access Token (1h)
- Refresh Token (7 días)
- Sistema de roles: SUPER_ADMIN, GERENTE, JEFE, TECNICO
- Control de módulos permitidos por usuario
- Endpoints de validación de tokens

**Stack:**
- NestJS + TypeScript
- Prisma ORM
- bcrypt para hash de contraseñas
- passport-jwt

---

### 2. 📦 **Inventario / Bodega** (`inventory`)

Gestión completa de stock, productos y movimientos.

**Características:**
- ✅ CRUD de productos con categorías y subcategorías
- ✅ Control de stock con mínimos configurables
- ✅ Movimientos de entrada/salida (individuales y masivos)
- ✅ Tracking por ID de proyecto
- ✅ Sistema de auditoría completo (quién, qué, cuándo)
- ✅ Exportación a Excel con formato profesional
- ✅ Búsqueda avanzada por SKU, categoría, subcategoría
- ✅ Dashboard con métricas en tiempo real

**Stack Backend:**
- NestJS + TypeScript
- Prisma ORM
- ExcelJS para reportes
- MySQL Database

**Stack Frontend:**
- Next.js 14 + App Router
- Tailwind CSS
- TypeScript

**Modelos de Datos:**
```typescript
Product {
  id: string
  sku: string (unique)
  name: string
  description: string
  category: ProductCategory
  subcategory: string
  stock: number
  minStock: number
  unitPrice: number
}

Movement {
  id: string
  productId: string
  type: ENTRY | EXIT
  quantity: number
  projectId: string (optional)
  notes: string
  userId: string
  createdAt: DateTime
}
```

---

### 3. 📅 **Calendario / Proyectos** (`calendar`)

Sistema integral de gestión de proyectos, tareas y recursos.

**Características:**
- ✅ Gestión de proyectos con estados (Planning, Active, On Hold, Completed)
- ✅ Sistema de tareas con prioridades
- ✅ Calendario de jornadas laborales
- ✅ Tracking de asistencia
- ✅ Gestión de archivos por proyecto (7 carpetas predefinidas)
- ✅ Upload/Download de documentos
- ✅ Generación de ZIP por carpeta o proyecto completo
- ✅ Plantilla de costos descargable (PlanillaCostos.xlsm)
- ✅ Reportes de proyectos en Excel
- ✅ Asignación de recursos y equipos
- ✅ Notificaciones por email (SMTP)

**Stack Backend:**
- NestJS + TypeScript
- Prisma ORM
- Multer para uploads
- Archiver para ZIP
- Nodemailer para emails
- MySQL Database

**Stack Frontend:**
- Next.js 14 + App Router
- Tailwind CSS
- FullCalendar para visualización
- TypeScript

**Estructura de Archivos por Proyecto:**
```
uploads/projects/{projectId}_{projectName}/
├── Imagenes/
├── AS-BUILT/
├── Contrato/
├── Costos/
├── Firmados/
├── Anexos/
└── Otros/
```

**Modelos de Datos:**
```typescript
Project {
  id: string
  code: string (unique)
  name: string
  description: string
  status: PLANNING | ACTIVE | ON_HOLD | COMPLETED
  priority: LOW | MEDIUM | HIGH
  startDate: DateTime
  endDate: DateTime
  budget: number
  estimatedHours: number
}

Task {
  id: string
  projectId: string
  title: string
  description: string
  status: TODO | IN_PROGRESS | COMPLETED
  priority: LOW | MEDIUM | HIGH
  dueDate: DateTime
  assignedTo: string[]
}
```

---

## 💻 Requisitos Previos

### Software Requerido

| Software | Versión Mínima | Propósito |
|----------|---------------|-----------|
| **Docker** | 24.0+ | Containerización de servicios |
| **Docker Compose** | 2.20+ | Orquestación de contenedores |
| **Node.js** | 20.x LTS | Desarrollo local (opcional) |
| **Git** | 2.40+ | Control de versiones |

### Hardware Recomendado (Servidor Físico)

| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 8 GB | 16 GB |
| **Disco** | 50 GB SSD | 100 GB SSD |
| **Red** | 100 Mbps | 1 Gbps |

### Verificación de Requisitos

```powershell
# Verificar Docker
docker --version
# Docker version 24.0.7, build afdd53b

# Verificar Docker Compose
docker compose version
# Docker Compose version v2.23.0

# Verificar recursos disponibles
docker info | Select-String -Pattern "Total Memory|CPUs"
```

---

## 📁 Estructura del Proyecto

```
📦 Bodega/
├── 📂 services/                          # Microservicios
│   ├── 📂 auth/
│   │   └── 📂 backend/                   # Autenticación centralizada
│   │       ├── 📂 src/
│   │       ├── 📂 prisma/
│   │       ├── Dockerfile
│   │       └── package.json
│   │
│   ├── 📂 inventory/
│   │   ├── 📂 backend/                   # API de inventario
│   │   │   ├── 📂 src/
│   │   │   │   ├── 📂 auth/            # Guards y estrategias
│   │   │   │   ├── 📂 products/        # CRUD productos
│   │   │   │   ├── 📂 movements/       # Movimientos stock
│   │   │   │   ├── 📂 reports/         # Exportaciones
│   │   │   │   └── 📂 common/          # Middleware, filters
│   │   │   ├── 📂 prisma/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   │
│   │   └── 📂 frontend/                 # UI de inventario
│   │       ├── 📂 app/
│   │       │   ├── 📂 dashboard/
│   │       │   ├── 📂 productos/
│   │       │   └── 📂 movimientos/
│   │       ├── 📂 src/
│   │       │   ├── 📂 components/
│   │       │   └── 📂 lib/
│   │       ├── Dockerfile
│   │       └── package.json
│   │
│   └── 📂 calendar/
│       ├── 📂 backend/                   # API de calendario
│       │   ├── 📂 src/
│       │   │   ├── 📂 projects/
│       │   │   ├── 📂 tasks/
│       │   │   ├── 📂 project-files/   # Gestión de archivos
│       │   │   ├── 📂 emails/          # Notificaciones
│       │   │   └── 📂 reports/
│       │   ├── 📂 prisma/
│       │   ├── PlanillaCostos.xlsm     # Plantilla
│       │   ├── Dockerfile
│       │   └── package.json
│       │
│       └── 📂 frontend/                 # UI de calendario
│           ├── 📂 app/
│           │   ├── 📂 proyectos/
│           │   ├── 📂 calendario/
│           │   └── 📂 kanban/
│           ├── Dockerfile
│           └── package.json
│
├── 📂 gateway/                           # Nginx Proxy
│   ├── nginx.conf
│   ├── Dockerfile
│   └── 📂 logs/
│
├── 📂 infrastructure/                    # Infraestructura compartida
│   └── 📂 mysql/
│       └── 📂 init/                     # Scripts de inicialización
│           ├── 01-create-databases.sql
│           ├── 02-create-users.sql
│           └── 03-grant-privileges.sql
│
├── 📂 secrets/                           # Credenciales seguras
│   ├── jwt_secret.txt
│   ├── jwt_refresh_secret.txt
│   └── smtp_password.txt
│
├── 📂 scripts/                           # Scripts de mantenimiento
│   ├── migrate-*.sql
│   └── rotate-jwt-secrets.ps1
│
├── 📂 shared/                            # Código compartido
│   ├── 📂 auth/
│   └── 📂 types/
│
├── 🐳 docker-compose.microservices.yml   # Orquestación principal
├── 📄 .env.example                       # Template de variables
├── 📄 .env                              # Variables de entorno (NO COMMITEAR)
├── 📜 inicio.ps1                        # Script de inicio rápido
├── 📜 deploy-production.ps1             # Despliegue a producción
└── 📖 README.md                         # Este archivo
```

---

## 🚀 Instalación Rápida

### Opción 1: Inicio Automático (Recomendado)

```powershell
# Clonar el repositorio
git clone https://github.com/tu-empresa/intranet-layerthree.git
cd intranet-layerthree

# Ejecutar script de inicio
.\inicio.ps1
```

El script `inicio.ps1` realiza automáticamente:
1. ✅ Verifica Docker y Docker Compose
2. ✅ Copia `.env.example` a `.env`
3. ✅ Genera secrets JWT aleatorios
4. ✅ Construye todas las imágenes Docker
5. ✅ Levanta los contenedores
6. ✅ Ejecuta migraciones de base de datos
7. ✅ Muestra el estado de los servicios

---

### Opción 2: Instalación Manual

#### Paso 1: Configurar Variables de Entorno

```powershell
# Copiar template
cp .env.example .env

# Editar con tus valores
notepad .env
```

#### Paso 2: Generar Secrets

```powershell
# Crear directorio de secrets
New-Item -ItemType Directory -Force -Path secrets

# Generar JWT Secret (64 bytes)
$jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Set-Content -Path "secrets/jwt_secret.txt" -Value $jwtSecret -NoNewline

# Generar JWT Refresh Secret
$jwtRefreshSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Set-Content -Path "secrets/jwt_refresh_secret.txt" -Value $jwtRefreshSecret -NoNewline

# Configurar SMTP Password
Set-Content -Path "secrets/smtp_password.txt" -Value "tu-password-smtp" -NoNewline
```

#### Paso 3: Construir Imágenes

```powershell
docker compose -f docker-compose.microservices.yml build
```

#### Paso 4: Levantar Servicios

```powershell
docker compose -f docker-compose.microservices.yml up -d
```

#### Paso 5: Verificar Estado

```powershell
docker compose -f docker-compose.microservices.yml ps
```

**Salida esperada:**
```
NAME                STATUS              PORTS
intranet_mysql      Up 2 minutes        0.0.0.0:3307->3306/tcp
intranet_redis      Up 2 minutes        0.0.0.0:6379->6379/tcp
api_gateway         Up 2 minutes        0.0.0.0:80->80/tcp
auth_backend        Up 2 minutes (healthy)
inventory_backend   Up 2 minutes (healthy)
inventory_frontend  Up 2 minutes (healthy)
calendar_backend    Up 2 minutes (healthy)
calendar_frontend   Up 2 minutes (healthy)
```

---

## ⚙️ Configuración del Entorno

### Archivo `.env` (Template)

```dotenv
# ====================================================================
# CONFIGURACIÓN DEL SISTEMA - TEMPLATE
# ====================================================================
# IMPORTANTE: 
# 1. Copiar este archivo a .env
# 2. Reemplazar todos los valores de ejemplo
# 3. NO commitear .env al repositorio
# ====================================================================

# --------------------------------------------------------------------
# BASE DE DATOS
# --------------------------------------------------------------------
MYSQL_ROOT_PASSWORD=CAMBIAR_PASSWORD_SEGURO
MYSQL_PORT=3307

# --------------------------------------------------------------------
# REDIS (Cache & Message Broker)
# --------------------------------------------------------------------
REDIS_PASSWORD=CAMBIAR_PASSWORD_SEGURO

# --------------------------------------------------------------------
# AUTENTICACIÓN JWT
# --------------------------------------------------------------------
# GENERAR CON: openssl rand -base64 64
JWT_SECRET=GENERAR_SECRET_ALEATORIO_64_CARACTERES
JWT_REFRESH_SECRET=GENERAR_OTRO_SECRET_ALEATORIO_64_CARACTERES
JWT_EXPIRATION=1h
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRATION=7d

# --------------------------------------------------------------------
# ENTORNO
# --------------------------------------------------------------------
NODE_ENV=production
LOG_LEVEL=info

# --------------------------------------------------------------------
# SERVICIO DE EMAIL (SMTP)
# --------------------------------------------------------------------
# Gmail: Generar contraseña de aplicación en https://myaccount.google.com/security
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop

# Configuración del remitente
EMAIL_FROM=Sistema Intranet <intranet@tu-empresa.com>

# --------------------------------------------------------------------
# URLs DE FRONTEND (para CORS)
# --------------------------------------------------------------------
NEXT_PUBLIC_API_URL=http://localhost/api/inventory
NEXT_PUBLIC_CALENDAR_API_URL=http://localhost/api/calendar
```

---

## 🌐 Red Interna Docker

Los contenedores se comunican entre sí usando una red bridge personalizada:

### Configuración de Red

```yaml
networks:
  intranet:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Comunicación entre Servicios

```javascript
// Frontend → Backend (desde el navegador)
fetch('http://localhost/api/inventory/products')

// Backend → Backend (comunicación interna Docker)
fetch('http://auth_backend:3002/auth/validate')
fetch('http://inventory_backend:3001/products')
fetch('http://calendar_backend:3003/projects')

// Backend → MySQL (red interna)
DATABASE_URL="mysql://root:password@mysql:3306/inventory_db"
//                                    ↑
//                            Nombre del contenedor

// Backend → Redis (red interna)
redis://redis:6379
```

### Tabla de Resolución DNS Interna

| Nombre de Host | IP Interna | Servicio |
|----------------|------------|----------|
| `mysql` | 172.20.0.10 | Base de datos MySQL |
| `redis` | 172.20.0.11 | Cache Redis |
| `api_gateway` | 172.20.0.20 | Nginx Proxy |
| `inventory_backend` | 172.20.0.21 | API Inventario |
| `inventory_frontend` | 172.20.0.22 | UI Inventario |
| `calendar_backend` | 172.20.0.51 | API Calendario |
| `calendar_frontend` | 172.20.0.52 | UI Calendario |
| `auth_backend` | 172.20.0.61 | API Autenticación |

---

## 🔌 Puertos y Servicios

### Tabla de Puertos

| Puerto | Servicio | Acceso | Descripción |
|--------|----------|--------|-------------|
| **80** | Nginx Gateway | Público | Punto de entrada principal |
| **3001** | Inventory Backend | Interno | API REST de inventario |
| **3002** | Auth Backend | Interno | API de autenticación |
| **3003** | Calendar Backend | Interno | API de calendario |
| **3010** | Inventory Frontend | Interno | UI Next.js (inventario) |
| **3020** | Calendar Frontend | Interno | UI Next.js (calendario) |
| **3306** | MySQL | Interno | Base de datos |
| **3307** | MySQL | Localhost | Puerto expuesto para debugging |
| **6379** | Redis | Localhost | Cache y message broker |

### Rutas del Gateway Nginx

```nginx
# Frontend Principal (Inventario)
http://localhost/ → inventory_frontend:3010

# Frontend Calendario
http://localhost/calendario → calendar_frontend:3020

# API Inventario
http://localhost/api/inventory → inventory_backend:3001

# API Calendario
http://localhost/api/calendar → calendar_backend:3003

# API Autenticación
http://localhost/api/auth → auth_backend:3002

# Health Checks
http://localhost/health → Todos los servicios
```

### Acceso desde Red Local

Si el servidor está en IP `192.168.1.100`:

```
http://192.168.1.100/                    → Frontend Inventario
http://192.168.1.100/calendario          → Frontend Calendario
http://192.168.1.100/api/inventory       → API Inventario
http://192.168.1.100/api/calendar        → API Calendario
```

---

## 📚 Documentación de API

Cada microservicio backend expone documentación Swagger automática:

### Swagger UI

```
# Inventario
http://localhost/api/inventory/docs

# Calendario
http://localhost/api/calendar/docs

# Autenticación
http://localhost/api/auth/docs
```

### Ejemplos de Endpoints

#### Autenticación

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@empresa.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "admin@empresa.com",
    "name": "Administrador",
    "role": "SUPER_ADMIN"
  }
}
```

#### Inventario

```http
# Listar productos
GET /api/inventory/products
Authorization: Bearer {access_token}

# Crear producto
POST /api/inventory/products
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "sku": "SKU-001",
  "name": "Equipo OLT",
  "category": "EQUIPOS",
  "subcategory": "OLT",
  "stock": 10,
  "minStock": 5,
  "unitPrice": 1000000
}

# Exportar inventario a Excel
GET /api/inventory/reports/inventory
Authorization: Bearer {access_token}
# Descarga archivo: inventario_2026-01-05.xlsx
```

---

## 🔒 Seguridad

### Gestión de Secrets

El sistema usa **Docker Secrets** para manejar credenciales sensibles:

```powershell
# Estructura de secrets
secrets/
├── jwt_secret.txt          # Secret para access tokens
├── jwt_refresh_secret.txt  # Secret para refresh tokens
└── smtp_password.txt       # Password de email
```

**Dentro de los contenedores, los secrets se montan en:**
```
/run/secrets/jwt_secret
/run/secrets/jwt_refresh_secret
/run/secrets/smtp_password
```

### Autenticación JWT

**Flow de autenticación:**

1. Usuario hace login → Recibe `access_token` (1h) y `refresh_token` (7d)
2. Requests posteriores usan `Authorization: Bearer {access_token}`
3. Cuando expira, se renueva con el `refresh_token`
4. Si el refresh expira, se requiere nuevo login

### Control de Acceso por Roles

```typescript
// Roles disponibles
enum UserRole {
  SUPER_ADMIN  // Acceso total a todos los módulos
  GERENTE      // Puede crear, editar, eliminar
  JEFE         // Puede crear y editar
  TECNICO      // Solo lectura
}

// Módulos controlables
allowedModules: "inventory,calendar,reports"
```

---

## 💾 Backup y Mantenimiento

### Backup de Base de Datos

```powershell
# Backup completo de MySQL
docker exec intranet_mysql mysqldump -u root -p'rootpassword' --all-databases > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Backup de base de datos específica
docker exec intranet_mysql mysqldump -u root -p'rootpassword' inventory_db > backup_inventory_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

### Restauración de Backup

```powershell
# Restaurar MySQL desde backup
Get-Content backup_20260105_120000.sql | docker exec -i intranet_mysql mysql -u root -p'rootpassword'
```

### Limpieza de Sistema

```powershell
# Ver espacio usado
docker system df

# Limpiar contenedores detenidos
docker container prune -f

# Limpiar imágenes no utilizadas
docker image prune -a -f
```

---

## 🐳 Gestión de Contenedores

### Comandos Útiles

```powershell
# Ver estado de todos los servicios
docker compose -f docker-compose.microservices.yml ps

# Iniciar todos los servicios
docker compose -f docker-compose.microservices.yml up -d

# Detener todos los servicios
docker compose -f docker-compose.microservices.yml down

# Reiniciar un servicio específico
docker compose -f docker-compose.microservices.yml restart inventory_backend

# Reconstruir una imagen
docker compose -f docker-compose.microservices.yml build inventory_backend

# Ver logs de todos los servicios
docker compose -f docker-compose.microservices.yml logs -f

# Ejecutar comando en contenedor
docker exec -it inventory_backend sh

# Ver estadísticas de recursos
docker stats
```

---

## 🚢 Despliegue en Producción

### Paso 1: Preparar Servidor

```powershell
# Verificar instalación
docker --version
docker compose version
```

### Paso 2: Clonar Repositorio

```powershell
cd D:\
git clone https://github.com/tu-empresa/intranet-layerthree.git
cd intranet-layerthree
```

### Paso 3: Configurar Variables de Producción

```powershell
# Copiar template
cp .env.example .env

# Editar con valores de producción
notepad .env
```

### Paso 4: Desplegar

```powershell
# Usar script automatizado
.\deploy-production.ps1

# O manual:
docker compose -f docker-compose.microservices.yml build
docker compose -f docker-compose.microservices.yml up -d
```

---

## 🔧 Troubleshooting

### Contenedor no inicia (unhealthy)

```powershell
# Ver logs del contenedor
docker logs inventory_backend

# Verificar healthcheck
docker inspect --format='{{.State.Health}}' inventory_backend

# Solución: Reconstruir contenedor
docker compose -f docker-compose.microservices.yml up -d --build inventory_backend
```

### Error de conexión a MySQL

```powershell
# Verificar que MySQL está corriendo
docker ps | grep mysql

# Ver logs de MySQL
docker logs intranet_mysql

# Solución: Reiniciar MySQL
docker compose -f docker-compose.microservices.yml restart mysql
```

---

## 🗺️ Roadmap

### ✅ Completado (v1.0)
- [x] Arquitectura de microservicios
- [x] Sistema de autenticación JWT
- [x] Módulo de inventario completo
- [x] Módulo de calendario/proyectos
- [x] Sistema de archivos para proyectos
- [x] Exportación a Excel
- [x] Containerización con Docker

### 🚧 En Desarrollo (v1.1)
- [ ] Panel de administración global
- [ ] Sistema de notificaciones en tiempo real
- [ ] Dashboard analítico con métricas

### 📋 Planificado (v2.0)
- [ ] Módulo de RRHH
- [ ] Módulo de finanzas
- [ ] Sistema de tickets/helpdesk
- [ ] App móvil

---

## 📞 Soporte y Contacto

### Documentación Adicional

- 📖 [Guía de Desarrollo](./DESARROLLO.md)
- 🚀 [Guía de Deployment](./GUIA_DEPLOYMENT.md)
- 📊 [Documentación de API](./API.md)
- 🔒 [Guía de Seguridad](./SEGURIDAD.md)

---

## 📄 Licencia

© 2026 Layerthree. Todos los derechos reservados.

---

<div align="center">

**Hecho con ❤️ por el equipo de Layerthree**

[⬆ Volver arriba](#-sistema-de-intranet-empresarial---layerthree)

</div>
