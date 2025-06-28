const os = require('os');
const packageJson = require('../../package.json'); // Asegúrate que la ruta a tu package.json es correcta
const IgnoredUser = require('../models/IgnoredUser');
const { getWelcomeMessage } = require('./messageTemplates'); // Importar para !ayuda

async function handleCommand(command, client, msg, isAdmin) {
    console.log(`[COMMAND-HANDLER] Comando recibido: "${command}"`);
    const senderId = msg.from; // Número del remitente (ej: +56945803799)

    // Formatear el senderId para WhatsApp Web JS si es necesario
    let formattedSenderId = senderId;
    if (!formattedSenderId.includes('@c.us')) {
        if (formattedSenderId.startsWith('+')) {
            formattedSenderId = formattedSenderId.substring(1);
        }
        formattedSenderId = `${formattedSenderId}@c.us`;
    }

    const commandParts = command.split(' ');
    const mainCommand = commandParts[0];

    // --- Comandos Públicos ---
    if (mainCommand === '!ayuda') {
        const welcomeMessage = getWelcomeMessage();
        console.log(`[COMMAND-HANDLER] Intentando enviar mensaje de ayuda a ${formattedSenderId}. Mensaje: "${welcomeMessage.substring(0, 50)}${welcomeMessage.length > 50 ? '...' : ''}"`);
        try {
            await client.sendMessage(formattedSenderId, welcomeMessage); // Usar el ID formateado
            console.log(`[COMMAND-HANDLER] Mensaje de ayuda enviado exitosamente a ${formattedSenderId}`);
        } catch (error) {
            console.error(`[COMMAND-HANDLER] ERROR al enviar mensaje de ayuda a ${formattedSenderId}:`, error);
        }
        return true; // Comando manejado
    }

    if (mainCommand === '!publicar') {
        const reply = `¡Perfecto! Vamos a publicar.

¿Qué deseas publicar?
1. 🏡 Una Propiedad
2. 📝 Una Solicitud`;
        await client.sendMessage(formattedSenderId, reply);
        return true; // Comando manejado
    }

    // A partir de aquí, todos los comandos requieren ser admin.
    if (!isAdmin) {
        console.log(`INFO: El usuario no-admin ${senderId} intentó usar el comando: ${mainCommand}. Ignorando.`);
        return false; // Comando no manejado (o permiso denegado)
    }

    // --- Comandos de Administrador ---
    if (mainCommand === '!estado-bot') {
        try {
            const uptimeSeconds = Math.floor(process.uptime());
            const uptime = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
            const memoryUsage = process.memoryUsage();
            const rssMb = (memoryUsage.rss / 1024 / 1024).toFixed(2); // Resident Set Size
            const heapTotalMb = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            const heapUsedMb = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const botVersion = packageJson.version || 'No especificada';
            const nodeVersion = process.version;
            const osType = os.type();
            const osRelease = os.release();
            const totalMemMb = (os.totalmem() / 1024 / 1024).toFixed(2);
            const freeMemMb = (os.freemem() / 1024 / 1024).toFixed(2);

            let statusMessage = `🤖 *Estado del Bot v${botVersion}* 🤖\n\n`;
            statusMessage += `⏱️ *Tiempo Activo (Uptime):* ${uptime}\n`;
            statusMessage += `💻 *Node.js Version:* ${nodeVersion}\n`;
            statusMessage += `🔧 *Sistema Operativo:* ${osType} ${osRelease}\n`;
            statusMessage += `🧠 *Memoria del Proceso:* \n`;
            statusMessage += `    - RSS: ${rssMb} MB\n`;
            statusMessage += `    - Heap Total: ${heapTotalMb} MB\n`;
            statusMessage += `    - Heap Usado: ${heapUsedMb} MB\n`;
            statusMessage += `💾 *Memoria del Sistema:* \n`;
            statusMessage += `    - Total: ${totalMemMb} MB\n`;
            statusMessage += `    - Libre: ${freeMemMb} MB\n`;
            
            // Intentar obtener el nombre del bot si está disponible
            if (client.info && client.info.pushname) {
                statusMessage += `👤 *Nombre del Bot WA:* ${client.info.pushname}\n`;
            }
            if (client.info && client.info.wid && client.info.wid.user) {
                 statusMessage += `📱 *Número del Bot WA:* ${client.info.wid.user}\n`;
            }

            statusMessage += `\n🕒 Fecha y Hora Actual: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`;

            await client.sendMessage(formattedSenderId, statusMessage); // Usar el ID formateado
            console.log(`INFO: Comando !estado-bot ejecutado por ${senderId}`);
            return true; // Comando manejado
        } catch (error) {
            console.error(`ERROR al ejecutar !estado-bot para ${senderId}:\n`, error);
            await client.sendMessage(formattedSenderId, '❌ Hubo un error al obtener el estado del bot.'); // Usar el ID formateado
            return true; // Se intentó manejar y se envió un mensaje de error
        }
    } else if (mainCommand === '!ignorarnumero') {
        const phoneNumber = commandParts[1];
        if (!phoneNumber) {
            await client.sendMessage(formattedSenderId, '⚠️ Por favor, proporciona un número de teléfono. Ejemplo: !ignorarnumero 569xxxxxxxx'); // Usar el ID formateado
            return true; // Se envió un mensaje de error
        }
        try {
            const existing = await IgnoredUser.findByPhoneNumber(phoneNumber);
            if (existing) {
                await client.sendMessage(formattedSenderId, `El número ${phoneNumber} ya se encuentra en la lista de ignorados.`);
                return true; // Se envió un mensaje de estado
            }
            await IgnoredUser.add(phoneNumber, `Añadido por ${senderId}`);
            await client.sendMessage(formattedSenderId, `✅ El número ${phoneNumber} ha sido añadido a la lista de ignorados.`);
            console.log(`INFO: El número ${phoneNumber} fue añadido a la lista de ignorados por ${senderId}`);
            return true; // Comando manejado
        } catch (error) {
            console.error(`ERROR al añadir número a la lista de ignorados:`, error);
            await client.sendMessage(formattedSenderId, '❌ Hubo un error al añadir el número a la lista de ignorados.');
            return true; // Se intentó manejar y se envió un mensaje de error
        }
    } else if (mainCommand === '!permitirnumero') {
        const phoneNumber = commandParts[1];
        if (!phoneNumber) {
            await client.sendMessage(formattedSenderId, '⚠️ Por favor, proporciona un número de teléfono. Ejemplo: !permitirnumero 569xxxxxxxx');
            return true; // Se envió un mensaje de error
        }
        try {
            const success = await IgnoredUser.remove(phoneNumber);
            if (success) {
                await client.sendMessage(formattedSenderId, `✅ El número ${phoneNumber} ha sido eliminado de la lista de ignorados.`);
                console.log(`INFO: El número ${phoneNumber} fue eliminado de la lista de ignorados por ${senderId}`);
                return true; // Comando manejado
            } else {
                await client.sendMessage(formattedSenderId, `El número ${phoneNumber} no se encontró en la lista de ignorados.`);
                return true; // Se envió un mensaje de estado
            }
        } catch (error) {
            console.error(`ERROR al eliminar número de la lista de ignorados:`, error);
            await client.sendMessage(formattedSenderId, '❌ Hubo un error al eliminar el número de la lista de ignorados.');
            return true; // Se intentó manejar y se envió un mensaje de error
        }
    } else if (mainCommand === '!listarcanales') {
        try {
            console.log(`[COMMAND-HANDLER] Ejecutando !listarcanales para ${senderId}`);
            const chats = await client.getChats();
            let response = `🤖 *Canales/Chats del Bot* (${chats.length} en total):\n\n`;

            chats.forEach((chat, index) => {
                const chatName = chat.name || chat.id._serialized;
                const isGroup = chat.isGroup ? 'Grupo' : 'Individual';
                response += `${index + 1}. *${chatName}*\n`;
                response += `   - ID: ${chat.id._serialized}\n`;
                response += `   - Tipo: ${isGroup}\n\n`;
            });

            await client.sendMessage(formattedSenderId, response);
            console.log(`[COMMAND-HANDLER] Lista de canales enviada a ${senderId}`);
            return true;
        } catch (error) {
            console.error(`[COMMAND-HANDLER] ERROR al ejecutar !listarcanales para ${senderId}:`, error);
            await client.sendMessage(formattedSenderId, '❌ Hubo un error al obtener la lista de canales.');
            return true;
        }
    } else {
        // Comando de admin desconocido
        console.log(`INFO: Comando de administrador desconocido '${mainCommand}' recibido de ${senderId}`);
        return false; // Comando no reconocido
    }
}

module.exports = {
    handleCommand
}; 