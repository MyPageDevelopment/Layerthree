# Sistema Layerthree - Gestión Empresarial

**Versión**: 1.2.0 (Actualizado: 30/12/2025)  
**Estado**: Production-Ready ✅

> **Novedades v1.2.0**: JWT secrets seguros, CORS restrictivo, 30 índices de BD, N+1 queries eliminados, validación de DTOs.  
> Ver [RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md) para detalles completos.

Sistema web completo de gestión empresarial para Layerthree, que incluye:
- **Gestión de Inventario de Bodega** (telecomunicaciones)
- **Gestión de Proyectos y Tareas**
- **Calendario y Asignación de Recursos**

## 🚀 Tecnologías

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Nest.js + TypeScript (Arquitectura de Microservicios)
- **Base de Datos**: MySQL 8.0
- **ORM**: Prisma
- **Autenticación**: JWT
- **Containerización**: Docker + Docker Compose
- **Gateway**: Nginx (Reverse Proxy)

## 📋 Módulos del Sistema

### 📦 Control de Bodega
- ✅ Sistema de autenticación seguro con JWT
- ✅ Control de roles (Administrador y Visualizador)
- ✅ Gestión completa de productos con SKU
- ✅ Control de inventario en tiempo real
- ✅ Registro de movimientos (entradas/salidas)
- ✅ Tracking por ID de proyecto
- ✅ Dashboard con métricas clave
- ✅ Alertas de stock bajo

### 📊 Gestión de Proyectos
- ✅ Creación y seguimiento de proyectos
- ✅ Asignación de tareas con prioridades
- ✅ Calendario interactivo con vista mensual/semanal/diaria
- ✅ Sistema de hitos y entregables
- ✅ Notificaciones por email con actualización de estado
- ✅ Panel Kanban para gestión visual
- ✅ Dashboard de métricas del equipo
- ✅ Actualización de tareas por correo (sin login)

## 👥 Usuarios del Sistema

### Super Administrador
- Email: `danielbelozoo@gmail.com`
- Password: `LT-1234512345`
- Permisos: Acceso total, creación de usuarios

### Administrador
- Email: `admin@bodega.com`
- Password: `Admin123!`
- Permisos: Gestión completa de productos, stock y movimientos

### Visualizador
- Email: `viewer@bodega.com`
- Password: `Viewer123!`
- Permisos: Solo lectura (para jefes de proyecto)

## 🐳 Instalación con Docker (Recomendado)

### Requisitos Previos
- Docker Desktop instalado
- Docker Compose instalado

### Pasos de Instalación

1. **Clonar o ubicarse en el directorio del proyecto**
```powershell
cd "d:\Páginas Web\Bodega"
```

2. **Construir y levantar los contenedores**
```powershell
docker-compose up -d --build
```

3. **Verificar que los servicios estén corriendo**
```powershell
docker-compose ps
```

4. **Acceder a la aplicación**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Comandos Útiles Docker

```powershell
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Detener los servicios
docker-compose down

# Detener y eliminar volúmenes (¡cuidado, elimina la base de datos!)
docker-compose down -v

# Reiniciar un servicio
docker-compose restart backend
```

## 💻 Instalación para Desarrollo

### Requisitos Previos
- Node.js 20+
- MySQL 8.0
- npm o pnpm

### Backend

1. **Instalar dependencias**
```powershell
cd backend
npm install
```

2. **Configurar variables de entorno**
Editar el archivo `backend/.env`:
```env
DATABASE_URL="mysql://bodega:bodega123@localhost:3306/bodega_db"
JWT_SECRET="tu_secreto_jwt_muy_seguro"
JWT_EXPIRES_IN="7d"
PORT=3001
```

3. **Ejecutar migraciones y seed**
```powershell
npx prisma migrate dev
npx prisma db seed
```

4. **Iniciar servidor de desarrollo**
```powershell
npm run start:dev
```

### Frontend

1. **Instalar dependencias**
```powershell
cd frontend
npm install
```

2. **Configurar variables de entorno**
Editar el archivo `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Iniciar servidor de desarrollo**
```powershell
npm run dev
```

## 🏢 Despliegue en Servidor de Intranet

### Con Docker (Recomendado)

1. **Copiar el proyecto al servidor**

2. **Actualizar variables de entorno**

En `docker-compose.yml`, actualizar:
```yaml
frontend:
  environment:
    NEXT_PUBLIC_API_URL: "http://IP_DEL_SERVIDOR:3001"
```

3. **Levantar los servicios**
```bash
docker-compose up -d --build
```

4. **Acceder desde cualquier computador de la intranet**
```
http://IP_DEL_SERVIDOR:3000
```

### Configuración de Puertos

Si necesitas cambiar los puertos por defecto:

En `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "PUERTO_DESEADO:3000"

backend:
  ports:
    - "PUERTO_DESEADO:3001"
```

## 📊 Estructura del Proyecto

```
Bodega/
├── frontend/               # Aplicación Next.js
│   ├── src/
│   │   ├── app/           # Páginas (App Router)
│   │   ├── components/    # Componentes reutilizables
│   │   ├── lib/           # Utilidades (API, auth)
│   │   └── types/         # Tipos TypeScript
│   ├── Dockerfile
│   └── package.json
│
├── backend/               # API Nest.js
│   ├── src/
│   │   ├── auth/         # Módulo de autenticación
│   │   ├── products/     # Módulo de productos
│   │   ├── movements/    # Módulo de movimientos
│   │   └── prisma/       # Cliente Prisma
│   ├── prisma/
│   │   ├── schema.prisma # Esquema de base de datos
│   │   └── seed.ts       # Datos iniciales
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml     # Orquestación de servicios
```

## 🔐 Seguridad

- Autenticación JWT con tokens seguros
- Contraseñas hasheadas con bcrypt
- Guards de autorización por roles
- Validación de datos con class-validator
- CORS configurado
- Variables de entorno para datos sensibles

## 📱 Funcionalidades por Módulo

### Productos
- Crear, editar y eliminar productos
- Control de stock en tiempo real
- Alertas de stock mínimo
- Búsqueda por SKU

### Movimientos
- Registro de entradas y salidas
- Asociación con ID de proyecto
- Historial completo
- Validación de stock disponible

### Dashboard
- Estadísticas generales
- Productos con stock bajo
- Movimientos recientes
- Valor total del inventario

## 🛠️ Comandos Prisma Útiles

```powershell
# Generar cliente Prisma
npx prisma generate

# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones en producción
npx prisma migrate deploy

# Abrir Prisma Studio (GUI)
npx prisma studio

# Seed de base de datos
npx prisma db seed
```

## 🐛 Solución de Problemas

### Error de conexión a MySQL
- Verificar que MySQL está corriendo: `docker-compose ps`
- Revisar credenciales en `.env`
- Esperar a que MySQL esté completamente iniciado (healthcheck)

### Frontend no se conecta al backend
- Verificar `NEXT_PUBLIC_API_URL` en `.env.local`
- Revisar CORS en `backend/src/main.ts`
- Verificar que el backend está corriendo

### Errores de Prisma
- Regenerar cliente: `npx prisma generate`
- Revisar migraciones: `npx prisma migrate status`

### Secrets no se cargan (v1.2.0+)
- Verificar que existen archivos en `secrets/`
- Verificar permisos: `chmod 600 secrets/*.txt`
- Ver logs: `docker logs auth_backend | grep "Secret"`

## 📚 Documentación Completa

### 🎯 Por Rol

**Ejecutivos** (5 min):
- [📋 RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md) - Overview de mejoras v1.2.0

**Arquitectos** (45 min):
- [🔍 AUDITORIA_TECNICA.md](./AUDITORIA_TECNICA.md) - Análisis técnico profundo

**Developers** (20 min):
- [📊 RESUMEN_MEJORAS.md](./RESUMEN_MEJORAS.md) - Cambios implementados v1.2.0

**DevOps** (30 min):
- [🛠️ GUIA_DEPLOYMENT.md](./GUIA_DEPLOYMENT.md) - Deployment paso a paso

### 📖 Índice Completo
Ver [INDICE_DOCUMENTACION.md](./INDICE_DOCUMENTACION.md) para toda la documentación disponible.

## 📞 Soporte

Para problemas o consultas sobre el sistema, contactar al administrador de TI.

## 📄 Licencia

Sistema propietario para uso interno de la empresa de telecomunicaciones.

---

**Desarrollado para optimizar la gestión de inventario de bodega** 📦
