// backend/src/plugins/email/src/email.controller.js
const emailService = require('./email.service');
const logger = require('../../../utils/logger');

class EmailController {
  /**
   * Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'email',
      version: '1.0.0',
      description: 'Plugin para envío de correos electrónicos',
      category: 'communication',
      channelType: 'email',
      author: 'Sistema ISP',
      capabilities: ['send', 'verify', 'template'],
      supportedMethods: ['smtp', 'sendgrid', 'mailgun'],
      countries: ['all'],
      configSchema: {
        type: 'object',
        properties: {
          provider: {
            type: 'string',
            enum: ['smtp', 'sendgrid', 'mailgun'],
            default: 'smtp'
          },
          smtp: {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number', default: 587 },
              secure: { type: 'boolean', default: false },
              auth: {
                type: 'object',
                properties: {
                  user: { type: 'string' },
                  pass: { type: 'string' }
                }
              }
            }
          },
          sendgrid: {
            type: 'object',
            properties: {
              apiKey: { type: 'string' }
            }
          },
          mailgun: {
            type: 'object',
            properties: {
              apiKey: { type: 'string' },
              domain: { type: 'string' }
            }
          },
          from: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            }
          }
        },
        required: ['provider', 'from']
      }
    };
  }

  /**
   * Inicializar plugin
   */
  static async initialize(config) {
    try {
      logger.info('Inicializando plugin de Email');
      
      // Validar configuración
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Inicializar servicio
      await emailService.initialize(config);

      logger.info('Plugin de Email inicializado exitosamente');
      return emailService;

    } catch (error) {
      logger.error(`Error inicializando plugin de Email: ${error.message}`);
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

    if (!config.provider) {
      errors.push('Provider es requerido');
    } else if (!['smtp', 'sendgrid', 'mailgun'].includes(config.provider)) {
      errors.push('Provider debe ser smtp, sendgrid o mailgun');
    }

    if (!config.from || !config.from.email) {
      errors.push('Email del remitente es requerido');
    }

    // Validaciones específicas por provider
    switch (config.provider) {
      case 'smtp':
        if (!config.smtp || !config.smtp.host || !config.smtp.auth) {
          errors.push('Configuración SMTP incompleta');
        }
        break;
      case 'sendgrid':
        if (!config.sendgrid || !config.sendgrid.apiKey) {
          errors.push('API Key de SendGrid es requerida');
        }
        break;
      case 'mailgun':
        if (!config.mailgun || !config.mailgun.apiKey || !config.mailgun.domain) {
          errors.push('API Key y dominio de Mailgun son requeridos');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enviar mensaje
   */
  static async sendMessage(client, messageData) {
    try {
      const result = await emailService.sendMessage(messageData);
      return result;
    } catch (error) {
      logger.error(`Error enviando email: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Procesar webhook (si aplica)
   */
  static async processWebhook(client, webhookData) {
    try {
      // Los webhooks de email son diferentes según el proveedor
      return await emailService.processWebhook(webhookData);
    } catch (error) {
      logger.error(`Error procesando webhook de email: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar firma de webhook
   */
  static async verifyWebhookSignature(data, signature, secret) {
    try {
      return await emailService.verifyWebhookSignature(data, signature, secret);
    } catch (error) {
      logger.error(`Error verificando firma de webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener estado de mensaje
   */
  static async getMessageStatus(client, messageId) {
    try {
      return await emailService.getMessageStatus(messageId);
    } catch (error) {
      logger.error(`Error obteniendo estado de email: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Obtener estadísticas
   */
  static async getStatistics() {
    try {
      return await emailService.getStatistics();
    } catch (error) {
      logger.error(`Error obteniendo estadísticas de email: ${error.message}`);
      return {};
    }
  }

  /**
   * Limpiar recursos
   */
  static async cleanup() {
    try {
      await emailService.cleanup();
      logger.info('Plugin de Email limpiado exitosamente');
    } catch (error) {
      logger.error(`Error limpiando plugin de Email: ${error.message}`);
    }
  }
}

module.exports = EmailController;



