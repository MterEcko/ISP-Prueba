// backend/src/routes/clientAuth.routes.js
const express = require('express');
const router = express.Router();
const clientAuthController = require('../controllers/clientAuth.controller');
const clientAuthMiddleware = require('../middleware/clientAuth.middleware');
const authMiddleware = require('../middleware/auth.middleware'); // Para admin generar credenciales

/**
 * Rutas públicas (sin autenticación)
 */

// Login de cliente
router.post('/login', clientAuthController.login);

/**
 * Rutas protegidas (requieren autenticación de cliente)
 */

// Perfil del cliente
router.get('/profile', clientAuthMiddleware, clientAuthController.getProfile);
router.put('/profile', clientAuthMiddleware, clientAuthController.updateProfile);

// Cambio de contraseña
router.put('/change-password', clientAuthMiddleware, clientAuthController.changePassword);

/**
 * Rutas de administración (requieren autenticación de admin/empleado)
 */

// Generar credenciales para un cliente (solo admin)
router.post('/generate-credentials/:clientId', authMiddleware, clientAuthController.generateClientCredentials);

module.exports = router;
