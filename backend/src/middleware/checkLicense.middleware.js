// isp-system/backend/src/middleware/checkLicense.middleware.js
const LicenseClient = require('../services/licenseClient');/**

Middleware para verificar licencia del sistema
*/
const checkSystemLicense = async (req, res, next) => {
try {
const licenseClient = new LicenseClient();
const validation = await licenseClient.validate();
if (!validation.valid) {
  return res.status(403).json({
    success: false,
    error: 'Invalid or expired license',
    message: validation.error,
    requiresActivation: !validation.offline
  });
}// Agregar info de licencia al request
req.license = {
  valid: true,
  features: validation.features,
  expiresAt: validation.expiresAt,
  daysRemaining: validation.daysRemaining,
  offline: validation.offline
};// Warning si está cerca de expirar
if (validation.daysRemaining && validation.daysRemaining < 7) {
  res.setHeader('X-License-Warning', `License expires in ${validation.daysRemaining} days`);
}next();} catch (error) {
console.error('License check error:', error);// En modo desarrollo, permitir continuar
if (process.env.NODE_ENV === 'development' && process.env.SKIP_LICENSE_CHECK === 'true') {
  console.warn('⚠️  License check skipped (development mode)');
  req.license = { valid: true, development: true };
  return next();
}return res.status(500).json({
  success: false,
  error: 'License validation failed',
  message: error.message
});
}
};/**

Middleware opcional - solo advierte pero no bloquea
*/
const checkSystemLicenseOptional = async (req, res, next) => {
try {
const licenseClient = new LicenseClient();
const validation = await licenseClient.validate();
if (validation.valid) {
  req.license = {
    valid: true,
    features: validation.features,
    expiresAt: validation.expiresAt,
    daysRemaining: validation.daysRemaining
  };
} else {
  req.license = {
    valid: false,
    error: validation.error
  };
  console.warn('License validation warning:', validation.error);
}next();} catch (error) {
req.license = { valid: false, error: error.message };
next();
}
};/**

Middleware para verificar features específicos
*/
const requireFeature = (featureName) => {
return (req, res, next) => {
if (!req.license || !req.license.valid) {
return res.status(403).json({
success: false,
error: 'Valid license required'
});
}
const features = req.license.features;// Verificar si tiene el feature
if (!features[featureName]) {
  return res.status(403).json({
    success: false,
    error: `Feature '${featureName}' not available in your plan`,
    requiresUpgrade: true
  });
}next();
};
};/**

Middleware para verificar límites
*/
const checkClientLimit = async (req, res, next) => {
try {
if (!req.license || !req.license.valid) {
return res.status(403).json({
success: false,
error: 'Valid license required'
});
}
const maxClients = req.license.features.max_clients;// Si es ilimitado (-1), permitir
if (maxClients === -1) {
  return next();
}// Contar clientes actuales
const db = require('../models');
const currentClients = await db.Client.count();if (currentClients >= maxClients) {
  return res.status(403).json({
    success: false,
    error: 'Client limit reached',
    current: currentClients,
    max: maxClients,
    requiresUpgrade: true
  });
}next();} catch (error) {
console.error('Client limit check error:', error);
return res.status(500).json({
success: false,
error: 'Failed to check client limit'
});
}
};module.exports = {
checkSystemLicense,
checkSystemLicenseOptional,
requireFeature,
checkClientLimit
};
