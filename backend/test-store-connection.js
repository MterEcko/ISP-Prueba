// Script para probar la comunicación Backend -> Store
const axios = require('axios');
require('dotenv').config();

const STORE_URL = process.env.STORE_API_URL || 'http://localhost:3001/api';
const STORE_API_KEY = process.env.STORE_API_KEY;
const LICENSE_KEY = 'A42A5AE9-2EEE3727-EE888E21-82500F54-AE2DB91E-D8ACDF37-1D16F03B-0738BBFA';

console.log('🔍 Probando comunicación Backend -> Store\n');
console.log('Store URL:', STORE_URL);
console.log('API Key:', STORE_API_KEY ? '✅ Configurado' : '❌ NO configurado');
console.log('Licencia:', LICENSE_KEY.substring(0, 20) + '...\n');

async function testConnection() {
  try {
    console.log('📡 Enviando petición a:', `${STORE_URL}/licenses/validate`);

    const response = await axios.post(
      `${STORE_URL}/licenses/validate`,
      {
        licenseKey: LICENSE_KEY,
        hardwareId: 'test-hardware-123',
        systemVersion: '1.0.0'
      },
      {
        headers: {
          'Authorization': `Bearer ${STORE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('\n✅ RESPUESTA DEL STORE:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.valid) {
      console.log('\n✅ Store dice: LICENCIA VÁLIDA');
      console.log('Plan:', response.data.license?.planType);
      console.log('Expira:', response.data.license?.expiresAt);
    } else {
      console.log('\n❌ Store dice: LICENCIA INVÁLIDA');
      console.log('Razón:', response.data.message || 'No especificada');
      console.log('Verification:', response.data.verification);
    }

  } catch (error) {
    console.log('\n❌ ERROR DE CONEXIÓN:');
    if (error.code === 'ECONNREFUSED') {
      console.log('   El Store NO está corriendo en', STORE_URL);
      console.log('   Inicia el Store con: cd store && npm start');
    } else if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Mensaje:', error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }
}

testConnection();
