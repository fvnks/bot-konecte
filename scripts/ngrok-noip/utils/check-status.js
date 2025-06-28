#!/usr/bin/env node

/**
 * Script para verificar el estado de los servicios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config/settings');
const axios = require('axios');

// Función para ejecutar comandos
function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

// Función para verificar si un servicio está activo en PM2
function isPM2ServiceActive(serviceName) {
  try {
    const output = runCommand(`pm2 jlist`);
    if (!output) return false;
    
    const processes = JSON.parse(output);
    const service = processes.find(p => p.name === serviceName);
    
    return service && service.pm2_env.status === 'online';
  } catch (error) {
    return false;
  }
}

// Función para verificar si un puerto está en uso
async function isPortInUse(port) {
  try {
    const output = runCommand(`netstat -tuln | grep :${port}`);
    return !!output;
  } catch (error) {
    return false;
  }
}

// Función para verificar si un dominio es accesible
async function isDomainAccessible(domain) {
  try {
    const response = await axios.get(`https://${domain}`, {
      timeout: 5000,
      validateStatus: () => true
    });
    return response.status < 500; // Consideramos cualquier respuesta HTTP como éxito
  } catch (error) {
    return false;
  }
}

// Función para obtener la URL de ngrok
function getNgrokUrl() {
  if (fs.existsSync(config.paths.lastUrlFile)) {
    return fs.readFileSync(config.paths.lastUrlFile, 'utf8').trim();
  }
  return null;
}

// Función principal
async function main() {
  console.log('=== Verificando estado de los servicios de ngrok-noip ===\n');
  
  // Verificar PM2
  const pm2Running = !!runCommand('pm2 ping');
  console.log(`PM2: ${pm2Running ? '✅ Activo' : '❌ Inactivo'}`);
  
  // Verificar servicios en PM2
  const ngrokServiceActive = isPM2ServiceActive(config.pm2.ngrokAppName);
  console.log(`Servicio ngrok en PM2: ${ngrokServiceActive ? '✅ Activo' : '❌ Inactivo'}`);
  
  // Verificar URL de ngrok
  const ngrokUrl = getNgrokUrl();
  console.log(`URL de ngrok: ${ngrokUrl ? '✅ ' + ngrokUrl : '❌ No disponible'}`);
  
  // Verificar si ngrok está accesible
  if (ngrokUrl) {
    try {
      const response = await axios.get(ngrokUrl, {
        timeout: 5000,
        validateStatus: () => true
      });
      console.log(`Accesibilidad de ngrok: ${response.status < 500 ? '✅ Accesible' : '❌ No accesible'} (código: ${response.status})`);
    } catch (error) {
      console.log(`Accesibilidad de ngrok: ❌ No accesible (${error.message})`);
    }
  }
  
  // Verificar puerto del servidor
  const serverPortInUse = await isPortInUse(config.server.port);
  console.log(`Puerto del servidor (${config.server.port}): ${serverPortInUse ? '✅ En uso' : '❌ No en uso'}`);
  
  // Verificar dominio No-IP
  try {
    const noipAccessible = await isDomainAccessible(config.noip.domain);
    console.log(`Dominio No-IP (${config.noip.domain}): ${noipAccessible ? '✅ Accesible' : '❌ No accesible'}`);
  } catch (error) {
    console.log(`Dominio No-IP (${config.noip.domain}): ❌ No accesible (${error.message})`);
  }
  
  console.log('\n=== Fin de la verificación ===');
}

// Ejecutar la función principal
main().catch(error => {
  console.error('Error al verificar el estado:', error.message);
}); 