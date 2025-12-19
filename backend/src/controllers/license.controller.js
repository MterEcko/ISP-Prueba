// isp-system/backend/src/controllers/license.controller.js
const LicenseClient = require('../services/licenseClient');
const PluginLicenseValidator = require('../services/pluginLicenseValidator');
const db = require('../models');
/**

Obtener información de la licencia
*/
exports.getLicenseInfo = async (req, res) => {
try {
const licenseClient = new LicenseClient();
const validation = await licenseClient.validate();
if (!validation.valid) {
return res.status(200).json({
success: true,
license: {
activated: false,
valid: false,
error: validation.error
}
});
}
return res.status(200).json({
success: true,
license: {
activated: true,
valid: true,
key: validation.license.key.substring(0, 9) + '...',
planId: validation.license.planId,
status: validation.license.status,
expiresAt: validation.expiresAt,
daysRemaining: validation.daysRemaining,
features: validation.features,
offline: validation.offline
}
});

} catch (error) {
console.error('Error getting license info:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Activar licencia
*/
exports.activateLicense = async (req, res) => {
try {
const { licenseKey } = req.body;
if (!licenseKey) {
return res.status(400).json({
success: false,
message: 'License key is required'
});
}
const licenseClient = new LicenseClient();
const result = await licenseClient.activate(licenseKey);
if (!result.success) {
return res.status(400).json({
success: false,
message: result.error
});
}
return res.status(200).json({
success: true,
message: 'License activated successfully',
license: {
planId: result.license.planId,
expiresAt: result.license.expiresAt
}
});

} catch (error) {
console.error('Error activating license:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Validar licencia manualmente
*/
exports.validateLicense = async (req, res) => {
try {
const licenseClient = new LicenseClient();
// Limpiar cache para forzar validación online
licenseClient.cachedValidation = null;
licenseClient.cacheExpiry = null;
const validation = await licenseClient.validate();
return res.status(200).json({
success: true,
validation: {
valid: validation.valid,
error: validation.error,
offline: validation.offline,
expiresAt: validation.expiresAt,
daysRemaining: validation.daysRemaining
}
});

} catch (error) {
console.error('Error validating license:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Obtener features del plan
*/
exports.getFeatures = async (req, res) => {
try {
if (!req.license || !req.license.valid) {
return res.status(403).json({
success: false,
message: 'Valid license required'
});
}
return res.status(200).json({
success: true,
features: req.license.features
});

} catch (error) {
console.error('Error getting features:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Solicitar cambio de hardware
*/
exports.requestHardwareChange = async (req, res) => {
try {
const { reason } = req.body;
const licenseClient = new LicenseClient();
const localLicense = await licenseClient.loadLicenseLocally();
if (!localLicense) {
return res.status(400).json({
success: false,
message: 'No license found'
});
}
const axios = require('axios');
const response = await axios.post(
${process.env.STORE_API_URL}/licenses/hardware-change/request,
{
licenseKey: localLicense.key,
new_hardwareId: licenseClient.hardwareId,
reason: reason || 'Hardware upgrade'
}
);
return res.status(200).json({
success: true,
message: 'Hardware change request submitted',
requestId: response.data.requestId
});

} catch (error) {
console.error('Error requesting hardware change:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Listar licencias de plugins
*/
exports.getPluginLicenses = async (req, res) => {
try {
const licenses = await db.PluginLicense.findAll({
where: { status: 'active' }
});
return res.status(200).json({
success: true,
licenses: licenses.map(l => ({
pluginId: l.plugin_id,
licenseKey: l.licenseKey.substring(0, 10) + '...',
status: l.status,
expiresAt: l.expires_at,
daysRemaining: l.daysRemaining(),
active: l.isActive()
}))
});

} catch (error) {
console.error('Error getting plugin licenses:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Activar licencia de plugin
*/
exports.activatePluginLicense = async (req, res) => {
try {
const { pluginId, licenseKey } = req.body;
if (!pluginId || !licenseKey) {
return res.status(400).json({
success: false,
message: 'Plugin ID and license key are required'
});
}
const validator = new PluginLicenseValidator();
const result = await validator.activatePluginLicense(pluginId, licenseKey);
if (!result.success) {
return res.status(400).json({
success: false,
message: result.error
});
}
return res.status(200).json({
success: true,
message: 'Plugin license activated successfully'
});

} catch (error) {
console.error('Error activating plugin license:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Desactivar licencia de plugin
*/
exports.deactivatePluginLicense = async (req, res) => {
try {
const { pluginId } = req.params;
await db.PluginLicense.update(
{ status: 'inactive' },
{ where: { plugin_id: pluginId } }
);
return res.status(200).json({
success: true,
message: 'Plugin license deactivated'
});

} catch (error) {
console.error('Error deactivating plugin license:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
/**

Estadísticas de uso vs límites
*/
exports.getLicenseStats = async (req, res) => {
try {
if (!req.license || !req.license.valid) {
return res.status(403).json({
success: false,
message: 'Valid license required'
});
}
const features = req.license.features;
// Contar clientes
const clientCount = await db.Client.count();
// Contar plugins
const pluginCount = await db.SystemPlugin.count({
where: { active: true }
});
const stats = {
clients: {
current: clientCount,
max: features.max_clients,
unlimited: features.max_clients === -1,
percentage: features.max_clients === -1 ? 0 :
(clientCount / features.max_clients * 100).toFixed(2)
},
plugins: {
current: pluginCount,
max: features.max_plugins,
unlimited: features.max_plugins === -1,
percentage: features.max_plugins === -1 ? 0 :
(pluginCount / features.max_plugins * 100).toFixed(2)
},
license: {
expiresAt: req.license.expiresAt,
daysRemaining: req.license.daysRemaining
}
};
return res.status(200).json({
success: true,
stats
});

} catch (error) {
console.error('Error getting license stats:', error);
return res.status(500).json({
success: false,
message: error.message
});
}
};
</artifact>
<artifact identifier="encryption-utils" type="application/vnd.ant.code" language="javascript" title="encryption.js">
// isp-system/backend/src/utils/encryption.js
const crypto = require('crypto');
class EncryptionUtil {
constructor(key = null) {
// Usar clave del ambiente o generar basada en hardware ID
this.algorithm = 'aes-256-cbc';
this.key = key || this.deriveKey(process.env.ENCRYPTION_KEY || 'default-key');
}
/**

Derivar clave de 32 bytes desde una string
*/
deriveKey(password) {
return crypto.scryptSync(password, 'salt', 32);
}

/**

Cifrar texto
*/
encrypt(text) {
try {
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
let encrypted = cipher.update(text, 'utf8', 'hex');
encrypted += cipher.final('hex');
// Retornar IV + encrypted
return iv.toString('hex') + ':' + encrypted;
} catch (error) {
throw new Error(Encryption failed: ${error.message});
}
}

/**

Descifrar texto
*/
decrypt(encryptedText) {
try {
const parts = encryptedText.split(':');
const iv = Buffer.from(parts[0], 'hex');
const encrypted = parts[1];
const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');
return decrypted;
} catch (error) {
throw new Error(Decryption failed: ${error.message});
}
}

/**

Hash de un valor (one-way)
*/
hash(text) {
return crypto
.createHash('sha256')
.update(text)
.digest('hex');
}

/**

Generar token aleatorio
*/
generateToken(length = 32) {
return crypto.randomBytes(length).toString('hex');
}

/**

Comparar hash
*/
compareHash(text, hash) {
return this.hash(text) === hash;
}
}

// Instancia singleton
let instance = null;
module.exports = {
getInstance: (key = null) => {
if (!instance) {
instance = new EncryptionUtil(key);
}
return instance;
},
EncryptionUtil
};
