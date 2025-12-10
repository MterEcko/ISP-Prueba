// backend/src/routes/communicationPlugin.routes.js
const { authJwt } = require("../middleware");
const communicationPluginController = require("../controllers/communicationPlugin.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== GESTIÓN DE CANALES ====================
  
  // IMPORTANTE: Las rutas específicas deben ir ANTES que las genéricas
  
  // Obtener plugins disponibles (DEBE ir antes que /:id)
  app.get(
    "/api/communication-channels/plugins",
    //[authJwt.verifyToken],
    communicationPluginController.getAvailablePlugins
  );

  // Inicializar todos los canales (DEBE ir antes que /:id)
  app.post(
    "/api/communication-channels/initialize",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.initializeAllChannels
  );

  // Obtener todos los canales
  app.get(
    "/api/communication-channels",
    //[authJwt.verifyToken],
    communicationPluginController.getAllChannels
  );

  // Crear nuevo canal
  app.post(
    "/api/communication-channels",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.createChannel
  );

  // Activar/desactivar canal (DEBE ir antes que PUT /:id)
  app.post(
    "/api/communication-channels/:id/activate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.activateChannel
  );

  // Actualizar canal
  app.put(
    "/api/communication-channels/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.updateChannel
  );

  // Eliminar canal
  app.delete(
    "/api/communication-channels/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.deleteChannel
  );

  // ==================== ENVÍO DE MENSAJES ====================

  // RUTAS ESPECÍFICAS PRIMERO
  
  // Enviar mensaje masivo (DEBE ir antes que /send)
  app.post(
    "/api/communication/send-mass",
    //[authJwt.verifyToken, authJwt.checkPermission("send_mass_messages")],
    communicationPluginController.sendMassMessage
  );

  // Enviar mensaje individual
  app.post(
    "/api/communication/send",
    //[authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    communicationPluginController.sendMessage
  );

  // Obtener estado de mensaje
  app.get(
    "/api/communication/status/:logId",
    //[authJwt.verifyToken],
    communicationPluginController.getMessageStatus
  );

  // ==================== HISTORIAL ====================

  // Obtener estadísticas (DEBE ir antes que /history para evitar conflictos)
  app.get(
    "/api/communication/statistics",
    //[authJwt.verifyToken],
    communicationPluginController.getCommunicationStatistics
  );

  // Obtener historial de comunicaciones
  app.get(
    "/api/communication/history",
    //[authJwt.verifyToken],
    communicationPluginController.getCommunicationHistory
  );

  // ==================== MENSAJES PROGRAMADOS ====================

  // Procesar mensajes programados (DEBE ir antes que /scheduled)
  app.post(
    "/api/communication/process-scheduled",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.processScheduledMessages
  );

  // Obtener mensajes programados
  app.get(
    "/api/communication/scheduled",
    //[authJwt.verifyToken],
    communicationPluginController.getScheduledMessages
  );

  // Programar mensaje
  app.post(
    "/api/communication/schedule",
    //[authJwt.verifyToken, authJwt.checkPermission("schedule_messages")],
    communicationPluginController.scheduleMessage
  );

  // Cancelar mensaje programado
  app.delete(
    "/api/communication/scheduled/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_communication")],
    communicationPluginController.cancelScheduledMessage
  );

  // ==================== RECORDATORIOS AUTOMÁTICOS ====================

  // Enviar recordatorio de pago
  app.post(
    "/api/communication/payment-reminder",
    //[authJwt.verifyToken, authJwt.checkPermission("send_payment_reminders")],
    communicationPluginController.sendPaymentReminder
  );

  // Enviar mensaje de bienvenida
  app.post(
    "/api/communication/welcome",
    //[authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    communicationPluginController.sendWelcomeMessage
  );

  // Notificar suspensión
  app.post(
    "/api/communication/suspension",
    //[authJwt.verifyToken, authJwt.checkPermission("send_service_notifications")],
    communicationPluginController.sendSuspensionNotification
  );

  // Notificar reactivación
  app.post(
    "/api/communication/reactivation",
    //[authJwt.verifyToken, authJwt.checkPermission("send_service_notifications")],
    communicationPluginController.sendReactivationNotification
  );

  // ==================== WEBHOOKS ====================

  // Webhook genérico (sin autenticación para webhooks externos)
  // DEBE ir al final para evitar conflictos con otras rutas
  app.post(
    "/api/communication/webhook/:channelType",
    communicationPluginController.handleWebhook
  );
};