# Sistema de Control de Bodega - Telecomunicaciones

## Descripción del Proyecto
Sistema web para gestión de inventario de bodega de empresa de telecomunicaciones.

## Stack Tecnológico
- **Frontend**: Next.js 14 con TypeScript y Tailwind CSS
- **Backend**: Nest.js con TypeScript
- **Base de Datos**: MySQL con Prisma ORM
- **Containerización**: Docker y Docker Compose
- **Autenticación**: JWT

## Estructura del Proyecto
- `/frontend` - Aplicación Next.js
- `/backend` - API Nest.js
- `/docker` - Configuraciones Docker

## Roles de Usuario
- **Administrador**: Gestión completa de productos y stock
- **Visualizador**: Solo lectura para jefes de proyectos

## Características
- Control de productos con SKU
- Registro de movimientos (entrada/salida)
- Tracking por ID de proyecto
- Sistema de autenticación seguro
