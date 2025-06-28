const મુખ્ય = require('@whiskeysockets/baileys');
const path = require('path');

const P = require('pino')({ level: 'silent' }) // Puedes cambiar a 'info' o 'debug' para más logs
const storePath = path.join(__dirname, '..', '..', `${process.env.WA_SESSION_ID || 'baileys_store'}.json`);

const baileysConfig = {
    auth: undefined, // Se cargará dinámicamente
    logger: P,
    printQRInTerminal: true,
    browser: [process.env.WA_BOT_NAME || 'Botito', 'Chrome', '10.0'], // Nombre que aparecerá en WhatsApp Web
    version: undefined, // Se obtendrá la última versión automáticamente
    syncFullHistory: false, // Sincronizar solo mensajes nuevos
    patchMessageBeforeSending: (message) => {
        const requiresPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
        );
        if (requiresPatch) {
            message = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadataVersion: 2,
                            deviceListMetadata: {},
                        },
                        ...message,
                    },
                },
            };
        }
        return message;
    },
    // Para guardar y cargar la sesión
    makeWASocket: મુખ્ય.default
};

module.exports = {
    baileysConfig,
    storePath
}; 