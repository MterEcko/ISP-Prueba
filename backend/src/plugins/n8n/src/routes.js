const express = require('express');
const router = express.Router();
const n8nPlugin = require('./index');

// Obtener todos los workflows
router.get('/workflows', (req, res) => n8nPlugin.getWorkflows(req, res));

// Obtener un workflow específico
router.get('/workflows/:id', (req, res) => n8nPlugin.getWorkflow(req, res));

// Ejecutar un workflow
router.post('/workflows/:id/execute', (req, res) => n8nPlugin.executeWorkflow(req, res));

// Webhook handler
router.post('/webhook/:workflowId', (req, res) => n8nPlugin.handleWebhook(req, res));

module.exports = router;
