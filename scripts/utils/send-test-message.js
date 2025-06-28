#!/usr/bin/env node

/**
 * Script para enviar un mensaje de prueba utilizando axios
 */

const axios = require('axios');

// Número de teléfono al que enviar el mensaje (debe incluir el código de país)
const PHONE_NUMBER = '+56945803799';

// Mensaje a enviar
const MESSAGE = 'Este es un mensaje de prueba enviado directamente desde el script de prueba. La URL del webhook es: https://konecte.ddns.net';

// Función para enviar el mensaje
async function sendMessage() {
  try {
    console.log('Enviando mensaje a través de la API local...');
    
    // Intentar con la API local primero
    try {
      const localResponse = await axios.post('http://localhost:3001/api/webhooks/send-message', {
        phoneNumber: PHONE_NUMBER,
        message: MESSAGE
      });
      
      console.log('Mensaje enviado exitosamente a través de la API local:');
      console.log(JSON.stringify(localResponse.data, null, 2));
      return;
    } catch (localError) {
      console.error('Error al enviar mensaje a través de la API local:', localError.message);
      console.log('Intentando con la URL de serveo...');
    }
    
    // Intentar con la URL de serveo
    try {
      const serveoResponse = await axios.post('https://0f5aae2372f4b9c00545ba9b997c2d30.serveo.net/api/webhooks/send-message', {
        phoneNumber: PHONE_NUMBER,
        message: MESSAGE
      });
      
      console.log('Mensaje enviado exitosamente a través de la URL de serveo:');
      console.log(JSON.stringify(serveoResponse.data, null, 2));
      return;
    } catch (serveoError) {
      console.error('Error al enviar mensaje a través de la URL de serveo:', serveoError.message);
      console.log('Intentando con la URL de No-IP...');
    }
    
    // Intentar con la URL de No-IP
    try {
      const noipResponse = await axios.post('https://konecte.ddns.net/api/webhooks/send-message', {
        phoneNumber: PHONE_NUMBER,
        message: MESSAGE
      });
      
      console.log('Mensaje enviado exitosamente a través de la URL de No-IP:');
      console.log(JSON.stringify(noipResponse.data, null, 2));
      return;
    } catch (noipError) {
      console.error('Error al enviar mensaje a través de la URL de No-IP:', noipError.message);
    }
    
    console.error('No se pudo enviar el mensaje a través de ninguna de las URLs disponibles.');
  } catch (error) {
    console.error('Error general al enviar el mensaje:', error.message);
  }
}

// Ejecutar la función
sendMessage(); 