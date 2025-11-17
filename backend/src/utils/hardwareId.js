// Algoritmo para generar ID único del hardware
function generateHardwareId() {
  const os = require('os');
  const crypto = require('crypto');

  // Recopilar información del hardware
  const components = [
    // 1. Hostname
    os.hostname(),
    
    // 2. Arquitectura del CPU
    os.arch(),
    
    // 3. Plataforma
    os.platform(),
    
    // 4. Modelo del CPU
    os.cpus()[0]?.model || '',
    
    // 5. MAC Address de la primera interfaz no-loopback
    Object.values(os.networkInterfaces())
      .flat()
      .find(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
      ?.mac || '',
    
    // 6. ID del sistema (Linux)
    process.platform === 'linux' ? 
      require('fs').readFileSync('/etc/machine-id', 'utf8').trim() : ''
  ].filter(Boolean);

  // Generar hash
  const data = components.join('|');
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32);
}