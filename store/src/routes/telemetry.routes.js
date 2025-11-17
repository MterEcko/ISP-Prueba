const express = require('express');
const router = express.Router();
const telemetryController = require('../controllers/telemetry.controller');

router.post('/event', telemetryController.recordEvent);
router.post('/metrics', telemetryController.recordMetrics);
router.post('/location', telemetryController.recordLocation);
router.get('/installation/:installationKey', telemetryController.getInstallationTelemetry);

module.exports = router;
