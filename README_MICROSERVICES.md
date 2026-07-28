# 🏢 SISTEMA INTRANET LAYERTHREE - ARQUITECTURA DE MICROSERVICIOS

> **Sistema empresarial modular para gestión integral de operaciones**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://semver.org)
[![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)](https://www.docker.com/)
[![Microservices](https://img.shields.io/badge/architecture-microservices-orange.svg)](./MICROSERVICES_ARCHITECTURE.md)

---

## 📋 Descripción

Sistema web completo diseñado con **arquitectura de microservicios** para la intranet de Layerthree, permitiendo la gestión modular y escalable de:

- 📦 **Inventario (Bodega)** - Control de stock y materiales
- 💰 **Pagos** - Gestión financiera y proveedores *(próximamente)*
- 👥 **Recursos Humanos** - Administración de personal *(próximamente)*
- 📊 **Proyectos** - Seguimiento de obras y tareas *(próximamente)*
- 🤝 **CRM** - Gestión de clientes *(próximamente)*

---

## 🚀 Inicio Rápido

### Pre-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop) instalado
- 4GB RAM mínimo
- Puerto 80 disponible

### Instalación

```powershell
# 1. Clonar o acceder al repositorio
cd "d:\Páginas Web\Bodega"

# 2. Iniciar todo el sistema
.\start-microservices.ps1

# 3. Abrir en navegador
# http://localhost
```

### Credenciales de Acceso

```
👤 Admin:  admin@bodega.com  / Admin123!
👁️  Viewer: viewer@bodega.com / Viewer123!
```

---

## 🏗️ Arquitectura

### Diagrama de Microservicios

```
┌──────────────────────────────────────────────┐
│           🌐 API GATEWAY (Nginx)             │
│              http://localhost                 │
└─────┬────────────────────────────────────────┘
      │
      ├─────> /                → Inventory Frontend
      ├─────> /api/inventory/* → Inventory Backend
      ├─────> /api/payments/*  → Payments Backend
      └─────> /api/hr/*        → HR Backend
                                          
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Inventory   │  │   Payments   │  │      HR      │
│              │  │              │  │              │
│  Frontend    │  │  Frontend    │  │  Frontend    │
│  Next.js     │  │  Next.js     │  │  Next.js     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐
│  Inventory   │  │   Payments   │  │      HR      │
│              │  │              │  │              │
│  Backend     │  │  Backend     │  │  Backend     │
│  NestJS      │  │  NestJS      │  │  NestJS      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                  ┌───────▼────────┐
                  │  MySQL Server  │
                  │                │
                  │ - inventory_db │
                  │ - payments_db  │
                  │ - hr_db        │
                  └────────────────┘
```

### Stack Tecnológico

**Backend:**
- Node.js 20 + NestJS 10
- TypeScript
- Prisma ORM
- MySQL 8.0

**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- Axios

**Infraestructura:**
- Docker + Docker Compose
- Nginx (API Gateway)
- Red Docker aislada

---

## 📦 Microservicios

### ✅ Inventario (Bodega) - **OPERATIVO**

**Dominio:** Control de stock de equipos y materiales

**Funcionalidades:**
- ✅ Gestión de productos con SKU único
- ✅ Categorías y subcategorías
- ✅ Movimientos de entrada/salida
- ✅ Tracking por ID de proyecto
- ✅ Alertas de stock mínimo
- ✅ Reportes exportables (CSV/Excel)
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Autenticación por roles (Admin/Viewer)
- ✅ Interfaz responsive (móvil + desktop)

**Acceso:**
- Frontend: `http://localhost/`
- API: `http://localhost/api/inventory/`

**Tecnología:**
- Backend: `services/inventory/backend/` (NestJS)
- Frontend: `services/inventory/frontend/` (Next.js)
- Base de Datos: `inventory_db`

---

### 🔜 Pagos - **PRÓXIMAMENTE**

**Dominio:** Gestión financiera y control de gastos

**Funcionalidades Planeadas:**
- Registro de facturas (ingresos/egresos)
- Gestión de proveedores
- Control de gastos operativos
- Reportes financieros
- Alertas de vencimientos

**Guía de implementación:** [NEXT_MICROSERVICE.md](./NEXT_MICROSERVICE.md)

---

### 🔜 Recursos Humanos - **EN ROADMAP**

**Dominio:** Administración de personal

**Funcionalidades Planeadas:**
- Control de empleados
- Registro de asistencia
- Gestión de vacaciones
- Evaluaciones de desempeño
- Reportes de nómina

---

### 🔜 Proyectos - **EN ROADMAP**

**Dominio:** Gestión de proyectos y tareas

**Funcionalidades Planeadas:**
- Seguimiento de obras
- Asignación de tareas
- Timeline de proyectos
- Control de avances
- Reportes de costos

---

## 🛠️ Comandos Útiles

### Gestión del Sistema

```powershell
# Iniciar todo
.\start-microservices.ps1

# Detener todo
.\stop-microservices.ps1

# Ver logs de todos los servicios
docker-compose -f docker-compose.microservices.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.microservices.yml logs -f inventory-backend

# Reiniciar un servicio
docker-compose -f docker-compose.microservices.yml restart inventory-backend

# Ver estado de servicios
docker-compose -f docker-compose.microservices.yml ps
```

### Desarrollo

```powershell
# Reconstruir un servicio
docker-compose -f docker-compose.microservices.yml build --no-cache inventory-backend

# Ejecutar solo MySQL
docker-compose -f docker-compose.microservices.yml up -d mysql

# Desarrollo local del backend
cd services/inventory/backend
npm install
npm run start:dev

# Desarrollo local del frontend
cd services/inventory/frontend
npm install
npm run dev
```

---

## 📚 Documentación

- **[Arquitectura de Microservicios](./MICROSERVICES_ARCHITECTURE.md)** - Guía completa de la arquitectura
- **[Próximo Microservicio](./NEXT_MICROSERVICE.md)** - Guía paso a paso para crear nuevos servicios
- **[API Documentation](./API.md)** - Endpoints disponibles
- **[FAQ](./FAQ.md)** - Preguntas frecuentes

---

## 🔐 Seguridad

- ✅ Autenticación JWT con tokens seguros
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Guards de autorización por roles
- ✅ Validación de datos con class-validator
- ✅ CORS configurado en API Gateway
- ✅ Variables de entorno para datos sensibles
- ✅ Red Docker aislada

---

## 🌐 URLs del Sistema

| Servicio | URL | Puerto |
|----------|-----|--------|
| Gateway | `http://localhost` | 80 |
| Inventario (Frontend) | `http://localhost/` | - |
| Inventario (API) | `http://localhost/api/inventory/` | - |
| MySQL | `localhost:3307` | 3307 |
| Health Check | `http://localhost/health` | - |

---

## 📂 Estructura del Proyecto

```
Bodega/
├── services/               # Microservicios
│   └── inventory/         # Servicio de Inventario
│       ├── backend/       # NestJS API
│       └── frontend/      # Next.js UI
│
├── gateway/               # Nginx API Gateway
│   ├── nginx.conf
│   └── Dockerfile
│
├── shared/                # Código compartido
│   ├── types/            # TypeScript types
│   └── auth/             # Auth middleware
│
├── infrastructure/        # Infraestructura
│   └── mysql/
│       └── init/         # Scripts de BD
│
├── docker-compose.microservices.yml
├── .env.microservices
├── start-microservices.ps1
├── stop-microservices.ps1
└── MICROSERVICES_ARCHITECTURE.md
```

---

## 🎯 Roadmap

### Versión 2.0 (Actual) ✅
- [x] Arquitectura de microservicios
- [x] API Gateway (Nginx)
- [x] Servicio de Inventario completo
- [x] Autenticación JWT compartida
- [x] Librerías compartidas
- [x] Docker Compose multi-servicio

### Versión 2.1 (Q1 2026)
- [ ] Microservicio de Pagos
- [ ] Dashboard unificado
- [ ] Notificaciones en tiempo real
- [ ] Exportación a PDF

### Versión 2.2 (Q2 2026)
- [ ] Microservicio de RRHH
- [ ] Sistema de auditoría
- [ ] Backup automatizado
- [ ] HTTPS con certificados

### Versión 3.0 (Q3 2026)
- [ ] Microservicio de Proyectos
- [ ] Microservicio de CRM
- [ ] App móvil nativa
- [ ] BI y Analytics

---

## 🤝 Contribución

### Agregar Nuevo Microservicio

1. Lee la guía: [NEXT_MICROSERVICE.md](./NEXT_MICROSERVICE.md)
2. Crea la estructura en `services/nuevo-servicio/`
3. Actualiza `docker-compose.microservices.yml`
4. Actualiza `gateway/nginx.conf`
5. Documenta en este README

### Mejoras al Sistema

1. Crea un branch: `git checkout -b feature/nueva-funcionalidad`
2. Desarrolla y prueba localmente
3. Actualiza documentación si es necesario
4. Crea Pull Request

---

## 🆘 Troubleshooting

### Puerto 80 ocupado

```powershell
# Cambiar puerto en docker-compose.microservices.yml
ports:
  - "8080:80"  # Usar 8080 en lugar de 80
```

### MySQL no inicia

```powershell
# Ver logs
docker-compose -f docker-compose.microservices.yml logs mysql

# Reiniciar MySQL
docker-compose -f docker-compose.microservices.yml restart mysql
```

### Servicio no responde

```powershell
# Verificar health
docker-compose -f docker-compose.microservices.yml ps

# Ver logs detallados
docker-compose -f docker-compose.microservices.yml logs -f [servicio]

# Reconstruir
docker-compose -f docker-compose.microservices.yml build --no-cache [servicio]
docker-compose -f docker-compose.microservices.yml up -d [servicio]
```

---

## 📊 Métricas del Proyecto

- **Líneas de código:** ~15,000+
- **Microservicios:** 1 operativo, 4 planeados
- **Tecnologías:** 8 principales
- **Endpoints API:** 20+
- **Tests:** En desarrollo
- **Cobertura:** Target 80%

---

## 📄 Licencia

Proyecto privado - Layerthree ©2025

---

## 👥 Equipo

**Desarrollado para:** Layerthree  
**Arquitectura:** Microservicios + Docker  
**Metodología:** Ágil (Scrum)

---

## 🎉 ¡Empieza Ahora!

```powershell
# Un solo comando para iniciar todo
.\start-microservices.ps1

# Abre tu navegador
http://localhost
```

---

**Sistema listo para escalar** 🚀 | **Documentación completa** 📚 | **Soporte continuo** 💪
