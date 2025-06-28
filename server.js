require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { testConnection, db } = require('./src/config/database');
const { initWhatsAppClient, closeWhatsAppClient, getWhatsAppClient } = require('./src/services/whatsappService');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const webhooksRoutes = require('./src/routes/webhooksRoutes');
// Eliminamos la importación del servicio de scraping
// const scheduledScrapingService = require('./src/services/scheduledScrapingService');

// Importar modelos para asegurar que se ejecute createTable() al inicio
require('./src/models/DashboardUser');
require('./src/models/SheetConfig');
// AuthorizedUser ya se importa indirectamente a través de whatsappService

// Importar el servicio de Google Sheets y asignarlo a global
global.googleSheetsService = require('./src/services/googleSheetsService');

const app = express();
const server = http.createServer(app);

// Configuración de CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://konecte.vercel.app', 'https://konecte.ddns.net'], // Orígenes permitidos
  optionsSuccessStatus: 200, // Para navegadores antiguos (IE11, varios SmartTVs) que se ahogan con 204
  credentials: true // Permitir credenciales
};
app.use(cors(corsOptions)); // Usar cors con las opciones

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rutas del Dashboard
app.use('/api/dashboard', dashboardRoutes);

// Rutas para Webhooks (ej. desde el bot de WhatsApp)
app.use('/api/webhooks', webhooksRoutes);

const PORT = process.env.PORT || 3001;

// Función para verificar el estado del cliente de WhatsApp
async function checkWhatsAppClient() {
  const client = getWhatsAppClient();
  if (!client) {
    console.log('Cliente de WhatsApp no disponible. Intentando inicializar...');
    try {
      await initWhatsAppClient();
      console.log('Cliente de WhatsApp inicializado correctamente.');
      return true;
    } catch (error) {
      console.error('Error al inicializar el cliente de WhatsApp:', error);
      return false;
    }
  } else {
    console.log('Cliente de WhatsApp ya está inicializado.');
    return true;
  }
}

async function startServer() {
    try {
        console.log('Iniciando servidor...');
        
        // 1. Probar conexión a la base de datos
        await testConnection();
        console.log('Conexión a la base de datos verificada.');

        // 2. Iniciar el servidor para que escuche peticiones
        server.listen(PORT, async () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
            
            // 3. Una vez que el servidor está escuchando, inicializar los servicios
            try {
                // Inicializar el cliente de WhatsApp con múltiples intentos
                let whatsappInitialized = false;
                let attempts = 0;
                const maxAttempts = 3;
                
                while (!whatsappInitialized && attempts < maxAttempts) {
                    attempts++;
                    console.log(`Intento ${attempts} de inicializar el cliente de WhatsApp...`);
                    whatsappInitialized = await checkWhatsAppClient();
                    
                    if (!whatsappInitialized && attempts < maxAttempts) {
                        console.log(`Esperando 5 segundos antes del siguiente intento...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
                
                if (whatsappInitialized) {
                    console.log('Cliente de WhatsApp inicializado correctamente.');
                } else {
                    console.error(`No se pudo inicializar el cliente de WhatsApp después de ${maxAttempts} intentos.`);
                }
                
                console.log('Servidor API inicializado correctamente. No se usará scraping.');
            } catch (serviceError) {
                console.error('Error al inicializar servicios post-arranque:', serviceError);
            }
        });

    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1); // Salir si hay un error crítico
    }
}

// --- INICIO: LÓGICA DE APAGADO ELEGANTE (GRACEFUL SHUTDOWN) ---
async function shutdown(signal) {
    console.log(`\nRecibida señal ${signal}. Cerrando el bot de forma elegante...`);

    // 1. Cerrar el cliente de WhatsApp (esto guarda la sesión)
    try {
        await closeWhatsAppClient();
    } catch (e) {
        console.error('Error al cerrar el cliente de WhatsApp:', e);
    }

    // 2. Cerrar la conexión de la base de datos
    try {
        console.log('Cerrando conexión a la base de datos...');
        await db.end();
        console.log('Conexión a la base de datos cerrada.');
    } catch (e) {
        console.error('Error al cerrar la conexión a la base de datos:', e);
    }
    
    // 3. Cerrar el servidor HTTP
    server.close(() => {
        console.log('Servidor HTTP cerrado.');
        // 4. Salir del proceso
        process.exit(0);
    });
}

// Escuchar señales para un cierre elegante
// SIGINT es para Ctrl+C en la terminal
process.on('SIGINT', () => shutdown('SIGINT'));
// SIGUSR2 es la señal que nodemon envía para reiniciar
process.on('SIGUSR2', () => shutdown('SIGUSR2'));
// --- FIN: LÓGICA DE APAGADO ELEGANTE ---

startServer();