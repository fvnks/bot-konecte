#!/usr/bin/env node

/**
 * Script para configurar el webhook con No-IP
 * Este script actualiza el archivo .env para usar konecte.ddns.net como URL del webhook
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const ENV_FILE_PATH = path.join(__dirname, '../../.env');
const NOIP_DOMAIN = 'konecte.ddns.net';

// Función para verificar si No-IP está en ejecución
function checkNoipRunning() {
  try {
    const output = execSync('pgrep -x "noip2"').toString().trim();
    return output.length > 0;
  } catch (error) {
    return false;
  }
}

// Función para actualizar el archivo .env
function updateEnvFile() {
  try {
    let envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    
    // Verificar si ya existe la variable KONECTE_WEBHOOK_URL
    if (envContent.includes('KONECTE_WEBHOOK_URL=')) {
      // Reemplazar el valor existente
      envContent = envContent.replace(/KONECTE_WEBHOOK_URL=.*/g, `KONECTE_WEBHOOK_URL=https://${NOIP_DOMAIN}`);
    } else {
      // Agregar la variable al final del archivo
      envContent += `\nKONECTE_WEBHOOK_URL=https://${NOIP_DOMAIN}`;
    }
    
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    console.log(`Archivo .env actualizado con la URL del webhook: https://${NOIP_DOMAIN}`);
    return true;
  } catch (error) {
    console.error('Error al actualizar el archivo .env:', error.message);
    return false;
  }
}

// Función para obtener la IP pública
function getPublicIp() {
  try {
    const output = execSync('curl -s https://api.ipify.org').toString().trim();
    return output;
  } catch (error) {
    console.error('Error al obtener la IP pública:', error.message);
    return null;
  }
}

// Función principal
function main() {
  // Verificar si No-IP está en ejecución
  if (!checkNoipRunning()) {
    console.warn('El servicio de No-IP no está en ejecución. Iniciándolo...');
    try {
      execSync('sudo noip2');
      console.log('Servicio de No-IP iniciado correctamente.');
    } catch (error) {
      console.error('Error al iniciar el servicio de No-IP:', error.message);
      console.error('Por favor, ejecuta manualmente: sudo noip2');
    }
  } else {
    console.log('El servicio de No-IP está en ejecución.');
  }
  
  // Obtener la IP pública
  const publicIp = getPublicIp();
  if (publicIp) {
    console.log(`IP pública actual: ${publicIp}`);
  } else {
    console.warn('No se pudo obtener la IP pública.');
  }
  
  // Actualizar el archivo .env
  const updated = updateEnvFile();
  if (!updated) {
    console.error('No se pudo actualizar el archivo .env.');
    process.exit(1);
  }
  
  console.log(`Configuración completada. ${NOIP_DOMAIN} ahora apunta a la IP pública del servidor.`);
  console.log('Asegúrate de que tu router redireccione el puerto 80/443 al puerto 3001 de este servidor.');
}

// Ejecutar la función principal
main(); 