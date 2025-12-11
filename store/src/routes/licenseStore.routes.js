const express = require('express');
const router = express.Router();
const licenseStoreController = require('../controllers/licenseStore.controller');

// Registro y validación
router.post('/register', licenseStoreController.registerLicense);
router.post('/validate', licenseStoreController.validateLicense);

// Gestión de hardware y métricas
router.put('/:licenseKey/hardware', licenseStoreController.updateHardware);
router.post('/:licenseKey/metrics', licenseStoreController.reportMetrics);

// Suspensión y reactivación
router.post('/:licenseKey/suspend', licenseStoreController.suspendLicense);
router.post('/:licenseKey/reactivate', licenseStoreController.reactivateLicense);

module.exports = router;
