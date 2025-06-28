/**
 * send-test-message.js
 * Script para enviar un mensaje de prueba directamente usando el cliente de WhatsApp
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// Número de teléfono para prueba (sin el prefijo @c.us)
const TEST_PHONE_NUMBER = '56945803799';
const TEST_MESSAGE = 'Este es un mensaje de prueba enviado directamente desde el script de diagnóstico. Hora: ' + new Date().toLocaleString();

// Función para inicializar el cliente de WhatsApp
async function initWhatsAppClient() {
  return new Promise((resolve, reject) => {
    console.log('Inicializando cliente de WhatsApp Web JS...');

    // Usar el directorio del proyecto para la sesión
    const sessionDir = path.join(process.cwd(), 'wwjs_auth_info');
    
    // Configuración simplificada de Puppeteer para usar el binario de Chromium del sistema
    const puppeteerOptions = {
      executablePath: '/usr/bin/chromium-browser', // Usar el Chromium instalado en el sistema
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      headless: true,
      ignoreHTTPSErrors: true
    };

    // Crear el cliente con la configuración adecuada
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'botito-persistente', // Usar la misma sesión que el bot principal
        dataPath: sessionDir
      }),
      puppeteer: puppeteerOptions
    });

    // Registrar eventos del cliente
    client.on('qr', (qr) => {
      console.log('Código QR recibido. Por favor, escanea con WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      console.log('Cliente autenticado correctamente.');
    });

    client.on('ready', () => {
      console.log('Cliente de WhatsApp listo y conectado.');
      resolve(client);
    });

    client.on('auth_failure', (msg) => {
      console.error('Fallo de autenticación de WhatsApp:', msg);
      reject(new Error(`Fallo de autenticación: ${msg}`));
    });

    // Inicializar el cliente
    client.initialize().catch(reject);
  });
}

// Función para enviar un mensaje de prueba
async function sendTestMessage() {
  try {
    console.log('=== INICIANDO ENVÍO DE MENSAJE DE PRUEBA ===');
    console.log(`Número de destino: ${TEST_PHONE_NUMBER}`);
    console.log(`Mensaje: ${TEST_MESSAGE}`);
    console.log('=========================================');
    
    // Inicializar el cliente de WhatsApp
    const client = await initWhatsAppClient();
    
    // Formatear el número para WhatsApp Web JS
    const formattedNumber = `${TEST_PHONE_NUMBER}@c.us`;
    
    console.log(`Enviando mensaje a ${formattedNumber}...`);
    
    // Enviar el mensaje
    const result = await client.sendMessage(formattedNumber, TEST_MESSAGE);
    
    console.log('Mensaje enviado exitosamente:', result);
    console.log('ID del mensaje:', result.id._serialized);
    
    // Cerrar el cliente después de enviar el mensaje
    console.log('Cerrando cliente de WhatsApp...');
    await client.destroy();
    
    console.log('=== PROCESO COMPLETADO ===');
    
  } catch (error) {
    console.error('Error al enviar mensaje de prueba:', error);
  }
}

// Ejecutar la función principal
sendTestMessage().catch(error => {
  console.error('Error general en el script:', error);
}); 