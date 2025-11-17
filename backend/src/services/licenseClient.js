// isp-system/backend/src/services/licenseClient.js
const crypto = require('crypto');
const os = require('os');
const axios = require('axios');

class LicenseClient {
  constructor() {
    this.storeUrl = process.env.STORE_API_URL;
    this.licenseKey = null;
    this.cachedValidation = null;
    this.cacheExpiry = null;
    this.hardwareId = this.generateHardwareId();
  }

  /**
   * Activar licencia por primera vez
   */
  async activate(licenseKey) {
    try {
      const response = await axios.post(`${this.storeUrl}/licenses/activate`, {
        license_key: licenseKey,
        hardware_id: this.hardwareId,
        system_version: process.env.SYSTEM_VERSION,
        hostname: os.hostname()
      });

      if (response.data.success) {
        // Guardar licencia
        this.licenseKey = licenseKey;
        await this.saveLicenseLocally(licenseKey, response.data.license);
        
        return {
          success: true,
          license: response.data.license
        };
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

  /**
   * Validar licencia
   */
  async validate() {
    // Si hay cache válido, usar cache
    if (this.cachedValidation && Date.now() < this.cacheExpiry) {
      return this.cachedValidation;
    }

    try {
      // Cargar licencia guardada
      const localLicense = await this.loadLicenseLocally();
      
      if (!localLicense) {
        return {
          valid: false,
          error: 'No license found'
        };
      }

      // Validar con el servidor
      const response = await axios.post(`${this.storeUrl}/licenses/validate`, {
        license_key: localLicense.key,
        hardware_id: this.hardwareId,
        system_version: process.env.SYSTEM_VERSION,
        metrics: await this.collectMetrics()
      });

      const result = {
        valid: response.data.valid,
        license: response.data.license,
        features: response.data.features,
        expiresAt: response.data.expiresAt,
        daysRemaining: response.data.daysRemaining
      };

      // Cachear por 24 horas
      this.cachedValidation = result;
      this.cacheExpiry = Date.now() + (24 * 60 * 60 * 1000);

      return result;

    } catch (error) {
      // Si hay error de red, usar validación offline
      return await this.offlineValidation();
    }
  }

  /**
   * Validación offline (fallback)
   */
  async offlineValidation() {
    const localLicense = await this.loadLicenseLocally();
    
    if (!localLicense) {
      return { valid: false, error: 'No license' };
    }

    // Verificar expiración
    if (localLicense.expiresAt) {
      const expires = new Date(localLicense.expiresAt);
      if (expires < new Date()) {
        return { 
          valid: false, 
          error: 'License expired',
          offline: true 
        };
      }
    }

    // Verificar hardware binding
    if (localLicense.hardwareId !== this.hardwareId) {
      return { 
        valid: false, 
        error: 'Hardware mismatch',
        offline: true 
      };
    }

    return {
      valid: true,
      license: localLicense,
      offline: true,
      warning: 'Offline validation - please reconnect to verify'
    };
  }

  /**
   * Generar Hardware ID único
   */
  generateHardwareId() {
    const machineData = [
      os.hostname(),
      os.arch(),
      os.platform(),
      os.cpus()[0]?.model || '',
      Object.values(os.networkInterfaces())
        .flat()
        .find(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
        ?.mac || ''
    ].filter(Boolean).join('|');
    
    return crypto
      .createHash('sha256')
      .update(machineData)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Verificar si plugin está permitido
   */
  async canInstallPlugin(pluginId) {
    const validation = await this.validate();
    
    if (!validation.valid) {
      return {
        allowed: false,
        reason: 'Invalid license'
      };
    }

    const features = validation.features;
    
    // Verificar si el plugin está incluido
    if (features.included_plugins.includes('*') || 
        features.included_plugins.includes(pluginId)) {
      return { allowed: true };
    }

    // Verificar límite de plugins
    const currentPlugins = await this.countInstalledPlugins();
    
    if (features.max_plugins !== -1 && 
        currentPlugins >= features.max_plugins) {
      return {
        allowed: false,
        reason: 'Plugin limit reached',
        current: currentPlugins,
        max: features.max_plugins
      };
    }

    // Plugin no incluido, pero hay espacio
    return {
      allowed: false,
      reason: 'Plugin not included in plan',
      requiresPurchase: true
    };
  }

  /**
   * Recopilar métricas del sistema
   */
  async collectMetrics() {
    const db = require('../models');
    
    const clientCount = await db.Client.count();
    const pluginCount = await db.SystemPlugin.count({ where: { active: true } });
    
    return {
      client_count: clientCount,
      plugin_count: pluginCount,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    };
  }

  /**
   * Guardar licencia localmente
   */
  async saveLicenseLocally(key, licenseData) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const licenseFile = path.join(process.cwd(), '.license');
    
    const data = {
      key: key,
      hardwareId: this.hardwareId,
      ...licenseData,
      savedAt: new Date()
    };
    
    // Cifrar antes de guardar
    const encrypted = this.encrypt(JSON.stringify(data));
    
    await fs.writeFile(licenseFile, encrypted, 'utf8');
  }

  /**
   * Cargar licencia local
   */
  async loadLicenseLocally() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const licenseFile = path.join(process.cwd(), '.license');
    
    try {
      const encrypted = await fs.readFile(licenseFile, 'utf8');
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cifrar datos
   */
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.hardwareId, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descifrar datos
   */
  decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.hardwareId, 'salt', 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Contar plugins instalados
   */
  async countInstalledPlugins() {
    const db = require('../models');
    return await db.SystemPlugin.count({ where: { active: true } });
  }
}

module.exports = LicenseClient;