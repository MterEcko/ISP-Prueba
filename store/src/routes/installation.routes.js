const express = require('express');
const router = express.Router();
const installationController = require('../controllers/installation.controller');

router.post('/register', installationController.registerInstallation);
router.post('/heartbeat', installationController.heartbeat);
router.get('/:installationKey', installationController.getInstallation);
router.put('/:installationKey/block', installationController.blockInstallation);
router.put('/:installationKey/unblock', installationController.unblockInstallation);
router.get('/', installationController.getAllInstallations);

module.exports = router;
