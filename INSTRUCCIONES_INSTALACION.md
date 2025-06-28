# Instrucciones de Instalación y Puesta en Marcha de Botito

Este documento detalla los pasos para instalar, configurar y ejecutar el proyecto Botito en un nuevo servidor Linux (probado en Ubuntu/Debian).

## 1. Prerrequisitos

Asegúrate de tener los siguientes componentes instalados en tu sistema:

*   **Node.js**: Se recomienda la versión LTS (18.x o superior).
*   **npm**: Generalmente se instala junto con Node.js.
*   **PM2**: Un gestor de procesos para aplicaciones Node.js. Instálalo globalmente:
    ```bash
    sudo npm install pm2 -g
    ```
*   **Git**: Para clonar el repositorio.
*   **Nginx**: Como proxy inverso.
    ```bash
    sudo apt update
    sudo apt install nginx
    ```
*   **Cloudflared**: El cliente para el túnel de Cloudflare.

## 2. Clonar el Repositorio

Clona el código fuente de Botito en el directorio de tu elección.

```bash
# Reemplaza <URL_DEL_REPOSITORIO> con la URL real de tu repo Git
git clone <URL_DEL_REPOSITORIO>
cd botito # O el nombre del directorio del proyecto
```

## 3. Instalación de Dependencias

Navega al directorio del proyecto e instala las dependencias de Node.js.

```bash
cd proyectos-nodejs/botito
npm install
```

## 4. Configuración del Túnel de Cloudflare

El túnel de Cloudflare expondrá tu bot local a Internet de forma segura para que pueda recibir webhooks de servicios externos como Konecte.

### 4.1. Instalar `cloudflared`

```bash
# Descarga el paquete .deb más reciente
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Instala el paquete
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 4.2. Autenticar `cloudflared`

Ejecuta este comando y sigue las instrucciones en tu navegador para autorizar el demonio en tu cuenta de Cloudflare.

```bash
cloudflared tunnel login
```

### 4.3. Crear un Túnel

```bash
# Elige un nombre para tu túnel (ej. "botito-tunnel")
cloudflared tunnel create botito-tunnel
```
Este comando generará un archivo de credenciales (`<TUNNEL_UUID>.json`) en `~/.cloudflared/`. Guarda el **UUID** del túnel, lo necesitarás.

### 4.4. Configurar el Túnel

Crea un archivo de configuración para tu túnel en `~/.cloudflared/config.yml`.

```bash
# Abre el archivo para editarlo
nano ~/.cloudflared/config.yml
```

Añade el siguiente contenido, reemplazando `<TUNNEL_UUID>` por el UUID que obtuviste y ajustando el puerto si es necesario (el bot corre en el puerto 3000 por defecto).

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json # Ajusta la ruta si no ejecutas como root
ingress:
  - hostname: tu-subdominio.tusitio.com # Elige el subdominio público que apuntará al bot
    service: http://localhost:3000
  - service: http_status:404 # Ruta por defecto para evitar accesos no deseados
```

### 4.5. Configurar DNS en Cloudflare

Crea un registro `CNAME` en el panel de DNS de Cloudflare para que tu subdominio público apunte a tu túnel.

*   **Tipo**: `CNAME`
*   **Nombre**: `tu-subdominio` (el que elegiste en `config.yml`)
*   **Contenido**: `<TUNNEL_UUID>.cfargotunnel.com`
*   **Proxy**: Activado (Nube naranja)

### 4.6. Ejecutar el Túnel como un Servicio

Para que el túnel se ejecute de forma persistente, crea un servicio de systemd.

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Verifica que el túnel esté activo:
```bash
cloudflared tunnel list
```
Deberías ver tu túnel con el estado `HEALTHY`. La URL pública de tu bot será `https://tu-subdominio.tusitio.com`.

## 5. Configuración de la Aplicación

### 5.1. Variables de Entorno

El bot se configura principalmente a través de variables de entorno que se definen en el archivo `ecosystem.config.js` de PM2. Crea este archivo en la raíz del proyecto `proyectos-nodejs/botito/`.

**`ecosystem.config.js`**:
```javascript
module.exports = {
  apps : [{
    name   : "botito",
    script : "./index.js", // Asegúrate que este es el punto de entrada principal
    env: {
      "NODE_ENV": "production",
      "PORT": 3000,
      // URL pública de tu bot (la del túnel de Cloudflare)
      "BOT_URL": "https://tu-subdominio.tusitio.com",
      // Webhook que te proporcionó Konecte para enviarles mensajes
      "KONECTE_WEBHOOK_URL": "https://konecte.com/api/webhook/...",
      // Otras variables que necesite tu aplicación
      "DATABASE_URL": "mongodb://localhost:27017/botito"
    }
  }]
}
```

### 5.2. Actualizar URL en Plataformas Externas

Asegúrate de que la URL de tu webhook (`https://tu-subdominio.tusitio.com/webhooks/konecte`) esté correctamente configurada en la plataforma de Konecte.

## 6. Puesta en Marcha con PM2

Con el archivo `ecosystem.config.js` creado, puedes iniciar la aplicación usando PM2.

```bash
# Navega a la raíz del proyecto si no lo estás
cd /ruta/a/proyectos-nodejs/botito

# Inicia la aplicación
pm2 start ecosystem.config.js
```

### Comandos útiles de PM2:

*   **Ver estado de los procesos**: `pm2 list` o `pm2 status`
*   **Ver logs en tiempo real**: `pm2 logs botito`
*   **Reiniciar la aplicación**: `pm2 restart botito`
*   **Detener la aplicación**: `pm2 stop botito`
*   **Guardar la lista de procesos para que se reinicien con el servidor**:
    ```bash
    pm2 save
    pm2 startup # Sigue las instrucciones que te dé este comando
    ```

¡Listo! Con estos pasos, tu bot debería estar completamente operativo en la nueva máquina. 