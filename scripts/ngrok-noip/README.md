# Integración ngrok-noip

Esta integración permite mantener una URL fija (usando No-IP) para acceder a un servidor local a través de ngrok. Es ideal para situaciones donde necesitas que un servicio externo (como konecte.vercel.app) se comunique con tu servidor local sin preocuparte por los cambios en la URL de ngrok.

## Características

- Túnel ngrok para exponer tu servidor local a Internet
- Proxy para redirigir el tráfico de tu dominio No-IP a la URL de ngrok
- Actualizador automático para mantener la configuración sincronizada
- Integración con systemd para ejecutar los servicios en segundo plano

## Requisitos

- Node.js (v14 o superior)
- npm
- Una cuenta en ngrok.com (gratuita)
- Un dominio configurado en No-IP (ej: konecte.ddns.net)
- ngrok instalado globalmente (`sudo npm install -g ngrok`)

## Instalación

1. Instala las dependencias:

```bash
cd scripts/ngrok-noip
npm install
```

2. Configura el archivo `config/settings.js` según tus necesidades:

```javascript
module.exports = {
  ngrok: {
    port: 3001, // Puerto de tu servidor local
    authToken: 'tu_token_de_ngrok', // Opcional, pero recomendado
    region: 'us'
  },
  noip: {
    domain: 'konecte.ddns.net', // Tu dominio de No-IP
    updateInterval: 5 * 60 * 1000 // 5 minutos
  },
  // ...
};
```

3. Instala el servicio systemd para ngrok:

```bash
sudo ./scripts/ngrok-noip/install-service.sh
```

## Uso

Una vez configurado, los servicios se ejecutarán automáticamente en segundo plano y se reiniciarán automáticamente si el sistema se reinicia.

Para verificar el estado del servicio:

```bash
sudo systemctl status ngrok.service
```

Para ver los logs:

```bash
sudo journalctl -u ngrok.service
```

## Cómo funciona

1. **ngrok**: Crea un túnel para exponer tu servidor local a Internet con una URL pública.
2. **Proxy**: Redirige el tráfico que llega a tu dominio No-IP hacia la URL de ngrok.
3. **Actualizador**: Mantiene actualizada la configuración cuando cambia la URL de ngrok.

## Configuración en konecte.vercel.app

Configura la URL del webhook en konecte.vercel.app para que apunte a tu dominio de No-IP (ej: https://konecte.ddns.net). De esta forma, aunque la URL de ngrok cambie, konecte.vercel.app siempre podrá comunicarse con tu bot.

## Solución de problemas

Si encuentras algún problema, verifica los logs:

```bash
sudo journalctl -u ngrok.service
```

Para reiniciar el servicio:

```bash
sudo systemctl restart ngrok.service
```

## Opciones adicionales

### Usando PM2 (alternativa)

Si prefieres usar PM2 en lugar de systemd, puedes configurarlo así:

```bash
cd scripts/ngrok-noip
npm run setup
```

Esto configurará PM2 para iniciar los servicios automáticamente al arrancar el sistema. 