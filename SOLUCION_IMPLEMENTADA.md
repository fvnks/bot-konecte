# Solución al problema de conexión del Bot de WhatsApp

## Problema original
El bot de WhatsApp presentaba un error al inicializar el cliente:
```
Error al inicializar el cliente de WhatsApp: Error: Protocol error (Network.setUserAgentOverride): Session closed. Most likely the page has been closed.
```

## Diagnóstico
El problema se debía a una configuración compleja de Puppeteer que no era compatible con el entorno actual. La sesión de WhatsApp se cerraba prematuramente debido a problemas con el sandbox de Chrome y la configuración de Puppeteer.

## Solución implementada

### 1. Simplificación de la configuración de Puppeteer
Se modificó la configuración del cliente de WhatsApp Web JS para usar una configuración más simple y robusta:

```javascript
client = new Client({
    authStrategy: new LocalAuth({
        dataPath: sessionDir,
        clientId: 'botito-client'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions'
        ]
    },
    restartOnAuthFail: true
});
```

### 2. Eliminación de la sesión anterior
Se eliminó la carpeta de sesión para forzar una nueva autenticación:
```bash
rm -rf /home/rodrigod/botito/wwjs_auth_info
```

### 3. Creación de un script de reinicio
Se creó un script (`restart_whatsapp.sh`) para facilitar el reinicio del servicio:
```bash
#!/bin/bash
echo "Reiniciando el servicio de WhatsApp Bot..."
# Verificar si el servicio está corriendo con PM2
pm2_status=$(pm2 list | grep botito)
if [ $? -eq 0 ]; then
    echo "Deteniendo el servicio con PM2..."
    pm2 stop botito
    sleep 2
    pm2 restart botito
    echo "Servicio reiniciado correctamente con PM2."
else
    # Si no está usando PM2, intentar con procesos directos
    echo "Buscando procesos de Node.js relacionados con el bot..."
    pid=$(ps aux | grep "[n]ode server.js" | awk '{print $2}')
    
    if [ -n "$pid" ]; then
        echo "Enviando señal SIGINT al proceso $pid para cierre elegante..."
        kill -SIGINT $pid
        sleep 5
        
        # Verificar si el proceso sigue vivo
        if ps -p $pid > /dev/null; then
            echo "El proceso no se cerró correctamente. Forzando cierre..."
            kill -9 $pid
        fi
    else
        echo "No se encontró un proceso de bot en ejecución."
    fi
    
    echo "Iniciando el servicio..."
    cd /home/rodrigod/botito
    nohup node server.js > logs/botito.log 2>&1 &
    echo "Servicio iniciado en segundo plano."
fi
echo "Proceso de reinicio completado."
```

## Resultado
El bot ahora se inicia correctamente y genera un código QR para escanear. Una vez escaneado el código QR, el bot se conectará a WhatsApp y estará listo para usar.

## Recomendaciones para el futuro

1. **Mantenimiento regular**: Reiniciar el bot periódicamente para evitar problemas de memoria o conexión.

2. **Monitoreo de logs**: Revisar regularmente los logs para detectar posibles problemas:
   ```
   tail -f /home/rodrigod/botito/logs/botito.log
   ```

3. **Actualización de dependencias**: Considerar actualizar las dependencias del proyecto, especialmente `whatsapp-web.js` y `puppeteer`, cuando estén disponibles versiones más estables.

4. **Backup de sesión**: Hacer copias de seguridad de la carpeta de sesión (`wwjs_auth_info`) después de una autenticación exitosa para evitar tener que escanear el código QR nuevamente en caso de problemas.

5. **Uso de PM2**: Considerar el uso de PM2 para gestionar el proceso del bot, lo que facilitaría el reinicio automático en caso de fallos:
   ```
   pm2 start server.js --name botito
   ``` 