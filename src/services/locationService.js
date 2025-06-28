const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity'); // Asegúrate de instalarlo: npm install string-similarity

let normalizedData = [];
let standardComunasList = [];
let comunasLoaded = false;
let _comunaToRegionMap = {}; // Mapa de comunaNormalizada -> regionOriginal

// Función para quitar tildes y convertir a minúsculas
function normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .toLowerCase()
        .normalize("NFD") // Normaliza a forma descompuesta (letra + tilde como caracteres separados)
        .replace(/[\u0300-\u036f]/g, ""); // Elimina los diacríticos (tildes)
}

function loadGeoData() {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'chile_geodata.json');
        const rawData = fs.readFileSync(filePath);
        const parsedJson = JSON.parse(rawData);

        if (!parsedJson || !Array.isArray(parsedJson.regiones)) {
            console.error('ERROR CRÍTICO: El archivo chile_geodata.json no tiene el formato esperado (falta array regiones) o está vacío.');
            normalizedData = []; // Asegurar que normalizedData sea un array vacío en caso de error
            _comunaToRegionMap = {};
            return;
        }

        const regionesData = parsedJson.regiones;
        let tempNormalizedData = []; // Usar una variable temporal para construir los datos
        let tempComunaToRegionMap = {};

        regionesData.forEach(region => {
            const regionNombre = normalizeText(region.nombre);
            const regionAliases = region.alias ? region.alias.map(normalizeText) : [];
            
            if (Array.isArray(region.comunas)) {
                region.comunas.forEach(comuna => {
                    const comunaNombreNorm = normalizeText(comuna.nombre);
                    tempNormalizedData.push({
                        regionOriginal: region.nombre,
                        regionNormalizada: regionNombre,
                        regionAliases: regionAliases,
                        comunaOriginal: comuna.nombre,
                        comunaNormalizada: comunaNombreNorm,
                        comunaAliases: comuna.alias ? comuna.alias.map(normalizeText) : []
                    });
                    // Poblar el mapa de comuna a región
                    if (comunaNombreNorm && region.nombre) {
                        tempComunaToRegionMap[comunaNombreNorm] = region.nombre;
                    }
                });
            } else {
                // Manejar el caso donde una región podría no tener comunas o no es un array
                console.warn(`ADVERTENCIA: La región '${region.nombre}' no tiene un array de comunas o está vacío. Se omite.`);
            }
        });
        normalizedData = tempNormalizedData; // Asignar los datos procesados
        _comunaToRegionMap = tempComunaToRegionMap; // Asignar el mapa creado
        console.log(`INFO: Datos de geolocalización cargados y normalizados. ${normalizedData.length} entradas de comunas procesadas. Mapa comuna-región creado con ${Object.keys(_comunaToRegionMap).length} entradas.`);

    } catch (error) {
        console.error('ERROR CRÍTICO: No se pudo cargar o procesar el archivo chile_geodata.json.', error);
        normalizedData = []; // Asegurar que normalizedData sea un array vacío en caso de error grave
        _comunaToRegionMap = {};
    }
}

async function loadStandardComunas() {
    if (comunasLoaded && standardComunasList.length > 0) return;
    try {
        const filePath = path.join(__dirname, '..', '..', 'data', 'nombres_comunas_chile.json'); // Cambiada la ruta del archivo
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        // Ahora jsonData es directamente el array de strings
        if (Array.isArray(jsonData)) { 
            standardComunasList = jsonData.map(c => normalizeText(c)); 
            comunasLoaded = true;
            console.log(`INFO [LocationService]: Lista de comunas estándar cargada desde nombres_comunas_chile.json. Total: ${standardComunasList.length}`);
        } else {
            console.error('ERROR [LocationService]: El archivo nombres_comunas_chile.json no tiene el formato esperado (debe ser un array de strings).');
            standardComunasList = []; // Asegurar que esté vacía si hay error
        }
    } catch (error) {
        console.error('ERROR [LocationService]: No se pudo cargar la lista de comunas desde nombres_comunas_chile.json:', error);
        // Considerar qué hacer si la lista no se puede cargar.
        // Por ahora, la lista estará vacía y la coincidencia será menos efectiva.
        standardComunasList = []; // Asegurar que esté vacía si hay error
    }
}

// Cargar los datos al iniciar el módulo
loadGeoData();

/**
 * Normaliza una comuna y busca su región correspondiente.
 * @param {string} comunaDetectada La comuna extraída por la IA.
 * @param {string} regionDetectada La región extraída por la IA (puede ser null).
 * @returns {{ comuna: string|null, region: string|null }} Objeto con comuna y región normalizadas.
 */
function normalizeAndLookupLocation(comunaDetectada, regionDetectada) {
    if (!comunaDetectada && !regionDetectada) {
        return { comuna: null, region: null };
    }

    const GDATA = normalizedData; // Asegura que los datos estén cargados
    if (!GDATA || GDATA.length === 0) {
        console.warn('ADVERTENCIA: Datos geográficos no disponibles para normalización. Devolviendo entradas originales.');
        return { comuna: comunaDetectada || null, region: regionDetectada || null };
    }

    const normalizedInputComuna = normalizeText(comunaDetectada);
    let foundItem = null;

    // Búsqueda 1: Coincidencia exacta de comuna normalizada o alias normalizado
    for (const item of GDATA) {
        if (item.comunaNormalizada === normalizedInputComuna || item.comunaAliases.includes(normalizedInputComuna)) {
            foundItem = item;
            break;
        }
    }
    
    // Búsqueda 2: Coincidencia parcial (includes) si no hubo exacta - puede ser más propensa a errores
    // Considerar si esta lógica es deseable o si solo queremos coincidencias exactas (o por alias)
    if (!foundItem && normalizedInputComuna) {
        for (const item of GDATA) {
            if (item.comunaNormalizada.includes(normalizedInputComuna) || 
                item.comunaAliases.some(alias => alias.includes(normalizedInputComuna))) {
                // Esta lógica podría ser demasiado permisiva, ej: "San" podría coincidir con muchas.
                // Por ahora, la comentamos y preferimos matching más estricto.
                // foundItem = item; 
                // break;
            }
        }
    }

    if (foundItem) {
        const finalComuna = foundItem.comunaOriginal; // Nombre oficial de la comuna
        let finalRegion = regionDetectada; // Por defecto, mantener la región de Gemini si existe

        // Si la región de Gemini está vacía O si la región de Gemini es diferente a la región oficial de la comuna encontrada
        // (esto último para corregir si Gemini asigna una comuna a una región incorrecta)
        // preferimos la región oficial del catálogo.
        if (!finalRegion || normalizeText(finalRegion) !== normalizeText(foundItem.regionNormalizada)) {
            finalRegion = foundItem.regionOriginal; 
        }
        
        console.log(`INFO [LocationService]: Entrada: Comuna='${comunaDetectada}', Región='${regionDetectada}'. Salida: Comuna='${finalComuna}', Región='${finalRegion}'`);
        return { comuna: finalComuna, region: finalRegion };
    } else {
        // No se encontró la comuna, devolver los valores originales (o null si eran vacíos)
        // Podríamos intentar normalizar solo la región si la comuna no se encontró pero la región sí.
        console.log(`INFO [LocationService]: Comuna '${comunaDetectada}' no encontrada en catálogo. Devolviendo entrada original para región: '${regionDetectada}'.`);
        return { comuna: comunaDetectada || null, region: regionDetectada || null };
    }
}

// Mapeos para correcciones comunes o abreviaturas antes de la similitud
const commonComunaMappings = {
    "stgo": "santiago",
    "stgo centro": "santiago",
    "scl": "santiago",
    "san juaquin": "san joaquin",
    "lasc": "las condes",
    "vitac": "vitacura",
    "nunoa": "ñuñoa", // normalizeText ya maneja la ñ, pero puede haber otras variaciones
    "bio bio": "biobio",
    "bio-bio": "biobio",
    "la serena y coquimbo": null, // Ejemplo de entrada ambigua que no debería mapear directamente
    "vina del mar": "viña del mar",
    "valpo": "valparaiso"
    // Añadir más según sea necesario y se identifiquen patrones
};

async function getStandardComunaName(userInputComuna) {
    if (!userInputComuna || typeof userInputComuna !== 'string' || userInputComuna.trim() === '') {
        return null;
    }

    await loadStandardComunas(); // Asegurar que la lista esté cargada

    let normalizedInput = normalizeText(userInputComuna);

    // 1. Mapeos comunes directos
    if (commonComunaMappings.hasOwnProperty(normalizedInput)) {
        const mappedValue = commonComunaMappings[normalizedInput];
        if (mappedValue === null) { // Si el mapeo es explícitamente null, significa que es inválido/ambiguo
            console.warn(`WARN [LocationService]: Entrada de comuna '${userInputComuna}' mapeada a un valor nulo (inválido/ambiguo).`);
            return null;
        }
        normalizedInput = mappedValue; // Usar el valor mapeado para la siguiente comparación
    }

    // 2. Coincidencia exacta con la lista estándar (después de posible mapeo)
    if (standardComunasList.includes(normalizedInput)) {
        return normalizedInput;
    }

    // 3. Coincidencia por similitud (si la lista está cargada y hay al menos una comuna estándar)
    if (standardComunasList.length > 0) {
        const matches = stringSimilarity.findBestMatch(normalizedInput, standardComunasList);
        // Ajustar el umbral según sea necesario. 0.75 es un punto de partida razonable.
        // Para nombres cortos, podríamos necesitar un umbral más alto o una lógica diferente.
        let similarityThreshold = 0.75;
        if (normalizedInput.length <= 4) similarityThreshold = 0.85; // Más estricto para nombres cortos
        if (normalizedInput.length <= 2) return null; // Demasiado corto para una coincidencia fiable

        if (matches.bestMatch.rating > similarityThreshold) {
            console.log(`INFO [LocationService]: Comuna '${userInputComuna}' (normalizada: '${normalizedInput}') mapeada a '${matches.bestMatch.target}' con rating ${matches.bestMatch.rating.toFixed(2)}`);
            return matches.bestMatch.target;
        }
    }
    
    console.warn(`WARN [LocationService]: No se pudo encontrar una comuna estándar confiable para '${userInputComuna}'. Entrada normalizada: '${normalizedInput}'.`);
    // Si no hay coincidencia fuerte, es mejor devolver null para forzar una clarificación o error,
    // en lugar de arriesgarse a usar una comuna incorrecta.
    return null; 
}

module.exports = {
    normalizeText,
    normalizeAndLookupLocation,
    loadGeoData,
    getStandardComunaName,
    loadStandardComunas,
    // Nuevas exportaciones para el scheduledScraper
    getStandardComunasList: () => standardComunasList, // Getter para la lista de comunas
    getRegionForComunaNormalizada: (comunaNorm) => _comunaToRegionMap[comunaNorm] || '' // Getter para el mapa
}; 