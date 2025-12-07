// backend/src/plugins/whatsapp-twilio/src/routes.js
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyToken } = require('../../../middleware/auth');

// Webhook público (sin autenticación)
router.post('/webhook', controller.handleWebhook);

// Rutas protegidas
router.post('/send', verifyToken, controller.sendMessage);
router.post('/send-bulk', verifyToken, controller.sendBulkMessages);
router.post('/test', verifyToken, controller.testConnection);
router.get('/status', verifyToken, controller.getStatus);
router.get('/statistics', verifyToken, controller.getStatistics);
router.get('/message/:messageSid', verifyToken, controller.getMessageStatus);

module.exports = router;
