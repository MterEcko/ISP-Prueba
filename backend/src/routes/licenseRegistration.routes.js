// backend/src/routes/licenseRegistration.routes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseRegistration.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rutas públicas (sin autenticación para permitir registro inicial)
router.get('/system/hardware-info', licenseController.getHardwareInfo);
router.post('/system-licenses/validate-key', licenseController.validateLicenseKey);
router.post('/system-licenses/register-company', licenseController.registerCompanyAndLicense);
router.post('/system-licenses/verify', licenseController.validateLicenseKey);  // Alias para verify

// Rutas protegidas (requieren autenticación)
router.get('/system-licenses/current', authenticate, licenseController.getCurrentLicense);
router.post('/system-licenses/force-validation', authenticate, licenseController.forceValidation);
router.post('/system-licenses/update-hardware', authenticate, licenseController.updateHardwareInfo);

module.exports = router;
