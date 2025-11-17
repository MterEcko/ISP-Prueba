// backend/src/routes/clientSupport.routes.js
// Rutas para historial de soporte a clientes

const clientSupportController = require('../controllers/clientSupport.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // Crear nuevo registro de soporte
  app.post('/api/client-support',
    [authJwt.verifyToken],
    clientSupportController.createSupportRecord
  );

  // Obtener todos los registros de soporte (con filtros opcionales)
  app.get('/api/client-support',
    [authJwt.verifyToken],
    clientSupportController.getAllSupportRecords
  );

  // Obtener registro de soporte por ID
  app.get('/api/client-support/:id',
    [authJwt.verifyToken],
    clientSupportController.getSupportById
  );

  // Actualizar registro de soporte
  app.put('/api/client-support/:id',
    [authJwt.verifyToken],
    clientSupportController.updateSupportRecord
  );

  // Eliminar registro de soporte
  app.delete('/api/client-support/:id',
    [authJwt.verifyToken],
    clientSupportController.deleteSupportRecord
  );

  // Obtener historial de soporte de un cliente específico
  app.get('/api/clients/:clientId/support-history',
    [authJwt.verifyToken],
    clientSupportController.getClientSupportHistory
  );

  // Resolver registro de soporte (endpoint especial)
  app.post('/api/client-support/:id/resolve',
    [authJwt.verifyToken],
    clientSupportController.resolveSupportRecord
  );
};
