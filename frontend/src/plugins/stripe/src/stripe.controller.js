// backend/src/plugins/stripe/src/stripe.controller.js
const stripeService = require('./stripe.service');
const logger = require('../../../utils/logger');

class StripeController {
  /**
   * Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'stripe',
      version: '1.0.0',
      description: 'Plugin para procesamiento de pagos con Stripe',
      category: 'payment',
      channelType: 'payment_gateway',
      author: 'Sistema ISP',
      capabilities: ['process_payment', 'refund', 'webhook', 'payment_status', 'subscriptions'],
      supportedMethods: ['card', 'oxxo', 'spei', 'boleto', 'ach', 'sepa_debit'],
      countries: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'GB', 'EU'],
      configSchema: {
        type: 'object',
        properties: {
          publicKey: {
            type: 'string',
            title: 'Publishable Key',
            description: 'Clave pública de Stripe'
          },
          secretKey: {
            type: 'string',
            title: 'Secret Key',
            description: 'Clave secreta de Stripe',
            format: 'password'
          },
          webhookSecret: {
            type: 'string',
            title: 'Webhook Secret',
            description: 'Secreto del webhook (opcional)',
            format: 'password'
          },
          testMode: {
            type: 'boolean',
            title: 'Modo de Prueba',
            description: 'Activar modo de pruebas',
            default: false
          },
          currency: {
            type: 'string',
            enum: ['USD', 'MXN', 'CAD', 'BRL', 'EUR', 'GBP'],
            title: 'Moneda',
            description: 'Moneda por defecto',
            default: 'MXN'
          },
          country: {
            type: 'string',
            enum: ['US', 'CA', 'MX', 'BR', 'GB', 'EU'],
            title: 'País',
            description: 'País de operación',
            default: 'MX'
          }
        },
        required: ['publicKey', 'secretKey', 'currency', 'country']
      }
    };
  }

  /**
   * Inicializar plugin
   */
  static async initialize(config) {
    try {
      logger.info('Inicializando plugin de Stripe');

      // Validar configuración
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Inicializar servicio
      const client = await stripeService.initialize(config);

      logger.info('Plugin de Stripe inicializado exitosamente');
      return client;

    } catch (error) {
      logger.error(`Error inicializando plugin de Stripe: ${error.message}`);
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

    if (!config.publicKey) {
      errors.push('Public Key es requerida');
    } else if (!config.publicKey.startsWith('pk_')) {
      errors.push('Public Key de Stripe inválida');
    }

    if (!config.secretKey) {
      errors.push('Secret Key es requerida');
    } else if (!config.secretKey.startsWith('sk_')) {
      errors.push('Secret Key de Stripe inválida');
    }

    if (!config.currency) {
      errors.push('Moneda es requerida');
    }

    if (!config.country) {
      errors.push('País es requerido');
    }

    // Validar consistencia entre testMode y las claves
    if (config.secretKey) {
      const isTestKey = config.secretKey.startsWith('sk_test_');
      const isLiveKey = config.secretKey.startsWith('sk_live_');

      if (config.testMode && isLiveKey) {
        errors.push('testMode está activado pero se está usando una clave de producción');
      } else if (!config.testMode && isTestKey) {
        errors.push('testMode está desactivado pero se está usando una clave de prueba');
      }
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
      const stripeClient = client || stripeService.client;

      if (!stripeClient) {
        throw new Error('Plugin Stripe no inicializado');
      }

      const result = await stripeService.processPayment(stripeClient, paymentData);
      return result;

    } catch (error) {
      logger.error(`Error procesando pago Stripe: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar webhook
   */
  static async processWebhook(client, webhookData, signature) {
    try {
      const stripeClient = client || stripeService.client;

      if (!stripeClient) {
        logger.warn('Plugin Stripe no inicializado para webhook');
        return null;
      }

      return await stripeService.processWebhook(stripeClient, webhookData, signature);

    } catch (error) {
      logger.error(`Error procesando webhook Stripe: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar firma de webhook
   */
  static async verifyWebhookSignature(payload, signature, secret) {
    try {
      return await stripeService.verifyWebhookSignature(payload, signature, secret);
    } catch (error) {
      logger.error(`Error verificando firma de webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener estado de pago
   */
  static async getPaymentStatus(client, paymentIntentId) {
    try {
      const stripeClient = client || stripeService.client;

      if (!stripeClient) {
        throw new Error('Plugin Stripe no inicializado');
      }

      return await stripeService.getPaymentStatus(stripeClient, paymentIntentId);

    } catch (error) {
      logger.error(`Error obteniendo estado de pago Stripe: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Reembolsar pago
   */
  static async refundPayment(client, paymentIntentId, amount = null) {
    try {
      const stripeClient = client || stripeService.client;

      if (!stripeClient) {
        throw new Error('Plugin Stripe no inicializado');
      }

      return await stripeService.refundPayment(stripeClient, paymentIntentId, amount);

    } catch (error) {
      logger.error(`Error creando reembolso Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancelar Payment Intent
   */
  static async cancelPayment(client, paymentIntentId) {
    try {
      const stripeClient = client || stripeService.client;

      if (!stripeClient) {
        throw new Error('Plugin Stripe no inicializado');
      }

      return await stripeService.cancelPayment(stripeClient, paymentIntentId);

    } catch (error) {
      logger.error(`Error cancelando Payment Intent Stripe: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  static async getStatistics() {
    try {
      return await stripeService.getStatistics();
    } catch (error) {
      logger.error(`Error obteniendo estadísticas de Stripe: ${error.message}`);
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
      await stripeService.cleanup();
      logger.info('Plugin de Stripe limpiado exitosamente');
    } catch (error) {
      logger.error(`Error limpiando plugin de Stripe: ${error.message}`);
    }
  }
}

module.exports = StripeController;
