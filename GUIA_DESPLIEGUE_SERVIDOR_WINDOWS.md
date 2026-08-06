# GUÍA DE DESPLIEGUE Y MANTENIMIENTO EN SERVIDOR (WINDOWS 11 HOME + DOCKER DESKTOP)
## Sistema de Gestión Corporativa Layerthree

Esta guía contiene la documentación técnica paso a paso para realizar el despliegue, configuración de red, automatización de respaldos y mantenimiento continuo de la plataforma **Layerthree** en un equipo secundario (servidor de red local) con sistema operativo **Windows 11 Home**.

---

## 📋 1. REQUISITOS PREVIOS Y PREPARACIÓN DEL SERVIDOR

### 1.1. Requisitos de Hardware Recomendados
- **Procesador:** Intel Core i5 / AMD Ryzen 5 o superior (con soporte de Virtualización de 64 bits).
- **Memoria RAM:** 8 GB mínimo (16 GB recomendado).
- **Almacenamiento:** Disco SSD con al menos 20 GB libres.
- **Conexión de Red:** Cable Ethernet (LAN) o WiFi en la misma red local corporativa.

### 1.2. Habilitar Virtualización en BIOS/UEFI
Antes de instalar Docker, asegúrate de activar la virtualización en el procesador:
1. Reinicia el equipo e ingresa a la BIOS/UEFI (presionando `F2`, `F10`, `F12` o `DEL`).
2. Busca la opción **Virtualization Technology (VT-x / AMD-V / SVM)** y cámbiala a **Enabled**.
3. Guarda los cambios e inicia Windows 11 Home.

### 1.3. Habilitar WSL 2 (Windows Subsystem for Linux 2)
Abre **PowerShell** como **Administrador** (Clic derecho -> *Ejecutar como administrador*) y ejecuta los siguientes comandos:

```powershell
# 1. Habilitar Plataforma de Máquina Virtual
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 2. Habilitar Subsistema de Windows para Linux
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 3. Instalar o actualizar WSL 2 a la versión más reciente
wsl --install --no-distribution
wsl --set-default-version 2
```
*Reinicia el PC servidor si el sistema lo solicita.*

### 1.4. Instalación y Configuración de Docker Desktop
1. Descarga el instalador oficial de [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/).
2. Ejecuta `Docker Desktop Installer.exe` y asegúrate de marcar la casilla **"Use WSL 2 instead of Hyper-V"**.
3. Una vez finalizada la instalación, abre **Docker Desktop**.
4. Ingrese a **Settings (Engranaje ⚙️)** -> **General**:
   - ✅ Marcar: *Start Docker Desktop when you log in* (Inicia automáticamente con Windows).
   - ✅ Marcar: *Use the WSL 2 based engine*.
5. Presiona **Apply & restart**.

---

## 🌐 2. CONFIGURACIÓN DE RED LOCAL (IP ESTÁTICA EN WINDOWS 11)

Para que los demás computadores, celulares y tablets de la oficina puedan acceder al servidor sin perder la conexión si cambia la dirección IP:

1. Ve a **Inicio -> Configuración -> Red e Internet -> Ethernet (o Wi-Fi)**.
2. En **Asignación de IP**, haz clic en **Editar**.
3. Cambia de *Automático (DHCP)* a **Manual** e ingresa los datos de tu red (Ejemplo):
   - **IP del Servidor:** `192.168.1.100` (o la IP asignada por tu router).
   - **Mascara de Subred:** `255.255.255.0`
   - **Puerta de enlace:** `192.168.1.1`
   - **DNS Preferido:** `1.1.1.1` o `8.8.8.8`
4. Guarda la configuración.

---

## 🛠️ 3. INSTALACIÓN Y CONFIGURACIÓN DEL PROYECTO

### 3.1. Copiar el Código Fuente en el Servidor
Copia la carpeta del proyecto en una ruta permanente dentro del servidor, por ejemplo:
`C:\Proyectos\Layerthree`

### 3.2. Configuración de Variables de Entorno (`.env`)
En la raíz de la carpeta del proyecto (`C:\Proyectos\Layerthree\.env`), verifica que el archivo contenga las variables necesarias. Puedes usar el archivo `.env.example` como plantilla:

```env
# ENTORNOS Y PUERTOS
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api

# CONFIGURACIÓN DE BASE DE DATOS MYSQL
MYSQL_ROOT_PASSWORD=R8mX4vP9qL2zW7rN5tJ1yC3uK6bQ8zP
MYSQL_DATABASE=intranet_layerthree_db
MYSQL_USER=l3_app_user_prod
MYSQL_PASSWORD=L3AppUserProdSecure2026Pass99xZ
DATABASE_URL=mysql://l3_app_user_prod:L3AppUserProdSecure2026Pass99xZ@database:3306/intranet_layerthree_db

# SEGURIDAD JWT
JWT_SECRET=L3k9M2vX8qR5zW7n4TJ1yC3uK6bQ8zP2mL5xW8rN4tJ1yC3uK6bQ9zR4vM2wL7pK
JWT_EXPIRATION=24h

# CONFIGURACIÓN CORREO SMTP (NOTIFICACIONES Y RECUPERACIÓN)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=auto.vip6969@gmail.com
SMTP_PASS=ymjiynyeolpgmfnc
EMAIL_FROM="Soporte Layerthree <auto.vip6969@gmail.com>"
```
*> Nota: Reemplaza `192.168.1.100` por la IP real asignada a tu equipo servidor.*

---

## 🚀 4. DESPLIEGUE CON DOCKER COMPOSE

El proyecto utiliza `docker-compose.yml` para gestionar de forma aislada e integrada los 3 servicios del monolito:

1. `database`: MySQL 8.0 con volumen persistente (`mysql_data`).
2. `backend`: NestJS API en puerto `3001`.
3. `frontend`: Next.js Web en puerto `80` (y `3000`).

### 4.1. Despliegue Automatizado
Abre **PowerShell** en la carpeta del proyecto (`C:\Proyectos\Layerthree`) y ejecuta el script de despliegue:

```powershell
.\deploy-local.ps1
```

Este script se encargará automáticamente de:
1. Construir las imágenes de Docker del Backend y Frontend.
2. Levantar los contenedores en segundo plano (`docker-compose up -d --build`).
3. Esperar la verificación de salud (*healthcheck*) de la base de datos MySQL.
4. Ejecutar las migraciones de esquemas e inserción de datos iniciales (*seed.js*).

---

## 🛡️ 5. APERTURA DE PUERTOS EN EL FIREWALL DE WINDOWS

Para permitir que otros computadores y móviles de la red accedan al sistema, se deben abrir los puertos en el Firewall de Windows Defender.

Ejecuta el script incluido **como Administrador** desde PowerShell:

```powershell
# Ejecutar desde PowerShell iniciado como Administrador
.\abrir-firewall.ps1
```

### Reglas Creadas por el Script:
- **Puerto 80 (TCP):** Acceso a la interfaz web corporativa (Frontend).
- **Puerto 3001 (TCP):** Acceso a la API REST (Backend NestJS).
- **Puerto 3306 (TCP):** Conexión remota a base de datos (Opcional).

---

## 💾 6. RESPALDOS AUTOMÁTICOS DE BASE DE DATOS (POWERSHELL + TASK SCHEDULER)

El proyecto incluye el script `backup-db.ps1` que realiza volcados diarios comprimidos de la base de datos MySQL y elimina respaldos antiguos de más de 30 días.

### 6.1. Probar el Script de Backup Manualmente
Ejecuta en PowerShell:
```powershell
.\backup-db.ps1
```
Verifica que se haya generado un archivo `.sql` en la carpeta `C:\Proyectos\Layerthree\backups\intranet_db_YYYY-MM-DD_HHmm.sql`.

### 6.2. Configuración en el Programador de Tareas de Windows (Task Scheduler)
Para automatizar este respaldo todos los días a las 23:00 hrs:

1. Presiona `Win + R`, escribe `taskschd.msc` y presiona **Enter**.
2. En el panel derecho, haz clic en **Crear tarea básica...**
3. **Nombre:** `Respaldo Diario Intranet Layerthree` -> Clic en *Siguiente*.
4. **Desencadenador:** Selecciona **Diariamente** -> Clic en *Siguiente*.
5. **Hora de inicio:** Configura `23:00:00` (o la hora deseada fuera del horario laboral) -> *Siguiente*.
6. **Acción:** Selecciona **Iniciar un programa** -> *Siguiente*.
7. **Programa o script:** escribe `powershell.exe`
8. **Agregar argumentos:**
   ```text
   -ExecutionPolicy Bypass -File "C:\Proyectos\Layerthree\backup-db.ps1"
   ```
9. **Iniciar en (opcional):** `C:\Proyectos\Layerthree\`
10. Clic en **Finalizar**.
11. En la lista de tareas, haz clic derecho sobre la tarea creada -> **Propiedades**:
    - Selecciona: **"Ejecutar tanto si el usuario inició sesión como si no"**.
    - Marca: **"Ejecutar con los privilegios más altos"**.
    - Guarda con la contraseña de tu usuario de Windows.

---

## 🔄 7. ARRANQUE AUTOMÁTICO TRAS REINICIO O CORTE DE LUZ

Para garantizar que la intranet vuelva a estar disponible automáticamente tras un reinicio del servidor:

1. **Docker Desktop:** Como se configuró en la sección 1.4, Docker Desktop iniciará automáticamente al encender el PC.
2. **Reinicio de Contenedores:** Todos los contenedores en `docker-compose.yml` están configurados con `restart: always`. Tan pronto como Docker Desktop inicie, levantará automáticamente los contenedores de MySQL, Backend y Frontend en el estado en que quedaron.

---

## 🔧 8. COMANDOS DE MANTENIMIENTO Y COMANDOS ÚTILES

### Ver Estado de los Contenedores
```powershell
docker-compose ps
```

### Ver Registros / Logs en Vivo (Debugging)
```powershell
# Logs de todos los servicios
docker-compose logs -f --tail=100

# Logs específicos del backend NestJS
docker logs -f bodega-backend-monolith

# Logs específicos del MySQL
docker logs -f bodega-mysql-monolith
```

### Reiniciar el Sistema Completo
```powershell
docker-compose restart
```

### Detener el Sistema
```powershell
docker-compose down
```

### Restaurar un Respaldo de Base de Datos SQL
Si necesitas restaurar una copia de seguridad previa:

```powershell
docker exec -i bodega-mysql-monolith mysql -u root -pR8mX4vP9qL2zW7rN5tJ1yC3uK6bQ8zP intranet_layerthree_db < backups\intranet_db_2026-08-06_1200.sql
```

---

## 📌 9. MATRIZ DE ACCESO DE USUARIOS EN LA RED LOCAL

Una vez completado el despliegue, cualquier dispositivo en la oficina puede acceder abriendo el navegador web:

- **Plataforma Web (Frontend):** `http://192.168.1.100` (o `http://localhost` desde el servidor)
- **API REST (Backend):** `http://192.168.1.100:3001/api`
- **Soporte y Consultas:** `mypage.development@gmail.com` | [mypage.cl](https://mypage.cl)
