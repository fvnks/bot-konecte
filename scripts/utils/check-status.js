#!/usr/bin/env node

/**
 * Script para verificar el estado de los servicios
 * Este script verifica el estado del servidor, el túnel y No-IP
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Colores para mejor legibilidad
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Configuración
const LOGS_DIR = path.join(__dirname, '../../logs');
const TUNNEL_LOG_PATH = path.join(LOGS_DIR, 'tunnel.log');
const ENV_FILE_PATH = path.join(__dirname, '../../.env');
const PORT = process.env.PORT || 3001;
const NOIP_DOMAIN = 'rodriservcl.ddns.net';
const NGINX_CONFIG_PATH = '/etc/nginx/sites-available/konecte.ddns.net';
const CLOUDFLARE_DOMAIN = 'bahamas-we-masters-spending.trycloudflare.com';
const WEBHOOK_PATH = '/api/webhooks/konecte-incoming';
const LOCAL_SERVER_URL = 'http://localhost:3001';

// Colores para la salida en consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Función para imprimir mensajes con formato
function printMessage(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Función para verificar si un proceso está en ejecución
function isProcessRunning(processName) {
  try {
    const output = execSync(`ps aux | grep "${processName}" | grep -v grep`).toString().trim();
    return output.length > 0;
  } catch (error) {
    return false;
  }
}

// Función para obtener la URL del túnel
function getTunnelUrl() {
  try {
    if (!fs.existsSync(TUNNEL_LOG_PATH)) {
      return null;
    }
    const logContent = fs.readFileSync(TUNNEL_LOG_PATH, 'utf8');
    const match = logContent.match(/Forwarding HTTP traffic from (https:\/\/[^\s]+)/g);
    if (match && match.length > 0) {
      // Obtener la última URL del túnel (la más reciente)
      const lastMatch = match[match.length - 1];
      return lastMatch.replace('Forwarding HTTP traffic from ', '');
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Función para verificar si No-IP está en ejecución
function isNoipRunning() {
  try {
    const output = execSync('pgrep -x "noip2"').toString().trim();
    return output.length > 0;
  } catch (error) {
    return false;
  }
}

// Función para verificar si Nginx está en ejecución
function isNginxRunning() {
  try {
    const output = execSync('systemctl is-active nginx').toString().trim();
    return output === 'active';
  } catch (error) {
    return false;
  }
}

// Función para obtener la URL del proxy de Nginx
function getNginxProxyUrl() {
  try {
    if (!fs.existsSync(NGINX_CONFIG_PATH)) {
      return null;
    }
    const nginxConfig = fs.readFileSync(NGINX_CONFIG_PATH, 'utf8');
    const match = nginxConfig.match(/proxy_pass\s+(https:\/\/[^;]+);/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Función para obtener la URL del webhook del archivo .env
function getWebhookUrl() {
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) {
      return null;
    }
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const match = envContent.match(/KONECTE_WEBHOOK_URL=(https:\/\/[^\s]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Función para verificar si un servidor está respondiendo
function checkServerResponse(url, callback) {
  const client = url.startsWith('https') ? https : http;
  const request = client.get(url, (res) => {
    if (res.statusCode === 200) {
      callback(true);
    } else {
      callback(false);
    }
  });
  
  request.on('error', () => {
    callback(false);
  });
  
  request.setTimeout(5000, () => {
    request.abort();
    callback(false);
  });
}

// Función para verificar si un puerto está en uso
function checkPortInUse(port) {
  try {
    const output = execSync(`lsof -i:${port} | grep LISTEN`).toString();
    return output.trim() !== '';
  } catch (error) {
    return false;
  }
}

// Función para verificar el estado del servidor local
async function checkLocalServer() {
  try {
    printMessage('Verificando servidor local...', colors.blue);
    
    const isRunning = checkPortInUse(3001);
    
    if (isRunning) {
      printMessage('✅ Servidor local en ejecución (puerto 3001)', colors.green);
      
      try {
        const response = await axios.get(`${LOCAL_SERVER_URL}/api/status`);
        printMessage(`✅ Servidor respondiendo: ${JSON.stringify(response.data)}`, colors.green);
      } catch (error) {
        printMessage('⚠️ Servidor en ejecución pero la ruta /api/status no está disponible', colors.yellow);
      }
    } else {
      printMessage('❌ Servidor local no está en ejecución', colors.red);
    }
  } catch (error) {
    printMessage(`❌ Error al verificar el servidor local: ${error.message}`, colors.red);
  }
}

// Función para verificar el estado del túnel de Cloudflare
async function checkCloudflareStatus() {
  try {
    printMessage('Verificando túnel de Cloudflare...', colors.blue);
    
    const isRunning = isProcessRunning('cloudflared tunnel');
    
    if (isRunning) {
      printMessage('✅ Túnel de Cloudflare en ejecución', colors.green);
      
      try {
        const response = await axios.get(`https://${CLOUDFLARE_DOMAIN}/api/status`);
        printMessage(`✅ Túnel de Cloudflare respondiendo: ${JSON.stringify(response.data)}`, colors.green);
      } catch (error) {
        if (error.response) {
          printMessage(`✅ Túnel de Cloudflare accesible (código: ${error.response.status})`, colors.green);
        } else {
          printMessage('⚠️ No se pudo conectar al túnel de Cloudflare', colors.yellow);
        }
      }
    } else {
      printMessage('❌ Túnel de Cloudflare no está en ejecución', colors.red);
    }
  } catch (error) {
    printMessage(`❌ Error al verificar el túnel de Cloudflare: ${error.message}`, colors.red);
  }
}

// Función para verificar la configuración del webhook
function checkWebhookConfig() {
  try {
    printMessage('Verificando configuración del webhook...', colors.blue);
    
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const webhookUrlMatch = envContent.match(/KONECTE_WEBHOOK_URL=(.*)/);
    
    if (!webhookUrlMatch) {
      printMessage('❌ No se encontró la variable KONECTE_WEBHOOK_URL en el archivo .env', colors.red);
      return;
    }
    
    const webhookUrl = webhookUrlMatch[1].trim();
    
    if (webhookUrl.includes(CLOUDFLARE_DOMAIN)) {
      printMessage(`✅ URL del webhook configurada correctamente: ${webhookUrl}`, colors.green);
    } else {
      printMessage(`⚠️ URL del webhook no está usando el dominio de Cloudflare: ${webhookUrl}`, colors.yellow);
    }
  } catch (error) {
    printMessage(`❌ Error al verificar la configuración del webhook: ${error.message}`, colors.red);
  }
}

// Función principal
async function main() {
  printMessage('=== VERIFICACIÓN DE ESTADO ===', colors.cyan);
  
  await checkLocalServer();
  await checkCloudflareStatus();
  checkWebhookConfig();
  
  printMessage('=== FIN DE LA VERIFICACIÓN ===', colors.cyan);
}

// Ejecutar la función principal
main().catch(error => {
  printMessage(`❌ Error fatal: ${error.message}`, colors.red);
  process.exit(1);
}); 