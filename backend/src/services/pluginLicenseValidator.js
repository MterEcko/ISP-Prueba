// isp-system/backend/src/services/pluginLicenseValidator.js
class PluginLicenseValidator {
  /**
   * Verificar si un plugin puede ser instalado
   */
  async canInstallPlugin(pluginId) {
    const licenseClient = require('./licenseClient');
    
    // 1. Verificar licencia del sistema
    const systemValidation = await licenseClient.validate();
    
    if (!systemValidation.valid) {
      return {
        allowed: false,
        reason: 'Invalid system license'
      };
    }

    // 2. Verificar si el plugin está incluido en el plan
    const features = systemValidation.features;
    
    if (features.included_plugins.includes('*') || 
        features.included_plugins.includes(pluginId)) {
      return { allowed: true, included: true };
    }

    // 3. Verificar límite de plugins
    const currentPlugins = await this.countInstalledPlugins();
    
    if (features.max_plugins !== -1 && 
        currentPlugins >= features.max_plugins) {
      return {
        allowed: false,
        reason: 'Plugin limit reached',
        current: currentPlugins,
        max: features.max_plugins,
        requiresUpgrade: true
      };
    }

    // 4. Verificar si existe licencia específica del plugin
    const pluginLicense = await this.getPluginLicense(pluginId);
    
    if (pluginLicense && pluginLicense.valid) {
      return { allowed: true, hasPluginLicense: true };
    }

    // 5. Plugin requiere compra
    return {
      allowed: false,
      reason: 'Plugin requires purchase',
      requiresPurchase: true,
      pluginId: pluginId
    };
  }

  /**
   * Obtener licencia de plugin
   */
  async getPluginLicense(pluginId) {
    const db = require('../models');
    
    const pluginLicense = await db.PluginLicense.findOne({
      where: { 
        plugin_id: pluginId,
        status: 'active'
      }
    });

    if (!pluginLicense) return null;

    // Verificar expiración
    if (pluginLicense.expires_at && 
        new Date(pluginLicense.expires_at) < new Date()) {
      return { valid: false, expired: true };
    }

    return {
      valid: true,
      licenseKey: pluginLicense.license_key,
      expiresAt: pluginLicense.expires_at
    };
  }

  /**
   * Activar licencia de plugin
   */
  async activatePluginLicense(pluginId, licenseKey) {
    try {
      // Validar con el store
      const response = await axios.post(
        `${process.env.STORE_API_URL}/licenses/plugin/activate`,
        {
          plugin_id: pluginId,
          license_key: licenseKey,
          system_license_key: await this.getSystemLicenseKey()
        }
      );

      if (response.data.success) {
        // Guardar licencia localmente
        const db = require('../models');
        
        await db.PluginLicense.create({
          plugin_id: pluginId,
          license_key: licenseKey,
          expires_at: response.data.expiresAt,
          status: 'active'
        });

        return { success: true };
      }

      return {
        success: false,
        error: response.data.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async countInstalledPlugins() {
    const db = require('../models');
    return await db.SystemPlugin.count({ where: { active: true } });
  }

  async getSystemLicenseKey() {
    const licenseClient = require('./licenseClient');
    const license = await licenseClient.loadLicenseLocally();
    return license ? license.key : null;
  }
}

module.exports = PluginLicenseValidator;