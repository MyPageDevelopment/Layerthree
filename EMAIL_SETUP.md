# 📧 Guía Rápida - Configuración de Email

## Estado Actual
✅ **Sistema instalado y funcionando**
⚠️ **Email NO configurado** - Necesita credenciales SMTP

## Configuración en 3 Pasos

### Paso 1: Copiar archivo de ejemplo
```bash
cd "d:\Páginas Web\Bodega"
Copy-Item .env.example .env
```

### Paso 2: Editar archivo .env

Abre el archivo `.env` y configura según tu proveedor:

#### Opción A: Gmail (Recomendado para pruebas)

1. Ve a tu cuenta de Google → Seguridad
2. Habilita "Verificación en dos pasos"
3. Ve a "Contraseñas de aplicaciones" → Genera nueva
4. Copia la contraseña de 16 caracteres

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
EMAIL_FROM=Sistema Bodega <tu-email@gmail.com>
```

#### Opción B: Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@empresa.com
SMTP_PASS=tu-contraseña
EMAIL_FROM=Sistema Bodega <tu-email@empresa.com>
```

#### Opción C: Servidor Corporativo

```env
SMTP_HOST=mail.tuempresa.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=sistema@tuempresa.com
SMTP_PASS=contraseña-segura
EMAIL_FROM=Sistema Bodega <sistema@tuempresa.com>
```

### Paso 3: Reiniciar contenedor

```bash
cd "d:\Páginas Web\Bodega"
docker-compose -f docker-compose.microservices.yml restart calendar_backend
```

## Verificación

```bash
# Buscar mensaje de configuración exitosa
docker logs calendar_backend | Select-String "Email"
```

Deberías ver:
```
✅ Email service configured and connected successfully
```

## Uso

1. **Crear nueva tarea** en http://172.16.11.174/projects/calendario
2. **Seleccionar participantes** con los checkboxes
3. **Marcar** "📧 Enviar correo de asignación"
4. **Guardar** - Los participantes recibirán el email

## Problemas Comunes

### "Invalid login" con Gmail
- Usa **contraseña de aplicación**, no tu contraseña normal
- Verifica que 2FA esté habilitado

### "Connection timeout"
- Verifica firewall del servidor
- Confirma conectividad a internet del contenedor

### No recibo correos
- Revisa carpeta de spam
- Verifica logs: `docker logs calendar_backend`

## Soporte

Documentación completa: `services/calendar/backend/EMAIL_CONFIGURATION.md`

---
**Generado:** 30 Diciembre 2025
