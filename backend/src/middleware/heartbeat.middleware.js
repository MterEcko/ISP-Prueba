// backend/src/middleware/heartbeat.middleware.js
const heartbeatService = require('../services/heartbeat.service');
const logger = require('../utils/logger');

/**
 * Middleware para forzar heartbeat antes de operaciones críticas
 * Valida límites del plan (clientes, usuarios, servicios)
 */
const forceHeartbeatBeforeCritical = async (req, res, next) => {
  try {
    logger.info('🔒 Operación crítica detectada, forzando heartbeat...');

    const heartbeatResult = await heartbeatService.forceHeartbeat();

    if (!heartbeatResult.success) {
      logger.warn(`⚠️ Heartbeat forzado falló: ${heartbeatResult.error}`);
      // Continuar de todos modos (modo offline)
      return next();
    }

    // Verificar si se excedieron límites
    if (heartbeatResult.limitsExceeded) {
      const exceeded = heartbeatResult.data?.limitsValidation?.limitsExceeded || [];

      if (exceeded.length > 0) {
        const limitMessages = exceeded.map(limit =>
          `${limit.type}: ${limit.current}/${limit.limit} (excedido por ${limit.exceeded})`
        ).join(', ');

        logger.error(`❌ Límites del plan excedidos: ${limitMessages}`);

        return res.status(403).json({
          success: false,
          error: 'Límites del plan excedidos',
          limitsExceeded: exceeded,
          message: `Tu plan actual no permite esta operación. Has excedido los límites: ${limitMessages}`
        });
      }
    }

    // Todo OK, continuar con la operación
    logger.info('✅ Heartbeat forzado exitoso, límites OK');
    next();

  } catch (error) {
    logger.error(`❌ Error en middleware de heartbeat: ${error.message}`);
    // En caso de error, permitir continuar (no bloquear el sistema)
    next();
  }
};

module.exports = {
  forceHeartbeatBeforeCritical
};
