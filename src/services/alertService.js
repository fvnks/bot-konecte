require('dotenv').config();
const googleSheetsService = require('./googleSheetsService');
const { normalizeText } = require('./locationService'); // Usaremos normalizeText para comparaciones

// Variable para mantener el cliente de WhatsApp, se puede setear desde whatsappService.js
let whatsappClient = null;

/**
 * Inicializa el servicio de alertas con el cliente de WhatsApp
 * @param {object} client - Cliente de WhatsApp inicializado
 */
function initializeAlertService(client) {
    whatsappClient = client;
    console.log('Servicio de alertas inicializado');
}

/**
 * Busca alertas que coincidan con una propiedad recién ofrecida y notifica a los usuarios
 * @param {Object} propertyData - Datos de la propiedad ofrecida
 */
async function findMatchingAlertsAndNotify(propertyData) {
    try {
        console.log('Buscando alertas que coincidan con la propiedad:', propertyData);
        
        // Obtener configuración de la hoja de cálculo
        const sheetConfig = await googleSheetsService.getMainSheetConfig();
        if (!sheetConfig || !sheetConfig.spreadsheetId) {
            console.error('No se pudo obtener la configuración de la hoja de cálculo para buscar alertas');
            return;
        }
        
        // Leer todas las alertas activas
        const alertsData = await googleSheetsService.readAlerts(sheetConfig.spreadsheetId);
        if (!alertsData || alertsData.length <= 1) {
            console.log('No hay alertas registradas para verificar coincidencias');
            return;
        }
        
        // Índices de las columnas en la hoja de alertas
        const senderIdIdx = 0;
        const nameIdx = 1; // Nombre del usuario
        const tipoPropiedadIdx = 2;
        const regionIdx = 3;
        const comunaIdx = 4;
        const dormitoriosIdx = 5;
        const banosIdx = 6;
        const estadoAlertaIdx = 7;
        const presupuestoIdx = 10; // Columna K - Presupuesto
        
        // Normalizar los datos de la propiedad para comparación
        const propTipoNorm = propertyData.tipoPropiedad ? normalizeText(propertyData.tipoPropiedad) : '';
        const propRegionNorm = propertyData.region ? normalizeText(propertyData.region) : '';
        const propComunaNorm = propertyData.comuna ? normalizeText(propertyData.comuna) : '';
        const propDormsValue = propertyData.numDormitorios ? parseInt(normalizeText(propertyData.numDormitorios).replace(/\D/g,''), 10) : null;
        const propBanosValue = propertyData.numBanos ? parseInt(normalizeText(propertyData.numBanos).replace(/\D/g,''), 10) : null;
        const propValorValue = propertyData.valor ? normalizePrice(propertyData.valor) : null;
        
        console.log('Datos normalizados para coincidencia:');
        console.log('- Tipo:', propTipoNorm);
        console.log('- Región:', propRegionNorm);
        console.log('- Comuna:', propComunaNorm);
        console.log('- Dormitorios:', propDormsValue);
        console.log('- Baños:', propBanosValue);
        console.log('- Valor:', propValorValue);
        
        // Filtrar alertas que coincidan con la propiedad
        const matchingAlerts = [];
        
        // Empezar desde la fila 1 (saltando los encabezados)
        for (let i = 1; i < alertsData.length; i++) {
            const alert = alertsData[i];
            
            // Verificar si la alerta está activa
            if (alert.length <= estadoAlertaIdx || normalizeText(alert[estadoAlertaIdx]) !== 'activa') {
                continue;
            }
            
            let matchScore = 0;
            let matchDetails = [];
            
            // Coincidencia de tipo de propiedad
            if (propTipoNorm && alert.length > tipoPropiedadIdx && alert[tipoPropiedadIdx]) {
                const alertTipoNorm = normalizeText(alert[tipoPropiedadIdx]);
                if (propTipoNorm.includes(alertTipoNorm) || alertTipoNorm.includes(propTipoNorm)) {
                    matchScore += 2;
                    matchDetails.push(`Tipo: ${propertyData.tipoPropiedad}`);
                }
            }
            
            // Coincidencia de región
            if (propRegionNorm && alert.length > regionIdx && alert[regionIdx]) {
                const alertRegionNorm = normalizeText(alert[regionIdx]);
                if (propRegionNorm.includes(alertRegionNorm) || alertRegionNorm.includes(propRegionNorm)) {
                    matchScore += 1;
                    matchDetails.push(`Región: ${propertyData.region}`);
                }
            }
            
            // Coincidencia de comuna (más importante)
            if (propComunaNorm && alert.length > comunaIdx && alert[comunaIdx]) {
                const alertComunaNorm = normalizeText(alert[comunaIdx]);
                if (propComunaNorm.includes(alertComunaNorm) || alertComunaNorm.includes(propComunaNorm)) {
                    matchScore += 3;
                    matchDetails.push(`Comuna: ${propertyData.comuna}`);
                }
            }
            
            // Coincidencia de dormitorios (mayor o igual)
            if (propDormsValue !== null && alert.length > dormitoriosIdx && alert[dormitoriosIdx]) {
                const alertDormsStr = normalizeText(alert[dormitoriosIdx]).replace(/\D/g,'');
                const alertDormsValue = alertDormsStr ? parseInt(alertDormsStr, 10) : null;
                
                if (alertDormsValue !== null && !isNaN(alertDormsValue) && propDormsValue >= alertDormsValue) {
                    matchScore += 2;
                    matchDetails.push(`Dormitorios: ${propertyData.numDormitorios}`);
                }
            }
            
            // Coincidencia de baños (mayor o igual)
            if (propBanosValue !== null && alert.length > banosIdx && alert[banosIdx]) {
                const alertBanosStr = normalizeText(alert[banosIdx]).replace(/\D/g,'');
                const alertBanosValue = alertBanosStr ? parseInt(alertBanosStr, 10) : null;
                
                if (alertBanosValue !== null && !isNaN(alertBanosValue) && propBanosValue >= alertBanosValue) {
                    matchScore += 1;
                    matchDetails.push(`Baños: ${propertyData.numBanos}`);
                }
            }
            
            // Coincidencia de presupuesto (menor o igual al presupuesto del usuario)
            if (propValorValue !== null && alert.length > presupuestoIdx && alert[presupuestoIdx]) {
                const alertPresupuestoStr = alert[presupuestoIdx];
                const alertPresupuestoValue = normalizePrice(alertPresupuestoStr);
                
                if (alertPresupuestoValue !== null && !isNaN(alertPresupuestoValue) && propValorValue <= alertPresupuestoValue) {
                    matchScore += 2;
                    matchDetails.push(`Precio: ${propertyData.valor} ${propertyData.moneda || ''}`);
                }
            }
            
            // Si hay suficiente coincidencia, agregar a las alertas coincidentes
            // Reducimos el umbral a 3 para mejorar las coincidencias
            if (matchScore >= 3) {
                // Extraer el número de teléfono directamente del SenderID
                const userPhone = alert.length > 1 && alert[1] ? 
                    alert[1].replace(/@c\.us$/, '') : '';
                
                matchingAlerts.push({
                    senderId: alert[senderIdIdx],
                    senderName: alert.length > nameIdx ? alert[nameIdx] : '',
                    senderPhoneNumber: userPhone,
                    matchScore: matchScore,
                    matchDetails: matchDetails.join(', ')
                });
            }
        }
        
        console.log(`Se encontraron ${matchingAlerts.length} alertas coincidentes`);
        
        // Preparar los datos de contacto para mostrar al usuario (con formato original)
        // Asegurar que todos los datos de contacto estén disponibles
        const telefonoDisplay = propertyData.telefonoOriginal || 
                              (propertyData.telefono ? (propertyData.telefono.startsWith('+') ? 
                               propertyData.telefono : '+' + propertyData.telefono) : '');
                               
        const telefonoCorredorDisplay = propertyData.telefonoCorredorOriginal || 
                                      (propertyData.telefonoCorredor ? (propertyData.telefonoCorredor.startsWith('+') ? 
                                       propertyData.telefonoCorredor : '+' + propertyData.telefonoCorredor) : '');
        
        // Imprimir los datos para diagnóstico
        console.log('Datos de contacto disponibles:');
        console.log('- telefonoOriginal:', propertyData.telefonoOriginal);
        console.log('- telefono:', propertyData.telefono);
        console.log('- telefonoCorredorOriginal:', propertyData.telefonoCorredorOriginal);
        console.log('- telefonoCorredor:', propertyData.telefonoCorredor);
        console.log('- email:', propertyData.email);
        console.log('- nombreContacto:', propertyData.nombreContacto);
        console.log('- whatsapp:', propertyData.whatsapp);
        console.log('- corredora:', propertyData.corredora);
        
        // Notificar a los usuarios con alertas coincidentes
        for (const match of matchingAlerts) {
            try {
                // Imprimir todos los datos disponibles para diagnóstico
                console.log('Datos de propiedad para notificación:', JSON.stringify(propertyData, null, 2));
                
                const notificationMsg = `🔔 *¡BUENAS NOTICIAS!* 🎉\n\n` +
                                       `✨ Se ha publicado una ${propertyData.tipoPropiedad || 'propiedad'} en ${propertyData.comuna || 'ubicación no especificada'} ` +
                                       `que coincide con lo que estabas buscando! 🏡\n\n` +
                                       `*Detalles de la propiedad:* 📋\n` +
                                       `• *Tipo:* ${propertyData.tipoPropiedad || 'No especificado'} 🏠\n` +
                                       `• *Ubicación:* ${propertyData.comuna || 'No especificada'}${propertyData.region ? ', ' + propertyData.region : ''} 📍\n` +
                                       (propertyData.numDormitorios ? `• *Dormitorios:* ${propertyData.numDormitorios} 🛏️\n` : '') +
                                       (propertyData.numBanos ? `• *Baños:* ${propertyData.numBanos} 🚿\n` : '') +
                                       (propertyData.valor ? `• *Valor:* ${propertyData.valor} ${propertyData.moneda || ''} 💰\n` : '') +
                                       (propertyData.direccion ? `• *Dirección:* ${propertyData.direccion} 🏢\n` : '') +
                                       (propertyData.superficie ? `• *Superficie:* ${propertyData.superficie} 📐\n` : '') +
                                       (propertyData.descripcion ? `• *Descripción:* ${propertyData.descripcion.substring(0, 200)}${propertyData.descripcion.length > 200 ? '...' : ''} 📄\n` : '') +
                                       `\n*Coincide en:* ${match.matchDetails} ✅\n\n` +
                                       `*DATOS DE CONTACTO DEL CORREDOR:* 👨‍💼👩‍💼\n` +
                                       (propertyData.nombreContacto ? `• *Nombre:* ${propertyData.nombreContacto} 👤\n` : '') +
                                       (telefonoDisplay ? `• *Teléfono:* ${telefonoDisplay} 📱\n` : '') +
                                       (telefonoCorredorDisplay && telefonoCorredorDisplay !== telefonoDisplay ? 
                                        `• *Tel. corredor:* ${telefonoCorredorDisplay} 📱\n` : '') +
                                       (propertyData.email ? `• *Email:* ${propertyData.email} 📧\n` : '') +
                                       (propertyData.whatsapp ? `• *WhatsApp:* ${propertyData.whatsapp} 💬\n` : '') +
                                       (propertyData.corredora ? `• *Corredora:* ${propertyData.corredora} 🏢\n` : '') +
                                       (propertyData.link ? `• *Link:* ${propertyData.link} 🔗\n` : '') +
                                       `\nPara ver todas tus alertas activas, escribe *!misalertas* 📑`;
                
                await whatsappClient.sendMessage(match.senderId, notificationMsg);
                console.log(`Notificación enviada a ${match.senderId} por coincidencia de alerta`);
            } catch (notifyError) {
                console.error(`Error al enviar notificación a ${match.senderId}:`, notifyError);
            }
        }
    } catch (error) {
        console.error('Error al buscar alertas coincidentes:', error);
    }
}

/**
 * Normaliza un valor de precio para poder compararlo
 * @param {string|number} price - Precio a normalizar
 * @returns {number|null} - Precio normalizado o null si no es válido
 */
function normalizePrice(price) {
    if (!price) return null;
    
    // Si ya es un número, devolverlo directamente
    if (typeof price === 'number') return price;
    
    // Convertir a string si no lo es
    let priceStr = String(price);
    
    // Eliminar todo excepto dígitos, puntos y comas
    priceStr = priceStr.replace(/[^\d.,]/g, '');
    
    // Convertir puntos de miles a vacío y comas a puntos (formato internacional)
    priceStr = priceStr.replace(/\./g, '').replace(/,/g, '.');
    
    const numValue = parseFloat(priceStr);
    return isNaN(numValue) ? null : numValue;
}

module.exports = {
    initializeAlertService,
    findMatchingAlertsAndNotify,
    normalizePrice
}; 