/**
 * test-direct-send.js
 * Script para probar el envío directo de mensajes usando el servicio de WhatsApp
 */

require('dotenv').config();
const { initWhatsAppClient, getWhatsAppClient, sendMessage } = require('./src/services/whatsappService');

// Número de teléfono de prueba (ajustar según corresponda)
const TEST_PHONE = process.env.TEST_PHONE || '+56XXXXXXXXX';

// Mensaje de prueba
const TEST_MESSAGE = 'Este es un mensaje de prueba enviado directamente. ' + new Date().toISOString();

async function testDirectSend() {
  console.log('Probando envío directo de mensaje usando el servicio de WhatsApp...');
  console.log(`Teléfono: ${TEST_PHONE}`);
  console.log(`Mensaje: ${TEST_MESSAGE}`);
  
  // Intentar inicializar el cliente si no existe
  if (!getWhatsAppClient()) {
    console.log('Cliente de WhatsApp no inicializado. Intentando inicializar...');
    try {
      await initWhatsAppClient();
      console.log('Cliente de WhatsApp inicializado correctamente.');
    } catch (error) {
      console.error('Error al inicializar el cliente de WhatsApp:', error);
      return false;
    }
  } else {
    console.log('Cliente de WhatsApp ya está inicializado.');
  }
  
  // Verificar si el cliente está disponible
  const client = getWhatsAppClient();
  if (!client) {
    console.error('Cliente de WhatsApp no disponible después de la inicialización.');
    return false;
  }
  
  // Formatear el número si es necesario
  let formattedNumber = TEST_PHONE;
  if (!formattedNumber.includes('@c.us')) {
    // Eliminar el signo + si existe
    if (formattedNumber.startsWith('+')) {
      formattedNumber = formattedNumber.substring(1);
    }
    
    // Añadir el sufijo @c.us
    formattedNumber = `${formattedNumber}@c.us`;
  }
  
  // Enviar el mensaje directamente
  try {
    console.log(`Enviando mensaje a ${formattedNumber}...`);
    const result = await client.sendMessage(formattedNumber, TEST_MESSAGE);
    
    console.log('Mensaje enviado exitosamente:');
    console.log('- ID:', result.id._serialized);
    console.log('- Timestamp:', result.timestamp);
    
    return true;
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    return false;
  }
}

// Ejecutar la prueba
testDirectSend().then((result) => {
  if (result) {
    console.log('Prueba completada exitosamente.');
  } else {
    console.log('La prueba falló.');
  }
  
  // Mantener el proceso en ejecución para permitir que el mensaje se envíe completamente
  console.log('Presiona Ctrl+C para salir.');
}).catch((error) => {
  console.error('Error durante la prueba:', error);
});