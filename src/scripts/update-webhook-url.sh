#!/bin/bash

# Script para mantener actualizada la URL del webhook en el archivo .env
# Este script se ejecuta periódicamente para actualizar la URL del webhook en el archivo .env

# Obtener la URL del túnel de serveo
TUNNEL_LOG=$(cat ~/proyectos-nodejs/botito/logs/tunnel.log)
TUNNEL_URL=$(echo "$TUNNEL_LOG" | grep "Forwarding HTTP traffic from" | tail -1 | sed 's/.*from //')

if [ -z "$TUNNEL_URL" ]; then
  echo "Error: No se pudo obtener la URL del túnel de serveo"
  exit 1
fi

echo "URL del túnel de serveo: $TUNNEL_URL"

# Obtener la URL actual del webhook en el archivo .env
CURRENT_URL=$(grep "KONECTE_WEBHOOK_URL" ~/proyectos-nodejs/botito/.env | cut -d'=' -f2)

echo "URL actual del webhook: $CURRENT_URL"

# Si la URL ha cambiado, actualizar el archivo .env
if [ "$CURRENT_URL" != "$TUNNEL_URL" ]; then
  echo "La URL del webhook ha cambiado. Actualizando archivo .env..."
  sed -i "s|KONECTE_WEBHOOK_URL=.*|KONECTE_WEBHOOK_URL=$TUNNEL_URL|" ~/proyectos-nodejs/botito/.env
  echo "Archivo .env actualizado correctamente."
else
  echo "La URL del webhook no ha cambiado. No es necesario actualizar el archivo .env."
fi

# Imprimir la URL actual para que pueda ser utilizada por otros scripts
echo "URL del webhook: $TUNNEL_URL" 