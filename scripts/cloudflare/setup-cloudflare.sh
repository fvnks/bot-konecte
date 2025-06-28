#!/bin/bash

# Script para instalar todas las dependencias necesarias para Puppeteer y Cloudflare Tunnel
# Este script debe ejecutarse con sudo

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

# Actualizar lista de paquetes
print_message "Actualizando lista de paquetes..."
apt-get update

# Instalar dependencias para Puppeteer
print_message "Instalando dependencias para Puppeteer..."
apt-get install -y \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libasound2t64 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libxshmfence1 \
  fonts-liberation \
  fonts-noto-color-emoji \
  fonts-noto-cjk

# Instalar Cloudflared
print_message "Instalando Cloudflared..."
if [ -f "/usr/bin/cloudflared" ]; then
  print_warning "Cloudflared ya está instalado. Actualizando..."
  cloudflared update
else
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  rm /tmp/cloudflared.deb
fi

# Verificar la instalación
print_message "Verificando la instalación..."
if command -v cloudflared &> /dev/null; then
  print_message "Cloudflared instalado correctamente: $(cloudflared --version)"
else
  print_error "Error al instalar Cloudflared."
fi

print_message "Instalación completada."
print_message "Para iniciar el bot con todas las dependencias, ejecuta: cd ~/proyectos-nodejs/botito && npm run dev" 