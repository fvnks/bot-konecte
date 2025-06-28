#!/bin/bash

# Script para actualizar automáticamente la configuración de Nginx cuando cambie la URL de serveo
# Este script se ejecuta periódicamente para actualizar la configuración de Nginx

# Obtener la URL del túnel de serveo
TUNNEL_LOG=$(cat ~/proyectos-nodejs/botito/logs/tunnel.log)
TUNNEL_URL=$(echo "$TUNNEL_LOG" | grep "Forwarding HTTP traffic from" | tail -1 | sed 's/.*from //')

if [ -z "$TUNNEL_URL" ]; then
    echo "Error: No se pudo obtener la URL del túnel de serveo"
    exit 1
fi

echo "URL del túnel de serveo: $TUNNEL_URL"

# Verificar si el archivo de configuración de Nginx existe
if [ ! -f /www/server/nginx/conf/vhost/konecte.ddns.net.conf ]; then
    echo "El archivo de configuración de Nginx no existe. Ejecutando script de configuración inicial..."
    ~/proyectos-nodejs/botito/src/scripts/setup-nginx-proxy.sh
    exit 0
fi

# Obtener la URL actual en la configuración de Nginx
CURRENT_URL=$(grep -o "proxy_pass [^;]*" /www/server/nginx/conf/vhost/konecte.ddns.net.conf | sed 's/proxy_pass //')

echo "URL actual en la configuración de Nginx: $CURRENT_URL"

# Si la URL ha cambiado, actualizar la configuración de Nginx
if [ "$CURRENT_URL" != "$TUNNEL_URL" ]; then
    echo "La URL del túnel ha cambiado. Actualizando configuración de Nginx..."
    
    # Actualizar la configuración de Nginx
    sudo sed -i "s|proxy_pass .*|proxy_pass $TUNNEL_URL;|" /www/server/nginx/conf/vhost/konecte.ddns.net.conf
    
    # Verificar la configuración de Nginx
    sudo nginx -t
    
    # Reiniciar Nginx
    sudo systemctl restart nginx
    
    echo "Configuración de Nginx actualizada correctamente."
else
    echo "La URL del túnel no ha cambiado. No es necesario actualizar la configuración de Nginx."
fi

# Actualizar también el archivo .env para mantener la consistencia
sed -i "s|KONECTE_WEBHOOK_URL=.*|KONECTE_WEBHOOK_URL=https://konecte.ddns.net|" ~/proyectos-nodejs/botito/.env

echo "Archivo .env actualizado para usar konecte.ddns.net como URL del webhook." 