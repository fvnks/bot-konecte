const cron = require('node-cron');
const axios = require('axios');
const locationService = require('./locationService');
const googleSheetsService = require('./googleSheetsService');

// --- Configuración ---
const SCRAPER_API_URL = 'http://localhost:5001/scrape_propiedades';
const PROPERTY_TYPES = ['casa', 'departamento', 'parcela', 'oficina', 'local comercial', 'terreno', 'sitio', 'bodega', 'estacionamiento', 'oficinas'];
const OPERATIONS = ['arriendo', 'venta'];
const CRON_SCHEDULE = '*/15 * * * *'; // Cada 15 minutos

let mainSpreadsheetId = null;

async function performScheduledScraping() {
    console.log(`INFO [ScheduledScraping]: Iniciando scraping programado - ${new Date().toISOString()}`);

    if (!mainSpreadsheetId) {
        try {
            const sheetConfig = await googleSheetsService.getMainSheetConfig();
            if (sheetConfig && sheetConfig.spreadsheetId) {
                mainSpreadsheetId = sheetConfig.spreadsheetId;
                console.log(`INFO [ScheduledScraping]: Spreadsheet ID principal obtenido: ${mainSpreadsheetId}`);
            } else {
                console.error('ERROR [ScheduledScraping]: No se pudo obtener el Spreadsheet ID principal. Scraping no se ejecutará.');
                return;
            }
        } catch (error) {
            console.error('ERROR [ScheduledScraping]: Error al obtener config de la hoja principal:', error);
            return;
        }
    }

    try {
        // Asegurar que las comunas estándar estén cargadas
        await locationService.loadStandardComunas(); 
        const comunasList = locationService.getStandardComunasList();

        if (!comunasList || comunasList.length === 0) {
            console.error('ERROR [ScheduledScraping]: La lista de comunas estándar de locationService está vacía. Abortando scraping.');
            return;
        }

        // randomComunaName ya vendrá normalizada desde getStandardComunasList()
        const randomComunaName = comunasList[Math.floor(Math.random() * comunasList.length)];
        // Obtener la región usando la nueva función. randomComunaName ya está normalizada.
        const regionDeComuna = locationService.getRegionForComunaNormalizada(randomComunaName) || ''; 

        // Si no se encontró una región para la comuna, y la API requiere una región no vacía,
        // podríamos optar por saltar este intento de scraping.
        if (!regionDeComuna) {
            console.warn(`WARN [ScheduledScraping]: No se encontró región para la comuna '${randomComunaName}' en chile_geodata.json. Saltando este ciclo de scraping para evitar error de API.`);
            return; // Salir de la función performScheduledScraping para este ciclo.
        }

        const randomPropertyType = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
        const randomOperation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];

        console.log(`INFO [ScheduledScraping]: Selección aleatoria - Comuna: '${randomComunaName}', Región: '${regionDeComuna}', Tipo: '${randomPropertyType}', Operación: '${randomOperation}'`);

        const ufDefault = 38000; 
        const scraperPayload = {
            uf_valor: ufDefault,
            operaciones: [randomOperation],
            tipos_propiedad: [randomPropertyType],
            regiones: regionDeComuna ? [regionDeComuna] : [],
            comunas: randomComunaName,
            dormitorios: ["1", "2", "3", "4+"],
            banos: ["1", "2", "3+"],
            max_paginas: 1
        };

        console.log('INFO [ScheduledScraping]: Enviando payload al scraper:', JSON.stringify(scraperPayload));
        const scraperResponse = await axios.post(SCRAPER_API_URL, scraperPayload, { timeout: 1200000 }); // Cambiado a 20 minutos
        const scrapedProperties = scraperResponse.data;

        if (!scrapedProperties || !Array.isArray(scrapedProperties) || scrapedProperties.length === 0) {
            console.log(`INFO [ScheduledScraping]: No se encontraron propiedades para ${randomComunaName}, ${randomPropertyType}, ${randomOperation}.`);
            return;
        }
        console.log(`INFO [ScheduledScraping]: Se encontraron ${scrapedProperties.length} propiedades.`);

        // randomComunaName es el nombre normalizado, que es lo que queremos para el nombre de la hoja.
        await googleSheetsService.ensureSheetExists(mainSpreadsheetId, randomComunaName);

        const rowsToAppend = [];
        for (const prop of scrapedProperties) {
            const newRow = [
                prop.tipoOperacion || prop.TipoOperacion || randomOperation,
                randomPropertyType,
                prop.Propiedad || prop.titulo || prop.title || prop.nombre || randomPropertyType,
                prop.region || prop.Region || regionDeComuna,
                prop.ciudad || prop.Ciudad || prop.comuna || prop.Comuna || randomComunaName,
                prop.comuna || prop.Comuna || randomComunaName,
                prop.dormitorios || prop.Dormitorios || '',
                prop.banos || prop.Banos || '',
                prop.estacionamientos || prop.Estacionamientos || prop.Estacionamiento || '',
                prop.bodegas || prop.Bodegas || prop.Bodega || '',
                prop.precio || prop.Precio || prop.valor || prop.Valor || '',
                prop.moneda || prop.Moneda || (String(prop.precio || prop.Precio || prop.valor || prop.Valor).includes('UF') ? 'UF' : 'CLP'),
                prop.gastosComunes || prop.GastosComunes || '',
                prop.metrosCuadrados || prop.MetrosCuadrados || prop.superficieUtil || prop.SuperficieUtil || prop.superficieTotal || prop.SuperficieTotal || '',
                prop.telefono || prop.Telefono || '',
                prop.correoElectronico || prop.CorreoElectronico || prop.email || prop.Email || '',
                prop.Link || prop.link || prop.url || prop.propertyUrl || prop.href || prop.Enlace || prop.URL || prop.PropertyURL || ''
            ];
            while(newRow.length < 17) newRow.push('');
            rowsToAppend.push(newRow.slice(0, 17)); 
        }

        if (rowsToAppend.length > 0) {
            await googleSheetsService.appendData(mainSpreadsheetId, randomComunaName, rowsToAppend);
            console.log(`INFO [ScheduledScraping]: ${rowsToAppend.length} propiedades añadidas a la hoja '${randomComunaName}'.`);
        }

    } catch (error) {
        console.error('ERROR [ScheduledScraping]: Ocurrió un error durante el proceso de scraping programado:');
        if (error.isAxiosError) {
            console.error('  Error de Axios (llamada al scraper API):', error.message);
            if (error.response) {
                console.error('  Respuesta del scraper status:', error.response.status);
                console.error('  Respuesta del scraper data:', JSON.stringify(error.response.data));
            }
        } else {
            console.error('  Error general:', error.message);
            console.error('  Stack:', error.stack);
        }
    }
    console.log(`INFO [ScheduledScraping]: Fin del scraping programado - ${new Date().toISOString()}`);
}

async function initializeScheduledScraping() {
    console.log('INFO [ScheduledScraping]: Servicio de scraping programado inicializándose...');
    try {
        // loadGeoData se llama automáticamente al importar locationService.
        // Solo necesitamos asegurar que la lista de comunas estándar se cargue.
        await locationService.loadStandardComunas(); 
        const initialComunasList = locationService.getStandardComunasList();
        const initialRegionMapSize = Object.keys(locationService.getRegionForComunaNormalizada('') === '' ? locationService.getRegionForComunaNormalizada('santiago') : {} ).length; // Truco para obtener el tamaño del mapa si no está vacío.
                                                                                                                                                // En realidad, solo necesitamos saber si las comunas cargaron.

        if (!initialComunasList || initialComunasList.length === 0) {
            console.warn('WARN [ScheduledScraping]: La lista de comunas estándar está vacía tras la inicialización.');
        } else {
            console.log(`INFO [ScheduledScraping]: Comunas estándar cargadas (${initialComunasList.length}). Mapa comuna-región disponible.`);
        }

        if (process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE) {
            cron.schedule(CRON_SCHEDULE, performScheduledScraping, {
                scheduled: true,
                timezone: "America/Santiago"
            });
            console.log(`INFO [ScheduledScraping]: Tarea de scraping programada con schedule: ${CRON_SCHEDULE} en timezone America/Santiago.`);
        } else {
            console.log(`INFO [ScheduledScraping]: Instancia ${process.env.NODE_APP_INSTANCE}. Cron no agendado.`);
        }
    } catch (initError) {
        console.error('FATAL [ScheduledScraping]: Error crítico durante la inicialización del servicio de scraping programado:', initError);
    }
}

module.exports = {
    initializeScheduledScraping,
    performScheduledScraping
}; 