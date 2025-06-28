/**
 * api-sync-example.js
 * Ejemplo de uso del módulo api-sync para sincronizar WhatsApp con la API de Konecte
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const apiSync = require('../src/services/api-sync');

// Función principal
async function main() {
  console.log('Iniciando ejemplo de sincronización con API Konecte...');

  // Configurar cliente de WhatsApp
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'ejemplo-api-sync',
      dataPath: path.join(process.cwd(), 'wwjs_auth_info')
    }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    }
  });

  // Configurar eventos del cliente
  client.on('qr', (qr) => {
    console.log('Código QR recibido. Por favor, escanea con WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  client.on('authenticated', () => {
    console.log('Cliente autenticado correctamente.');
  });

  client.on('ready', () => {
    console.log('Cliente de WhatsApp listo y conectado.');
    
    // Inicializar la sincronización con la API
    apiSync.initApiSync(client);
    
    console.log('Sincronización con API iniciada. Presiona Ctrl+C para salir.');
  });

  // Manejar señales de cierre
  process.on('SIGINT', async () => {
    console.log('\nDeteniendo sincronización y cerrando cliente...');
    apiSync.stopPolling();
    await client.destroy();
    process.exit(0);
  });

  // Inicializar cliente
  console.log('Inicializando cliente de WhatsApp...');
  await client.initialize();
}

// Ejecutar la función principal
main().catch(error => {
  console.error('Error en la aplicación:', error);
  process.exit(1);
}); 