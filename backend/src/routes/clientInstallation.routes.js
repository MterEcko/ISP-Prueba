// backend/src/routes/clientInstallation.routes.js
// Rutas para gestión de instalaciones de clientes

const clientInstallationController = require('../controllers/clientInstallation.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // Crear nueva instalación
  app.post('/api/client-installations',
    [authJwt.verifyToken],
    clientInstallationController.createInstallation
  );

  // Obtener todas las instalaciones (con filtros opcionales)
  app.get('/api/client-installations',
    [authJwt.verifyToken],
    clientInstallationController.getAllInstallations
  );

  // Obtener instalación por ID
  app.get('/api/client-installations/:id',
    [authJwt.verifyToken],
    clientInstallationController.getInstallationById
  );

  // Actualizar instalación
  app.put('/api/client-installations/:id',
    [authJwt.verifyToken],
    clientInstallationController.updateInstallation
  );

  // Eliminar instalación
  app.delete('/api/client-installations/:id',
    [authJwt.verifyToken],
    clientInstallationController.deleteInstallation
  );

  // Completar instalación (endpoint especial)
  app.post('/api/client-installations/:id/complete',
    [authJwt.verifyToken],
    clientInstallationController.completeInstallation
  );
};
