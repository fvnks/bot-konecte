const SEARCH_INTRO = `¡Genial! Para ayudarte a encontrar tu lugar ideal, por favor, descríbeme lo que buscas. Mientras más detalles me des, mejor. Puedes guiarte con este formato:`;

const SEARCH_FORMAT = `Busco/Ofrezco: Busco
Tipo de operación: Arriendo / Compra
Tipo de propiedad: [Casa / Departamento / Oficina / etc.]
Región: [Ej: Atacama]
Ciudad: [Ej: Copiapó]
Comunas preferidas: [Centro / Paipote / etc.]
Dormitorios mínimos: [N°]
Baños mínimos: [N°]
Estacionamiento requerido: Sí / No / Indiferente
Bodega: Sí / No / Indiferente
Presupuesto máximo: [Ej: 400.000]
Moneda: CLP / UF
Gastos comunes incluidos?: Sí / No / Indiferente
Metros cuadrados mínimos: [Ej: 60 m2]`;

const SEARCH_TEMPLATE = `${SEARCH_INTRO}

*${SEARCH_FORMAT.replace(/\n/g, '*\n*')}*`;

const OFFER_INTRO = `¡Perfecto! Para publicar tu propiedad, por favor, envíame todos los detalles. Para que no se me escape nada, idealmente sigue este formato:`;

const OFFER_FORMAT = `Busco/Ofrezco: Ofrezco
Tipo de operación: Venta / Arriendo
Tipo de propiedad: [Casa / Departamento / Parcela / Oficina / Local / etc.]
Región: [Ej: Atacama]
Ciudad: [Ej: Copiapó]
Comuna: [Ej: Paipote / Centro]
Dormitorios: [N°]
Baños: [N°]
Estacionamiento: Sí / No
Bodega: Sí / No
Valor: [Ej: 350.000]
Moneda: CLP / UF
Gastos comunes (si aplica): [Ej: 50.000]
Metros cuadrados (aprox): [Ej: 70 m2]
Teléfono contacto: +56 9 XXXX XXXX
Nombre WhatsApp: [Tu nombre o el de tu empresa]`;

const OFFER_TEMPLATE = `${OFFER_INTRO}

*${OFFER_FORMAT.replace(/\n/g, '*\n*')}*`;

function getWelcomeMessage() {
    return `¡Hola! 👋 *Bot Inmobiliario de Konecte*

*Comandos:*
• *!ayuda* - Muestra este mensaje
• *!misalertas* - Lista tus alertas activas
• *!eliminaralerta [número]* - Elimina una alerta
• *!propiedades [arriendo|venta] [comuna]* - Muestra propiedades (filtros opcionales)
• *!ayudaprop* - Instrucciones para PortalInmobiliario
• *!buscarprop* - Busca en PortalInmobiliario

*Búsquedas:*
• "Busco [tipo] en [ubicación]" - Busca propiedades
• "Ofrezco [tipo] en [ubicación]" - Publica propiedades
• "Busca en Portal Inmobiliario [tipo]" - Búsqueda externa
• Envía un *mensaje de voz* con tu consulta

Konecte - Conectando personas con propiedades`;
}

module.exports = {
    SEARCH_INTRO,
    SEARCH_FORMAT,
    SEARCH_TEMPLATE,
    OFFER_INTRO,
    OFFER_FORMAT,
    OFFER_TEMPLATE,
    getWelcomeMessage
}; 