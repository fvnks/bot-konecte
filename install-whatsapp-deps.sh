#!/bin/bash

# Script para instalar todas las dependencias necesarias para WhatsApp Web.js
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

# Instalar dependencias para Puppeteer/Chrome
print_message "Instalando dependencias para Puppeteer/Chrome..."
apt-get install -y \
  gconf-service \
  libgbm-dev \
  libasound2 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget \
  fonts-noto-color-emoji \
  fonts-noto-cjk

# Verificar si Chrome ya está instalado
if command -v google-chrome &> /dev/null; then
  print_message "Google Chrome ya está instalado: $(google-chrome --version)"
else
  print_message "Instalando Google Chrome..."
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
  apt-get update
  apt-get install -y google-chrome-stable
  print_message "Google Chrome instalado: $(google-chrome --version)"
fi

# Configurar variables de entorno
print_message "Configurando variables de entorno..."
CHROME_PATH=$(which google-chrome)
echo "CHROME_PATH=$CHROME_PATH" >> /etc/environment
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> /etc/environment
echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> /etc/environment

# Configurar permisos para el directorio de sesión
print_message "Configurando permisos para el directorio de sesión..."
SESSION_DIR="/home/$(logname)/proyectos-nodejs/botito/wwjs_auth_info"
mkdir -p "$SESSION_DIR"
chown -R $(logname):$(logname) "$SESSION_DIR"
chmod -R 755 "$SESSION_DIR"

print_message "Instalación completada."
print_message "Para reiniciar el bot, ejecuta: cd ~/proyectos-nodejs/botito && pm2 restart botito-server"
print_message "O para iniciar una nueva sesión, ejecuta: cd ~/proyectos-nodejs/botito && node fix-whatsapp.js clean"