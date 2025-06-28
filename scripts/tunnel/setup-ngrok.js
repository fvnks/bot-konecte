#!/usr/bin/env node

/**
 * Script para configurar ngrok con un subdominio fijo
 * Este script instala y configura ngrok para proporcionar una URL fija
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

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

// Función para verificar si ngrok está instalado
function isNgrokInstalled() {
  try {
    execSync('ngrok --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Función para crear un archivo de configuración de ngrok
function createNgrokConfig(authToken, subdomain) {
  const configPath = path.join(os.homedir(), '.ngrok2', 'ngrok.yml');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const config = `
authtoken: ${authToken}
version: 2
tunnels:
  botito:
    proto: http
    addr: 3001
    subdomain: ${subdomain}
`;
  
  fs.writeFileSync(configPath, config);
  console.log(`Archivo de configuración de ngrok creado en: ${configPath}`);
}

// Función para actualizar el archivo .env con la URL de ngrok
function updateEnvFile(subdomain) {
  const envPath = path.join(__dirname, '../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('No se encontró el archivo .env');
    return;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Actualizar o agregar la variable KONECTE_WEBHOOK_URL
  const ngrokUrl = `https://${subdomain}.ngrok.io`;
  
  if (envContent.includes('KONECTE_WEBHOOK_URL=')) {
    envContent = envContent.replace(/KONECTE_WEBHOOK_URL=.*/g, `KONECTE_WEBHOOK_URL=${ngrokUrl}`);
  } else {
    envContent += `\nKONECTE_WEBHOOK_URL=${ngrokUrl}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(`Archivo .env actualizado con la URL de ngrok: ${ngrokUrl}`);
}

// Función para crear un script de inicio de ngrok
function createStartScript(subdomain) {
  const scriptPath = path.join(__dirname, 'start-ngrok.js');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Script para iniciar ngrok con un subdominio fijo
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Iniciar ngrok
console.log('Iniciando ngrok...');

const ngrok = spawn('ngrok', ['start', 'botito'], {
  detached: true,
  stdio: 'inherit'
});

// No esperar a que el proceso termine
ngrok.unref();

console.log('Ngrok iniciado con el subdominio: ${subdomain}');
console.log('URL del webhook: https://${subdomain}.ngrok.io');
`;
  
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  console.log(`Script de inicio de ngrok creado en: ${scriptPath}`);
}

// Función para crear un script de actualización de ngrok
function createUpdateScript() {
  const scriptPath = path.join(__dirname, 'update-ngrok-url.js');
  
  const scriptContent = `#!/usr/bin/env node

/**
 * Script para actualizar la URL de ngrok en el archivo .env
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Obtener la URL de ngrok
async function getNgrokUrl() {
  try {
    const response = await axios.get('http://localhost:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    
    for (const tunnel of tunnels) {
      if (tunnel.proto === 'https') {
        return tunnel.public_url;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener la URL de ngrok:', error.message);
    return null;
  }
}

// Actualizar el archivo .env
async function updateEnvFile() {
  const envPath = path.join(__dirname, '../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('No se encontró el archivo .env');
    return;
  }
  
  const ngrokUrl = await getNgrokUrl();
  
  if (!ngrokUrl) {
    console.error('No se pudo obtener la URL de ngrok');
    return;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Actualizar o agregar la variable KONECTE_WEBHOOK_URL
  if (envContent.includes('KONECTE_WEBHOOK_URL=')) {
    envContent = envContent.replace(/KONECTE_WEBHOOK_URL=.*/g, \`KONECTE_WEBHOOK_URL=\${ngrokUrl}\`);
  } else {
    envContent += \`\\nKONECTE_WEBHOOK_URL=\${ngrokUrl}\`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log(\`Archivo .env actualizado con la URL de ngrok: \${ngrokUrl}\`);
}

// Ejecutar la función principal
updateEnvFile();
`;
  
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  console.log(`Script de actualización de ngrok creado en: ${scriptPath}`);
}

// Función principal
async function main() {
  console.log('=== Configuración de ngrok ===');
  
  // Verificar si ngrok está instalado
  if (!isNgrokInstalled()) {
    console.log('Ngrok no está instalado. Instalándolo...');
    runCommand('npm install -g ngrok');
  }
  
  // Solicitar token de autenticación y subdominio
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\nPara configurar ngrok con un subdominio fijo, necesitas:');
  console.log('1. Una cuenta en ngrok.com (es gratis)');
  console.log('2. Un token de autenticación (disponible en https://dashboard.ngrok.com/get-started/your-authtoken)');
  console.log('3. Un plan de pago para usar subdominios personalizados (o usar el plan gratuito con subdominios aleatorios)');
  
  rl.question('\nIngresa tu token de autenticación de ngrok: ', (authToken) => {
    rl.question('Ingresa el subdominio que deseas usar (ej: konecte-bot): ', (subdomain) => {
      rl.close();
      
      // Crear archivo de configuración de ngrok
      createNgrokConfig(authToken, subdomain);
      
      // Actualizar el archivo .env
      updateEnvFile(subdomain);
      
      // Crear scripts de inicio y actualización
      createStartScript(subdomain);
      createUpdateScript();
      
      // Actualizar package.json
      console.log('\nActualizando package.json...');
      const packagePath = path.join(__dirname, '../../package.json');
      
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts['ngrok'] = 'node scripts/tunnel/start-ngrok.js';
        packageJson.scripts['dev:ngrok'] = 'node scripts/tunnel/start-ngrok.js & nodemon --config nodemon.json server.js';
        packageJson.scripts['update:ngrok'] = 'node scripts/tunnel/update-ngrok-url.js';
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('Package.json actualizado con los nuevos scripts');
      }
      
      console.log('\n=== Configuración completada ===');
      console.log(`Ahora puedes iniciar ngrok con: npm run ngrok`);
      console.log(`O iniciar ngrok junto con el servidor: npm run dev:ngrok`);
      console.log(`La URL de tu webhook será: https://${subdomain}.ngrok.io`);
      console.log('Esta URL es fija y no cambiará aunque reinicies ngrok o tu IP cambie.');
      console.log('Configura esta URL en konecte.vercel.app como webhook para tu bot.');
    });
  });
}

// Ejecutar la función principal
main(); 