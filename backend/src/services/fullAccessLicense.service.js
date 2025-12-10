const crypto = require('crypto');
const logger = require('../utils/logger');

class FullAccessLicenseService {
  constructor() {
    this.username = 'POLUX';
  }

  /**
   * Genera la contraseña dinámica basada en fecha y hora actual en zona horaria de México
   * Formato: YYYYMMDDHHMM en hexadecimal
   * @returns {string} Contraseña en hexadecimal
   */
  generateDynamicPassword() {
    // Usar zona horaria de México (America/Mexico_City)
    const now = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const mexicoDate = new Date(now);

    const year = mexicoDate.getFullYear().toString();
    const month = (mexicoDate.getMonth() + 1).toString().padStart(2, '0');
    const day = mexicoDate.getDate().toString().padStart(2, '0');
    const hours = mexicoDate.getHours().toString().padStart(2, '0');
    const minutes = mexicoDate.getMinutes().toString().padStart(2, '0');

    // Formato: YYYYMMDDHHMM (ej: 202512101430)
    const timeString = `${year}${month}${day}${hours}${minutes}`;

    // Convertir a hexadecimal
    const hexPassword = Buffer.from(timeString).toString('hex');

    return hexPassword;
  }

  /**
   * Valida si una contraseña coincide con la actual o la del minuto anterior
   * (para permitir un margen de tiempo durante el cambio de minuto)
   * @param {string} password - Contraseña a validar
   * @returns {boolean} True si es válida
   */
  validatePassword(password) {
    try {
      // Contraseña actual
      const currentPassword = this.generateDynamicPassword();

      if (password === currentPassword) {
        return true;
      }

      // También aceptar la contraseña del minuto anterior
      // para evitar problemas de sincronización
      const oneMinuteAgoUTC = Date.now() - 60000;
      const oneMinuteAgoStr = new Date(oneMinuteAgoUTC).toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
      const oneMinuteAgo = new Date(oneMinuteAgoStr);

      const year = oneMinuteAgo.getFullYear().toString();
      const month = (oneMinuteAgo.getMonth() + 1).toString().padStart(2, '0');
      const day = oneMinuteAgo.getDate().toString().padStart(2, '0');
      const hours = oneMinuteAgo.getHours().toString().padStart(2, '0');
      const minutes = oneMinuteAgo.getMinutes().toString().padStart(2, '0');

      const previousTimeString = `${year}${month}${day}${hours}${minutes}`;
      const previousPassword = Buffer.from(previousTimeString).toString('hex');

      return password === previousPassword;

    } catch (error) {
      logger.error(`Error validando contraseña Full Access: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica las credenciales de Full Access
   * @param {string} username - Usuario
   * @param {string} password - Contraseña en hexadecimal
   * @returns {boolean} True si las credenciales son válidas
   */
  authenticate(username, password) {
    if (username !== this.username) {
      return false;
    }

    return this.validatePassword(password);
  }

  /**
   * Obtiene información sobre la contraseña actual (para debug/testing)
   * @returns {object} Información de la contraseña
   */
  getPasswordInfo() {
    const now = new Date();
    const currentPassword = this.generateDynamicPassword();

    return {
      username: this.username,
      currentTime: now.toISOString(),
      passwordFormat: 'YYYYMMDDHHMM en hexadecimal',
      examplePlainText: now.toISOString().replace(/[-:T.Z]/g, '').substring(0, 12),
      currentPasswordHex: currentPassword,
      validityWindow: '1 minuto (actual + anterior)'
    };
  }
}

module.exports = new FullAccessLicenseService();
