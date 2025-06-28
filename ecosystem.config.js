module.exports = {
  "apps": [
    {
      "name": "botito-server",
      "script": "/home/rodrigod/proyectos-nodejs/botito/server.js",
      "watch": false,
      "instances": 1,
      "exec_mode": "cluster",
      "autorestart": true,
      "max_memory_restart": "1G",
      "env": {
        "NODE_ENV": "production"
      }
    },
    {
      "name": "botito-tunnel",
      "script": "/home/rodrigod/proyectos-nodejs/botito/scripts/tunnel/start-tunnel.js",
      "watch": false,
      "instances": 1,
      "exec_mode": "cluster",
      "autorestart": true
    },
    {
      "name": "botito-webhook-updater",
      "script": "/home/rodrigod/proyectos-nodejs/botito/scripts/ngrok-noip/services/updater-service.js",
      "watch": false,
      "instances": 1,
      "exec_mode": "cluster",
      "autorestart": true
    },
    {
      "name": "botito-ngrok",
      "script": "/home/rodrigod/proyectos-nodejs/botito/scripts/ngrok-noip/services/ngrok-service.js",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "autorestart": true
    },
    {
      "name": "botito-cloudflare-tunnel",
      "script": "/home/rodrigod/proyectos-nodejs/botito/scripts/cloudflare/start-cloudflare-tunnel.js",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "autorestart": true,
      "env": {
        "NODE_ENV": "production"
      }
    },
    {
      "name": "botito-cloudflare-webhook-updater",
      "script": "/home/rodrigod/proyectos-nodejs/botito/scripts/cloudflare/update-cloudflare-webhook.js",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "autorestart": true,
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
};