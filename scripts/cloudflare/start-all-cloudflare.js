#!/usr/bin/env node

/**
 * start-all-cloudflare.js
 * Script para iniciar todos los servicios relacionados con Cloudflare
 */

const { exec } = require('child_process');
const path = require('path');

// Ruta al directorio raíz del proyecto
const projectRoot = path.resolve(__dirname, '../..');

// Función para ejecutar comandos
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Ejecutando: ${command}`);
    
    exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar comando: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`Error en la salida: ${stderr}`);
      }
      
      console.log(`Salida: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Función principal
async function startAllCloudflareServices() {
  try {
    console.log('=== Iniciando todos los servicios de Cloudflare ===');
    
    // 1. Verificar que PM2 esté instalado
    console.log('Verificando instalación de PM2...');
    try {
      await executeCommand('pm2 --version');
    } catch (error) {
      console.error('PM2 no está instalado. Instalando...');
      await executeCommand('npm install -g pm2');
    }
    
    // 2. Detener servicios anteriores si existen
    console.log('Deteniendo servicios anteriores...');
    await executeCommand('pm2 stop botito-cloudflare-tunnel botito-cloudflare-webhook-updater || true');
    await executeCommand('pm2 delete botito-cloudflare-tunnel botito-cloudflare-webhook-updater || true');
    
    // 3. Iniciar el servidor si no está en ejecución
    console.log('Verificando si el servidor está en ejecución...');
    try {
      const serverStatus = await executeCommand('pm2 show botito-server');
      if (!serverStatus.includes('online')) {
        console.log('Iniciando el servidor...');
        await executeCommand('pm2 start botito-server');
      } else {
        console.log('El servidor ya está en ejecución.');
      }
    } catch (error) {
      console.log('Iniciando el servidor...');
      await executeCommand('pm2 start server.js --name botito-server');
    }
    
    // 4. Iniciar el túnel de Cloudflare
    console.log('Iniciando el túnel de Cloudflare...');
    await executeCommand('pm2 start botito-cloudflare-tunnel');
    
    // 5. Iniciar el actualizador de webhook
    console.log('Iniciando el actualizador de webhook...');
    await executeCommand('pm2 start botito-cloudflare-webhook-updater');
    
    // 6. Guardar la configuración de PM2
    console.log('Guardando configuración de PM2...');
    await executeCommand('pm2 save');
    
    console.log('=== Todos los servicios de Cloudflare iniciados correctamente ===');
    console.log('Para ver los logs, ejecuta: pm2 logs');
    console.log('Para detener los servicios, ejecuta: pm2 stop botito-cloudflare-tunnel botito-cloudflare-webhook-updater');
  } catch (error) {
    console.error('Error al iniciar los servicios:', error);
  }
}

// Ejecutar la función principal
startAllCloudflareServices();