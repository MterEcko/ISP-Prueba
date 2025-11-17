// backend/src/controllers/reports.controller.js
const logger = require('../utils/logger');
const ReportsService = require('../services/reports.service');

/**
 * Obtener el historial de actividad completo para un cliente.
 * GET /api/reports/client-activity-log/:clientId
 */
exports.getClientActivityLog = async (req, res) => {
  try {
    const { clientId } = req.params;
    const filters = {
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || parseInt(req.query.size) || 200,
      page: parseInt(req.query.page) || 1
    };

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido y debe ser un número válido.'
      });
    }

    // Llamamos al servicio
    const logs = await ReportsService.getClientActivityLog(parseInt(clientId), filters);

    // El servicio devuelve un array simple, así que construimos la respuesta aquí
    const responseData = {
      logs: logs,
      pagination: {
        totalItems: logs.length,
        totalPages: 1,
        currentPage: 1
      },
      summary: {
        total: logs.length
      }
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Se encontraron ${logs.length} eventos de actividad para el cliente.`
    });

  } catch (error) {
    logger.error(`Error generando log de actividad para el cliente ${req.params.clientId}: ${error.message}`);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar el log de actividad.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener resumen de actividad del cliente
 * GET /api/reports/client-activity-summary/:clientId
 */
exports.getClientActivitySummary = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { period } = req.query;

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido y debe ser un número válido.'
      });
    }

    const summary = await ReportsService.getClientActivitySummary(parseInt(clientId), period);

    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Resumen de actividad generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando resumen de actividad: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar el resumen de actividad.'
    });
  }
};

/**
 * Exportar historial de actividad
 * GET /api/reports/client-activity-log/:clientId/export
 */
exports.exportClientActivityLog = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { format } = req.query;
    const filters = {
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido y debe ser un número válido.'
      });
    }

    if (!['csv', 'pdf', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de exportación inválido. Use: csv, pdf o excel'
      });
    }

    const exportData = await ReportsService.exportClientActivityLog(
      parseInt(clientId), 
      format, 
      filters
    );

    const contentTypes = {
      csv: 'text/csv',
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const extensions = {
      csv: 'csv',
      pdf: 'pdf',
      excel: 'xlsx'
    };

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename=cliente-${clientId}-actividad.${extensions[format]}`);
    
    return res.send(exportData);

  } catch (error) {
    logger.error(`Error exportando log de actividad: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al exportar el log de actividad.'
    });
  }
};

/**
 * Obtener estadísticas generales del sistema
 * GET /api/reports/system-stats
 */
exports.getSystemStats = async (req, res) => {
  try {
    const { period } = req.query;
    const stats = await ReportsService.getSystemStats(period);

    return res.status(200).json({
      success: true,
      data: stats,
      message: 'Estadísticas del sistema generadas exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando estadísticas del sistema: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar estadísticas.'
    });
  }
};

/**
 * Obtener reporte de tickets
 * GET /api/reports/tickets-summary
 */
exports.getTicketsSummary = async (req, res) => {
  try {
    const { groupBy, startDate, endDate } = req.query;

    const summary = await ReportsService.getTicketsSummary({
      groupBy: groupBy || 'status',
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Resumen de tickets generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando resumen de tickets: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar resumen de tickets.'
    });
  }
};

/**
 * Obtener reporte financiero
 * GET /api/reports/financial-summary
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    const summary = await ReportsService.getFinancialSummary({
      period,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Resumen financiero generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando resumen financiero: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar resumen financiero.'
    });
  }
};

/**
 * Obtener reporte de dispositivos de red
 * GET /api/reports/network-devices
 */
exports.getNetworkDevicesReport = async (req, res) => {
  try {
    const { status, type, nodeId } = req.query;

    const report = await ReportsService.getNetworkDevicesReport({
      status,
      type,
      nodeId: nodeId ? parseInt(nodeId) : undefined
    });

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte de dispositivos de red generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando reporte de dispositivos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar reporte de dispositivos.'
    });
  }
};

/**
 * Obtener reporte de inventario
 * GET /api/reports/inventory-summary
 */
exports.getInventorySummary = async (req, res) => {
  try {
    const { locationId, status, lowStock } = req.query;

    const summary = await ReportsService.getInventorySummary({
      locationId: locationId ? parseInt(locationId) : undefined,
      status,
      lowStock: lowStock === 'true'
    });

    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Resumen de inventario generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando resumen de inventario: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar resumen de inventario.'
    });
  }
};

/**
 * Obtener clientes por ubicación
 * GET /api/reports/clients-by-location
 */
exports.getClientsByLocation = async (req, res) => {
  try {
    const { groupBy, includeInactive } = req.query;

    const report = await ReportsService.getClientsByLocation({
      groupBy: groupBy || 'sector',
      includeInactive: includeInactive === 'true'
    });

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte de clientes por ubicación generado exitosamente.'
    });

  } catch (error) {
    logger.error(`Error generando reporte de clientes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al generar reporte de clientes.'
    });
  }
};

/**
 * Obtener estadísticas completas del cliente
 * GET /api/reports/client-statistics/:clientId
 */
exports.getClientStatistics = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { period } = req.query;

    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente es requerido y debe ser un número válido.'
      });
    }

    const [
      generalStats,
      supportStats,
      billingStats,
      clientScore,
      comparisons
    ] = await Promise.all([
      ReportsService.getClientGeneralStats(parseInt(clientId), period),
      ReportsService.getClientSupportStats(parseInt(clientId)),
      ReportsService.getClientBillingStats(parseInt(clientId)),
      ReportsService.getClientScore(parseInt(clientId)),
      ReportsService.getClientComparisons(parseInt(clientId))
    ]);

    return res.status(200).json({
      success: true,
      data: {
        general: generalStats,
        support: supportStats,
        billing: billingStats,
        score: clientScore,
        comparisons,
        usage: null // Pendiente
      },
      message: 'Estadísticas del cliente obtenidas exitosamente.'
    });

  } catch (error) {
    logger.error(`Error obteniendo estadísticas del cliente ${req.params.clientId}: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener estadísticas.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Exportar reporte de clientes en formato PDF
 * GET /api/reports/clients/pdf?estado=activo&dateFrom=2024-01-01&dateTo=2024-12-31&limit=1000
 */
exports.exportClientsPDF = async (req, res) => {
  try {
    const filters = {
      estado: req.query.estado || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000
    };

    const pdfBuffer = await ReportsService.generateClientsPDF(filters);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="clientes_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error(`Error exportando PDF de clientes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generando reporte PDF de clientes',
      error: error.message
    });
  }
};

/**
 * Exportar reporte de clientes en formato Excel
 * GET /api/reports/clients/excel?estado=activo&dateFrom=2024-01-01&dateTo=2024-12-31&limit=1000
 */
exports.exportClientsExcel = async (req, res) => {
  try {
    const filters = {
      estado: req.query.estado || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000
    };

    const excelBuffer = await ReportsService.generateClientsExcel(filters);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="clientes_${Date.now()}.xlsx"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.send(excelBuffer);
  } catch (error) {
    logger.error(`Error exportando Excel de clientes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generando reporte Excel de clientes',
      error: error.message
    });
  }
};

/**
 * Exportar reporte de pagos en formato PDF
 * GET /api/reports/payments/pdf?estado=completado&metodo_pago=transfer&dateFrom=2024-01-01&dateTo=2024-12-31&limit=1000
 */
exports.exportPaymentsPDF = async (req, res) => {
  try {
    const filters = {
      estado: req.query.estado || null,
      metodo_pago: req.query.metodo_pago || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000
    };

    const pdfBuffer = await ReportsService.generatePaymentsPDF(filters);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pagos_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    logger.error(`Error exportando PDF de pagos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generando reporte PDF de pagos',
      error: error.message
    });
  }
};

/**
 * Exportar reporte de pagos en formato Excel
 * GET /api/reports/payments/excel?estado=completado&metodo_pago=transfer&dateFrom=2024-01-01&dateTo=2024-12-31&limit=1000
 */
exports.exportPaymentsExcel = async (req, res) => {
  try {
    const filters = {
      estado: req.query.estado || null,
      metodo_pago: req.query.metodo_pago || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000
    };

    const excelBuffer = await ReportsService.generatePaymentsExcel(filters);

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pagos_${Date.now()}.xlsx"`);
    res.setHeader('Content-Length', excelBuffer.length);

    return res.send(excelBuffer);
  } catch (error) {
    logger.error(`Error exportando Excel de pagos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error generando reporte Excel de pagos',
      error: error.message
    });
  }
};