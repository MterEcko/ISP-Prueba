const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authJwt } = require('../../../middleware');
const verifyToken = authJwt.verifyToken;

router.post('/send', verifyToken, controller.sendMessage);
router.post('/send-photo', verifyToken, controller.sendPhoto);
router.post('/send-file', verifyToken, controller.sendFile);
router.get('/status', verifyToken, controller.getStatus);
router.get('/statistics', verifyToken, controller.getStatistics);
router.get('/file-link/:fileId', verifyToken, controller.getFileLink);

module.exports = router;
