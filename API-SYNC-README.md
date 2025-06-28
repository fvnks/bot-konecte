# Integración de WhatsApp Bot con API Konecte

Este módulo permite la sincronización bidireccional entre un bot de WhatsApp basado en `whatsapp-web.js` y la API de Konecte.

## Características

- **Polling automático**: Consulta la API cada 3 segundos para obtener mensajes pendientes.
- **Envío de mensajes**: Envía automáticamente los mensajes pendientes a través de WhatsApp.
- **Notificación de entrega**: Notifica a la API cuando un mensaje ha sido enviado.
- **Recepción de mensajes**: Captura mensajes entrantes y los envía a la API.
- **Gestión de duplicados**: Evita procesar mensajes duplicados mediante un sistema de caché.

## Endpoints de la API

La integración utiliza los siguientes endpoints:

1. **Obtener mensajes pendientes**:
   - `GET https://konecte.vercel.app/api/whatsapp-bot/pending-messages`
   - Respuesta: `{ success: true, messages: [ { id, telefono, text } ] }`

2. **Notificar respuestas**:
   - `POST https://konecte.vercel.app/api/whatsapp-bot/receive-reply`
   - Body: `{ telefono: "+569XXXXXXXX", text: "mensaje" }`

## Instalación

El módulo ya está integrado en el proyecto principal. No se requiere instalación adicional.

## Uso

### Integración automática

El módulo se inicializa automáticamente cuando el bot de WhatsApp está listo:

```javascript
client.on('ready', () => {
  // Otras inicializaciones...
  
  // Inicializar la sincronización con la API de Konecte
  apiSync.initApiSync(client);
});
```

### Uso manual

También puedes usar el módulo de forma independiente:

```javascript
const { Client } = require('whatsapp-web.js');
const apiSync = require('./src/services/api-sync');

// Inicializar cliente de WhatsApp...
const client = new Client({ /* configuración */ });

// Después de inicializar y autenticar el cliente:
apiSync.initApiSync(client);

// Para detener el polling:
apiSync.stopPolling();
```

## Funcionamiento

1. **Polling de mensajes pendientes**:
   - Cada 3 segundos, el módulo consulta la API para obtener mensajes pendientes.
   - Por cada mensaje, verifica si ya fue procesado anteriormente.
   - Si es un mensaje nuevo, lo envía a través de WhatsApp y notifica a la API.

2. **Recepción de mensajes**:
   - El módulo escucha los mensajes entrantes de WhatsApp.
   - Cuando recibe un mensaje, lo notifica a la API.

## Formato de números de teléfono

El módulo maneja automáticamente la conversión entre formatos:

- **Formato de WhatsApp Web JS**: `5691234567@c.us`
- **Formato de la API**: `+5691234567`

## Manejo de errores

El módulo incluye manejo de errores para:
- Fallos de conexión con la API
- Errores al enviar mensajes por WhatsApp
- Problemas de formato en números de teléfono

## Ejemplo

Puedes encontrar un ejemplo de uso independiente en `examples/api-sync-example.js`.

## Depuración

El módulo registra información detallada en la consola para facilitar la depuración:
- Consultas a la API
- Mensajes enviados y recibidos
- Errores y excepciones

## Mantenimiento

Para modificar el comportamiento del módulo, edita el archivo `src/services/api-sync.js`.

Parámetros configurables:
- `API_BASE_URL`: URL base de la API
- `POLLING_INTERVAL`: Intervalo de consulta en milisegundos 