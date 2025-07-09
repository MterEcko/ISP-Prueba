// backend/src/routes/manual.payment.routes.js
const { authJwt } = require("../middleware");
const manualPaymentController = require("../controllers/manual.payment.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== RUTAS DE PAGOS MANUALES ====================

  /**
   * @route    POST /api/manual-payments
   * @desc     Registrar pago manual por operador
   * @access   Privado (Técnico, Call Center, Admins)
   * @permission manage_billing (todos pueden registrar)
   */
  app.post(
    "/api/manual-payments",
    [authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    manualPaymentController.submitManualPayment
  );

  /**
   * @route    GET /api/manual-payments/pending
   * @desc     Obtener pagos pendientes de aprobación
   * @access   Privado (Solo roles con permisos de aprobación)
   * @permission approve_payments (permisos específicos por rol)
   */
  app.get(
    "/api/manual-payments/pending",
    [
      authJwt.verifyToken, 
      authJwt.checkMultiplePermissions(["approve_payments", "manage_billing"])
    ],
    manualPaymentController.getPendingManualPayments
  );

  /**
   * @route    GET /api/manual-payments/statistics
   * @desc     Obtener estadísticas de pagos manuales
   * @access   Privado (Admin, Supervisores)
   * @permission view_billing_reports
   */
  app.get(
    "/api/manual-payments/statistics",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing_reports")],
    manualPaymentController.getManualPaymentStatistics
  );

  /**
   * @route    GET /api/manual-payments/admin/summary
   * @desc     Resumen para administradores (pendientes, aprobados hoy, etc.)
   * @access   Privado (Admin, Supervisores)
   * @permission view_billing_reports
   */
  app.get(
    "/api/manual-payments/admin/summary",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing_reports")],
    manualPaymentController.getAdminSummary
  );

  /**
   * @route    GET /api/manual-payments/:id
   * @desc     Obtener detalles de un pago manual específico
   * @access   Privado (Técnico, Call Center, Admins)
   * @permission view_billing
   */
  app.get(
    "/api/manual-payments/:id",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    manualPaymentController.getManualPaymentDetails
  );

  /**
   * @route    GET /api/manual-payments/:id/receipt
   * @desc     Descargar comprobante de pago
   * @access   Privado (Técnico, Call Center, Admins)
   * @permission view_billing
   */
  app.get(
    "/api/manual-payments/:id/receipt",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    manualPaymentController.downloadReceipt
  );

  /**
   * @route    POST /api/manual-payments/:id/approve
   * @desc     Aprobar pago manual
   * @access   Privado (Solo roles autorizados para aprobar)
   * @permission approve_payments
   * @roles    Jefe de Técnicos, Ingeniero Infraestructura, Call Center Manager, Admin
   */
  app.post(
    "/api/manual-payments/:id/approve",
    [
      authJwt.verifyToken, 
      authJwt.checkRoleOrPermission([
        "jefe_tecnicos", 
        "ingeniero_infraestructura", 
        "call_center_manager", 
        "admin"
      ], "approve_payments")
    ],
    manualPaymentController.approveManualPayment
  );

  /**
   * @route    POST /api/manual-payments/:id/reject
   * @desc     Rechazar pago manual
   * @access   Privado (Solo roles autorizados para aprobar)
   * @permission approve_payments
   * @roles    Jefe de Técnicos, Ingeniero Infraestructura, Call Center Manager, Admin
   */
  app.post(
    "/api/manual-payments/:id/reject",
    [
      authJwt.verifyToken, 
      authJwt.checkRoleOrPermission([
        "jefe_tecnicos", 
        "ingeniero_infraestructura", 
        "call_center_manager", 
        "admin"
      ], "approve_payments")
    ],
    manualPaymentController.rejectManualPayment
  );

  /**
   * @route    POST /api/manual-payments/bulk-approve
   * @desc     Aprobar múltiples pagos en lote
   * @access   Privado (Solo Admin)
   * @permission admin
   */
  app.post(
    "/api/manual-payments/bulk-approve",
    [authJwt.verifyToken, authJwt.checkRole("admin")],
    manualPaymentController.bulkApprovePayments
  );

  // ==================== RUTAS DE CONSULTA PARA OPERADORES ====================

  /**
   * @route    GET /api/manual-payments/client/search
   * @desc     Buscar cliente por nombre, teléfono o email (para operadores)
   * @access   Privado (Técnico, Call Center, Admins)
   * @permission view_clients
   */
  app.get(
    "/api/manual-payments/client/search",
    [authJwt.verifyToken, authJwt.checkPermission("view_clients")],
    manualPaymentController.searchClients
  );

  /**
   * @route    GET /api/manual-payments/client/:clientId/invoices
   * @desc     Obtener facturas pendientes de un cliente (para operadores)
   * @access   Privado (Técnico, Call Center, Admins)
   * @permission view_billing
   */
  app.get(
    "/api/manual-payments/client/:clientId/invoices",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    manualPaymentController.getClientPendingInvoices
  );
};