const axios = require('axios');
const logger = require('../../../config/logger');
const db = require('../../../models');

class WhatsAppMetaPlugin {
  constructor() {
    this.client = null;
    this.config = {};
    this.initialized = false;
  }

  static getPluginInfo() {
    return {
      name: 'whatsapp-meta',
      version: '1.0.0',
      description: 'Plugin para WhatsApp Business API via Meta',
      category: 'communication',
      author: 'ISP-Prueba Team',
      capabilities: ['send_message', 'receive_message', 'templates', 'interactive', 'webhooks'],
      supportedFeatures: ['text', 'media', 'templates', 'buttons', 'lists', 'quick_replies']
    };
  }

  async onActivate(config) {
    try {
      logger.info('Activando plugin WhatsApp Meta...');

      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      this.config = config;

      await this.testConnection();

      this.initialized = true;
      logger.info('Plugin WhatsApp Meta inicializado correctamente');

      return {
        success: true,
        message: 'Plugin activado correctamente'
      };
    } catch (error) {
      logger.error('Error inicializando WhatsApp Meta:', error);
      throw error;
    }
  }

  async onDeactivate() {
    try {
      logger.info('Desactivando plugin WhatsApp Meta...');

      this.config = {};
      this.initialized = false;

      logger.info('Plugin WhatsApp Meta desactivado');
      return {
        success: true,
        message: 'Plugin desactivado correctamente'
      };
    } catch (error) {
      logger.error('Error desactivando WhatsApp Meta:', error);
      throw error;
    }
  }

  registerRoutes(router) {
    const routes = require('./routes');
    logger.info('Rutas de WhatsApp Meta registradas');
    return routes;
  }

  validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuración es requerida'] };
    }

    if (!config.apiToken) {
      errors.push('Access Token es requerido');
    }

    if (!config.phoneNumberId) {
      errors.push('Phone Number ID es requerido');
    }

    if (!config.webhookVerifyToken) {
      errors.push('Webhook Verify Token es requerido');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async sendMessage(to, message, options = {}) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const url = `${this.config.apiUrl}${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: options.type || 'text',
        text: { body: message }
      };

      if (options.mediaUrl) {
        payload.type = options.mediaType || 'image';
        payload[payload.type] = {
          link: options.mediaUrl,
          caption: message
        };
        delete payload.text;
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Mensaje WhatsApp Meta enviado a ${to}`);

      await this.saveMessageToHistory({
        externalId: response.data.messages?.[0]?.id,
        direction: 'outbound',
        to: to,
        from: this.config.phoneNumberId,
        message,
        status: 'sent',
        mediaUrl: options.mediaUrl
      });

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        platform: 'whatsapp-meta'
      };
    } catch (error) {
      logger.error('Error enviando mensaje WhatsApp Meta:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendTemplate(to, templateName, languageCode, components = []) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const url = `${this.config.apiUrl}${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Template WhatsApp enviado a ${to}: ${templateName}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      logger.error('Error enviando template:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendInteractiveMessage(to, type, data) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const url = `${this.config.apiUrl}${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive: {
          type: type,
          ...data
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Mensaje interactivo enviado a ${to}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      logger.error('Error enviando mensaje interactivo:', error.response?.data || error.message);
      throw error;
    }
  }

  async processWebhook(webhookData) {
    try {
      logger.info('Procesando webhook de Meta');

      if (webhookData.object !== 'whatsapp_business_account') {
        return { success: false, reason: 'invalid_object' };
      }

      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        logger.info('Webhook sin mensajes');
        return { success: false, reason: 'no_messages' };
      }

      const message = value.messages[0];
      const phoneNumber = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;

      let content = '';
      let messageType = 'text';
      let mediaUrl = null;

      if (message.text) {
        content = message.text.body;
        messageType = 'text';
      } else if (message.image) {
        content = '[Imagen recibida]';
        messageType = 'image';
        mediaUrl = await this.getMediaUrl(message.image.id);
      } else if (message.document) {
        content = `[Documento: ${message.document.filename}]`;
        messageType = 'file';
        mediaUrl = await this.getMediaUrl(message.document.id);
      } else if (message.audio) {
        content = '[Audio recibido]';
        messageType = 'audio';
        mediaUrl = await this.getMediaUrl(message.audio.id);
      } else if (message.video) {
        content = '[Video recibido]';
        messageType = 'video';
        mediaUrl = await this.getMediaUrl(message.video.id);
      } else if (message.interactive) {
        content = this.extractInteractiveResponse(message.interactive);
        messageType = 'interactive';
      }

      const client = await this.findClientByPhone(phoneNumber);

      if (!client) {
        logger.warn(`Cliente no encontrado para teléfono: ${phoneNumber}`);
        return { success: false, reason: 'client_not_found' };
      }

      let conversation = await db.ChatConversation.findOne({
        where: { whatsappChatId: phoneNumber }
      });

      if (!conversation) {
        conversation = await db.ChatConversation.create({
          name: `WhatsApp - ${client.firstName} ${client.lastName}`,
          type: 'direct',
          participants: [client.id],
          whatsappChatId: phoneNumber,
          platform: 'whatsapp-meta'
        });

        logger.info(`Nueva conversación WhatsApp Meta creada para cliente ${client.id}`);
      }

      const chatMessage = await db.ChatMessage.create({
        conversationId: conversation.id,
        senderId: client.id,
        content,
        messageType,
        whatsappMessageId: messageId,
        metadata: {
          ...message,
          mediaUrl,
          platform: 'meta',
          timestamp
        }
      });

      await conversation.update({
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100)
      });

      if (global.io) {
        global.io.to('staff-room').emit('new-whatsapp-message', {
          conversation,
          message: chatMessage,
          client
        });
      }

      if (this.config.enableAutoResponse) {
        await this.sendMessage(phoneNumber, this.config.autoResponseMessage ||
          'Gracias por contactarnos. Un agente te responderá pronto.');
      }

      logger.info(`Mensaje WhatsApp Meta guardado de ${client.email}`);

      return {
        success: true,
        conversation,
        message: chatMessage,
        client
      };
    } catch (error) {
      logger.error('Error procesando webhook Meta:', error);
      throw error;
    }
  }

  async verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      logger.info('Webhook verificado correctamente');
      return challenge;
    }

    logger.warn('Verificación de webhook fallida');
    return null;
  }

  async getMediaUrl(mediaId) {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      return response.data.url;
    } catch (error) {
      logger.error('Error obteniendo URL de media:', error);
      return null;
    }
  }

  extractInteractiveResponse(interactive) {
    if (interactive.type === 'button_reply') {
      return `Botón seleccionado: ${interactive.button_reply.title}`;
    } else if (interactive.type === 'list_reply') {
      return `Opción seleccionada: ${interactive.list_reply.title}`;
    }
    return '[Respuesta interactiva]';
  }

  async sendBulkMessages(recipients, message, options = {}) {
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of recipients) {
      try {
        await this.sendMessage(recipient.phone, message, options);
        results.sent++;

        await this.delay(options.delayMs || 1000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: recipient.phone,
          error: error.message
        });
        logger.error(`Error enviando a ${recipient.phone}:`, error);
      }
    }

    logger.info(`Envío masivo Meta completado: ${results.sent}/${results.total} exitosos`);

    return results;
  }

  async testConnection() {
    try {
      const response = await axios.get(
        `${this.config.apiUrl}${this.config.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );

      return {
        success: true,
        phoneNumber: response.data.display_phone_number,
        verifiedName: response.data.verified_name
      };
    } catch (error) {
      throw new Error(`Error conectando con Meta API: ${error.message}`);
    }
  }

  async getStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const messages = await db.MessageLog.findAll({
        where: {
          channel: 'whatsapp',
          provider: 'meta',
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        }
      });

      const stats = {
        totalMessages: messages.length,
        sent: messages.filter(m => m.direction === 'outbound').length,
        received: messages.filter(m => m.direction === 'inbound').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        failed: messages.filter(m => m.status === 'failed').length,
        pending: messages.filter(m => m.status === 'sent' || m.status === 'queued').length
      };

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  formatPhoneNumber(phone) {
    let formatted = String(phone).replace(/[^\d]/g, '');
    return formatted;
  }

  async findClientByPhone(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '').slice(-10);

    return await db.Client.findOne({
      where: {
        phone: {
          [db.Sequelize.Op.like]: `%${cleanPhone}%`
        }
      }
    });
  }

  async saveMessageToHistory(data) {
    try {
      await db.MessageLog.create({
        channel: 'whatsapp',
        provider: 'meta',
        externalId: data.externalId,
        direction: data.direction,
        to: data.to,
        from: data.from,
        message: data.message,
        status: data.status,
        metadata: {
          mediaUrl: data.mediaUrl
        }
      });
    } catch (error) {
      logger.warn('No se pudo guardar mensaje en historial:', error.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isActive() {
    return this.initialized;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      hasConfig: Object.keys(this.config).length > 0,
      phoneNumberId: this.config.phoneNumberId || null
    };
  }
}

module.exports = WhatsAppMetaPlugin;
