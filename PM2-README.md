# Configuración de PM2 para Botito

Este documento describe cómo configurar PM2 para ejecutar Botito (backend y frontend) como servicios en segundo plano que inicien automáticamente con el sistema.

## Pasos Rápidos para Despliegue

1. Dale permisos de ejecución al script de despliegue:
   ```bash
   chmod +x deploy.sh
   ```

2. Ejecuta el script de despliegue:
   ```bash
   ./deploy.sh
   ```

3. Para asegurar que PM2 inicie con el sistema (podría requerir sudo):
   ```bash
   pm2 startup
   # Ejecuta el comando sugerido por PM2
   ```

## Estructura de Botito con PM2

La configuración de PM2 incluye:

- **botito-backend**: Ejecuta el servidor principal (server.js) que maneja:
  - API REST
  - Conexión con WhatsApp
  - Procesamiento de mensajes
  - Integración con Google Gemini

- **botito-frontend**: Ejecuta la aplicación Vue compilada que ofrece:
  - Panel de administración
  - Visualización de anuncios
  - Configuración del bot

## Archivos Principales

- `ecosystem.config.js`: Configuración de PM2 para ambos servicios
- `setup-pm2.sh`: Script para instalar PM2
- `deploy.sh`: Script para compilar e iniciar la aplicación completa
- `PM2-README.md`: Este documento

## Comandos Comunes para Gestionar Botito

### Monitoreo

- **Ver estado de servicios**:
  ```bash
  pm2 list
  ```

- **Monitoreo en tiempo real (CPU/memoria)**:
  ```bash
  pm2 monit
  ```

- **Ver logs**:
  ```bash
  pm2 logs                    # Todos los logs
  pm2 logs botito-backend     # Solo logs del backend (WhatsApp/Gemini)
  pm2 logs botito-frontend    # Solo logs del frontend (servidor Vue)
  ```

### Control de Servicios

- **Reiniciar ambos servicios**:
  ```bash
  pm2 restart ecosystem.config.js
  ```

- **Reiniciar solo el backend** (útil si cambias la lógica del bot):
  ```bash
  pm2 restart botito-backend
  ```

- **Reiniciar solo el frontend** (útil si cambias la interfaz):
  ```bash
  pm2 restart botito-frontend
  ```

- **Detener todos los servicios**:
  ```bash
  pm2 stop all
  ```

- **Iniciar todos los servicios**:
  ```bash
  pm2 start ecosystem.config.js
  ```

## Solución de Problemas

- **Si el bot de WhatsApp no responde**:
  ```bash
  pm2 logs botito-backend
  # Verifica errores y luego reinicia
  pm2 restart botito-backend
  ```

- **Si el frontend no funciona**:
  ```bash
  cd frontend
  npm run build  # Reconstruir el frontend
  cd ..
  pm2 restart botito-frontend
  ```

- **Reinicio completo en caso de problemas persistentes**:
  ```bash
  pm2 kill
  ./deploy.sh  # Reinstalar todo desde cero
  ```

## Actualización del Bot

Cuando modifiques el código:

1. Actualiza los archivos necesarios
2. Si modificaste el frontend, reconstruye:
   ```bash
   cd frontend && npm run build && cd ..
   ```
3. Reinicia el servicio afectado:
   ```bash
   pm2 restart botito-backend  # o botito-frontend
   ``` 