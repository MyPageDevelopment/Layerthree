# 🔍 AUDITORÍA TÉCNICA DE SOFTWARE - SISTEMA ERP INTRANET

**Auditor:** GitHub Copilot (Claude Sonnet 4.5)  
**Fecha:** 30 de Diciembre de 2025  
**Sistema:** ERP Bodega y Calendario - Arquitectura de Microservicios  
**Stack:** NestJS + Next.js + MySQL + Docker

---

## 📋 RESUMEN EJECUTIVO

### Evaluación General del Sistema
El sistema demuestra una **arquitectura sólida** con implementaciones avanzadas de microservicios, Docker multi-stage, validación robusta de DTOs y manejo global de excepciones. Sin embargo, presenta **áreas críticas** que requieren atención inmediata para evitar problemas de escalabilidad, seguridad y rendimiento.

### Puntuación por Área
- **Arquitectura de Microservicios:** 6.5/10 ⚠️
- **Base de Datos (MySQL + Prisma):** 8/10 ✅
- **Docker y Orquestación:** 7.5/10 ✅
- **Código NestJS:** 8.5/10 ✅
- **Seguridad y Performance:** 6/10 ⚠️

---

## 🏗️ 1. ARQUITECTURA DE MICROSERVICIOS

### ❌ **CRÍTICO 1: Monolito Distribuido - Duplicación de Lógica de Autenticación**

#### **Problema Detectado:**
Cada microservicio (`auth`, `inventory`, `calendar`) tiene su **propio módulo de autenticación**, validación de JWT y guards, violando el principio DRY (Don't Repeat Yourself).

#### **Código Actual (Cómo está):**
```typescript
// services/inventory/backend/src/auth/auth.service.ts
// services/calendar/backend/src/auth/auth.service.ts
// services/auth/backend/src/auth/auth.service.ts
// ⚠️ Cada servicio duplica esta lógica:

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // ... validación duplicada en 3 servicios
  }
}
```

#### **Solución Recomendada (Cómo debería estar):**
```typescript
// 1. Centralizar autenticación en el servicio auth-backend
// 2. Otros servicios solo VALIDAN tokens, no gestionan usuarios

// services/inventory/backend/src/auth/jwt-validation.service.ts
@Injectable()
export class JwtValidationService {
  constructor(private jwtService: JwtService) {}

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  // NO duplicar login, registro, gestión de usuarios
}

// 3. Para datos de usuario, hacer llamada HTTP al microservicio auth
async getUserInfo(userId: string): Promise<User> {
  const response = await this.httpService.get(
    `http://auth-backend:3002/users/${userId}`
  ).toPromise();
  return response.data;
}
```

#### **Impacto:**
- **Actual:** Cada cambio en lógica de autenticación requiere modificar 3 servicios.
- **Futuro:** Mantenibilidad imposible al crecer a 10+ microservicios.

---

### ⚠️ **MEJORA 1: Comunicación Síncrona Excesiva (HTTP)**

#### **Problema Detectado:**
No existe un **Message Broker** (RabbitMQ, Redis Pub/Sub, Kafka). Si el servicio `calendar` necesita notificar a `inventory` sobre un proyecto nuevo, debe hacer una llamada HTTP síncrona, creando acoplamiento.

#### **Evidencia:**
```yaml
# docker-compose.microservices.yml
# ❌ NO HAY Redis, RabbitMQ o Kafka definidos
services:
  mysql: ...
  auth-backend: ...
  inventory-backend: ...
  calendar-backend: ...
  # ⚠️ Falta un message broker
```

#### **Solución Recomendada:**
```yaml
# docker-compose.microservices.yml
services:
  # ... servicios existentes ...

  redis:
    image: redis:7-alpine
    container_name: intranet_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      intranet:
        ipv4_address: 172.20.0.11
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
    driver: local
```

```typescript
// services/calendar/backend/src/events/project-created.event.ts
import { EventPattern } from '@nestjs/microservices';

@Injectable()
export class ProjectEventsService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClient,
  ) {}

  // Publicar evento cuando se crea un proyecto
  async publishProjectCreated(project: Project) {
    await this.redisClient.publish(
      'project.created',
      JSON.stringify(project)
    );
  }
}

// services/inventory/backend/src/events/project-listener.ts
@Injectable()
export class ProjectListener {
  @EventPattern('project.created')
  async handleProjectCreated(data: string) {
    const project = JSON.parse(data);
    // Sincronizar datos de proyecto en inventory si es necesario
    console.log(`Nuevo proyecto recibido: ${project.code}`);
  }
}
```

#### **Beneficios:**
- **Desacoplamiento:** Los servicios no necesitan conocerse entre sí.
- **Resiliencia:** Si `inventory` está caído, el evento se procesa cuando vuelva.
- **Performance:** No hay bloqueo esperando respuestas HTTP.

---

### 💡 **SUGERENCIA 1: Shared Kernel Mal Utilizado**

#### **Problema:**
Existe una carpeta `shared/` pero no se está usando efectivamente.

```
shared/
  auth/
    index.ts  # ⚠️ Vacío o con código duplicado
  types/
    index.ts  # ⚠️ Tipos repetidos en cada servicio
```

#### **Solución:**
```typescript
// shared/auth/jwt.guard.ts (compartido entre TODOS los servicios)
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SharedJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) return false;

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// package.json en shared/auth
{
  "name": "@intranet/auth-shared",
  "version": "1.0.0",
  "main": "index.ts",
  "dependencies": {
    "@nestjs/jwt": "^10.0.0"
  }
}
```

**Uso en servicios:**
```typescript
// services/inventory/backend/src/products/products.controller.ts
import { SharedJwtAuthGuard } from '@intranet/auth-shared';

@Controller('products')
@UseGuards(SharedJwtAuthGuard)  // ✅ Importado desde shared
export class ProductsController {
  // ...
}
```

---

## 🗄️ 2. EFICIENCIA EN BASE DE DATOS (MySQL + Prisma)

### ✅ **FORTALEZAS DETECTADAS**

1. **Índices Bien Implementados:**
```prisma
// services/inventory/backend/prisma/schema.prisma
model Product {
  // ...
  @@index([sku])        // ✅ Búsquedas por SKU
  @@index([category])   // ✅ Filtros por categoría
}

model Movement {
  // ...
  @@index([productId])  // ✅ Relaciones FK indexadas
  @@index([projectId])  // ✅ Filtros por proyecto
  @@index([createdAt])  // ✅ Ordenamiento temporal
}
```

2. **Índices Compuestos para Queries Complejas:**
```prisma
// services/calendar/backend/prisma/schema.prisma
model Project {
  @@index([status, startDate])  // ✅ Para: WHERE status = 'ACTIVE' ORDER BY startDate
  @@index([ownerId, status])    // ✅ Para: WHERE ownerId = X AND status = Y
}

model Task {
  @@index([projectId, status])  // ✅ Tareas por proyecto y estado
  @@index([status, priority])   // ✅ Dashboard ordenado por prioridad
  @@index([projectId, dueDate]) // ✅ Tareas próximas a vencer
}
```

---

### ❌ **CRÍTICO 2: Problema N+1 Queries (Potencial)**

#### **Código Actual:**
```typescript
// services/inventory/backend/src/products/products.service.ts
async findOne(id: string) {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: {
      movements: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // ⚠️ Si luego recorres movements y haces queries adicionales:
  // for (const movement of product.movements) {
  //   const user = await this.prisma.user.findUnique({ where: { id: movement.userId } });
  //   // ❌ N+1 Query: 1 query inicial + 10 queries de usuarios
  // }

  return product;
}
```

#### **Solución:**
```typescript
async findOne(id: string) {
  const product = await this.prisma.product.findUnique({
    where: { id },
    include: {
      movements: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {  // ✅ Eager loading de usuarios
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return product;
}
```

---

### ⚠️ **MEJORA 2: Falta Índice para getLowStock**

#### **Problema:**
```typescript
// services/inventory/backend/src/products/products.service.ts
async getLowStock() {
  return this.prisma.product.findMany({
    where: {
      stock: {
        lte: this.prisma.product.fields.minStock,  // ❌ Comparación dinámica
      },
    },
  });
}
```

**Error:** Prisma no puede crear un índice dinámico para `stock <= minStock`. Debe hacerse con SQL crudo o computed field.

#### **Solución 1 (SQL Crudo):**
```typescript
async getLowStock() {
  return this.prisma.$queryRaw<Product[]>`
    SELECT * FROM products 
    WHERE stock <= minStock
    ORDER BY (minStock - stock) DESC
  `;
}
```

#### **Solución 2 (Índice Manual en MySQL):**
```sql
-- infrastructure/mysql/init/02-indexes.sql
ALTER TABLE products 
ADD INDEX idx_low_stock ((stock <= minStock));
```

---

### 💡 **SUGERENCIA 2: Migraciones Manuales vs Prisma Migrate**

#### **Problema Actual:**
```yaml
# docker-compose.microservices.yml
command: >
  sh -c "npx prisma db push --accept-data-loss &&  # ⚠️ NO RECOMENDADO EN PRODUCCIÓN
         npm run start:prod"
```

**Riesgos:**
- `prisma db push` **puede perder datos** en producción.
- No hay historial de migraciones versionadas.

#### **Solución Recomendada:**
```yaml
command: >
  sh -c "npx prisma migrate deploy &&  # ✅ Ejecuta migraciones versionadas
         npm run start:prod"
```

**Workflow local:**
```bash
# Desarrollo
npx prisma migrate dev --name add_product_variants

# Producción
npx prisma migrate deploy
```

---

## 🐳 3. DOCKER Y ORQUESTACIÓN

### ✅ **FORTALEZAS DETECTADAS**

1. **Multi-Stage Builds Implementados:**
```dockerfile
# services/inventory/backend/Dockerfile
FROM node:20-alpine AS deps  # ✅ Etapa 1: Dependencias
# ...
FROM node:20-alpine AS builder  # ✅ Etapa 2: Build
# ...
FROM node:20-alpine AS runner  # ✅ Etapa 3: Imagen final ligera
```

2. **Usuario No-Root:**
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs  # ✅ No corre como root
```

3. **Secrets Manejados Correctamente:**
```yaml
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  smtp_password:
    file: ./secrets/smtp_password.txt

services:
  auth-backend:
    secrets:
      - jwt_secret
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret  # ✅ Lectura desde secret
```

---

### ❌ **CRÍTICO 3: MySQL Expuesto al Host**

#### **Problema:**
```yaml
services:
  mysql:
    ports:
      - "${MYSQL_PORT:-3307}:3306"  # ❌ EXPUESTO FUERA DEL CONTENEDOR
```

**Riesgo:**
- Cualquier aplicación en el servidor puede conectarse a MySQL sin restricciones.
- Ataque lateral si un contenedor es comprometido.

#### **Solución:**
```yaml
services:
  mysql:
    # ❌ ELIMINAR ESTA LÍNEA:
    # ports:
    #   - "3307:3306"
    
    # ✅ Solo exponer en red interna
    networks:
      intranet:
        ipv4_address: 172.20.0.10
    
    # ✅ Si necesitas acceso para debugging, usar puerto localhost only:
    ports:
      - "127.0.0.1:3307:3306"  # Solo accesible desde el host
```

---

### ⚠️ **MEJORA 3: Healthchecks Inconsistentes**

#### **Problema:**
```yaml
inventory-backend:
  healthcheck:
    test: ["CMD", "sh", "-c", "wget --quiet --tries=1 -O /dev/null http://localhost:3001/health || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 3
    # ❌ FALTA start_period

auth-backend:
  healthcheck:
    test: ["CMD", "sh", "-c", "wget --quiet --tries=1 -O /dev/null http://localhost:3002/health || exit 1"]
    start_period: 40s  # ✅ SÍ TIENE
```

#### **Solución:**
```yaml
# Estandarizar TODOS los healthchecks
healthcheck:
  test: ["CMD", "sh", "-c", "wget --quiet --tries=1 -O /dev/null http://localhost:${PORT}/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s  # ✅ Tiempo de gracia para inicialización
```

---

### 💡 **SUGERENCIA 3: Faltan Recursos Limits**

#### **Problema:**
```yaml
services:
  calendar-backend:
    # ❌ Sin límites de CPU/RAM
```

**Riesgo:** Un microservicio con memory leak puede consumir toda la RAM del servidor.

#### **Solución:**
```yaml
services:
  calendar-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'      # Máximo 50% de 1 CPU
          memory: 512M     # Máximo 512 MB RAM
        reservations:
          cpus: '0.25'     # Garantizado 25% de 1 CPU
          memory: 256M     # Garantizado 256 MB RAM
    
  inventory-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    
  mysql:
    deploy:
      resources:
        limits:
          cpus: '1.0'      # MySQL necesita más recursos
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

**Estimación para Servidor Local:**
- **2 cores CPU, 8GB RAM:**
  - MySQL: 1GB RAM
  - Nginx: 128MB RAM
  - Auth Backend: 512MB
  - Inventory Backend: 512MB
  - Calendar Backend: 512MB
  - Frontend (2x): 256MB cada uno
  - **Total:** ~3.2GB RAM (40% del servidor)

---

## 💻 4. CÓDIGO NESTJS Y NEXT.JS

### ✅ **FORTALEZAS DETECTADAS**

1. **DTOs con Validación Robusta:**
```typescript
// services/inventory/backend/src/products/dto/create-product.dto.ts
export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsEnum(ProductCategory)  // ✅ Validación de enum
  category: ProductCategory;

  @IsInt()
  @Min(0)  // ✅ Validación de rangos
  stock: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
```

2. **Manejo Global de Excepciones (Calendar):**
```typescript
// services/calendar/backend/src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // ✅ Manejo centralizado de errores
    const response = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: ...,
    };
    response.status(status).json(responseBody);
  }
}
```

3. **Transacciones Prisma Correctas:**
```typescript
// services/inventory/backend/src/movements/movements.service.ts
async create(createMovementDto: CreateMovementDto, userId: string) {
  const [movement] = await this.prisma.$transaction([
    this.prisma.movement.create({ ... }),
    this.prisma.product.update({
      data: {
        stock: {
          [type === 'ENTRY' ? 'increment' : 'decrement']: quantity,
        },
      },
    }),
  ]);
  // ✅ Atomicidad garantizada
}
```

4. **Optimización de Queries en Paralelo:**
```typescript
// services/calendar/backend/src/tasks/tasks.service.ts
async create(createTaskDto: CreateTaskDto) {
  // ✅ Crear asignaciones en paralelo
  const assignmentPromises = createTaskDto.participantIds.map((userId) =>
    this.prisma.taskAssignment.create({ ... })
  );
  await Promise.all(assignmentPromises);

  // ✅ Obtener usuarios en batch (1 query en vez de N)
  const users = await this.prisma.user.findMany({
    where: { id: { in: createTaskDto.participantIds } },
  });

  // ✅ Enviar emails en paralelo
  const emailPromises = users.map(user => 
    this.emailService.sendTaskAssignmentNotification({ ... })
  );
  await Promise.all(emailPromises);
}
```

---

### ❌ **CRÍTICO 4: Falta Manejo Global de Excepciones en Inventory**

#### **Problema:**
```typescript
// services/inventory/backend/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ❌ NO HAY AllExceptionsFilter global
  // Si ocurre un error no manejado, NestJS retorna un stack trace completo
  
  app.useGlobalPipes(new ValidationPipe({ ... }));
  await app.listen(3001);
}
```

**Comparación:**
- **Calendar:** ✅ Tiene `AllExceptionsFilter`
- **Inventory:** ❌ No tiene manejo global

#### **Solución:**
```typescript
// services/inventory/backend/src/common/filters/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno del servidor';

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
    });
  }
}

// services/inventory/backend/src/main.ts
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalFilters(new AllExceptionsFilter());  // ✅ Agregar
  app.useGlobalPipes(new ValidationPipe({ ... }));
  
  await app.listen(3001);
}
```

---

### ⚠️ **MEJORA 4: CORS Configurado 2 Veces**

#### **Problema:**
```typescript
// services/inventory/backend/src/main.ts
app.enableCors({
  origin: true, // ❌ Permitir TODOS los orígenes
  credentials: true,
});

// services/calendar/backend/src/main.ts
const app = await NestFactory.create(AppModule, {
  cors: {
    origin: '*', // ❌ También permite todos los orígenes
  },
});
```

**Y además:**
```nginx
# gateway/nginx.conf
add_header Access-Control-Allow-Origin $cors_origin always;  # ✅ Restrictivo
```

**Problema:** CORS está configurado en 2 lugares (backend + nginx), causando headers duplicados.

#### **Solución:**
```typescript
// ❌ ELIMINAR CORS en NestJS backends:
// services/inventory/backend/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ❌ ELIMINAR:
  // app.enableCors({ ... });
  
  app.useGlobalPipes(new ValidationPipe({ ... }));
  await app.listen(3001);
}
```

**✅ Solo manejar CORS en Nginx:**
```nginx
# gateway/nginx.conf
location /api/inventory/ {
  proxy_pass http://inventory-backend:3001/;
  
  # ✅ CORS solo aquí
  add_header Access-Control-Allow-Origin $cors_origin always;
  add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
  add_header Access-Control-Allow-Headers 'Authorization, Content-Type';
}
```

---

### 💡 **SUGERENCIA 4: Next.js No Aprovecha SSR**

#### **Problema:**
```tsx
// services/inventory/frontend/src/app/page.tsx
'use client'  // ❌ Todo es Client Side Rendering

export default function Home() {
  useEffect(() => {
    // ❌ Fetch en cliente, no aprovecha SSR
    const token = localStorage.getItem('access_token');
    // ...
  }, [])
}
```

**Contexto:** Estás en una **intranet empresarial**, no necesitas SEO, pero SSR sigue siendo útil para:
1. Validación de autenticación en servidor (más segura)
2. Pre-carga de datos (menor tiempo de carga percibido)

#### **Solución (Opcional, si quieres mejorar UX):**
```tsx
// services/inventory/frontend/src/app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    redirect('/login.html');
  }

  // ✅ Fetch en servidor (más rápido)
  const res = await fetch('http://inventory-backend:3001/products', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    cache: 'no-store',  // No cachear datos dinámicos
  });

  const products = await res.json();

  return (
    <div>
      <h1>Productos</h1>
      {/* ✅ Renderizado en servidor, HTML completo en primera carga */}
      {products.map(p => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
```

**Nota:** Para intranet, `'use client'` es aceptable si priorizas interactividad sobre performance inicial.

---

## 🔐 5. SEGURIDAD Y PERFORMANCE

### ❌ **CRÍTICO 5: JWT Secrets en .env sin Rotación**

#### **Problema:**
```env
# .env.example
JWT_SECRET=LT-bodega-secret-key-2025-super-secure  # ❌ Hardcodeado
JWT_EXPIRATION=7d  # ❌ 7 días es demasiado
```

**Riesgos:**
1. Si `.env` se commitea a Git, el secret está expuesto.
2. 7 días de expiración permite acceso prolongado si un token es robado.
3. No hay rotación de secrets programada.

#### **Solución:**
```bash
# 1. Generar secret aleatorio (no humano-legible)
openssl rand -base64 64 > ./secrets/jwt_secret.txt

# 2. Crear script de rotación
# scripts/rotate-jwt-secret.ps1
$newSecret = [Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
Set-Content -Path "./secrets/jwt_secret.txt" -Value $newSecret -NoNewline
Write-Host "✅ JWT Secret rotado. Reinicia los servicios."
```

```env
# .env
JWT_EXPIRATION=1h  # ✅ 1 hora para access token
JWT_REFRESH_EXPIRATION=7d  # ✅ 7 días para refresh token
```

**Implementación de Refresh Token:**
```typescript
// services/auth/backend/src/auth/auth.service.ts
async login(email: string, password: string) {
  const user = await this.validateUser(email, password);
  
  const payload = { sub: user.id, email: user.email };
  
  return {
    access_token: this.jwtService.sign(payload, { expiresIn: '1h' }),  // ✅ Corto
    refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),  // ✅ Largo
  };
}

async refreshAccessToken(refreshToken: string) {
  try {
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    
    return {
      access_token: this.jwtService.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: '1h' }
      ),
    };
  } catch {
    throw new UnauthorizedException('Refresh token inválido');
  }
}
```

---

### ⚠️ **MEJORA 5: Faltan Rate Limiting y Throttling**

#### **Problema:**
```typescript
// services/auth/backend/src/auth/auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ❌ Sin protección contra fuerza bruta
  return this.authService.login(loginDto.email, loginDto.password);
}
```

**Riesgo:** Un atacante puede intentar miles de combinaciones de usuario/contraseña.

#### **Solución 1 (NestJS Throttler):**
```bash
npm install @nestjs/throttler
```

```typescript
// services/auth/backend/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,        // Ventana de 60 segundos
      limit: 10,      // Máximo 10 requests por ventana
    }),
    // ...
  ],
})
export class AppModule {}

// services/auth/backend/src/auth/auth.controller.ts
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  @Post('login')
  @Throttle(5, 60)  // ✅ Máximo 5 intentos de login por minuto
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
```

#### **Solución 2 (Nginx Rate Limiting):**
```nginx
# gateway/nginx.conf
http {
  # Definir zona de rate limiting (10MB = ~160,000 IPs)
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

  server {
    location /auth/login {
      limit_req zone=auth_limit burst=5 nodelay;
      
      proxy_pass http://auth-backend:3002/auth/login;
      # ...
    }
  }
}
```

---

### 💡 **SUGERENCIA 5: Logging Estructurado Faltante**

#### **Problema:**
```typescript
// Logging actual:
console.log(`🚀 Backend running on: http://0.0.0.0:${port}`);
this.logger.error(`${request.method} ${request.url}`, exception.stack);
```

**Limitaciones:**
- No hay niveles de log configurables (DEBUG, INFO, WARN, ERROR)
- No hay aggregation (no puedes buscar "todos los errores de autenticación")
- Difícil debugging en producción

#### **Solución (Winston + Structured Logging):**
```bash
npm install winston nest-winston
```

```typescript
// services/auth/backend/src/logger/winston.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          return `${timestamp} [${context}] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),  // ✅ JSON para parsing automático
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

// services/auth/backend/src/main.ts
import { winstonConfig } from './logger/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,  // ✅ Usar Winston
  });
  // ...
}
```

**Uso:**
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(email: string, password: string) {
    this.logger.log(`Intento de login para: ${email}`);
    
    try {
      // ...
    } catch (error) {
      this.logger.error(`Error en login: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

---

## 📊 ESTIMACIÓN DE CONSUMO DE RECURSOS

### Servidor Local Recomendado
- **CPU:** 4 cores (Intel i5/Ryzen 5)
- **RAM:** 8GB mínimo, 16GB recomendado
- **Disco:** 50GB SSD

### Consumo Estimado (Con Límites)
```yaml
# docker-compose.microservices.yml con límites aplicados

services:
  mysql:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  auth-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  inventory-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  calendar-backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  inventory-frontend:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

  calendar-frontend:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

  gateway:
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 256M

# Total Estimado:
# CPU: 3.25 cores (81% de 4 cores)
# RAM: 3.25GB (40% de 8GB, 20% de 16GB)
```

### Monitoreo de Recursos
```bash
# Ver consumo en tiempo real
docker stats

# Exportar métricas a Prometheus (futuro)
docker-compose -f docker-compose.monitoring.yml up
```

---

## 🎯 PLAN DE ACCIÓN PRIORIZADO

### **FASE 1: CRÍTICOS (Esta Semana)**
1. ✅ Agregar `AllExceptionsFilter` global en Inventory backend
2. ✅ Eliminar puerto `3307:3306` de MySQL (seguridad)
3. ✅ Reducir JWT expiration a 1h + implementar refresh tokens
4. ✅ Agregar límites de recursos en docker-compose

### **FASE 2: MEJORAS (Próximas 2 Semanas)**
5. ✅ Implementar Redis para comunicación asíncrona entre microservicios
6. ✅ Eliminar CORS de backends NestJS (dejar solo en Nginx)
7. ✅ Cambiar `prisma db push` a `prisma migrate deploy`
8. ✅ Agregar rate limiting en `/auth/login`
9. ✅ Implementar logging estructurado con Winston

### **FASE 3: SUGERENCIAS (Próximo Mes)**
10. ✅ Centralizar autenticación (eliminar duplicación)
11. ✅ Crear shared library para guards y DTOs comunes
12. ✅ Evaluar SSR en Next.js para páginas críticas
13. ✅ Script de rotación automática de JWT secrets

---

## 📈 COMPARATIVA: ANTES vs DESPUÉS

| Aspecto | ❌ Antes | ✅ Después |
|---------|---------|-----------|
| **Autenticación** | Duplicada en 3 servicios | Centralizada en auth-backend |
| **Comunicación** | Solo HTTP síncrono | Redis Pub/Sub + HTTP |
| **Base de Datos** | MySQL expuesta en red | Solo accesible internamente |
| **JWT Expiration** | 7 días | 1h + refresh token |
| **Manejo de Errores** | Inconsistente | Global en todos los servicios |
| **CORS** | Configurado 2 veces | Solo en Nginx Gateway |
| **Migraciones** | `db push` (peligroso) | `migrate deploy` (seguro) |
| **Rate Limiting** | ❌ No existe | ✅ 5 intentos/min en login |
| **Logging** | `console.log` básico | Winston estructurado JSON |
| **Límites de RAM** | ❌ Sin límites | ✅ 3.25GB total controlado |

---

## 📝 CONCLUSIÓN

### Puntos Fuertes del Sistema
1. ✅ **Arquitectura multi-stage Docker** muy bien implementada
2. ✅ **Prisma con índices compuestos** para queries eficientes
3. ✅ **Validación de DTOs robusta** con class-validator
4. ✅ **Transacciones atómicas** en operaciones críticas
5. ✅ **Secrets manejados correctamente** con Docker secrets

### Riesgos Inmediatos
1. ❌ **Autenticación duplicada** dificultará mantenimiento
2. ❌ **MySQL expuesta** en puerto 3307 (riesgo de seguridad)
3. ❌ **JWT de 7 días** aumenta ventana de ataque
4. ❌ **Sin rate limiting** permite ataques de fuerza bruta
5. ❌ **Sin límites de RAM** puede causar OOM en producción

### Recomendación Final
El sistema tiene **fundamentos sólidos** pero requiere **ajustes críticos de seguridad y escalabilidad** antes de ir a producción. Implementa la **Fase 1 del Plan de Acción** esta semana para mitigar riesgos inmediatos.

**Próximo Paso Sugerido:** Implementar Redis + Centralizar autenticación para transformar esto de un "monolito distribuido" a una verdadera arquitectura de microservicios.

---

**Documento generado:** 30/Diciembre/2025  
**Versión del Sistema:** 1.0  
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)
