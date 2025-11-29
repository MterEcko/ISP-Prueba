const axios = require('axios');
const db = require('../models');
const configHelper = require('../helpers/configHelper');
const logger = require('../config/logger');
const templateController = require('../controllers/template.controller');

/**
 * Servicio de SMS usando telefono Android como gateway
 * Compatible con: SMS Gateway API, Tasker, y otras apps similares
 */
class SMSService {
  constructor() {
    this.initialized = false;
    this.config = {};
  }

  /**
   * Inicializar servicio de SMS
   */
  async initialize() {
    try {
      const enabled = await configHelper.get('smsEnabled', false);

      if (!enabled) {
        logger.info('SMS deshabilitado en configuracion');
        return false;
      }

      // Cargar configuracion del gateway Android
      this.config.gatewayUrl = await configHelper.get('smsGatewayUrl');
      this.config.gatewayToken = await configHelper.get('smsGatewayToken');
      this.config.gatewayType = await configHelper.get('smsGatewayType', 'generic'); // 'generic', 'smsgateway', 'tasker'

      if (!this.config.gatewayUrl) {
        logger.warn('SMS Gateway: URL no configurada');
        return false;
      }

      this.initialized = true;
      logger.info(`SMS Gateway inicializado correctamente (${this.config.gatewayType})`);
      return true;
    } catch (error) {
      logger.error('Error inicializando SMS Gateway:', error);
      return false;
    }
  }

  /**
   * Enviar SMS simple
   */
  async sendSMS(phoneNumber, message, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('SMS Gateway no esta configurado');
    }

    try {
      // Normalizar numero de telefono
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Enviar segun tipo de gateway
      let result;
      if (this.config.gatewayType === 'smsgateway') {
        result = await this.sendViaSMSGatewayAPI(normalizedPhone, message);
      } else if (this.config.gatewayType === 'tasker') {
        result = await this.sendViaTasker(normalizedPhone, message);
      } else {
        result = await this.sendViaGenericGateway(normalizedPhone, message);
      }

      // Guardar en log de comunicaciones
      await this.logSMS(phoneNumber, message, 'sent', result);

      logger.info(`SMS enviado a ${phoneNumber}`);
      return result;
    } catch (error) {
      logger.error('Error enviando SMS:', error);
      await this.logSMS(phoneNumber, message, 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Enviar SMS usando SMS Gateway API app
   * https://smsgateway.me/
   */
  async sendViaSMSGatewayAPI(phoneNumber, message) {
    try {
      const url = `${this.config.gatewayUrl}/api/v1/message/send`;

      const payload = {
        phone: phoneNumber,
        message: message,
        device: 0 // Dispositivo por defecto
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.gatewayToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        messageId: response.data.id,
        gateway: 'smsgateway'
      };
    } catch (error) {
      logger.error('Error con SMS Gateway API:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Enviar SMS via Tasker con plugin HTTP Request
   */
  async sendViaTasker(phoneNumber, message) {
    try {
      const url = `${this.config.gatewayUrl}/send`;

      const params = {
        phone: phoneNumber,
        message: message,
        token: this.config.gatewayToken
      };

      const response = await axios.get(url, {
        params,
        timeout: 10000
      });

      return {
        success: true,
        messageId: Date.now().toString(),
        gateway: 'tasker',
        response: response.data
      };
    } catch (error) {
      logger.error('Error con Tasker:', error.message);
      throw error;
    }
  }

  /**
   * Enviar via gateway generico (POST simple)
   */
  async sendViaGenericGateway(phoneNumber, message) {
    try {
      const response = await axios.post(this.config.gatewayUrl, {
        to: phoneNumber,
        message: message,
        token: this.config.gatewayToken
      }, {
        timeout: 10000
      });

      return {
        success: true,
        messageId: Date.now().toString(),
        gateway: 'generic',
        response: response.data
      };
    } catch (error) {
      logger.error('Error con gateway generico:', error.message);
      throw error;
    }
  }

  /**
   * Enviar SMS usando template
   */
  async sendSMSWithTemplate(phoneNumber, templateId, variables = {}, clientId = null) {
    try {
      // Obtener template
      const template = await db.MessageTemplate.findByPk(templateId);

      if (!template) {
        throw new Error('Template no encontrado');
      }

      if (!template.active) {
        throw new Error('Template inactivo');
      }

      // Obtener datos del cliente si se especifica
      let client = null;
      if (clientId) {
        client = await db.Client.findByPk(clientId, {
          include: [
            {
              model: db.Service,
              as: 'services',
              limit: 1
            }
          ]
        });

        if (!client) {
          throw new Error('Cliente no encontrado');
        }
      }

      // Procesar template con variables
      const processedMessage = templateController._processTemplate(
        template.messageBody,
        variables,
        client
      );

      // Enviar SMS
      const result = await this.sendSMS(phoneNumber, processedMessage);

      // Guardar referencia del template usado
      await this.logSMS(phoneNumber, processedMessage, 'sent', {
        ...result,
        templateId: template.id,
        templateName: template.name,
        clientId: client?.id
      });

      return {
        ...result,
        template: template.name,
        message: processedMessage
      };
    } catch (error) {
      logger.error('Error enviando SMS con template:', error);
      throw error;
    }
  }

  /**
   * Enviar recordatorio de pago
   */
  async sendPaymentReminder(clientId, invoiceData) {
    try {
      const client = await db.Client.findByPk(clientId);

      if (!client || !client.phone) {
        throw new Error('Cliente sin telefono');
      }

      // Buscar template de recordatorio de pago
      const template = await db.MessageTemplate.findOne({
        where: {
          templateType: 'paymentReminder',
          active: true
        },
        order: [['createdAt', 'DESC']]
      });

      if (!template) {
        throw new Error('No hay template de recordatorio configurado');
      }

      // Variables para el template
      const variables = {
        invoiceNumber: invoiceData.invoiceNumber || '',
        amount: invoiceData.amount ? `$${invoiceData.amount}` : '',
        dueDate: invoiceData.dueDate || '',
        daysOverdue: invoiceData.daysOverdue || 0
      };

      return await this.sendSMSWithTemplate(
        client.phone,
        template.id,
        variables,
        clientId
      );
    } catch (error) {
      logger.error('Error enviando recordatorio de pago:', error);
      throw error;
    }
  }

  /**
   * Enviar notificacion de mantenimiento de red
   */
  async sendNetworkMaintenanceNotification(phoneNumbers, maintenanceInfo) {
    const results = {
      total: phoneNumbers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Buscar template personalizado o usar mensaje directo
    let message = maintenanceInfo.message;

    if (maintenanceInfo.templateId) {
      const template = await db.MessageTemplate.findByPk(maintenanceInfo.templateId);
      if (template) {
        message = templateController._processTemplate(
          template.messageBody,
          maintenanceInfo.variables || {}
        );
      }
    }

    for (const phoneNumber of phoneNumbers) {
      try {
        await this.sendSMS(phoneNumber, message);
        results.sent++;

        // Delay para evitar saturar el gateway
        await this.delay(maintenanceInfo.delayMs || 2000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    logger.info(`Notificacion masiva SMS completada: ${results.sent}/${results.total}`);

    return results;
  }

  /**
   * Enviar SMS masivo
   */
  async sendBulkSMS(recipients, message, options = {}) {
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const phoneNumber of recipients) {
      try {
        await this.sendSMS(phoneNumber, message, options);
        results.sent++;

        // Delay configurable entre mensajes
        await this.delay(options.delayMs || 2000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    logger.info(`Envio masivo SMS completado: ${results.sent}/${results.total}`);

    return results;
  }

  /**
   * Normalizar numero de telefono
   */
  normalizePhoneNumber(phone) {
    // Remover espacios, guiones, parentesis
    let normalized = phone.replace(/[\s\-\(\)]/g, '');

    // Si no empieza con +, agregar +52 para Mexico
    if (!normalized.startsWith('+')) {
      normalized = `+52${normalized}`;
    }

    return normalized;
  }

  /**
   * Probar conexion con gateway
   */
  async testConnection(testPhoneNumber) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const testMessage = `Prueba de SMS Gateway\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nLa integracion esta funcionando correctamente.`;

      await this.sendSMS(testPhoneNumber, testMessage);

      return {
        success: true,
        message: 'SMS de prueba enviado correctamente',
        gateway: this.config.gatewayType
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        gateway: this.config.gatewayType
      };
    }
  }

  /**
   * Obtener estado del gateway
   */
  async getGatewayStatus() {
    if (!this.initialized) {
      return {
        initialized: false,
        available: false
      };
    }

    try {
      // Intentar hacer ping al gateway
      const response = await axios.get(this.config.gatewayUrl, {
        timeout: 5000
      });

      return {
        initialized: true,
        available: true,
        gatewayType: this.config.gatewayType,
        gatewayUrl: this.config.gatewayUrl
      };
    } catch (error) {
      return {
        initialized: true,
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Guardar log de SMS enviado
   */
  async logSMS(phoneNumber, message, status, metadata = {}) {
    try {
      await db.CommunicationLog.create({
        channelType: 'sms',
        direction: 'outbound',
        recipientPhone: phoneNumber,
        messageContent: message,
        status,
        metadata,
        sentAt: status === 'sent' ? new Date() : null
      });
    } catch (error) {
      logger.error('Error guardando log de SMS:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  /**
   * Utilidad: delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verificar si esta activo
   */
  isActive() {
    return this.initialized;
  }
}

module.exports = new SMSService();
