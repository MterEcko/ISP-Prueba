const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authJwt } = require('../../../middleware');
const verifyToken = authJwt.verifyToken;

router.get('/webhook', controller.verifyWebhook);
router.post('/webhook', controller.handleWebhook);

router.post('/send', verifyToken, controller.sendMessage);
router.post('/send-template', verifyToken, controller.sendTemplate);
router.post('/send-interactive', verifyToken, controller.sendInteractiveMessage);
router.post('/send-bulk', verifyToken, controller.sendBulkMessages);
router.post('/test', verifyToken, controller.testConnection);
router.get('/status', verifyToken, controller.getStatus);
router.get('/statistics', verifyToken, controller.getStatistics);

module.exports = router;
