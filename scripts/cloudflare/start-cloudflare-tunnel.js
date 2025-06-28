/**
 * start-cloudflare-tunnel.js
 * Script para iniciar el túnel de Cloudflare
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración
const CLOUDFLARED_PATH = '/usr/bin/cloudflared';
const LOCAL_SERVER_URL = 'http://localhost:3001';
const LOG_FILE = path.join(process.cwd(), 'logs', 'cloudflare-tunnel.log');

// Asegurarse de que el directorio de logs existe
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Crear stream de log
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

/**
 * Inicia el túnel de Cloudflare
 */
function startCloudflaredTunnel() {
  console.log(`[${new Date().toISOString()}] Iniciando túnel de Cloudflare para ${LOCAL_SERVER_URL}...`);
  
  // Verificar si cloudflared está instalado
  if (!fs.existsSync(CLOUDFLARED_PATH)) {
    console.error(`[${new Date().toISOString()}] Error: cloudflared no está instalado en ${CLOUDFLARED_PATH}`);
    console.error('Por favor, ejecute el script setup-cloudflare.sh para instalar cloudflared');
    process.exit(1);
  }
  
  // Iniciar el proceso de cloudflared con el túnel nombrado
  const cloudflared = spawn(CLOUDFLARED_PATH, ['tunnel', 'run', 'botito-prod-tunnel']);
  
  // Manejar salida estándar
  cloudflared.stdout.on('data', (data) => {
    const message = data.toString().trim();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLOUDFLARE] ${message}`);
    logStream.write(`[${timestamp}] [STDOUT] ${message}\n`);
    
    // Buscar la URL del túnel en la salida
    if (message.includes('https://')) {
      const tunnelUrl = message.match(/(https:\/\/[^\s]+)/);
      if (tunnelUrl && tunnelUrl[1]) {
        console.log(`[${timestamp}] [CLOUDFLARE] URL del túnel: ${tunnelUrl[1]}`);
        logStream.write(`[${timestamp}] [TUNNEL-URL] ${tunnelUrl[1]}\n`);
      }
    }
  });
  
  // Manejar errores
  cloudflared.stderr.on('data', (data) => {
    const message = data.toString().trim();
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [CLOUDFLARE-ERROR] ${message}`);
    logStream.write(`[${timestamp}] [STDERR] ${message}\n`);

    // Buscar la URL del túnel en la salida de error, que es donde cloudflared la muestra
    const urlMatch = message.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (urlMatch) {
      const tunnelUrl = urlMatch[0];
      console.log(`[${timestamp}] [CLOUDFLARE] URL del túnel encontrada: ${tunnelUrl}`);
      logStream.write(`[${timestamp}] [TUNNEL-URL] ${tunnelUrl}\n`);
    }
  });
  
  // Manejar cierre del proceso
  cloudflared.on('close', (code) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLOUDFLARE] Proceso finalizado con código ${code}`);
    logStream.write(`[${timestamp}] [CLOSE] Proceso finalizado con código ${code}\n`);
    
    // Reiniciar el túnel si se cierra inesperadamente
    if (code !== 0) {
      console.log(`[${timestamp}] [CLOUDFLARE] Reiniciando túnel en 5 segundos...`);
      logStream.write(`[${timestamp}] [RESTART] Reiniciando túnel en 5 segundos...\n`);
      setTimeout(startCloudflaredTunnel, 5000);
    }
  });
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLOUDFLARE] Recibida señal SIGINT. Cerrando túnel...`);
    logStream.write(`[${timestamp}] [SIGNAL] Recibida señal SIGINT. Cerrando túnel...\n`);
    cloudflared.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CLOUDFLARE] Recibida señal SIGTERM. Cerrando túnel...`);
    logStream.write(`[${timestamp}] [SIGNAL] Recibida señal SIGTERM. Cerrando túnel...\n`);
    cloudflared.kill();
    process.exit(0);
  });
}

// Iniciar el túnel
startCloudflaredTunnel();