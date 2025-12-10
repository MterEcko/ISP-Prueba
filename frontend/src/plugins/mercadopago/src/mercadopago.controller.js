// backend/src/plugins/mercadopago/src/mercadopago.controller.js
const mercadopagoService = require('./mercadopago.service');
const logger = require('../../../utils/logger');

class MercadoPagoController {
  /**
   * Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'mercadopago',
      version: '1.0.0',
      description: 'Plugin para procesamiento de pagos con MercadoPago',
      category: 'payment',
      channelType: 'payment_gateway',
      author: 'Sistema ISP',
      capabilities: ['process_payment', 'refund', 'webhook', 'payment_status'],
      supportedMethods: ['credit_card', 'debit_card', 'pix', 'boleto', 'oxxo', 'spei'],
      countries: ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'],
      configSchema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            title: 'Access Token',
            description: 'Token de acceso de MercadoPago'
          },
          sandbox: {
            type: 'boolean',
            title: 'Modo Sandbox',
            description: 'Activar modo de pruebas',
            default: false
          },
          webhookSecret: {
            type: 'string',
            title: 'Webhook Secret',
            description: 'Secreto para verificar webhooks (opcional)'
          },
          country: {
            type: 'string',
            enum: ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'],
            title: 'País',
            description: 'País de operación',
            default: 'MX'
          }
        },
        required: ['accessToken']
      }
    };
  }

  /**
   * Inicializar plugin
   */
  static async initialize(config) {
    try {
      logger.info('Inicializando plugin de MercadoPago');
      
      // Validar configuración
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Inicializar servicio
      const client = await mercadopagoService.initialize(config);

      logger.info('Plugin de MercadoPago inicializado exitosamente');
      return client;

    } catch (error) {
      logger.error(`Error inicializando plugin de MercadoPago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validar configuración
   */
  static validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuración es requerida'] };
    }

    if (!config.accessToken) {
      errors.push('Access Token es requerido');
    } else if (!config.accessToken.startsWith('APP_USR-') && !config.accessToken.startsWith('TEST-')) {
      errors.push('Access Token de MercadoPago inválido');
    }

    if (config.country && !['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'].includes(config.country)) {
      errors.push('País no soportado');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Procesar pago
   */
  static async processPayment(client, paymentData) {
    try {
      // Usar el cliente del servicio si no se proporciona uno específico
      const merchantClient = client || mercadopagoService.client;
      
      if (!merchantClient) {
        throw new Error('Plugin MercadoPago no inicializado');
      }

      const result = await mercadopagoService.processPayment(merchantClient, paymentData);
      return result;
      
    } catch (error) {
      logger.error(`Error procesando pago MercadoPago: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar webhook
   */
  static async processWebhook(client, webhookData) {
    try {
      const merchantClient = client || mercadopagoService.client;
      
      if (!merchantClient) {
        logger.warn('Plugin MercadoPago no inicializado para webhook');
        return null;
      }

      return await mercadopagoService.processWebhook(merchantClient, webhookData);
      
    } catch (error) {
      logger.error(`Error procesando webhook MercadoPago: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar firma de webhook
   */
  static async verifyWebhookSignature(data, signature, secret) {
    try {
      return await mercadopagoService.verifyWebhookSignature(data, signature, secret);
    } catch (error) {
      logger.error(`Error verificando firma de webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener estado de pago
   */
  static async getPaymentStatus(client, reference) {
    try {
      const merchantClient = client || mercadopagoService.client;
      
      if (!merchantClient) {
        throw new Error('Plugin MercadoPago no inicializado');
      }

      return await mercadopagoService.getPaymentStatus(merchantClient, reference);
      
    } catch (error) {
      logger.error(`Error obteniendo estado de pago MercadoPago: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Reembolsar pago
   */
  static async refundPayment(client, paymentId, amount = null) {
    try {
      const merchantClient = client || mercadopagoService.client;
      
      if (!merchantClient) {
        throw new Error('Plugin MercadoPago no inicializado');
      }

      return await mercadopagoService.refundPayment(merchantClient, paymentId, amount);
      
    } catch (error) {
      logger.error(`Error creando reembolso MercadoPago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  static async getStatistics() {
    try {
      return await mercadopagoService.getStatistics();
    } catch (error) {
      logger.error(`Error obteniendo estadísticas de MercadoPago: ${error.message}`);
      return {
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailed: 0,
        lastTransaction: null
      };
    }
  }

  /**
   * Limpiar recursos
   */
  static async cleanup() {
    try {
      await mercadopagoService.cleanup();
      logger.info('Plugin de MercadoPago limpiado exitosamente');
    } catch (error) {
      logger.error(`Error limpiando plugin de MercadoPago: ${error.message}`);
    }
  }
}

module.exports = MercadoPagoController;