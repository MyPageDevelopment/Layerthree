# ✅ CHECKLIST DE DEPLOYMENT - INVENTARIO
## Lista de verificación pre-producción

---

## 🔐 SEGURIDAD

- [ ] Cambiar `MYSQL_ROOT_PASSWORD` en archivo `.env`
- [ ] Verificar secrets en `D:\Páginas Web\Bodega\secrets\`
  - [ ] jwt_secret.txt existe
  - [ ] jwt_refresh_secret.txt existe
- [ ] Ejecutar `.\scripts\rotate-jwt-secrets.ps1` (opcional)
- [ ] Firewall configurado: `.\abrir-firewall.ps1`

---

## 💾 PERSISTENCIA

- [ ] Verificar espacio en disco (mín. 100GB libres)
- [ ] Crear directorio de backups: `mkdir D:\backups\inventory`
- [ ] Configurar tarea programada para backups diarios
- [ ] Probar script de backup: `.\scripts\backup-inventory-db.ps1`
- [ ] Probar script de restauración

---

## 🐳 DOCKER

- [ ] Docker Desktop instalado y corriendo
- [ ] Verificar imágenes: `docker images`
- [ ] Limpiar contenedores viejos: `docker system prune -a`
- [ ] Verificar volúmenes: `docker volume ls`

---

## 🗄️ BASE DE DATOS

- [ ] Copiar `.env.production` a `.env` en backend
- [ ] Editar DATABASE_URL con credenciales reales
- [ ] Levantar MySQL: `docker-compose -f docker-compose.microservices.yml up -d mysql`
- [ ] Ejecutar migraciones: `docker-compose -f docker-compose.microservices.yml run --rm inventory-backend npx prisma migrate deploy`
- [ ] Verificar tabla `product_audits` existe

---

## 🚀 DEPLOYMENT

- [ ] Build de imágenes: `docker-compose -f docker-compose.microservices.yml build`
- [ ] Iniciar servicios: `.\start-microservices.ps1`
- [ ] Verificar contenedores corriendo: `docker ps`
- [ ] Revisar logs: `docker logs inventory_backend`

---

## ✅ VERIFICACIÓN

- [ ] Health check backend: `curl http://localhost:3001/health`
- [ ] Health check frontend: `curl http://localhost/inventory`
- [ ] Login funciona: `curl -X POST http://localhost/api/auth/login ...`
- [ ] Endpoints de productos responden
- [ ] Sistema de auditoría funciona: `curl http://localhost/api/inventory/products/audit/stats`
- [ ] Rate limiting activo (intentar 110 requests)

---

## 📊 AUDITORÍA

- [ ] Crear producto de prueba
- [ ] Actualizar producto de prueba
- [ ] Verificar auditoría: `GET /products/{id}/audit`
- [ ] Verificar que se registra usuario, IP, cambios

---

## 🔄 BACKUPS

- [ ] Ejecutar backup manual exitoso
- [ ] Verificar archivo `.zip` generado
- [ ] Verificar logs de backup
- [ ] Probar restauración en ambiente de prueba

---

## 📈 MONITOREO

- [ ] Configurar exportación de logs
- [ ] Verificar métricas de Docker: `docker stats`
- [ ] Configurar alertas (opcional)

---

## 📝 DOCUMENTACIÓN

- [ ] Leer `GUIA_DEPLOYMENT_INVENTARIO_PRODUCCION.md`
- [ ] Leer `AUDITORIA_INVENTARIO_PRODUCCION.md`
- [ ] Capacitar usuarios en sistema de auditoría
- [ ] Documentar credenciales en lugar seguro

---

## ✅ APROBACIÓN FINAL

- [ ] Todos los items anteriores completados
- [ ] Sistema probado por 24 horas en pre-producción
- [ ] Usuarios clave capacitados
- [ ] Plan de rollback definido

**Firma**: _________________  
**Fecha**: _________________

---

## 🚨 EN CASO DE PROBLEMAS

Ver sección **TROUBLESHOOTING** en:
- `GUIA_DEPLOYMENT_INVENTARIO_PRODUCCION.md`
- Logs: `docker logs inventory_backend`
- Contactar: Administrador de Sistemas
