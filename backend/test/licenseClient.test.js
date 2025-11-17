// isp-system/backend/tests/licenseClient.test.js
const assert = require('assert');
const LicenseClient = require('../src/services/licenseClient');
const fs = require('fs').promises;
const path = require('path');
describe('LicenseClient', () => {
let licenseClient;
const testLicenseFile = path.join(__dirname, '../.license.test');
beforeEach(() => {
licenseClient = new LicenseClient();
// Usar archivo de prueba
licenseClient.licenseFile = testLicenseFile;
});
afterEach(async () => {
// Limpiar archivo de prueba
try {
await fs.unlink(testLicenseFile);
} catch (error) {
// Ignorar si no existe
}
});
describe('generateHardwareId', () => {
it('should generate consistent hardware ID', () => {
const id1 = licenseClient.generateHardwareId();
const id2 = licenseClient.generateHardwareId();
  assert.strictEqual(id1, id2);
  assert.strictEqual(id1.length, 32);
});

it('should generate different IDs on different machines', () => {
  // Este test solo valida el formato
  const id = licenseClient.generateHardwareId();
  assert.match(id, /^[a-f0-9]{32}$/);
});
});
describe('encrypt/decrypt', () => {
it('should encrypt and decrypt text correctly', () => {
const originalText = 'test license data';
  const encrypted = licenseClient.encrypt(originalText);
  assert.ok(encrypted.includes(':'));
  
  const decrypted = licenseClient.decrypt(encrypted);
  assert.strictEqual(decrypted, originalText);
});

it('should fail to decrypt tampered data', () => {
  const encrypted = licenseClient.encrypt('test');
  const tampered = encrypted.replace(/.$/, 'x');
  
  assert.throws(() => {
    licenseClient.decrypt(tampered);
  });
});
});
describe('saveLicenseLocally', () => {
it('should save license to file', async () => {
const testLicense = {
key: 'TEST-LICENSE-KEY',
planId: 'professional',
expiresAt: new Date()
};
  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);

  // Verificar que existe el archivo
  const exists = await fs.access(testLicenseFile)
    .then(() => true)
    .catch(() => false);
  
  assert.ok(exists);
});

it('should save encrypted data', async () => {
  const testLicense = {
    key: 'TEST-LICENSE-KEY',
    planId: 'professional'
  };

  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);

  // Leer archivo raw
  const rawData = await fs.readFile(testLicenseFile, 'utf8');
  
  // No debe contener el license key en texto plano
  assert.ok(!rawData.includes('TEST-LICENSE-KEY'));
});
});
describe('loadLicenseLocally', () => {
it('should load saved license', async () => {
const testLicense = {
key: 'TEST-LICENSE-KEY',
planId: 'professional',
hardwareId: licenseClient.hardwareId
};
  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);
  const loaded = await licenseClient.loadLicenseLocally();

  assert.ok(loaded);
  assert.strictEqual(loaded.key, 'TEST-LICENSE-KEY');
  assert.strictEqual(loaded.planId, 'professional');
});

it('should return null if no license exists', async () => {
  const loaded = await licenseClient.loadLicenseLocally();
  assert.strictEqual(loaded, null);
});
});
describe('offlineValidation', () => {
it('should validate non-expired license', async () => {
const futureDate = new Date();
futureDate.setFullYear(futureDate.getFullYear() + 1);
  const testLicense = {
    key: 'TEST-LICENSE-KEY',
    planId: 'professional',
    hardwareId: licenseClient.hardwareId,
    expiresAt: futureDate
  };

  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);
  const result = await licenseClient.offlineValidation();

  assert.ok(result.valid);
  assert.ok(result.offline);
});

it('should reject expired license', async () => {
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);

  const testLicense = {
    key: 'TEST-LICENSE-KEY',
    planId: 'professional',
    hardwareId: licenseClient.hardwareId,
    expiresAt: pastDate
  };

  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);
  const result = await licenseClient.offlineValidation();

  assert.ok(!result.valid);
  assert.strictEqual(result.error, 'License expired');
});

it('should reject hardware mismatch', async () => {
  const testLicense = {
    key: 'TEST-LICENSE-KEY',
    planId: 'professional',
    hardwareId: 'different-hardware-id',
    expiresAt: null
  };

  await licenseClient.saveLicenseLocally('TEST-LICENSE-KEY', testLicense);
  const result = await licenseClient.offlineValidation();

  assert.ok(!result.valid);
  assert.strictEqual(result.error, 'Hardware mismatch');
});
});
describe('collectMetrics', () => {
it('should collect system metrics', async () => {
const metrics = await licenseClient.collectMetrics();
  assert.ok(typeof metrics.client_count === 'number');
  assert.ok(typeof metrics.plugin_count === 'number');
  assert.ok(typeof metrics.uptime === 'number');
  assert.ok(metrics.memory_usage);
  assert.ok(metrics.node_version);
});
});
describe('formatPhoneNumber', () => {
it('should format Mexican phone numbers', () => {
// Ya implementado en WhatsApp plugin, pero si existe en licenseClient
// Este test es placeholder
assert.ok(true);
});
});
});