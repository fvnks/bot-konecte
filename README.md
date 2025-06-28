# Botito WhatsApp Bot

Bot de WhatsApp para integración con Konecte.

## Configuración del Entorno

1. Instalar dependencias:
```bash
# Instalar dependencias de Node.js
npm install

# Instalar dependencias del sistema para Puppeteer y Cloudflare
sudo ./scripts/cloudflare/setup-cloudflare.sh
```

2. Configurar el archivo `.env` con las variables necesarias:
```
PORT=3001
KONECTE_WEBHOOK_URL=https://bahamas-we-masters-spending.trycloudflare.com/api/webhooks/konecte-incoming
```

## Iniciar el Bot

### Usando PM2

Para iniciar todos los servicios con PM2:

```bash
node scripts/utils/start-all.js
```

Este script inicia:
- El servidor principal (botito-server)
- El túnel de Cloudflare (botito-cloudflare-tunnel)
- El actualizador de webhook (botito-webhook-updater)

### Usando Systemd

El túnel de Cloudflare también está configurado como un servicio systemd:

```bash
# Iniciar el servicio
sudo systemctl start cloudflare-tunnel.service

# Verificar el estado
sudo systemctl status cloudflare-tunnel.service

# Detener el servicio
sudo systemctl stop cloudflare-tunnel.service
```

## Verificar Funcionamiento

Para verificar que el webhook está funcionando correctamente:

```bash
# Verificar acceso al webhook
curl -X GET https://bahamas-we-masters-spending.trycloudflare.com/api/webhooks/konecte-incoming

# Enviar un mensaje de prueba
curl -X POST http://localhost:3001/api/webhooks/konecte-incoming \
  -H "Content-Type: application/json" \
  -d '{"targetUserWhatsAppNumber": "+56XXXXXXXXX", "messageText": "Mensaje de prueba"}'
```

## Estructura del Proyecto

- `server.js`: Punto de entrada principal
- `scripts/`: Scripts de utilidad
  - `cloudflare/`: Configuración del túnel de Cloudflare
  - `utils/`: Utilidades (start-all.js, check-status.js, etc.)
  - `webhook/`: Scripts para manejar webhooks
- `src/`: Código fuente principal
  - `controllers/`: Controladores de la API
  - `services/`: Servicios del bot
  - `models/`: Modelos de datos

## Notas Importantes

- El bot usa Cloudflare Tunnel para exponer el servidor local a Internet
- La URL del webhook es: `https://bahamas-we-masters-spending.trycloudflare.com/api/webhooks/konecte-incoming`
- Para cambiar la URL del webhook, editar el archivo `scripts/webhook/update-webhook-url.js`
- Si tienes problemas con Puppeteer, ejecuta el script `sudo ./scripts/cloudflare/setup-cloudflare.sh` para instalar todas las dependencias necesarias

## Solución de Problemas

### Error: Failed to launch the browser process

Si ves este error, es porque faltan dependencias del sistema para Puppeteer. Ejecuta:

```bash
sudo ./scripts/cloudflare/setup-cloudflare.sh
```

### Error: Cliente de WhatsApp no disponible

Este error ocurre cuando el cliente de WhatsApp no se ha inicializado correctamente. Reinicia el servidor:

```bash
pm2 restart botito-server
```

O ejecuta el servidor en modo desarrollo para ver los errores:

```bash
npm run dev
``` 