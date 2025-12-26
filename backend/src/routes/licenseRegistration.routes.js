// backend/src/routes/licenseRegistration.routes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseRegistration.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Rutas públicas (sin autenticación para permitir registro inicial)
router.get('/system/hardware-info', licenseController.getHardwareInfo);

// NOTA: Las siguientes rutas YA están en systemLicense.routes.js:
// - POST /api/system-licenses/validate-key (usa validateLicenseKey)
// - POST /api/system-licenses/register-company (usa registerCompanyAndLicense)
// - POST /api/system-licenses/verify (usa validateLicenseKey)
// - GET /api/system-licenses/current (usa getCurrentLicense)
// - POST /api/system-licenses/activate (usa registerCompanyAndLicense)

// Rutas protegidas adicionales (no duplicadas)
router.post('/licenses/force-validation', verifyToken, licenseController.forceValidation);
router.post('/licenses/update-hardware', verifyToken, licenseController.updateHardwareInfo);

module.exports = router;
