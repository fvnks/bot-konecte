/**
 * direct-api-test.js
 * Script para probar directamente la API de Konecte con logs detallados
 */

require('dotenv').config();
const axios = require('axios');

// URL base de la API
const API_BASE_URL = process.env.KONECTE_API_URL || 'https://konecte.vercel.app/api/whatsapp-bot';

// Función para probar la API con logs detallados
async function testApiWithLogs() {
  console.log('=== PRUEBA DETALLADA DE API KONECTE ===');
  console.log(`URL base: ${API_BASE_URL}`);
  console.log('=====================================\n');
  
  // 1. Probar la URL base
  console.log('1. Probando URL base...');
  try {
    console.log(`Enviando GET a ${API_BASE_URL}`);
    const baseResponse = await axios.get(API_BASE_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Botito-WhatsApp-Test/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('Respuesta recibida:');
    console.log(`- Estado: ${baseResponse.status}`);
    console.log(`- Tipo de contenido: ${baseResponse.headers['content-type']}`);
    console.log(`- Datos: ${JSON.stringify(baseResponse.data, null, 2)}`);
  } catch (error) {
    console.error('Error al acceder a URL base:', error.message);
    if (error.response) {
      console.error(`- Estado: ${error.response.status}`);
      console.error(`- Datos: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('- No se recibió respuesta del servidor');
    }
  }
  
  console.log('\n-----------------------------------\n');
  
  // 2. Probar el endpoint de mensajes pendientes
  console.log('2. Probando endpoint de mensajes pendientes...');
  try {
    const pendingUrl = `${API_BASE_URL}/pending-messages`;
    console.log(`Enviando GET a ${pendingUrl}`);
    
    const pendingResponse = await axios.get(pendingUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Botito-WhatsApp-Test/1.0',
        'Accept': 'application/json'
      }
    });
    
    console.log('Respuesta recibida:');
    console.log(`- Estado: ${pendingResponse.status}`);
    console.log(`- Tipo de contenido: ${pendingResponse.headers['content-type']}`);
    console.log(`- Datos: ${JSON.stringify(pendingResponse.data, null, 2)}`);
    
    const messages = pendingResponse.data.messages || [];
    console.log(`- Mensajes pendientes: ${messages.length}`);
  } catch (error) {
    console.error('Error al acceder a mensajes pendientes:', error.message);
    if (error.response) {
      console.error(`- Estado: ${error.response.status}`);
      console.error(`- Datos: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('- No se recibió respuesta del servidor');
    }
  }
  
  console.log('\n-----------------------------------\n');
  
  // 3. Probar el endpoint de recepción de respuestas
  console.log('3. Probando endpoint de recepción de respuestas...');
  try {
    const replyUrl = `${API_BASE_URL}/receive-reply`;
    console.log(`Enviando POST a ${replyUrl}`);
    
    const payload = {
      telefono: '+56945803799',
      text: 'Mensaje de prueba desde direct-api-test.js. Hora: ' + new Date().toLocaleString()
    };
    
    console.log(`- Payload: ${JSON.stringify(payload, null, 2)}`);
    
    const replyResponse = await axios.post(replyUrl, payload, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Botito-WhatsApp-Test/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Respuesta recibida:');
    console.log(`- Estado: ${replyResponse.status}`);
    console.log(`- Tipo de contenido: ${replyResponse.headers['content-type']}`);
    console.log(`- Datos: ${JSON.stringify(replyResponse.data, null, 2)}`);
  } catch (error) {
    console.error('Error al enviar respuesta:', error.message);
    if (error.response) {
      console.error(`- Estado: ${error.response.status}`);
      console.error(`- Datos: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('- No se recibió respuesta del servidor');
    }
  }
  
  console.log('\n=== FIN DE LA PRUEBA ===');
}

// Ejecutar la prueba
testApiWithLogs().catch(error => {
  console.error('Error general en la prueba:', error);
}); 