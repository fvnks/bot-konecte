#!/bin/bash

# Script para configurar un proxy reverso con Nginx
# Este script configura Nginx para redireccionar de konecte.ddns.net a la URL de serveo actual

# Verificar si Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo "Nginx no está instalado. Instalando..."
    sudo apt update
    sudo apt install -y nginx
fi

# Obtener la URL del túnel de serveo
TUNNEL_LOG=$(cat ~/proyectos-nodejs/botito/logs/tunnel.log)
TUNNEL_URL=$(echo "$TUNNEL_LOG" | grep "Forwarding HTTP traffic from" | tail -1 | sed 's/.*from //')

if [ -z "$TUNNEL_URL" ]; then
    echo "Error: No se pudo obtener la URL del túnel de serveo"
    exit 1
fi

echo "URL del túnel de serveo: $TUNNEL_URL"

# Crear la configuración de Nginx
NGINX_CONFIG="server {
    listen 80;
    server_name konecte.ddns.net;

    location / {
        proxy_pass $TUNNEL_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
"

# Guardar la configuración en un archivo
echo "$NGINX_CONFIG" | sudo tee /www/server/nginx/conf/vhost/konecte.ddns.net.conf > /dev/null

# No es necesario habilitar el sitio en esta configuración

# Verificar la configuración de Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

echo "Proxy reverso configurado correctamente. konecte.ddns.net ahora redirecciona a $TUNNEL_URL" 