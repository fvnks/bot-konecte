#!/bin/bash

# Script para configurar el archivo hosts local
# Este script configura el archivo hosts para redirigir rodriservcl.ddns.net a la IP local

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

# Verificar si el script se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  print_error "Este script debe ejecutarse como root (sudo)."
  exit 1
fi

# Obtener la IP local
IP_LOCAL=$(hostname -I | awk '{print $1}')

if [ -z "$IP_LOCAL" ]; then
  print_error "No se pudo obtener la IP local."
  exit 1
fi

print_message "IP local detectada: $IP_LOCAL"

# Verificar si ya existe una entrada para rodriservcl.ddns.net en el archivo hosts
if grep -q "rodriservcl.ddns.net" /etc/hosts; then
  print_warning "Ya existe una entrada para rodriservcl.ddns.net en el archivo hosts. Actualizándola..."
  sed -i "/rodriservcl.ddns.net/c\\$IP_LOCAL rodriservcl.ddns.net" /etc/hosts
else
  print_message "Agregando entrada para rodriservcl.ddns.net en el archivo hosts..."
  echo "$IP_LOCAL rodriservcl.ddns.net" >> /etc/hosts
fi

print_message "Archivo hosts actualizado correctamente."
print_message "rodriservcl.ddns.net ahora apunta a $IP_LOCAL"

# Mostrar el contenido actual del archivo hosts
print_message "Contenido actual del archivo hosts:"
grep "rodriservcl.ddns.net" /etc/hosts 