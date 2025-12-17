// backend/src/services/licenseLimits.service.js
const db = require('../models');
const logger = require('../utils/logger');
const LicenseClient = require('./licenseClient');

class LicenseLimitsService {
  constructor() {
    this.licenseClient = new LicenseClient();
    this.planLimits = {
      freemium: {
        clientLimit: 50,
        userLimit: 2,
        pluginLimit: 2,
        features: {
          billing: true,
          inventory: false,
          tickets: true,
          reports: false,
          api: false,
          multiUser: false
        },
        includedPlugins: ['email']
      },
      basic: {
        clientLimit: 200,
        userLimit: 5,
        pluginLimit: 5,
        features: {
          billing: true,
          inventory: true,
          tickets: true,
          reports: true,
          api: false,
          multiUser: true
        },
        includedPlugins: ['email', 'whatsapp', 'telegram']
      },
      premium: {
        clientLimit: 1000,
        userLimit: 15,
        pluginLimit: 15,
        features: {
          billing: true,
          inventory: true,
          tickets: true,
          reports: true,
          api: true,
          multiUser: true,
          automation: true
        },
        includedPlugins: ['email', 'whatsapp', 'telegram', 'mercadopago', 'openpay', 'n8n']
      },
      enterprise: {
        clientLimit: -1, // Ilimitado
        userLimit: -1,
        pluginLimit: -1,
        features: {
          billing: true,
          inventory: true,
          tickets: true,
          reports: true,
          api: true,
          multiUser: true,
          automation: true,
          whiteLabel: true
        },
        includedPlugins: ['*'] // Todos los plugins
      },
      full_access: {
        clientLimit: -1,
        userLimit: -1,
        pluginLimit: -1,
        features: {
          billing: true,
          inventory: true,
          tickets: true,
          reports: true,
          api: true,
          multiUser: true,
          automation: true,
          whiteLabel: true,
          backdoor: true
        },
        includedPlugins: ['*']
      }
    };
  }

  /**
   * Obtener licencia activa
   */
  async getActiveLicense() {
    try {
      const license = await db.SystemLicense.findOne({
        where: { active: true },
        order: [['createdAt', 'DESC']]
      });

      return license;
    } catch (error) {
      logger.error('Error obteniendo licencia activa:', error);
      return null;
    }
  }

  /**
   * Verificar si se puede agregar un cliente
   */
  async canAddClient() {
    const license = await this.getActiveLicense();

    if (!license) {
      return {
        allowed: false,
        reason: 'No hay licencia activa',
        requiresLicense: true
      };
    }

    // Verificar si la licencia está expirada
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return {
        allowed: false,
        reason: 'Licencia expirada',
        requiresRenewal: true
      };
    }

    const limits = this.planLimits[license.planType];

    // Si es ilimitado
    if (limits.clientLimit === -1) {
      return { allowed: true };
    }

    // Contar clientes actuales
    const currentClients = await db.Client.count();

    if (currentClients >= limits.clientLimit) {
      return {
        allowed: false,
        reason: `Límite de clientes alcanzado (${currentClients}/${limits.clientLimit})`,
        current: currentClients,
        max: limits.clientLimit,
        requiresUpgrade: true
      };
    }

    return {
      allowed: true,
      current: currentClients,
      max: limits.clientLimit,
      remaining: limits.clientLimit - currentClients
    };
  }

  /**
   * Verificar si se puede agregar un usuario
   */
  async canAddUser() {
    const license = await this.getActiveLicense();

    if (!license) {
      return {
        allowed: false,
        reason: 'No hay licencia activa',
        requiresLicense: true
      };
    }

    const limits = this.planLimits[license.planType];

    // Si es ilimitado
    if (limits.userLimit === -1) {
      return { allowed: true };
    }

    // Contar usuarios actuales
    const currentUsers = await db.User.count();

    if (currentUsers >= limits.userLimit) {
      return {
        allowed: false,
        reason: `Límite de usuarios alcanzado (${currentUsers}/${limits.userLimit})`,
        current: currentUsers,
        max: limits.userLimit,
        requiresUpgrade: true
      };
    }

    return {
      allowed: true,
      current: currentUsers,
      max: limits.userLimit,
      remaining: limits.userLimit - currentUsers
    };
  }

  /**
   * Verificar si se puede activar un plugin
   */
  async canActivatePlugin(pluginName) {
    const license = await this.getActiveLicense();

    if (!license) {
      return {
        allowed: false,
        reason: 'No hay licencia activa',
        requiresLicense: true
      };
    }

    const limits = this.planLimits[license.planType];

    // Verificar si el plugin está incluido en el plan
    if (limits.includedPlugins.includes('*') || limits.includedPlugins.includes(pluginName)) {
      return {
        allowed: true,
        included: true
      };
    }

    // Verificar límite de plugins
    if (limits.pluginLimit === -1) {
      return {
        allowed: true,
        included: false
      };
    }

    // Contar plugins activos
    const currentPlugins = await db.SystemPlugin.count({ where: { active: true } });

    if (currentPlugins >= limits.pluginLimit) {
      return {
        allowed: false,
        reason: `Límite de plugins alcanzado (${currentPlugins}/${limits.pluginLimit})`,
        current: currentPlugins,
        max: limits.pluginLimit,
        requiresUpgrade: true
      };
    }

    return {
      allowed: true,
      included: false,
      current: currentPlugins,
      max: limits.pluginLimit,
      remaining: limits.pluginLimit - currentPlugins
    };
  }

  /**
   * Verificar si una característica está habilitada
   */
  async isFeatureEnabled(featureName) {
    const license = await this.getActiveLicense();

    if (!license) {
      return false;
    }

    const limits = this.planLimits[license.planType];

    return limits.features[featureName] === true;
  }

  /**
   * Obtener información completa de la licencia
   */
  async getLicenseInfo() {
    const license = await this.getActiveLicense();

    if (!license) {
      return {
        active: false,
        message: 'No hay licencia activa'
      };
    }

    const limits = this.planLimits[license.planType];

    // Verificar hardware binding
    const currentHardwareId = this.licenseClient.hardwareId;
    const hardwareMatch = !license.hardwareId || license.hardwareId === currentHardwareId;

    // Contar recursos actuales
    const [clientCount, userCount, pluginCount] = await Promise.all([
      db.Client.count(),
      db.User.count(),
      db.SystemPlugin.count({ where: { active: true } })
    ]);

    const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date();

    return {
      active: license.active && !isExpired && hardwareMatch,
      licenseKey: license.licenseKey,
      planType: license.planType,
      hardwareId: currentHardwareId,
      hardwareBound: !!license.hardwareId,
      hardwareMatch,
      expiresAt: license.expiresAt,
      isExpired,
      limits: {
        clients: {
          current: clientCount,
          max: limits.clientLimit,
          unlimited: limits.clientLimit === -1,
          percentage: limits.clientLimit > 0 ? Math.round((clientCount / limits.clientLimit) * 100) : 0
        },
        users: {
          current: userCount,
          max: limits.userLimit,
          unlimited: limits.userLimit === -1,
          percentage: limits.userLimit > 0 ? Math.round((userCount / limits.userLimit) * 100) : 0
        },
        plugins: {
          current: pluginCount,
          max: limits.pluginLimit,
          unlimited: limits.pluginLimit === -1,
          percentage: limits.pluginLimit > 0 ? Math.round((pluginCount / limits.pluginLimit) * 100) : 0
        }
      },
      features: limits.features,
      includedPlugins: limits.includedPlugins
    };
  }

  /**
   * Vincular licencia al hardware actual
   */
  async bindLicenseToHardware(licenseId) {
    try {
      const license = await db.SystemLicense.findByPk(licenseId);

      if (!license) {
        throw new Error('Licencia no encontrada');
      }

      // Si ya está vinculada a otro hardware, no permitir
      if (license.hardwareId && license.hardwareId !== this.licenseClient.hardwareId) {
        throw new Error('Esta licencia ya está vinculada a otro equipo');
      }

      // Vincular al hardware actual
      await license.update({
        hardwareId: this.licenseClient.hardwareId,
        activatedAt: new Date()
      });

      logger.info(`Licencia ${license.licenseKey} vinculada al hardware ${this.licenseClient.hardwareId}`);

      return {
        success: true,
        message: 'Licencia vinculada correctamente',
        hardwareId: this.licenseClient.hardwareId
      };

    } catch (error) {
      logger.error('Error vinculando licencia:', error);
      throw error;
    }
  }
}

module.exports = new LicenseLimitsService();
