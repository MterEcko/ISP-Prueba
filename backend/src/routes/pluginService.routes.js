// backend/src/routes/pluginService.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/pluginService.controller');
const { authJwt } = require('../middleware');

// Obtener todos los servicios de plugins disponibles
router.get('/available', authJwt.verifyToken, controller.getAvailableServices);

// Obtener configuración de un servicio específico
router.get('/:pluginName', authJwt.verifyToken, controller.getServiceConfig);

// Validar configuración de un servicio
router.post('/validate', authJwt.verifyToken, controller.validateServiceConfig);

module.exports = router;
