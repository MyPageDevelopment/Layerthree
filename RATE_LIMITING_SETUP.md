# ====================================================================
# INSTRUCCIONES PARA IMPLEMENTAR RATE LIMITING
# Sistema de Intranet Layerthree
# ====================================================================

## 📋 DESCRIPCIÓN

Este documento proporciona las instrucciones paso a paso para implementar
**Rate Limiting** en los microservicios usando `@nestjs/throttler`.

---

## 🎯 OBJETIVO

Proteger los endpoints críticos (especialmente `/auth/login`) contra:
- ✅ Ataques de fuerza bruta
- ✅ Intentos masivos de login
- ✅ Abuso de API
- ✅ DoS (Denial of Service)

---

## 📦 PASO 1: INSTALAR DEPENDENCIAS

Ejecutar en cada backend que requiera rate limiting:

```powershell
# Auth Backend (CRÍTICO - login endpoint)
cd services/auth/backend
npm install @nestjs/throttler

# Inventory Backend (OPCIONAL)
cd services/inventory/backend
npm install @nestjs/throttler

# Calendar Backend (OPCIONAL)
cd services/calendar/backend
npm install @nestjs/throttler
```

---

## 🔧 PASO 2: CONFIGURAR EN AUTH BACKEND

### 2.1. Actualizar `app.module.ts`

```typescript
// services/auth/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // Configuración global de rate limiting
    ThrottlerModule.forRoot({
      ttl: 60,        // Ventana de tiempo: 60 segundos
      limit: 10,      // Máximo 10 requests por ventana
    }),
    
    // ... otros módulos existentes
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 2.2. Proteger Endpoint de Login

```typescript
// services/auth/backend/src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(5, 60)  // ✅ Máximo 5 intentos de login por minuto
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @Throttle(3, 300)  // ✅ Máximo 3 registros por 5 minutos
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('refresh')
  @Throttle(10, 60)  // ✅ Máximo 10 refreshes por minuto
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshToken(refreshDto.refreshToken);
  }
}
```

---

## 🌐 PASO 3: RATE LIMITING EN NGINX (ALTERNATIVA)

Si prefieres manejar rate limiting en el gateway:

```nginx
# gateway/nginx.conf
http {
  # Zona de rate limiting para login
  # 10MB = ~160,000 direcciones IP únicas
  limit_req_zone $binary_remote_addr zone=auth_login:10m rate=5r/m;
  
  # Zona general para APIs
  limit_req_zone $binary_remote_addr zone=api_general:10m rate=60r/m;

  server {
    # Proteger endpoint de login
    location /auth/login {
      limit_req zone=auth_login burst=3 nodelay;
      # burst=3: permite 3 requests extra en picos
      # nodelay: rechaza inmediatamente si excede
      
      proxy_pass http://auth-backend:3002/auth/login;
      # ... headers existentes
    }

    # Proteger endpoint de registro
    location /auth/register {
      limit_req zone=auth_login burst=1 nodelay;
      
      proxy_pass http://auth-backend:3002/auth/register;
      # ... headers existentes
    }

    # Rate limit general para todas las APIs
    location /api/ {
      limit_req zone=api_general burst=10 nodelay;
      
      proxy_pass http://inventory-backend:3001/;
      # ... headers existentes
    }
  }
}
```

**Respuesta cuando se excede el límite:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: text/html

<html>
<head><title>429 Too Many Requests</title></head>
<body>
<center><h1>429 Too Many Requests</h1></center>
<hr><center>nginx</center>
</body>
</html>
```

---

## 📊 PASO 4: MONITOREO Y LOGS

### 4.1. Logs de Throttler en NestJS

```typescript
// services/auth/backend/src/main.ts
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  
  // Los intentos bloqueados aparecerán en logs
  const logger = new Logger('ThrottlerGuard');
  
  await app.listen(3002);
}
```

**Ejemplo de log cuando se bloquea:**
```
[ThrottlerGuard] Rate limit exceeded for 192.168.1.100 on POST /auth/login
```

### 4.2. Logs de Nginx

```nginx
# gateway/nginx.conf
http {
  # Agregar info de rate limiting a logs
  log_format main_with_limit '$remote_addr - $remote_user [$time_local] '
                             '"$request" $status $body_bytes_sent '
                             '"$http_referer" "$http_user_agent" '
                             'limit_req_status=$limit_req_status';

  access_log /var/log/nginx/access.log main_with_limit;
}
```

---

## 🧪 PASO 5: PROBAR RATE LIMITING

### 5.1. Test Manual con cURL

```powershell
# Hacer 10 requests rápidos (debería bloquear después de 5)
for ($i=1; $i -le 10; $i++) {
    Write-Host "Request $i"
    curl -X POST http://localhost/auth/login `
         -H "Content-Type: application/json" `
         -d '{"email":"test@test.com","password":"wrong"}' `
         -w "\nStatus: %{http_code}\n\n"
    Start-Sleep -Milliseconds 500
}
```

**Resultado esperado:**
```
Request 1 - Status: 401 (Unauthorized)
Request 2 - Status: 401
Request 3 - Status: 401
Request 4 - Status: 401
Request 5 - Status: 401
Request 6 - Status: 429 (Too Many Requests)  ✅ BLOQUEADO
Request 7 - Status: 429
...
```

### 5.2. Test con Herramienta (Apache Bench)

```bash
# Instalar (si no está)
# Windows: https://www.apachelounge.com/download/

# Probar con 100 requests, 10 concurrentes
ab -n 100 -c 10 -p test-login.json -T application/json \
   http://localhost/auth/login
```

---

## 🔒 PASO 6: CONFIGURACIÓN RECOMENDADA POR ENDPOINT

| Endpoint | Límite | Ventana | Justificación |
|----------|--------|---------|---------------|
| `/auth/login` | 5 req | 1 min | Prevenir fuerza bruta |
| `/auth/register` | 3 req | 5 min | Prevenir spam de registros |
| `/auth/refresh` | 10 req | 1 min | Uso normal de refresh |
| `/api/products` (GET) | 60 req | 1 min | Consultas frecuentes |
| `/api/products` (POST) | 20 req | 1 min | Creación moderada |
| `/api/movements` (POST) | 30 req | 1 min | Operaciones de bodega |

---

## 📈 PASO 7: MONITOREO CON REDIS (AVANZADO)

Para compartir límites entre múltiples instancias:

```typescript
// services/auth/backend/src/app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
      storage: new ThrottlerStorageRedisService({
        host: 'redis',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
      }),
    }),
  ],
})
export class AppModule {}
```

**Requiere:**
```bash
npm install nestjs-throttler-storage-redis ioredis
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Instalar `@nestjs/throttler` en auth-backend
- [ ] Configurar ThrottlerModule en app.module.ts
- [ ] Agregar decorador `@Throttle()` a login endpoint
- [ ] Probar con cURL (verificar código 429)
- [ ] Revisar logs de bloqueos
- [ ] (Opcional) Configurar en Nginx como respaldo
- [ ] (Opcional) Implementar storage con Redis
- [ ] Documentar límites en README

---

## 🚨 TROUBLESHOOTING

### Problema: Rate limiting no funciona

**Solución 1:** Verificar que ThrottlerGuard esté registrado globalmente
```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
]
```

**Solución 2:** Revisar que el decorador esté antes del método
```typescript
@Post('login')
@Throttle(5, 60)  // ✅ Antes del método
async login() { }
```

### Problema: Bloqueando IPs internas del Docker

**Solución:** Usar `X-Forwarded-For` en Nginx
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

```typescript
// En NestJS
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
      ignoreUserAgents: [/healthcheck/i],  // Ignorar health checks
    }),
  ],
})
```

---

## 📚 REFERENCIAS

- [@nestjs/throttler Docs](https://github.com/nestjs/throttler)
- [Nginx Rate Limiting](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)
- [OWASP Brute Force Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Última actualización:** 30 de Diciembre de 2025  
**Estado:** Preparado para implementación
