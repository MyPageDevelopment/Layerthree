# 🚀 Bodega Layerthree - Guía de Inicio para Producción

## 📋 Requisitos Previos

- **Node.js** 20.x o superior
- **MySQL** 8.0 instalado y corriendo
  - Usuario: `root`
  - Contraseña: `1234567890`
  - Puerto: `3306`

## 🛠️ Configuración Inicial (Primera Vez)

### Paso 1: Configurar Base de Datos

Ejecuta el script de configuración:

```powershell
.\inicio.ps1
```

Selecciona la opción **1** para configurar la base de datos.

Esto hará:
- ✅ Verificar que MySQL esté corriendo
- ✅ Crear la base de datos `bodega_layerthree`
- ✅ Aplicar migraciones de Prisma
- ✅ Insertar datos iniciales (usuarios, productos)

### Credenciales de Acceso

**Administrador:**
- Email: `admin@bodega.com`
- Password: `Admin123!`

**Visualizador:**
- Email: `viewer@bodega.com`
- Password: `Viewer123!`

## 🎯 Iniciar el Sistema

### Opción A: Menú Interactivo (Recomendado)

```powershell
.\inicio.ps1
```

Opciones disponibles:
1. Configurar base de datos (primera vez)
2. Iniciar backend solamente
3. Iniciar frontend solamente
4. Iniciar backend + frontend (ventanas separadas)
5. Ver estado de MySQL

### Opción B: Scripts Individuales

**Iniciar Backend:**
```powershell
.\start-backend.ps1
```

**Iniciar Frontend (en otra terminal):**
```powershell
.\start-frontend.ps1
```

## 🌐 URLs de Acceso

- **Frontend Local:** http://localhost:3000
- **Frontend Red:** http://172.16.11.174:3000
- **Backend API:** http://localhost:3001

## 📁 Estructura de Base de Datos

**Base de datos:** `bodega_layerthree`

**Tablas:**
- `User` - Usuarios del sistema
- `Product` - Productos de bodega
- `Movement` - Movimientos de inventario (entradas/salidas)

## 🔧 Configuración

### Backend (.env)
```env
DATABASE_URL="mysql://root:1234567890@localhost:3306/bodega_layerthree"
JWT_SECRET="layerthree_bodega_secret_2024_secure_key_production"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🐛 Solución de Problemas

### MySQL no está corriendo

```powershell
# Ver estado
Get-Service MySQL*

# Iniciar servicio
Start-Service MySQL80  # O el nombre de tu servicio
```

### Error de conexión a base de datos

1. Verifica que MySQL esté corriendo
2. Confirma usuario/contraseña: `root` / `1234567890`
3. Verifica que el puerto sea `3306`

### Puerto en uso

Si el puerto 3001 o 3000 está en uso:

```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :3001

# Matar el proceso (reemplaza PID)
taskkill /PID <PID> /F
```

### Regenerar base de datos

```powershell
cd backend
npx prisma db push --force-reset
npm run seed
```

## 📦 Comandos Útiles

### Backend

```powershell
cd backend

# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Aplicar migraciones
npx prisma db push

# Ver base de datos (Prisma Studio)
npx prisma studio

# Ejecutar seed
npm run seed

# Modo desarrollo
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

### Frontend

```powershell
cd frontend

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Build producción
npm run build
npm start
```

## 🎨 Características del Sistema

✅ Gestión de productos con SKU
✅ Control de stock con alertas de stock bajo
✅ Registro de movimientos (entradas/salidas)
✅ Tracking por ID de proyecto
✅ Sistema de autenticación con roles (Admin/Viewer)
✅ Búsqueda y filtros
✅ Diseño responsive (móvil y desktop)
✅ Importación de datos desde CSV

## 📱 Acceso desde Móvil

1. Asegúrate de que tu PC y móvil estén en la misma red
2. Abre el firewall:
   ```powershell
   .\abrir-firewall.ps1
   ```
3. Accede desde el móvil a: `http://172.16.11.174:3000`

## 🔐 Seguridad

Para producción, asegúrate de:
- ✅ Cambiar el JWT_SECRET
- ✅ Usar contraseñas seguras
- ✅ Configurar HTTPS
- ✅ Restringir acceso a la base de datos
- ✅ Habilitar CORS solo para dominios permitidos

## 📞 Soporte

Para problemas o consultas, revisa los logs en:
- Backend: Terminal donde corriste `start-backend.ps1`
- Frontend: Terminal donde corriste `start-frontend.ps1`
- MySQL: Event Viewer de Windows
