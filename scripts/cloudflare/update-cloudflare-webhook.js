/**
 * update-cloudflare-webhook.js
 * Script para actualizar la URL del webhook cuando se inicie el túnel de Cloudflare
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración
const LOG_FILE = path.join(process.cwd(), 'logs', 'cloudflare-tunnel.log');
const WEBHOOK_UPDATE_ENDPOINT = process.env.KONECTE_API_URL + '/update-webhook-url';
const WEBHOOK_API_KEY = process.env.KONECTE_API_KEY || '';
const CHECK_INTERVAL = 5000; // 5 segundos
const MAX_RETRIES = 12; // 1 minuto (12 * 5 segundos)

// Asegurarse de que el directorio de logs existe
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Variables globales
let tunnelUrl = null;
let retryCount = 0;
let updateInterval = null;

/**
 * Busca la URL del túnel en el archivo de logs
 */
function findTunnelUrlInLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log(`[${new Date().toISOString()}] Archivo de logs no encontrado: ${LOG_FILE}`);
      return null;
    }
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
    const tunnelUrlMatches = logContent.match(/\[TUNNEL-URL\] (https:\/\/[^\s]+)/g);
    
    if (tunnelUrlMatches && tunnelUrlMatches.length > 0) {
      // Obtener la última URL del túnel encontrada
      const lastMatch = tunnelUrlMatches[tunnelUrlMatches.length - 1];
      const url = lastMatch.replace('[TUNNEL-URL] ', '');
      return url;
    }
    
    return null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error al leer el archivo de logs:`, error);
    return null;
  }
}

/**
 * Actualiza la URL del webhook en la API de Konecte
 */
async function updateWebhookUrl(url) {
  try {
    console.log(`[${new Date().toISOString()}] Actualizando URL del webhook a: ${url}`);
    
    const response = await axios.post(WEBHOOK_UPDATE_ENDPOINT, {
      url: url,
      apiKey: WEBHOOK_API_KEY
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`[${new Date().toISOString()}] URL del webhook actualizada correctamente`);
      return true;
    } else {
      console.error(`[${new Date().toISOString()}] Error al actualizar la URL del webhook:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error al actualizar la URL del webhook:`, error.message);
    return false;
  }
}

/**
 * Verifica periódicamente si hay una nueva URL del túnel y la actualiza
 */
function checkAndUpdateTunnelUrl() {
  const newTunnelUrl = findTunnelUrlInLogs();
  
  if (newTunnelUrl && newTunnelUrl !== tunnelUrl) {
    tunnelUrl = newTunnelUrl;
    console.log(`[${new Date().toISOString()}] Nueva URL del túnel encontrada: ${tunnelUrl}`);
    
    // Actualizar la URL del webhook
    updateWebhookUrl(tunnelUrl).then(success => {
      if (success) {
        // Si la actualización fue exitosa, detener el intervalo
        clearInterval(updateInterval);
        console.log(`[${new Date().toISOString()}] Proceso de actualización completado`);
      } else {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error(`[${new Date().toISOString()}] Se alcanzó el número máximo de reintentos (${MAX_RETRIES})`);
          clearInterval(updateInterval);
        } else {
          console.log(`[${new Date().toISOString()}] Reintentando actualización (${retryCount}/${MAX_RETRIES})...`);
        }
      }
    });
  } else if (!newTunnelUrl) {
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
      console.error(`[${new Date().toISOString()}] No se encontró la URL del túnel después de ${MAX_RETRIES} intentos`);
      clearInterval(updateInterval);
    } else {
      console.log(`[${new Date().toISOString()}] Esperando URL del túnel (${retryCount}/${MAX_RETRIES})...`);
    }
  }
}

// Iniciar el proceso de verificación
console.log(`[${new Date().toISOString()}] Iniciando monitoreo de la URL del túnel de Cloudflare...`);
updateInterval = setInterval(checkAndUpdateTunnelUrl, CHECK_INTERVAL);

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Recibida señal SIGINT. Deteniendo monitoreo...`);
  clearInterval(updateInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Recibida señal SIGTERM. Deteniendo monitoreo...`);
  clearInterval(updateInterval);
  process.exit(0);
});