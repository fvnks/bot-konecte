/**
 * Configuración para la integración de ngrok con No-IP
 */

module.exports = {
  // Configuración de ngrok
 ngrok: {
  port: process.env.PORT || 3001,
  authToken: '22jkPoZJuBQYHLBaWnYx3WXxnWa_3Kj4MA7GA2wP2VP8kYBKg', // Tu token aquí
  region: 'us',
  protocol: 'http'
},
  
  // Configuración de No-IP
  noip: {
    domain: 'rodriservcl.ddns.net', // Tu dominio de No-IP
    updateInterval: 5 * 60 * 1000, // 5 minutos en milisegundos
  },
  
  // Configuración del servidor
  server: {
    port: process.env.PORT || 3001,
    webhookPath: '/api/webhooks'
  },
  
  // Configuración de PM2
  pm2: {
    ngrokAppName: 'botito-ngrok',
    proxyAppName: 'botito-proxy',
    updaterAppName: 'botito-updater'
  },
  
  // Rutas de archivos
  paths: {
    envFile: require('path').join(__dirname, '../../../.env'),
    logDir: require('path').join(__dirname, '../../../logs'),
    ngrokLogFile: require('path').join(__dirname, '../../../logs/ngrok.log'),
    lastUrlFile: require('path').join(__dirname, '../../../logs/last_ngrok_url.txt')
  }
}; 
