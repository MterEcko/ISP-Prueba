// backend/src/routes/reminders.routes.js
const { authJwt } = require("../middleware");
const remindersController = require("../controllers/reminders.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ========================================
  // ENVÍO MANUAL DE MENSAJES
  // ========================================

  /**
   * @route    POST /api/reminders/send-sms
   * @desc     Enviar SMS manual
   * @access   Privado (Admin/Manager)
   * @body     to - Número de teléfono (formato E.164)
   * @body     message - Contenido del mensaje
   */
  app.post(
    "/api/reminders/send-sms",
    [authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    remindersController.sendSMS
  );

  /**
   * @route    POST /api/reminders/send-whatsapp
   * @desc     Enviar WhatsApp manual
   * @access   Privado (Admin/Manager)
   * @body     to - Número de teléfono (formato E.164)
   * @body     message - Contenido del mensaje
   */
  app.post(
    "/api/reminders/send-whatsapp",
    [authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    remindersController.sendWhatsApp
  );

  // ========================================
  // RECORDATORIOS ESPECÍFICOS
  // ========================================

  /**
   * @route    POST /api/reminders/payment-reminder/:invoiceId
   * @desc     Enviar recordatorio de pago para una factura específica
   * @access   Privado (Admin/Manager)
   * @params   invoiceId - ID de la factura
   */
  app.post(
    "/api/reminders/payment-reminder/:invoiceId",
    [authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    remindersController.sendPaymentReminder
  );

  /**
   * @route    POST /api/reminders/overdue-reminder/:invoiceId
   * @desc     Enviar recordatorio de factura vencida
   * @access   Privado (Admin/Manager)
   * @params   invoiceId - ID de la factura
   */
  app.post(
    "/api/reminders/overdue-reminder/:invoiceId",
    [authJwt.verifyToken, authJwt.checkPermission("send_messages")],
    remindersController.sendOverdueReminder
  );

  // ========================================
  // PROCESO AUTOMÁTICO
  // ========================================

  /**
   * @route    POST /api/reminders/process-automatic
   * @desc     Ejecutar proceso de recordatorios automáticos manualmente
   * @access   Privado (Admin)
   * @note     Normalmente se ejecuta automáticamente vía cron diariamente a las 9:00 AM
   */
  app.post(
    "/api/reminders/process-automatic",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    remindersController.processAutomaticReminders
  );

  // ========================================
  // ESTADÍSTICAS Y CONSULTAS
  // ========================================

  /**
   * @route    GET /api/reminders/stats
   * @desc     Obtener estadísticas de mensajería
   * @access   Privado (Admin/Manager)
   * @query    days - Número de días para estadísticas (default: 30)
   */
  app.get(
    "/api/reminders/stats",
    [authJwt.verifyToken, authJwt.checkPermission("view_reports")],
    remindersController.getMessagingStats
  );

  /**
   * @route    GET /api/reminders/messages
   * @desc     Obtener historial de mensajes enviados
   * @access   Privado (Admin/Manager)
   * @query    limit - Límite de resultados (default: 50)
   * @query    offset - Offset para paginación (default: 0)
   * @query    type - Filtrar por tipo (sms, whatsapp, email)
   * @query    status - Filtrar por estado (sent, failed, pending)
   * @query    clientId - Filtrar por ID de cliente
   */
  app.get(
    "/api/reminders/messages",
    [authJwt.verifyToken, authJwt.checkPermission("view_reports")],
    remindersController.getMessagesLog
  );

  /**
   * @route    GET /api/reminders/service-status
   * @desc     Verificar estado del servicio de Twilio
   * @access   Privado (Admin)
   */
  app.get(
    "/api/reminders/service-status",
    [authJwt.verifyToken, authJwt.checkPermission("manage_system")],
    remindersController.getServiceStatus
  );
};
