// /home/rodrigod/botito/services/whatsappGroupMessageHandler.js
// Este archivo contiene la lógica para procesar mensajes de grupos de WhatsApp,
// clasificarlos usando Google Gemini y potencialmente guardarlos en Google Sheets.

const crypto = require('crypto'); // Para generar el hash de la firma
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const googleSheetsService = require('../src/services/googleSheetsService'); // Importar el servicio correctamente
const { normalizeAndLookupLocation } = require('../src/services/locationService'); // Importar el nuevo servicio de localización
const { findMatchingAlertsAndNotify } = require('../src/services/alertService'); // <<< NUEVA LÍNEA
// const AuthorizedUser = require('../models/AuthorizedUser'); // Importar el modelo AuthorizedUser // Eliminada la importación
// Para Google Sheets, necesitarás:
// const { google } = require('googleapis'); // Cambiado a require si se usa
// const path = require('path'); // Ya es require
// const fs = require('fs'); // Ya es require, si se descomenta para depuración

// --- Configuración Inicial de Google Gemini ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel;

if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Cambiado de gemini-1.5-flash-latest
    });
    console.log("INFO: Cliente de Google Gemini inicializado correctamente con el modelo gemini-2.0-flash.");
  } catch (error) {
    console.error("ERROR: Al inicializar Google Gemini SDK:", error.message);
    geminiModel = null;
  }
} else {
  console.warn("ADVERTENCIA: La variable de entorno GEMINI_API_KEY no está configurada. La clasificación de IA no funcionará.");
  geminiModel = null;
}

// --- Configuración para Google Sheets (DEBES COMPLETAR ESTO) ---
// const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';
// const SHEET_NAME = 'AnunciosGrupo'; // O el nombre de tu hoja
// const GOOGLE_APPLICATION_CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
// let sheetsClient;

// if (GOOGLE_APPLICATION_CREDENTIALS_PATH) {
//   try {
//     const auth = new google.auth.GoogleAuth({
//       keyFile: GOOGLE_APPLICATION_CREDENTIALS_PATH,
//       scopes: ['https://www.googleapis.com/auth/spreadsheets'],
//     });
//     const authClientInstance = await auth.getClient();
//     sheetsClient = google.sheets({ version: 'v4', auth: authClientInstance });
//     console.log("INFO: Cliente de Google Sheets inicializado correctamente.");
//   } catch (error) {
//     console.error("ERROR: Al inicializar cliente de Google Sheets:", error.message);
//     sheetsClient = null;
//   }
// } else {
//   console.warn("ADVERTENCIA: GOOGLE_APPLICATION_CREDENTIALS no configurado. Guardado en Sheets no funcionará.");
//   sheetsClient = null;
// }

// const systemPromptForAnuncioClasificacion = `
// Eres un asistente especializado en procesar mensajes de grupos de WhatsApp para identificar y estructurar anuncios.
// Tu tarea es:
// 1.  Determinar si un mensaje es un anuncio/oferta/venta/solicitud de algo (incluyendo arriendos).
// 2.  Si es un anuncio, extraer información clave.
// 3.  Responder ESTRICTAMENTE en formato JSON.
// ... (resto del prompt largo comentado) ...
// Analiza el siguiente mensaje de usuario proveniente de un grupo de WhatsApp y proporciona tu respuesta en el formato JSON especificado.
// `; // Fin del template literal para systemPromptForAnuncioClasificacion

// Prompt simplificado para prueba:
// const systemPromptForAnuncioClasificacion = `{
//   "is_anuncio": false,
//   "categoria_anuncio": "NO_APLICA",
//   "anuncio_detalle": {}
// }`;

// Objeto para manejar la caché de firmas de anuncios para deduplicación
const adSignatureCache = {
    signatures: new Map(), // Almacena signatureHash -> timestamp
    TTL: 24 * 60 * 60 * 1000, // 24 horas en milisegundos

    generateSignature: function(anuncioDetalle) {
        const fieldsToHash = [
            anuncioDetalle.busco_ofrezco,
            anuncioDetalle.tipo_operacion,
            anuncioDetalle.propiedad,
            anuncioDetalle.opcion_comuna,
            anuncioDetalle.dormitorios,
            anuncioDetalle.banos,
            anuncioDetalle.valor,
            anuncioDetalle.moneda,
        ];

        // Normalizar y concatenar los campos
        // Convertir a string, a minúsculas, y trim para consistencia. Tratar null/undefined como string vacía.
        const stringToHash = fieldsToHash.map(field => String(field || '').toLowerCase().trim()).join('|');
        
        return crypto.createHash('md5').update(stringToHash).digest('hex');
    },

    addSignature: function(signature) {
        this.signatures.set(signature, Date.now());
        // Realizar limpieza periódica o basada en tamaño si es necesario para cachés grandes y de larga duración
        // Por ahora, la limpieza se hace en hasRecentSignature para las entradas consultadas y vencidas.
        // Y una limpieza general opcional al añadir, si el mapa crece mucho.
        this.cleanup(); 
    },

    hasRecentSignature: function(signature) {
        if (this.signatures.has(signature)) {
            const timestamp = this.signatures.get(signature);
            if ((Date.now() - timestamp) < this.TTL) {
                return true; // Firma reciente encontrada
            } else {
                // Firma encontrada pero es más antigua que el TTL, eliminarla
                this.signatures.delete(signature);
                return false;
            }
        }
        return false; // No se encontró la firma
    },

    cleanup: function() {
        // Eliminar firmas que hayan superado el TTL para evitar que la caché crezca indefinidamente
        const now = Date.now();
        for (const [signature, timestamp] of this.signatures.entries()) {
            if ((now - timestamp) >= this.TTL) {
                this.signatures.delete(signature);
            }
        }
        // Opcional: si el tamaño del Map supera un umbral, forzar una limpieza más exhaustiva o diferente.
        // console.log(`Cache size after cleanup: ${this.signatures.size}`);
    }
};

// Prompt completo actualizado para extraer todos los campos según las cabeceras
const systemPromptForAnuncioClasificacion = `
Eres un asistente experto en estructurar anuncios inmobiliarios de WhatsApp para una hoja de cálculo.
Un mensaje puede contener UNO O MÁS anuncios. Debes identificar y extraer CADA ANUNCIO INDIVIDUALMENTE.

Devuelve SIEMPRE un JSON con la siguiente estructura:
{
  "is_multiple": Boolean, // true si identificaste múltiples anuncios, false si solo uno o ninguno. Debe ser un booleano, no un string.
  "anuncios": [ // Array de objetos, cada uno es un anuncio. Vacío si no hay anuncios.
    {
      "busco_ofrezco": "Ofrezco" o "Busco", // Exactamente una de estas dos cadenas.
      "tipo_operacion": "Venta", "Arriendo", "Compra", "Permuta", "Traspaso", "Cesión de Promesa", etc. o null,
      "propiedad": "Casa", "Departamento", "Pieza", "Oficina", "Local Comercial", "Terreno", "Parcela", "Estacionamiento", "Bodega", etc. o null,
      "region": "Metropolitana de Santiago", "Valparaíso", "Biobío", etc. o null, // Intenta normalizar a nombres de regiones chilenas si es posible.
      "ciudad": "Santiago", "Viña del Mar", "Concepción", etc. o null, // Intenta normalizar a nombres de ciudades chilenas si es posible.
      "opcion_comuna": "Providencia", "Las Condes", "Ñuñoa", etc. o null, // Comuna principal.
      "opcion_comuna_2": "Comuna adicional" o null, // Si se ofrecen múltiples comunas como opción principal.
      "opcion_comuna_3": "Comuna adicional" o null,
      "opcion_comuna_4": "Comuna adicional" o null,
      "dormitorios": "2", "3", etc. o null, // Debe ser un string que represente un número, o null.
      "banos": "1", "2", etc. o null, // Debe ser un string que represente un número, o null.
      "estacionamiento": "1", "2", "Sí", etc. o null, // String numérico, "Sí" (si se menciona sin cantidad), o null.
      "bodegas": "1", "2", "Sí", etc. o null, // String numérico, "Sí" (si se menciona sin cantidad), o null.
      "valor": "160000000", "5000", etc. o null, // String numérico SIN puntos, comas, ni símbolo de moneda.
      "moneda": "CLP", "UF", etc. o null, // "CLP" o "UF" u otra si se especifica.
      "gastos_comunes": "100000", "5", etc. o null, // String numérico SIN puntos, comas, ni símbolo de moneda.
      "metros_cuadrados": "84", "120", etc. o null, // String numérico, solo el número.
      "telefono": "912345678" o null, // Teléfono DEL ANUNCIO (si lo hay, normalizado a 9 dígitos si es chileno).
      "correo_electronico": "ejemplo@correo.cl" o null,
      "texto_original_fragmento_anuncio": "El fragmento de texto específico de ESTE anuncio individual."
    }
    // ... más objetos de anuncio si hay más ...
  ]
}

REGLAS DETALLADAS:
1.  FORMATO JSON: Tu respuesta DEBE ser únicamente el objeto JSON especificado. No incluyas explicaciones, comentarios, ni los marcadores \`\`\`json o \`\`\`.
2.  CAMPOS NULOS: Si no puedes extraer un dato específico o no aplica para un anuncio, usa el valor JSON \`null\` para ese campo (NO uses cadenas como "N/D", "No especificado", "0", o vacías ""). La única excepción son los campos donde se indique explícitamente que se puede usar "Sí".
3.  TEXTO ORIGINAL: El campo "texto_original_fragmento_anuncio" debe contener el fragmento de texto del mensaje original que corresponde a ESE anuncio individual. Es importante para auditoría.
4.  ANUNCIOS IMPLÍCITOS:
    *   Si el mensaje describe una propiedad, su precio, características, ubicación, metros cuadrados, o dice que se pueden enviar fotos, CONSIDÉRALO UN ANUNCIO.
    *   Si un anuncio describe características y precio de una propiedad y NO indica explícitamente "Busco", "Necesito", "Requiero", etc., asume que \`busco_ofrezco\` es "Ofrezco".
5.  NORMALIZACIÓN DE NÚMEROS (dormitorios, banos, estacionamiento, bodegas):
    *   Convierte números escritos con letras a dígitos (ej: "uno" -> "1", "dos" -> "2", "tres" -> "3").
    *   Si se menciona la palabra en singular sin un número explícito (ej: "tiene baño", "con estacionamiento", "incluye bodega"), interpreta como "1" para el campo correspondiente (ej: \`banos: "1"\`, \`estacionamiento: "1"\`).
    *   Para \`estacionamiento\` y \`bodegas\`, si se mencionan pero sin cantidad clara (ej: "varios estacionamientos", "cuenta con bodegas"), puedes usar "Sí". Si no se mencionan, usa \`null\`.
    *   Si no se mencionan dormitorios o baños, usa \`null\`.
6.  EXTRACCIÓN DE VALORES MONETARIOS (valor, gastos_comunes):
    *   Extrae SOLAMENTE EL NÚMERO. Elimina puntos, comas, símbolos de moneda (ej. "$", "UF", "CLP") y cualquier texto adicional (ej. "conversable", "aprox.", "más GGCC", "millones").
    *   Ejemplo: "$550.000 conversable" -> \`valor: "550000"\`, \`moneda: "CLP"\`.
    *   Ejemplo: "UF 3.000 aprox." -> \`valor: "3000"\`, \`moneda: "UF"\`.
    *   Ejemplo: "120 mil pesos" -> \`valor: "120000"\`, \`moneda: "CLP"\`.
    *   Si el valor es, por ejemplo, "20 millones", conviértelo a \`valor: "20000000"\`.
    *   Si se indica solo "gastos comunes incluidos" o similar y no un monto, para \`gastos_comunes\` usa \`null\` (o un valor especial como "Incluidos" si prefieres y ajustas el sistema para manejarlo, pero \`null\` es más limpio para un campo numérico). Por ahora, usa \`null\`.
7.  MONEDA: Infiere "CLP" si se habla de "pesos", "$" o montos típicos en pesos chilenos. Infiere "UF" si se menciona "UF" o montos típicos en UF. Si no se puede determinar, usa \`null\`.
8.  METROS CUADRADOS: Extrae solo el número. Ej: "100m2" -> \`metros_cuadrados: "100"\`. "Terreno de 200 mts" -> \`metros_cuadrados: "200"\`.
9.  TELÉFONO: Si encuentras un número de teléfono chileno, intenta normalizarlo a 9 dígitos si le falta el 9 inicial (ej. "87654321" -> "987654321").
10. COMUNAS MÚLTIPLES: Si se mencionan varias comunas como opciones para un mismo anuncio (ej. 'busco en Ñuñoa o Providencia'), usa los campos \`opcion_comuna\`, \`opcion_comuna_2\`, etc. Si una comuna es claramente la principal y otra una referencia (ej. 'Providencia, cerca de metro Salvador que está en Santiago Centro'), prioriza la comuna principal para \`opcion_comuna\`.

EJEMPLO BASE (Múltiples anuncios, ya presentado):
Mensaje: "PARA CANJE ARRIENDO DEPARTAMENTO 2 DORMITORIO + 2 BAÑO + TERRAZA. Arriendo Departamento 2 Dormitorio, 1 baño, terraza, sector SANTA ROSA 835, valor $ 350.000 + GGCC 80.000. PARA CANJE ARRIENDO DEPARTAMENTO 1 DORMITORIO + 1 BAÑO. Arriendo Departamento 1 Dormitorio, 1 baño, sector Santa Ana – MANUEL RODRIGUEZ 881, valor $ 270.000 + GGCC 65.000. CONSULTAS POR INTERNO"
Respuesta JSON esperada:
\`\`\`json
{
  "is_multiple": true,
  "anuncios": [
    {
      "busco_ofrezco": "Ofrezco",
      "tipo_operacion": "Arriendo",
      "propiedad": "Departamento",
      "region": null,
      "ciudad": null,
      "opcion_comuna": "SANTA ROSA 835",
      "opcion_comuna_2": null,
      "opcion_comuna_3": null,
      "opcion_comuna_4": null,
      "dormitorios": "2",
      "banos": "1",
      "estacionamiento": null,
      "bodegas": null,
      "valor": "350000",
      "moneda": "CLP",
      "gastos_comunes": "80000",
      "metros_cuadrados": null,
      "telefono": null,
      "correo_electronico": null,
      "texto_original_fragmento_anuncio": "PARA CANJE ARRIENDO DEPARTAMENTO 2 DORMITORIO + 2 BAÑO + TERRAZA. Arriendo Departamento 2 Dormitorio, 1 baño, terraza, sector SANTA ROSA 835, valor $ 350.000 + GGCC 80.000."
    },
    {
      "busco_ofrezco": "Ofrezco",
      "tipo_operacion": "Arriendo",
      "propiedad": "Departamento",
      "region": null,
      "ciudad": null,
      "opcion_comuna": "MANUEL RODRIGUEZ 881",
      "opcion_comuna_2": null,
      "opcion_comuna_3": null,
      "opcion_comuna_4": null,
      "dormitorios": "1",
      "banos": "1",
      "estacionamiento": null,
      "bodegas": null,
      "valor": "270000",
      "moneda": "CLP",
      "gastos_comunes": "65000",
      "metros_cuadrados": null,
      "telefono": null,
      "correo_electronico": null,
      "texto_original_fragmento_anuncio": "PARA CANJE ARRIENDO DEPARTAMENTO 1 DORMITORIO + 1 BAÑO. Arriendo Departamento 1 Dormitorio, 1 baño, sector Santa Ana – MANUEL RODRIGUEZ 881, valor $ 270.000 + GGCC 65.000."
    }
  ]
}
\`\`\`

NUEVO EJEMPLO (Anuncio corto, normalización de números y moneda):
Mensaje: "Busco depto urgente Stgo Centro, dos dormitorios, con estacionamiento. Presupuesto 600 lucas."
Respuesta JSON esperada:
\`\`\`json
{
  "is_multiple": false,
  "anuncios": [
    {
      "busco_ofrezco": "Busco",
      "tipo_operacion": null,
      "propiedad": "Departamento",
      "region": "Metropolitana de Santiago", // Asumiendo que puede inferir por "Stgo Centro"
      "ciudad": "Santiago", // Asumiendo que puede inferir por "Stgo Centro"
      "opcion_comuna": "Santiago Centro",
      "opcion_comuna_2": null,
      "opcion_comuna_3": null,
      "opcion_comuna_4": null,
      "dormitorios": "2", // Normalizado de "dos"
      "banos": null, // No se menciona
      "estacionamiento": "1", // Normalizado de "con estacionamiento"
      "bodegas": null,
      "valor": "600000", // Normalizado de "600 lucas"
      "moneda": "CLP",
      "gastos_comunes": null,
      "metros_cuadrados": null,
      "telefono": null,
      "correo_electronico": null,
      "texto_original_fragmento_anuncio": "Busco depto urgente Stgo Centro, dos dormitorios, con estacionamiento. Presupuesto 600 lucas."
    }
  ]
}
\`\`\`

Recuerda: si el mensaje original no contiene ningún anuncio, devuelve: \`{"is_multiple": false, "anuncios": []}\`

Devuelve SOLO el JSON, sin explicaciones adicionales.

Mensaje del usuario:
`;

async function classifyMessageWithGemini(messageText) {
  if (!geminiModel) {
    console.error('ERROR: Modelo Gemini no inicializado. No se puede clasificar el mensaje.');
    return null;
  }

  if (!messageText || typeof messageText !== 'string' || messageText.trim() === '') {
    console.log('INFO: Texto vacío o no válido. No se puede clasificar.');
    return null;
  }

  try {
    console.log(`INFO: Enviando mensaje a Gemini para clasificación. Longitud: ${messageText.length} caracteres`);
    
    // Mejorar el prompt para aumentar la precisión de detección
    const enhancedPrompt = `
${systemPromptForAnuncioClasificacion}

IMPORTANTE: Analiza este mensaje de un grupo de WhatsApp inmobiliario con especial atención. 
Recuerda que CUALQUIER mención de propiedades, precios, ubicaciones o características inmobiliarias 
debe ser considerada como un potencial anuncio inmobiliario.

Mensaje a analizar: "${messageText}"
`;

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
      generationConfig: {
        temperature: 0.2, // Reducir temperatura para respuestas más predecibles
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ]
    });

    const responseText = result.response.text();
    console.log(`INFO: Respuesta de Gemini recibida. Longitud: ${responseText.length} caracteres`);
    
    try {
      // Limpiar la respuesta para asegurar que sea un JSON válido
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
      const parsedResponse = JSON.parse(cleanedResponse);
      
      console.log(`INFO: Clasificación exitosa. Encontrados ${parsedResponse.anuncios?.length || 0} anuncios.`);
      return parsedResponse;
    } catch (parseError) {
      console.error(`ERROR IA: Al procesar mensaje: IA devolvió un JSON malformado. String: ${responseText.substring(0, 200)}...`);
      
      // Intentar recuperar el JSON de la respuesta si está mal formateada
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = jsonMatch[0];
          const parsedJson = JSON.parse(extractedJson);
          console.log('INFO: Se logró recuperar el JSON de la respuesta mal formateada.');
          return parsedJson;
        } catch (e) {
          console.error('ERROR: No se pudo recuperar el JSON de la respuesta.');
        }
      }
      return null;
    }
  } catch (error) {
    console.error(`ERROR IA: Error al llamar a la API de Gemini: ${error.message}`);
    return null;
  }
}

// Función para guardar el anuncio procesado en Google Sheets
async function saveToGoogleSheet(anuncioDetalle, telefonoWhatsappRemitente, nombreWhatsappRemitente, uidRemitente, fechaPub, horaPub) {
    console.log("Intentando guardar en Google Sheet. Anuncio:", JSON.stringify(anuncioDetalle).substring(0, 100) + "...");

    if (!googleSheetsService || !googleSheetsService.appendData || !googleSheetsService.getMainSheetConfig) {
        console.error('ERROR CRÍTICO: googleSheetsService o sus funciones (appendData, getMainSheetConfig) no están disponibles.');
        // No lanzar error para no detener el flujo, pero sí registrarlo como crítico.
        return { success: false, error: 'Servicio Google Sheets no inicializado correctamente en el backend.' };
    }

    let sheetConfig;
    try {
        sheetConfig = await googleSheetsService.getMainSheetConfig();
        if (!sheetConfig || !sheetConfig.spreadsheetId || !sheetConfig.sheetName) {
            console.error('Error: No se pudo obtener la configuración activa de Google Sheet (spreadsheetId o sheetName faltantes). El anuncio no se guardará.');
            return { success: false, error: 'Configuración de Google Sheet no encontrada o incompleta en la base de datos.' };
        }
        console.log(`Configuración de Google Sheet obtenida: ID [${sheetConfig.spreadsheetId}], Hoja [${sheetConfig.sheetName}], Rango Configurado [${sheetConfig.range}]`);
    } catch (error) {
        console.error('Error al obtener la configuración de Google Sheet desde la base de datos:', error.message);
        return { success: false, error: 'Error interno al obtener configuración de Google Sheet.' };
    }

    const { spreadsheetId, sheetName } = sheetConfig; // Usamos el sheetName de la config para el append.

    // Estas son las cabeceras que se esperan en la hoja de Google Sheets.
    // El orden DEBE coincidir con las columnas en la hoja destino.
    // Asegúrate que el prompt de Gemini extraiga campos con estos nombres exactos (o mapea después).
    const headers = [
      "busco_ofrezco", "tipo_operacion", "propiedad", "region", "ciudad",
      "opcion_comuna", "opcion_comuna_2", "opcion_comuna_3", "opcion_comuna_4",
      "dormitorios", "banos", "estacionamiento", "bodegas", "valor", "moneda",
      "gastos_comunes", "metros_cuadrados", "telefono", "correo_electronico",
      "telefono_remitente", "nombre_remitente", "fecha_publicacion", "hora_publicacion",
      "uid_remitente", "status" 
      // Se elimina "texto_original_fragmento_anuncio" de los headers
      // Añade más cabeceras aquí si es necesario, ej: "fecha_ultimo_seguimiento", "notas_internas"
      // Y asegúrate que la lógica de abajo para `orderedRow` las llene.
    ];
    
    const d = anuncioDetalle; // 'd' es el objeto del anuncio extraído por Gemini

    // Construir la fila en el orden de las cabeceras
    const orderedRow = [
      d.busco_ofrezco || '',
      d.tipo_operacion || '',
      d.propiedad || '',
      d.region || '',
      d.ciudad || '',
      d.opcion_comuna || '',
      d.opcion_comuna_2 || '',
      d.opcion_comuna_3 || '',
      d.opcion_comuna_4 || '',
      d.dormitorios || '',
      d.banos || '',
      d.estacionamiento || '',
      d.bodegas || '',
      d.valor || '',
      d.moneda || '',
      d.gastos_comunes || '',
      d.metros_cuadrados || '',
      d.telefono || '', // Teléfono DEL ANUNCIO (extraído por IA, si existe)
      d.correo_electronico || '', // Correo DEL ANUNCIO (extraído por IA, si existe)
      telefonoWhatsappRemitente || '', // Teléfono DEL REMITENTE del mensaje de WhatsApp
      nombreWhatsappRemitente || '',   // Nombre DEL REMITENTE del mensaje de WhatsApp (si está disponible)
      fechaPub || '',                  // Fecha de publicación (generada por el backend)
      horaPub || '',                   // Hora de publicación (generada por el backend)
      uidRemitente || '',              // UID del remitente (para referencia interna)
      'Activo'                           // Status, por defecto 'Activo' para nuevos anuncios
      // No se incluye d.texto_original_fragmento_anuncio aquí
      // Si añadiste cabeceras arriba, añade los datos correspondientes aquí.
      // Por ejemplo: d.fecha_ultimo_seguimiento || '', d.notas_internas || ''
    ];

    console.log(`Intentando añadir fila a Spreadsheet ID: [${spreadsheetId}], Hoja: [${sheetName}]`);
    console.log("Datos de la fila:", JSON.stringify(orderedRow).substring(0, 200) + "...");

    try {
        // Para `appendData`, el `range` que se pasa debe ser solo el nombre de la hoja (ej: "Anuncios")
        // si se quiere que Google Sheets automáticamente encuentre la última fila y añada después.
        // La función appendData en googleSheetsService.js está preparada para esto.
        await googleSheetsService.appendData(spreadsheetId, sheetName, [orderedRow]);

        const successMsg = `Anuncio guardado exitosamente en Google Sheet: ID [${spreadsheetId}], Hoja [${sheetName}]`;
        console.log(successMsg);
        return { success: true, message: successMsg };
    } catch (error) {
        console.error(`Error al guardar anuncio en Google Sheets (ID: ${spreadsheetId}, Hoja: ${sheetName}):`, error.message);
        // Aquí podrías querer loguear error.response?.data si es un error de API para más detalles
        if (error.response && error.response.data && error.response.data.error) {
            console.error("Detalles del error de API de Google:", JSON.stringify(error.response.data.error));
        }
        return { success: false, error: error.message || 'Error desconocido al intentar guardar en Google Sheets.' };
  }
}

async function handleWhatsappGroupMessage(msg, messageContent, groupId, senderId) {
  try {
    console.log(`DEBUG: handleWhatsappGroupMessage llamado para groupId: ${groupId}, senderId: ${senderId}, messageContent: "${messageContent.substring(0, 30)}..."`);
    
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim() === '') {
      console.log("INFO: Mensaje vacío o inválido recibido de grupo, ignorando.");
      return;
    }
    
    const logMessage = messageContent.length > 150 ? `${messageContent.substring(0, 150)}...` : messageContent;
    console.log(`INFO: Procesando mensaje de grupo '${groupId}', remitente '${senderId}': "${logMessage}"`);

    // Obtener la configuración principal para acceder a la hoja de cálculo
    const mainConfig = await googleSheetsService.getMainSheetConfig();
    if (!mainConfig || !mainConfig.spreadsheetId) {
      console.error(`ERROR: No se pudo obtener la configuración de Google Sheets para procesar mensaje de grupo '${groupId}'.`);
      return;
    }

    const classificationResult = await classifyMessageWithGemini(messageContent);
    console.log('RESPUESTA DE GEMINI:', JSON.stringify(classificationResult, null, 2));

    // Si la clasificación falló por completo, registrar el mensaje como no procesable
    if (!classificationResult) {
      console.error(`ERROR: No se pudo clasificar el mensaje de grupo con Gemini. Grupo: ${groupId}, Remitente: ${senderId}`);
      return;
    }

    // Si no hay anuncios detectados, pero el mensaje podría ser relevante, intentar guardar como información general
    if (!classificationResult.anuncios || classificationResult.anuncios.length === 0) {
      console.log(`INFO: Mensaje de '${senderId}' en grupo '${groupId}' no contenía anuncios procesables según IA.`);
      
      // Determinar si el mensaje podría ser relevante para el sector inmobiliario
      const immobiliaryCriteria = [
        /propiedad/i, /casa/i, /depto/i, /departamento/i, /arriendo/i, /venta/i, /compra/i, 
        /uf/i, /m2/i, /dormitorio/i, /baño/i, /estacionamiento/i, /bodega/i, /terraza/i
      ];
      
      const isRelevant = immobiliaryCriteria.some(pattern => pattern.test(messageContent));
      
      if (isRelevant) {
        console.log(`INFO: Mensaje de grupo no clasificado como anuncio pero contiene términos inmobiliarios. Registrando como información general.`);
        
        // Crear un registro básico para la hoja konecte
        const telefonoWhatsappRemitente = senderId ? senderId.replace(/@c\.us$/, '') : 'N/D';
        const nombreWhatsappRemitente = (msg?._data?.notifyName || msg?._data?.sender?.name || msg?._data?.sender?.pushname || msg?._data?.pushName || msg?.notifyName) || 'N/D';
        const uidRemitente = senderId || 'N/D';
        
        const now = new Date();
        const timeZone = 'America/Santiago';
        const fechaPublicacion = now.toLocaleDateString('es-CL', { timeZone: timeZone });
        const horaPublicacion = now.toLocaleTimeString('es-CL', { hour12: false, timeZone: timeZone });
        
        // Crear un objeto básico para guardar en konecte
        const basicInfo = {
          busco_ofrezco: "Información",
          tipo_operacion: null,
          propiedad: null,
          region: null,
          ciudad: null,
          opcion_comuna: null,
          opcion_comuna_2: null,
          opcion_comuna_3: null,
          opcion_comuna_4: null,
          dormitorios: null,
          banos: null,
          estacionamiento: null,
          bodegas: null,
          valor: null,
          moneda: null,
          gastos_comunes: null,
          metros_cuadrados: null,
          telefono: null,
          correo_electronico: null,
          texto_original_fragmento_anuncio: messageContent
        };
        
        await saveToGoogleSheet(basicInfo, telefonoWhatsappRemitente, nombreWhatsappRemitente, uidRemitente, fechaPublicacion, horaPublicacion);
        return;
      }
      
      return;
    }

    // Procesar los anuncios detectados
    console.log(`INFO: Mensaje de '${senderId}' en grupo '${groupId}' CLASIFICADO CON ${classificationResult.anuncios.length} ANUNCIO(S).`);
    
    const telefonoWhatsappRemitente = senderId ? senderId.replace(/@c\.us$/, '') : 'N/D';
    const nombreWhatsappRemitente = (msg?._data?.notifyName || msg?._data?.sender?.name || msg?._data?.sender?.pushname || msg?._data?.pushName || msg?.notifyName) || 'N/D';
    const uidRemitente = senderId || 'N/D';
    
    const now = new Date();
    const timeZone = 'America/Santiago';

    const fechaPublicacion = now.toLocaleDateString('es-CL', { timeZone: timeZone });
    const horaPublicacion = now.toLocaleTimeString('es-CL', { hour12: false, timeZone: timeZone });

    for (const anuncioDetalle of classificationResult.anuncios) {
      try {
        console.log('PROCESANDO ANUNCIO INDIVIDUAL:', JSON.stringify(anuncioDetalle, null, 2));
        
        // Normalización de Comuna y Región
        const { comuna: normalizedComuna, region: normalizedRegion } = normalizeAndLookupLocation(anuncioDetalle.opcion_comuna, anuncioDetalle.region);
        anuncioDetalle.opcion_comuna = normalizedComuna;
        anuncioDetalle.region = normalizedRegion;
        
        if (normalizedComuna || normalizedRegion) {
            console.log(`DEBUG: Localización procesada: Comuna='${anuncioDetalle.opcion_comuna}', Región='${anuncioDetalle.region}'`);
        }
        
        // Lógica de Deduplicación
        const currentAdSignature = adSignatureCache.generateSignature(anuncioDetalle);
        if (adSignatureCache.hasRecentSignature(currentAdSignature)) {
            console.log(`INFO: Anuncio duplicado detectado (firma: ${currentAdSignature}). No se guardará.`);
            continue;
        }
        
        const saveResult = await saveToGoogleSheet(anuncioDetalle, telefonoWhatsappRemitente, nombreWhatsappRemitente, uidRemitente, fechaPublicacion, horaPublicacion);

        // Añadir firma a la caché solo si el guardado fue exitoso
        if (saveResult && saveResult.success) {
            adSignatureCache.addSignature(currentAdSignature);
            console.log(`INFO: Firma de anuncio '${currentAdSignature}' añadido a la caché tras guardado exitoso.`);
            
            // Después de guardar un anuncio "Ofrezco" de GRUPO, buscar coincidencias de alertas
            if (anuncioDetalle.busco_ofrezco && anuncioDetalle.busco_ofrezco.toLowerCase() === 'ofrezco') {
                console.log('INFO [GroupMessageHandler]: Anuncio "Ofrezco" de GRUPO guardado, buscando alertas coincidentes...');
                
                // Mapeo de campos para el servicio de alertas
                const offerDetailsForAlerts = {
                    tipoPropiedad: anuncioDetalle.propiedad,
                    region: anuncioDetalle.region,
                    comuna: anuncioDetalle.opcion_comuna,
                    numDormitorios: anuncioDetalle.dormitorios,
                    valor: anuncioDetalle.valor,
                    moneda: anuncioDetalle.moneda,
                    superficie: anuncioDetalle.metros_cuadrados,
                    caracteristicasAdicionales: anuncioDetalle.texto_original_fragmento_anuncio
                };
                await findMatchingAlertsAndNotify(offerDetailsForAlerts);
            }
        }

      } catch (sheetError) {
        console.error(`ERROR al procesar y guardar anuncio individual de '${senderId}' en grupo '${groupId}':`, sheetError.message);
      }
    }
  } catch (error) {
    console.error(`ERROR CRÍTICO al procesar mensaje de grupo (${groupId}) por remitente (${senderId}):`, error.message);
  }
}

// Añadir la exportación CommonJS
module.exports = {
  handleWhatsappGroupMessage
}; 