// backend/src/routes/payment.routes.js
const { authJwt } = require("../middleware");
const paymentController = require("../controllers/payment.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== RUTAS DE PAGOS ====================

  /**
   * @route    GET /api/payments
   * @desc     Obtener todos los pagos con filtros y paginación
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payments",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getAllPayments
  );

  /**
   * @route    GET /api/payments/statistics
   * @desc     Obtener estadísticas de pagos
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payments/statistics",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getPaymentStatistics
  );

  /**
   * @route    POST /api/payments/process
   * @desc     Procesar pago con plugin específico
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/payments/process",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.processPayment
  );

  /**
   * @route    POST /api/payments/reconcile
   * @desc     Conciliar pagos pendientes
   * @access   Privado (Admin)
   */
  app.post(
    "/api/payments/reconcile",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.reconcilePayments
  );

  /**
   * @route    POST /api/payments/webhook/:gateway
   * @desc     Manejar webhook genérico de pasarelas
   * @access   Público (verificación interna por firma)
   */
  app.post(
    "/api/payments/webhook/:gateway",
    paymentController.handleWebhook
  );

  /**
   * @route    GET /api/payments/:id
   * @desc     Obtener pago por ID
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payments/:id",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getPaymentById
  );

  /**
   * @route    POST /api/payments
   * @desc     Crear nuevo pago
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/payments",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.createPayment
  );

  /**
   * @route    POST /api/payments/:id/confirm
   * @desc     Confirmar pago pendiente
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/payments/:id/confirm",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.confirmPayment
  );

  /**
   * @route    PUT /api/payments/:id
   * @desc     Actualizar pago
   * @access   Privado (Admin, Facturación)
   */
  app.put(
    "/api/payments/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.updatePayment
  );

  /**
   * @route    DELETE /api/payments/:id
   * @desc     Eliminar pago
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/payments/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.deletePayment
  );

  // ==================== RUTAS DE PASARELAS DE PAGO ====================

  /**
   * @route    GET /api/payment-gateways
   * @desc     Obtener todas las pasarelas de pago
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payment-gateways",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getAllGateways
  );

  /**
   * @route    GET /api/payment-gateways/plugins
   * @desc     Obtener plugins disponibles
   * @access   Privado (Admin)
   */
  app.get(
    "/api/payment-gateways/plugins",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.getAvailablePlugins
  );

  /**
   * @route    GET /api/payment-gateways/:id/stats
   * @desc     Obtener estadísticas de pasarela específica
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payment-gateways/:id/stats",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getGatewayStatistics
  );

  /**
   * @route    POST /api/payment-gateways
   * @desc     Crear nueva pasarela de pago
   * @access   Privado (Admin)
   */
  app.post(
    "/api/payment-gateways",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.createGateway
  );

  /**
   * @route    POST /api/payment-gateways/:id/activate
   * @desc     Activar/desactivar pasarela
   * @access   Privado (Admin)
   */
  app.post(
    "/api/payment-gateways/:id/activate",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.activateGateway
  );

  /**
   * @route    PUT /api/payment-gateways/:id
   * @desc     Actualizar pasarela de pago
   * @access   Privado (Admin)
   */
  app.put(
    "/api/payment-gateways/:id",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.updateGateway
  );

  // ==================== RUTAS DE RECORDATORIOS DE PAGO ====================

  /**
   * @route    GET /api/payment-reminders
   * @desc     Obtener todos los recordatorios
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payment-reminders",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getAllReminders
  );

  /**
   * @route    GET /api/payment-reminders/history
   * @desc     Obtener historial de recordatorios
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/payment-reminders/history",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    paymentController.getReminderHistory
  );

  /**
   * @route    POST /api/payment-reminders
   * @desc     Crear recordatorio manual
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/payment-reminders",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.createReminder
  );

  /**
   * @route    POST /api/payment-reminders/:id/send
   * @desc     Enviar recordatorio específico
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/payment-reminders/:id/send",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.sendReminder
  );

  /**
   * @route    POST /api/payment-reminders/schedule
   * @desc     Programar recordatorios automáticos
   * @access   Privado (Admin)
   */
  app.post(
    "/api/payment-reminders/schedule",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    paymentController.scheduleReminders
  );
};