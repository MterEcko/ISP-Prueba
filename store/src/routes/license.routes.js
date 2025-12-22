const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');

router.post('/generate', licenseController.generateLicense);
router.post('/activate', licenseController.activateLicense);
router.post('/register', licenseController.registerLicense);
router.post('/verify', licenseController.verifyLicense);
router.post('/validate', licenseController.verifyLicense); // Alias para validate
router.get('/:licenseKey', licenseController.getLicense);
router.put('/:licenseKey/revoke', licenseController.revokeLicense);
router.get('/', licenseController.getAllLicenses);

module.exports = router;
