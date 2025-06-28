/**
 * test-send-message.js
 * Script para enviar un mensaje de prueba directamente al número +56945803799
 */

// Importar el módulo whatsappService
const { initWhatsAppClient } = require('./src/services/whatsappService');

// Número de teléfono de prueba
const TEST_PHONE_NUMBER = '56945803799@c.us';
const TEST_MESSAGE = 'Este es un mensaje de prueba enviado directamente desde el script de diagnóstico. Hora: ' + new Date().toLocaleString();

// Función principal
async function sendTestMessage() {
  try {
    console.log('=== INICIANDO PRUEBA DE ENVÍO DE MENSAJE ===');
    console.log(`Destinatario: ${TEST_PHONE_NUMBER}`);
    console.log(`Mensaje: ${TEST_MESSAGE}`);
    console.log('=========================================');
    
    // Inicializar el cliente de WhatsApp
    console.log('Inicializando cliente de WhatsApp...');
    const client = await initWhatsAppClient();
    console.log('Cliente de WhatsApp inicializado correctamente');
    
    // Enviar el mensaje
    console.log(`Enviando mensaje a ${TEST_PHONE_NUMBER}...`);
    const result = await client.sendMessage(TEST_PHONE_NUMBER, TEST_MESSAGE);
    
    console.log('Mensaje enviado exitosamente:');
    console.log('- ID:', result.id._serialized);
    console.log('- Timestamp:', result.timestamp);
    
    // Esperar un poco antes de cerrar para asegurar que el mensaje se envíe
    console.log('Esperando 5 segundos antes de cerrar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('=== PRUEBA COMPLETADA CON ÉXITO ===');
    process.exit(0);
  } catch (error) {
    console.error('ERROR en la prueba de envío:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
sendTestMessage(); 