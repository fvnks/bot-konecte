/**
 * fix-whatsapp.js
 * Script para solucionar el problema de inicialización de WhatsApp
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuración
const SESSION_DIR = path.join(process.cwd(), 'wwjs_auth_info');
const SESSION_ID = process.env.WA_SESSION_ID || 'botito-session';

// Función para limpiar la sesión anterior si está corrupta
function cleanSession() {
  console.log('Limpiando sesión anterior...');
  
  const sessionPath = path.join(SESSION_DIR, SESSION_ID);
  
  if (fs.existsSync(sessionPath)) {
    try {
      // Función recursiva para eliminar directorios
      const deleteFolderRecursive = function(folderPath) {
        if (fs.existsSync(folderPath)) {
          fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              // Recursivamente eliminar subdirectorios
              deleteFolderRecursive(curPath);
            } else {
              // Eliminar archivos
              fs.unlinkSync(curPath);
            }
          });
          // Eliminar el directorio vacío
          fs.rmdirSync(folderPath);
        }
      };
      
      deleteFolderRecursive(sessionPath);
      console.log(`Sesión eliminada: ${sessionPath}`);
    } catch (error) {
      console.error('Error al eliminar la sesión:', error);
    }
  } else {
    console.log('No se encontró una sesión anterior para eliminar.');
  }
}

// Función para inicializar el cliente de WhatsApp
async function initWhatsApp(cleanSessionFirst = false) {
  console.log('=== Iniciando proceso de reparación de WhatsApp ===');
  
  // Asegurarse de que el directorio de sesión existe
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
  
  // Establecer permisos adecuados para el directorio de sesión
  try {
    fs.chmodSync(SESSION_DIR, 0o755);
    console.log(`Permisos del directorio de sesión actualizados: ${SESSION_DIR}`);
  } catch (error) {
    console.error(`Error al actualizar permisos del directorio de sesión: ${error.message}`);
  }
  
  // Limpiar la sesión anterior si se solicita
  if (cleanSessionFirst) {
    cleanSession();
  }
  
  console.log(`Inicializando cliente de WhatsApp con ID de sesión: ${SESSION_ID}`);
  
  // Crear el cliente de WhatsApp con opciones extendidas
  const client = new Client({
    authStrategy: new LocalAuth({ 
      clientId: SESSION_ID,
      dataPath: SESSION_DIR
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-application-cache',
        '--disable-software-rasterizer'
      ],
      executablePath: process.env.CHROME_PATH || undefined
    },
    qrMaxRetries: 5,
    authTimeoutMs: 60000,
    qrRefreshIntervalMs: 20000,
    restartOnAuthFail: true
  });
  
  // Evento cuando se genera un código QR para autenticación
  client.on('qr', (qr) => {
    console.log('\n=== CÓDIGO QR RECIBIDO ===');
    console.log('Escanea este código con WhatsApp en tu teléfono:');
    qrcode.generate(qr, { small: true });
    console.log('\nEsperando a que escanees el código QR...');
  });
  
  // Evento cuando el cliente está autenticado
  client.on('authenticated', () => {
    console.log('\n=== AUTENTICACIÓN EXITOSA ===');
    console.log('Cliente autenticado correctamente.');
  });
  
  // Evento cuando la autenticación falla
  client.on('auth_failure', (error) => {
    console.error('\n=== ERROR DE AUTENTICACIÓN ===');
    console.error('Error de autenticación:', error);
    console.log('Intenta ejecutar este script nuevamente con la opción de limpiar la sesión:');
    console.log('node fix-whatsapp.js clean');
  });
  
  // Evento cuando el cliente está listo
  client.on('ready', () => {
    console.log('\n=== CLIENTE LISTO ===');
    console.log('Cliente de WhatsApp listo y conectado.');
    console.log('La sesión se ha guardado correctamente.');
    console.log('\nAhora puedes iniciar el servidor con:');
    console.log('pm2 restart botito-server');
    console.log('o');
    console.log('npm run dev');
  });
  
  // Evento cuando hay un error de conexión
  client.on('disconnected', (reason) => {
    console.log('\n=== DESCONEXIÓN ===');
    console.log('Cliente desconectado:', reason);
  });
  
  // Inicializar el cliente
  console.log('Inicializando cliente de WhatsApp...');
  try {
    await client.initialize();
  } catch (error) {
    console.error('\n=== ERROR DE INICIALIZACIÓN ===');
    console.error('Error al inicializar el cliente de WhatsApp:', error);
    console.log('Intenta ejecutar este script nuevamente con la opción de limpiar la sesión:');
    console.log('node fix-whatsapp.js clean');
    process.exit(1);
  }
  
  // Mantener el proceso en ejecución
  console.log('\nMantén este proceso en ejecución hasta que veas el mensaje "CLIENTE LISTO"');
  console.log('Presiona Ctrl+C para salir una vez que el cliente esté listo.');
}

// Punto de entrada del script
const shouldCleanSession = process.argv.includes('clean');
initWhatsApp(shouldCleanSession).catch(error => {
  console.error('Error general:', error);
  process.exit(1);
});