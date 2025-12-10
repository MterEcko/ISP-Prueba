// backend/src/routes/invoice.routes.js
const { authJwt } = require("../middleware");
const invoiceController = require("../controllers/invoice.controller");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== RUTAS DE FACTURAS ====================

  /**
   * @route    GET /api/invoices
   * @desc     Obtener todas las facturas con filtros y paginación
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/invoices",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.getAllInvoices
  );

  /**
   * @route    GET /api/invoices/statistics
   * @desc     Obtener estadísticas de facturación
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/invoices/statistics",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.getInvoiceStatistics
  );

  /**
   * @route    GET /api/invoices/overdue
   * @desc     Buscar facturas vencidas
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/invoices/overdue",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.getOverdueInvoices
  );

  /**
   * @route    POST /api/invoices/process-overdue
   * @desc     Procesar facturas vencidas (marcar como overdue y enviar recordatorios)
   * @access   Privado (Admin)
   */
  app.post(
    "/api/invoices/process-overdue",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.processOverdueInvoices
  );

  /**
   * @route    GET /api/invoices/client/:clientId
   * @desc     Obtener facturas de un cliente específico
   * @access   Privado (Admin, Facturación, Técnico - solo sus asignados)
   */
  app.get(
    "/api/invoices/client/:clientId",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.getClientInvoices
  );

  /**
   * @route    GET /api/invoices/:id
   * @desc     Obtener factura por ID
   * @access   Privado (Admin, Facturación)
   */
  app.get(
    "/api/invoices/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.getInvoiceById
  );

  /**
   * @route    GET /api/invoices/:id/pdf
   * @desc     Generar PDF de factura
   * @access   Privado (Admin, Facturación, Cliente específico)
   */
  app.get(
    "/api/invoices/:id/pdf",
    //[authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    invoiceController.generatePDF
  );

  /**
   * @route    POST /api/invoices
   * @desc     Crear nueva factura
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/invoices",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.createInvoice
  );

  /**
   * @route    POST /api/invoices/:id/mark-paid
   * @desc     Marcar factura como pagada
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/invoices/:id/mark-paid",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.markAsPaid
  );

  /**
   * @route    POST /api/invoices/:id/cancel
   * @desc     Cancelar factura
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/invoices/:id/cancel",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.cancelInvoice
  );

  /**
   * @route    POST /api/invoices/:id/duplicate
   * @desc     Duplicar factura (crear copia)
   * @access   Privado (Admin, Facturación)
   */
  app.post(
    "/api/invoices/:id/duplicate",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.duplicateInvoice
  );

  /**
   * @route    PUT /api/invoices/:id
   * @desc     Actualizar factura
   * @access   Privado (Admin, Facturación)
   */
  app.put(
    "/api/invoices/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.updateInvoice
  );

  /**
   * @route    DELETE /api/invoices/:id
   * @desc     Eliminar factura
   * @access   Privado (Admin)
   */
  app.delete(
    "/api/invoices/:id",
    //[authJwt.verifyToken, authJwt.checkPermission("manage_billing")],
    invoiceController.deleteInvoice
  );
};