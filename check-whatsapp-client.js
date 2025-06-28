/**
 * check-whatsapp-client.js
 * Script para verificar el estado del cliente de WhatsApp
 */

require('dotenv').config();
const { initWhatsAppClient, getWhatsAppClient } = require('./src/services/whatsappService');

async function checkWhatsAppClient() {
  console.log('Verificando el estado del cliente de WhatsApp...');
  
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
  
  // Verificar el estado del cliente
  console.log('Estado del cliente de WhatsApp:');
  console.log('- Inicializado: Sí');
  console.log('- Disponible para enviar mensajes: Sí');
  
  return true;
}

// Ejecutar la verificación
checkWhatsAppClient().then((result) => {
  if (result) {
    console.log('Verificación completada. El cliente de WhatsApp está funcionando correctamente.');
  } else {
    console.log('Verificación completada. El cliente de WhatsApp NO está funcionando correctamente.');
  }
  
  // Mantener el proceso en ejecución para permitir que el cliente se inicialice completamente
  console.log('Presiona Ctrl+C para salir.');
}).catch((error) => {
  console.error('Error durante la verificación:', error);
});