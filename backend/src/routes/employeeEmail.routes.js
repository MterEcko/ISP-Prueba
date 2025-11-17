// backend/src/routes/employeeEmail.routes.js
// Rutas para gestión de correos de empleados

const employeeEmailController = require('../controllers/employeeEmail.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // Crear cuenta de correo
  app.post('/api/employee-emails',
    [authJwt.verifyToken],
    employeeEmailController.createEmailAccount
  );

  // Listar todas las cuentas
  app.get('/api/employee-emails',
    [authJwt.verifyToken],
    employeeEmailController.getAllEmailAccounts
  );

  // Obtener cuenta por ID
  app.get('/api/employee-emails/:id',
    [authJwt.verifyToken],
    employeeEmailController.getEmailAccountById
  );

  // Actualizar cuenta
  app.put('/api/employee-emails/:id',
    [authJwt.verifyToken],
    employeeEmailController.updateEmailAccount
  );

  // Eliminar cuenta
  app.delete('/api/employee-emails/:id',
    [authJwt.verifyToken],
    employeeEmailController.deleteEmailAccount
  );

  // Obtener URL del webmail (para abrir en nueva pestaña)
  app.get('/api/employee-emails/:id/webmail',
    [authJwt.verifyToken],
    employeeEmailController.getWebmailUrl
  );

  // Actualizar estadísticas de uso
  app.post('/api/employee-emails/update-stats',
    [authJwt.verifyToken],
    employeeEmailController.updateUsageStats
  );
};
