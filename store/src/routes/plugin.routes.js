const express = require('express');
const router = express.Router();
const pluginController = require('../controllers/plugin.controller');

// Rutas de plugins
router.get('/plugins', pluginController.getAllPlugins);
router.get('/plugins/:id', pluginController.getPlugin);
router.post('/plugins/:id/download', pluginController.downloadPlugin);
router.post('/plugins/:id/activate', pluginController.activatePlugin);
router.post('/plugins', pluginController.createPlugin);

// Alias legacy (por si acaso)
router.get('/', pluginController.getAllPlugins);
router.get('/:id', pluginController.getPlugin);

module.exports = router;
