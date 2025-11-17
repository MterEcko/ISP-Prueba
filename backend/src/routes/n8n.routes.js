const n8nController = require('../controllers/n8n.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // === N8N WORKFLOWS ===
  app.get('/api/n8n/workflows', [authJwt.verifyToken], n8nController.getWorkflows);
  app.post('/api/n8n/workflows', [authJwt.verifyToken], n8nController.createWorkflow);
  app.put('/api/n8n/workflows/:id', [authJwt.verifyToken], n8nController.updateWorkflow);
  app.delete('/api/n8n/workflows/:id', [authJwt.verifyToken], n8nController.deleteWorkflow);
  app.post('/api/n8n/workflows/:id/trigger', [authJwt.verifyToken], n8nController.triggerWorkflow);
  
  // === N8N WEBHOOK (sin autenticación para que n8n pueda llamarlo) ===
  app.post('/api/n8n/webhook', n8nController.webhook);
  
  // === N8N TEST ===
  app.get('/api/n8n/test-connection', [authJwt.verifyToken], n8nController.testConnection);
};
