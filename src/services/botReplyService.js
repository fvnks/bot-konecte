/**
 * botReplyService.js
 * Servicio utilitario para procesar mensajes y generar la respuesta del bot
 */

const axios = require('axios'); // Importar axios
const geminiService = require('./geminiService');
const googleSheetsService = require('./googleSheetsService');
const { handleCommand } = require('./commandHandler');
const { conversationContext } = require('./conversationStateService'); // Usar estado centralizado

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
  const userContext = conversationContext.get(from) || { lastQuestion: null, publicationData: {} };
  console.log(`[BOT-REPLY] Contexto actual para ${from}:`, userContext);

  // --- INICIO: Flujo de Publicación Conversacional ---

  // Etapa 1: Preguntar tipo de publicación (Propiedad o Solicitud)
  if (userContext.lastQuestion === 'awaiting_publication_type') {
    if (cleanedText.includes('1') || cleanedText.includes('propiedad')) {
        userContext.lastQuestion = 'prop_awaiting_title';
        userContext.publicationData = { tipo: 'propiedad' }; // Reiniciar datos
        conversationContext.set(from, userContext);
        return `¡Excelente! Vamos a publicar una *Propiedad*.

Primero, dime el *título* para tu publicación.
(Ej: Lindo departamento con vista al mar en Concón)`;
    } else if (cleanedText.includes('2') || cleanedText.includes('solicitud')) {
        // Flujo de solicitud (simplificado por ahora)
        userContext.lastQuestion = 'awaiting_request_details';
        userContext.publicationData = { tipo: 'solicitud' };
        conversationContext.set(from, userContext);
        return `¡Entendido! Para publicar tu *Solicitud*, por favor describe en un solo mensaje qué buscas, incluyendo tipo de propiedad, comuna y presupuesto.`;
    } else {
        return 'Por favor, elige una opción válida: *1* para Propiedad o *2* para Solicitud.';
    }
  }

  // Etapa 2: Recopilar título de la propiedad
  else if (userContext.lastQuestion === 'prop_awaiting_title') {
    userContext.publicationData.titulo = text; // Guardar texto original con mayúsculas
    userContext.lastQuestion = 'prop_awaiting_description';
    conversationContext.set(from, userContext);
    return `¡Perfecto! Ahora, por favor, dame una *descripción detallada* de tu propiedad.`;
  }

  // Etapa 3: Recopilar descripción
  else if (userContext.lastQuestion === 'prop_awaiting_description') {
    userContext.publicationData.descripcion = text;
    userContext.lastQuestion = 'prop_awaiting_transaction';
    conversationContext.set(from, userContext);
    return `¡Muy bien! ¿La propiedad es para *Venta* o *Arriendo*?`;
  }

  // Etapa 4: Recopilar tipo de transacción
  else if (userContext.lastQuestion === 'prop_awaiting_transaction') {
    userContext.publicationData.operacion = text;
    userContext.lastQuestion = 'prop_awaiting_category';
    conversationContext.set(from, userContext);
    return `Entendido. Ahora dime la *categoría* de la propiedad (Ej: Casa, Departamento, Oficina, Terreno, etc.)`;
  }

  // Etapa 5: Recopilar categoría
  else if (userContext.lastQuestion === 'prop_awaiting_category') {
    userContext.publicationData.categoria = text;
    userContext.lastQuestion = 'prop_awaiting_price';
    conversationContext.set(from, userContext);
    return `Genial. ¿Cuál es el *precio* de la propiedad? Por favor, indícalo junto con la moneda (Ej: 5000 UF o 120000000 CLP)`;
  }

  // Etapa 6: Recopilar precio y moneda
  else if (userContext.lastQuestion === 'prop_awaiting_price') {
    const priceText = cleanedText;
    const priceMatch = priceText.match(/([\d.,]+)/);
    userContext.publicationData.valor = priceMatch ? parseFloat(priceMatch[1].replace(/[,.]/g, '')) : 0;
    userContext.publicationData.moneda = priceText.toLowerCase().includes('uf') ? 'UF' : 'CLP';
    userContext.lastQuestion = 'prop_awaiting_location';
    conversationContext.set(from, userContext);
    return `¡Anotado! Ahora, por favor, dime la *comuna* donde se encuentra la propiedad.`;
  }

  // Etapa 7: Recopilar ubicación
  else if (userContext.lastQuestion === 'prop_awaiting_location') {
    userContext.publicationData.comuna = text;
    userContext.lastQuestion = 'prop_awaiting_area';
    conversationContext.set(from, userContext);
    return `Ok. ¿Cuál es la *superficie total* en metros cuadrados? (Solo el número)`;
  }

  // Etapa 8: Recopilar superficie
  else if (userContext.lastQuestion === 'prop_awaiting_area') {
    userContext.publicationData.superficie = parseInt(cleanedText, 10) || 0;
    userContext.lastQuestion = 'prop_awaiting_rooms';
    conversationContext.set(from, userContext);
    return `Casi listos. Por favor, indícame el número de *dormitorios, baños y estacionamientos*, separados por comas. (Ej: 3, 2, 1)`;
  }

  // Etapa 9: Recopilar dormitorios, baños, estacionamientos
  else if (userContext.lastQuestion === 'prop_awaiting_rooms') {
    const parts = cleanedText.split(',').map(p => parseInt(p.trim(), 10) || 0);
    userContext.publicationData.dormitorios = parts[0] || 0;
    userContext.publicationData.banos = parts[1] || 0;
    userContext.publicationData.estacionamientos = parts[2] || 0;
    userContext.lastQuestion = 'prop_awaiting_features';
    conversationContext.set(from, userContext);
    return `¡Última pregunta! Menciona algunas *características adicionales* separadas por comas (Ej: Piscina, Quincho, Bodega). Si no tiene, escribe "Ninguna".`;
  }

  // Etapa 10: Recopilar características y pedir confirmación
  else if (userContext.lastQuestion === 'prop_awaiting_features') {
    userContext.publicationData.caracteristicas = text;
    userContext.lastQuestion = 'prop_awaiting_confirmation';
    conversationContext.set(from, userContext);

    const data = userContext.publicationData;
    const summary = `¡Hemos terminado! Por favor, revisa que toda la información sea correcta:\n
*Título:* ${data.titulo}
*Operación:* ${data.operacion}
*Categoría:* ${data.categoria}
*Comuna:* ${data.comuna}
*Precio:* ${data.valor} ${data.moneda}
*Superficie:* ${data.superficie} m²
*Dormitorios:* ${data.dormitorios}
*Baños:* ${data.banos}
*Estacionamientos:* ${data.estacionamientos}
*Características:* ${data.caracteristicas}
*Descripción:* ${data.descripcion}\n
¿Es todo correcto? Responde *Sí* para publicar o *No* para cancelar.`;
    return summary;
  }
  
  // Etapa 11: Confirmación final y publicación
  else if (userContext.lastQuestion === 'prop_awaiting_confirmation') {
    if (cleanedText === 'si' || cleanedText === 'sí') {
        try {
            const konecteApiUrl = process.env.KONECTE_API_URL || 'https://konecte.vercel.app';
            const rawPhone = from.split('@')[0];
            const userPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

            const payload = {
                ...userContext.publicationData,
                userPhone: userPhone,
                source: 'whatsapp'
            };
            
            console.log('[BOT-REPLY] Enviando payload a Konecte:', JSON.stringify(payload));
            await axios.post(`${konecteApiUrl}/api/listings`, payload);
            
            conversationContext.delete(from);
            return '¡Excelente! ✨ Tu publicación ha sido creada exitosamente en Konecte. La verás reflejada en el sitio web muy pronto.';
        } catch(error) {
            console.error('[BOT-REPLY] Error al enviar la publicación a Konecte:', error.response ? error.response.data : error.message);
            conversationContext.delete(from);
            return '❌ Ocurrió un error al conectar con Konecte. No se pudo crear tu publicación. Por favor, intenta más tarde.';
        }
    } else {
        conversationContext.delete(from);
        return 'Entendido. He cancelado la publicación. Si quieres empezar de nuevo, solo dímelo.';
    }
  }

  // Flujo de publicación para solicitudes (simplificado)
  else if (userContext.lastQuestion === 'awaiting_request_details') {
    try {
        const extractedDetails = await geminiService.extractPublicationDetails(text, 'Solicitud');
        const konecteApiUrl = process.env.KONECTE_API_URL || 'https://konecte.vercel.app';
        const rawPhone = from.split('@')[0];
        const userPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;
        const payload = { ...extractedDetails, tipo: 'solicitud', userPhone, source: 'whatsapp' };
        
        await axios.post(`${konecteApiUrl}/api/listings`, payload);
        conversationContext.delete(from);
        return '¡Perfecto! ✨ Tu solicitud ha sido publicada en Konecte.';
    } catch(error) {
        console.error('[BOT-REPLY] Error al procesar publicación de solicitud:', error.response ? error.response.data : error.message);
        conversationContext.delete(from);
        return '❌ Hubo un error al procesar tu solicitud. Por favor, intenta más tarde.';
    }
  }
  // --- FIN: Flujo de Publicación Conversacional ---

  // Verificar si estamos esperando una respuesta específica (ej: alerta)
  else if (userContext.lastQuestion === 'createAlert') {
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
  const ofrecerKeywords = ['2', 'publicar', 'ofrecer', 'ofrezco', 'ofresca', 'ofrecer una propiedad'];

  if (buscarKeywords.includes(cleanedText)) {
    // Establecer el contexto para la búsqueda inteligente
    const userContext = conversationContext.get(from) || {};
    userContext.lastQuestion = 'awaiting_search_query';
    conversationContext.set(from, userContext);

    return `¡Genial! Para ayudarte a encontrar lo que buscas, solo tienes que decírmelo. Por ejemplo: "busco casa en arriendo en viña del mar con 3 dormitorios".`;
  }

  if (ofrecerKeywords.includes(cleanedText)) {
    // Iniciar el flujo de publicación conversacional
    const userContext = conversationContext.get(from) || {};
    userContext.lastQuestion = 'awaiting_publication_type';
    conversationContext.set(from, userContext);
    return `¡Perfecto! Vamos a publicar.\n\n¿Qué deseas publicar?\n1. 🏡 Una Propiedad\n2. 📝 Una Solicitud`;
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
  // IMPORTANTE: Esta lógica solo se debe activar si no estamos en medio de otra conversación.
  if (!userContext.lastQuestion && 
      (lowerText.includes('busco') || lowerText.includes('ofrezco') || 
      lowerText.includes('buscar') || lowerText.includes('ofrecer') ||
      lowerText.includes('departamento') || lowerText.includes('casa') || 
      lowerText.includes('oficina') || lowerText.includes('propiedad'))) {
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