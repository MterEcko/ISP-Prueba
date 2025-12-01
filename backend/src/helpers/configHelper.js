// backend/src/helpers/configHelper.js
const crypto = require('crypto');

// Clave de cifrado (debe estar en variables de entorno)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

class ConfigHelper {
  constructor() {
    this.db = null;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    this.lastCacheUpdate = null;
  }

  // Inicializar con la instancia de DB
  init(db) {
    this.db = db;
  }

  // ===============================
  // CIFRADO Y DESCIFRADO
  // ===============================

  encrypt(text) {
    if (!text) return text;
    
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error cifrando valor:', error);
      return text;
    }
  }

  decrypt(text) {
    if (!text || !text.includes(':')) return text;
    
    try {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error descifrando valor:', error);
      return text;
    }
  }

  // ===============================
  // GESTIÓN DE CACHÉ
  // ===============================

  shouldRefreshCache() {
    if (!this.lastCacheUpdate) return true;
    return (Date.now() - this.lastCacheUpdate) > this.cacheExpiry;
  }

  invalidateCache() {
    this.cache.clear();
    this.lastCacheUpdate = null;
    console.log('✓ Caché de configuraciones invalidado');
  }

  // ===============================
  // OBTENER CONFIGURACIONES
  // ===============================

  async loadAllConfigs() {
    try {
      if (!this.db || !this.db.SystemConfiguration) {
        throw new Error('DB no inicializada en ConfigHelper');
      }

      const configs = await this.db.SystemConfiguration.findAll({
        where: { active: true }
      });

      this.cache.clear();

      configs.forEach(config => {
        let value = config.configValue;

        // Procesar según tipo
        switch (config.configType) {
          case 'encrypted':
            value = this.decrypt(value);
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.error(`Error parseando JSON para ${config.configKey}:`, e);
            }
            break;
          case 'string':
          default:
            // Convertir strings booleanos
            if (value === 'true') value = true;
            if (value === 'false') value = false;
            // Convertir strings numéricos
            if (!isNaN(value) && value !== '') {
              const num = Number(value);
              if (!isNaN(num)) value = num;
            }
            break;
        }

        this.cache.set(config.configKey, {
          value,
          module: config.module,
          type: config.configType,
          description: config.description
        });
      });

      this.lastCacheUpdate = Date.now();
      console.log(`✓ Cargadas ${configs.length} configuraciones en caché`);

      return this.cache;
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      throw error;
    }
  }

  async get(key, defaultValue = null) {
    try {
      if (this.shouldRefreshCache()) {
        await this.loadAllConfigs();
      }

      const config = this.cache.get(key);
      return config ? config.value : defaultValue;
    } catch (error) {
      console.error(`Error obteniendo configuración ${key}:`, error);
      return defaultValue;
    }
  }

  async getByModule(module) {
    try {
      if (this.shouldRefreshCache()) {
        await this.loadAllConfigs();
      }

      const configs = {};
      this.cache.forEach((config, key) => {
        if (config.module === module) {
          configs[key] = config.value;
        }
      });

      return configs;
    } catch (error) {
      console.error(`Error obteniendo configuraciones del módulo ${module}:`, error);
      return {};
    }
  }

  async getAll() {
    try {
      if (this.shouldRefreshCache()) {
        await this.loadAllConfigs();
      }

      const allConfigs = {};
      this.cache.forEach((config, key) => {
        if (!allConfigs[config.module]) {
          allConfigs[config.module] = {};
        }
        allConfigs[config.module][key] = config.value;
      });

      return allConfigs;
    } catch (error) {
      console.error('Error obteniendo todas las configuraciones:', error);
      return {};
    }
  }

  // ===============================
  // CONFIGURACIONES POR MÓDULO
  // ===============================

  async getEmailConfig() {
    const configs = await this.getByModule('email');
    const port = parseInt(configs.smtpPort) || 587;
    
    console.log('🔍 DEBUG getEmailConfig:');
    console.log('   - smtpPort raw:', configs.smtpPort);
    console.log('   - smtpPort parsed:', port);
    console.log('   - typeof port:', typeof port);
    console.log('   - port === 465:', port === 465);
    console.log('   - secure calculado:', port === 465);
    
    return {
      host: configs.smtpHost || 'smtp.gmail.com',
      port: port,
      // secure DEBE ser true para puerto 465 (SSL directo)
      // secure DEBE ser false para puerto 587 (STARTTLS)
      secure: port === 465,
      auth: {
        user: configs.smtpUser || '',
        pass: configs.smtpPassword || ''
      },
      from: {
        name: configs.emailFromName || 'Sistema ISP',
        address: configs.emailFromAddress || configs.smtpUser || ''
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000
    };
  }

  async getTelegramConfig() {
    const configs = await this.getByModule('telegram');

    // PostgreSQL puede devolver 1/0 (número) en lugar de true/false o 'true'/'false'
    const enabled = configs.telegramEnabled === true ||
                   configs.telegramEnabled === 'true' ||
                   configs.telegramEnabled === 1 ||
                   configs.telegramEnabled === '1';

    return {
      enabled: enabled,
      botToken: configs.telegramBotToken || '',
      chatId: configs.telegramChatId || ''
    };
  }

  async getWhatsAppConfig() {
    const configs = await this.getByModule('whatsapp');

    console.log('🔍 DEBUG getWhatsAppConfig - Raw configs from DB:', configs);
    console.log('🔍 whatsappEnabled value:', configs.whatsappEnabled);
    console.log('🔍 whatsappEnabled type:', typeof configs.whatsappEnabled);

    // PostgreSQL puede devolver 1/0 (número) en lugar de true/false o 'true'/'false'
    const enabled = configs.whatsappEnabled === true ||
                   configs.whatsappEnabled === 'true' ||
                   configs.whatsappEnabled === 1 ||
                   configs.whatsappEnabled === '1';

    console.log('🔍 Enabled result:', enabled);

    return {
      enabled: enabled,
      method: configs.whatsappMethod || 'twilio',
      apiUrl: configs.whatsappApiUrl || '',
      token: configs.whatsappToken || '',
      // Twilio específico
      twilio: {
        accountSid: configs.whatsappTwilioAccountSid || '',
        authToken: configs.whatsappTwilioAuthToken || '',
        phoneNumber: configs.whatsappTwilioNumber || ''
      },
      // Meta API específico
      api: {
        apiUrl: configs.whatsappApiUrl || '',
        phoneNumberId: configs.whatsappPhoneNumberId || '',
        apiToken: configs.whatsappApiToken || ''
      }
    };
  }

  async getJellyfinConfig() {
    const configs = await this.getByModule('jellyfin');
    return {
      enabled: configs.jellyfinEnabled === true || configs.jellyfinEnabled === 'true',
      url: configs.jellyfinUrl || 'http://localhost:8096',
      apiKey: configs.jellyfinApiKey || '',
      jfaGoUrl: configs.jfaGoUrl || 'http://localhost:8056',
      jfaGoDbPath: configs.jfaGoDbPath || '',
      jfaGoEnabled: configs.jfaGoEnabled === true || configs.jfaGoEnabled === 'true'
    };
  }

  async getPaymentConfig() {
    const configs = await this.getByModule('payments');
    return {
      mercadoPago: {
        enabled: configs.mercadoPagoEnabled === true || configs.mercadoPagoEnabled === 'true',
        accessToken: configs.mercadoPagoAccessToken || '',
        publicKey: configs.mercadoPagoPublicKey || '',
        webhookUrl: configs.mercadoPagoWebhookUrl || ''
      },
      paypal: {
        enabled: configs.paypalEnabled === true || configs.paypalEnabled === 'true',
        clientId: configs.paypalClientId || '',
        clientSecret: configs.paypalClientSecret || '',
        sandbox: configs.paypalSandbox === true || configs.paypalSandbox === 'true'
      }
    };
  }

  async getGeneralConfig() {
    const configs = await this.getByModule('general');
    return {
      companyName: configs.companyName || 'Mi ISP',
      companyAddress: configs.companyAddress || '',
      companyPhone: configs.companyPhone || '',
      companyEmail: configs.companyEmail || '',
      companyWebsite: configs.companyWebsite || '',
      timeZone: configs.timeZone || 'America/Mexico_City',
      currency: configs.currency || 'MXN',
      systemVersion: configs.systemVersion || '1.0.0'
    };
  }

  async getMapConfig() {
    const configs = await this.getByModule('maps');
    return {
      provider: configs.mapProvider || 'openstreetmap',
      googleMapsApiKey: configs.googleMapsApiKey || '',
      defaultCenter: configs.defaultMapCenter || { lat: 20.659699, lng: -103.349609 },
      defaultZoom: parseInt(configs.defaultMapZoom) || 11
    };
  }

  async getMonitoringConfig() {
    const configs = await this.getByModule('monitoring');
    return {
      interval: parseInt(configs.monitoringInterval) || 300,
      thresholds: {
        cpu: parseInt(configs.alertThresholdCpu) || 85,
        memory: parseInt(configs.alertThresholdMemory) || 90,
        disk: parseInt(configs.alertThresholdDisk) || 95
      },
      retentionDays: parseInt(configs.retentionDays) || 30
    };
  }

  async getBillingConfig() {
    const configs = await this.getByModule('billing');
    return {
      taxRate: parseFloat(configs.taxRate) || 16,
      graceDays: parseInt(configs.graceDays) || 5,
      reminderDays: configs.reminderDays ? 
        configs.reminderDays.split(',').map(d => parseInt(d.trim())) : 
        [3, 7, 15],
      autoSuspendDays: parseInt(configs.autoSuspendDays) || 15,
      invoicePrefix: configs.invoicePrefix || 'INV'
    };
  }

  // ===============================
  // ACTUALIZAR CONFIGURACIONES
  // ===============================

  async set(key, value, options = {}) {
    try {
      if (!this.db || !this.db.SystemConfiguration) {
        throw new Error('DB no inicializada en ConfigHelper');
      }

      // Soportar tanto string como objeto para retrocompatibilidad
      let configType, module, description;
      if (typeof options === 'string') {
        configType = options;
        module = 'general';
        description = null;
      } else {
        configType = options.configType || options.type || 'string';
        module = options.module || 'general';
        description = options.description || null;
      }

      // Procesar valor según tipo
      let processedValue = value;

      if (configType === 'encrypted') {
        processedValue = this.encrypt(value);
      } else if (configType === 'json') {
        processedValue = typeof value === 'string' ? value : JSON.stringify(value);
      } else {
        processedValue = String(value);
      }

      // Actualizar en DB
      const [config, created] = await this.db.SystemConfiguration.findOrCreate({
        where: { configKey: key },
        defaults: {
          configValue: processedValue,
          configType: configType,
          module: module,
          description: description,
          active: true
        }
      });

      if (!created) {
        await config.update({
          configValue: processedValue,
          configType: configType,
          module: module,
          description: description || config.description
        });
      }

      // Invalidar caché
      this.invalidateCache();

      return true;
    } catch (error) {
      console.error(`Error actualizando configuración ${key}:`, error);
      throw error;
    }
  }

  async setBulk(configs) {
    try {
      const promises = Object.entries(configs).map(([key, data]) => {
        return this.set(key, data.value, data.type || 'string');
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error actualizando configuraciones en bulk:', error);
      throw error;
    }
  }

  async updateModule(module, configs) {
    try {
      if (!this.db || !this.db.SystemConfiguration) {
        throw new Error('DB no inicializada en ConfigHelper');
      }

      const updatePromises = Object.entries(configs).map(async ([key, value]) => {
        let existingConfig = await this.db.SystemConfiguration.findOne({
          where: { configKey: key }
        });

        // Si no existe, crear la configuración
        if (!existingConfig) {
          console.log(`📝 Creando nueva configuración: ${key} en módulo ${module}`);
          existingConfig = await this.db.SystemConfiguration.create({
            configKey: key,
            configValue: String(value),
            configType: 'text',
            module: module,
            description: `Configuración de ${key}`
          });
          return existingConfig;
        }

        // Si existe, actualizarla
        let processedValue = value;
        if (existingConfig.configType === 'encrypted') {
          processedValue = this.encrypt(value);
        } else if (existingConfig.configType === 'json') {
          processedValue = typeof value === 'string' ? value : JSON.stringify(value);
        } else {
          processedValue = String(value);
        }

        return existingConfig.update({ configValue: processedValue });
      });

      await Promise.all(updatePromises);
      this.invalidateCache();

      return true;
    } catch (error) {
      console.error(`Error actualizando módulo ${module}:`, error);
      throw error;
    }
  }
}

// Exportar instancia singleton
const configHelper = new ConfigHelper();
module.exports = configHelper;