# Instrucciones para conectar el Bot de WhatsApp

## Problema resuelto
Se ha solucionado el problema de conexión del bot de WhatsApp. El error "Protocol error (Network.setUserAgentOverride): Session closed" se debía a problemas con la configuración de Puppeteer y la sesión de WhatsApp.

## Pasos para conectar el bot

1. El bot ya está en ejecución y ha generado un código QR que debes escanear.
2. Para ver el código QR, ejecuta el siguiente comando:
   ```
   tail -n 50 /home/rodrigod/botito/logs/botito.log
   ```

3. Abre WhatsApp en tu teléfono móvil:
   - Toca en los tres puntos (⋮) en la esquina superior derecha
   - Selecciona "Dispositivos vinculados"
   - Toca en "Vincular un dispositivo"
   - Escanea el código QR que aparece en la terminal

4. Una vez escaneado el código QR, verás un mensaje de "Cliente de WhatsApp autenticado" en los logs.

5. Si necesitas reiniciar el bot en el futuro, ejecuta:
   ```
   /home/rodrigod/botito/restart_whatsapp.sh
   ```

## Solución implementada

Se han realizado los siguientes cambios para solucionar el problema:

1. Simplificación de la configuración de Puppeteer para evitar problemas con el sandbox de Chrome.
2. Eliminación de la carpeta de sesión para forzar una nueva autenticación.
3. Creación de un script de reinicio para facilitar el mantenimiento.

## Notas adicionales

- Si el bot se desconecta, es posible que necesites escanear el código QR nuevamente.
- Los logs del bot se guardan en `/home/rodrigod/botito/logs/botito.log`.
- Si encuentras algún problema, revisa los logs para obtener más información.

## Comandos útiles

- Ver logs en tiempo real: `tail -f /home/rodrigod/botito/logs/botito.log`
- Reiniciar el bot: `/home/rodrigod/botito/restart_whatsapp.sh`
- Verificar si el bot está en ejecución: `ps aux | grep node` 