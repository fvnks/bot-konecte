/**
 * api-sync.js
 * Módulo para sincronizar el bot de WhatsApp con la API de Konecte
 */

const axios = require('axios');
const whatsappService = require('./whatsappService');
const botReplyService = require('./botReplyService');

// URL base de la API
const API_BASE_URL = process.env.KONECTE_API_URL || 'https://konecte.vercel.app/api/whatsapp-bot';

// URL para webhooks (No-IP)
const WEBHOOK_URL = process.env.KONECTE_WEBHOOK_URL || 'https://konecte.ddns.net';

// Intervalo de consulta en milisegundos (3 segundos)
const POLLING_INTERVAL = 3000;

// Activar logs detallados
const DEBUG_MODE = true;

// Almacenamiento local para mensajes procesados (simulación de base de datos)
const processedMessageIds = new Set();

// Variable para almacenar el intervalo
let pollingInterval = null;

/**
 * Inicializa la sincronización con la API
 * @param {Object} client - Cliente de WhatsApp Web JS
 */
function initApiSync(client) {
  if (!client) {
    console.error('ERROR: No se proporcionó un cliente de WhatsApp válido para la sincronización con API');
    return;
  }

  console.log('Inicializando sincronización con API Konecte...');

  // Iniciar el polling de mensajes pendientes (comentado para usar webhooks)
  // startPolling(client);

  // Configurar el listener para mensajes entrantes (deshabilitado para evitar duplicación con webhook)
  // setupMessageListener(client);

  console.log('Sincronización con API Konecte inicializada correctamente');
}

/**
 * Inicia el polling de mensajes pendientes
 * @param {Object} client - Cliente de WhatsApp Web JS
 */
function startPolling(client) {
  // Limpiar cualquier intervalo existente
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  // Configurar el nuevo intervalo (comentado para usar webhooks)
  /*
  pollingInterval = setInterval(async () => {
    try {
      await checkPendingMessages(client);
    } catch (error) {
      console.error('ERROR en polling de mensajes pendientes:', error.message);
    }
  }, POLLING_INTERVAL);
  */

  console.log(`Polling de mensajes pendientes deshabilitado. Usando Webhooks.`);
}

/**
 * Detiene el polling de mensajes pendientes
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('Polling de mensajes pendientes detenido');
  }
}

/**
 * Consulta los mensajes pendientes en la API
 * @param {Object} client - Cliente de WhatsApp Web JS
 */
async function checkPendingMessages(client) {
  try {
    // Log detallado de inicio de consulta
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] [${new Date().toISOString()}] Consultando mensajes pendientes en: ${API_BASE_URL}/pending-messages`);
    }
    
    // Ruta: /pending-messages
    const response = await axios.get(`${API_BASE_URL}/pending-messages`, {
      timeout: 10000, // Aumentar timeout a 10 segundos
      headers: {
        'User-Agent': 'Botito-WhatsApp/1.0',
        'Accept': 'application/json'
      }
    });
    
    // Log detallado de respuesta
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] [${new Date().toISOString()}] Respuesta recibida con estado: ${response.status}`);
      console.log(`[API-SYNC] Cabeceras de respuesta:`, JSON.stringify(response.headers, null, 2));
    }
    
    if (!response.data.success) {
      console.error('[API-SYNC] Error en respuesta de API:', response.data);
      return;
    }
    
    const pendingMessages = response.data.messages || [];
    
    // Log detallado de mensajes encontrados
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] Se encontraron ${pendingMessages.length} mensajes pendientes`);
      if (pendingMessages.length > 0) {
        console.log('[API-SYNC] Resumen de mensajes pendientes:');
        pendingMessages.forEach((msg, index) => {
          const telefonoResumen = msg.telefonoRemitenteParaRespuestaKonecte || msg.telefono || '[SIN TELÉFONO]';
          const textoResumen = msg.textoOriginal ? msg.textoOriginal.substring(0, 30) : '[SIN TEXTO]';
          console.log(`[API-SYNC] - Mensaje ${index + 1}: ID=${msg.id}, Teléfono=${telefonoResumen}, Texto=${textoResumen}...`);
        });
      }
    }
    
    // Procesar cada mensaje pendiente
    for (const message of pendingMessages) {
      // Verificar si el mensaje ya fue procesado
      if (processedMessageIds.has(message.id)) {
        console.log(`[API-SYNC] Mensaje ${message.id} ya fue procesado anteriormente, omitiendo`);
        continue;
      }
      
      if (DEBUG_MODE) {
        console.log(`[API-SYNC] Procesando mensaje ID=${message.id} para teléfono ${message.telefonoRemitenteParaRespuestaKonecte}`);
      }
      
      // Enviar el mensaje por WhatsApp
      await sendWhatsAppMessage(client, message);
      
      // Marcar el mensaje como procesado
      processedMessageIds.add(message.id);
      
      if (DEBUG_MODE) {
        console.log(`[API-SYNC] Mensaje ID=${message.id} marcado como procesado. Total procesados: ${processedMessageIds.size}`);
      }
      
      // Si el conjunto crece demasiado, limpiarlo (opcional)
      if (processedMessageIds.size > 1000) {
        console.log('[API-SYNC] Limpiando caché de mensajes procesados...');
        const idsArray = Array.from(processedMessageIds);
        const recentIds = idsArray.slice(idsArray.length - 500);
        processedMessageIds.clear();
        recentIds.forEach(id => processedMessageIds.add(id));
        console.log(`[API-SYNC] Caché de mensajes limpiado. Manteniendo últimos 500 mensajes.`);
      }
    }
  } catch (error) {
    console.error(`[API-SYNC] [${new Date().toISOString()}] Error al consultar mensajes pendientes:`, error.message);
    
    // Log detallado del error
    if (DEBUG_MODE) {
      console.error('[API-SYNC] Stack de error:', error.stack);
      
      if (error.code) {
        console.error(`[API-SYNC] Código de error: ${error.code}`);
      }
      
      if (error.request) {
        console.error('[API-SYNC] La solicitud se realizó pero no se recibió respuesta');
        console.error('[API-SYNC] Detalles de la solicitud:', {
          method: error.request.method,
          path: error.request.path,
          host: error.request.host
        });
      }
    }
    
    if (error.response) {
      console.error('[API-SYNC] Detalles de error de respuesta:');
      console.error(`[API-SYNC] - Estado: ${error.response.status}`);
      console.error(`[API-SYNC] - Datos:`, error.response.data);
      console.error(`[API-SYNC] - Cabeceras:`, error.response.headers);
    }
  }
}

/**
 * Envía un mensaje a través de WhatsApp
 * @param {Object} client - Cliente de WhatsApp Web JS
 * @param {Object} message - Mensaje a enviar
 */
async function sendWhatsAppMessage(client, message) {
  try {
    let phoneNumber = message.telefonoRemitenteParaRespuestaKonecte;
    let text = message.textoOriginal;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !text || typeof text !== 'string') {
      console.error(`[API-SYNC] Error: El mensaje ID=${message.id || 'sin-id'} no tiene un número de teléfono o texto válido. Se omite.`);
      return;
    }

    // Procesar el mensaje usando la lógica del bot
    const respuesta = await botReplyService.getBotReply({
      text,
      from: phoneNumber,
      client,
      senderName: phoneNumber
    });
    if (respuesta) {
      // Formatear el número para WhatsApp Web JS
      let formattedNumber = phoneNumber;
      if (!formattedNumber.includes('@c.us')) {
        if (formattedNumber.startsWith('+')) {
          formattedNumber = formattedNumber.substring(1);
        }
        formattedNumber = `${formattedNumber}@c.us`;
      }
      await client.sendMessage(formattedNumber, respuesta);
    }
    // Notificar a la API que el mensaje fue enviado
    await notifyMessageSent(phoneNumber, respuesta || text);
    return;
  } catch (error) {
    console.error(`[API-SYNC] Error al enviar mensaje: ${error.message}`);
  }
}

/**
 * Notifica a la API que un mensaje fue enviado o recibido
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} text - Texto del mensaje
 */
async function notifyMessageSent(phoneNumber, text) {
  try {
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] [${new Date().toISOString()}] Iniciando notificación a API para número: ${phoneNumber}`);
    }
    
    // Asegurarse de que el número tenga el formato correcto para la API
    // (con el signo + al principio si no lo tiene)
    if (!phoneNumber.startsWith('+') && !phoneNumber.includes('@c.us')) {
      phoneNumber = `+${phoneNumber}`;
      if (DEBUG_MODE) {
        console.log(`[API-SYNC] Añadido '+' al número: ${phoneNumber}`);
      }
    }
    
    // Si el número tiene el formato @c.us, extraer solo el número
    if (phoneNumber.includes('@c.us')) {
      phoneNumber = `+${phoneNumber.split('@')[0]}`;
      if (DEBUG_MODE) {
        console.log(`[API-SYNC] Número extraído del formato @c.us: ${phoneNumber}`);
      }
    }
    
    console.log(`[API-SYNC] Notificando envío de mensaje a API para ${phoneNumber}`);
    
    // Crear el payload
    const payload = {
      telefono: phoneNumber,
      text: text
    };
    
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] Enviando POST a ${API_BASE_URL}/receive-reply`);
      console.log(`[API-SYNC] Payload:`, JSON.stringify(payload, null, 2));
    }
    
    // Ruta: /receive-reply
    const response = await axios.post(`${API_BASE_URL}/receive-reply`, payload, {
      timeout: 10000, // Aumentar timeout a 10 segundos
      headers: {
        'User-Agent': 'Botito-WhatsApp/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (DEBUG_MODE) {
      console.log(`[API-SYNC] Respuesta de API recibida con estado: ${response.status}`);
      console.log(`[API-SYNC] Datos de respuesta:`, JSON.stringify(response.data, null, 2));
    }
    
    if (response.data.success) {
      console.log('[API-SYNC] Notificación de mensaje enviada exitosamente a la API');
    } else {
      console.error('[API-SYNC] Error al notificar mensaje a la API:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error(`[API-SYNC] Error al notificar mensaje a la API: ${error.message}`);
    
    if (DEBUG_MODE) {
      console.error('[API-SYNC] Stack de error:', error.stack);
      
      if (error.code) {
        console.error(`[API-SYNC] Código de error: ${error.code}`);
      }
      
      if (error.request) {
        console.error('[API-SYNC] La solicitud se realizó pero no se recibió respuesta');
        console.error('[API-SYNC] Detalles de la solicitud:', {
          method: error.request.method,
          path: error.request.path,
          host: error.request.host
        });
      }
    }
    
    if (error.response) {
      console.error('[API-SYNC] Detalles de error de respuesta:');
      console.error(`[API-SYNC] - Estado: ${error.response.status}`);
      console.error(`[API-SYNC] - Datos:`, error.response.data);
      console.error(`[API-SYNC] - Cabeceras:`, error.response.headers);
    }
    
    // No propagar el error para evitar interrumpir el flujo principal
    return { success: false, error: error.message };
  }
}

/**
 * Configura el listener para mensajes entrantes de WhatsApp
 * @param {Object} client - Cliente de WhatsApp Web JS
 */
function setupMessageListener(client) {
  client.on('message', async (msg) => {
    try {
      // Ignorar mensajes enviados por el propio bot
      if (msg.fromMe) {
        return;
      }
      
      // Obtener información del mensaje
      const sender = msg.from;
      const messageText = msg.body;
      
      console.log(`Mensaje recibido de ${sender}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);
      
      // Notificar a la API sobre el mensaje recibido
      await notifyMessageSent(sender, messageText);
      
    } catch (error) {
      console.error('Error al procesar mensaje entrante:', error.message);
    }
  });
  
  console.log('Listener de mensajes entrantes configurado');
}

module.exports = {
  initApiSync,
  startPolling,
  stopPolling,
  notifyMessageSent
}; 