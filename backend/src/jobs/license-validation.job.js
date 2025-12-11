// backend/src/jobs/license-validation.job.js
const cron = require('node-cron');
const storeApiClient = require('../services/storeApiClient.service');
const licenseLimitsService = require('../services/licenseLimits.service');
const LicenseSuspensionMiddleware = require('../middleware/licenseSuspension.middleware');
const logger = require('../utils/logger');

class LicenseValidationJob {

  /**
   * Inicializar jobs de validación de licencias
   */
  static initializeJobs() {
    console.log('🔐 Inicializando jobs de validación de licencias...');

    // Job semanal: Validar licencia con Store (Domingos 2 AM)
    this.scheduleWeeklyValidation();

    // Job semanal: Actualizar ubicación GPS (Domingos 3 AM)
    this.scheduleWeeklyGPSUpdate();

    // Job diario: Reportar métricas de uso (Diario 2 AM)
    this.scheduleDailyMetricsReport();

    console.log('✅ Jobs de licencias inicializados correctamente');
  }

  /**
   * Validación semanal con el Store
   */
  static scheduleWeeklyValidation() {
    // Ejecutar cada domingo a las 2 AM
    cron.schedule('0 2 * * 0', async () => {
      console.log('🔐 === VALIDACIÓN SEMANAL DE LICENCIA ===');
      console.log(`⏰ ${new Date().toLocaleString('es-MX')}`);

      try {
        const license = await licenseLimitsService.getActiveLicense();

        if (!license) {
          logger.warn('⚠️  No hay licencia activa para validar');
          return;
        }

        // Validar con Store
        const validation = await storeApiClient.validateLicense(license.licenseKey);

        logger.info(`📋 Estado de licencia: ${validation.status || 'unknown'}`);
        logger.info(`✅ Válida: ${validation.valid ? 'SÍ' : 'NO'}`);

        if (validation.suspended) {
          logger.warn(`🚫 LICENCIA SUSPENDIDA: ${validation.suspensionReason || 'Motivo no especificado'}`);

          // Limpiar cache para forzar re-validación inmediata
          LicenseSuspensionMiddleware.clearCache();
        }

        // Actualizar timestamp de última validación
        await license.update({
          lastValidated: new Date()
        });

        console.log('✅ Validación completada');

      } catch (error) {
        logger.error('❌ Error en validación de licencia:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    console.log('⏰ Job de validación semanal programado (Domingos 2 AM)');
  }

  /**
   * Actualización semanal de ubicación GPS
   */
  static scheduleWeeklyGPSUpdate() {
    // Ejecutar cada domingo a las 3 AM
    cron.schedule('0 3 * * 0', async () => {
      console.log('📍 === ACTUALIZACIÓN SEMANAL DE GPS ===');

      try {
        const license = await licenseLimitsService.getActiveLicense();

        if (!license) {
          logger.warn('⚠️  No hay licencia activa');
          return;
        }

        // Obtener nueva ubicación GPS
        const location = await storeApiClient.getGPSLocation();

        if (location) {
          logger.info(`📍 Nueva ubicación: ${location.city}, ${location.country}`);
          logger.info(`🌐 Coordenadas: ${location.latitude}, ${location.longitude}`);

          // Actualizar en Store
          const result = await storeApiClient.updateHardwareInfo(license.licenseKey);

          if (result.success) {
            logger.info('✅ Ubicación GPS actualizada en Store');
          } else {
            logger.error('❌ Error actualizando GPS en Store');
          }
        }

      } catch (error) {
        logger.error('❌ Error en actualización de GPS:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    console.log('📍 Job de actualización GPS semanal programado');
  }

  /**
   * Reporte diario de métricas de uso
   */
  static scheduleDailyMetricsReport() {
    // Ejecutar todos los días a las 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('📊 === REPORTE DIARIO DE MÉTRICAS ===');

      try {
        const license = await licenseLimitsService.getActiveLicense();

        if (!license) {
          logger.warn('⚠️  No hay licencia activa');
          return;
        }

        // Reportar métricas al Store
        const result = await storeApiClient.reportUsageMetrics(license.licenseKey);

        if (result.success) {
          logger.info('✅ Métricas reportadas al Store');
          logger.info(`📊 ${result.data.clientsCount || 0} clientes`);
          logger.info(`👥 ${result.data.usersCount || 0} usuarios`);
          logger.info(`🔌 ${result.data.pluginsCount || 0} plugins activos`);
        } else {
          logger.error('❌ Error reportando métricas');
        }

      } catch (error) {
        logger.error('❌ Error en reporte de métricas:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    console.log('📊 Job de reporte diario de métricas programado');
  }

  /**
   * Ejecutar validación inmediata (bajo demanda)
   */
  static async validateNow() {
    console.log('🔐 Ejecutando validación inmediata...');

    try {
      const license = await licenseLimitsService.getActiveLicense();

      if (!license) {
        throw new Error('No hay licencia activa');
      }

      const validation = await storeApiClient.validateLicense(license.licenseKey);

      // Actualizar timestamp
      await license.update({
        lastValidated: new Date()
      });

      // Limpiar cache
      LicenseSuspensionMiddleware.clearCache();

      return {
        success: true,
        validation: validation
      };

    } catch (error) {
      logger.error('Error en validación inmediata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Actualizar hardware info ahora
   */
  static async updateHardwareNow() {
    console.log('💻 Actualizando información de hardware...');

    try {
      const license = await licenseLimitsService.getActiveLicense();

      if (!license) {
        throw new Error('No hay licencia activa');
      }

      const result = await storeApiClient.updateHardwareInfo(license.licenseKey);

      return result;

    } catch (error) {
      logger.error('Error actualizando hardware:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detener todos los jobs
   */
  static stopAllJobs() {
    console.log('🛑 Deteniendo jobs de validación de licencias...');

    const activeJobs = cron.getTasks();
    activeJobs.forEach((task) => {
      task.stop();
    });

    console.log('✅ Jobs de licencias detenidos');
  }
}

module.exports = LicenseValidationJob;
