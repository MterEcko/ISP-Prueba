const TelegramBot = require('node-telegram-bot-api');
const db = require('../../../models');
const logger = require('../../../config/logger');

class TelegramPlugin {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
    this.userMappings = new Map();
    this.config = {};
  }

  static getPluginInfo() {
    return {
      name: 'telegram-bot',
      version: '1.0.0',
      description: 'Plugin de Telegram Bot para chat y notificaciones',
      category: 'communication',
      author: 'ISP-Prueba Team',
      capabilities: ['send_message', 'receive_message', 'commands', 'multimedia'],
      supportedFeatures: ['text', 'photos', 'documents', 'audio', 'video', 'location']
    };
  }

  async onActivate(config) {
    try {
      logger.info('Activando plugin Telegram Bot...');

      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Configuracion invalida: ${validation.errors.join(', ')}`);
      }

      this.config = config;

      if (!config.botToken) {
        throw new Error('Bot Token es requerido');
      }

      this.bot = new TelegramBot(config.botToken, { polling: true });
      this.setupHandlers();
      this.isInitialized = true;

      logger.info('Plugin Telegram Bot inicializado correctamente');

      return {
        success: true,
        message: 'Plugin activado correctamente',
        botUsername: config.botUsername
      };
    } catch (error) {
      logger.error('Error inicializando Telegram Bot:', error);
      throw error;
    }
  }

  async onDeactivate() {
    try {
      logger.info('Desactivando plugin Telegram Bot...');

      if (this.bot) {
        await this.bot.stopPolling();
        this.bot = null;
      }

      this.config = {};
      this.isInitialized = false;
      this.userMappings.clear();

      logger.info('Plugin Telegram Bot desactivado');

      return {
        success: true,
        message: 'Plugin desactivado correctamente'
      };
    } catch (error) {
      logger.error('Error desactivando Telegram Bot:', error);
      throw error;
    }
  }

  registerRoutes(app) {
    const routes = require('./routes');
    app.use('/api/plugins/telegram', routes);
    logger.info('Rutas de Telegram Bot registradas');
  }

  validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuracion es requerida'] };
    }

    if (!config.botToken) {
      errors.push('Bot Token es requerido');
    }

    if (!config.botUsername) {
      errors.push('Bot Username es requerido');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  setupHandlers() {
    this.bot.on('message', async (msg) => {
      try {
        await this.handleIncomingMessage(msg);
      } catch (error) {
        logger.error('Error manejando mensaje de Telegram:', error);
      }
    });

    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = this.config.welcomeMessage ||
        `Bienvenido al chat de ISP-Prueba\n\nPara vincular tu cuenta, usa el comando:\n/link TU_EMAIL\n\nPor ejemplo: /link juan@ejemplo.com`;

      await this.bot.sendMessage(chatId, welcomeMessage);
    });

    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const email = match[1];

      try {
        const user = await db.User.findOne({ where: { email } });

        if (!user) {
          await this.bot.sendMessage(chatId, 'Usuario no encontrado con ese email.');
          return;
        }

        this.userMappings.set(msg.from.id.toString(), user.id);

        await user.update({
          telegramChatId: chatId.toString(),
          telegramUsername: msg.from.username || null
        });

        await this.bot.sendMessage(
          chatId,
          `Cuenta vinculada correctamente\n\nNombre: ${user.firstName} ${user.lastName}\nEmail: ${user.email}`
        );

        logger.info(`Usuario ${user.email} vinculo cuenta de Telegram`);
      } catch (error) {
        logger.error('Error vinculando cuenta:', error);
        await this.bot.sendMessage(chatId, 'Error al vincular la cuenta.');
      }
    });

    this.bot.onText(/\/unlink/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const user = await db.User.findOne({
          where: { telegramChatId: chatId.toString() }
        });

        if (user) {
          await user.update({
            telegramChatId: null,
            telegramUsername: null
          });

          this.userMappings.delete(msg.from.id.toString());

          await this.bot.sendMessage(chatId, 'Cuenta desvinculada.');
        } else {
          await this.bot.sendMessage(chatId, 'No hay cuenta vinculada.');
        }
      } catch (error) {
        logger.error('Error desvinculando cuenta:', error);
      }
    });

    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `Comandos disponibles:\n\n/start - Iniciar conversacion\n/link EMAIL - Vincular tu cuenta del sistema\n/unlink - Desvincular cuenta\n/help - Mostrar esta ayuda\n/status - Ver estado de conexion\n\nUna vez vinculada tu cuenta, tus mensajes se sincronizaran con el sistema.`;

      await this.bot.sendMessage(chatId, helpMessage);
    });

    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const user = await db.User.findOne({
          where: { telegramChatId: chatId.toString() }
        });

        if (user) {
          await this.bot.sendMessage(
            chatId,
            `Cuenta vinculada\n\nNombre: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nRol: ${user.role}`
          );
        } else {
          await this.bot.sendMessage(
            chatId,
            'No hay cuenta vinculada.\n\nUsa /link TU_EMAIL para vincular.'
          );
        }
      } catch (error) {
        logger.error('Error verificando status:', error);
      }
    });
  }

  async handleIncomingMessage(msg) {
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    const telegramChatId = msg.chat.id.toString();
    const telegramUserId = msg.from.id.toString();

    const user = await db.User.findOne({
      where: { telegramChatId }
    });

    if (!user) {
      await this.bot.sendMessage(
        telegramChatId,
        'Por favor vincula tu cuenta primero con /link TU_EMAIL'
      );
      return;
    }

    let conversation = await db.ChatConversation.findOne({
      where: { telegramChatId }
    });

    if (!conversation) {
      conversation = await db.ChatConversation.create({
        name: `Chat de ${user.firstName}`,
        type: 'direct',
        participants: [user.id],
        telegramChatId,
        platform: 'telegram'
      });
    }

    const message = await db.ChatMessage.create({
      conversationId: conversation.id,
      senderId: user.id,
      content: msg.text || '[Archivo multimedia]',
      messageType: this.getMessageType(msg),
      telegramMessageId: msg.message_id.toString(),
      attachments: this.extractAttachments(msg)
    });

    await conversation.update({
      lastMessageAt: new Date(),
      lastMessagePreview: message.content.substring(0, 100)
    });

    logger.info(`Mensaje recibido de Telegram: ${user.email} - "${message.content}"`);

    if (global.io) {
      global.io.to(`conversation:${conversation.id}`).emit('new-message', {
        message,
        sender: user
      });
    }

    return {
      success: true,
      message,
      conversation,
      user
    };
  }

  async sendMessage(telegramChatId, text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendMessage(telegramChatId, text, options);
      return {
        success: true,
        messageId: result.message_id,
        chatId: result.chat.id
      };
    } catch (error) {
      logger.error('Error enviando mensaje a Telegram:', error);
      throw error;
    }
  }

  async sendFile(telegramChatId, fileUrl, caption = '') {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendDocument(telegramChatId, fileUrl, {
        caption
      });
      return {
        success: true,
        messageId: result.message_id
      };
    } catch (error) {
      logger.error('Error enviando archivo a Telegram:', error);
      throw error;
    }
  }

  async sendPhoto(telegramChatId, photoUrl, caption = '') {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendPhoto(telegramChatId, photoUrl, {
        caption
      });
      return {
        success: true,
        messageId: result.message_id
      };
    } catch (error) {
      logger.error('Error enviando foto a Telegram:', error);
      throw error;
    }
  }

  getMessageType(msg) {
    if (msg.photo) return 'image';
    if (msg.document) return 'file';
    if (msg.audio || msg.voice) return 'audio';
    if (msg.video) return 'video';
    if (msg.location) return 'location';
    return 'text';
  }

  extractAttachments(msg) {
    const attachments = [];

    if (msg.photo && msg.photo.length > 0) {
      const photo = msg.photo[msg.photo.length - 1];
      attachments.push({
        type: 'image',
        fileId: photo.file_id,
        fileSize: photo.file_size
      });
    }

    if (msg.document) {
      attachments.push({
        type: 'file',
        fileId: msg.document.file_id,
        fileName: msg.document.file_name,
        fileSize: msg.document.file_size,
        mimeType: msg.document.mime_type
      });
    }

    if (msg.audio) {
      attachments.push({
        type: 'audio',
        fileId: msg.audio.file_id,
        duration: msg.audio.duration,
        fileSize: msg.audio.file_size
      });
    }

    if (msg.video) {
      attachments.push({
        type: 'video',
        fileId: msg.video.file_id,
        duration: msg.video.duration,
        fileSize: msg.video.file_size
      });
    }

    return attachments;
  }

  async getFileLink(fileId) {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const file = await this.bot.getFile(fileId);
      return `https://api.telegram.org/file/bot${this.config.botToken}/${file.file_path}`;
    } catch (error) {
      logger.error('Error obteniendo enlace de archivo:', error);
      throw error;
    }
  }

  async getStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const messages = await db.ChatMessage.count({
        include: [{
          model: db.ChatConversation,
          where: { platform: 'telegram' }
        }],
        where: {
          createdAt: {
            [db.Sequelize.Op.gte]: startDate
          }
        }
      });

      const conversations = await db.ChatConversation.count({
        where: { platform: 'telegram' }
      });

      const linkedUsers = await db.User.count({
        where: {
          telegramChatId: {
            [db.Sequelize.Op.ne]: null
          }
        }
      });

      return {
        totalMessages: messages,
        totalConversations: conversations,
        linkedUsers: linkedUsers
      };
    } catch (error) {
      logger.error('Error obteniendo estadisticas:', error);
      throw error;
    }
  }

  isActive() {
    return this.isInitialized && this.bot !== null;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      hasConfig: Object.keys(this.config).length > 0,
      botUsername: this.config.botUsername || null
    };
  }
}

module.exports = TelegramPlugin;
