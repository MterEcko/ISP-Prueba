const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/plugin.controller');

router.get('/', pluginController.getAllPlugins);
router.get('/:id', pluginController.getPlugin);
router.post('/:id/download', pluginController.downloadPlugin);
router.post('/', pluginController.createPlugin);

module.exports = router;
