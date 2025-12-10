#!/usr/bin/env node
// Script para validar todos los endpoints del backend

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

// Resultados
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

async function testEndpoint(name, method, url, data = null, requiresAuth = false) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: requiresAuth && authToken ? { 'x-access-token': authToken } : {}
    };

    if (data) config.data = data;

    const response = await axios(config);
    log.success(`${name}: ${response.status} ${response.statusText}`);
    results.passed++;
    results.details.push({ name, status: 'PASS', code: response.status });
    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 404) {
        log.warning(`${name}: 404 Not Found (endpoint no implementado)`);
        results.warnings++;
        results.details.push({ name, status: 'WARN', code: 404, message: 'Endpoint no implementado' });
      } else if (error.response.status === 401 || error.response.status === 403) {
        log.warning(`${name}: ${error.response.status} (requiere autenticación/permisos)`);
        results.warnings++;
        results.details.push({ name, status: 'WARN', code: error.response.status, message: 'Requiere auth' });
      } else {
        log.error(`${name}: ${error.response.status} ${error.response.statusText}`);
        results.failed++;
        results.details.push({ name, status: 'FAIL', code: error.response.status, message: error.response.data?.message });
      }
    } else {
      log.error(`${name}: ${error.message}`);
      results.failed++;
      results.details.push({ name, status: 'FAIL', message: error.message });
    }
    return null;
  }
}

async function validateBackend() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   VALIDACIÓN COMPLETA DEL BACKEND - ISP Management System');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Test básico
  log.info('1️⃣  Pruebas básicas...');
  await testEndpoint('Health Check', 'GET', '/test');

  // 2. Autenticación
  log.info('\n2️⃣  Autenticación...');
  const loginData = await testEndpoint('Login', 'POST', '/auth/signin', {
    username: 'admin',
    password: 'admin123'
  });

  if (loginData && loginData.accessToken) {
    authToken = loginData.accessToken;
    log.success('Token obtenido correctamente');
  }

  // 3. Usuarios
  log.info('\n3️⃣  Gestión de usuarios...');
  await testEndpoint('Listar usuarios', 'GET', '/users', null, true);
  await testEndpoint('Obtener perfil', 'GET', '/users/profile', null, true);

  // 4. Clientes
  log.info('\n4️⃣  Gestión de clientes...');
  await testEndpoint('Listar clientes', 'GET', '/clients', null, true);
  await testEndpoint('Buscar clientes', 'GET', '/clients/search?q=test', null, true);

  // 5. Servicios
  log.info('\n5️⃣  Paquetes de servicio...');
  await testEndpoint('Listar paquetes', 'GET', '/service-packages', null, true);
  await testEndpoint('Listar zonas', 'GET', '/zones', null, true);

  // 6. Suscripciones
  log.info('\n6️⃣  Suscripciones...');
  await testEndpoint('Listar suscripciones', 'GET', '/subscriptions', null, true);

  // 7. Facturación
  log.info('\n7️⃣  Facturación...');
  await testEndpoint('Listar facturas', 'GET', '/invoices', null, true);
  await testEndpoint('Listar pagos', 'GET', '/payments', null, true);

  // 8. Inventario
  log.info('\n8️⃣  Inventario...');
  await testEndpoint('Listar inventario', 'GET', '/inventory', null, true);
  await testEndpoint('Categorías de inventario', 'GET', '/inventory-categories', null, true);

  // 9. Tickets
  log.info('\n9️⃣  Sistema de tickets...');
  await testEndpoint('Listar tickets', 'GET', '/tickets', null, true);
  await testEndpoint('Tipos de tickets', 'GET', '/ticket-types', null, true);

  // 10. Dispositivos/Red
  log.info('\n🔟 Dispositivos y red...');
  await testEndpoint('Listar dispositivos', 'GET', '/devices', null, true);
  await testEndpoint('Listar routers Mikrotik', 'GET', '/mikrotik-routers', null, true);
  await testEndpoint('Listar IPs', 'GET', '/mikrotik-ips', null, true);

  // 11. Calendario
  log.info('\n1️⃣1️⃣  Calendario...');
  await testEndpoint('Listar eventos', 'GET', '/calendar/events', null, true);

  // 12. Chat
  log.info('\n1️⃣2️⃣  Chat...');
  await testEndpoint('Listar conversaciones', 'GET', '/chat/conversations', null, true);

  // 13. Métricas
  log.info('\n1️⃣3️⃣  Métricas...');
  await testEndpoint('Métricas de dispositivos', 'GET', '/metrics/devices', null, true);

  // 14. Reportes
  log.info('\n1️⃣4️⃣  Reportes...');
  await testEndpoint('Dashboard stats', 'GET', '/reports/dashboard', null, true);

  // 15. Tienda
  log.info('\n1️⃣5️⃣  Tienda de plugins...');
  await testEndpoint('Listar productos', 'GET', '/store/products', null, false);
  await testEndpoint('Estadísticas tienda', 'GET', '/store/stats', null, true);

  // 16. Licencias
  log.info('\n1️⃣6️⃣  Licencias...');
  await testEndpoint('Listar licencias sistema', 'GET', '/system-licenses', null, true);
  await testEndpoint('Licencia actual', 'GET', '/system-licenses/current', null, true);

  // Resumen
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   RESUMEN DE VALIDACIÓN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const total = results.passed + results.failed + results.warnings;
  console.log(`✅ Exitosos:    ${results.passed}/${total}`);
  console.log(`❌ Fallidos:    ${results.failed}/${total}`);
  console.log(`⚠️  Advertencias: ${results.warnings}/${total}`);

  const passRate = ((results.passed / total) * 100).toFixed(1);
  console.log(`\n📊 Tasa de éxito: ${passRate}%`);

  if (results.failed > 0) {
    console.log('\n❌ Endpoints con errores críticos:');
    results.details
      .filter(d => d.status === 'FAIL')
      .forEach(d => console.log(`   - ${d.name}: ${d.message || d.code}`));
  }

  if (results.warnings > 0) {
    console.log('\n⚠️  Endpoints no implementados o sin permisos:');
    results.details
      .filter(d => d.status === 'WARN')
      .forEach(d => console.log(`   - ${d.name}: ${d.message || d.code}`));
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// Ejecutar validación
validateBackend().catch(console.error);
