/**
 * init-whatsapp.js
 * Script para inicializar correctamente el cliente de WhatsApp
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Función principal
async function initWhatsApp() {
  console.log('Iniciando cliente de WhatsApp...');
  
  const sessionDir = path.join(process.cwd(), 'wwjs_auth_info');
  
  // Asegurarse de que el directorio de sesión existe
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  // Establecer permisos adecuados para el directorio de sesión
  try {
    fs.chmodSync(sessionDir, 0o755);
    console.log(`Permisos del directorio de sesión actualizados: ${sessionDir}`);
  } catch (error) {
    console.error(`Error al actualizar permisos del directorio de sesión: ${error.message}`);
  }
  
  // ID de sesión para persistencia
  const sessionId = process.env.WA_SESSION_ID || 'botito-persistente';
  console.log(`INFO: Usando ID de sesión: ${sessionId}`);
  
  // Crear el cliente de WhatsApp
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      headless: true
    }
  });
  
  // Evento cuando se genera un código QR para autenticación
  client.on('qr', (qr) => {
    console.log('QR RECIBIDO, escanea con WhatsApp:');
    qrcode.generate(qr, { small: true });
  });
  
  // Evento cuando el cliente está autenticado
  client.on('authenticated', () => {
    console.log('Cliente autenticado correctamente.');
  });
  
  // Evento cuando el cliente está listo
  client.on('ready', () => {
    console.log('Cliente de WhatsApp listo y conectado.');
    console.log('El cliente está listo para enviar y recibir mensajes.');
    console.log('Puedes mantener este proceso en ejecución o presionar Ctrl+C para salir.');
  });
  
  // Evento cuando se recibe un mensaje
  client.on('message', async (message) => {
    console.log(`Mensaje recibido de ${message.from}: ${message.body}`);
  });
  
  // Inicializar el cliente
  console.log('Inicializando cliente de WhatsApp...');
  await client.initialize();
  
  return client;
}

// Ejecutar la función principal
initWhatsApp().catch(error => {
  console.error('Error al inicializar el cliente de WhatsApp:', error);
  process.exit(1);
});