#!/bin/bash

# Script de verificación de conectividad
# Verifica que el sistema ISP sea accesible desde diferentes entornos

echo "=================================="
echo "🔍 Verificación de Conectividad"
echo "=================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar una URL
check_url() {
    local url=$1
    local description=$2

    echo -n "Verificando $description... "

    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALLO${NC}"
        return 1
    fi
}

# 1. Verificar Backend en localhost
echo "1. Backend (localhost)"
check_url "http://localhost:3001" "http://localhost:3001"
echo ""

# 2. Obtener IP local
echo "2. Detectando IP local..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    # Windows (Git Bash)
    LOCAL_IP=$(ipconfig | grep -A 1 "Ethernet adapter" | grep "IPv4" | awk '{print $NF}')
fi

if [ -n "$LOCAL_IP" ]; then
    echo -e "${GREEN}IP Local detectada: $LOCAL_IP${NC}"
    echo ""

    # 3. Verificar Backend desde IP local
    echo "3. Backend (red local)"
    check_url "http://$LOCAL_IP:3001" "http://$LOCAL_IP:3001"
    echo ""
else
    echo -e "${YELLOW}No se pudo detectar la IP local${NC}"
    echo ""
fi

# 4. Verificar Frontend en localhost
echo "4. Frontend (localhost)"
check_url "http://localhost:8080" "http://localhost:8080"
echo ""

# 5. Verificar Frontend desde IP local
if [ -n "$LOCAL_IP" ]; then
    echo "5. Frontend (red local)"
    check_url "http://$LOCAL_IP:8080" "http://$LOCAL_IP:8080"
    echo ""
fi

# 6. Verificar CORS
echo "6. Verificando CORS..."
CORS_TEST=$(curl -s -I -X OPTIONS \
    -H "Origin: http://localhost:8080" \
    -H "Access-Control-Request-Method: GET" \
    http://localhost:3001 2>/dev/null | grep -i "access-control-allow-origin")

if [ -n "$CORS_TEST" ]; then
    echo -e "${GREEN}✓ CORS configurado correctamente${NC}"
else
    echo -e "${RED}✗ CORS podría tener problemas${NC}"
fi
echo ""

# Resumen
echo "=================================="
echo "📋 Resumen"
echo "=================================="
echo ""
echo "URLs de acceso:"
echo "  Backend Local:  http://localhost:3001"
if [ -n "$LOCAL_IP" ]; then
    echo "  Backend Red:    http://$LOCAL_IP:3001"
fi
echo "  Frontend Local: http://localhost:8080"
if [ -n "$LOCAL_IP" ]; then
    echo "  Frontend Red:   http://$LOCAL_IP:8080"
fi
echo ""

echo "API Endpoints:"
echo "  http://localhost:3001/api"
echo ""

echo "Para acceder desde otro dispositivo en la red:"
echo "  1. Asegúrate de que el firewall permita los puertos 3001 y 8080"
if [ -n "$LOCAL_IP" ]; then
    echo "  2. Accede a: http://$LOCAL_IP:8080"
fi
echo ""

echo "Si tienes problemas:"
echo "  - Revisa que ambos servidores estén corriendo"
echo "  - Verifica la configuración de CORS en backend/.env"
echo "  - Asegúrate de que el firewall permita las conexiones"
echo "  - Consulta docs/CONECTIVIDAD.md para más información"
echo ""
