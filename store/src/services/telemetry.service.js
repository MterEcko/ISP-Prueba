const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');

const TelemetryEvent = db.TelemetryEvent;
const PerformanceMetric = db.PerformanceMetric;

/**
 * Limpia datos de telemetría antiguos (más de 90 días)
 * Se ejecuta automáticamente mediante cron job cada día a las 2 AM
 */
async function cleanOldTelemetry(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Eliminar eventos de telemetría antiguos
    const deletedEvents = await TelemetryEvent.destroy({
      where: {
        timestamp: {
          [Op.lt]: cutoffDate
        }
      }
    });

    // Eliminar métricas de rendimiento antiguas
    const deletedMetrics = await PerformanceMetric.destroy({
      where: {
        timestamp: {
          [Op.lt]: cutoffDate
        }
      }
    });

    logger.info(`✅ Limpieza de telemetría completada:`);
    logger.info(`   - ${deletedEvents} eventos eliminados`);
    logger.info(`   - ${deletedMetrics} métricas eliminadas`);
    logger.info(`   - Datos anteriores a: ${cutoffDate.toISOString()}`);

    return {
      success: true,
      deletedEvents,
      deletedMetrics,
      cutoffDate
    };

  } catch (error) {
    logger.error('Error al limpiar datos de telemetría:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de telemetría
 */
async function getTelemetryStats() {
  try {
    const totalEvents = await TelemetryEvent.count();
    const totalMetrics = await PerformanceMetric.count();

    const recentEvents = await TelemetryEvent.count({
      where: {
        timestamp: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      }
    });

    return {
      success: true,
      stats: {
        totalEvents,
        totalMetrics,
        recentEvents
      }
    };

  } catch (error) {
    logger.error('Error al obtener estadísticas de telemetría:', error);
    throw error;
  }
}

module.exports = {
  cleanOldTelemetry,
  getTelemetryStats
};
