# 🚀 Despliegue Rápido - Funcionalidades Empresariales

## ⚡ Ejecución Automática (Recomendado)

### Windows (PowerShell)
```powershell
cd "d:\Páginas Web\Bodega"
.\scripts\migrate-enterprise-features.ps1
```

### Linux/Mac
```bash
cd /path/to/Bodega
chmod +x scripts/migrate-enterprise-features.sh
./scripts/migrate-enterprise-features.sh
```

---

## 🔧 Ejecución Manual

Si el script automático falla, ejecuta estos pasos:

### 1. Acceder al contenedor
```bash
docker exec -it bodega-calendar-backend-1 bash
```

### 2. Dentro del contenedor, ejecutar:
```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Ejecutar migración
npx prisma migrate dev --name add_enterprise_features

# Salir
exit
```

### 3. Reiniciar el backend
```bash
docker restart bodega-calendar-backend-1
```

---

## ✅ Verificación

### 1. Verificar que el backend esté corriendo
```bash
curl http://localhost/api/calendar/projects
```

### 2. Probar endpoint de recurrencia
```bash
curl -X POST http://localhost/api/calendar/recurrence/TASK_ID \
  -H "Content-Type: application/json" \
  -d '{"frequency":"WEEKLY","interval":1,"byWeekDay":["MO","WE","FR"],"count":10}'
```

Deberías recibir un response 201 o 404 (si no existe la tarea).

---

## 📚 Próximos Pasos

1. Leer la documentación completa: `services/calendar/backend/ENTERPRISE_FEATURES.md`
2. Probar los ejemplos de la sección "Testing de las APIs"
3. Implementar componentes React usando la sección "Guía de Integración Frontend"

---

## 🐛 Troubleshooting

**Error: "Can't reach database server"**
- Asegúrate de que MySQL esté corriendo: `docker ps | grep mysql`

**Error: "unknown authentication plugin"**
- Ejecuta la migración desde dentro del contenedor (método manual)

**Error: "Module not found: rrule"**
- Reinstala dependencias: `docker exec bodega-calendar-backend-1 npm install`

---

## 📊 Endpoints Disponibles

Consulta `ENTERPRISE_FEATURES.md` para la lista completa de endpoints y ejemplos.

**Principales:**
- `POST /api/calendar/recurrence/:taskId` - Crear evento recurrente
- `GET /api/calendar/resources/:id/availability` - Verificar disponibilidad
- `GET /api/calendar/availability/teams/free-busy` - Ver horarios libres
- `POST /api/calendar/attendance/tasks/:id/invitations` - Enviar invitaciones
