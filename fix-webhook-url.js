/**
 * fix-webhook-url.js
 * Script para corregir la URL del webhook de Konecte
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Ruta al archivo .env
const envPath = path.join(process.cwd(), '.env');

// Función para actualizar la URL del webhook
async function updateWebhookUrl() {
  try {
    console.log('Actualizando URL del webhook de Konecte...');
    
    // Leer el archivo .env
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // URL correcta para enviar mensajes a la API de Konecte
    const correctWebhookUrl = 'https://konecte.vercel.app/api/whatsapp-bot/receive-reply';
    
    // Verificar si ya existe la variable KONECTE_WEBHOOK_URL
    if (envContent.includes('KONECTE_WEBHOOK_URL=')) {
      // Mostrar la URL actual
      const currentUrlMatch = envContent.match(/KONECTE_WEBHOOK_URL=(.*)/);
      if (currentUrlMatch && currentUrlMatch[1]) {
        console.log(`URL actual: ${currentUrlMatch[1]}`);
      }
      
      // Reemplazar la URL existente
      envContent = envContent.replace(/KONECTE_WEBHOOK_URL=.*$/m, `KONECTE_WEBHOOK_URL=${correctWebhookUrl}`);
    } else {
      // Agregar la variable si no existe
      envContent += `\nKONECTE_WEBHOOK_URL=${correctWebhookUrl}`;
    }
    
    // Guardar el archivo .env actualizado
    fs.writeFileSync(envPath, envContent);
    
    console.log(`URL del webhook actualizada a: ${correctWebhookUrl}`);
    console.log('Para aplicar los cambios, reinicia el servidor con: pm2 restart botito-server');
  } catch (error) {
    console.error('Error al actualizar la URL del webhook:', error);
  }
}

// Ejecutar la función
updateWebhookUrl();