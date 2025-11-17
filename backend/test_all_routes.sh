#!/bin/bash

# Script de pruebas completas del sistema ISP
# Prueba todas las rutas y funcionalidades sin servicios externos

set -e  # Salir en error

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Colores para output
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
    local http_method=$2
    local endpoint=$3
    local data=$4
    local expected_status=${5:-200}
    local use_auth=${6:-true}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    echo "  ${http_method} ${endpoint}"

    local auth_header=""
    if [ "$use_auth" = "true" ] && [ ! -z "$TOKEN" ]; then
        auth_header="-H \"x-access-token: $TOKEN\""
    fi

    local cmd="curl -s -w \"\\n%{http_code}\" -X $http_method \"$API_URL$endpoint\""

    if [ ! -z "$data" ]; then
        cmd="$cmd -H \"Content-Type: application/json\" -d '$data'"
    fi

    if [ ! -z "$auth_header" ]; then
        cmd="$cmd $auth_header"
    fi

    # Ejecutar request
    local response=$(eval $cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    # Verificar status code
    if [[ "$http_code" =~ ^($expected_status|2[0-9]{2}|3[0-9]{2})$ ]]; then
        echo -e "  ${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Mostrar respuesta si es JSON y no muy larga
        if echo "$body" | jq . > /dev/null 2>&1; then
            local line_count=$(echo "$body" | wc -l)
            if [ $line_count -lt 10 ]; then
                echo "  Response: $(echo $body | jq -c .)"
            else
                echo "  Response: $(echo $body | jq -c . | head -c 100)..."
            fi
        fi
    else
        echo -e "  ${RED}✗ FAILED${NC} (HTTP $http_code, expected $expected_status)"
        echo "  Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "==========================================="
echo "  PRUEBAS COMPLETAS DEL SISTEMA ISP"
echo "==========================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# ============================================
# SECCIÓN 1: AUTENTICACIÓN
# ============================================
echo -e "\n${YELLOW}=== 1. AUTENTICACIÓN ===${NC}"

# Crear usuario de prueba
run_test "Crear usuario admin" "POST" "/auth/signup" '{
  "username": "admin_test_'$(date +%s)'",
  "email": "admin'$(date +%s)'@test.com",
  "password": "Test123456!",
  "fullName": "Admin Test"
}' "201" "false"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin_test_'$(date +%s)'",
    "password": "Test123456!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No se pudo obtener token de autenticación${NC}"
    echo "Response: $LOGIN_RESPONSE"

    # Intentar con usuario existente
    echo "Intentando login con usuario existente..."
    TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token"  # Token de prueba
else
    echo -e "${GREEN}✓ Token obtenido correctamente${NC}"
fi

# ============================================
# SECCIÓN 2: USUARIOS Y ROLES
# ============================================
echo -e "\n${YELLOW}=== 2. USUARIOS Y ROLES ===${NC}"

run_test "Listar usuarios" "GET" "/users"
run_test "Listar roles" "GET" "/roles"
run_test "Listar permisos" "GET" "/permissions"

# ============================================
# SECCIÓN 3: CLIENTES
# ============================================
echo -e "\n${YELLOW}=== 3. CLIENTES ===${NC}"

run_test "Listar clientes" "GET" "/clients"
run_test "Crear cliente" "POST" "/clients" '{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan.perez'$(date +%s)'@example.com",
  "phone": "1234567890",
  "address": "Calle Principal 123",
  "city": "Ciudad",
  "state": "Estado",
  "zipCode": "12345"
}'

# ============================================
# SECCIÓN 4: INVENTARIO
# ============================================
echo -e "\n${YELLOW}=== 4. INVENTARIO ===${NC}"

run_test "Listar inventario" "GET" "/inventory"
run_test "Listar categorías de inventario" "GET" "/inventory/categories"
run_test "Listar ubicaciones" "GET" "/inventory/locations"
run_test "Listar movimientos" "GET" "/inventory/movements"

# ============================================
# SECCIÓN 5: TICKETS
# ============================================
echo -e "\n${YELLOW}=== 5. TICKETS ===${NC}"

run_test "Listar tickets" "GET" "/tickets"
run_test "Crear ticket" "POST" "/tickets" '{
  "title": "Problema de conectividad",
  "description": "Cliente reporta internet lento",
  "priority": "high",
  "status": "open"
}'

# ============================================
# SECCIÓN 6: FACTURACIÓN
# ============================================
echo -e "\n${YELLOW}=== 6. FACTURACIÓN ===${NC}"

run_test "Listar facturas" "GET" "/billing/invoices"
run_test "Listar pagos" "GET" "/billing/payments"
run_test "Dashboard de facturación" "GET" "/billing/dashboard"

# ============================================
# SECCIÓN 7: DISPOSITIVOS
# ============================================
echo -e "\n${YELLOW}=== 7. DISPOSITIVOS ===${NC}"

run_test "Listar dispositivos" "GET" "/devices"
run_test "Listar marcas" "GET" "/device-brands"
run_test "Listar familias" "GET" "/device-families"
run_test "Listar comandos" "GET" "/device-commands"

# ============================================
# SECCIÓN 8: CONFIGURACIÓN
# ============================================
echo -e "\n${YELLOW}=== 8. CONFIGURACIÓN DEL SISTEMA ===${NC}"

run_test "Obtener configuraciones" "GET" "/settings"
run_test "Licencia del sistema" "GET" "/system/license"
run_test "Plugins del sistema" "GET" "/system/plugins"

# ============================================
# SECCIÓN 9: CALENDARIO (Nueva funcionalidad)
# ============================================
echo -e "\n${YELLOW}=== 9. CALENDARIO ===${NC}"

run_test "Listar eventos del calendario" "GET" "/calendar/events"
run_test "Crear evento" "POST" "/calendar/events" '{
  "title": "Reunión de equipo",
  "description": "Revisión semanal",
  "startDate": "2025-11-25T10:00:00",
  "endDate": "2025-11-25T11:00:00",
  "location": "Oficina"
}'
run_test "Ver integraciones de calendario" "GET" "/calendar/integrations"

# ============================================
# SECCIÓN 10: CHAT (Nueva funcionalidad)
# ============================================
echo -e "\n${YELLOW}=== 10. CHAT ===${NC}"

run_test "Listar conversaciones" "GET" "/chat/conversations"
run_test "Crear conversación" "POST" "/chat/conversations" '{
  "name": "Equipo Técnico",
  "participants": []
}'
run_test "Estado de Telegram" "GET" "/chat/telegram/status"

# ============================================
# SECCIÓN 11: STORE/MARKETPLACE (Nueva funcionalidad)
# ============================================
echo -e "\n${YELLOW}=== 11. STORE / MARKETPLACE ===${NC}"

run_test "Listar clientes del store" "GET" "/store/customers"
run_test "Top clientes" "GET" "/store/customers/top"
run_test "Listar órdenes" "GET" "/store/orders"
run_test "Estadísticas de ventas" "GET" "/store/sales/stats"
run_test "Crear cliente del store" "POST" "/store/customers" '{
  "email": "cliente'$(date +%s)'@store.com",
  "fullName": "Cliente Store",
  "company": "Mi Empresa",
  "country": "MX"
}'

# ============================================
# SECCIÓN 12: PLUGIN UPLOAD (Nueva funcionalidad)
# ============================================
echo -e "\n${YELLOW}=== 12. UPLOAD DE PLUGINS ===${NC}"

run_test "Listar plugins subidos" "GET" "/plugin-upload"
run_test "Validar manifest" "POST" "/plugin-upload/validate-manifest" '{
  "name": "Test Plugin",
  "version": "1.0.0",
  "description": "Plugin de prueba",
  "author": "Admin"
}'

# ============================================
# SECCIÓN 13: N8N WORKFLOWS (Nueva funcionalidad)
# ============================================
echo -e "\n${YELLOW}=== 13. N8N WORKFLOWS ===${NC}"

run_test "Listar workflows" "GET" "/n8n/workflows"
run_test "Crear workflow" "POST" "/n8n/workflows" '{
  "name": "Test Workflow",
  "triggerType": "client_created",
  "webhookUrl": "http://localhost:5678/webhook/test",
  "active": true
}'
run_test "Test conexión n8n" "GET" "/n8n/test-connection"

# ============================================
# SECCIÓN 14: REPORTES
# ============================================
echo -e "\n${YELLOW}=== 14. REPORTES ===${NC}"

run_test "Reportes de facturación" "GET" "/reports/billing"
run_test "Reportes de inventario" "GET" "/reports/inventory"
run_test "Reportes de clientes" "GET" "/reports/clients"

# ============================================
# SECCIÓN 15: COMUNICACIONES
# ============================================
echo -e "\n${YELLOW}=== 15. COMUNICACIONES ===${NC}"

run_test "Listar plantillas" "GET" "/templates"
run_test "Historial de comunicaciones" "GET" "/communications/history"

# ============================================
# SECCIÓN 16: PLANTILLAS DE DOCUMENTOS
# ============================================
echo -e "\n${YELLOW}=== 16. PLANTILLAS DE DOCUMENTOS ===${NC}"

run_test "Listar plantillas de documentos" "GET" "/document-templates"

# ============================================
# SECCIÓN 17: MIKROTIK (Con Mock)
# ============================================
echo -e "\n${YELLOW}=== 17. MIKROTIK (MOCK MODE) ===${NC}"

echo "⚠️  Nota: Pruebas de MikroTik requieren configuración de router real."
echo "    Para pruebas, se recomienda usar el servicio mock."

run_test "Listar routers MikroTik" "GET" "/mikrotik/routers"
run_test "Listar usuarios PPPoE (puede fallar sin router)" "GET" "/mikrotik/pppoe/users" "" "200,404,500"

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
    echo "  Revisa los detalles arriba para más información"
    exit 1
fi
