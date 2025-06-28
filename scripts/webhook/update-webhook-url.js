#!/usr/bin/env node

/**
 * Script para actualizar la URL del webhook
 * Este script actualiza la URL del webhook en el archivo .env
 */

const fs = require('fs');
const path = require('path');

// Configuración
const LOGS_DIR = path.join(__dirname, '../../logs');
const TUNNEL_LOG_PATH = path.join(LOGS_DIR, 'tunnel.log');
const ENV_FILE_PATH = path.join(__dirname, '../../.env');
const CLOUDFLARE_DOMAIN = 'https://bahamas-we-masters-spending.trycloudflare.com';
const WEBHOOK_PATH = '/api/webhooks/konecte-incoming';

// Función para actualizar el archivo .env
function updateEnvFile() {
  try {
    let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const webhookUrl = `${CLOUDFLARE_DOMAIN}${WEBHOOK_PATH}`;
    
    // Verificar si ya existe la variable KONECTE_WEBHOOK_URL
    if (envContent.includes('KONECTE_WEBHOOK_URL=')) {
      // Reemplazar la URL existente
      envContent = envContent.replace(/KONECTE_WEBHOOK_URL=.*$/m, `KONECTE_WEBHOOK_URL=${webhookUrl}`);
    } else {
      // Agregar la variable si no existe
      envContent += `\nKONECTE_WEBHOOK_URL=${webhookUrl}`;
    }
    
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    console.log(`✅ URL del webhook actualizada a: ${webhookUrl}`);
    
    return webhookUrl;
  } catch (error) {
    console.error('❌ Error al actualizar el archivo .env:', error.message);
    throw error;
  }
}

// Ejecutar la actualización
try {
  updateEnvFile();
} catch (error) {
  console.error('❌ Error al ejecutar el script:', error.message);
  process.exit(1);
} 