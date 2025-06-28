const { GoogleGenerativeAI } = require("@google/generative-ai");

// Acceder a su clave de API como una variable de entorno
const API_KEY = process.env.GEMINI_API_KEY; // Asegúrate de tener esta variable en tu .env

let geminiModel;

async function initializeGeminiClient() {
  if (!API_KEY) {
    console.error("ERROR: La variable de entorno GEMINI_API_KEY no está configurada.");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Para el caso de chat/texto: gemini-pro
    // Para casos de visión/texto a imagen: gemini-pro-vision
    geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" }); // Usamos gemini-1.5-flash-8b para extraccion de texto
    console.log("INFO: Cliente de Google Gemini inicializado correctamente con el modelo gemini-1.5-flash-8b.");
  } catch (error) {
    console.error("ERROR: Fallo al inicializar el cliente de Google Gemini:", error);
    geminiModel = null; // Asegurarse de que el modelo sea nulo si falla la inicialización
  }
}

/**
 * Extrae detalles de propiedades de un texto usando la IA de Gemini.
 * @param {string} text - El texto del mensaje del usuario.
 * @returns {Object} Un objeto con los criterios de búsqueda extraídos.
 */
async function extractPropertyDetails(text) {
  if (!geminiModel) {
    console.error("ERROR: El modelo de Gemini no está inicializado. No se puede extraer detalles de propiedades.");
    return {};
  }

  console.log(`[GEMINI] Intentando extraer detalles de: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

  try {
    // Aquí va el prompt para que Gemini extraiga los detalles.
    // Ejemplo de prompt:
    const prompt = `Analiza el siguiente texto y extrae los criterios de búsqueda de propiedades. 
Si no se mencionan, déjalos vacíos. Si el usuario busca o ofrece, indica 'tipoOperacion'.

Texto: "${text}"

Formato de salida JSON (solo el JSON):
{
  "tipoOperacion": "", // "Arriendo" o "Venta" o "Ofrezco"
  "tipoPropiedad": "", // "Departamento", "Casa", "Oficina", "Local", etc.
  "ubicacion": "", // Ciudad o comuna (ej: "Las Condes", "Santiago", "Viña del Mar")
  "precioMin": null, // Número
  "precioMax": null, // Número
  "moneda": "", // "CLP" o "UF"
  "dormitorios": null, // Número
  "banos": null, // Número
  "estacionamiento": "", // "Sí", "No", "Indiferente"
  "bodega": "", // "Sí", "No", "Indiferente"
  "metrosCuadradosMin": null // Número
}
`;

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let textContent = response.text();
    console.log("[GEMINI] Respuesta cruda de Gemini (antes de limpieza):", textContent);

    // Regex para buscar el bloque JSON entre ```json y ```
    const jsonMatch = textContent.match(/```json\n([\s\S]*?)\n```/);
    let jsonString = textContent; // Por defecto, el contenido completo

    if (jsonMatch && jsonMatch[1]) {
        // Si se encuentra el bloque de código, usa su contenido
        jsonString = jsonMatch[1].trim();
    } else {
        // Si no se encuentra el bloque de código, intenta limpiar el texto directamente
        // Esto es un fallback en caso de que Gemini no use el formato esperado
        jsonString = textContent.replace(/```json|```/g, '').trim();
    }

    try {
        const jsonResponse = JSON.parse(jsonString);
        console.log('[GEMINI] Detalles de propiedades extraídos (limpiados y parseados):', jsonResponse);
        return jsonResponse;
    } catch (parseError) {
        console.error("[GEMINI] Error al parsear la respuesta JSON de Gemini:", parseError.message);
        console.error("[GEMINI] Respuesta recibida que causó error de parseo (después de limpieza inicial):", jsonString);
        return {}; // Devolver objeto vacío si no se puede parsear
    }

  } catch (error) {
    console.error("[GEMINI] Error al interactuar con la API de Gemini:", error);
    return {};
  }
}

// Inicializar el cliente de Gemini al cargar el módulo
initializeGeminiClient();

module.exports = {
  extractPropertyDetails
};
