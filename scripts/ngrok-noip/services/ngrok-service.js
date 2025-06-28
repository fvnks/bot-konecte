/**
 * Servicio para manejar ngrok
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config/settings');
const axios = require('axios');

class NgrokService {
  constructor() {
    this.url = null;
    this.isConnected = false;
    this.ngrokProcess = null;
    
    // Asegurar que el directorio de logs exista
    if (!fs.existsSync(config.paths.logDir)) {
      fs.mkdirSync(config.paths.logDir, { recursive: true });
    }
  }
  
  /**
   * Inicia el túnel de ngrok
   */
  async start() {
    try {
      console.log('Iniciando túnel de ngrok...');
      
      // Matar cualquier proceso de ngrok existente
      await this.killNgrokProcesses();
      
      // Iniciar ngrok mediante línea de comandos
      await this.startNgrokProcess();
      
      // Obtener la URL de ngrok
      this.url = await this.fetchNgrokUrl();
      this.isConnected = true;
      
      console.log(`Túnel de ngrok iniciado: ${this.url}`);
      
      // Guardar la URL en un archivo
      this.saveUrl();
      
      return this.url;
    } catch (error) {
      console.error('Error al iniciar ngrok:', error.message);
      throw error;
    }
  }
  
  /**
   * Inicia el proceso de ngrok
   */
  async startNgrokProcess() {
    return new Promise((resolve, reject) => {
      console.log(`Iniciando proceso de ngrok para el puerto ${config.ngrok.port}...`);
      
      // Construir el comando de ngrok
      let ngrokCommand = `ngrok ${config.ngrok.protocol} ${config.ngrok.port}`;
      
      if (config.ngrok.region) {
        ngrokCommand += ` --region=${config.ngrok.region}`;
      }
      
      if (config.ngrok.authToken) {
        ngrokCommand += ` --authtoken=${config.ngrok.authToken}`;
      }
      
      console.log(`Ejecutando: ${ngrokCommand}`);
      
      // Iniciar el proceso de ngrok en segundo plano
      this.ngrokProcess = spawn('ngrok', [
        config.ngrok.protocol,
        config.ngrok.port.toString(),
        config.ngrok.region ? `--region=${config.ngrok.region}` : '',
        config.ngrok.authToken ? `--authtoken=${config.ngrok.authToken}` : ''
      ].filter(Boolean), {
        detached: true,
        stdio: ['ignore', 
          fs.openSync(config.paths.ngrokLogFile, 'a'),
          fs.openSync(config.paths.ngrokLogFile, 'a')
        ]
      });
      
      // Desasociar el proceso para que continúe ejecutándose en segundo plano
      this.ngrokProcess.unref();
      
      // Esperar un momento para que ngrok se inicie
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }
  
  /**
   * Obtiene la URL de ngrok desde la API local
   */
  async fetchNgrokUrl() {
    try {
      // Esperar un poco para asegurarnos de que ngrok esté listo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Intentar obtener la URL varias veces
      for (let i = 0; i < 5; i++) {
        try {
          const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
          const tunnels = response.data.tunnels;
          
          if (tunnels && tunnels.length > 0) {
            // Buscar un túnel con protocolo https
            const httpsTunnel = tunnels.find(t => t.proto === 'https');
            return httpsTunnel ? httpsTunnel.public_url : tunnels[0].public_url;
          }
        } catch (error) {
          console.log(`Intento ${i+1}: No se pudo obtener la URL de ngrok, reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      throw new Error('No se pudo obtener la URL de ngrok después de varios intentos');
    } catch (error) {
      throw new Error(`Error al obtener la URL de ngrok: ${error.message}`);
    }
  }
  
  /**
   * Mata cualquier proceso de ngrok existente
   */
  async killNgrokProcesses() {
    return new Promise((resolve, reject) => {
      console.log('Matando procesos de ngrok existentes...');
      
      // En Linux/Mac
      exec('pkill -f ngrok || true', (error) => {
        if (error && error.code !== 1) {
          console.warn('Error al matar procesos de ngrok:', error.message);
        }
        
        // Dar tiempo para que los procesos terminen
        setTimeout(resolve, 1000);
      });
    });
  }
  
  /**
   * Detiene el túnel de ngrok
   */
  async stop() {
    try {
      if (this.ngrokProcess) {
        this.ngrokProcess.kill();
        this.ngrokProcess = null;
      }
      
      this.isConnected = false;
      console.log('Túnel de ngrok detenido');
      
      // Matar cualquier proceso de ngrok restante
      await this.killNgrokProcesses();
    } catch (error) {
      console.error('Error al detener ngrok:', error.message);
    }
  }
  
  /**
   * Guarda la URL de ngrok en un archivo
   */
  saveUrl() {
    if (this.url) {
      fs.writeFileSync(config.paths.lastUrlFile, this.url);
      console.log(`URL de ngrok guardada en ${config.paths.lastUrlFile}`);
    }
  }
  
  /**
   * Obtiene la URL de ngrok
   */
  getUrl() {
    return this.url;
  }
  
  /**
   * Verifica si ngrok está conectado
   */
  isActive() {
    return this.isConnected;
  }
}

module.exports = new NgrokService(); 