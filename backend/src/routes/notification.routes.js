
// backend/src/routes/notification.routes.js
const { authJwt } = require("../middleware");
const notificationController = require("../controllers/notification.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== REGLAS DE NOTIFICACIÓN ====================

  // Obtener todas las reglas
  app.get(
    "/api/notification-rules",
    //[authJwt.verifyToken],
    notificationController.getAllRules
  );

  // Obtener regla por ID
  app.get(
    "/api/notification-rules/:id",
    //[authJwt.verifyToken],
    notificationController.getRuleById
  );

  // Crear nueva regla
  app.post(
    "/api/notification-rules",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.createRule
  );

  // Actualizar regla
  app.put(
    "/api/notification-rules/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.updateRule
  );

  // Eliminar regla
  app.delete(
    "/api/notification-rules/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.deleteRule
  );

  // Activar/desactivar regla
  app.post(
    "/api/notification-rules/:id/toggle",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.toggleRule
  );

  // Probar regla
  app.post(
    "/api/notification-rules/:id/test",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.testRule
  );

  // ==================== EVENTOS DE COMUNICACIÓN ====================

  // Obtener eventos
  app.get(
    "/api/communication-events",
    //[authJwt.verifyToken],
    notificationController.getEvents
  );

  // Crear evento manual
  app.post(
    "/api/communication-events",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.createEvent
  );

  // Procesar eventos pendientes
  app.post(
    "/api/communication-events/process",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_notifications")],
    notificationController.processEvents
  );

  // ==================== CONTACTOS DE COMUNICACIÓN ====================

  // Obtener contactos de cliente
  app.get(
    "/api/clients/:clientId/contacts",
    //[authJwt.verifyToken],
    notificationController.getClientContacts
  );

  // Crear contacto para cliente
  app.post(
    "/api/clients/:clientId/contacts",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    notificationController.createClientContact
  );

  // Actualizar contacto
  app.put(
    "/api/contacts/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    notificationController.updateContact
  );

  // Eliminar contacto
  app.delete(
    "/api/contacts/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    notificationController.deleteContact
  );

  // Verificar contacto
  app.post(
    "/api/contacts/:id/verify",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_clients")],
    notificationController.verifyContact
  );

  // Actualizar preferencias de contacto
  app.put(
    "/api/contacts/:id/preferences",
    //[authJwt.verifyToken],
    notificationController.updateContactPreferences
  );
};