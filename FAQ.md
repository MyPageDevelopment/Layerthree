# Preguntas Frecuentes (FAQ)

## Instalación y Configuración

### ¿Qué necesito instalar para ejecutar el proyecto?
Solo necesitas **Docker Desktop** para Windows. Docker incluye todo lo necesario para ejecutar el sistema completo (base de datos, backend y frontend).

### ¿Cómo inicio el sistema por primera vez?
1. Instala Docker Desktop
2. Abre PowerShell en la carpeta del proyecto
3. Ejecuta: `docker-compose up -d --build`
4. Espera 2-3 minutos
5. Accede a http://localhost:3000

### ¿Los datos se mantienen al reiniciar?
Sí, los datos de la base de datos se guardan en un volumen Docker persistente llamado `mysql_data`. Incluso si detienes los contenedores, los datos permanecen.

### ¿Cómo elimino todos los datos y empiezo de cero?
```powershell
docker-compose down -v
docker-compose up -d --build
```
⚠️ **Advertencia:** Esto eliminará TODOS los datos de la base de datos.

## Usuarios y Permisos

### ¿Cuáles son los usuarios por defecto?
- **Admin**: admin@bodega.com / Admin123!
- **Viewer**: viewer@bodega.com / Viewer123!

### ¿Cómo creo nuevos usuarios?
Actualmente no hay interfaz para crear usuarios. Debes agregarlos directamente en la base de datos o modificar el archivo `backend/prisma/seed.ts` y re-ejecutar el seed.

### ¿Qué puede hacer cada rol?

**Administrador (ADMIN):**
- Ver todos los productos
- Crear, editar y eliminar productos
- Registrar movimientos (entradas/salidas)
- Ver el historial completo

**Visualizador (VIEWER):**
- Ver todos los productos
- Ver movimientos
- Ver el dashboard
- NO puede modificar nada

## Uso del Sistema

### ¿Cómo registro una entrada de material?
1. Ve a "Movimientos"
2. Clic en "+ Registrar Movimiento"
3. Selecciona "Entrada"
4. Elige el producto y la cantidad
5. Opcionalmente agrega un ID de proyecto
6. Guarda

### ¿Cómo registro una salida de material?
Mismo proceso que entrada, pero selecciona "Salida". El sistema validará que haya stock suficiente.

### ¿Qué pasa si intento sacar más material del que hay?
El sistema mostrará un error indicando el stock disponible vs. la cantidad solicitada. No permitirá stock negativo.

### ¿Para qué sirve el ID de proyecto?
Te permite rastrear a qué proyecto se destinó el material. Es útil para reportes y auditorías.

## Problemas Comunes

### Error: "Cannot connect to MySQL"
**Solución:**
1. Verifica que Docker esté corriendo: `docker ps`
2. Espera 30 segundos más (MySQL puede tardar en iniciar)
3. Revisa los logs: `docker-compose logs mysql`

### Error: "Port 3000 is already in use"
**Solución:**
Otro servicio está usando el puerto 3000. Opciones:
1. Detén el otro servicio
2. Cambia el puerto en `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "8080:3000"  # Usa puerto 8080 en lugar de 3000
```

### Error: "Port 3306 is already in use"
**Solución:**
Tienes MySQL instalado localmente. Opciones:
1. Detén el MySQL local
2. Cambia el puerto en `docker-compose.yml`:
```yaml
mysql:
  ports:
    - "3307:3306"  # Usa puerto 3307
```
También actualiza el `DATABASE_URL` en el backend.

### La página no carga o muestra errores
**Solución:**
1. Verifica que todos los servicios estén corriendo: `docker-compose ps`
2. Revisa los logs: `docker-compose logs -f`
3. Reinicia los servicios: `docker-compose restart`

### No puedo hacer login
**Solución:**
1. Verifica las credenciales exactas (case-sensitive)
2. Revisa que el backend esté corriendo: `docker-compose logs backend`
3. Verifica la conexión a la base de datos: `docker-compose logs mysql`

## Despliegue en Servidor

### ¿Cómo despliego en un servidor de la empresa?
1. Copia todo el proyecto al servidor
2. Edita `docker-compose.yml` y cambia la IP en `NEXT_PUBLIC_API_URL`
3. Ejecuta: `docker-compose up -d --build`
4. Configura el firewall para permitir puertos 3000 y 3001

### ¿Puedo acceder desde otros computadores?
Sí, usando la IP del servidor: `http://IP_SERVIDOR:3000`

### ¿Es seguro para producción?
El sistema incluye:
- ✅ Autenticación JWT
- ✅ Contraseñas hasheadas
- ✅ Validación de datos
- ✅ Control de acceso por roles

**Recomendaciones adicionales:**
- Cambia el `JWT_SECRET` en producción
- Usa contraseñas más complejas
- Configura HTTPS con un reverse proxy (nginx)
- Haz respaldos regulares de la base de datos

## Mantenimiento

### ¿Cómo hago un respaldo de la base de datos?
```powershell
# Exportar
docker exec bodega_mysql mysqldump -u bodega -pbodega123 bodega_db > backup_$(Get-Date -Format 'yyyyMMdd').sql

# Importar
docker exec -i bodega_mysql mysql -u bodega -pbodega123 bodega_db < backup.sql
```

### ¿Cómo actualizo el sistema?
1. Haz respaldo de la base de datos
2. Reemplaza los archivos del código
3. Ejecuta: `docker-compose up -d --build`

### ¿Cómo veo los logs del sistema?
```powershell
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

### ¿Cuánto espacio en disco necesito?
- Código fuente: ~50 MB
- Imágenes Docker: ~2 GB
- Base de datos: Variable (depende del uso, estima ~100 MB por 10,000 registros)

## Desarrollo

### ¿Cómo ejecuto el proyecto en modo desarrollo?
1. Inicia solo MySQL: `docker-compose up -d mysql`
2. Backend: `cd backend && npm install && npm run start:dev`
3. Frontend: `cd frontend && npm install && npm run dev`

### ¿Cómo agrego nuevos productos de ejemplo?
Edita `backend/prisma/seed.ts` y ejecuta:
```powershell
cd backend
npx prisma db seed
```

### ¿Puedo modificar el diseño?
Sí, los archivos están en `frontend/src/app` y usan Tailwind CSS para estilos.

### ¿Cómo agrego nuevos campos a los productos?
1. Edita `backend/prisma/schema.prisma`
2. Ejecuta: `npx prisma migrate dev --name nueva_migracion`
3. Actualiza los DTOs en `backend/src/products/dto`
4. Actualiza los formularios en el frontend

## Contacto y Soporte

### ¿Dónde reporto problemas?
Contacta al departamento de TI de la empresa.

### ¿El código está documentado?
Sí, revisa los archivos:
- `README.md` - Documentación general
- `API.md` - Documentación de la API
- `DEPLOY.md` - Guía de despliegue

### ¿Puedo personalizar el sistema?
Sí, el código fuente está completamente disponible para modificaciones según las necesidades de la empresa.
