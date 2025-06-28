#!/bin/bash

# Script para configurar No-IP
# Este script configura el cliente de No-IP para mantener actualizada la IP pública

# Colores para mejor legibilidad
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con formato
print_message() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si No-IP está instalado
if [ ! -f "/home/rodrigod/noip-2.1.9-1/noip2" ]; then
  print_warning "No-IP no está instalado. Instalándolo..."
  
  # Descargar e instalar No-IP
  cd /tmp
  wget http://www.no-ip.com/client/linux/noip-duc-linux.tar.gz
  tar xzf noip-duc-linux.tar.gz
  cd noip-*
  make
  sudo make install
  
  print_message "No-IP instalado correctamente."
else
  print_message "El servicio de No-IP ya está configurado."
fi

# Verificar si No-IP está en ejecución
if pgrep -x "noip2" > /dev/null; then
  print_message "El servicio de No-IP ya está en ejecución."
else
  print_message "Iniciando el servicio de No-IP..."
  sudo /home/rodrigod/noip-2.1.9-1/noip2
fi

# Mostrar estado de No-IP
print_message "Estado del servicio de No-IP:"
sudo /home/rodrigod/noip-2.1.9-1/noip2 -S

# Actualizar el archivo .env para usar rodriservcl.ddns.net
ENV_FILE="/home/rodrigod/proyectos-nodejs/botito/.env"
if [ -f "$ENV_FILE" ]; then
  print_message "Actualizando el archivo .env para usar rodriservcl.ddns.net..."
  sed -i 's|KONECTE_WEBHOOK_URL=https://.*|KONECTE_WEBHOOK_URL=https://rodriservcl.ddns.net|' "$ENV_FILE"
  print_message "Archivo .env actualizado correctamente."
else
  print_error "No se encontró el archivo .env."
fi

print_message "Configuración de No-IP completada. rodriservcl.ddns.net ahora apunta a la IP pública de este servidor." 