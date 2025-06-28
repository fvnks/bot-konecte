/**
 * check-api-url.js
 * Script para verificar la URL de la API configurada en el entorno
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Obtener la URL de la API del entorno o usar el valor por defecto
const API_BASE_URL = process.env.KONECTE_API_URL || 'https://konecte.vercel.app/api/whatsapp-bot';

// Función para verificar si una URL es accesible
async function checkUrlAccessible(url) {
  try {
    console.log(`Verificando accesibilidad de: ${url}`);
    const response = await axios.get(url, { 
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Aceptar cualquier código de estado menor a 500
      }
    });
    
    console.log(`Respuesta de ${url}:`);
    console.log(`- Código de estado: ${response.status}`);
    console.log(`- Tipo de contenido: ${response.headers['content-type']}`);
    
    if (response.data) {
      if (typeof response.data === 'object') {
        console.log('- Datos de respuesta:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`- Respuesta (primeros 200 caracteres): ${String(response.data).substring(0, 200)}...`);
      }
    }
    
    return {
      accessible: true,
      status: response.status,
      contentType: response.headers['content-type'],
      isJson: response.headers['content-type']?.includes('application/json'),
      isHtml: response.headers['content-type']?.includes('text/html')
    };
  } catch (error) {
    console.error(`Error al acceder a ${url}:`, error.message);
    
    if (error.response) {
      console.error(`- Código de estado: ${error.response.status}`);
      console.error(`- Datos de error:`, error.response.data);
    } else if (error.request) {
      console.error('- No se recibió respuesta del servidor');
    }
    
    return {
      accessible: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Función para verificar todas las variantes posibles de la URL de la API
async function checkAllApiUrlVariants() {
  console.log('=== VERIFICACIÓN DE URL DE API ===');
  console.log(`URL base configurada: ${API_BASE_URL}`);
  console.log('===============================\n');
  
  // Comprobar URL base
  console.log('1. Verificando URL base:');
  const baseResult = await checkUrlAccessible(API_BASE_URL);
  console.log(`Resultado: ${baseResult.accessible ? 'Accesible' : 'No accesible'}\n`);
  
  // Comprobar endpoint de mensajes pendientes
  console.log('2. Verificando endpoint de mensajes pendientes:');
  const pendingResult = await checkUrlAccessible(`${API_BASE_URL}/pending-messages`);
  console.log(`Resultado: ${pendingResult.accessible ? 'Accesible' : 'No accesible'}\n`);
  
  // Comprobar endpoint de recepción de respuestas
  console.log('3. Verificando endpoint de recepción de respuestas:');
  console.log('(Este endpoint requiere una solicitud POST, solo verificamos si responde)');
  const replyResult = await checkUrlAccessible(`${API_BASE_URL}/receive-reply`);
  console.log(`Resultado: ${replyResult.accessible ? 'Accesible' : 'No accesible'}\n`);
  
  // Comprobar posibles variaciones de URL
  if (!baseResult.accessible) {
    console.log('4. Probando variaciones alternativas de la URL base:');
    
    // Variante sin el prefijo 'api'
    if (API_BASE_URL.includes('/api/')) {
      const noApiPrefix = API_BASE_URL.replace('/api/', '/');
      console.log(`\n4.1. Probando sin prefijo 'api': ${noApiPrefix}`);
      await checkUrlAccessible(noApiPrefix);
    }
    
    // Variante con la URL base sin la parte final
    const urlParts = API_BASE_URL.split('/');
    if (urlParts.length > 3) {
      const baseUrlOnly = urlParts.slice(0, 3).join('/');
      console.log(`\n4.2. Probando solo URL base: ${baseUrlOnly}`);
      await checkUrlAccessible(baseUrlOnly);
    }
    
    // Variante con https en lugar de http o viceversa
    if (API_BASE_URL.startsWith('https://')) {
      const httpVariant = API_BASE_URL.replace('https://', 'http://');
      console.log(`\n4.3. Probando con HTTP en lugar de HTTPS: ${httpVariant}`);
      await checkUrlAccessible(httpVariant);
    } else if (API_BASE_URL.startsWith('http://')) {
      const httpsVariant = API_BASE_URL.replace('http://', 'https://');
      console.log(`\n4.4. Probando con HTTPS en lugar de HTTP: ${httpsVariant}`);
      await checkUrlAccessible(httpsVariant);
    }
  }
  
  // Resumen y recomendaciones
  console.log('\n=== RESUMEN DE VERIFICACIÓN ===');
  console.log(`URL base: ${baseResult.accessible ? '✅ Accesible' : '❌ No accesible'}`);
  console.log(`Endpoint de mensajes pendientes: ${pendingResult.accessible ? '✅ Accesible' : '❌ No accesible'}`);
  console.log(`Endpoint de recepción de respuestas: ${replyResult.accessible ? '✅ Accesible' : '❌ No accesible'}`);
  
  if (!baseResult.accessible || !pendingResult.accessible || !replyResult.accessible) {
    console.log('\n⚠️ RECOMENDACIONES:');
    console.log('1. Verifica que la URL de la API sea correcta en el archivo .env');
    console.log('2. Asegúrate de que el servidor de la API esté en funcionamiento');
    console.log('3. Consulta con el proveedor de la API para confirmar las rutas correctas');
    console.log('4. Verifica la conectividad de red desde este servidor hacia la API');
  } else {
    console.log('\n✅ Todos los endpoints parecen estar accesibles.');
  }
}

// Ejecutar la verificación
checkAllApiUrlVariants().catch(error => {
  console.error('Error general en la verificación:', error);
}); 