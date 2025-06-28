#!/usr/bin/env node

/**
 * Script para iniciar el túnel de serveo
 * Este script inicia un túnel SSH con serveo.net para exponer el servidor local al internet
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const PORT = process.env.PORT || 3001;
const LOGS_DIR = path.join(__dirname, '../../logs');
const TUNNEL_LOG_PATH = path.join(LOGS_DIR, 'tunnel.log');

// Asegurarse de que el directorio de logs exista
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

console.log('Iniciando túnel SSH con serveo.net...');

// Crear el proceso de túnel SSH
const tunnel = spawn('ssh', ['-R', `80:localhost:${PORT}`, 'serveo.net'], {
  detached: true,
  stdio: ['ignore', fs.openSync(TUNNEL_LOG_PATH, 'a'), fs.openSync(TUNNEL_LOG_PATH, 'a')]
});

// No esperar a que el proceso termine
tunnel.unref();

console.log(`Túnel iniciado. Los logs se guardan en: ${TUNNEL_LOG_PATH}`);
console.log('Para ver la URL del túnel, ejecuta: cat ' + TUNNEL_LOG_PATH);

// Función para obtener la URL del túnel
function getTunnelUrl() {
  try {
    const logContent = fs.readFileSync(TUNNEL_LOG_PATH, 'utf8');
    const match = logContent.match(/Forwarding HTTP traffic from (https:\/\/[^\s]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.error('Error al leer el log del túnel:', error.message);
    return null;
  }
}

// Esperar un momento y luego mostrar la URL del túnel
setTimeout(() => {
  const tunnelUrl = getTunnelUrl();
  if (tunnelUrl) {
    console.log(`URL del túnel: ${tunnelUrl}`);
  } else {
    console.log('No se pudo obtener la URL del túnel. Revisa el archivo de log.');
  }
}, 2000); 