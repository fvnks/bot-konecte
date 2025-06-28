require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Inicializar cliente de Google Gemini
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Directorio para guardar archivos de audio temporales
const TEMP_AUDIO_DIR = path.join(__dirname, '..', '..', 'temp_audio');
if (!fs.existsSync(TEMP_AUDIO_DIR)) {
    fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
}

const transcriptionService = {
    /**
     * Transcribe un archivo de audio usando Google Speech-to-Text API
     * @param {Buffer} audioBuffer - Buffer con los datos del audio
     * @param {string} mimeType - Tipo MIME del audio (ej: 'audio/ogg')
     * @returns {Promise<string>} - Texto transcrito
     */
    async transcribeAudio(audioBuffer, mimeType) {
        try {
            console.log('Iniciando transcripción de audio con Google Speech-to-Text...');
            
            // Determinar la extensión del archivo basado en el MIME type
            let fileExtension = '.ogg'; // Por defecto para audios de WhatsApp
            if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
                fileExtension = '.mp3';
            } else if (mimeType.includes('wav')) {
                fileExtension = '.wav';
            }
            
            // Guardar el buffer como archivo temporal
            const fileName = `audio_${Date.now()}${fileExtension}`;
            const filePath = path.join(TEMP_AUDIO_DIR, fileName);
            
            fs.writeFileSync(filePath, audioBuffer);
            console.log(`Audio guardado temporalmente en: ${filePath}`);
            
            // Configurar la solicitud a la API de Google Speech-to-Text
            const audioBytes = fs.readFileSync(filePath).toString('base64');
            
            const response = await axios.post(
                'https://speech.googleapis.com/v1/speech:recognize',
                {
                    config: {
                        encoding: 'OGG_OPUS',
                        sampleRateHertz: 16000,
                        languageCode: 'es-ES',
                        model: 'default'
                    },
                    audio: {
                        content: audioBytes
                    }
                },
                {
                    params: {
                        key: API_KEY
                    }
                }
            );
            
            // Limpiar el archivo temporal
            fs.unlinkSync(filePath);
            
            // Procesar la respuesta
            if (response.data && 
                response.data.results && 
                response.data.results.length > 0 && 
                response.data.results[0].alternatives && 
                response.data.results[0].alternatives.length > 0) {
                
                const transcription = response.data.results[0].alternatives[0].transcript;
                console.log('Transcripción completada:', transcription);
                return transcription;
            } else {
                console.log('No se pudo transcribir el audio, respuesta vacía');
                return this.fallbackTranscription(audioBuffer, mimeType);
            }
        } catch (error) {
            console.error('Error al transcribir audio con Google Speech-to-Text:', error);
            
            // Intentar con el método alternativo
            return this.fallbackTranscription(audioBuffer, mimeType);
        }
    },
    
    /**
     * Método alternativo de transcripción usando Gemini para describir el contenido del audio
     * @param {Buffer} audioBuffer - Buffer con los datos del audio
     * @param {string} mimeType - Tipo MIME del audio
     * @returns {Promise<string>} - Texto transcrito o mensaje informativo
     */
    async fallbackTranscription(audioBuffer, mimeType) {
        try {
            console.log('Usando método alternativo de transcripción...');
            
            // Mensaje informativo para el usuario, SIN EJEMPLOS que puedan confundirse con comandos reales
            const mensaje = "No se pudo transcribir tu mensaje de voz. Por favor, envía tu consulta como texto.";
            
            // Usar Gemini para generar una respuesta útil pero SIN EJEMPLOS DE BÚSQUEDA
            if (genAI) {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `Un usuario ha enviado un mensaje de voz a un bot inmobiliario, pero no se pudo transcribir. 
                               Genera una respuesta amable pidiéndole que envíe su consulta en formato texto.
                               IMPORTANTE: NO INCLUYAS EJEMPLOS DE BÚSQUEDAS NI COMANDOS en tu respuesta, 
                               ya que el sistema podría confundirlos con solicitudes reales.
                               La respuesta debe ser breve y solo pedir al usuario que escriba su consulta.`;
                
                const result = await model.generateContent(prompt);
                const response = result.response.text();
                return response || mensaje;
            }
            
            return mensaje;
        } catch (error) {
            console.error('Error en transcripción alternativa:', error);
            return "No se pudo procesar tu mensaje de voz. Por favor, envía tu consulta como texto.";
        }
    }
};

module.exports = transcriptionService; 