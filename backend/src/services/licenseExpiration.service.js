// backend/src/services/licenseExpiration.service.js
const logger = require('../utils/logger');
const axios = require('axios');

class LicenseExpirationService {
  constructor() {
    this.offlineGracePeriodDays = 30; // Días de gracia offline
    this.ntpServers = [
      'http://worldtimeapi.org/api/ip',
      'http://worldclockapi.com/api/json/utc/now'
    ];
  }

  /**
   * Obtener fecha actual real desde servidor NTP
   */
  async getRealDate() {
    for (const server of this.ntpServers) {
      try {
        const response = await axios.get(server, { timeout: 5000 });

        // worldtimeapi.org format
        if (response.data.datetime) {
          return new Date(response.data.datetime);
        }

        // worldclockapi.com format
        if (response.data.currentDateTime) {
          return new Date(response.data.currentDateTime);
        }
      } catch (error) {
        logger.warn(`No se pudo obtener fecha de ${server}: ${error.message}`);
        continue;
      }
    }

    // Si no se pudo obtener de NTP, usar fecha del sistema (con advertencia)
    logger.warn('⚠️ No se pudo verificar fecha con NTP, usando fecha del sistema');
    return new Date();
  }

  /**
   * Detectar manipulación de fecha del sistema
   */
  async detectDateManipulation(license) {
    try {
      const currentDate = new Date();
      const lastKnownDate = license.metadata?.lastKnownDate
        ? new Date(license.metadata.lastKnownDate)
        : null;

      // Primera verificación, no hay lastKnownDate
      if (!lastKnownDate) {
        logger.info('Primera verificación de fecha, guardando lastKnownDate');
        await this.updateLastKnownDate(license, currentDate);
        return {
          manipulated: false,
          currentDate: currentDate,
          lastKnownDate: null
        };
      }

      // Verificar si la fecha actual es menor que la última conocida (retroceso en el tiempo)
      if (currentDate < lastKnownDate) {
        const daysDifference = Math.ceil((lastKnownDate - currentDate) / (1000 * 60 * 60 * 24));

        logger.error(`🚨 MANIPULACIÓN DE FECHA DETECTADA`);
        logger.error(`   - Última fecha conocida: ${lastKnownDate.toISOString()}`);
        logger.error(`   - Fecha actual del sistema: ${currentDate.toISOString()}`);
        logger.error(`   - Retroceso detectado: ${daysDifference} días`);

        return {
          manipulated: true,
          currentDate: currentDate,
          lastKnownDate: lastKnownDate,
          daysDifference: daysDifference
        };
      }

      // Fecha válida, actualizar lastKnownDate
      await this.updateLastKnownDate(license, currentDate);

      return {
        manipulated: false,
        currentDate: currentDate,
        lastKnownDate: lastKnownDate
      };

    } catch (error) {
      logger.error('Error detectando manipulación de fecha:', error.message);
      return {
        manipulated: false,
        error: error.message
      };
    }
  }

  /**
   * Actualizar última fecha conocida
   */
  async updateLastKnownDate(license, date) {
    try {
      await license.update({
        metadata: {
          ...license.metadata,
          lastKnownDate: date.toISOString(),
          lastKnownDateTimestamp: date.getTime()
        }
      });
    } catch (error) {
      logger.error('Error actualizando lastKnownDate:', error.message);
    }
  }

  /**
   * Verificar expiración de licencia (modo online/offline)
   */
  async checkExpiration(license) {
    try {
      const currentDate = new Date();
      const expirationDate = license.expiresAt ? new Date(license.expiresAt) : null;
      const lastHeartbeat = license.lastHeartbeat ? new Date(license.lastHeartbeat) : null;

      // Detectar manipulación de fecha
      const dateCheck = await this.detectDateManipulation(license);

      if (dateCheck.manipulated) {
        return {
          expired: true,
          reason: 'date_manipulation',
          message: 'Manipulación de fecha detectada. La licencia ha sido bloqueada.',
          details: {
            currentDate: dateCheck.currentDate,
            lastKnownDate: dateCheck.lastKnownDate,
            daysDifference: dateCheck.daysDifference
          }
        };
      }

      // Verificar si la licencia tiene fecha de expiración
      if (!expirationDate) {
        // Licencia sin expiración (master license)
        return {
          expired: false,
          reason: 'no_expiration',
          message: 'Licencia sin fecha de expiración'
        };
      }

      // Verificar si está expirada
      if (currentDate > expirationDate) {
        const daysExpired = Math.ceil((currentDate - expirationDate) / (1000 * 60 * 60 * 24));

        return {
          expired: true,
          reason: 'expired',
          message: `Licencia expirada hace ${daysExpired} días`,
          details: {
            expirationDate: expirationDate,
            currentDate: currentDate,
            daysExpired: daysExpired
          }
        };
      }

      // ============================================
      // MODO OFFLINE: Verificar período de gracia
      // ============================================
      if (lastHeartbeat) {
        const daysSinceLastHeartbeat = Math.ceil((currentDate - lastHeartbeat) / (1000 * 60 * 60 * 24));

        if (daysSinceLastHeartbeat > this.offlineGracePeriodDays) {
          logger.warn(`⚠️ Licencia en modo offline por ${daysSinceLastHeartbeat} días (límite: ${this.offlineGracePeriodDays})`);

          return {
            expired: true,
            reason: 'offline_grace_period_exceeded',
            message: `Sin conexión al Store por más de ${this.offlineGracePeriodDays} días. Requiere conexión para validar.`,
            details: {
              lastHeartbeat: lastHeartbeat,
              daysSinceLastHeartbeat: daysSinceLastHeartbeat,
              offlineLimit: this.offlineGracePeriodDays
            }
          };
        } else if (daysSinceLastHeartbeat > 7) {
          logger.info(`ℹ️ Licencia en modo offline: ${daysSinceLastHeartbeat} días sin heartbeat`);
        }
      }

      // Licencia válida
      const daysRemaining = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));

      return {
        expired: false,
        reason: 'valid',
        message: `Licencia válida, expira en ${daysRemaining} días`,
        details: {
          expirationDate: expirationDate,
          currentDate: currentDate,
          daysRemaining: daysRemaining,
          lastHeartbeat: lastHeartbeat
        }
      };

    } catch (error) {
      logger.error('Error verificando expiración:', error.message);
      return {
        expired: false,
        reason: 'error',
        message: 'Error verificando expiración',
        error: error.message
      };
    }
  }

  /**
   * Verificar expiración con fecha NTP (más seguro)
   */
  async checkExpirationWithNTP(license) {
    try {
      const realDate = await this.getRealDate();
      const expirationDate = license.expiresAt ? new Date(license.expiresAt) : null;

      if (!expirationDate) {
        return {
          expired: false,
          reason: 'no_expiration',
          message: 'Licencia sin fecha de expiración',
          ntpVerified: true
        };
      }

      if (realDate > expirationDate) {
        const daysExpired = Math.ceil((realDate - expirationDate) / (1000 * 60 * 60 * 24));

        return {
          expired: true,
          reason: 'expired',
          message: `Licencia expirada hace ${daysExpired} días (verificado con NTP)`,
          ntpVerified: true,
          details: {
            expirationDate: expirationDate,
            realDate: realDate,
            daysExpired: daysExpired
          }
        };
      }

      const daysRemaining = Math.ceil((expirationDate - realDate) / (1000 * 60 * 60 * 24));

      return {
        expired: false,
        reason: 'valid',
        message: `Licencia válida, expira en ${daysRemaining} días (verificado con NTP)`,
        ntpVerified: true,
        details: {
          expirationDate: expirationDate,
          realDate: realDate,
          daysRemaining: daysRemaining
        }
      };

    } catch (error) {
      logger.error('Error verificando con NTP:', error.message);
      // Fallback a verificación normal
      return await this.checkExpiration(license);
    }
  }
}

module.exports = new LicenseExpirationService();
