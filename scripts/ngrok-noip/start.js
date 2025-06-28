#!/usr/bin/env node

/**
 * Script principal para iniciar todos los servicios
 */

const ngrokService = require('./services/ngrok-service');
const proxyService = require('./services/proxy-service');
const updaterService = require('./services/updater-service');

async function main() {
  console.log('=== Iniciando servicios de ngrok-noip ===');
  
  try {
    // Iniciar ngrok
    console.log('\n1. Iniciando ngrok...');
    const ngrokUrl = await ngrokService.start();
    
    if (!ngrokUrl) {
      console.error('No se pudo iniciar ngrok. Abortando...');
      process.exit(1);
    }
    
    console.log(`Ngrok iniciado: ${ngrokUrl}`);
    
    // Iniciar proxy
    console.log('\n2. Iniciando servidor proxy...');
    const proxyStarted = await proxyService.start();
    
    if (!proxyStarted) {
      console.error('No se pudo iniciar el servidor proxy. Abortando...');
      await ngrokService.stop();
      process.exit(1);
    }
    
    // Iniciar servicio de actualización
    console.log('\n3. Iniciando servicio de actualización...');
    updaterService.start();
    
    console.log('\n=== Todos los servicios iniciados ===');
    console.log(`- Ngrok: ${ngrokUrl}`);
    console.log(`- Dominio No-IP: https://konecte.ddns.net`);
    console.log('- Proxy: Redirigiendo konecte.ddns.net a ngrok');
    console.log('- Actualizador: Ejecutándose cada 5 minutos');
    
    // Manejar señales para un cierre elegante
    process.on('SIGINT', async () => {
      console.log('\nRecibida señal de interrupción. Cerrando servicios...');
      updaterService.stop();
      proxyService.stop();
      await ngrokService.stop();
      console.log('Todos los servicios detenidos. Saliendo...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error al iniciar los servicios:', error.message);
    process.exit(1);
  }
}

// Ejecutar la función principal
main(); 