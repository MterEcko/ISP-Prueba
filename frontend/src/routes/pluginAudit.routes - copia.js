// backend/src/routes/pluginAudit.routes.js
const { authJwt } = require("../middleware");
const pluginAuditService = require("../services/pluginAudit.service");
const logger = require('../utils/logger');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // ==================== CONSULTA DE LOGS DE AUDITORÍA ====================

  /**
   * Obtener logs de auditoría con filtros
   * GET /api/plugin-audit/logs
   */
  app.get(
    "/api/plugin-audit/logs",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    async (req, res) => {
      try {
        const {
          pluginId,
          pluginName,
          action,
          userId,
          severity,
          success,
          startDate,
          endDate,
          limit = 100,
          offset = 0
        } = req.query;

        const logs = await pluginAuditService.getLogs({
          pluginId,
          pluginName,
          action,
          userId,
          severity,
          success: success !== undefined ? success === 'true' : undefined,
          startDate,
          endDate,
          limit,
          offset
        });

        return res.status(200).json({
          success: true,
          data: logs,
          count: logs.length,
          message: 'Logs de auditoría obtenidos exitosamente'
        });

      } catch (error) {
        logger.error(`Error obteniendo logs de auditoría: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );

  /**
   * Obtener estadísticas de auditoría
   * GET /api/plugin-audit/statistics
   */
  app.get(
    "/api/plugin-audit/statistics",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    async (req, res) => {
      try {
        const { pluginId } = req.query;

        const stats = await pluginAuditService.getStatistics(pluginId);

        return res.status(200).json({
          success: true,
          data: stats,
          message: 'Estadísticas obtenidas exitosamente'
        });

      } catch (error) {
        logger.error(`Error obteniendo estadísticas: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );

  /**
   * Obtener logs de un plugin específico
   * GET /api/plugin-audit/logs/:pluginId
   */
  app.get(
    "/api/plugin-audit/logs/:pluginId",
    [authJwt.verifyToken],
    async (req, res) => {
      try {
        const { pluginId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const logs = await pluginAuditService.getLogs({
          pluginId: parseInt(pluginId),
          limit,
          offset
        });

        return res.status(200).json({
          success: true,
          data: logs,
          count: logs.length,
          message: 'Logs obtenidos exitosamente'
        });

      } catch (error) {
        logger.error(`Error obteniendo logs del plugin: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );

  /**
   * Limpiar logs antiguos
   * POST /api/plugin-audit/cleanup
   */
  app.post(
    "/api/plugin-audit/cleanup",
    [authJwt.verifyToken, authJwt.isAdmin],
    async (req, res) => {
      try {
        const { daysToKeep = 90 } = req.body;

        const deleted = await pluginAuditService.cleanOldLogs(parseInt(daysToKeep));

        return res.status(200).json({
          success: true,
          data: {
            deletedCount: deleted,
            daysKept: parseInt(daysToKeep)
          },
          message: `${deleted} logs eliminados (mayores a ${daysToKeep} días)`
        });

      } catch (error) {
        logger.error(`Error limpiando logs: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );

  /**
   * Obtener logs de seguridad (alertas y errores críticos)
   * GET /api/plugin-audit/security-alerts
   */
  app.get(
    "/api/plugin-audit/security-alerts",
    [authJwt.verifyToken, authJwt.isAdminOrManager],
    async (req, res) => {
      try {
        const { limit = 50, offset = 0 } = req.query;

        const alerts = await pluginAuditService.getLogs({
          action: 'SECURITY_ALERT',
          limit,
          offset
        });

        const errors = await pluginAuditService.getLogs({
          severity: 'CRITICAL',
          limit,
          offset
        });

        return res.status(200).json({
          success: true,
          data: {
            alerts,
            criticalErrors: errors
          },
          message: 'Alertas de seguridad obtenidas'
        });

      } catch (error) {
        logger.error(`Error obteniendo alertas de seguridad: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );

  /**
   * Obtener actividad reciente (últimas acciones)
   * GET /api/plugin-audit/recent-activity
   */
  app.get(
    "/api/plugin-audit/recent-activity",
    [authJwt.verifyToken],
    async (req, res) => {
      try {
        const { limit = 20 } = req.query;

        const recentLogs = await pluginAuditService.getLogs({
          limit: parseInt(limit),
          offset: 0
        });

        return res.status(200).json({
          success: true,
          data: recentLogs,
          message: 'Actividad reciente obtenida'
        });

      } catch (error) {
        logger.error(`Error obteniendo actividad reciente: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    }
  );
};
