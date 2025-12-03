const axios = require('axios');
const db = require('../models');
const configHelper = require('../helpers/configHelper');
const logger = require('../config/logger');

class WhatsAppService {
  constructor() {
    this.initialized = false;
    this.method = null; // 'api', 'twilio', 'web'
    this.config = {};
  }

  /**
   * Inicializar servicio de WhatsApp
   */
  async initialize() {
    try {
      const enabled = await configHelper.get('whatsappEnabled', false);

      if (!enabled) {
        logger.info('WhatsApp deshabilitado en configuracion');
        return false;
      }

      this.method = await configHelper.get('whatsappMethod', 'twilio');

      // Cargar configuracion segun metodo
      if (this.method === 'api') {
        this.config.apiUrl = await configHelper.get('whatsappApiUrl');
        this.config.apiToken = await configHelper.get('whatsappApiToken');
        this.config.phoneNumberId = await configHelper.get('whatsappPhoneNumberId');

        if (!this.config.apiToken || !this.config.phoneNumberId) {
          logger.warn('WhatsApp API: Faltan credenciales');
          return false;
        }
      }
      else if (this.method === 'twilio') {
        this.config.accountSid = await configHelper.get('whatsappTwilioAccountSid');
        this.config.authToken = await configHelper.get('whatsappTwilioAuthToken');
        this.config.phoneNumber = await configHelper.get('whatsappTwilioNumber');

        if (!this.config.accountSid || !this.config.authToken) {
          logger.warn('WhatsApp Twilio: Faltan credenciales');
          return false;
        }
      }

      this.initialized = true;
      logger.info(`WhatsApp inicializado correctamente (metodo: ${this.method})`);
      return true;
    } catch (error) {
      logger.error('Error inicializando WhatsApp:', error);
      return false;
    }
  }

  /**
   * Procesar webhook entrante
   */
  async processWebhook(webhookData) {
    try {
      if (this.method === 'api') {
        return await this.processMetaWebhook(webhookData);
      } else if (this.method === 'twilio') {
        return await this.processTwilioWebhook(webhookData);
      }
    } catch (error) {
      logger.error('Error procesando webhook de WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de Meta/WhatsApp Business API
   */
  async processMetaWebhook(data) {
    try {
      // Verificacion de webhook
      if (data.object === 'whatsapp_business_account') {
        const entry = data.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value?.messages) {
          logger.info('Webhook sin mensajes');
          return null;
        }

        const message = value.messages[0];
        const phoneNumber = message.from;
        const messageId = message.id;
        const timestamp = message.timestamp;

        let content = '';
        let messageType = 'text';

        // Extraer contenido segun tipo
        if (message.text) {
          content = message.text.body;
          messageType = 'text';
        } else if (message.image) {
          content = '[Imagen recibida]';
          messageType = 'image';
        } else if (message.document) {
          content = `[Documento: ${message.document.filename}]`;
          messageType = 'file';
        } else if (message.audio) {
          content = '[Audio recibido]';
          messageType = 'audio';
        } else if (message.video) {
          content = '[Video recibido]';
          messageType = 'video';
        }

        return await this.saveIncomingMessage({
          phoneNumber,
          messageId,
          content,
          messageType,
          platform: 'whatsapp',
          rawData: message
        });
      }

      return null;
    } catch (error) {
      logger.error('Error procesando webhook de Meta:', error);
      throw error;
    }
  }

  /**
   * Procesar webhook de Twilio
   */
  async processTwilioWebhook(data) {
    try {
      const phoneNumber = data.From?.replace('whatsapp:', '');
      const content = data.Body || '';
      const messageId = data.MessageSid;
      const numMedia = parseInt(data.NumMedia || 0);

      let messageType = 'text';
      if (numMedia > 0) {
        messageType = data.MediaContentType0?.includes('image') ? 'image' : 'file';
      }

      return await this.saveIncomingMessage({
        phoneNumber,
        messageId,
        content,
        messageType,
        platform: 'whatsapp',
        rawData: data
      });
    } catch (error) {
      logger.error('Error procesando webhook de Twilio:', error);
      throw error;
    }
  }

  /**
   * Guardar mensaje entrante en BD
   */
  async saveIncomingMessage({ phoneNumber, messageId, content, messageType, platform, rawData }) {
    try {
      // Buscar cliente por telefono
      let client = await db.Client.findOne({
        where: {
          phone: {
            [db.Sequelize.Op.like]: `%${phoneNumber.slice(-10)}%`
          }
        }
      });

      if (!client) {
        logger.warn(`Cliente no encontrado para telefono: ${phoneNumber}`);
        // Opcional: crear conversacion para numero desconocido
        return null;
      }

      // Buscar o crear conversacion
      let conversation = await db.ChatConversation.findOne({
        where: { whatsappChatId: phoneNumber }
      });

      if (!conversation) {
        conversation = await db.ChatConversation.create({
          name: `WhatsApp - ${client.firstName} ${client.lastName}`,
          type: 'direct',
          participants: [client.id],
          whatsappChatId: phoneNumber
        });

        logger.info(`Nueva conversacion WhatsApp creada para cliente ${client.id}`);
      }

      // Guardar mensaje
      const chatMessage = await db.ChatMessage.create({
        conversationId: conversation.id,
        senderId: client.id,
        content,
        messageType,
        whatsappMessageId: messageId,
        metadata: rawData
      });

      // Actualizar conversacion
      await conversation.update({
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100)
      });

      // Emitir via WebSocket
      if (global.io) {
        global.io.to('staff-room').emit('new-whatsapp-message', {
          conversation,
          message: chatMessage,
          client
        });
      }

      logger.info(`Mensaje WhatsApp guardado: ${client.email} - "${content}"`);

      return {
        conversation,
        message: chatMessage,
        client
      };
    } catch (error) {
      logger.error('Error guardando mensaje de WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(phoneNumber, text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.initialized) {
      throw new Error('WhatsApp no esta configurado');
    }

    try {
      if (this.method === 'api') {
        return await this.sendViaMetaAPI(phoneNumber, text, options);
      } else if (this.method === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, text, options);
      }
    } catch (error) {
      logger.error('Error enviando mensaje WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Enviar via Meta/WhatsApp Business API
   */
  async sendViaMetaAPI(phoneNumber, text, options = {}) {
    try {
      const url = `${this.config.apiUrl}${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: text }
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Mensaje WhatsApp enviado via Meta API a ${phoneNumber}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id,
        platform: 'whatsapp',
        method: 'api'
      };
    } catch (error) {
      logger.error('Error enviando via Meta API:', error.response?.data || error.message);
      throw error;
    }
  }

/**
   * Enviar via Twilio
   */
  async sendViaTwilio(phoneNumber, text, options = {}) {
    try {
      const twilio = require('twilio');
      const client = twilio(this.config.accountSid, this.config.authToken);

      // --- LOGICA BLINDADA PARA FORMATO DE NUMEROS ---

      // 1. Limpiar el numero DESTINATARIO (TO)
      let toRaw = String(phoneNumber).replace(/\s+/g, '');
      // Si no tiene '+' al inicio y no es ya un link whatsapp, se lo ponemos
      if (!toRaw.startsWith('+') && !toRaw.startsWith('whatsapp:')) {
        toRaw = '+' + toRaw;
      }
      // Formato final requerido por Twilio: whatsapp:+1234567890
      const to = toRaw.startsWith('whatsapp:') ? toRaw : `whatsapp:${toRaw}`;


      // 2. Limpiar el numero REMITENTE (FROM - Tu numero)
      let fromRaw = String(this.config.phoneNumber).replace(/\s+/g, '');
      // Si la base de datos se comio el '+', aqui se lo volvemos a poner
      if (!fromRaw.startsWith('+') && !fromRaw.startsWith('whatsapp:')) {
        fromRaw = '+' + fromRaw;
      }
      // Formato final requerido por Twilio
      const from = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`;

      // ----------------------------------------------

      logger.info(`Intentando enviar Twilio de [${from}] a [${to}]`);

      const message = await client.messages.create({
        from: from,
        to: to,
        body: text
      });

      logger.info(`Mensaje WhatsApp enviado via Twilio a ${phoneNumber}`);

      return {
        success: true,
        messageId: message.sid,
        platform: 'whatsapp',
        method: 'twilio'
      };
    } catch (error) {
      logger.error('Error enviando via Twilio:', error.message);
      throw error;
    }
  }

  /**
   * Enviar mensaje con template (Meta API)
   */
  async sendTemplate(phoneNumber, templateName, languageCode, components = []) {
    if (!this.initialized || this.method !== 'api') {
      throw new Error('Templates solo disponibles con WhatsApp Business API');
    }

    try {
      const url = `${this.config.apiUrl}${this.config.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: phoneNumber,
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

      logger.info(`Template WhatsApp enviado a ${phoneNumber}: ${templateName}`);

      return {
        success: true,
        messageId: response.data.messages?.[0]?.id
      };
    } catch (error) {
      logger.error('Error enviando template:', error.response?.data || error.message);
      throw error;
    }
  }


  /**
   * Enviar mensaje masivo
   */
  async sendBulkMessages(recipients, text, options = {}) {
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const phoneNumber of recipients) {
      try {
        await this.sendMessage(phoneNumber, text, options);
        results.sent++;

        // Delay para evitar rate limits
        await this.delay(options.delayMs || 1000);
      } catch (error) {
        results.failed++;
        results.errors.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    logger.info(`Envio masivo WhatsApp completado: ${results.sent}/${results.total}`);

    return results;
  }

  /**
   * Verificar estado del servicio
   */
  async getStatus() {
    return {
      initialized: this.initialized,
      method: this.method,
      hasConfig: Object.keys(this.config).length > 0
    };
  }

  /**
   * Probar conexion
   */
  async testConnection(testPhoneNumber) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const testMessage = `Prueba de WhatsApp\n\nFecha: ${new Date().toLocaleString('es-MX')}\n\nLa integracion esta funcionando correctamente.`;

      await this.sendMessage(testPhoneNumber, testMessage);

      return {
        success: true,
        message: 'Mensaje de prueba enviado correctamente',
        method: this.method
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        method: this.method
      };
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

module.exports = new WhatsAppService();
