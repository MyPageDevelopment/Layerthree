# 🚀 GUÍA DE DESPLIEGUE EN SERVIDOR LOCAL (LAN) - LAYERTHREE

Manual completo para la configuración y despliegue del **Sistema Intranet Layerthree (Monolito Modular)** en un servidor local físico dentro de la red corporativa.

---

## 📋 Requisitos del Servidor Físico

- **Sistema Operativo:** Windows Server / Windows 10/11 Pro O Linux (Ubuntu 22.04 LTS / Debian).
- **Docker & Docker Compose:** Docker Desktop (Windows) o Docker Engine + Compose v2 (Linux).
- **Red:** Dirección IP Estática asignada en la LAN corporativa (Ejemplo: `192.168.1.150`).

---

## ⚙️ 1. Configuración de Variables de Entorno

1. En la raíz de la carpeta del proyecto en el servidor, copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edita el archivo `.env` ajustando la IP local del servidor en la variable `NEXT_PUBLIC_API_URL`:
   ```env
   # Reemplaza 192.168.1.150 por la IP estática real de tu servidor LAN
   NEXT_PUBLIC_API_URL=http://192.168.1.150:3001/api
   ```

---

## 🚀 2. Ejecución del Despliegue Automático

### Opción A: Servidor Windows (PowerShell)
Abre PowerShell como Administrador en la carpeta del proyecto y ejecuta:
```powershell
.\deploy-local.ps1
```

### Opción B: Servidor Linux (Bash)
Abre una terminal bash en el servidor y ejecuta:
```bash
chmod +x deploy-local.sh backup-db.sh
./deploy-local.sh
```

---

## 💾 3. Respaldos Automáticos de Base de Datos (Backups)

El script de respaldo genera archivos `.sql` fechados en la carpeta `./backups/` y elimina automáticamente aquellos con más de 30 días de antigüedad.

### Ejecución Manual del Respaldo:
- **Windows:** `.\backup-db.ps1`
- **Linux:** `./backup-db.sh`

### Programación de Respaldos Diarios Automáticos:
- **Windows (Programador de Tareas):** Crea una tarea diaria ejecutando `powershell.exe -File C:\Ruta\Layerthree\backup-db.ps1`.
- **Linux (Cron Job):** Agrega la siguiente línea en `crontab -e` para ejecutar el respaldo todas las noches a las 02:00 AM:
  ```cron
  0 2 * * * /bin/bash /ruta/Layerthree/backup-db.sh >> /ruta/Layerthree/backups/backup.log 2>&1
  ```

---

## 🌐 Cuentas de Acceso y Mapeo de Puertos

| Servicio | Puerto Local | URL de Acceso LAN |
| :--- | :--- | :--- |
| **Plataforma Web (Frontend)** | `80` (y `3000`) | `http://<IP_LOCAL_SERVIDOR>` |
| **API Backend** | `3001` | `http://<IP_LOCAL_SERVIDOR>:3001/api` |
| **Documentación Swagger** | `3001` | `http://<IP_LOCAL_SERVIDOR>:3001/api/docs` |

### Credenciales Base (Base de Datos Sembrada):
- **Super Admin:** `danielbelozoo@gmail.com` / `Admin2026!`

---

## 🛠️ Soporte Técnico
Desarrollado con ❤️ por **[mypage.cl](https://mypage.cl)**  
Soporte Técnico: `mypage.development@gmail.com`
