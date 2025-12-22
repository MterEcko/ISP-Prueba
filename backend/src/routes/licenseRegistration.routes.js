// backend/src/routes/licenseRegistration.routes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseRegistration.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rutas públicas (sin autenticación para permitir registro inicial)
router.get('/system/hardware-info', licenseController.getHardwareInfo);
router.post('/system-licenses/validate-key', licenseController.validateLicenseKey);
router.post('/system-licenses/register-company', licenseController.registerCompanyAndLicense);

// Las siguientes rutas YA están en systemLicense.routes.js con integración Store:
// - /api/system-licenses/verify (usa validateLicenseKey)
// - /api/system-licenses/current (usa getCurrentLicense)
// - /api/system-licenses/activate (usa registerCompanyAndLicense)

// Rutas protegidas adicionales
router.post('/system-licenses/force-validation', authenticate, licenseController.forceValidation);
router.post('/system-licenses/update-hardware', authenticate, licenseController.updateHardwareInfo);

module.exports = router;
