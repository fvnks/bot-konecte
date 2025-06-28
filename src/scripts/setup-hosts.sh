#!/bin/bash

# Script para configurar el archivo hosts
# Este script configura el archivo hosts para que konecte.ddns.net apunte a localhost

# Verificar si la entrada ya existe en el archivo hosts
if grep -q "konecte.ddns.net" /etc/hosts; then
    echo "La entrada para konecte.ddns.net ya existe en el archivo hosts. No es necesario modificarlo."
else
    echo "Agregando entrada para konecte.ddns.net en el archivo hosts..."
    echo "127.0.0.1 konecte.ddns.net" | sudo tee -a /etc/hosts > /dev/null
    echo "Entrada agregada correctamente."
fi

echo "El archivo hosts ahora contiene:"
grep "konecte.ddns.net" /etc/hosts || echo "No se encontró la entrada para konecte.ddns.net en el archivo hosts." 