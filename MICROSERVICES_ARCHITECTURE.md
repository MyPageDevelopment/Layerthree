# 🏗️ ARQUITECTURA DE MICROSERVICIOS - SISTEMA INTRANET LAYERTHREE

## 📋 Índice
1. [Visión General](#visión-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Microservicios Actuales](#microservicios-actuales)
4. [Infraestructura](#infraestructura)
5. [Cómo Usar](#cómo-usar)
6. [Agregar Nuevos Microservicios](#agregar-nuevos-microservicios)
7. [Comunicación entre Servicios](#comunicación-entre-servicios)
8. [Desarrollo Local](#desarrollo-local)

---

## 🎯 Visión General

Este sistema está diseñado con una **arquitectura de microservicios** para permitir:

- ✅ **Escalabilidad independiente** de cada módulo
- ✅ **Despliegue ágil** - modificar un servicio sin afectar otros
- ✅ **Desarrollo en paralelo** - equipos trabajando en diferentes servicios
- ✅ **Tecnologías flexibles** - cada servicio puede usar su stack ideal
- ✅ **Mantenibilidad** - código modular y desacoplado
- ✅ **Resiliencia** - si un servicio falla, los demás siguen funcionando

### Principios de Diseño

1. **Un microservicio = Un dominio de negocio**
2. **Base de datos por servicio** (cada uno tiene su propia BD)
3. **Comunicación vía API REST** (HTTP)
4. **Autenticación centralizada** (JWT compartido)
5. **API Gateway único** (punto de entrada)

---

## 📁 Estructura del Proyecto

```
Bodega/
├── services/                    # 🎯 MICROSERVICIOS
│   ├── inventory/              # Servicio de Inventario (Bodega)
│   │   ├── backend/           # NestJS + Prisma + MySQL
│   │   └── frontend/          # Next.js + TypeScript
│   │
│   ├── payments/              # 🔜 Servicio de Pagos (futuro)
│   │   ├── backend/
│   │   └── frontend/
│   │
│   ├── hr/                    # 🔜 Recursos Humanos (futuro)
│   │   ├── backend/
│   │   └── frontend/
│   │
│   └── projects/              # 🔜 Gestión de Proyectos (futuro)
│       ├── backend/
│       └── frontend/
│
├── gateway/                    # 🚪 API GATEWAY
│   ├── nginx.conf             # Configuración de enrutamiento
│   ├── Dockerfile
│   └── logs/                  # Logs del gateway
│
├── shared/                     # 📚 CÓDIGO COMPARTIDO
│   ├── types/                 # Tipos TypeScript compartidos
│   │   ├── index.ts          # User, Product, ApiResponse, etc.
│   │   └── package.json
│   │
│   └── auth/                  # Middleware de autenticación
│       ├── index.ts          # AuthService, jwtMiddleware, etc.
│       └── package.json
│
├── infrastructure/             # 🏗️ INFRAESTRUCTURA
│   └── mysql/
│       └── init/             # Scripts de inicialización de BD
│           └── 01-create-databases.sql
│
├── docker-compose.microservices.yml  # Orquestación de servicios
├── .env.microservices              # Variables de entorno
├── start-microservices.ps1         # Script de inicio
└── stop-microservices.ps1          # Script de detención
```

---

## 🎯 Microservicios Actuales

### 1. **Inventory (Bodega)** - ✅ OPERATIVO

**Dominio:** Gestión de inventario de equipos y materiales

**Stack:**
- Backend: NestJS 10 + TypeScript
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Base de Datos: MySQL 8.0 (`inventory_db`)
- ORM: Prisma 5.22

**Endpoints:**
- Frontend: `http://localhost/`
- API: `http://localhost/api/inventory/`

**Funcionalidades:**
- ✅ Control de productos con SKU
- ✅ Categorías y subcategorías
- ✅ Movimientos de entrada/salida
- ✅ Tracking por ID de proyecto
- ✅ Alertas de stock mínimo
- ✅ Reportes exportables (CSV/Excel)
- ✅ Dashboard con estadísticas
- ✅ Autenticación con roles (Admin/Viewer)

**Acceso:**
```
Admin:  admin@bodega.com / Admin123!
Viewer: viewer@bodega.com / Viewer123!
```

---

## 🏗️ Infraestructura

### API Gateway (Nginx)

**Función:** Punto de entrada único para todos los microservicios

**Puerto:** `80` (HTTP) / `443` (HTTPS - futuro)

**Enrutamiento:**
```nginx
/                      → inventory-frontend (Next.js)
/api/inventory/*       → inventory-backend (NestJS)
/api/payments/*        → payments-backend (futuro)
/api/hr/*              → hr-backend (futuro)
/health                → Health check del gateway
```

**Características:**
- ✅ Balanceo de carga (futuro)
- ✅ CORS centralizado
- ✅ Timeouts configurables
- ✅ Logs de acceso
- ✅ Health checks

### Base de Datos MySQL

**Estrategia:** Una base de datos por microservicio

**Bases de datos:**
```sql
inventory_db  -- Inventario (bodega)
payments_db   -- Pagos (futuro)
hr_db         -- Recursos Humanos (futuro)
projects_db   -- Proyectos (futuro)
shared_db     -- Datos compartidos (futuro)
```

**Puerto:** `3307` (acceso desde host)

**Conexión interna:** `mysql:3306` (dentro de Docker)

### Red Docker

**Nombre:** `intranet`

**Subred:** `172.20.0.0/16`

**IPs asignadas:**
```
172.20.0.2   → gateway
172.20.0.10  → mysql
172.20.0.21  → inventory-backend
172.20.0.22  → inventory-frontend
172.20.0.31  → payments-backend (futuro)
172.20.0.41  → hr-backend (futuro)
```

---

## 🚀 Cómo Usar

### Inicio Rápido

```powershell
# 1. Iniciar todo el sistema
.\start-microservices.ps1

# 2. Acceder al sistema
# Abrir navegador en: http://localhost
```

### Comandos Útiles

```powershell
# Ver logs de todos los servicios
docker-compose -f docker-compose.microservices.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.microservices.yml logs -f inventory-backend

# Reiniciar un servicio
docker-compose -f docker-compose.microservices.yml restart inventory-backend

# Detener todo
.\stop-microservices.ps1

# Ver estado de servicios
docker-compose -f docker-compose.microservices.yml ps

# Reconstruir un servicio
docker-compose -f docker-compose.microservices.yml build inventory-backend
docker-compose -f docker-compose.microservices.yml up -d inventory-backend
```

### Acceso a Bases de Datos

```powershell
# Conectar a MySQL desde el host
mysql -h localhost -P 3307 -u root -p
# Password: rootpassword_layerthree_2025

# Conectar desde otro contenedor
mysql -h mysql -P 3306 -u root -p
```

---

## ➕ Agregar Nuevos Microservicios

### Paso 1: Crear Estructura de Carpetas

```powershell
# Ejemplo: Crear servicio de Pagos
mkdir services/payments/backend
mkdir services/payments/frontend
```

### Paso 2: Desarrollar el Servicio

**Backend (ejemplo con NestJS):**

```powershell
cd services/payments/backend
npx @nestjs/cli new .
npm install @prisma/client prisma
npx prisma init
```

Configurar `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

**Frontend (ejemplo con Next.js):**

```powershell
cd services/payments/frontend
npx create-next-app@latest . --typescript --tailwind --app
```

### Paso 3: Crear Dockerfiles

**Backend Dockerfile:**
```dockerfile
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3002
CMD ["npm", "run", "start:prod"]
```

### Paso 4: Actualizar docker-compose.microservices.yml

```yaml
payments-backend:
  build:
    context: ./services/payments/backend
    dockerfile: Dockerfile
  container_name: payments_backend
  restart: unless-stopped
  environment:
    DATABASE_URL: "mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/payments_db"
    JWT_SECRET: ${JWT_SECRET}
    PORT: 3002
    NODE_ENV: production
  depends_on:
    mysql:
      condition: service_healthy
  networks:
    intranet:
      ipv4_address: 172.20.0.31

payments-frontend:
  build:
    context: ./services/payments/frontend
    dockerfile: Dockerfile
  container_name: payments_frontend
  environment:
    NEXT_PUBLIC_API_URL: http://localhost/api/payments
  depends_on:
    - payments-backend
  networks:
    intranet:
      ipv4_address: 172.20.0.32
```

### Paso 5: Actualizar Gateway (nginx.conf)

```nginx
# Agregar en http.server:
location /api/payments/ {
    rewrite ^/api/payments/(.*) /$1 break;
    proxy_pass http://payments-backend:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # ... resto de headers
}

# Agregar upstream:
upstream payments_backend {
    server payments-backend:3002;
}
```

### Paso 6: Actualizar Base de Datos

Editar `infrastructure/mysql/init/01-create-databases.sql`:

```sql
CREATE DATABASE IF NOT EXISTS payments_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Paso 7: Construir e Iniciar

```powershell
# Reconstruir y reiniciar todo
docker-compose -f docker-compose.microservices.yml down
docker-compose -f docker-compose.microservices.yml build
docker-compose -f docker-compose.microservices.yml up -d
```

---

## 🔗 Comunicación entre Servicios

### Autenticación Compartida

Todos los microservicios usan el mismo **JWT_SECRET** para validar tokens.

**Librería compartida:** `shared/auth/index.ts`

```typescript
import { authService } from '@intranet/shared-auth'

// Generar token (solo en servicio de autenticación)
const token = authService.generateToken(user)

// Validar token (en cualquier servicio)
const payload = authService.verifyToken(token)
```

### Tipos Compartidos

**Librería compartida:** `shared/types/index.ts`

```typescript
import { User, Product, ApiResponse } from '@intranet/shared-types'

const response: ApiResponse<Product[]> = {
  success: true,
  data: products,
  timestamp: new Date().toISOString()
}
```

### Llamadas entre Servicios (HTTP)

```typescript
// Desde servicio de Pagos → llamar a Inventario
const response = await fetch('http://inventory-backend:3001/products/sku/ABC123')
const product = await response.json()
```

**⚠️ Importante:** Usar nombres de contenedores Docker, no `localhost`

---

## 💻 Desarrollo Local

### Opción 1: Todo con Docker (Recomendado para pruebas)

```powershell
.\start-microservices.ps1
```

### Opción 2: Desarrollo Híbrido (Más rápido para desarrollo)

```powershell
# 1. Solo MySQL con Docker
docker-compose -f docker-compose.microservices.yml up -d mysql

# 2. Backend local
cd services/inventory/backend
npm install
npm run start:dev

# 3. Frontend local (en otra terminal)
cd services/inventory/frontend
npm install
npm run dev
```

**Variables de entorno para desarrollo local:**

Backend (`.env`):
```env
DATABASE_URL="mysql://root:rootpassword_layerthree_2025@localhost:3307/inventory_db"
JWT_SECRET="tu_secreto_jwt_muy_seguro_cambialo_en_produccion_layerthree"
PORT=3001
```

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📊 Monitoreo y Salud

### Health Checks

Cada servicio debe implementar un endpoint `/health`:

```typescript
// NestJS
@Get('health')
health() {
  return { status: 'ok', service: 'inventory', timestamp: new Date() }
}
```

### Logs Centralizados

```powershell
# Ver todos los logs
docker-compose -f docker-compose.microservices.yml logs -f

# Filtrar por servicio
docker-compose -f docker-compose.microservices.yml logs -f gateway

# Últimas 100 líneas
docker-compose -f docker-compose.microservices.yml logs --tail=100 inventory-backend
```

---

## 🔐 Seguridad

### Variables de Entorno Sensibles

**NUNCA** commits al repositorio:
- ✅ `.env.microservices` (agregado a `.gitignore`)
- ✅ `.env` en cada servicio

**Cambiar en producción:**
```env
MYSQL_ROOT_PASSWORD=<contraseña-fuerte>
JWT_SECRET=<secreto-aleatorio-largo>
```

### JWT

- Token expira en 7 días por defecto
- Almacenado en cookies HTTP-only en frontend
- Validado en cada request al backend

---

## 🚧 Roadmap de Microservicios

### ✅ Completados
- [x] Inventario (Bodega)

### 🔜 Próximos
- [ ] **Pagos** - Gestión de facturas, proveedores, gastos
- [ ] **RRHH** - Control de empleados, asistencia, vacaciones
- [ ] **Proyectos** - Gestión de proyectos, tareas, timeline
- [ ] **Clientes** - CRM, contratos, seguimiento

---

## 📚 Recursos Adicionales

- [Docker Documentation](https://docs.docker.com/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [Next.js Documentation](https://nextjs.org/docs)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Prisma ORM](https://www.prisma.io/docs)

---

## 🆘 Troubleshooting

### Puerto 80 ya en uso

```powershell
# Windows: Ver qué usa el puerto
netstat -ano | findstr :80

# Cambiar puerto del gateway en docker-compose.microservices.yml
ports:
  - "8080:80"  # Usar 8080 en lugar de 80
```

### No se conecta a MySQL

```powershell
# Verificar que MySQL esté corriendo
docker-compose -f docker-compose.microservices.yml ps mysql

# Ver logs de MySQL
docker-compose -f docker-compose.microservices.yml logs mysql

# Reiniciar MySQL
docker-compose -f docker-compose.microservices.yml restart mysql
```

### Servicio no inicia

```powershell
# Ver logs detallados
docker-compose -f docker-compose.microservices.yml logs <nombre-servicio>

# Reconstruir imagen
docker-compose -f docker-compose.microservices.yml build --no-cache <nombre-servicio>
docker-compose -f docker-compose.microservices.yml up -d <nombre-servicio>
```

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar los logs del servicio
2. Verificar configuración de red Docker
3. Comprobar variables de entorno
4. Consultar esta documentación

---

**🎉 ¡Sistema listo para escalar y crecer!** 🚀
