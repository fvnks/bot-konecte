/**
 * Controlador para manejar los webhooks de Konecte
 */

// Importar el servicio de WhatsApp
const whatsappService = require('../services/whatsappService');
const botReplyService = require('../services/botReplyService');

/**
 * Maneja los mensajes entrantes desde la plataforma Konecte
 * 
 * Formato esperado:
 * {
 *   "targetUserWhatsAppNumber": "+56XXXXXXXXX", // Número al que se enviará el mensaje
 *   "messageText": "Texto del mensaje"          // Mensaje a enviar
 * }
 */
exports.handleIncomingWebhook = async (req, res) => {
  try {
    const { targetUserWhatsAppNumber, messageText, isSync, source, userId } = req.body;
    
    // --- MANEJO DE MENSAJES DEL CHAT WEB DE KONECTE ---
    if (source === 'konecte-web' && userId) {
      console.log(`[WEBHOOK] Mensaje recibido desde Konecte Web para el usuario: ${userId}`);
      if (!messageText) {
        return res.status(400).json({ success: false, message: 'Falta messageText para el usuario web' });
      }

      try {
        // Usar el userId como identificador único para el contexto de la conversación
        const botResponse = await botReplyService.getBotReply({
          text: messageText,
          from: userId 
        });

        if (botResponse) {
          // Enviar la respuesta de vuelta al chat web de Konecte
          await whatsappService.sendReplyToKonecteWeb(userId, botResponse);
        }
        
        return res.status(200).json({ success: true, message: 'Respuesta enviada al chat web de Konecte' });

      } catch (error) {
        console.error(`[WEBHOOK] Error al procesar mensaje del chat web para ${userId}:`, error);
        return res.status(500).json({ success: false, message: 'Error procesando mensaje del chat web' });
      }
    }

    // --- MANEJO DE MENSAJES DE WHATSAPP (LÓGICA EXISTENTE) ---
    if (isSync) {
      console.log(`[WEBHOOK] Mensaje de sincronización de WhatsApp recibido para ${targetUserWhatsAppNumber}. No se reenviará.`);
      return res.status(200).json({
        success: true,
        message: 'Sync message received and logged.'
      });
    }
    
    if (!targetUserWhatsAppNumber || !messageText) {
      console.log('[KONECTE-WEBHOOK] Error: Faltan datos en la solicitud', req.body);
      return res.status(400).json({
        success: false,
        message: 'Se requiere targetUserWhatsAppNumber y messageText'
      });
    }

    console.log(`[WEBHOOK] Solicitud para enviar mensaje a ${targetUserWhatsAppNumber}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);
    
    // Obtener el cliente de WhatsApp
    const client = whatsappService.getWhatsAppClient();
    
    if (!client) {
      console.log('[WEBHOOK] Error: Cliente de WhatsApp no disponible');
      
      // Intentar inicializar el cliente
      try {
        console.log('[WEBHOOK] Intentando inicializar el cliente de WhatsApp...');
        await whatsappService.initWhatsAppClient();
        
        // Verificar si el cliente se inicializó correctamente
        const newClient = whatsappService.getWhatsAppClient();
        if (!newClient) {
          console.log('[WEBHOOK] Error: No se pudo inicializar el cliente de WhatsApp');
          return res.status(503).json({
            success: false,
            message: 'Cliente de WhatsApp no disponible y no se pudo inicializar'
          });
        }
        
        console.log('[WEBHOOK] Cliente de WhatsApp inicializado correctamente');
      } catch (initError) {
        console.error('[WEBHOOK] Error al inicializar el cliente de WhatsApp:', initError);
        return res.status(503).json({
          success: false,
          message: 'Error al inicializar el cliente de WhatsApp',
          error: initError.message
        });
      }
    }
    
    // Obtener el cliente nuevamente (podría haberse inicializado)
    const updatedClient = whatsappService.getWhatsAppClient();
    if (!updatedClient) {
      return res.status(503).json({
        success: false,
        message: 'Cliente de WhatsApp no disponible después de intentar inicializarlo'
      });
    }
    
    // Formatear el número de teléfono (eliminar el + y los espacios)
    const formattedNumber = targetUserWhatsAppNumber.replace(/^\+/, '').replace(/\s/g, '');
    const formattedId = `${formattedNumber}@c.us`;
    
    // Enviar el mensaje a través del cliente de WhatsApp
    try {
      // Indicar que este mensaje proviene de Konecte (tercer parámetro = true)
      const result = await whatsappService.sendMessage(formattedId, messageText, true);
      
      if (result) {
        console.log(`[WEBHOOK] Mensaje enviado exitosamente a ${formattedId}`);
        
        // No generamos respuesta automática para mensajes provenientes de Konecte
        // para evitar bucles infinitos y respuestas duplicadas
        
        return res.status(200).json({
          success: true,
          message: 'Mensaje procesado y enviado por WhatsApp',
          respuesta: "Mensaje enviado correctamente"
        });
      } else {
        console.log(`[WEBHOOK] Error al enviar mensaje a ${formattedId}: resultado nulo`);
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el mensaje por WhatsApp: resultado nulo'
        });
      }
    } catch (sendError) {
      console.error(`[WEBHOOK] Error al enviar mensaje a ${formattedId}:`, sendError);
      return res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje por WhatsApp',
        error: sendError.message
      });
    }
  } catch (error) {
    console.log('[KONECTE-WEBHOOK] Error procesando mensaje de Konecte:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Endpoint para verificar que el webhook está funcionando
 */
exports.checkWebhook = (req, res) => {
  // Verificar si el cliente de WhatsApp está disponible
  const client = whatsappService.getWhatsAppClient();
  
  return res.status(200).json({
    success: true,
    message: 'Webhook de Konecte funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoint: '/api/webhooks/konecte-incoming',
    whatsappClientAvailable: !!client
  });
}; 