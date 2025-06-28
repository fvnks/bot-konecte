/**
 * test-webhook.js
 * Script para probar específicamente el endpoint konecte-incoming
 */

require('dotenv').config();
const axios = require('axios');

// URL base de la API (ajustar según corresponda)
const API_URL = process.env.API_URL || 'http://localhost:3001';

// Número de teléfono de prueba (usar un número real)
const TEST_PHONE = '+56945803799'; // Este número debe ser reemplazado por un número real

// Mensaje de prueba
const TEST_MESSAGE = 'Este es un mensaje de prueba enviado a través del webhook. ' + new Date().toISOString();

async function testWebhook() {
  console.log('Probando envío de mensaje a través del webhook...');
  console.log(`URL: ${API_URL}/api/webhooks/konecte-incoming`);
  console.log(`Teléfono: ${TEST_PHONE}`);
  console.log(`Mensaje: ${TEST_MESSAGE}`);
  
  try {
    const response = await axios.post(`${API_URL}/api/webhooks/konecte-incoming`, {
      targetUserWhatsAppNumber: TEST_PHONE,
      messageText: TEST_MESSAGE
    });
    
    console.log('Respuesta del webhook:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Error al enviar mensaje al webhook:');
    if (error.response) {
      // La solicitud fue realizada y el servidor respondió con un código de estado
      console.error(`Estado: ${error.response.status}`);
      console.error('Datos:', error.response.data);
    } else if (error.request) {
      // La solicitud fue realizada pero no se recibió respuesta
      console.error('No se recibió respuesta del servidor');
    } else {
      // Error al configurar la solicitud
      console.error('Error:', error.message);
    }
    
    return null;
  }
}

// Ejecutar la prueba
testWebhook().then(() => {
  console.log('Prueba completada');
});