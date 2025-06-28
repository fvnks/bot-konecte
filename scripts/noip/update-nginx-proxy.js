#!/usr/bin/env node

/**
 * Script para actualizar el proxy de Nginx cuando cambie la URL de serveo
 * Este script verifica si la URL de serveo ha cambiado y actualiza la configuración de Nginx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const LOGS_DIR = path.join(__dirname, '../../logs');
const TUNNEL_LOG_PATH = path.join(LOGS_DIR, 'tunnel.log');
const NGINX_CONFIG_PATH = '/etc/nginx/sites-available/konecte.ddns.net';
const LAST_URL_PATH = path.join(__dirname, '../../logs/last_serveo_url.txt');

// Función para obtener la URL actual de serveo
function getCurrentServeoUrl() {
  try {
    if (!fs.existsSync(TUNNEL_LOG_PATH)) {
      console.error('No se encontró el archivo de log del túnel.');
      return null;
    }
    
    const logContent = fs.readFileSync(TUNNEL_LOG_PATH, 'utf8');
    const matches = logContent.match(/Forwarding HTTP traffic from (https:\/\/[^\s]+)/g);
    
    if (!matches || matches.length === 0) {
      console.error('No se encontró ninguna URL de serveo en el log.');
      return null;
    }
    
    // Obtener la última URL (la más reciente)
    const lastMatch = matches[matches.length - 1];
    return lastMatch.replace('Forwarding HTTP traffic from ', '');
  } catch (error) {
    console.error('Error al leer el log del túnel:', error.message);
    return null;
  }
}

// Función para obtener la última URL guardada
function getLastSavedUrl() {
  try {
    if (!fs.existsSync(LAST_URL_PATH)) {
      return null;
    }
    
    return fs.readFileSync(LAST_URL_PATH, 'utf8').trim();
  } catch (error) {
    console.error('Error al leer la última URL guardada:', error.message);
    return null;
  }
}

// Función para guardar la URL actual
function saveCurrentUrl(url) {
  try {
    // Asegurarse de que el directorio de logs exista
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    fs.writeFileSync(LAST_URL_PATH, url);
    console.log('URL guardada correctamente.');
  } catch (error) {
    console.error('Error al guardar la URL actual:', error.message);
  }
}

// Función para actualizar la configuración de Nginx
function updateNginxConfig(serveoUrl) {
  try {
    // Verificar si el archivo de configuración de Nginx existe
    if (!fs.existsSync(NGINX_CONFIG_PATH)) {
      console.error('No se encontró el archivo de configuración de Nginx. Ejecuta primero setup-nginx-proxy.sh.');
      return false;
    }
    
    // Leer la configuración actual
    let nginxConfig = fs.readFileSync(NGINX_CONFIG_PATH, 'utf8');
    
    // Actualizar la URL de serveo
    nginxConfig = nginxConfig.replace(/proxy_pass https:\/\/[^;]+;/g, `proxy_pass ${serveoUrl};`);
    
    // Guardar la nueva configuración
    fs.writeFileSync(NGINX_CONFIG_PATH, nginxConfig);
    
    // Verificar la configuración de Nginx
    try {
      execSync('sudo nginx -t');
      
      // Reiniciar Nginx
      execSync('sudo systemctl restart nginx');
      
      console.log('Configuración de Nginx actualizada y reiniciada correctamente.');
      return true;
    } catch (error) {
      console.error('Error al verificar o reiniciar Nginx:', error.message);
      return false;
    }
  } catch (error) {
    console.error('Error al actualizar la configuración de Nginx:', error.message);
    return false;
  }
}

// Función principal
function main() {
  // Obtener la URL actual de serveo
  const currentUrl = getCurrentServeoUrl();
  if (!currentUrl) {
    console.error('No se pudo obtener la URL actual de serveo.');
    process.exit(1);
  }
  
  console.log('URL actual de serveo:', currentUrl);
  
  // Obtener la última URL guardada
  const lastUrl = getLastSavedUrl();
  console.log('Última URL guardada:', lastUrl || 'Ninguna');
  
  // Verificar si la URL ha cambiado
  if (currentUrl === lastUrl) {
    console.log('La URL de serveo no ha cambiado. No es necesario actualizar la configuración de Nginx.');
    process.exit(0);
  }
  
  // Actualizar la configuración de Nginx
  const updated = updateNginxConfig(currentUrl);
  
  // Guardar la URL actual si la actualización fue exitosa
  if (updated) {
    saveCurrentUrl(currentUrl);
    console.log('Proxy de Nginx actualizado correctamente para redirigir konecte.ddns.net a', currentUrl);
  } else {
    console.error('No se pudo actualizar el proxy de Nginx.');
    process.exit(1);
  }
}

// Ejecutar la función principal
main(); 