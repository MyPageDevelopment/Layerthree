# ====================================================================
# INSTRUCCIONES DE INSTALACIÓN - RATE LIMITING Y LOGGING
# Sistema de Intranet Layerthree
# ====================================================================

## 📦 PASO 1: INSTALAR DEPENDENCIAS

### Auth Backend (Implementado)
```powershell
cd services/auth/backend

# Instalar dependencias
npm install @nestjs/throttler@^5.1.0
npm install nest-winston@^1.9.4 winston@^3.11.0

# Verificar instalación
npm list @nestjs/throttler nest-winston winston
```

### Inventory Backend (Opcional - Recomendado)
```powershell
cd services/inventory/backend

# Instalar rate limiting
npm install @nestjs/throttler@^5.1.0

# Instalar logging
npm install nest-winston@^1.9.4 winston@^3.11.0
```

### Calendar Backend (Opcional - Recomendado)
```powershell
cd services/calendar/backend

# Instalar rate limiting
npm install @nestjs/throttler@^5.1.0

# Instalar logging
npm install nest-winston@^1.9.4 winston@^3.11.0
```

---

## 🔧 PASO 2: CREAR DIRECTORIOS DE LOGS

```powershell
# Desde la raíz del proyecto
New-Item -ItemType Directory -Force -Path "services/auth/backend/logs"
New-Item -ItemType Directory -Force -Path "services/inventory/backend/logs"
New-Item -ItemType Directory -Force -Path "services/calendar/backend/logs"
```

---

## 🐳 PASO 3: ACTUALIZAR DOCKERFILES (Opcional)

Si quieres persistir logs fuera de contenedores:

```dockerfile
# services/auth/backend/Dockerfile
# Agregar antes de CMD
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app/logs

VOLUME ["/app/logs"]
```

Actualizar docker-compose:
```yaml
services:
  auth-backend:
    volumes:
      - ./services/auth/backend/logs:/app/logs
```

---

## 🚀 PASO 4: RECONSTRUIR SERVICIOS

```powershell
# Detener servicios
docker-compose -f docker-compose.microservices.yml down

# Reconstruir solo auth-backend (si solo instalaste ahí)
docker-compose -f docker-compose.microservices.yml build auth-backend

# O reconstruir todos
docker-compose -f docker-compose.microservices.yml build

# Iniciar
docker-compose -f docker-compose.microservices.yml up -d

# Verificar logs
docker-compose -f docker-compose.microservices.yml logs -f auth-backend
```

---

## 🧪 PASO 5: PROBAR RATE LIMITING

### Test Manual con PowerShell
```powershell
# Hacer 10 intentos de login (debería bloquear después de 5)
1..10 | ForEach-Object {
    Write-Host "Intento $_" -ForegroundColor Yellow
    
    $response = Invoke-WebRequest -Method POST `
        -Uri "http://localhost/auth/login" `
        -ContentType "application/json" `
        -Body '{"email":"test@test.com","password":"wrong"}' `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor $(
        if ($response.StatusCode -eq 429) { "Red" } else { "Green" }
    )
    
    Start-Sleep -Milliseconds 500
}
```

**Resultado esperado:**
```
Intento 1 - Status: 401 (Unauthorized)
Intento 2 - Status: 401
Intento 3 - Status: 401
Intento 4 - Status: 401
Intento 5 - Status: 401
Intento 6 - Status: 429 (Too Many Requests) ✅ BLOQUEADO
Intento 7 - Status: 429
...
```

### Test con cURL (Alternativa)
```bash
for i in {1..10}; do
  echo "Intento $i"
  curl -X POST http://localhost/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@test.com","password":"wrong"}' \
       -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done
```

---

## 📊 PASO 6: VERIFICAR LOGS DE WINSTON

```powershell
# Ver logs en tiempo real
Get-Content services/auth/backend/logs/combined.log -Wait -Tail 50

# Ver solo errores
Get-Content services/auth/backend/logs/error.log -Wait -Tail 20

# Ver logs de autenticación
Get-Content services/auth/backend/logs/auth.log -Wait -Tail 30

# Buscar intentos bloqueados por rate limiting
Select-String -Path "services/auth/backend/logs/auth.log" -Pattern "429"
```

**Formato de logs (JSON):**
```json
{
  "level": "info",
  "message": "Login attempt for: user@example.com",
  "context": "AuthService",
  "timestamp": "2025-12-30 14:30:45",
  "ms": "+2ms"
}

{
  "level": "error",
  "message": "Rate limit exceeded",
  "context": "ThrottlerGuard",
  "timestamp": "2025-12-30 14:31:10",
  "statusCode": 429,
  "path": "/auth/login"
}
```

---

## 📈 PASO 7: MONITOREO Y ANÁLISIS

### Contar intentos de login fallidos
```powershell
# Último día
(Select-String -Path "services/auth/backend/logs/auth.log" -Pattern "login attempt").Count

# Intentos bloqueados por rate limit
(Select-String -Path "services/auth/backend/logs/combined.log" -Pattern '"statusCode":429').Count
```

### Top IPs bloqueadas (si logs incluyen IP)
```powershell
# Requiere parsear JSON logs
Get-Content services/auth/backend/logs/combined.log | 
  ConvertFrom-Json | 
  Where-Object { $_.statusCode -eq 429 } | 
  Group-Object -Property ip | 
  Sort-Object Count -Descending | 
  Select-Object -First 10
```

---

## 🔒 CONFIGURACIONES RECOMENDADAS

### Rate Limits por Endpoint
| Endpoint | Límite | Ventana | Configurado en |
|----------|--------|---------|----------------|
| `/auth/login` | 5 req | 60s | ✅ auth.controller.ts |
| `/auth/validate` | 20 req | 60s | ✅ auth.controller.ts |
| `/auth/profile` | Sin límite | - | ✅ SkipThrottle() |
| Global (otros) | 10 req | 60s | ✅ app.module.ts |

### Niveles de Log por Entorno
| Entorno | Nivel | Archivos |
|---------|-------|----------|
| Desarrollo | `debug` | Console + combined.log |
| Producción | `info` | Console + combined.log + error.log |
| Testing | `warn` | Solo error.log |

---

## ⚙️ PERSONALIZACIÓN

### Cambiar límites de rate limiting
```typescript
// services/auth/backend/src/app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,      // Cambiar ventana de tiempo (ms)
  limit: 20,       // Cambiar cantidad de requests
}]),
```

### Cambiar nivel de logs
```typescript
// services/auth/backend/src/config/winston.config.ts
level: process.env.LOG_LEVEL || 'info'  // debug, info, warn, error
```

En .env:
```env
LOG_LEVEL=debug  # Para más detalle
```

---

## 🐛 TROUBLESHOOTING

### Problema: Rate limiting no funciona
**Solución:** Verificar que ThrottlerGuard está en app.module.ts
```typescript
providers: [{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
}],
```

### Problema: Logs no se crean
**Solución:** Crear directorio manualmente y dar permisos
```powershell
New-Item -ItemType Directory -Force -Path "services/auth/backend/logs"
# En Docker: chown -R nestjs:nodejs /app/logs
```

### Problema: Logs muy grandes
**Solución:** Están configurados con rotación automática
- Máximo 5MB por archivo
- Máximo 5 archivos antiguos
- Se eliminan automáticamente los más viejos

---

## ✅ CHECKLIST FINAL

- [ ] Dependencias instaladas (`npm install`)
- [ ] Directorios de logs creados
- [ ] Servicios reconstruidos y reiniciados
- [ ] Rate limiting testeado (código 429)
- [ ] Logs generándose en `logs/combined.log`
- [ ] .gitignore actualizado (logs/ y secrets/)
- [ ] Variables de entorno configuradas

---

**Próximo paso:** Implementar lo mismo en inventory-backend y calendar-backend siguiendo la misma estructura.

**Documentación relacionada:**
- [RATE_LIMITING_SETUP.md](../RATE_LIMITING_SETUP.md) - Guía detallada
- [CAMBIOS_IMPLEMENTADOS.md](../CAMBIOS_IMPLEMENTADOS.md) - Resumen de cambios
