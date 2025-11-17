const express = require('express');
const router = express.Router();
const remoteController = require('../controllers/remoteControl.controller');

router.post('/command', remoteController.sendCommand);
router.get('/commands/:installationKey', remoteController.getPendingCommands);
router.put('/commands/:commandId/response', remoteController.updateCommandResponse);

module.exports = router;
