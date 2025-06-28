/**
 * test-api-message.js
 * Script para simular un mensaje pendiente en la API de Konecte
 */

require('dotenv').config();
const axios = require('axios');

// URL base de la API
const API_BASE_URL = process.env.KONECTE_API_URL || 'https://konecte.vercel.app/api/whatsapp-bot';

// Número de teléfono para prueba
const TEST_PHONE_NUMBER = '+56945803799';
const TEST_MESSAGE = 'Este es un mensaje de prueba desde la API. Hora: ' + new Date().toLocaleString();

// Función para simular un mensaje pendiente
async function simulateApiMessage() {
  try {
    console.log('=== SIMULANDO MENSAJE PENDIENTE EN API ===');
    console.log(`URL de la API: ${API_BASE_URL}`);
    console.log(`Destinatario: ${TEST_PHONE_NUMBER}`);
    console.log(`Mensaje: ${TEST_MESSAGE}`);
    console.log('=========================================');
    
    // Crear un mensaje pendiente en la API (esta ruta puede variar según la API)
    const createEndpoint = `${API_BASE_URL}/create-message`;
    console.log(`Intentando crear mensaje pendiente en: ${createEndpoint}`);
    
    const payload = {
      telefono: TEST_PHONE_NUMBER,
      text: TEST_MESSAGE,
      id: `test-${Date.now()}` // ID único para el mensaje
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await axios.post(createEndpoint, payload, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Botito-WhatsApp/1.0',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Respuesta de la API:', JSON.stringify(response.data, null, 2));
      console.log('Mensaje pendiente creado exitosamente');
    } catch (error) {
      console.error('Error al crear mensaje pendiente:', error.message);
      
      if (error.response) {
        console.error('Detalles de error:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Intentar con un endpoint alternativo
      console.log('\nIntentando con endpoint alternativo...');
      const altEndpoint = `${API_BASE_URL}/send`;
      console.log(`Endpoint alternativo: ${altEndpoint}`);
      
      try {
        const altResponse = await axios.post(altEndpoint, payload, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Botito-WhatsApp/1.0',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log('Respuesta del endpoint alternativo:', JSON.stringify(altResponse.data, null, 2));
      } catch (altError) {
        console.error('Error con endpoint alternativo:', altError.message);
        
        if (altError.response) {
          console.error('Detalles de error:', JSON.stringify(altError.response.data, null, 2));
        }
      }
    }
    
    // Verificar mensajes pendientes
    console.log('\nVerificando mensajes pendientes...');
    const pendingEndpoint = `${API_BASE_URL}/pending-messages`;
    
    try {
      const pendingResponse = await axios.get(pendingEndpoint, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Botito-WhatsApp/1.0',
          'Accept': 'application/json'
        }
      });
      
      console.log('Respuesta de mensajes pendientes:', JSON.stringify(pendingResponse.data, null, 2));
      
      const pendingMessages = pendingResponse.data.messages || [];
      console.log(`Se encontraron ${pendingMessages.length} mensajes pendientes`);
      
      if (pendingMessages.length > 0) {
        console.log('Mensajes pendientes:');
        pendingMessages.forEach((msg, index) => {
          console.log(`- Mensaje ${index + 1}: ID=${msg.id}, Teléfono=${msg.telefono}, Texto=${msg.text.substring(0, 30)}...`);
        });
      }
    } catch (error) {
      console.error('Error al verificar mensajes pendientes:', error.message);
      
      if (error.response) {
        console.error('Detalles de error:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n=== PRUEBA COMPLETADA ===');
  } catch (error) {
    console.error('ERROR general en la prueba:', error);
  }
}

// Ejecutar la función principal
simulateApiMessage(); 