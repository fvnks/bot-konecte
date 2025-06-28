#!/usr/bin/env node

/**
 * Script para iniciar automáticamente el túnel de serveo
 * Este script inicia un túnel SSH con serveo.net para exponer el servidor local al internet
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración
const PORT = process.env.PORT || 3001;
const TUNNEL_LOG_PATH = path.join(__dirname, '../../logs/tunnel.log');

// Asegurarse de que el directorio de logs exista
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
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