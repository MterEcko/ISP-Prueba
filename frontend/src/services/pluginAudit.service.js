// backend/src/services/pluginAudit.service.js
const db = require('../models');
const PluginAuditLog = db.PluginAuditLog;
const logger = require('../utils/logger');

/**
 * Servicio de auditoría para plugins
 * Registra todas las acciones y eventos relacionados con plugins
 */
class PluginAuditService {
  /**
   * Registra un evento de auditoría
   * @param {Object} auditData - Datos del evento
   * @returns {Promise<Object>} - Registro creado
   */
  async log(auditData) {
    try {
      const {
        pluginId,
        pluginName,
        action,
        userId,
        username,
        severity = 'INFO',
        description,
        details = null,
        ipAddress = null,
        userAgent = null,
        previousState = null,
        newState = null,
        success = true,
        errorMessage = null,
        stackTrace = null,
        duration = null
      } = auditData;

      // Validaciones básicas
      if (!pluginName || !action || !description) {
        logger.error('Datos de auditoría incompletos');
        return null;
      }

      // Crear registro
      const auditLog = await PluginAuditLog.create({
        pluginId,
        pluginName,
        action,
        userId,
        username,
        severity,
        description,
        details,
        ipAddress,
        userAgent,
        previousState,
        newState,
        success,
        errorMessage,
        stackTrace,
        duration
      });

      // Log en consola según severidad
      const logMessage = `[AUDIT] ${action} - ${pluginName} by ${username || 'system'}: ${description}`;
      switch (severity) {
        case 'CRITICAL':
        case 'ERROR':
          logger.error(logMessage);
          break;
        case 'WARNING':
          logger.warn(logMessage);
          break;
        default:
          logger.info(logMessage);
      }

      return auditLog;

    } catch (error) {
      logger.error(`Error registrando auditoría: ${error.message}`);
      return null;
    }
  }

  /**
   * Registra creación de plugin
   */
  async logPluginCreated(plugin, req) {
    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_CREATED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Plugin "${plugin.name}" registrado en el sistema`,
      details: {
        version: plugin.version,
        category: plugin.category,
        active: plugin.active
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      newState: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        active: plugin.active
      }
    });
  }

  /**
   * Registra actualización de plugin
   */
  async logPluginUpdated(plugin, previousData, req) {
    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_UPDATED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Plugin "${plugin.name}" actualizado`,
      details: {
        changes: this._getChanges(previousData, plugin.toJSON())
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      previousState: previousData,
      newState: {
        version: plugin.version,
        active: plugin.active,
        configuration: plugin.configuration
      }
    });
  }

  /**
   * Registra eliminación de plugin
   */
  async logPluginDeleted(plugin, req) {
    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_DELETED',
      userId: req?.userId,
      username: req?.username,
      severity: 'WARNING',
      description: `Plugin "${plugin.name}" eliminado del sistema`,
      details: {
        version: plugin.version,
        category: plugin.category
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      previousState: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        active: plugin.active
      }
    });
  }

  /**
   * Registra activación de plugin
   */
  async logPluginActivated(plugin, req, startTime = null) {
    const duration = startTime ? Date.now() - startTime : null;

    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_ACTIVATED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Plugin "${plugin.name}" activado exitosamente`,
      details: {
        version: plugin.version,
        category: plugin.category
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      previousState: { active: false },
      newState: { active: true },
      duration
    });
  }

  /**
   * Registra desactivación de plugin
   */
  async logPluginDeactivated(plugin, req, startTime = null) {
    const duration = startTime ? Date.now() - startTime : null;

    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_DEACTIVATED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Plugin "${plugin.name}" desactivado`,
      details: {
        version: plugin.version,
        category: plugin.category
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      previousState: { active: true },
      newState: { active: false },
      duration
    });
  }

  /**
   * Registra recarga de plugin
   */
  async logPluginReloaded(plugin, req, startTime = null) {
    const duration = startTime ? Date.now() - startTime : null;

    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'PLUGIN_RELOADED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Plugin "${plugin.name}" recargado`,
      details: {
        version: plugin.version
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      duration
    });
  }

  /**
   * Registra actualización de configuración
   */
  async logConfigUpdated(plugin, previousConfig, newConfig, req) {
    // Enmascarar campos sensibles en los logs
    const maskedPrevious = this._maskSensitiveData(previousConfig);
    const maskedNew = this._maskSensitiveData(newConfig);

    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'CONFIG_UPDATED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Configuración de "${plugin.name}" actualizada`,
      details: {
        fieldsChanged: Object.keys(newConfig || {}).filter(
          key => JSON.stringify(previousConfig?.[key]) !== JSON.stringify(newConfig?.[key])
        )
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      previousState: maskedPrevious,
      newState: maskedNew
    });
  }

  /**
   * Registra visualización de configuración
   */
  async logConfigViewed(plugin, req) {
    return this.log({
      pluginId: plugin.id,
      pluginName: plugin.name,
      action: 'CONFIG_VIEWED',
      userId: req?.userId,
      username: req?.username,
      severity: 'INFO',
      description: `Configuración de "${plugin.name}" consultada`,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent']
    });
  }

  /**
   * Registra fallo de validación
   */
  async logValidationFailed(pluginName, validationReport, req) {
    return this.log({
      pluginName,
      action: 'VALIDATION_FAILED',
      userId: req?.userId,
      username: req?.username,
      severity: 'WARNING',
      description: `Validación fallida para plugin "${pluginName}"`,
      details: {
        errors: validationReport.errors,
        warnings: validationReport.warnings,
        riskLevel: validationReport.riskLevel
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      success: false,
      errorMessage: validationReport.errors.join('; ')
    });
  }

  /**
   * Registra alerta de seguridad
   */
  async logSecurityAlert(pluginName, alertType, alertDetails, req = null) {
    return this.log({
      pluginName,
      action: 'SECURITY_ALERT',
      userId: req?.userId,
      username: req?.username,
      severity: 'CRITICAL',
      description: `Alerta de seguridad: ${alertType} en plugin "${pluginName}"`,
      details: alertDetails,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      success: false
    });
  }

  /**
   * Registra error
   */
  async logError(pluginName, action, error, req = null) {
    return this.log({
      pluginName,
      action: action || 'ERROR',
      userId: req?.userId,
      username: req?.username,
      severity: 'ERROR',
      description: `Error en plugin "${pluginName}": ${error.message}`,
      details: {
        errorType: error.name,
        errorCode: error.code
      },
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      success: false,
      errorMessage: error.message,
      stackTrace: error.stack
    });
  }

  /**
   * Obtiene logs de auditoría con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} - Logs encontrados
   */
  async getLogs(filters = {}) {
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
      } = filters;

      const whereClause = {};

      if (pluginId) whereClause.pluginId = pluginId;
      if (pluginName) whereClause.pluginName = pluginName;
      if (action) whereClause.action = action;
      if (userId) whereClause.userId = userId;
      if (severity) whereClause.severity = severity;
      if (success !== undefined) whereClause.success = success;

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp[db.Sequelize.Op.gte] = new Date(startDate);
        if (endDate) whereClause.timestamp[db.Sequelize.Op.lte] = new Date(endDate);
      }

      const logs = await PluginAuditLog.findAll({
        where: whereClause,
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return logs;

    } catch (error) {
      logger.error(`Error obteniendo logs de auditoría: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStatistics(pluginId = null) {
    try {
      const whereClause = pluginId ? { pluginId } : {};

      const stats = await PluginAuditLog.findAll({
        where: whereClause,
        attributes: [
          'action',
          'severity',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        group: ['action', 'severity']
      });

      const totalLogs = await PluginAuditLog.count({ where: whereClause });
      const errorLogs = await PluginAuditLog.count({
        where: { ...whereClause, success: false }
      });

      return {
        totalLogs,
        errorLogs,
        successRate: totalLogs > 0 ? ((totalLogs - errorLogs) / totalLogs * 100).toFixed(2) : 100,
        byAction: this._groupStats(stats, 'action'),
        bySeverity: this._groupStats(stats, 'severity')
      };

    } catch (error) {
      logger.error(`Error obteniendo estadísticas: ${error.message}`);
      return null;
    }
  }

  /**
   * Limpia logs antiguos
   * @param {number} daysToKeep - Días a mantener
   * @returns {Promise<number>} - Cantidad de registros eliminados
   */
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await PluginAuditLog.destroy({
        where: {
          timestamp: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      logger.info(`Limpieza de logs: ${deleted} registros eliminados (mayores a ${daysToKeep} días)`);
      return deleted;

    } catch (error) {
      logger.error(`Error limpiando logs antiguos: ${error.message}`);
      return 0;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Obtiene los cambios entre dos objetos
   * @private
   */
  _getChanges(oldData, newData) {
    const changes = {};

    Object.keys(newData).forEach(key => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    });

    return changes;
  }

  /**
   * Enmascara datos sensibles para logs
   * @private
   */
  _maskSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    const sensitiveFields = ['password', 'secret', 'token', 'key', 'apikey', 'api_key'];

    Object.keys(masked).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof masked[key] === 'string' && masked[key].length > 0) {
          masked[key] = '****' + masked[key].slice(-4);
        }
      }
    });

    return masked;
  }

  /**
   * Agrupa estadísticas
   * @private
   */
  _groupStats(stats, groupBy) {
    const grouped = {};

    stats.forEach(stat => {
      const key = stat[groupBy];
      const count = parseInt(stat.getDataValue('count'));

      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key] += count;
    });

    return grouped;
  }
}

module.exports = new PluginAuditService();
