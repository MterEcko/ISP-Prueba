const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { verifyToken } = require('../../../middleware/auth');

router.post('/create-user', verifyToken, controller.createUser);
router.post('/assign-libraries', verifyToken, controller.assignLibraries);
router.post('/suspend-user', verifyToken, controller.suspendUser);
router.post('/activate-user', verifyToken, controller.activateUser);
router.delete('/delete-user/:userId', verifyToken, controller.deleteUser);
router.get('/libraries', verifyToken, controller.getLibraries);
router.get('/statistics', verifyToken, controller.getStatistics);
router.get('/status', verifyToken, controller.getStatus);
router.post('/test', verifyToken, controller.testConnection);

module.exports = router;
