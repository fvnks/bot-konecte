/**
 * whatsappMessageController.js
 * Controlador para manejar mensajes de WhatsApp
 */

const { getWhatsAppClient } = require('../services/whatsappService');

/**
 * Envía un mensaje de WhatsApp
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
async function sendMessage(req, res) {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos phoneNumber y message'
      });
    }
    
    console.log(`[WEBHOOK] Solicitud para enviar mensaje a ${phoneNumber}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    
    // Obtener el cliente de WhatsApp
    const client = getWhatsAppClient();
    
    if (!client) {
      return res.status(503).json({
        success: false,
        error: 'Cliente de WhatsApp no disponible'
      });
    }
    
    // Formatear el número si es necesario
    let formattedNumber = phoneNumber;
    if (!formattedNumber.includes('@c.us')) {
      // Eliminar el signo + si existe
      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.substring(1);
      }
      
      // Añadir el sufijo @c.us
      formattedNumber = `${formattedNumber}@c.us`;
    }
    
    // Enviar el mensaje
    const result = await client.sendMessage(formattedNumber, message);
    
    console.log(`[WEBHOOK] Mensaje enviado exitosamente a ${formattedNumber}`);
    
    return res.json({
      success: true,
      messageId: result.id._serialized,
      timestamp: result.timestamp,
      recipient: formattedNumber
    });
  } catch (error) {
    console.error('[WEBHOOK] Error al enviar mensaje:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Maneja un mensaje entrante de WhatsApp
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
function handleIncomingMessage(req, res) {
  try {
    console.log('[WEBHOOK] Mensaje entrante recibido:', req.body);
    
    // Aquí se procesaría el mensaje entrante si se configurara un webhook
    // Por ahora, solo devolvemos una respuesta exitosa
    
    return res.json({
      success: true,
      message: 'Mensaje recibido correctamente'
    });
  } catch (error) {
    console.error('[WEBHOOK] Error al procesar mensaje entrante:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  sendMessage,
  handleIncomingMessage
}; 