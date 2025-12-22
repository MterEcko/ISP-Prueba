// Script para probar validación de licencia usando el servicio real
require('dotenv').config();
const storeApiClient = require('./src/services/storeApiClient.service');

const LICENSE_KEY = 'A42A5AE9-2EEE3727-EE888E21-82500F54-AE2DB91E-D8ACDF37-1D16F03B-0738BBFA';

console.log('🔍 Probando validación de licencia\n');
console.log('Licencia:', LICENSE_KEY.substring(0, 30) + '...');
console.log('Store URL:', process.env.STORE_API_URL || 'http://localhost:3001/api');
console.log('\n📡 Validando con Store...\n');

async function testValidation() {
  try {
    const result = await storeApiClient.validateLicense(LICENSE_KEY);

    console.log('=== RESULTADO ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.valid) {
      console.log('\n✅ LICENCIA VÁLIDA');
      console.log('  Plan:', result.planType);
      console.log('  Status:', result.status);
      console.log('  Expira:', result.expiresAt);
      console.log('  Límites:', result.limits);
    } else {
      console.log('\n❌ LICENCIA INVÁLIDA');
      console.log('  Error:', result.error || 'No especificado');
      console.log('  Offline:', result.offline ? 'SÍ (sin conexión con Store)' : 'NO');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testValidation();
