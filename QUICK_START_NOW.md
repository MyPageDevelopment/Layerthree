# ⚡ INICIO INMEDIATO - SISTEMA DE MICROSERVICIOS

**¿Quieres probar el sistema AHORA? Sigue estos 3 pasos:**

---

## 1️⃣ Verificar Requisitos (30 segundos)

```powershell
# ¿Tienes Docker Desktop instalado?
docker --version

# ¿Tienes Docker Compose?
docker-compose --version
```

✅ Si ves las versiones, estás listo.  
❌ Si no, [instala Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## 2️⃣ Iniciar el Sistema (1 comando)

```powershell
# Ejecuta este comando en la raíz del proyecto:
.\start-microservices.ps1
```

**Esto hará:**
- ✅ Construir todas las imágenes Docker
- ✅ Iniciar MySQL
- ✅ Iniciar API Gateway
- ✅ Iniciar servicio de Inventario
- ✅ Crear bases de datos
- ✅ Insertar datos de prueba

**Tiempo estimado:** 3-5 minutos la primera vez

---

## 3️⃣ Acceder al Sistema (Inmediato)

### Abrir en Navegador:
```
http://localhost
```

### Credenciales:
```
👤 Admin:  admin@bodega.com  / Admin123!
👁️  Viewer: viewer@bodega.com / Viewer123!
```

---

## ✅ ¡Listo! Ya Estás Usando el Sistema

### Qué puedes hacer:

**Panel de Inventario:**
- 📦 Ver productos
- ➕ Agregar nuevos productos
- 📊 Ver estadísticas en dashboard
- 📥 Registrar entradas/salidas
- 📄 Exportar reportes

---

## 🔍 URLs Útiles

| URL | Descripción |
|-----|-------------|
| `http://localhost` | Aplicación principal |
| `http://localhost/api/inventory/products` | API de productos (JSON) |
| `http://localhost/health` | Health check del gateway |

---

## 🛑 Detener el Sistema

```powershell
.\stop-microservices.ps1
```

---

## 📋 Comandos Útiles

```powershell
# Ver logs en tiempo real
docker-compose -f docker-compose.microservices.yml logs -f

# Ver estado de servicios
docker-compose -f docker-compose.microservices.yml ps

# Reiniciar todo
docker-compose -f docker-compose.microservices.yml restart

# Ver logs de un servicio específico
docker-compose -f docker-compose.microservices.yml logs -f inventory-backend
```

---

## ❓ ¿Problemas?

### Puerto 80 ocupado
```powershell
# Edita docker-compose.microservices.yml
# Cambia línea 123:
ports:
  - "8080:80"  # Usar 8080 en lugar de 80

# Luego accede a: http://localhost:8080
```

### Error al construir
```powershell
# Limpia e intenta de nuevo
docker-compose -f docker-compose.microservices.yml down -v
docker system prune -f
.\start-microservices.ps1
```

### MySQL no inicia
```powershell
# Ver logs de MySQL
docker-compose -f docker-compose.microservices.yml logs mysql

# Reiniciar solo MySQL
docker-compose -f docker-compose.microservices.yml restart mysql
```

---

## 📚 ¿Quieres Aprender Más?

1. **Visión General:** Lee `README_MICROSERVICES.md`
2. **Arquitectura:** Lee `MICROSERVICES_ARCHITECTURE.md`
3. **Crear Nuevo Servicio:** Lee `NEXT_MICROSERVICE.md`
4. **Índice Completo:** Lee `DOCUMENTATION_INDEX.md`

---

## 🎯 Próximos Pasos Sugeridos

Después de probar el sistema:

1. ✅ Explora el dashboard de inventario
2. ✅ Agrega algunos productos de prueba
3. ✅ Registra movimientos de entrada/salida
4. ✅ Exporta un reporte
5. ✅ Lee la documentación completa
6. ✅ Planifica el siguiente microservicio

---

## 🚀 ¡Todo Listo!

```
┌─────────────────────────────────────┐
│                                     │
│  Sistema de Microservicios          │
│  Layerthree v2.0                    │
│                                     │
│  ✅ Inventario Operativo            │
│  🔜 Más servicios por venir         │
│                                     │
│  http://localhost                   │
│                                     │
└─────────────────────────────────────┘
```

**Comando para iniciar:**
```powershell
.\start-microservices.ps1
```

---

**¡Disfruta del sistema!** 🎉
