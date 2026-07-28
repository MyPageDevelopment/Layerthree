# Configuración del Servicio de Email - Sistema de Calendario

## Descripción General

El sistema de calendario ahora cuenta con un servicio completo de notificaciones por correo electrónico. Los usuarios pueden recibir notificaciones automáticas cuando se les asigna una tarea, con todos los detalles relevantes de la asignación.

## Características del Servicio de Email

### 1. **Servicio Global (EmailService)**
- Módulo global disponible en toda la aplicación
- Basado en **Nodemailer** para envío de correos
- Templates HTML profesionales y responsive
- Configuración dinámica de credenciales SMTP

### 2. **Notificaciones de Asignación de Tareas**
Cuando se crea una tarea y se marcan participantes con la casilla "Enviar correo de asignación", cada participante recibe un email con:

- **Información de la tarea:**
  - Título y descripción completa
  - Proyecto y milestone asociado
  - Prioridad (con códigos de color: Baja/Verde, Media/Amarillo, Alta/Rojo)
  - Fecha límite formateada
  - Nombre del usuario que asignó la tarea

- **Diseño del Email:**
  - Header con gradiente morado
  - Tarjeta detallada con toda la información
  - Botón call-to-action para acceder a "Mis Tareas"
  - Footer informativo
  - Completamente responsive (móvil y desktop)

## Configuración Inicial

### Requisitos
- Servidor SMTP (Gmail, Outlook, servidor corporativo, etc.)
- Credenciales de autenticación (usuario y contraseña de aplicación)
- Puerto y configuración SSL/TLS

### Configuración del Servicio

El servicio de email se configura dinámicamente desde el código. **No está habilitado por defecto hasta que se proporcionen las credenciales.**

#### Opción 1: Configuración mediante endpoint (Recomendado para administradores)

Puedes crear un endpoint de administración para configurar el servicio:

```typescript
// En src/app.controller.ts o un controller de admin
import { EmailService, EmailConfig } from './emails/email.service';

@Post('admin/configure-email')
@UseGuards(AdminGuard) // Solo administradores
configureEmail(@Body() config: EmailConfig) {
  this.emailService.configureEmail(config);
  return { message: 'Email service configured successfully' };
}
```

Luego enviar una petición POST:
```bash
curl -X POST http://localhost/api/calendar/admin/configure-email \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "tu-email@gmail.com",
      "pass": "tu-contraseña-de-aplicación"
    }
  }'
```

#### Opción 2: Configuración en el código de inicio

Edita `src/main.ts` y agrega la configuración después de iniciar la app:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... otras configuraciones ...
  
  // Configurar email service
  const emailService = app.get(EmailService);
  emailService.configureEmail({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  
  await app.listen(3003);
}
```

Luego agrega variables de entorno al contenedor Docker en `docker-compose.microservices.yml`:

```yaml
calendar-backend:
  environment:
    - SMTP_HOST=smtp.gmail.com
    - SMTP_PORT=587
    - SMTP_SECURE=false
    - SMTP_USER=tu-email@gmail.com
    - SMTP_PASS=tu-contraseña-de-aplicación
    - EMAIL_FROM=Sistema Bodega <noreply@bodega.local>
```

### Configuración para Gmail

1. **Habilitar autenticación de 2 pasos** en tu cuenta de Gmail
2. **Generar contraseña de aplicación:**
   - Ve a https://myaccount.google.com/security
   - Busca "Contraseñas de aplicaciones"
   - Genera una nueva para "Correo" en "Otro dispositivo"
   - Usa esta contraseña de 16 caracteres en `SMTP_PASS`

3. **Configuración:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "tu-email@gmail.com",
    "pass": "abcd efgh ijkl mnop"
  }
}
```

### Configuración para Outlook/Office 365

```json
{
  "host": "smtp.office365.com",
  "port": 587,
  "secure": false,
  "auth": {
    "user": "tu-email@empresa.com",
    "pass": "tu-contraseña"
  }
}
```

### Configuración para Servidor SMTP Corporativo

```json
{
  "host": "mail.tuempresa.com",
  "port": 465,
  "secure": true,
  "auth": {
    "user": "sistema@tuempresa.com",
    "pass": "contraseña-segura"
  }
}
```

## Uso del Sistema

### Desde el Frontend

1. **Crear una nueva tarea** en el calendario
2. **Seleccionar participantes** usando los checkboxes
3. **Marcar la casilla** "📧 Enviar correo de asignación"
4. **Guardar la tarea**

Si el servicio de email está configurado, todos los participantes seleccionados recibirán un correo automáticamente.

### Verificación del Estado

Puedes verificar si el servicio está configurado:

```typescript
// En cualquier parte del código
const isConfigured = this.emailService.isConfigured();
console.log('Email service configured:', isConfigured);
```

O verificar la conexión SMTP:

```typescript
const isConnected = await this.emailService.verifyConnection();
console.log('SMTP connection OK:', isConnected);
```

## Estructura del Email Enviado

### Vista Previa del Email

```
╔══════════════════════════════════════════════╗
║  📋 Nueva Tarea Asignada                     ║
║  (Header con gradiente morado)               ║
╚══════════════════════════════════════════════╝

Hola [Nombre del Participante],

Se te ha asignado una nueva tarea en el sistema de
gestión de bodega:

┌──────────────────────────────────────────────┐
│ [Título de la Tarea]                         │
├──────────────────────────────────────────────┤
│ Descripción                                  │
│ [Descripción completa de la tarea]           │
├──────────────────────────────────────────────┤
│ Proyecto: [Nombre del Proyecto]              │
│ Hito: [Nombre del Milestone]                 │
├──────────────────────────────────────────────┤
│ Prioridad: [ALTA]    Fecha: 15 Enero 2025   │
└──────────────────────────────────────────────┘

Asignado por: [Nombre del Asignador]

        [  Ver Mis Tareas  ]  ← Botón

Accede al sistema para gestionar esta tarea y
colaborar con tu equipo.

────────────────────────────────────────────────
Este es un correo automático del Sistema de
Gestión de Bodega.
Por favor no respondas a este mensaje.
```

## API del EmailService

### Métodos Disponibles

```typescript
interface EmailService {
  // Configurar credenciales SMTP
  configureEmail(config: EmailConfig): void;
  
  // Verificar si está configurado
  isConfigured(): boolean;
  
  // Verificar conexión SMTP
  verifyConnection(): Promise<boolean>;
  
  // Enviar notificación de tarea
  sendTaskAssignmentNotification(data: TaskNotificationData): Promise<boolean>;
}
```

### Interfaces

```typescript
interface EmailConfig {
  host: string;       // smtp.gmail.com
  port: number;       // 587 o 465
  secure: boolean;    // true si port=465
  auth: {
    user: string;     // email de envío
    pass: string;     // contraseña de aplicación
  };
}

interface TaskNotificationData {
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  milestoneName?: string;
  priority: string;              // LOW, MEDIUM, HIGH
  dueDate?: Date;
  assignedBy: string;
  recipientEmail: string;
  recipientName: string;
}
```

## Solución de Problemas

### El servicio no envía correos

1. **Verificar configuración:**
```bash
# En los logs del backend buscar:
docker logs calendar_backend | grep "Email"
```

Deberías ver:
```
[EmailService] Email transporter configured successfully
```

2. **Verificar credenciales:**
   - Asegúrate de usar contraseña de aplicación (no contraseña normal)
   - Verifica que el host y puerto sean correctos
   - Confirma que el usuario tenga permisos de envío

3. **Verificar conexión:**
   - El firewall debe permitir tráfico saliente en puerto 587/465
   - El contenedor Docker debe tener acceso a internet

### Los correos llegan a spam

- Configura registros SPF y DKIM en tu dominio
- Usa un servidor SMTP corporativo en lugar de Gmail
- Personaliza el campo `EMAIL_FROM` en las variables de entorno

### Errores comunes

**Error: "Invalid login"**
- Usa contraseña de aplicación, no contraseña normal
- Verifica que 2FA esté habilitado en Gmail

**Error: "Connection timeout"**
- Verifica la conexión a internet del contenedor
- Confirma que el puerto no esté bloqueado por firewall

**Error: "Self signed certificate"**
- Agrega `tls: { rejectUnauthorized: false }` a la configuración (solo desarrollo)

## Próximas Mejoras

- [ ] Panel de administración web para configurar SMTP
- [ ] Logs de correos enviados en base de datos
- [ ] Templates personalizables por empresa
- [ ] Notificaciones de cambios de estado de tarea
- [ ] Recordatorios de tareas próximas a vencer
- [ ] Resumen semanal de tareas por email

## Archivo de Configuración

**Ubicación:** `services/calendar/backend/src/emails/email.service.ts`

---

**Documentación generada:** 30 de Diciembre, 2025
**Versión:** 1.0.0
**Sistema:** Gestión de Bodega - Módulo Calendario
