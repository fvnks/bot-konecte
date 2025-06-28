/**
 * send-whatsapp.js
 * Script para enviar un mensaje de WhatsApp usando el cliente ya inicializado
 * Este script se conecta al servidor del bot en ejecución para enviar un mensaje
 */

const axios = require('axios');

// Número de teléfono de destino
const PHONE_NUMBER = '56945803799@c.us';
const MESSAGE = 'Este es un mensaje de prueba enviado a través del servidor del bot. Hora: ' + new Date().toLocaleString();

// URL del servidor del bot
const BOT_SERVER_URL = 'http://localhost:3001';

// Función para enviar el mensaje
async function sendMessage() {
  try {
    console.log('=== ENVIANDO MENSAJE DE WHATSAPP ===');
    console.log(`Destinatario: ${PHONE_NUMBER}`);
    console.log(`Mensaje: ${MESSAGE}`);
    console.log('=================================');
    
    // Enviar solicitud al servidor del bot
    const response = await axios.post(`${BOT_SERVER_URL}/api/webhooks/send-message`, {
      phoneNumber: PHONE_NUMBER,
      message: MESSAGE
    });
    
    console.log('Respuesta del servidor:', response.data);
    console.log('=== MENSAJE ENVIADO EXITOSAMENTE ===');
  } catch (error) {
    console.error('ERROR al enviar mensaje:', error.message);
    
    if (error.response) {
      console.error('Detalles de error:', error.response.data);
    }
    
    console.log('\nIntentando método alternativo...');
    
    try {
      // Método alternativo usando un endpoint diferente
      const altResponse = await axios.post(`${BOT_SERVER_URL}/api/webhooks/whatsapp-message`, {
        to: PHONE_NUMBER,
        text: MESSAGE
      });
      
      console.log('Respuesta del método alternativo:', altResponse.data);
      console.log('=== MENSAJE ENVIADO EXITOSAMENTE (MÉTODO ALTERNATIVO) ===');
    } catch (altError) {
      console.error('ERROR con método alternativo:', altError.message);
      
      if (altError.response) {
        console.error('Detalles de error:', altError.response.data);
      }
      
      console.error('No se pudo enviar el mensaje.');
    }
  }
}

// Ejecutar la función
sendMessage(); 