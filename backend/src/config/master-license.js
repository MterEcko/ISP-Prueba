// backend/src/config/master-license.js
// ⚠️ LICENCIA MAESTRA PARA DESARROLLO Y PRUEBAS ⚠️
// Esta licencia solo debe estar accesible en el código fuente
// NO debe exponerse en ninguna API pública

const crypto = require('crypto');

// Generar clave maestra única basada en secretos del sistema
const MASTER_LICENSE_SEED = 'ISP-PRUEBA-MASTER-2025-ENTERPRISE-UNLIMITED';
const MASTER_LICENSE_KEY = crypto
  .createHash('sha256')
  .update(MASTER_LICENSE_SEED)
  .digest('hex')
  .toUpperCase()
  .match(/.{1,4}/g)
  .slice(0, 8)
  .join('-');

const MASTER_LICENSE = {
  licenseKey: MASTER_LICENSE_KEY,
  planType: 'enterprise',
  clientLimit: null, // Ilimitado
  active: true,
  expiresAt: null, // Sin expiración
  featuresEnabled: {
    // Todas las características habilitadas
    unlimited_clients: true,
    unlimited_users: true,
    unlimited_plugins: true,
    plugin_marketplace: true,
    advanced_inventory: true,
    advanced_billing: true,
    advanced_reports: true,
    api_access: true,
    white_label: true,
    priority_support: true,
    custom_integrations: true,
    multi_branch: true,
    advanced_security: true,
    backup_restore: true,
    audit_logs: true
  },
  isMasterLicense: true,
  description: 'Licencia Maestra para Desarrollo y Pruebas',
  createdBy: 'SYSTEM',
  createdAt: new Date().toISOString()
};

/**
 * Verifica si una clave de licencia es la licencia maestra
 * @param {string} licenseKey - Clave de licencia a verificar
 * @returns {boolean}
 */
function isMasterLicense(licenseKey) {
  if (!licenseKey) return false;
  return licenseKey === MASTER_LICENSE_KEY;
}

/**
 * Obtiene la información de la licencia maestra
 * @returns {Object} Información de la licencia maestra
 */
function getMasterLicenseInfo() {
  return { ...MASTER_LICENSE };
}

/**
 * Valida una licencia contra la maestra
 * @param {string} licenseKey - Clave a validar
 * @returns {Object} Resultado de validación
 */
function validateAgainstMaster(licenseKey) {
  if (isMasterLicense(licenseKey)) {
    return {
      valid: true,
      isMaster: true,
      license: getMasterLicenseInfo(),
      message: 'Licencia maestra válida'
    };
  }
  return {
    valid: false,
    isMaster: false,
    license: null,
    message: 'No es licencia maestra'
  };
}

module.exports = {
  MASTER_LICENSE_KEY,
  MASTER_LICENSE,
  isMasterLicense,
  getMasterLicenseInfo,
  validateAgainstMaster
};

// Solo mostrar en consola en modo desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('\n========================================');
  console.log('🔑 LICENCIA MAESTRA PARA PRUEBAS');
  console.log('========================================');
  console.log(`Clave: ${MASTER_LICENSE_KEY}`);
  console.log(`Plan: ${MASTER_LICENSE.planType}`);
  console.log(`Clientes: Ilimitados`);
  console.log(`Expiración: Nunca`);
  console.log('========================================\n');
}
