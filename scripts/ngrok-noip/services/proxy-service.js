/**
 * Servicio para manejar el proxy entre ngrok y No-IP
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const config = require('../config/settings');
const ngrokService = require('./ngrok-service');

class ProxyService {
  constructor() {
    this.app = express();
    this.server = null;
    this.targetUrl = null;
  }
  
  /**
   * Inicia el servidor proxy
   */
  async start() {
    try {
      // Obtener la URL de ngrok
      this.targetUrl = await this.getTargetUrl();
      
      if (!this.targetUrl) {
        console.error('No se pudo obtener la URL de ngrok para el proxy');
        return false;
      }
      
      // Configurar el proxy
      this.setupProxy();
      
      // Iniciar el servidor
      const port = config.server.port;
      this.server = this.app.listen(port, () => {
        console.log(`Servidor proxy iniciado en el puerto ${port}`);
        console.log(`Redirigiendo ${config.noip.domain} a ${this.targetUrl}`);
      });
      
      return true;
    } catch (error) {
      console.error('Error al iniciar el servidor proxy:', error.message);
      return false;
    }
  }
  
  /**
   * Configura el proxy
   */
  setupProxy() {
    // Middleware para registrar solicitudes
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
    
    // Configurar el proxy
    const proxyOptions = {
      target: this.targetUrl,
      changeOrigin: true,
      pathRewrite: {
        [`^/`]: '/',
      },
      onProxyReq: (proxyReq, req, res) => {
        // Modificar la solicitud si es necesario
      },
      onProxyRes: (proxyRes, req, res) => {
        // Modificar la respuesta si es necesario
      },
      onError: (err, req, res) => {
        console.error('Error en el proxy:', err);
        res.status(500).send('Error en el proxy');
      }
    };
    
    // Aplicar el middleware de proxy a todas las rutas
    this.app.use('/', createProxyMiddleware(proxyOptions));
  }
  
  /**
   * Actualiza la URL de destino del proxy
   */
  async updateTargetUrl() {
    const newUrl = await this.getTargetUrl();
    
    if (newUrl && newUrl !== this.targetUrl) {
      console.log(`Actualizando URL del proxy: ${this.targetUrl} -> ${newUrl}`);
      this.targetUrl = newUrl;
      
      // Reiniciar el servidor para aplicar la nueva URL
      this.stop();
      await this.start();
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Obtiene la URL de destino para el proxy
   */
  async getTargetUrl() {
    // Intentar obtener la URL desde ngrokService
    let url = ngrokService.getUrl();
    
    // Si no está disponible, intentar obtenerla desde el archivo
    if (!url && fs.existsSync(config.paths.lastUrlFile)) {
      url = fs.readFileSync(config.paths.lastUrlFile, 'utf8').trim();
    }
    
    // Si aún no está disponible, iniciar ngrok
    if (!url) {
      try {
        url = await ngrokService.start();
      } catch (error) {
        console.error('Error al iniciar ngrok para obtener URL:', error.message);
      }
    }
    
    return url;
  }
  
  /**
   * Detiene el servidor proxy
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('Servidor proxy detenido');
    }
  }
}

module.exports = new ProxyService(); 