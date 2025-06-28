/**
 * Servicio para manejar la conexión con WhatsApp y otros canales de mensajería.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const botReplyService = require('./botReplyService');

// Cliente de WhatsApp
let whatsappClient = null;
let isInitializing = false;

// Set para almacenar los IDs de mensajes que provienen de Konecte
const konecteMessageIds = new Set();

/**
 * Inicializa el cliente de WhatsApp
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Client>} - Cliente de WhatsApp inicializado
 */
async function initWhatsAppClient(options = {}) {
  if (isInitializing) {
    console.log('Ya hay una inicialización en curso. Esperando...');
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!isInitializing) {
          clearInterval(checkInterval);
          resolve(whatsappClient);
        }
      }, 1000);
    });
  }
  
  if (whatsappClient) {
    console.log('Cliente de WhatsApp ya inicializado. Reutilizando...');
    return whatsappClient;
  }
  
  isInitializing = true;
  
  try {
    const sessionDir = path.join(process.cwd(), 'wwjs_auth_info');
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    try {
      fs.chmodSync(sessionDir, 0o755);
      console.log(`Permisos del directorio de sesión actualizados: ${sessionDir}`);
    } catch (error) {
      console.error(`Error al actualizar permisos del directorio de sesión: ${error.message}`);
    }
    
    const sessionId = process.env.WA_SESSION_ID || 'botito-session';
    console.log(`INFO: Usando ID de sesión: ${sessionId}`);
    
    const client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: sessionId,
        dataPath: sessionDir
      }),
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-application-cache'
        ],
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined
      },
      qrMaxRetries: 5,
      authTimeoutMs: 60000,
      qrRefreshIntervalMs: 20000,
      restartOnAuthFail: true
    });
    
    client.on('qr', (qr) => {
      console.log('\n=== CÓDIGO QR RECIBIDO ===');
      console.log('Escanea este código con WhatsApp en tu teléfono:');
      qrcode.generate(qr, { small: true });
      console.log('\nEsperando a que escanees el código QR...');
    });
    
    client.on('authenticated', () => {
      console.log('\n=== AUTENTICACIÓN EXITOSA ===');
      console.log('Cliente autenticado correctamente.');
    });
    
    client.on('auth_failure', (error) => {
      console.error('\n=== ERROR DE AUTENTICACIÓN ===');
      console.error('Error de autenticación:', error);
      whatsappClient = null;
      isInitializing = false;
    });
    
    client.on('ready', () => {
      console.log('\n=== CLIENTE LISTO ===');
      console.log('Cliente de WhatsApp listo y conectado.');
      whatsappClient = client;
      isInitializing = false;
    });
    
    client.on('disconnected', (reason) => {
      console.log('\n=== DESCONEXIÓN ===');
      console.log('Cliente desconectado:', reason);
      whatsappClient = null;
      isInitializing = false;
    });
    
    client.on('message', async (message) => {
      const chat = await message.getChat();
      const isGroup = chat.isGroup;

      // Procesar solo mensajes de chats individuales y de grupos, ignorando estados y mensajes propios.
      if ((message.from.endsWith('@c.us') || message.from.endsWith('@g.us')) && !message.isStatus && !message.fromMe) {
        try {
          if (konecteMessageIds.has(message.id._serialized)) {
            console.log(`[WHATSAPP] Ignorando mensaje con ID ${message.id._serialized} porque proviene de Konecte (eco).`);
            return;
          }
          
          let author = message.from; // Para chats individuales
          let senderName = (await message.getContact())?.pushname ?? 'Desconocido';
          if (isGroup) {
            // En grupos, 'author' identifica al usuario que envió el mensaje
            author = message.author;
            console.log(`[WHATSAPP] Mensaje en grupo "${chat.name}". Autor: ${author}`);
          }
          
          // Si no hay autor, es probable que sea un evento del sistema y no un mensaje.
          if (!author) {
            return;
          }

          const phone = author.split('@')[0];
          
          try {
            const botResponse = await botReplyService.getBotReply({
              text: message.body,
              from: author, // Usar el autor real (en grupo) o el chat (individual)
              client: client,
              senderName: senderName // Pasar el nombre del remitente
            });
            
            if (botResponse) {
              if (!isGroup) {
                // Responder solo si NO es un grupo
                await client.sendMessage(message.from, botResponse);
                console.log(`[WHATSAPP] Respuesta automática enviada a ${message.from}: ${botResponse.substring(0, 50)}${botResponse.length > 50 ? '...' : ''}`);
              } else {
                console.log(`[WHATSAPP] Respuesta generada para el grupo "${chat.name}", pero no se enviará para evitar spam.`);
              }
            }
          } catch (botError) {
            console.error('[WHATSAPP] Error al generar respuesta automática:', botError);
          }
          
          // La sincronización con Konecte podría tener una lógica diferente para grupos
          // Por ahora, se envía usando el ID del autor del mensaje.
          await sendMessageToKonecte(phone, message.body, senderName);
        } catch (error) {
          console.error('Error al procesar mensaje entrante:', error);
        }
      }
    });
    
    console.log('Inicializando cliente de WhatsApp...');
    await client.initialize();
    
    return client;
  } catch (error) {
    console.error('Error al inicializar el cliente de WhatsApp:', error);
    isInitializing = false;
    throw error;
  }
}

/**
 * Cierra el cliente de WhatsApp
 * @returns {Promise<void>}
 */
async function closeWhatsAppClient() {
  if (whatsappClient) {
    console.log('Cerrando y guardando sesión de WhatsApp...');
    try {
      await whatsappClient.destroy();
    } catch (error) {
      console.error('Error al cerrar el cliente de WhatsApp:', error);
    }
    whatsappClient = null;
  }
}

/**
 * Envía un mensaje a Konecte para sincronización.
 * @param {string} phone - Número de teléfono del remitente
 * @param {string} message - Mensaje recibido
 * @param {string} [senderName] - Nombre del remitente (opcional)
 * @returns {Promise<boolean>} - Resultado del envío
 */
async function sendMessageToKonecte(phone, message, senderName = 'Usuario de WhatsApp') {
  try {
    const konecteUrl = process.env.KONECTE_WEBHOOK_URL;
    
    if (!konecteUrl) {
      console.log('[KONECTE-OUTGOING] Error: No se ha configurado la URL de Konecte');
      return false;
    }
    
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const cleanPhone = formattedPhone.replace('@c.us', '');
    
    const payload = {
      telefono: cleanPhone,
      text: message,
      senderName: senderName,
      isSync: true
    };

    console.log(`[KONECTE-OUTGOING] Enviando mensaje a Konecte: ${JSON.stringify(payload)}`);
    
    try {
      const response = await axios.post(konecteUrl, payload);
      console.log(`[KONECTE-OUTGOING] Respuesta de Konecte: ${response.status}`);
      return true;
    } catch (error) {
      console.error(`[KONECTE-OUTGOING] Error enviando mensaje a Konecte: ${error.message}`);
      if (error.response) {
        console.error(`[KONECTE-OUTGOING] Detalles del error - Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`Error al enviar mensaje a Konecte: ${error}`);
    return false;
  }
}

/**
 * Envía una respuesta al chat web de Konecte
 * @param {string} userId - El ID del usuario en la plataforma Konecte.
 * @param {string} messageText - El texto del mensaje a enviar.
 */
async function sendReplyToKonecteWeb(userId, messageText) {
  try {
    const konecteWebReplyUrl = process.env.KONECTE_WEB_REPLY_URL || 'https://konecte.vercel.app/api/whatsapp-bot/send-reply'; // Fallback a producción
    
    const payload = {
      userId: userId,
      messageText: messageText,
      source: 'bot' // Indicar que el mensaje es del bot
    };

    console.log(`[KONECTE-WEB-REPLY] Enviando respuesta a Konecte Web para el usuario ${userId}: ${JSON.stringify(payload)}`);

    await axios.post(konecteWebReplyUrl, payload);

    console.log(`[KONECTE-WEB-REPLY] Respuesta enviada exitosamente a ${userId}`);
    return true;
  } catch (error) {
    console.error(`[KONECTE-WEB-REPLY] Error al enviar respuesta al chat web de Konecte para el usuario ${userId}:`, error.message);
    if (error.response) {
      console.error('[KONECTE-WEB-REPLY] Detalles del error:', error.response.data);
    }
    return false;
  }
}

/**
 * Devuelve el cliente de WhatsApp
 * @returns {Client|null}
 */
function getWhatsAppClient() {
  return whatsappClient;
}

/**
 * Envía un mensaje a través del cliente de WhatsApp
 * @param {string} to - ID del destinatario
 * @param {string} message - Mensaje a enviar
 * @param {boolean} [isFromKonecte=false] - Indica si el mensaje proviene de Konecte
 * @returns {Promise<Message|null>}
 */
async function sendMessage(to, message, isFromKonecte = false) {
  try {
    const client = getWhatsAppClient();
    if (client) {
      const sentMessage = await client.sendMessage(to, message);
      console.log(`[WHATSAPP] Mensaje enviado a ${to}`);

      // Si el mensaje es de Konecte, lo guardamos para evitar procesar su eco
      if (isFromKonecte && sentMessage) {
        konecteMessageIds.add(sentMessage.id._serialized);
        console.log(`[WHATSAPP] ID de mensaje desde Konecte guardado: ${sentMessage.id._serialized}`);
      }
      return sentMessage;
    } else {
      console.error('[WHATSAPP] Error al enviar mensaje: Cliente no disponible');
      return null;
    }
  } catch (error) {
    console.error(`[WHATSAPP] Error al enviar mensaje a ${to}:`, error);
    return null;
  }
}

module.exports = {
  initWhatsAppClient,
  closeWhatsAppClient,
  getWhatsAppClient,
  sendMessage,
  sendMessageToKonecte,
  sendReplyToKonecteWeb
};
