#!/bin/bash

# Script para iniciar ngrok

# Configuración
PORT=3001
REGION="us"
LOG_FILE="$HOME/proyectos-nodejs/botito/logs/ngrok.log"
URL_FILE="$HOME/proyectos-nodejs/botito/logs/last_ngrok_url.txt"

# Crear directorio de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

# Matar procesos de ngrok existentes
echo "Matando procesos de ngrok existentes..."
pkill -f ngrok || true

# Esperar un momento
sleep 2

# Iniciar ngrok en segundo plano
echo "Iniciando ngrok para el puerto $PORT..."
nohup ngrok http --region=$REGION $PORT > "$LOG_FILE" 2>&1 &

# Esperar a que ngrok se inicie
echo "Esperando a que ngrok se inicie..."
sleep 5

# Obtener la URL de ngrok
echo "Obteniendo URL de ngrok..."
for i in {1..10}; do
  if curl -s http://localhost:4040/api/tunnels > /dev/null; then
    URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*')
    if [ -n "$URL" ]; then
      echo "URL de ngrok: $URL"
      echo "$URL" > "$URL_FILE"
      echo "URL guardada en $URL_FILE"
      exit 0
    fi
  fi
  echo "Intento $i: No se pudo obtener la URL de ngrok, reintentando..."
  sleep 2
done

echo "Error: No se pudo obtener la URL de ngrok después de varios intentos"
exit 1 