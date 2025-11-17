const express = require('express');
const router = express.Router();
const n8nController = require('../controllers/n8n.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Webhook endpoint - NO requiere autenticación (usa API key en header)
router.post('/webhook', n8nController.webhook);

// Rutas protegidas
router.use(authenticate);

// Workflows CRUD
router.get('/workflows', n8nController.getWorkflows);
router.post('/workflows', n8nController.createWorkflow);
router.put('/workflows/:id', n8nController.updateWorkflow);
router.delete('/workflows/:id', n8nController.deleteWorkflow);

// Test connection
router.get('/test-connection', n8nController.testConnection);

// Trigger workflow manually
router.post('/trigger', n8nController.triggerWorkflow);

module.exports = router;
