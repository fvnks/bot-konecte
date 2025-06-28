const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

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

/**
 * Extrae los detalles de una publicación (propiedad o solicitud) desde un texto libre.
 * @param {string} text - El texto proporcionado por el usuario.
 * @param {string} publicationType - El tipo de publicación ('Propiedad' o 'Solicitud').
 * @returns {Promise<Object>} Un objeto con los detalles extraídos.
 */
async function extractPublicationDetails(text, publicationType) {
  const systemPrompt = `Eres un asistente experto en bienes raíces para la plataforma Konecte. Tu tarea es extraer detalles estructurados de un texto en lenguaje natural para crear una publicación. El usuario quiere publicar una ${publicationType}.

Analiza el siguiente texto y extrae la información en un objeto JSON. Las claves del JSON deben ser:
- "titulo": Un título corto y descriptivo.
- "operacion": Debe ser "Venta" o "Arriendo". Si es una solicitud, puede ser "Compra" o "Arriendo".
- "categoria": El tipo de propiedad (Ej: "Casa", "Departamento", "Oficina", "Terreno", "Local Comercial").
- "comuna": La comuna donde se ubica o se busca la propiedad.
- "dormitorios": (Opcional) El número de dormitorios como un entero.
- "banos": (Opcional) El número de baños como un entero.
- "valor": El precio como un número. Si se menciona "UF", mantén solo el número.
- "moneda": Debe ser "CLP" o "UF".
- "descripcion": El texto completo o un resumen de la descripción proporcionada.

Si un campo no se encuentra, omítelo en el JSON. Asegúrate de que "operacion" y "categoria" tengan valores consistentes. Si el usuario indica un presupuesto para una solicitud, usa "valor" para ese dato.

Ejemplo para una Propiedad:
Texto: "Vendo depto en Las Condes, 2d, 2b, living comedor, cocina equipada. Valor 5.000 UF. Título: Acogedor depto familiar. Es ideal para familias"
JSON: {"titulo": "Acogedor depto familiar", "operacion": "Venta", "categoria": "Departamento", "comuna": "Las Condes", "dormitorios": 2, "banos": 2, "valor": 5000, "moneda": "UF", "descripcion": "Vendo depto en Las Condes, 2d, 2b, living comedor, cocina equipada. Valor 5.000 UF. Es ideal para familias"}

Ejemplo para una Solicitud:
Texto: "Busco arriendo de casa en Ñuñoa o Providencia. Presupuesto máximo $800.000. Necesito 3 dormitorios para mi familia."
JSON: {"titulo": "Busco arriendo para familia", "operacion": "Arriendo", "categoria": "Casa", "comuna": "Ñuñoa, Providencia", "dormitorios": 3, "valor": 800000, "moneda": "CLP", "descripcion": "Busco arriendo de casa en Ñuñoa o Providencia. Presupuesto máximo $800.000. Necesito 3 dormitorios para mi familia."}

Ahora, analiza el siguiente texto del usuario. Responde únicamente con el objeto JSON.`;

  try {
    const response = await axios.post(GEMINI_API_URL, {
      contents: [{
        parts: [{ text: systemPrompt }, { text }]
      }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2,
      },
    });

    const jsonResponse = response.data.candidates[0].content.parts[0].text;
    console.log('[GEMINI] Respuesta JSON recibida para publicación:', jsonResponse);
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error('Error en la respuesta de Gemini para publicación:', error.response ? error.response.data : error.message);
    throw new Error('Error al comunicarse con la API de Gemini para la publicación');
  }
}

// Inicializar el cliente de Gemini al cargar el módulo
initializeGeminiClient();

module.exports = {
  extractPropertyDetails,
  extractPublicationDetails,
};
