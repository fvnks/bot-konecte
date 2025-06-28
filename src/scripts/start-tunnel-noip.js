#!/usr/bin/env node

/**
 * Script para iniciar el túnel con No-IP
 * Este script inicia un túnel SSH con serveo.net para exponer el servidor local al internet
 * y configura No-IP para que apunte a la URL del túnel
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');

// Configuración
const PORT = process.env.PORT || 3001;
const TUNNEL_LOG_PATH = path.join(__dirname, '../../logs/tunnel.log');
const NOIP_DOMAIN = 'konecte.ddns.net';

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

// En lugar de crear un servidor proxy, vamos a actualizar el archivo .env con la URL de No-IP
const envFilePath = path.join(__dirname, '../../.env');
let envContent = fs.readFileSync(envFilePath, 'utf8');

// Actualizar la URL del webhook en el archivo .env
envContent = envContent.replace(/KONECTE_WEBHOOK_URL=https:\/\/.*/, `KONECTE_WEBHOOK_URL=https://${NOIP_DOMAIN}`);
fs.writeFileSync(envFilePath, envContent);

console.log(`Archivo .env actualizado. KONECTE_WEBHOOK_URL=https://${NOIP_DOMAIN}`);
console.log('Asegúrate de que No-IP esté configurado para apuntar a tu IP pública y que tu router redireccione el puerto 80 al puerto 3001 de este servidor.'); 