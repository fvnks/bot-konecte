#!/bin/bash

# Script para instalar el servicio systemd de ngrok

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then
  echo "Este script debe ejecutarse como root (sudo)"
  exit 1
fi

# Rutas
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
SERVICE_FILE="$SCRIPT_DIR/ngrok.service"
SYSTEMD_DIR="/etc/systemd/system"

# Copiar el archivo de servicio
echo "Copiando archivo de servicio a $SYSTEMD_DIR..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/ngrok.service"

# Recargar systemd
echo "Recargando systemd..."
systemctl daemon-reload

# Habilitar el servicio
echo "Habilitando el servicio ngrok..."
systemctl enable ngrok.service

# Iniciar el servicio
echo "Iniciando el servicio ngrok..."
systemctl start ngrok.service

# Verificar el estado
echo "Estado del servicio ngrok:"
systemctl status ngrok.service

echo ""
echo "Instalación completada. El servicio ngrok se iniciará automáticamente al arrancar el sistema."
echo "Para verificar el estado: sudo systemctl status ngrok.service"
echo "Para detener el servicio: sudo systemctl stop ngrok.service"
echo "Para iniciar el servicio: sudo systemctl start ngrok.service"
echo "Para reiniciar el servicio: sudo systemctl restart ngrok.service" 