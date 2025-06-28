/**
 * Servicio para actualizar la URL del webhook
 * Este servicio se encarga de actualizar la URL del webhook en el archivo .env
 * cuando cambia la URL de ngrok o cuando se inicia el servicio
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const settings = require('../config/settings');

// Configuración
const ENV_FILE_PATH = path.join(__dirname, '../../../.env');
const CLOUDFLARE_DOMAIN = 'https://bahamas-we-masters-spending.trycloudflare.com';
const WEBHOOK_PATH = '/api/webhooks/konecte-incoming';

// Función para actualizar el archivo .env
async function updateEnvFile() {
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
    console.log(`[${new Date().toISOString()}] ✅ URL del webhook actualizada a: ${webhookUrl}`);
    
    // Notificar a la API de Konecte sobre la nueva URL del webhook
    await notifyKonecteAPI(webhookUrl);
    
    return webhookUrl;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error al actualizar el archivo .env:`, error.message);
    throw error;
  }
}

// Función para notificar a la API de Konecte sobre la nueva URL del webhook
async function notifyKonecteAPI(webhookUrl) {
  try {
    // Obtener la URL de la API de Konecte del archivo .env
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const konecteApiUrlMatch = envContent.match(/KONECTE_API_URL=(.*)/);
    
    if (!konecteApiUrlMatch) {
      console.error(`[${new Date().toISOString()}] ❌ No se encontró la variable KONECTE_API_URL en el archivo .env`);
      return;
    }
    
    const konecteApiUrl = konecteApiUrlMatch[1].trim();
    const testWebhookUrl = `${konecteApiUrl}/test-webhook`;
    
    console.log(`[${new Date().toISOString()}] 🔄 Notificando a la API de Konecte sobre la nueva URL del webhook: ${webhookUrl}`);
    
    const response = await axios.post(testWebhookUrl, { webhookUrl });
    console.log(`[${new Date().toISOString()}] ✅ API de Konecte notificada correctamente:`, response.data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error al notificar a la API de Konecte:`, error.message);
  }
}

// Función principal
async function main() {
  console.log(`[${new Date().toISOString()}] 🚀 Iniciando servicio de actualización de URL del webhook con Cloudflare Tunnel`);
  
  // Actualizar la URL del webhook al iniciar el servicio
  try {
    await updateEnvFile();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error al actualizar la URL del webhook:`, error.message);
  }
  
  // Programar actualizaciones periódicas (cada 5 minutos)
  const updateInterval = settings.noip.updateInterval || 5 * 60 * 1000; // 5 minutos por defecto
  
  setInterval(async () => {
    try {
      await updateEnvFile();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error al actualizar la URL del webhook:`, error.message);
    }
  }, updateInterval);
}

// Ejecutar la función principal
main().catch(error => {
  console.error(`[${new Date().toISOString()}] ❌ Error fatal en el servicio de actualización:`, error.message);
  process.exit(1);
}); 