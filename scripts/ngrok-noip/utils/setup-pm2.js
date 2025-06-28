#!/usr/bin/env node

/**
 * Script para configurar PM2
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const config = require('../config/settings');

// Función para ejecutar comandos
function runCommand(command) {
  console.log(`Ejecutando: ${command}`);
  try {
    return execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error al ejecutar el comando: ${error.message}`);
    return null;
  }
}

// Función principal
function main() {
  console.log('=== Configurando PM2 para ngrok-noip ===');
  
  // Verificar si PM2 está instalado
  try {
    execSync('pm2 --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('PM2 no está instalado. Instalándolo...');
    runCommand('npm install -g pm2');
  }
  
  // Crear archivo de configuración de PM2
  const pm2ConfigPath = path.join(__dirname, '../../../ecosystem.config.js');
  
  // Verificar si el archivo ya existe
  let existingConfig = {};
  if (fs.existsSync(pm2ConfigPath)) {
    try {
      // Intentar cargar la configuración existente
      const configModule = require(pm2ConfigPath);
      existingConfig = configModule || {};
    } catch (error) {
      console.warn('No se pudo cargar la configuración existente de PM2:', error.message);
    }
  }
  
  // Preparar la configuración
  const apps = existingConfig.apps || [];
  
  // Filtrar las aplicaciones existentes de ngrok-noip
  const filteredApps = apps.filter(app => 
    app.name !== config.pm2.ngrokAppName && 
    app.name !== config.pm2.proxyAppName && 
    app.name !== config.pm2.updaterAppName
  );
  
  // Ruta al script bash de ngrok
  const ngrokScriptPath = path.join(__dirname, '../start-ngrok.sh');
  
  // Agregar las nuevas configuraciones
  const newApps = [
    ...filteredApps,
    {
      name: config.pm2.ngrokAppName,
      script: ngrokScriptPath,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ];
  
  // Crear el archivo de configuración
  const pm2Config = {
    apps: newApps
  };
  
  fs.writeFileSync(pm2ConfigPath, `module.exports = ${JSON.stringify(pm2Config, null, 2)};`);
  console.log(`Archivo de configuración de PM2 creado en: ${pm2ConfigPath}`);
  
  // Detener procesos existentes
  console.log('\nDeteniendo procesos existentes...');
  runCommand(`pm2 delete ${config.pm2.ngrokAppName} || true`);
  runCommand(`pm2 delete ${config.pm2.proxyAppName} || true`);
  runCommand(`pm2 delete ${config.pm2.updaterAppName} || true`);
  
  // Iniciar con PM2
  console.log('\nIniciando servicios con PM2...');
  runCommand(`pm2 start ${pm2ConfigPath}`);
  
  // Guardar la configuración de PM2
  console.log('\nGuardando configuración de PM2...');
  runCommand('pm2 save');
  
  // Configurar inicio automático
  console.log('\nConfigurando inicio automático...');
  runCommand('pm2 startup');
  
  console.log('\n=== Configuración de PM2 completada ===');
  console.log('Los servicios de ngrok-noip se iniciarán automáticamente al reiniciar el sistema.');
  console.log('Para ver el estado de los servicios, ejecuta: pm2 status');
  console.log('Para ver los logs, ejecuta: pm2 logs');
}

// Ejecutar la función principal
main(); 