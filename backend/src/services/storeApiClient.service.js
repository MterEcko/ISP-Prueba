// backend/src/services/storeApiClient.service.js
const axios = require('axios');
const os = require('os');
const crypto = require('crypto');
const logger = require('../utils/logger');

class StoreApiClient {
  constructor() {
    this.storeUrl = process.env.STORE_API_URL || 'https://store.tudominio.com/api';
    this.apiKey = process.env.STORE_API_KEY;
    this.hardwareId = this.generateHardwareId();
    this.locationCache = null;
    this.locationCacheExpiry = null;
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
   * Obtener información completa del hardware
   */
  async getHardwareInfo() {
    const networkInterfaces = os.networkInterfaces();
    const primaryInterface = Object.values(networkInterfaces)
      .flat()
      .find(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00');

    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
      hardwareId: this.hardwareId,
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      osType: os.type(),
      osRelease: os.release(),
      osVersion: os.version(),

      // CPU
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        speed: cpus[0]?.speed || 0
      },

      // Memoria
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        totalGB: (totalMemory / (1024 ** 3)).toFixed(2),
        usedGB: ((totalMemory - freeMemory) / (1024 ** 3)).toFixed(2)
      },

      // Red
      network: {
        mac: primaryInterface?.mac || 'Unknown',
        ip: primaryInterface?.address || 'Unknown',
        family: primaryInterface?.family || 'Unknown'
      },

      // Sistema
      uptime: os.uptime(),
      nodeVersion: process.version,

      // Timestamp
      collectedAt: new Date().toISOString()
    };
  }

  /**
   * Obtener ubicación GPS (usando IP geolocation)
   */
  async getGPSLocation() {
    // Si hay cache válido (menos de 7 días), usar cache
    if (this.locationCache && this.locationCacheExpiry > Date.now()) {
      return this.locationCache;
    }

    try {
      // Usar servicio de geolocalización por IP
      const response = await axios.get('http://ip-api.com/json/', {
        timeout: 5000
      });

      if (response.data.status === 'success') {
        this.locationCache = {
          latitude: response.data.lat,
          longitude: response.data.lon,
          city: response.data.city,
          region: response.data.regionName,
          country: response.data.country,
          countryCode: response.data.countryCode,
          timezone: response.data.timezone,
          isp: response.data.isp,
          ip: response.data.query
        };

        // Cache por 7 días
        this.locationCacheExpiry = Date.now() + (7 * 24 * 60 * 60 * 1000);

        logger.info(`📍 Ubicación GPS obtenida: ${this.locationCache.city}, ${this.locationCache.country}`);
        return this.locationCache;
      }

      throw new Error('No se pudo obtener ubicación');

    } catch (error) {
      logger.warn('No se pudo obtener ubicación GPS:', error.message);
      return null;
    }
  }

  /**
   * Registrar licencia en el Store
   */
  async registerLicense(licenseData) {
    try {
      const hardwareInfo = await this.getHardwareInfo();
      const location = await this.getGPSLocation();

      const payload = {
        licenseKey: licenseData.licenseKey,
        companyId: licenseData.companyId,
        companyName: licenseData.companyName,
        subdomain: licenseData.subdomain || null,

        // Información del hardware
        hardware: hardwareInfo,

        // Ubicación GPS
        location: location,

        // Metadata
        systemVersion: process.env.SYSTEM_VERSION || '1.0.0',
        installedAt: new Date().toISOString()
      };

      const response = await axios.post(
        `${this.storeUrl}/licenses/register`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`✅ Licencia registrada en Store: ${licenseData.licenseKey}`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('Error registrando licencia en Store:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Validar licencia con el Store
   */
  async validateLicense(licenseKey) {
    try {
      const hardwareInfo = await this.getHardwareInfo();

      const response = await axios.post(
        `${this.storeUrl}/licenses/validate`,
        {
          licenseKey: licenseKey,
          hardwareId: this.hardwareId,
          hardware: {
            cpu: hardwareInfo.cpu,
            memory: hardwareInfo.memory,
            platform: hardwareInfo.platform
          },
          systemVersion: process.env.SYSTEM_VERSION || '1.0.0'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Log de debug para ver exactamente qué recibe del Store
      logger.info(`📦 Respuesta del Store: ${JSON.stringify(response.data, null, 2)}`);
      logger.info(`🔍 Valid field value: ${response.data.valid} (type: ${typeof response.data.valid})`);
      logger.info(`✅ Licencia validada con Store: ${response.data.valid ? 'VÁLIDA' : 'INVÁLIDA'}`);

      return {
        valid: response.data.valid,
        status: response.data.status, // active, suspended, expired
        planType: response.data.planType,
        expiresAt: response.data.expiresAt,
        features: response.data.features,
        limits: response.data.limits,
        suspended: response.data.status === 'suspended',
        suspensionReason: response.data.suspensionReason || null
      };

    } catch (error) {
      logger.error('Error validando licencia con Store:', error.message);

      // Si es error de red, permitir validación offline
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return {
          valid: true,
          offline: true,
          warning: 'Validación offline - sin conexión con Store'
        };
      }

      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Actualizar información del hardware en Store
   */
  async updateHardwareInfo(licenseKey) {
    try {
      const hardwareInfo = await this.getHardwareInfo();
      const location = await this.getGPSLocation();

      const response = await axios.put(
        `${this.storeUrl}/licenses/${licenseKey}/hardware`,
        {
          hardware: hardwareInfo,
          location: location,
          lastUpdate: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`✅ Información de hardware actualizada en Store`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('Error actualizando hardware en Store:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear subdominio en Cloudflare (a través del Store)
   */
  async createSubdomain(licenseKey, subdomain, companyName) {
    try {
      const response = await axios.post(
        `${this.storeUrl}/cloudflare/subdomain`,
        {
          licenseKey: licenseKey,
          subdomain: subdomain,
          companyName: companyName,
          targetIp: await this.getPublicIP()
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      logger.info(`✅ Subdominio creado en Cloudflare: ${subdomain}`);

      return {
        success: true,
        subdomain: response.data.subdomain,
        fullDomain: response.data.fullDomain,
        dnsRecords: response.data.dnsRecords
      };

    } catch (error) {
      logger.error('Error creando subdominio en Cloudflare:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Obtener IP pública del servidor
   */
  async getPublicIP() {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      return response.data.ip;
    } catch (error) {
      logger.warn('No se pudo obtener IP pública:', error.message);
      return null;
    }
  }

  /**
   * Reportar métricas de uso al Store
   */
  async reportUsageMetrics(licenseKey) {
    try {
      const db = require('../models');

      const metrics = {
        licenseKey: licenseKey,
        timestamp: new Date().toISOString(),

        // Contadores
        clients: await db.Client.count(),
        users: await db.User.count(),
        activePlugins: await db.SystemPlugin.count({ where: { active: true } }),
        invoices: await db.Invoice.count(),
        payments: await db.Payment.count(),

        // Hardware actual
        hardware: await this.getHardwareInfo()
      };

      const response = await axios.post(
        `${this.storeUrl}/licenses/${licenseKey}/metrics`,
        metrics,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`📊 Métricas de uso reportadas al Store`);

      return {
        success: true,
        data: response.data
      };

    } catch (error) {
      logger.error('Error reportando métricas al Store:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Registrar empresa en el Store
   */
  async registerCompany(companyData) {
    try {
      const response = await axios.post(
        `${this.storeUrl}/companies/register`,
        {
          name: companyData.name,
          rfc: companyData.rfc,
          email: companyData.email,
          phone: companyData.phone,
          address: companyData.address,
          contactName: companyData.contactName,
          licenseKey: companyData.licenseKey,
          subdomain: companyData.subdomain
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`✅ Empresa registrada en Store: ${companyData.name}`);

      return {
        success: true,
        companyId: response.data.companyId,
        data: response.data
      };

    } catch (error) {
      logger.error('Error registrando empresa en Store:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verificar si licencia está suspendida
   */
  async isLicenseSuspended(licenseKey) {
    try {
      const validation = await this.validateLicense(licenseKey);
      return validation.suspended === true;
    } catch (error) {
      logger.error('Error verificando suspensión de licencia:', error.message);
      // En caso de error, asumir que NO está suspendida para evitar bloqueo total
      return false;
    }
  }
}

module.exports = new StoreApiClient();
