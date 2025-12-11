const axios = require('axios');
const logger = require('../config/logger');

/**
 * Servicio de Cloudflare para gestión de subdominios
 *
 * Configuración requerida en .env:
 * CLOUDFLARE_API_KEY=tu-api-key
 * CLOUDFLARE_EMAIL=tu-email
 * CLOUDFLARE_ZONE_ID=tu-zone-id
 * CLOUDFLARE_DOMAIN=tudominio.com
 */

class CloudflareService {
  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_KEY;
    this.email = process.env.CLOUDFLARE_EMAIL;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.baseDomain = process.env.CLOUDFLARE_DOMAIN || 'tudominio.com';
    this.apiUrl = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Obtener headers para Cloudflare API
   */
  getHeaders() {
    return {
      'X-Auth-Email': this.email,
      'X-Auth-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Verificar si un subdominio ya existe
   */
  async subdomainExists(subdomain) {
    try {
      const fullDomain = `${subdomain}.${this.baseDomain}`;

      const response = await axios.get(
        `${this.apiUrl}/zones/${this.zoneId}/dns_records?type=A&name=${fullDomain}`,
        { headers: this.getHeaders() }
      );

      return response.data.result.length > 0;
    } catch (error) {
      logger.error('Error verificando subdominio en Cloudflare:', error.message);
      return false;
    }
  }

  /**
   * Crear registro DNS en Cloudflare
   */
  async createDNSRecord(subdomain, targetIP) {
    try {
      const fullDomain = `${subdomain}.${this.baseDomain}`;

      const response = await axios.post(
        `${this.apiUrl}/zones/${this.zoneId}/dns_records`,
        {
          type: 'A',
          name: fullDomain,
          content: targetIP,
          ttl: 3600,
          proxied: true, // Proxy a través de Cloudflare para HTTPS y CDN
          comment: `ISP System - ${subdomain}`
        },
        { headers: this.getHeaders() }
      );

      if (response.data.success) {
        logger.info(`✅ Registro DNS creado en Cloudflare: ${fullDomain} -> ${targetIP}`);
        return {
          success: true,
          record: response.data.result
        };
      } else {
        throw new Error(response.data.errors?.[0]?.message || 'Error creando registro DNS');
      }

    } catch (error) {
      logger.error('Error creando registro DNS en Cloudflare:', error.message);
      throw error;
    }
  }

  /**
   * Actualizar registro DNS existente
   */
  async updateDNSRecord(recordId, targetIP) {
    try {
      const response = await axios.patch(
        `${this.apiUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
        {
          content: targetIP
        },
        { headers: this.getHeaders() }
      );

      if (response.data.success) {
        logger.info(`✅ Registro DNS actualizado en Cloudflare: ${recordId} -> ${targetIP}`);
        return {
          success: true,
          record: response.data.result
        };
      } else {
        throw new Error(response.data.errors?.[0]?.message || 'Error actualizando registro DNS');
      }

    } catch (error) {
      logger.error('Error actualizando registro DNS en Cloudflare:', error.message);
      throw error;
    }
  }

  /**
   * Eliminar registro DNS
   */
  async deleteDNSRecord(recordId) {
    try {
      const response = await axios.delete(
        `${this.apiUrl}/zones/${this.zoneId}/dns_records/${recordId}`,
        { headers: this.getHeaders() }
      );

      if (response.data.success) {
        logger.info(`✅ Registro DNS eliminado de Cloudflare: ${recordId}`);
        return { success: true };
      } else {
        throw new Error(response.data.errors?.[0]?.message || 'Error eliminando registro DNS');
      }

    } catch (error) {
      logger.error('Error eliminando registro DNS de Cloudflare:', error.message);
      throw error;
    }
  }
}

const cloudflareService = new CloudflareService();

/**
 * Crear subdominio en Cloudflare
 * POST /api/cloudflare/subdomain
 */
exports.createSubdomain = async (req, res) => {
  try {
    const { licenseKey, subdomain, companyName, targetIp } = req.body;

    // Validaciones
    if (!licenseKey || !subdomain || !targetIp) {
      return res.status(400).json({
        success: false,
        message: 'Datos incompletos (licenseKey, subdomain, targetIp requeridos)'
      });
    }

    // Validar formato de subdominio
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de subdominio inválido (solo minúsculas, números y guiones)'
      });
    }

    // Verificar si ya existe
    const exists = await cloudflareService.subdomainExists(subdomain);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'El subdominio ya está en uso'
      });
    }

    // Crear registro DNS
    const result = await cloudflareService.createDNSRecord(subdomain, targetIp);

    const fullDomain = `${subdomain}.${cloudflareService.baseDomain}`;

    logger.info(`🌐 Subdominio creado: ${fullDomain} para ${companyName || licenseKey}`);

    return res.status(200).json({
      success: true,
      subdomain: subdomain,
      fullDomain: `https://${fullDomain}`,
      dnsRecords: [
        {
          type: 'A',
          name: fullDomain,
          content: targetIp,
          proxied: true
        }
      ],
      message: 'Subdominio creado exitosamente en Cloudflare'
    });

  } catch (error) {
    logger.error('Error creando subdominio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creando subdominio en Cloudflare',
      error: error.message
    });
  }
};

/**
 * Verificar disponibilidad de subdominio
 * GET /api/cloudflare/subdomain/check/:subdomain
 */
exports.checkSubdomainAvailability = async (req, res) => {
  try {
    const { subdomain } = req.params;

    const exists = await cloudflareService.subdomainExists(subdomain);

    return res.status(200).json({
      success: true,
      subdomain: subdomain,
      available: !exists,
      fullDomain: `${subdomain}.${cloudflareService.baseDomain}`
    });

  } catch (error) {
    logger.error('Error verificando disponibilidad de subdominio:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verificando disponibilidad',
      error: error.message
    });
  }
};

module.exports = exports;
