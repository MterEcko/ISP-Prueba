// backend/src/routes/reports.routes.js
const { authJwt } = require("../middleware");
const reportsController = require("../controllers/reports.controller");

module.exports = function(app) {
	
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ========================================
  // REPORTES DE CLIENTES
  // ========================================

  /**
   * @route    GET /api/reports/client-activity-log/:clientId
   * @desc     Obtener el historial de actividad unificado de un cliente
   * @access   Privado
   * @params   clientId - ID del cliente
   * @query    action - Filtrar por tipo de acción (opcional)
   * @query    startDate - Fecha de inicio (opcional)
   * @query    endDate - Fecha de fin (opcional)
   * @query    limit - Número de registros por página (default: 200)
   * @query    page - Número de página (default: 1)
   */
  app.get(
    "/api/reports/client-activity-log/:clientId",
    [authJwt.verifyToken],
    reportsController.getClientActivityLog
  );

  /**
   * @route    GET /api/reports/client-activity-summary/:clientId
   * @desc     Obtener resumen de actividad de un cliente
   * @access   Privado
   * @params   clientId - ID del cliente
   * @query    period - Período de tiempo (week, month, year)
   */
  app.get(
    "/api/reports/client-activity-summary/:clientId",
    [authJwt.verifyToken],
    reportsController.getClientActivitySummary
  );

  /**
   * @route    GET /api/reports/client-activity-log/:clientId/export
   * @desc     Exportar historial de actividad a diferentes formatos
   * @access   Privado
   * @params   clientId - ID del cliente
   * @query    format - Formato de exportación (csv, pdf, excel)
   * @query    action - Filtrar por tipo de acción (opcional)
   * @query    startDate - Fecha de inicio (opcional)
   * @query    endDate - Fecha de fin (opcional)
   */
  app.get(
    "/api/reports/client-activity-log/:clientId/export",
    [authJwt.verifyToken, authJwt.checkPermission("view_reports")],
    reportsController.exportClientActivityLog
  );

  /**
   * @route    GET /api/reports/clients-by-location
   * @desc     Obtener reporte de clientes agrupados por ubicación
   * @access   Privado
   * @query    groupBy - Agrupar por 'sector', 'node' o 'zone'
   * @query    includeInactive - Incluir clientes inactivos (true/false)
   */
  app.get(
    "/api/reports/clients-by-location",
    [authJwt.verifyToken, authJwt.checkPermission("view_reports")],
    reportsController.getClientsByLocation
  );

  // ========================================
  // REPORTES DEL SISTEMA
  // ========================================

  /**
   * @route    GET /api/reports/system-stats
   * @desc     Obtener estadísticas generales del sistema
   * @access   Privado (Admin)
   * @query    period - Período de tiempo (today, week, month, year)
   */
  app.get(
    "/api/reports/system-stats",
    [authJwt.verifyToken, authJwt.checkPermission("view_system_stats")],
    reportsController.getSystemStats
  );

  // ========================================
  // REPORTES DE TICKETS
  // ========================================

  /**
   * @route    GET /api/reports/tickets-summary
   * @desc     Obtener resumen de tickets por estado/prioridad
   * @access   Privado
   * @query    groupBy - Agrupar por 'status', 'priority', 'category'
   * @query    startDate - Fecha de inicio (opcional)
   * @query    endDate - Fecha de fin (opcional)
   */
  app.get(
    "/api/reports/tickets-summary",
    [authJwt.verifyToken, authJwt.checkPermission("view_tickets")],
    reportsController.getTicketsSummary
  );

  // ========================================
  // REPORTES FINANCIEROS
  // ========================================

  /**
   * @route    GET /api/reports/financial-summary
   * @desc     Obtener resumen financiero
   * @access   Privado (Admin/Contabilidad)
   * @query    period - Período predefinido (week, month, quarter, year)
   * @query    startDate - Fecha de inicio personalizada
   * @query    endDate - Fecha de fin personalizada
   */
  app.get(
    "/api/reports/financial-summary",
    [authJwt.verifyToken, authJwt.checkPermission("view_billing")],
    reportsController.getFinancialSummary
  );

  // ========================================
  // REPORTES DE RED E INVENTARIO
  // ========================================

  /**
   * @route    GET /api/reports/network-devices
   * @desc     Obtener reporte de dispositivos de red
   * @access   Privado
   * @query    status - Filtrar por estado (online, offline, warning)
   * @query    type - Filtrar por tipo de dispositivo
   * @query    nodeId - Filtrar por nodo
   */
  app.get(
    "/api/reports/network-devices",
    [authJwt.verifyToken, authJwt.checkPermission("view_network")],
    reportsController.getNetworkDevicesReport
  );

  /**
   * @route    GET /api/reports/inventory-summary
   * @desc     Obtener resumen de inventario
   * @access   Privado
   * @query    locationId - Filtrar por ubicación
   * @query    status - Filtrar por estado
   * @query    lowStock - Solo mostrar items con stock bajo (true/false)
   */
  app.get(
    "/api/reports/inventory-summary",
    [authJwt.verifyToken, authJwt.checkPermission("view_inventory")],
    reportsController.getInventorySummary
  );
  
  
  /**
 * @route    GET /api/reports/client-statistics/:clientId
 * @desc     Obtener estadísticas completas del cliente
 * @access   Privado
 * @params   clientId - ID del cliente
 * @query    period - Período (monthly, quarterly, yearly, all)
 */
app.get(
  "/api/reports/client-statistics/:clientId",
  [authJwt.verifyToken],
  reportsController.getClientStatistics
);

  
};