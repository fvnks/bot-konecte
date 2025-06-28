/**
 * botReplyService.js
 * Servicio utilitario para procesar mensajes y generar la respuesta del bot
 */

const axios = require('axios'); // Importar axios
const geminiService = require('./geminiService');
const googleSheetsService = require('./googleSheetsService');
const { handleCommand } = require('./commandHandler');

// Almacenamiento temporal para el contexto de la conversación
const conversationContext = new Map();

/**
 * Procesa un mensaje y devuelve la respuesta adecuada del bot
 * @param {Object} params
 * @param {string} params.text - Texto del mensaje recibido
 * @param {string} params.from - Número del usuario (formato WhatsApp)
 * @param {Object} params.client - Cliente de WhatsApp Web JS
 * @param {string} [params.senderName] - Nombre del usuario (opcional)
 * @returns {Promise<string>} Respuesta del bot
 */
async function getBotReply({ text, from, client, senderName }) {
  
  // --- Verificación de Permisos contra la API de Konecte ---
  try {
    const konecteApiUrl = process.env.KONECTE_API_URL || 'https://konecte.vercel.app'; // Fallback a producción
    
    // Distinguir entre un ID de usuario web y un número de WhatsApp
    const isWebUser = !from.includes('@');
    let accessCheckUrl;
    let identifier;

    if (isWebUser) {
      identifier = from; // 'from' es el userId
      accessCheckUrl = `${konecteApiUrl}/api/users/by-id/${identifier}/check-access`;
      console.log(`[BOT-REPLY] Verificando permisos de usuario web por ID: ${identifier}`);
    } else {
      const rawPhone = from.split('@')[0]; // 'from' es 'numero@c.us'
      identifier = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`; // Asegurar que tenga el '+'
      accessCheckUrl = `${konecteApiUrl}/api/users/by-phone/${identifier}`;
      console.log(`[BOT-REPLY] Verificando permisos de usuario de WhatsApp por Teléfono: ${identifier}`);
    }

    const response = await axios.get(accessCheckUrl);
    
    if (!response.data || !response.data.hasWhatsAppAccess) {
      console.log(`[BOT-REPLY] Acceso denegado para ${identifier}. Razón: ${response.data.reason || 'No tiene acceso a WhatsApp según su plan.'}`);
      return 'Acceso denegado. Tu plan actual no incluye acceso a la interacción por WhatsApp.';
    }

    console.log(`[BOT-REPLY] Acceso permitido para ${identifier}.`);

  } catch (error) {
    const identifier = from.includes('@') ? from.split('@')[0] : from;
    if (error.response) {
      // El servidor de Konecte respondió con un status code fuera del rango 2xx
      console.error(`[BOT-REPLY] Error de API de Konecte al verificar permisos para ${identifier}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      console.error(`[BOT-REPLY] No se recibió respuesta de Konecte al verificar permisos para ${identifier}.`);
    } else {
      // Algo más causó el error
      console.error(`[BOT-REPLY] Error al configurar la solicitud a Konecte para ${identifier}:`, error.message);
    }
    // Para cualquier error de verificación, denegar el acceso.
    return 'No se pudo verificar tu acceso en este momento. Por favor, intenta más tarde.';
  }
  // --- Fin de la Verificación de Permisos ---

  console.log(`[BOT-REPLY] Mensaje original: "${text}"`);
  // Limpiar el texto de entrada: quitar espacios y posibles caracteres de formato de WhatsApp
  const cleanedText = text.trim().replace(/^\*+|\*+$/g, '').toLowerCase(); // Eliminar asteriscos iniciales/finales y convertir a minúsculas
  console.log(`[BOT-REPLY] Texto limpio: "${cleanedText}"`);

  // Obtener el contexto de la conversación actual
  const userContext = conversationContext.get(from) || { lastQuestion: null, searchCriteria: null };
  console.log(`[BOT-REPLY] Contexto actual para ${from}:`, userContext);

  // Verificar si estamos esperando una respuesta específica
  if (userContext.lastQuestion === 'createAlert') {
    // El usuario está respondiendo a la pregunta sobre crear una alerta
    if (cleanedText === 'si' || cleanedText === 'sí' || cleanedText === 's' || cleanedText === 'yes') {
      // Actualizar el contexto
      userContext.lastQuestion = null;
      conversationContext.set(from, userContext);
      
      // Guardar la alerta (aquí podrías implementar la lógica para guardar en la base de datos)
      return `✅ ¡Perfecto! He creado una alerta para tu búsqueda. Te notificaré cuando aparezcan propiedades que coincidan con tus criterios. 🔔`;
    } 
    else if (cleanedText === 'no' || cleanedText === 'n' || cleanedText === 'not') {
      // Actualizar el contexto
      userContext.lastQuestion = null;
      conversationContext.set(from, userContext);
      
      return `👍 Entendido. No crearé una alerta para esta búsqueda. Si necesitas algo más, estoy aquí para ayudarte.`;
    }
  }

  // 1. Comando directo
  if (cleanedText.startsWith('!')) {
    try {
      // Asegurarse de pasar un objeto msg con 'from' para compatibilidad
      const commandReplyHandled = await handleCommand(cleanedText, client, { from }, false); // Pasar cleanedText al commandHandler
      if (commandReplyHandled) return null; // Devolver null para indicar que el comando ya fue manejado y se envió una respuesta.
    } catch (err) {
      console.error('[BOT-REPLY] Error al procesar comando:', err);
      return '❌ Ocurrió un error al procesar tu comando.';
    }
  }

  // 2. Saludo/bienvenida
  const greetings = ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos', 'ey', 'hey', 'ola', 'buen día', 'buenas'];
  const lowerText = cleanedText; // Usar cleanedText para saludos también
  if (greetings.some(g => lowerText === g || lowerText.startsWith(g + ' '))) {
    return `¡Hola! 👋 Soy tu asistente virtual de Konecte. ¿Qué te gustar hacer?

1. 🔎 Buscar (Propiedades o Solicitudes)
2. 📋 Publicar (Propiedades o Solicitudes)`;
  }

  // 3. Manejar opciones de menú (buscar/ofrecer) con sinónimos
  const buscarKeywords = ['1', 'buscar', 'busco', 'búsqueda', 'busqueda', 'buscar una propiedad'];
  const ofrecerKeywords = ['2', 'ofrecer', 'ofrezco', 'ofresca', 'ofrecer una propiedad'];

  if (buscarKeywords.includes(lowerText)) {
    return `¡Genial! Para ayudarte a encontrar tu lugar ideal, por favor, descríbeme lo que buscas. Mientras más detalles me des, mejor. Puedes guiarte con este formato:

Busco/Ofrezco: Busco
Tipo de operación: Arriendo / Compra
Tipo de propiedad: []
Región: []
Ciudad: []
Comunas preferidas: []
Dormitorios mínimos: []
Baños mínimos: []
Estacionamiento requerido: Sí / No / Indiferente
Bodega: Sí / No / Indiferente
Presupuesto máximo: []
Moneda: CLP / UF
Gastos comunes incluidos?: Sí / No / Indiferente
Metros cuadrados mínimos: []`;
  }

  if (ofrecerKeywords.includes(lowerText)) {
    return `¡Perfecto! Para publicar tu propiedad, por favor, envíame todos los detalles. Para que no se me escape nada, idealmente sigue este formato:

Busco/Ofrezco: Ofrezco
Tipo de operación: Venta / Arriendo
Tipo de propiedad: []
Región: []
Ciudad: []
Comuna: []
Dormitorios: []
Baños: []
Estacionamiento: Sí / No
Bodega: Sí / No
Valor: []`;
  }

  // 4. Responder a confirmaciones simples (sí/no)
  const yesPatterns = ['si', 'sí', 'yes', 'claro', 'por supuesto', 'dale', 'ok', 'okay'];
  const noPatterns = ['no', 'nope', 'negativo', 'para nada'];
  
  if (yesPatterns.includes(lowerText) || yesPatterns.some(p => lowerText.startsWith(p + ' '))) {
    if (userContext.lastQuestion === 'createAlert') {
      // Actualizar el contexto
      userContext.lastQuestion = null;
      conversationContext.set(from, userContext);
      
      return `✅ ¡Perfecto! He creado una alerta para tu búsqueda. Te notificaré cuando aparezcan propiedades que coincidan con tus criterios. 🔔`;
    }
  }
  
  if (noPatterns.includes(lowerText) || noPatterns.some(p => lowerText.startsWith(p + ' '))) {
    if (userContext.lastQuestion === 'createAlert') {
      // Actualizar el contexto
      userContext.lastQuestion = null;
      conversationContext.set(from, userContext);
      
      return `👍 Entendido. No crearé una alerta para esta búsqueda. Si necesitas algo más, estoy aquí para ayudarte.`;
    }
  }

  // 5. Búsqueda inteligente con IA/Gemini
  if (lowerText.includes('busco') || lowerText.includes('ofrezco') || 
      lowerText.includes('buscar') || lowerText.includes('ofrecer') ||
      lowerText.includes('departamento') || lowerText.includes('casa') || 
      lowerText.includes('oficina') || lowerText.includes('propiedad')) {
    try {
      // Extraer criterios con Gemini
      const searchCriteria = await geminiService.extractPropertyDetails(cleanedText); // Pasar cleanedText a Gemini
      console.log('[BOT-REPLY] Criterios de búsqueda extraídos por Gemini:', JSON.stringify(searchCriteria));
      
      // Guardar los criterios de búsqueda en el contexto
      userContext.searchCriteria = searchCriteria;
      conversationContext.set(from, userContext);
      
      if (!searchCriteria || Object.keys(searchCriteria).length === 0) {
        return '🤔 No pude identificar criterios de búsqueda claros en tu mensaje. ¿Podrías ser más específico?';
      }
      
      // Buscar propiedades en Google Sheets
      const results = await googleSheetsService.findProperties(searchCriteria);
      if (typeof results === 'string') {
        return results;
      }
      if (!Array.isArray(results) || results.length === 0) {
        let tipoAccionMensaje = searchCriteria.tipoOperacion === 'busco' ? 'buscadas' : 'ofrecidas';
        
        // Establecer que estamos esperando una respuesta sobre crear una alerta
        userContext.lastQuestion = 'createAlert';
        conversationContext.set(from, userContext);
        
        return `😔 *No encontré propiedades ${tipoAccionMensaje}* del tipo "${searchCriteria.tipoPropiedad}" en ${searchCriteria.ubicacion || 'ninguna comuna especificada'}.

✅ Tu búsqueda ha sido registrada en nuestra base de datos. 📝

¿Quieres que cree una alerta para notificarte si aparece algo nuevo? 🔔 (Responde *Sí* o *No*)`;
      }
      // Formatear resultados
      const maxResultsToShow = 5;
      const totalResults = results.length;
      const resultsToShow = results.slice(0, maxResultsToShow);
      let resultsMessage = `🏠 *Encontré ${totalResults} propiedades que coinciden con tu búsqueda:*
\n`;
      resultsToShow.forEach((property, index) => {
        resultsMessage += `*Propiedad ${index + 1}:*\n`;
        if (property.tipoPropiedad) resultsMessage += `• Tipo: ${property.tipoPropiedad} 🏢\n`;
        if (property.tipoOperacion) resultsMessage += `• Operación: ${property.tipoOperacion} 📋\n`;
        if (property.ubicacion) resultsMessage += `• Ubicación: ${property.ubicacion} 📍\n`;
        if (property.precio) resultsMessage += `• Precio: ${property.precio} 💰\n`;
        if (property.dormitorios) resultsMessage += `• Dormitorios: ${property.dormitorios} 🛏️\n`;
        if (property.banos) resultsMessage += `• Baños: ${property.banos} 🚿\n`;
        if (property.metrosCuadrados) resultsMessage += `• Superficie: ${property.metrosCuadrados} m² 📐\n`;
        if (property.contacto) resultsMessage += `• Contacto: ${property.contacto} 📞\n`;
        if (property.link) resultsMessage += `• Más info: ${property.link} 🔗\n`;
        resultsMessage += '\n';
      });
      if (totalResults > maxResultsToShow) {
        resultsMessage += `*...y ${totalResults - maxResultsToShow} propiedades más.*\n`;
      }
      return resultsMessage;
    } catch (err) {
      console.error('[BOT-REPLY] Error al procesar búsqueda IA/Sheets:', err);
      return '❌ Ocurrió un error al procesar tu búsqueda. Intenta nuevamente.';
    }
  }

  // 6. Respuesta por defecto
  return '🤖 No entendí tu mensaje. Escribe *!ayuda* para ver opciones o intenta con una búsqueda como "Busco departamento en Santiago".';
}

module.exports = {
  getBotReply
}; 