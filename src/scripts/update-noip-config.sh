#!/bin/bash

# Script para actualizar la configuración de No-IP
# Este script actualiza la configuración de No-IP para apuntar a la URL de serveo

# Obtener la URL del túnel de serveo
TUNNEL_LOG=$(cat ~/proyectos-nodejs/botito/logs/tunnel.log)
TUNNEL_URL=$(echo "$TUNNEL_LOG" | grep "Forwarding HTTP traffic from" | sed 's/.*from //')

if [ -z "$TUNNEL_URL" ]; then
  echo "Error: No se pudo obtener la URL del túnel de serveo"
  exit 1
fi

echo "URL del túnel de serveo: $TUNNEL_URL"

# Extraer el dominio del túnel
TUNNEL_DOMAIN=$(echo $TUNNEL_URL | sed 's/https:\/\///')

echo "Dominio del túnel: $TUNNEL_DOMAIN"

# Actualizar el archivo hosts para que konecte.ddns.net apunte al dominio del túnel
# Esto es solo una simulación, ya que no podemos modificar la configuración de No-IP directamente
# En un entorno real, necesitarías usar la API de No-IP o configurar un servidor DNS

echo "Para configurar No-IP manualmente:"
echo "1. Accede a tu cuenta de No-IP en https://my.noip.com/"
echo "2. Ve a la sección de Dominios"
echo "3. Edita el dominio konecte.ddns.net"
echo "4. Configura un registro CNAME que apunte a: $TUNNEL_DOMAIN"
echo ""
echo "Alternativamente, puedes configurar tu router para que redireccione el puerto 80 a tu servidor local en el puerto 3001" 