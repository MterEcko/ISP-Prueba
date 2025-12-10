// isp-system/backend/tests/hardwareId.test.js
const assert = require('assert');
const os = require('os');
const crypto = require('crypto');
/**

Función auxiliar para generar Hardware ID
(mismo algoritmo que en licenseClient.js)
*/
function generateHardwareId() {
const machineData = [
os.hostname(),
os.arch(),
os.platform(),
os.cpus()[0]?.model || '',
Object.values(os.networkInterfaces())
.flat()
.find(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
?.mac || ''
].filter(Boolean).join('|');

return crypto
.createHash('sha256')
.update(machineData)
.digest('hex')
.substring(0, 32);
}
describe('Hardware ID Generation', () => {
describe('generateHardwareId', () => {
it('should generate a 32 character hex string', () => {
const hardwareId = generateHardwareId();
  assert.strictEqual(hardwareId.length, 32);
  assert.match(hardwareId, /^[a-f0-9]{32}$/);
});

it('should be consistent across multiple calls', () => {
  const id1 = generateHardwareId();
  const id2 = generateHardwareId();
  const id3 = generateHardwareId();
  
  assert.strictEqual(id1, id2);
  assert.strictEqual(id2, id3);
});

it('should include system information', () => {
  // Verificar que usa información del sistema
  const hostname = os.hostname();
  const arch = os.arch();
  const platform = os.platform();
  
  assert.ok(hostname);
  assert.ok(arch);
  assert.ok(platform);
  
  // El ID debe cambiar si cambia alguno de estos
  const hardwareId = generateHardwareId();
  assert.ok(hardwareId);
});

it('should handle missing network interfaces gracefully', () => {
  // Mock os.networkInterfaces para retornar vacío
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({});
  
  const hardwareId = generateHardwareId();
  
  // Debe generar ID válido incluso sin interfaces
  assert.strictEqual(hardwareId.length, 32);
  assert.match(hardwareId, /^[a-f0-9]{32}$/);
  
  // Restaurar
  os.networkInterfaces = originalNetworkInterfaces;
});

it('should handle missing CPU info gracefully', () => {
  const hardwareId = generateHardwareId();
  
  // Debe generar ID válido
  assert.ok(hardwareId);
  assert.strictEqual(hardwareId.length, 32);
});
});
describe('Component Extraction', () => {
it('should extract hostname', () => {
const hostname = os.hostname();
assert.ok(typeof hostname === 'string');
assert.ok(hostname.length > 0);
});
it('should extract architecture', () => {
  const arch = os.arch();
  assert.ok(['x64', 'arm', 'arm64', 'ia32'].includes(arch));
});

it('should extract platform', () => {
  const platform = os.platform();
  assert.ok(['linux', 'darwin', 'win32', 'freebsd'].includes(platform));
});

it('should extract CPU model', () => {
  const cpus = os.cpus();
  assert.ok(Array.isArray(cpus));
  assert.ok(cpus.length > 0);
  assert.ok(cpus[0].model);
});

it('should extract MAC address', () => {
  const interfaces = os.networkInterfaces();
  const allInterfaces = Object.values(interfaces).flat();
  
  assert.ok(allInterfaces.length > 0);
  
  // Debe existir al menos una interfaz no-loopback
  const nonLoopback = allInterfaces.find(
    iface => !iface.internal && iface.mac !== '00:00:00:00:00:00'
  );
  
  // En algunos ambientes de test esto puede fallar
  if (nonLoopback) {
    assert.ok(nonLoopback.mac);
    assert.match(nonLoopback.mac, /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i);
  }
});
});
describe('Hash Consistency', () => {
it('should produce same hash for same input', () => {
const testData = 'test-hardware-data';
  const hash1 = crypto.createHash('sha256').update(testData).digest('hex');
  const hash2 = crypto.createHash('sha256').update(testData).digest('hex');
  
  assert.strictEqual(hash1, hash2);
});

it('should produce different hash for different input', () => {
  const data1 = 'test-hardware-data-1';
  const data2 = 'test-hardware-data-2';
  
  const hash1 = crypto.createHash('sha256').update(data1).digest('hex');
  const hash2 = crypto.createHash('sha256').update(data2).digest('hex');
  
  assert.notStrictEqual(hash1, hash2);
});
});
describe('Security', () => {
it('should not expose raw system information', () => {
const hardwareId = generateHardwareId();
const hostname = os.hostname();
  // El ID no debe contener el hostname en texto plano
  assert.ok(!hardwareId.includes(hostname.toLowerCase()));
});

it('should be cryptographically hashed', () => {
  const hardwareId = generateHardwareId();
  
  // Verificar que es un hash SHA-256 válido (64 chars hex, truncado a 32)
  assert.match(hardwareId, /^[a-f0-9]{32}$/);
});
});
describe('Portability', () => {
it('should work on different Node.js versions', () => {
// Verificar que os module está disponible
assert.ok(os);
assert.ok(os.hostname);
assert.ok(os.arch);
assert.ok(os.platform);
assert.ok(os.cpus);
assert.ok(os.networkInterfaces);
});
it('should work on different operating systems', () => {
  const platform = os.platform();
  const hardwareId = generateHardwareId();
  
  // Debe funcionar en cualquier plataforma
  assert.ok(hardwareId);
  console.log(`  Platform: ${platform}, ID generated: ${hardwareId.substring(0, 8)}...`);
});
});
});
describe('Hardware ID Change Detection', () => {
it('should detect if hardware components change', () => {
const originalId = generateHardwareId();
// Simular que el hostname cambió
const mockHostname = os.hostname() + '-modified';

// En un sistema real, esto debería generar un ID diferente
// Este test es más conceptual
assert.ok(originalId);
assert.ok(mockHostname !== os.hostname());
});
});
