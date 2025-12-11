// backend/src/routes/licenseRegistration.routes.js
const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseRegistration.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Rutas públicas (sin autenticación para permitir registro inicial)
router.get('/system/hardware-info', licenseController.getHardwareInfo);
router.post('/licenses/validate-key', licenseController.validateLicenseKey);
router.post('/licenses/register-company', licenseController.registerCompanyAndLicense);

// Rutas protegidas (requieren autenticación)
router.get('/licenses/current', authenticate, licenseController.getCurrentLicense);
router.post('/licenses/force-validation', authenticate, licenseController.forceValidation);
router.post('/licenses/update-hardware', authenticate, licenseController.updateHardwareInfo);

module.exports = router;
