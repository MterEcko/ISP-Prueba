#!/bin/bash

# Script de instalacion de Coturn TURN/STUN Server
# Compatible con Ubuntu/Debian

echo "============================================"
echo "  Instalacion de Coturn TURN/STUN Server  "
echo "============================================"
echo ""

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo "Por favor ejecuta como root (sudo)"
  exit 1
fi

# Actualizar sistema
echo "[1/6] Actualizando sistema..."
apt update -y

# Instalar Docker si no esta instalado
if ! command -v docker &> /dev/null; then
  echo "[2/6] Instalando Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
else
  echo "[2/6] Docker ya esta instalado"
fi

# Instalar Docker Compose si no esta instalado
if ! command -v docker-compose &> /dev/null; then
  echo "[3/6] Instalando Docker Compose..."
  apt install docker-compose -y
else
  echo "[3/6] Docker Compose ya esta instalado"
fi

# Crear directorios
echo "[4/6] Creando directorios..."
mkdir -p coturn/logs
chmod 777 coturn/logs

# Configurar firewall (UFW)
echo "[5/6] Configurando firewall..."
if command -v ufw &> /dev/null; then
  ufw allow 3478/udp comment "Coturn TURN"
  ufw allow 5349/tcp comment "Coturn TLS"
  ufw allow 49152:65535/udp comment "Coturn Relay"
  echo "Firewall configurado"
else
  echo "UFW no instalado, saltando configuracion de firewall"
fi

# Iniciar Coturn
echo "[6/6] Iniciando Coturn..."
docker-compose -f docker-compose.coturn.yml up -d

echo ""
echo "============================================"
echo "  Coturn instalado correctamente!"
echo "============================================"
echo ""
echo "Configuracion:"
echo "  - TURN URL: turn:$(hostname -I | awk '{print $1}'):3478"
echo "  - TURN TLS: turns:$(hostname -I | awk '{print $1}'):5349"
echo "  - Usuario: ispuser"
echo "  - Password: SecurePassword2024!"
echo ""
echo "Comandos utiles:"
echo "  - Ver logs: docker-compose -f docker-compose.coturn.yml logs -f"
echo "  - Reiniciar: docker-compose -f docker-compose.coturn.yml restart"
echo "  - Detener: docker-compose -f docker-compose.coturn.yml down"
echo ""
echo "IMPORTANTE:"
echo "  1. Cambia la password en coturn/turnserver.conf"
echo "  2. Configura tu IP publica en turnserver.conf si tienes IP estatica"
echo "  3. Configura Cloudflare DNS record tipo A para turn.isp.serviciosqbit.net"
echo ""
