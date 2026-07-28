FROM nginx:alpine

# Eliminar configuración por defecto
RUN rm -f /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar página principal estática
COPY public/ /usr/share/nginx/html/

# Crear directorios de logs
RUN mkdir -p /var/log/nginx

# Exponer puerto
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
