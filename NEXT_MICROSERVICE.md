# 🚀 GUÍA RÁPIDA - INICIO DEL SIGUIENTE MICROSERVICIO

Has completado exitosamente la **transformación a arquitectura de microservicios**. El sistema está listo para escalar. 🎉

---

## ✅ Estado Actual

### Microservicio Operativo:
- **Inventario (Bodega)** - ✅ Funcionando

### Infraestructura Lista:
- ✅ API Gateway (Nginx) configurado
- ✅ MySQL con bases de datos separadas
- ✅ Red Docker para comunicación entre servicios
- ✅ Librerías compartidas (auth + types)
- ✅ Scripts de inicio/detención
- ✅ Documentación completa

---

## 🎯 Próximo Microservicio Sugerido: **PAGOS**

### ¿Por qué Pagos?
- Dominio bien definido y separado
- No depende del inventario (bajo acoplamiento)
- Valor inmediato para la empresa

### Funcionalidades Propuestas:
- 📝 Gestión de facturas (ingresos/egresos)
- 👥 Registro de proveedores
- 💰 Control de gastos operativos
- 📊 Reportes financieros
- 🔔 Alertas de vencimientos

---

## 📋 Pasos para Crear Servicio de PAGOS

### 1. Crear Estructura de Carpetas

```powershell
cd "d:\Páginas Web\Bodega"

# Crear carpetas
mkdir services\payments\backend
mkdir services\payments\frontend
```

### 2. Inicializar Backend (NestJS)

```powershell
cd services\payments\backend

# Instalar NestJS CLI si no está instalado
npm install -g @nestjs/cli

# Crear proyecto
nest new . --skip-git --package-manager npm

# Instalar dependencias
npm install @prisma/client prisma
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
npm install bcrypt class-validator class-transformer
npm install -D @types/passport-jwt @types/bcrypt

# Inicializar Prisma
npx prisma init
```

### 3. Configurar Prisma Schema

Editar `services/payments/backend/prisma/schema.prisma`:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

enum PaymentType {
  INCOME    // Ingreso
  EXPENSE   // Egreso
}

enum PaymentStatus {
  PENDING   // Pendiente
  PAID      // Pagado
  OVERDUE   // Vencido
  CANCELLED // Cancelado
}

model Supplier {
  id        String   @id @default(uuid())
  name      String
  rut       String   @unique
  email     String?
  phone     String?
  address   String?  @db.Text
  notes     String?  @db.Text
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  payments  Payment[]

  @@map("suppliers")
}

model Payment {
  id          String        @id @default(uuid())
  invoiceNo   String        @unique
  type        PaymentType
  status      PaymentStatus @default(PENDING)
  amount      Float
  description String        @db.Text
  dueDate     DateTime?
  paidDate    DateTime?
  
  supplierId  String?
  supplier    Supplier?     @relation(fields: [supplierId], references: [id])
  
  projectId   String?
  category    String?
  notes       String?       @db.Text
  
  userId      String        // Quien registró el pago
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([invoiceNo])
  @@index([type])
  @@index([status])
  @@index([dueDate])
  @@map("payments")
}
```

### 4. Crear Variables de Entorno

`services/payments/backend/.env`:

```env
DATABASE_URL="mysql://root:rootpassword_layerthree_2025@localhost:3307/payments_db"
JWT_SECRET="tu_secreto_jwt_muy_seguro_cambialo_en_produccion_layerthree"
JWT_EXPIRES_IN="7d"
PORT=3002
NODE_ENV=development
```

### 5. Generar Estructura NestJS

```powershell
# Desde services/payments/backend

# Módulo Prisma
nest g module prisma
nest g service prisma

# Módulo de Proveedores
nest g module suppliers
nest g controller suppliers
nest g service suppliers

# Módulo de Pagos
nest g module payments
nest g controller payments
nest g service payments

# Módulo de Reportes
nest g module reports
nest g controller reports
nest g service reports
```

### 6. Crear Dockerfile

`services/payments/backend/Dockerfile`:

```dockerfile
FROM node:20-slim AS base

FROM base AS deps
RUN apt-get update && apt-get install -y openssl ca-certificates
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

USER nestjs
EXPOSE 3002

CMD ["npm", "run", "start:prod"]
```

### 7. Inicializar Frontend (Next.js)

```powershell
cd ..\frontend

# Crear proyecto Next.js
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Instalar dependencias
npm install axios js-cookie date-fns
npm install -D @types/js-cookie
```

### 8. Crear Dockerfile Frontend

`services/payments/frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

### 9. Actualizar docker-compose.microservices.yml

Descomentar las secciones de `payments-backend` y `payments-frontend` que ya están preparadas.

### 10. Actualizar Gateway

Descomentar en `gateway/nginx.conf`:

```nginx
# location /api/payments/ {
#     rewrite ^/api/payments/(.*) /$1 break;
#     proxy_pass http://payments-backend:3002;
#     ...
# }
```

Y agregar el upstream:

```nginx
upstream payments_backend {
    server payments-backend:3002;
}
```

### 11. Construir y Ejecutar

```powershell
# Volver a la raíz del proyecto
cd "d:\Páginas Web\Bodega"

# Reconstruir todo
docker-compose -f docker-compose.microservices.yml down
docker-compose -f docker-compose.microservices.yml build
docker-compose -f docker-compose.microservices.yml up -d

# Ver logs
docker-compose -f docker-compose.microservices.yml logs -f payments-backend
```

---

## 📚 Recursos de Ayuda

- **Documentación completa:** [MICROSERVICES_ARCHITECTURE.md](./MICROSERVICES_ARCHITECTURE.md)
- **Ejemplo funcionando:** `services/inventory/` (referencia para copiar estructura)
- **Shared libraries:** `shared/types/` y `shared/auth/`

---

## 💡 Tips para Desarrollo Rápido

### Copiar y Adaptar del Inventario

```powershell
# Copiar estructura del backend
robocopy "services\inventory\backend\src\prisma" "services\payments\backend\src\prisma" /E
robocopy "services\inventory\backend\src\auth" "services\payments\backend\src\auth" /E

# Copiar componentes del frontend
robocopy "services\inventory\frontend\src\lib" "services\payments\frontend\src\lib" /E
robocopy "services\inventory\frontend\src\components" "services\payments\frontend\src\components" /E
```

**Luego ajusta:**
- Nombres de modelos en Prisma
- Endpoints en controladores
- Rutas en frontend

---

## 🎯 Objetivo Final

```
Sistema Intranet Completo:
├── ✅ Inventario (Bodega)
├── 🔜 Pagos
├── 🔜 Recursos Humanos
├── 🔜 Proyectos
└── 🔜 CRM Clientes
```

---

## 🆘 ¿Necesitas Ayuda?

1. Revisa la documentación en `MICROSERVICES_ARCHITECTURE.md`
2. Consulta el código del microservicio de Inventario como ejemplo
3. Verifica los logs de Docker para errores

---

**¡Estás listo para crear el siguiente microservicio!** 🚀

¿Comenzamos con Pagos? Solo dime y te guío paso a paso.
