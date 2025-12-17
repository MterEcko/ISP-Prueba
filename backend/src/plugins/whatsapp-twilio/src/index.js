// backend/src/plugins/whatsapp-twilio/src/index.js
const twilio = require('twilio');
const logger = require('../../../config/logger');
const db = require('../../../models');

class WhatsAppTwilioPlugin {
  constructor() {
    this.client = null;
    this.config = {};
    this.initialized = false;
  }

  /**
   * Información del plugin
   */
  static getPluginInfo() {
    return {
      name: 'whatsapp-twilio',
      version: '1.0.0',
      description: 'Plugin para WhatsApp via Twilio',
      category: 'communication',
      author: 'ISP-Prueba Team',
      capabilities: ['send_message', 'receive_message', 'webhooks', 'bulk_send'],
      supportedFeatures: ['text', 'media', 'templates', 'conversations']
    };
  }

  /**
   * Inicializar plugin
   */
  async onActivate(config) {
    try {
      logger.info('🟢 Activando plugin WhatsApp Twilio...');

      // Validar configuración
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      this.config = config;

      // Inicializar cliente de Twilio
      this.client = twilio(config.accountSid, config.authToken);

      // Probar conexión
      await this.client.api.accounts(config.accountSid).fetch();

      this.initialized = true;
      logger.info('✅ Plugin WhatsApp Twilio inicializado correctamente');

      return {
        success: true,
        message: 'Plugin activado correctamente'
      };
    } catch (error) {
      logger.error('❌ Error inicializando WhatsApp Twilio:', error);
      throw error;
    }
  }

  /**
   * Desactivar plugin
   */
  async onDeactivate() {
    try {
      logger.info('🔴 Desactivando plugin WhatsApp Twilio...');

      this.client = null;
      this.config = {};
      this.initialized = false;

      logger.info('✅ Plugin WhatsApp Twilio desactivado');
      return {
        success: true,
        message: 'Plugin desactivado correctamente'
      };
    } catch (error) {
      logger.error('Error desactivando WhatsApp Twilio:', error);
      throw error;
    }
  }

  /**
   * Registrar rutas del plugin
   */
  registerRoutes(router) {
    const routes = require('./routes');
    logger.info('Rutas de WhatsApp Twilio registradas');
    return routes;
  }

  /**
   * Validar configuración
   */
  validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuración es requerida'] };
    }

    if (!config.accountSid) {
      errors.push('Account SID es requerido');
    } else if (!config.accountSid.startsWith('AC')) {
      errors.push('Account SID de Twilio debe comenzar con "AC"');
    }

    if (!config.authToken) {
      errors.push('Auth Token es requerido');
    }

    if (!config.phoneNumber) {
      errors.push('Número de teléfono es requerido');
    } else if (!config.phoneNumber.startsWith('+')) {
      errors.push('Número de teléfono debe incluir código de país (ej: +14155238886)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Enviar mensaje de WhatsApp
   */
  async sendMessage(to, message, options = {}) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      // Formatear números correctamente
      const toFormatted = this.formatPhoneNumber(to);
      const fromFormatted = this.formatPhoneNumber(this.config.phoneNumber);

      logger.info(`📤 Enviando WhatsApp de [${fromFormatted}] a [${toFormatted}]`);

      const twilioMessage = await this.client.messages.create({
        from: fromFormatted,
        to: toFormatted,
        body: message,
        ...(options.mediaUrl && { mediaUrl: [options.mediaUrl] })
      });

      logger.info(`✅ Mensaje WhatsApp enviado: ${twilioMessage.sid}`);

      // Guardar en historial
      await this.saveMessageToHistory({
        externalId: twilioMessage.sid,
        direction: 'outbound',
        to: toFormatted,
        from: fromFormatted,
        message,
        status: twilioMessage.status,
        mediaUrl: options.mediaUrl
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        to: toFormatted
      };
    } catch (error) {
      logger.error('❌ Error enviando mensaje WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de Twilio
   */
  async processWebhook(webhookData) {
    try {
      logger.info('📨 Procesando webhook de Twilio');

      const phoneNumber = webhookData.From?.replace('whatsapp:', '');
      const content = webhookData.Body || '';
      const messageId = webhookData.MessageSid;
      const numMedia = parseInt(webhookData.NumMedia || 0);

      let messageType = 'text';
      let mediaUrl = null;

      if (numMedia > 0) {
        messageType = webhookData.MediaContentType0?.includes('image') ? 'image' : 'file';
        mediaUrl = webhookData.MediaUrl0;
      }

      // Buscar cliente por teléfono
      const client = await this.findClientByPhone(phoneNumber);

      if (!client) {
        logger.warn(`⚠️  Cliente no encontrado para teléfono: ${phoneNumber}`);
        return { success: false, reason: 'client_not_found' };
      }

      // Buscar o crear conversación
      let conversation = await db.ChatConversation.findOne({
        where: { whatsappChatId: phoneNumber }
      });

      if (!conversation) {
        conversation = await db.ChatConversation.create({
          name: `WhatsApp - ${client.firstName} ${client.lastName}`,
          type: 'direct',
          participants: [client.id],
          whatsappChatId: phoneNumber,
          platform: 'whatsapp-twilio'
        });

        logger.info(`✅ Nueva conversación WhatsApp creada para cliente ${client.id}`);
      }

      // Guardar mensaje
      const chatMessage = await db.ChatMessage.create({
        conversationId: conversation.id,
        senderId: client.id,
        content,
        messageType,
        whatsappMessageId: messageId,
        metadata: {
          ...webhookData,
          mediaUrl,
          platform: 'twilio'
        }
      });

      // Actualizar conversación
      await conversation.update({
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100)
      });

      // Emitir vía WebSocket
      if (global.io) {
        global.io.to('staff-room').emit('new-whatsapp-message', {
          conversation,
          message: chatMessage,
          client
        });
      }

      // Respuesta automática (si está habilitada)
      if (this.config.enableAutoResponse) {
        await this.sendMessage(phoneNumber, this.config.autoResponseMessage ||
          'Gracias por contactarnos. Un agente te responderá pronto.');
      }

      logger.info(`✅ Mensaje WhatsApp guardado de ${client.email}`);

      return {
        success: true,
        conversation,
        message: chatMessage,
        client
      };
    } catch (error) {
      logger.error('❌ Error procesando webhook:', error);
      throw error;
    }
  }

  /**
   * Envío masivo de mensajes
   */
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

        // Delay para evitar rate limits (1 mensaje por segundo)
        await this.delay(options.delayMs || 1000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: recipient.phone,
          error: error.message
        });
        logger.error(`❌ Error enviando a ${recipient.phone}:`, error);
      }
    }

    logger.info(`📊 Envío masivo completado: ${results.sent}/${results.total} exitosos`);

    return results;
  }

  /**
   * Verificar estado de un mensaje
   */
  async getMessageStatus(messageSid) {
    if (!this.initialized) {
      throw new Error('Plugin no inicializado');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated
      };
    } catch (error) {
      logger.error('Error obteniendo estado de mensaje:', error);
      throw error;
    }
  }

  /**
   * Probar conexión
   */
  async testConnection(testPhoneNumber) {
    try {
      const testMessage = `✅ Prueba de WhatsApp Twilio\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nLa integración está funcionando correctamente.`;

      const result = await this.sendMessage(testPhoneNumber, testMessage);

      return {
        success: true,
        message: 'Mensaje de prueba enviado correctamente',
        messageId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const messages = await this.client.messages.list({
        dateSentAfter: startDate,
        limit: 1000
      });

      const stats = {
        totalMessages: messages.length,
        sent: messages.filter(m => m.direction === 'outbound-api').length,
        received: messages.filter(m => m.direction === 'inbound').length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        failed: messages.filter(m => m.status === 'failed').length,
        pending: messages.filter(m => m.status === 'queued' || m.status === 'sending').length
      };

      return stats;
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  /**
   * Utilidades
   */
  formatPhoneNumber(phone) {
    let formatted = String(phone).replace(/\s+/g, '');

    if (!formatted.startsWith('+') && !formatted.startsWith('whatsapp:')) {
      formatted = '+' + formatted;
    }

    return formatted.startsWith('whatsapp:') ? formatted : `whatsapp:${formatted}`;
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
        provider: 'twilio',
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

  /**
   * Verificar si el plugin está activo
   */
  isActive() {
    return this.initialized;
  }

  /**
   * Obtener estado del plugin
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasConfig: Object.keys(this.config).length > 0,
      phoneNumber: this.config.phoneNumber || null
    };
  }
}

module.exports = WhatsAppTwilioPlugin;
