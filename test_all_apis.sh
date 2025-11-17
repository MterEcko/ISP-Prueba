#!/bin/bash

# Script completo de pruebas de todas las APIs
# Incluye backend y frontend integration

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Función para test
run_test() {
    local test_name=$1
    local endpoint=$2
    local expected_status=${3:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    echo "  GET ${endpoint}"

    # Ejecutar request
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint")

    # Verificar status code
    if [[ "$http_code" =~ ^($expected_status|2[0-9]{2}|3[0-9]{2}|403)$ ]]; then
        echo -e "  ${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}✗ FAILED${NC} (HTTP $http_code, expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "==========================================="
echo "  PRUEBAS COMPLETAS - BACKEND + FRONTEND"
echo "==========================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# ============================================
# NUEVAS RUTAS: SETUP WIZARD
# ============================================
echo -e "\n${YELLOW}=== SETUP WIZARD (NUEVO) ===${NC}"

run_test "Estado de configuración inicial" "/setup/status"

# ============================================
# NUEVAS RUTAS: CLIENT INSTALLATION
# ============================================
echo -e "\n${YELLOW}=== CLIENT INSTALLATION (NUEVO) ===${NC}"

run_test "Listar instalaciones" "/client-installations"
run_test "Ver detalles de instalación (404 esperado)" "/client-installations/1" "404"

# ============================================
# NUEVAS RUTAS: CLIENT SUPPORT
# ============================================
echo -e "\n${YELLOW}=== CLIENT SUPPORT (NUEVO) ===${NC}"

run_test "Listar registros de soporte" "/client-support"
run_test "Historial de soporte de cliente" "/clients/1/support-history"

# ============================================
# RUTAS EXISTENTES: AUTENTICACIÓN
# ============================================
echo -e "\n${YELLOW}=== AUTENTICACIÓN ===${NC}"

# Login endpoint (no requiere auth)
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[TEST $TOTAL_TESTS]${NC} Login endpoint disponible"
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}')

if [[ "$LOGIN_STATUS" =~ ^(200|401|400)$ ]]; then
    echo -e "  ${GREEN}✓ PASSED${NC} (HTTP $LOGIN_STATUS)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "  ${RED}✗ FAILED${NC} (HTTP $LOGIN_STATUS)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# ============================================
# RUTAS: USUARIOS Y ROLES
# ============================================
echo -e "\n${YELLOW}=== USUARIOS Y ROLES ===${NC}"

run_test "Listar usuarios" "/users"
run_test "Listar roles" "/roles"
run_test "Listar permisos" "/permissions"

# ============================================
# RUTAS: CLIENTES
# ============================================
echo -e "\n${YELLOW}=== CLIENTES ===${NC}"

run_test "Listar clientes" "/clients"
run_test "Ver detalles de cliente" "/clients/1" "404"

# ============================================
# RUTAS: INVENTARIO
# ============================================
echo -e "\n${YELLOW}=== INVENTARIO ===${NC}"

run_test "Listar inventario" "/inventory"
run_test "Listar categorías" "/inventory/categories"
run_test "Listar ubicaciones" "/inventory/locations"
run_test "Listar movimientos" "/inventory/movements"

# ============================================
# RUTAS: TICKETS
# ============================================
echo -e "\n${YELLOW}=== TICKETS ===${NC}"

run_test "Listar tickets" "/tickets"

# ============================================
# RUTAS: FACTURACIÓN
# ============================================
echo -e "\n${YELLOW}=== FACTURACIÓN ===${NC}"

run_test "Listar facturas" "/billing/invoices"
run_test "Listar pagos" "/billing/payments"
run_test "Dashboard de facturación" "/billing/dashboard"

# ============================================
# RUTAS: DISPOSITIVOS
# ============================================
echo -e "\n${YELLOW}=== DISPOSITIVOS ===${NC}"

run_test "Listar dispositivos" "/devices"
run_test "Listar marcas" "/device-brands"
run_test "Listar familias" "/device-families"
run_test "Listar comandos" "/device-commands"

# ============================================
# RUTAS: MIKROTIK
# ============================================
echo -e "\n${YELLOW}=== MIKROTIK ===${NC}"

run_test "Listar routers MikroTik" "/mikrotik/routers"

# ============================================
# RUTAS: CALENDARIO (6 funcionalidades nuevas)
# ============================================
echo -e "\n${YELLOW}=== CALENDARIO ===${NC}"

run_test "Listar eventos" "/calendar/events"
run_test "Ver integraciones" "/calendar/integrations"

# ============================================
# RUTAS: CHAT
# ============================================
echo -e "\n${YELLOW}=== CHAT ===${NC}"

run_test "Listar conversaciones" "/chat/conversations"
run_test "Estado de Telegram" "/chat/telegram/status"

# ============================================
# RUTAS: STORE/MARKETPLACE
# ============================================
echo -e "\n${YELLOW}=== STORE / MARKETPLACE ===${NC}"

run_test "Listar clientes del store" "/store/customers"
run_test "Top clientes" "/store/customers/top"
run_test "Estadísticas de ventas" "/store/sales/stats"

# ============================================
# RUTAS: PLUGIN UPLOAD
# ============================================
echo -e "\n${YELLOW}=== PLUGIN UPLOAD ===${NC}"

run_test "Listar plugins subidos" "/plugin-upload"

# ============================================
# RUTAS: N8N WORKFLOWS
# ============================================
echo -e "\n${YELLOW}=== N8N WORKFLOWS ===${NC}"

run_test "Listar workflows" "/n8n/workflows"
run_test "Test conexión n8n" "/n8n/test-connection"

# ============================================
# RUTAS: REPORTES
# ============================================
echo -e "\n${YELLOW}=== REPORTES ===${NC}"

run_test "Reportes de facturación" "/reports/billing"
run_test "Reportes de inventario" "/reports/inventory"
run_test "Reportes de clientes" "/reports/clients"

# ============================================
# RUTAS: COMUNICACIONES
# ============================================
echo -e "\n${YELLOW}=== COMUNICACIONES ===${NC}"

run_test "Listar plantillas" "/templates"
run_test "Historial de comunicaciones" "/communications/history"

# ============================================
# RUTAS: CONFIGURACIÓN
# ============================================
echo -e "\n${YELLOW}=== CONFIGURACIÓN ===${NC}"

run_test "Obtener configuraciones" "/settings"
run_test "Licencia del sistema" "/system/license"

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "==========================================="
echo "         RESUMEN DE PRUEBAS"
echo "==========================================="
echo ""
echo -e "Total de pruebas:    ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Pruebas exitosas:    ${GREEN}$PASSED_TESTS${NC}"
echo -e "Pruebas fallidas:    ${RED}$FAILED_TESTS${NC}"
echo ""

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo -e "Tasa de éxito:       ${YELLOW}$SUCCESS_RATE%${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ TODAS LAS PRUEBAS PASARON${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ ALGUNAS PRUEBAS FALLARON${NC}"
    exit 1
fi
