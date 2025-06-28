#!/bin/bash

# Script para configurar Nginx como proxy reverso
# Este script configura Nginx para redirigir el tráfico de rodriservcl.ddns.net a la URL de serveo

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

# Verificar si Nginx está instalado
if ! command -v nginx &> /dev/null; then
  print_warning "Nginx no está instalado. Instalándolo..."
  sudo apt-get update
  sudo apt-get install -y nginx
  print_message "Nginx instalado correctamente."
fi

# Obtener la URL actual de serveo
SERVEO_URL=$(grep -o "https://[^\"]*\.serveo\.net" /home/rodrigod/proyectos-nodejs/botito/logs/tunnel.log | tail -1)

if [ -z "$SERVEO_URL" ]; then
  print_error "No se pudo obtener la URL de serveo. Asegúrate de que el túnel esté activo."
  exit 1
fi

print_message "URL de serveo detectada: $SERVEO_URL"

# Crear la configuración de Nginx
NGINX_CONFIG="server {
    listen 80;
    listen [::]:80;
    server_name rodriservcl.ddns.net;

    location / {
        proxy_pass $SERVEO_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name rodriservcl.ddns.net;

    # Configuración SSL autofirmada (temporal)
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    location / {
        proxy_pass $SERVEO_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}"

# Crear directorio para certificados SSL si no existe
if [ ! -d "/etc/nginx/ssl" ]; then
  print_message "Creando directorio para certificados SSL..."
  sudo mkdir -p /etc/nginx/ssl
fi

# Generar certificados SSL autofirmados si no existen
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
  print_message "Generando certificados SSL autofirmados..."
  sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt -subj "/CN=rodriservcl.ddns.net"
fi

# Guardar la configuración de Nginx
print_message "Guardando la configuración de Nginx..."
echo "$NGINX_CONFIG" | sudo tee /etc/nginx/sites-available/rodriservcl.ddns.net > /dev/null

# Habilitar el sitio
if [ ! -L "/etc/nginx/sites-enabled/rodriservcl.ddns.net" ]; then
  print_message "Habilitando el sitio..."
  sudo ln -s /etc/nginx/sites-available/rodriservcl.ddns.net /etc/nginx/sites-enabled/
fi

# Verificar la configuración de Nginx
print_message "Verificando la configuración de Nginx..."
sudo nginx -t

if [ $? -eq 0 ]; then
  print_message "Reiniciando Nginx..."
  sudo systemctl restart nginx
  print_message "Nginx reiniciado correctamente."
  
  # Actualizar el archivo .env para usar rodriservcl.ddns.net
  ENV_FILE="/home/rodrigod/proyectos-nodejs/botito/.env"
  if [ -f "$ENV_FILE" ]; then
    print_message "Actualizando el archivo .env para usar rodriservcl.ddns.net..."
    sed -i 's|KONECTE_WEBHOOK_URL=https://.*|KONECTE_WEBHOOK_URL=https://rodriservcl.ddns.net|' "$ENV_FILE"
    print_message "Archivo .env actualizado correctamente."
  else
    print_error "No se encontró el archivo .env."
  fi
  
  print_message "Configuración completada. rodriservcl.ddns.net ahora redirige a $SERVEO_URL"
  print_message "Asegúrate de que tu router redireccione los puertos 80 y 443 a este servidor."
else
  print_error "La configuración de Nginx tiene errores. Por favor, revisa la configuración."
fi 