// backend/src/middleware/licenseSuspension.middleware.js
const storeApiClient = require('../services/storeApiClient.service');
const licenseLimitsService = require('../services/licenseLimits.service');
const logger = require('../utils/logger');

/**
 * Middleware para bloquear operaciones POST cuando la licencia está suspendida
 *
 * IMPORTANTE:
 * - Si la licencia está suspendida, PERMITE: GET, PUT, PATCH
 * - Si la licencia está suspendida, BLOQUEA: POST (crear recursos)
 *
 * Excepciones:
 * - Permite POST en facturas (para que puedan pagar y reactivar)
 * - Permite POST en pagos (para que puedan pagar)
 */
class LicenseSuspensionMiddleware {

  // Cache de validación (se actualiza cada hora)
  static validationCache = {
    suspended: false,
    lastCheck: null,
    cacheExpiry: 60 * 60 * 1000 // 1 hora
  };

  /**
   * Verificar si licencia está suspendida
   */
  static async checkLicenseSuspension() {
    // Si hay cache válido, usar cache
    const now = Date.now();
    if (this.validationCache.lastCheck &&
        (now - this.validationCache.lastCheck) < this.validationCache.cacheExpiry) {
      return this.validationCache.suspended;
    }

    try {
      // Obtener licencia activa
      const license = await licenseLimitsService.getActiveLicense();

      if (!license) {
        logger.warn('⚠️  No hay licencia activa');
        return false; // Sin licencia = no suspendido (modo trial?)
      }

      // Validar con Store
      const validation = await storeApiClient.validateLicense(license.licenseKey);

      const isSuspended = validation.suspended === true;

      // Actualizar cache
      this.validationCache = {
        suspended: isSuspended,
        lastCheck: now,
        cacheExpiry: 60 * 60 * 1000
      };

      if (isSuspended) {
        logger.warn(`🚫 Licencia ${license.licenseKey} está SUSPENDIDA`);
      }

      return isSuspended;

    } catch (error) {
      logger.error('Error verificando suspensión de licencia:', error);
      // En caso de error, NO bloquear (mejor fallar abierto que cerrado)
      return false;
    }
  }

  /**
   * Middleware principal
   */
  static async blockIfSuspended(req, res, next) {
    // Solo aplicar a métodos POST
    if (req.method !== 'POST') {
      return next();
    }

    // Rutas excluidas (permitidas incluso con licencia suspendida)
    const allowedPaths = [
      '/api/invoices',           // Permitir consultar facturas
      '/api/payments',           // Permitir registrar pagos para reactivar
      '/api/auth/login',         // Permitir login
      '/api/auth/logout',        // Permitir logout
      '/api/licenses/activate',  // Permitir activar licencia
      '/api/licenses/validate',  // Permitir validar licencia
      '/api/system/health'       // Permitir health check
    ];

    // Verificar si la ruta está en la lista de permitidas
    const isAllowed = allowedPaths.some(path => req.path.startsWith(path));
    if (isAllowed) {
      return next();
    }

    // Verificar suspensión
    const isSuspended = await this.checkLicenseSuspension();

    if (isSuspended) {
      // Rutas bloqueadas cuando está suspendida
      const blockedPaths = [
        '/api/clients',          // No crear clientes
        '/api/users',            // No crear usuarios
        '/api/subscriptions',    // No crear servicios
        '/api/service-packages', // No crear paquetes
        '/api/devices',          // No crear dispositivos
        '/api/tickets'           // No crear tickets
      ];

      const isBlocked = blockedPaths.some(path => req.path.startsWith(path));

      if (isBlocked) {
        logger.warn(`🚫 Operación bloqueada por licencia suspendida: POST ${req.path}`);

        return res.status(402).json({
          success: false,
          error: 'LICENSE_SUSPENDED',
          message: 'Licencia suspendida. No se pueden crear nuevos recursos.',
          details: 'Su licencia ha sido suspendida por falta de pago. Puede consultar y actualizar información existente, pero no crear nuevos clientes, usuarios o servicios.',
          allowedActions: [
            'Consultar información (GET)',
            'Actualizar registros existentes (PUT/PATCH)',
            'Registrar pagos para reactivar servicio'
          ],
          contact: 'Por favor, contacte con el equipo de soporte para reactivar su licencia.'
        });
      }
    }

    // Si llegamos aquí, permitir la operación
    next();
  }

  /**
   * Middleware simplificado (solo para rutas críticas)
   */
  static blockClientCreation = async (req, res, next) => {
    if (req.method !== 'POST') {
      return next();
    }

    const isSuspended = await this.checkLicenseSuspension();

    if (isSuspended) {
      return res.status(402).json({
        success: false,
        error: 'LICENSE_SUSPENDED',
        message: 'No se pueden crear clientes con licencia suspendida'
      });
    }

    next();
  };

  /**
   * Forzar actualización de cache
   */
  static clearCache() {
    this.validationCache = {
      suspended: false,
      lastCheck: null,
      cacheExpiry: 60 * 60 * 1000
    };
    logger.info('🔄 Cache de suspensión de licencia limpiado');
  }
}

module.exports = LicenseSuspensionMiddleware;
