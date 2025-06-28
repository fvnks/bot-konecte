#!/usr/bin/env node

/**
 * Script para iniciar todos los servicios
 * Este script inicia el servidor, el túnel de Cloudflare y el actualizador de webhook
 */

const { execSync } = require('child_process');
const path = require('path');

// Colores para la salida en consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Función para imprimir mensajes con formato
function printMessage(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Función para ejecutar comandos
function executeCommand(command, successMessage, errorMessage) {
  try {
    printMessage(`Ejecutando: ${command}`, colors.blue);
    execSync(command, { stdio: 'inherit' });
    printMessage(successMessage, colors.green);
    return true;
  } catch (error) {
    printMessage(errorMessage, colors.red);
    printMessage(`Error: ${error.message}`, colors.red);
    return false;
  }
}

// Función principal
async function main() {
  printMessage('=== INICIANDO TODOS LOS SERVICIOS ===', colors.cyan);
  
  // Verificar si PM2 está instalado
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
  } catch (error) {
    printMessage('PM2 no está instalado. Instalando...', colors.yellow);
    executeCommand('npm install -g pm2', 'PM2 instalado correctamente', 'Error al instalar PM2');
  }
  
  // Detener todos los servicios existentes
  printMessage('Deteniendo servicios existentes...', colors.blue);
  executeCommand('pm2 delete all', 'Servicios detenidos correctamente', 'No hay servicios para detener');
  
  // Iniciar el servidor
  printMessage('Iniciando servidor...', colors.blue);
  executeCommand(
    'pm2 start ecosystem.config.js --only botito-server',
    'Servidor iniciado correctamente',
    'Error al iniciar el servidor'
  );
  
  // Iniciar el túnel de Cloudflare
  printMessage('Iniciando túnel de Cloudflare...', colors.blue);
  executeCommand(
    'pm2 start ecosystem.config.js --only botito-cloudflare-tunnel',
    'Túnel de Cloudflare iniciado correctamente',
    'Error al iniciar el túnel de Cloudflare'
  );
  
  // Iniciar el actualizador de webhook
  printMessage('Iniciando actualizador de webhook...', colors.blue);
  executeCommand(
    'pm2 start ecosystem.config.js --only botito-webhook-updater',
    'Actualizador de webhook iniciado correctamente',
    'Error al iniciar el actualizador de webhook'
  );
  
  // Guardar la configuración de PM2
  printMessage('Guardando configuración de PM2...', colors.blue);
  executeCommand(
    'pm2 save',
    'Configuración de PM2 guardada correctamente',
    'Error al guardar la configuración de PM2'
  );
  
  // Configurar PM2 para iniciar al arranque del sistema
  printMessage('Configurando PM2 para iniciar al arranque del sistema...', colors.blue);
  executeCommand(
    'pm2 startup',
    'PM2 configurado para iniciar al arranque del sistema',
    'Error al configurar PM2 para iniciar al arranque del sistema'
  );
  
  printMessage('=== TODOS LOS SERVICIOS INICIADOS CORRECTAMENTE ===', colors.cyan);
  printMessage('Para ver el estado de los servicios, ejecuta: pm2 status', colors.yellow);
}

// Ejecutar la función principal
main().catch(error => {
  printMessage(`Error fatal: ${error.message}`, colors.red);
  process.exit(1);
}); 