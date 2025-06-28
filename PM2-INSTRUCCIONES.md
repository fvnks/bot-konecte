# Instrucciones para gestionar Botito con PM2

PM2 es un gestor de procesos para aplicaciones Node.js que permite mantener aplicaciones en ejecución de forma permanente, reiniciarlas automáticamente en caso de fallo y gestionar los logs.

## Instalación y configuración inicial

1. Primero, corrige los permisos de los directorios de sesión:

```bash
./fix-permissions.sh
```

2. Para iniciar Botito con PM2:

```bash
./start-with-pm2.sh
```

3. Para configurar PM2 para que inicie automáticamente al arrancar el sistema:

```bash
./pm2-startup.sh
```

Sigue las instrucciones que aparecen en pantalla para completar la configuración.

## Comandos útiles de PM2

### Ver estado de las aplicaciones
```bash
pm2 status
```

### Ver logs en tiempo real
```bash
pm2 logs botito
```

### Ver solo los errores
```bash
pm2 logs botito --err
```

### Detener Botito
```bash
pm2 stop botito
```

### Reiniciar Botito
```bash
pm2 restart botito
```

### Eliminar Botito de PM2
```bash
pm2 delete botito
```

### Guardar la configuración actual
```bash
pm2 save
```

## Solución de problemas comunes

### Si Botito no mantiene la sesión de WhatsApp

1. Verifica los permisos de los directorios:
```bash
./fix-permissions.sh
```

2. Revisa los logs para identificar errores:
```bash
pm2 logs botito --err
```

3. Si ves errores relacionados con Puppeteer o el navegador, intenta reiniciar el bot:
```bash
pm2 restart botito
```

### Si PM2 no inicia automáticamente después de reiniciar

1. Asegúrate de haber ejecutado correctamente el comando generado por `pm2 startup`
2. Guarda la configuración actual:
```bash
pm2 save
```

## Ventajas de usar PM2

- Mantiene el bot en ejecución permanentemente
- Reinicia automáticamente en caso de fallo
- Gestiona los logs de forma eficiente
- Permite monitorizar el rendimiento
- Facilita la gestión de múltiples aplicaciones 