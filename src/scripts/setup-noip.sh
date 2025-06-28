#!/bin/bash

# Script para configurar el servicio de No-IP
# Este script configura el servicio de No-IP para que konecte.ddns.net apunte a la IP pública del servidor

# Verificar si el servicio de No-IP está instalado
if ! command -v noip2 &> /dev/null; then
    echo "El servicio de No-IP no está instalado. Instalándolo..."
    
    # Crear directorio temporal
    mkdir -p ~/temp
    cd ~/temp
    
    # Descargar el cliente de No-IP
    wget http://www.no-ip.com/client/linux/noip-duc-linux.tar.gz
    
    # Descomprimir el archivo
    tar xzf noip-duc-linux.tar.gz
    
    # Compilar e instalar
    cd noip-*
    make
    sudo make install
    
    # Limpiar archivos temporales
    cd ~
    rm -rf ~/temp
    
    echo "Servicio de No-IP instalado correctamente."
fi

# Verificar si el servicio de No-IP está configurado
if [ ! -f /usr/local/etc/no-ip2.conf ]; then
    echo "El servicio de No-IP no está configurado. Configurándolo..."
    echo "Sigue las instrucciones para configurar el servicio de No-IP."
    echo "Usa tu usuario y contraseña de No-IP."
    echo "Cuando se te pregunte por el intervalo de actualización, usa 5 (minutos)."
    echo "Cuando se te pregunte por ejecutar múltiples instancias, responde 'N'."
    echo "Cuando se te pregunte por el nombre de host, selecciona 'konecte.ddns.net'."
    
    # Configurar el servicio de No-IP
    sudo noip2 -C
    
    echo "Servicio de No-IP configurado correctamente."
fi

# Iniciar el servicio de No-IP
sudo noip2

echo "Servicio de No-IP iniciado correctamente."
echo "Ahora konecte.ddns.net apunta a la IP pública de este servidor."

# Verificar el estado del servicio de No-IP
echo "Estado del servicio de No-IP:"
sudo noip2 -S 