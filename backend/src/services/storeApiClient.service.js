// backend/src/services/storeApiClient.service.js
const axios = require('axios');
const os = require('os');
const crypto = require('crypto');
const logger = require('../utils/logger');
const si = require('systeminformation');

class StoreApiClient {
  constructor() {
    this.storeUrl = process.env.STORE_API_URL || 'https://store.serviciosqbit.net/api';
    this.fallbackUrl = process.env.STORE_API_FALLBACK_URL || 'http://localhost:3001/api';
    this.apiKey = process.env.STORE_API_KEY;
    this.hardwareId = this.generateHardwareId();
    this.locationCache = null;
    this.locationCacheExpiry = null;

    // Log de configuración para debugging
    logger.info(`🔧 StoreApiClient inicializado:`);
    logger.info(`   - URL principal: ${this.storeUrl}`);
    logger.info(`   - URL fallback: ${this.fallbackUrl}`);
    logger.info(`   - STORE_API_KEY: ${this.apiKey ? 'Sí' : 'No'}`);
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

    // Información detallada de hardware usando systeminformation
    let motherboard = { manufacturer: 'Unknown', model: 'Unknown', serial: 'Unknown' };
    let diskInfo = { total: 0, used: 0, free: 0, totalGB: 0, freeGB: 0, filesystems: [] };
    let osInfo = { distro: 'Unknown', release: 'Unknown', arch: os.arch(), platform: os.platform() };

    try {
      // Información de placa madre
      const baseboard = await si.baseboard();
      motherboard = {
        manufacturer: baseboard.manufacturer || 'Unknown',
        model: baseboard.model || 'Unknown',
        serial: baseboard.serial || 'Unknown'
      };

      // Información de discos (todos los filesystems)
      const fsSize = await si.fsSize();
      const totalDiskSpace = fsSize.reduce((acc, fs) => acc + fs.size, 0);
      const usedDiskSpace = fsSize.reduce((acc, fs) => acc + fs.used, 0);
      const freeDiskSpace = fsSize.reduce((acc, fs) => acc + fs.available, 0);

      diskInfo = {
        total: totalDiskSpace,
        used: usedDiskSpace,
        free: freeDiskSpace,
        totalGB: (totalDiskSpace / (1024 ** 3)).toFixed(2),
        freeGB: (freeDiskSpace / (1024 ** 3)).toFixed(2),
        usedGB: (usedDiskSpace / (1024 ** 3)).toFixed(2),
        filesystems: fsSize.map(fs => ({
          mount: fs.mount,
          type: fs.type,
          totalGB: (fs.size / (1024 ** 3)).toFixed(2),
          freeGB: (fs.available / (1024 ** 3)).toFixed(2),
          usedPercent: fs.use
        }))
      };

      // Información detallada del SO
      const osData = await si.osInfo();
      osInfo = {
        distro: osData.distro || 'Unknown',
        release: osData.release || os.release(),
        codename: osData.codename || '',
        kernel: osData.kernel || '',
        arch: osData.arch || os.arch(),
        platform: osData.platform || os.platform(),
        hostname: osData.hostname || os.hostname()
      };

    } catch (error) {
      logger.warn('No se pudo obtener información detallada del hardware:', error.message);
    }

    return {
      hardwareId: this.hardwareId,
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      osType: os.type(),
      osRelease: os.release(),
      osVersion: os.version(),

      // Sistema Operativo detallado
      os: osInfo,

      // CPU
      cpu: {
        model: cpus[0]?.model || 'Unknown',
        cores: cpus.length,
        speed: cpus[0]?.speed || 0
      },

      // Placa Madre
      motherboard: motherboard,

      // Memoria
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        totalGB: (totalMemory / (1024 ** 3)).toFixed(2),
        freeGB: (freeMemory / (1024 ** 3)).toFixed(2),
        usedGB: ((totalMemory - freeMemory) / (1024 ** 3)).toFixed(2)
      },

      // Discos
      disk: diskInfo,

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
   * Registrar licencia en el Store (con fallback automático)
   */
  async registerLicense(licenseData) {
    const hardwareInfo = await this.getHardwareInfo();
    const location = await this.getGPSLocation();

    const payload = {
      licenseKey: licenseData.licenseKey,
      companyId: licenseData.companyId,
      companyName: licenseData.companyName,
      companyRfc: licenseData.companyRfc,
      companyEmail: licenseData.companyEmail,
      companyPhone: licenseData.companyPhone,
      companyAddress: licenseData.companyAddress,
      contactName: licenseData.contactName,
      subdomain: licenseData.subdomain || null,
      hardware: hardwareInfo,
      location: location,
      systemVersion: process.env.SYSTEM_VERSION || '1.0.0',
      installedAt: new Date().toISOString()
    };

    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const urls = [this.storeUrl, this.fallbackUrl];

    for (let i = 0; i < urls.length; i++) {
      const baseUrl = urls[i];
      const fullUrl = `${baseUrl}/licenses/register`;

      try {
        logger.info(`🌐 Registrando licencia en: ${baseUrl} (${i === 0 ? 'principal' : 'fallback'})`);

        const response = await axios.post(fullUrl, payload, config);

        if (i > 0) {
          logger.warn(`⚠️  Usando Store fallback: ${baseUrl}`);
        }

        logger.info(`✅ Licencia registrada en Store: ${licenseData.licenseKey}`);

        return {
          success: true,
          data: response.data
        };

      } catch (error) {
        const isNetworkError = error.code === 'ECONNREFUSED' ||
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ENOTFOUND' ||
                               error.response?.status === 502 ||
                               error.response?.status === 503;

        if (isNetworkError && i < urls.length - 1) {
          logger.warn(`⚠️  Fallo en ${baseUrl}, intentando fallback...`);
          continue;
        }

        logger.error('Error registrando licencia en Store:', error.message);
        return {
          success: false,
          error: error.response?.data?.message || error.message
        };
      }
    }
  }

  /**
   * Validar licencia con el Store (con fallback automático)
   */
  async validateLicense(licenseKey) {
    const hardwareInfo = await this.getHardwareInfo();
    const payload = {
      licenseKey: licenseKey,
      hardwareId: this.hardwareId,
      hardware: {
        cpu: hardwareInfo.cpu,
        memory: hardwareInfo.memory,
        platform: hardwareInfo.platform
      },
      systemVersion: process.env.SYSTEM_VERSION || '1.0.0'
    };

    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const urls = [this.storeUrl, this.fallbackUrl];
    let lastError;

    for (let i = 0; i < urls.length; i++) {
      const baseUrl = urls[i];
      const fullUrl = `${baseUrl}/licenses/validate`;

      try {
        logger.info(`🌐 Validando licencia en: ${baseUrl} (${i === 0 ? 'principal' : 'fallback'})`);

        const response = await axios.post(fullUrl, payload, config);

        if (i > 0) {
          logger.warn(`⚠️  Usando Store fallback: ${baseUrl}`);
        }

        // Log de debug para ver exactamente qué recibe del Store
        logger.info(`📦 Respuesta del Store: ${JSON.stringify(response.data, null, 2)}`);
        logger.info(`🔍 Valid field value: ${response.data.valid} (type: ${typeof response.data.valid})`);
        logger.info(`✅ Licencia validada con Store: ${response.data.valid ? 'VÁLIDA' : 'INVÁLIDA'}`);

        return {
          valid: response.data.valid,
          status: response.data.status,
          planType: response.data.planType,
          expiresAt: response.data.expiresAt,
          features: response.data.features,
          limits: response.data.limits,
          suspended: response.data.status === 'suspended',
          suspensionReason: response.data.suspensionReason || null,
          clientData: response.data.clientData || null
        };

      } catch (error) {
        lastError = error;
        const isNetworkError = error.code === 'ECONNREFUSED' ||
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ENOTFOUND' ||
                               error.response?.status === 502 ||
                               error.response?.status === 503;

        if (isNetworkError && i < urls.length - 1) {
          logger.warn(`⚠️  Fallo en ${baseUrl} (${error.message}), intentando fallback...`);
          continue;
        }

        // Si llegamos aquí y es el último intento, loguear error y retornar offline
        logger.error('Error validando licencia con Store:', error.message);

        // Si es error de red y ya probamos todos los URLs, permitir modo offline
        if (isNetworkError) {
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

    // Fallback final si todo falla
    return {
      valid: false,
      error: lastError?.message || 'Error desconocido'
    };
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

  /**
   * Enviar heartbeat al Store
   */
  async sendHeartbeat(payload) {
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const urls = [this.storeUrl, this.fallbackUrl];
    let lastError;

    for (let i = 0; i < urls.length; i++) {
      const baseUrl = urls[i];
      const fullUrl = `${baseUrl}/licenses/heartbeat`;

      try {
        logger.info(`💓 Enviando heartbeat a: ${baseUrl} (${i === 0 ? 'principal' : 'fallback'})`);

        const response = await axios.post(fullUrl, payload, config);

        if (i > 0) {
          logger.warn(`⚠️  Usando Store fallback: ${baseUrl}`);
        }

        logger.info(`✅ Heartbeat recibido por Store: ${response.data.message || 'OK'}`);

        return {
          success: true,
          data: response.data
        };

      } catch (error) {
        lastError = error;
        const isNetworkError = error.code === 'ECONNREFUSED' ||
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ENOTFOUND' ||
                               error.response?.status === 502 ||
                               error.response?.status === 503;

        if (isNetworkError && i < urls.length - 1) {
          logger.warn(`⚠️  Fallo en ${baseUrl} (${error.message}), intentando fallback...`);
          continue;
        }

        logger.error('Error enviando heartbeat al Store:', error.message);
        return {
          success: false,
          error: error.response?.data?.message || error.message
        };
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Error desconocido'
    };
  }
}

module.exports = new StoreApiClient();
