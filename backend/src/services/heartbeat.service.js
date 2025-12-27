// backend/src/services/heartbeat.service.js
const cron = require('node-cron');
const logger = require('../utils/logger');
const storeApiClient = require('./storeApiClient.service');
const db = require('../models');

class HeartbeatService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.lastHeartbeat = null;
    this.heartbeatInterval = '0 * * * *'; // Cada hora (minuto 0 de cada hora)
  }

  /**
   * Iniciar el heartbeat automático cada hora
   */
  start() {
    if (this.isRunning) {
      logger.warn('⚠️ Heartbeat ya está en ejecución');
      return;
    }

    // Ejecutar heartbeat inmediatamente al iniciar
    this.sendHeartbeat().catch(error => {
      logger.error('Error en heartbeat inicial:', error.message);
    });

    // Programar heartbeat cada hora
    this.cronJob = cron.schedule(this.heartbeatInterval, async () => {
      try {
        await this.sendHeartbeat();
      } catch (error) {
        logger.error('Error en heartbeat programado:', error.message);
      }
    });

    this.isRunning = true;
    logger.info('💓 Heartbeat automático iniciado (cada hora)');
  }

  /**
   * Detener el heartbeat automático
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('💔 Heartbeat automático detenido');
  }

  /**
   * Enviar heartbeat al Store
   */
  async sendHeartbeat(forced = false) {
    try {
      const heartbeatType = forced ? 'FORZADO' : 'AUTOMÁTICO';
      logger.info(`💓 Enviando heartbeat ${heartbeatType} al Store...`);

      // Obtener licencia activa
      const license = await db.SystemLicense.findOne({
        where: { active: true }
      });

      if (!license) {
        logger.warn('⚠️ No hay licencia activa, saltando heartbeat');
        return {
          success: false,
          error: 'No active license'
        };
      }

      // Obtener información del hardware
      const hardware = await storeApiClient.getHardwareInfo();

      // Obtener ubicación GPS
      const location = await storeApiClient.getGPSLocation();

      // Obtener métricas de uso (contadores)
      const metrics = await this.getUsageMetrics();

      // Validar límites del plan
      const limitsValidation = await this.validateLimits(license, metrics);

      // Obtener Database ID para anti-piratería
      const databaseIdService = require('./databaseId.service');
      const databaseId = databaseIdService.getDatabaseId();

      // Verificar manipulación de fecha
      const licenseExpirationService = require('./licenseExpiration.service');
      const dateManipulationCheck = await licenseExpirationService.detectDateManipulation(license);

      // Preparar payload del heartbeat
      const payload = {
        licenseKey: license.licenseKey,
        hardwareId: hardware.hardwareId,
        databaseId: databaseId,
        hardware: hardware,
        location: location,
        metrics: metrics,
        limitsValidation: limitsValidation,
        dateManipulation: dateManipulationCheck.manipulated ? dateManipulationCheck : null,
        systemVersion: process.env.SYSTEM_VERSION || '1.0.0',
        timestamp: new Date().toISOString(),
        forced: forced
      };

      // Enviar heartbeat al Store
      const response = await storeApiClient.sendHeartbeat(payload);

      if (response.success) {
        this.lastHeartbeat = new Date();
        logger.info(`✅ Heartbeat ${heartbeatType} enviado exitosamente`);

        // Si el Store indica que la licencia está suspendida, actualizar localmente
        if (response.data?.suspended) {
          await license.update({
            status: 'suspended',
            active: false,
            metadata: {
              ...license.metadata,
              suspensionReason: response.data.suspensionReason,
              suspendedAt: new Date().toISOString()
            }
          });
          logger.warn(`⚠️ Licencia suspendida por el Store: ${response.data.suspensionReason}`);
        }

        return {
          success: true,
          data: response.data,
          limitsExceeded: limitsValidation.limitsExceeded
        };
      } else {
        logger.error(`❌ Error en heartbeat: ${response.error}`);
        return {
          success: false,
          error: response.error
        };
      }

    } catch (error) {
      logger.error(`❌ Error enviando heartbeat: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener métricas de uso del sistema
   */
  async getUsageMetrics() {
    try {
      const [clientsCount, usersCount, servicesCount, invoicesCount, paymentsCount] = await Promise.all([
        db.Client.count(),
        db.User.count(),
        db.Service.count({ where: { status: 'active' } }),
        db.Invoice.count(),
        db.Payment.count()
      ]);

      return {
        clients: clientsCount,
        users: usersCount,
        services: servicesCount,
        invoices: invoicesCount,
        payments: paymentsCount,
        collectedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error obteniendo métricas de uso:', error.message);
      return {
        clients: 0,
        users: 0,
        services: 0,
        invoices: 0,
        payments: 0,
        error: error.message
      };
    }
  }

  /**
   * Validar límites del plan (clientes, usuarios, servicios)
   */
  async validateLimits(license, metrics) {
    const limits = {
      clients: license.clientLimit || Infinity,
      users: license.userLimit || Infinity,
      services: license.serviceLimit || Infinity
    };

    const validation = {
      clientsOk: metrics.clients <= limits.clients,
      usersOk: metrics.users <= limits.users,
      servicesOk: metrics.services <= limits.services,
      limitsExceeded: []
    };

    if (!validation.clientsOk) {
      validation.limitsExceeded.push({
        type: 'clients',
        current: metrics.clients,
        limit: limits.clients,
        exceeded: metrics.clients - limits.clients
      });
    }

    if (!validation.usersOk) {
      validation.limitsExceeded.push({
        type: 'users',
        current: metrics.users,
        limit: limits.users,
        exceeded: metrics.users - limits.users
      });
    }

    if (!validation.servicesOk) {
      validation.limitsExceeded.push({
        type: 'services',
        current: metrics.services,
        limit: limits.services,
        exceeded: metrics.services - limits.services
      });
    }

    validation.allOk = validation.limitsExceeded.length === 0;

    return validation;
  }

  /**
   * Heartbeat forzado antes de operaciones críticas
   */
  async forceHeartbeat() {
    return await this.sendHeartbeat(true);
  }

  /**
   * Obtener último heartbeat
   */
  getLastHeartbeat() {
    return this.lastHeartbeat;
  }

  /**
   * Verificar si está corriendo
   */
  isActive() {
    return this.isRunning;
  }
}

module.exports = new HeartbeatService();
