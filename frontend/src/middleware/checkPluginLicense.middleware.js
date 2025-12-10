
// isp-system/backend/src/middleware/checkPluginLicense.middleware.js
const PluginLicenseValidator = require('../services/pluginLicenseValidator');
/**

Middleware para verificar si se puede instalar un plugin
*/
const canInstallPlugin = (pluginId) => {
return async (req, res, next) => {
try {
const validator = new PluginLicenseValidator();
const check = await validator.canInstallPlugin(pluginId || req.body.pluginId);
if (!check.allowed) {
return res.status(403).json({
success: false,
error: check.reason,
requiresPurchase: check.requiresPurchase,
requiresUpgrade: check.requiresUpgrade,
details: {
current: check.current,
max: check.max
}
});
}
// Agregar info al request
req.pluginLicense = {
allowed: true,
included: check.included,
hasPluginLicense: check.hasPluginLicense
};
next();
} catch (error) {
console.error('Plugin license check error:', error);
return res.status(500).json({
success: false,
error: 'Failed to verify plugin license'
});
}
};
};

/**

Middleware para verificar licencia de plugin específico
*/
const checkPluginLicense = (pluginId) => {
return async (req, res, next) => {
try {
const validator = new PluginLicenseValidator();
const pluginLicense = await validator.getPluginLicense(pluginId || req.params.pluginId);
if (!pluginLicense || !pluginLicense.valid) {
return res.status(403).json({
success: false,
error: 'Plugin license required',
expired: pluginLicense?.expired || false,
requiresPurchase: true
});
}
req.pluginLicense = pluginLicense;
next();
} catch (error) {
console.error('Plugin license validation error:', error);
return res.status(500).json({
success: false,
error: 'Failed to validate plugin license'
});
}
};
};

/**

Middleware para verificar límite de plugins
*/
const checkPluginLimit = async (req, res, next) => {
try {
// Verificar licencia del sistema primero
if (!req.license || !req.license.valid) {
return res.status(403).json({
success: false,
error: 'Valid system license required'
});
}
const maxPlugins = req.license.features.max_plugins;
// Si es ilimitado, permitir
if (maxPlugins === -1) {
return next();
}
// Contar plugins instalados
const db = require('../models');
const currentPlugins = await db.SystemPlugin.count({
where: { active: true }
});
if (currentPlugins >= maxPlugins) {
return res.status(403).json({
success: false,
error: 'Plugin limit reached',
current: currentPlugins,
max: maxPlugins,
requiresUpgrade: true
});
}
next();

} catch (error) {
console.error('Plugin limit check error:', error);
return res.status(500).json({
success: false,
error: 'Failed to check plugin limit'
});
}
};
module.exports = {
canInstallPlugin,
checkPluginLicense,
checkPluginLimit
};
