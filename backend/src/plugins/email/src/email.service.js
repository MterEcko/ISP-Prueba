// backend/src/plugins/email/src/email.service.js
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = null;
    this.provider = null;
    this.statistics = {
      sent: 0,
      failed: 0,
      lastSent: null
    };
  }

  /**
   * Inicializar servicio
   */
  async initialize(config) {
    try {
      this.config = config;
      this.provider = config.provider;

      switch (this.provider) {
        case 'smtp':
          await this._initializeSMTP();
          break;
        case 'sendgrid':
          await this._initializeSendGrid();
          break;
        case 'mailgun':
          await this._initializeMailgun();
          break;
        default:
          throw new Error(`Proveedor no soportado: ${this.provider}`);
      }

      // Verificar conexión
      await this._testConnection();

      logger.info(`Email service inicializado con proveedor: ${this.provider}`);

    } catch (error) {
      logger.error(`Error inicializando email service: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(messageData) {
    try {
      const { recipient, subject, message, clientInfo, metadata } = messageData;

      // Validar datos
      if (!recipient || !message) {
        throw new Error('Destinatario y mensaje son requeridos');
      }

      // Preparar email
      const mailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: recipient,
        subject: subject || 'Mensaje del ISP',
        html: this._formatMessage(message, clientInfo),
        text: this._stripHtml(message)
      };

      // Agregar metadatos si el proveedor lo soporta
      if (metadata && metadata.reference) {
        mailOptions.headers = {
          'X-Message-ID': metadata.reference
        };
      }

      // Enviar email
      const result = await this.transporter.sendMail(mailOptions);

      // Actualizar estadísticas
      this.statistics.sent++;
      this.statistics.lastSent = new Date();

      logger.info(`Email enviado exitosamente a ${recipient}`);

      return {
        success: true,
        response: {
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected
        },
        deliveryId: result.messageId,
        estimatedDelivery: new Date(Date.now() + 30000) // 30 segundos estimado
      };

    } catch (error) {
      this.statistics.failed++;
      logger.error(`Error enviando email: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        response: null
      };
    }
  }

  /**
   * Procesar webhook
   */
  async processWebhook(webhookData) {
    try {
      // Implementación específica según el proveedor
      switch (this.provider) {
        case 'sendgrid':
          return this._processSendGridWebhook(webhookData);
        case 'mailgun':
          return this._processMailgunWebhook(webhookData);
        default:
          logger.warn(`Webhooks no soportados para proveedor: ${this.provider}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error procesando webhook: ${error.message}`);
      return null;
    }
  }

  /**
   * Verificar firma de webhook
   */
  async verifyWebhookSignature(data, signature, secret) {
    try {
      switch (this.provider) {
        case 'sendgrid':
          return this._verifySendGridSignature(data, signature, secret);
        case 'mailgun':
          return this._verifyMailgunSignature(data, signature, secret);
        default:
          return true; // Sin verificación para SMTP
      }
    } catch (error) {
      logger.error(`Error verificando firma: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtener estado de mensaje
   */
  async getMessageStatus(messageId) {
    try {
      // Para SMTP básico no hay tracking, otros proveedores pueden implementarlo
      switch (this.provider) {
        case 'sendgrid':
          // Implementar consulta a API de SendGrid
          return 'delivered'; // Placeholder
        case 'mailgun':
          // Implementar consulta a API de Mailgun
          return 'delivered'; // Placeholder
        default:
          return 'sent'; // SMTP no tiene tracking
      }
    } catch (error) {
      logger.error(`Error obteniendo estado: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics() {
    return {
      ...this.statistics,
      provider: this.provider,
      lastInitialized: this.config ? new Date() : null
    };
  }

  /**
   * Limpiar recursos
   */
  async cleanup() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    this.config = null;
    this.provider = null;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Inicializar SMTP
   */
  async _initializeSMTP() {
    this.transporter = nodemailer.createTransporter({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: this.config.smtp.auth
    });
  }

  /**
   * Inicializar SendGrid
   */
  async _initializeSendGrid() {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.config.sendgrid.apiKey);
    
    // Crear transporter compatible con nodemailer
    this.transporter = {
      sendMail: async (mailOptions) => {
        const msg = {
          to: mailOptions.to,
          from: mailOptions.from,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text
        };
        
        const result = await sgMail.send(msg);
        return {
          messageId: result[0].headers['x-message-id'],
          accepted: [mailOptions.to],
          rejected: []
        };
      },
      close: () => {} // SendGrid no requiere cerrar conexión
    };
  }

  /**
   * Inicializar Mailgun
   */
  async _initializeMailgun() {
    const mailgun = require('mailgun-js')({
      apiKey: this.config.mailgun.apiKey,
      domain: this.config.mailgun.domain
    });

    this.transporter = {
      sendMail: async (mailOptions) => {
        const data = {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text
        };

        const result = await mailgun.messages().send(data);
        return {
          messageId: result.id,
          accepted: [mailOptions.to],
          rejected: []
        };
      },
      close: () => {} // Mailgun no requiere cerrar conexión
    };
  }

  /**
   * Probar conexión
   */
  async _testConnection() {
    if (this.provider === 'smtp' && this.transporter.verify) {
      const isVerified = await this.transporter.verify();
      if (!isVerified) {
        throw new Error('No se pudo verificar la conexión SMTP');
      }
    }
  }

  /**
   * Formatear mensaje HTML
   */
  _formatMessage(message, clientInfo) {
    // Convertir saltos de línea a <br>
    let formattedMessage = message.replace(/\n/g, '<br>');
    
    // Envolver en HTML básico si no tiene estructura HTML
    if (!formattedMessage.includes('<html>')) {
      formattedMessage = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              ${formattedMessage}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                Este mensaje fue enviado automáticamente por nuestro sistema.
              </p>
            </div>
          </body>
        </html>
      `;
    }

    return formattedMessage;
  }

  /**
   * Remover HTML para versión texto
   */
  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Procesar webhook de SendGrid
   */
  _processSendGridWebhook(webhookData) {
    if (Array.isArray(webhookData)) {
      // SendGrid envía array de eventos
      const event = webhookData[0];
      return {
        messageId: event.sg_message_id,
        status: this._mapSendGridStatus(event.event),
        timestamp: new Date(event.timestamp * 1000)
      };
    }
    return null;
  }

  /**
   * Procesar webhook de Mailgun
   */
  _processMailgunWebhook(webhookData) {
    const eventData = webhookData['event-data'];
    if (eventData) {
      return {
        messageId: eventData.message.headers['message-id'],
        status: this._mapMailgunStatus(eventData.event),
        timestamp: new Date(eventData.timestamp * 1000)
      };
    }
    return null;
  }

  /**
   * Mapear estados de SendGrid
   */
  _mapSendGridStatus(sgStatus) {
    const statusMap = {
      'delivered': 'delivered',
      'bounce': 'failed',
      'dropped': 'failed',
      'deferred': 'pending',
      'processed': 'sent'
    };
    return statusMap[sgStatus] || 'unknown';
  }

  /**
   * Mapear estados de Mailgun
   */
  _mapMailgunStatus(mgStatus) {
    const statusMap = {
      'delivered': 'delivered',
      'failed': 'failed',
      'rejected': 'failed',
      'accepted': 'sent'
    };
    return statusMap[mgStatus] || 'unknown';
  }

  /**
   * Verificar firma de SendGrid
   */
  _verifySendGridSignature(data, signature, secret) {
    const payload = JSON.stringify(data);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    
    return signature === expectedSignature;
  }

  /**
   * Verificar firma de Mailgun
   */
  _verifyMailgunSignature(data, signature, secret) {
    const { timestamp, token } = data;
    const payload = timestamp + token;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = new EmailService();

