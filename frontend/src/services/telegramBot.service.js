const TelegramBot = require('node-telegram-bot-api');
const db = require('../models');
const logger = require('../config/logger');

class TelegramBotService {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
    this.userMappings = new Map(); // Map de telegramUserId -> systemUserId
  }

  /**
   * Inicializar bot de Telegram
   */
  initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      logger.warn('TELEGRAM_BOT_TOKEN no configurado. Chat de Telegram deshabilitado.');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
      this.isInitialized = true;
      logger.info('✅ Telegram Bot inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando Telegram Bot:', error);
    }
  }

  /**
   * Configurar manejadores de eventos
   */
  setupHandlers() {
    // Mensaje de texto
    this.bot.on('message', async (msg) => {
      try {
        await this.handleIncomingMessage(msg);
      } catch (error) {
        logger.error('Error manejando mensaje de Telegram:', error);
      }
    });

    // Comando /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
¡Bienvenido al chat de ISP-Prueba! 🎉

Para vincular tu cuenta, usa el comando:
/link TU_EMAIL

Por ejemplo: /link juan@ejemplo.com
      `.trim();

      await this.bot.sendMessage(chatId, welcomeMessage);
    });

    // Comando /link
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const email = match[1];

      try {
        const user = await db.User.findOne({ where: { email } });

        if (!user) {
          await this.bot.sendMessage(chatId, '❌ Usuario no encontrado con ese email.');
          return;
        }

        // Guardar mapeo
        this.userMappings.set(msg.from.id.toString(), user.id);

        // Actualizar usuario con telegramChatId
        await user.update({
          telegramChatId: chatId.toString(),
          telegramUsername: msg.from.username || null
        });

        await this.bot.sendMessage(
          chatId,
          `✅ Cuenta vinculada correctamente!\n\nNombre: ${user.firstName} ${user.lastName}\nEmail: ${user.email}`
        );

        logger.info(`Usuario ${user.email} vinculó cuenta de Telegram`);
      } catch (error) {
        logger.error('Error vinculando cuenta:', error);
        await this.bot.sendMessage(chatId, '❌ Error al vincular la cuenta.');
      }
    });

    // Comando /unlink
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

          await this.bot.sendMessage(chatId, '✅ Cuenta desvinculada.');
        } else {
          await this.bot.sendMessage(chatId, 'No hay cuenta vinculada.');
        }
      } catch (error) {
        logger.error('Error desvinculando cuenta:', error);
      }
    });

    // Comando /help
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
📱 Comandos disponibles:

/start - Iniciar conversación
/link EMAIL - Vincular tu cuenta del sistema
/unlink - Desvincular cuenta
/help - Mostrar esta ayuda
/status - Ver estado de conexión

Una vez vinculada tu cuenta, tus mensajes se sincronizarán con el sistema.
      `.trim();

      await this.bot.sendMessage(chatId, helpMessage);
    });

    // Comando /status
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        const user = await db.User.findOne({
          where: { telegramChatId: chatId.toString() }
        });

        if (user) {
          await this.bot.sendMessage(
            chatId,
            `✅ Cuenta vinculada\n\nNombre: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nRol: ${user.role}`
          );
        } else {
          await this.bot.sendMessage(
            chatId,
            '❌ No hay cuenta vinculada.\n\nUsa /link TU_EMAIL para vincular.'
          );
        }
      } catch (error) {
        logger.error('Error verificando status:', error);
      }
    });
  }

  /**
   * Manejar mensaje entrante de Telegram
   */
  async handleIncomingMessage(msg) {
    // Ignorar comandos (ya se manejan con onText)
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    const telegramChatId = msg.chat.id.toString();
    const telegramUserId = msg.from.id.toString();

    // Buscar usuario vinculado
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

    // Buscar o crear conversación
    let conversation = await db.ChatConversation.findOne({
      where: { telegramChatId }
    });

    if (!conversation) {
      conversation = await db.ChatConversation.create({
        name: `Chat de ${user.firstName}`,
        type: 'direct',
        participants: [user.id],
        telegramChatId
      });
    }

    // Guardar mensaje en BD
    const message = await db.ChatMessage.create({
      conversationId: conversation.id,
      senderId: user.id,
      content: msg.text || '[Archivo multimedia]',
      messageType: this.getMessageType(msg),
      telegramMessageId: msg.message_id.toString(),
      attachments: this.extractAttachments(msg)
    });

    // Actualizar conversación
    await conversation.update({
      lastMessageAt: new Date(),
      lastMessagePreview: message.content.substring(0, 100)
    });

    logger.info(`Mensaje recibido de Telegram: ${user.email} - "${message.content}"`);

    // Emitir evento de WebSocket (se implementará después)
    global.io?.to(`conversation:${conversation.id}`).emit('new-message', {
      message,
      sender: user
    });
  }

  /**
   * Enviar mensaje a Telegram
   */
  async sendMessage(telegramChatId, text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendMessage(telegramChatId, text, options);
      return result;
    } catch (error) {
      logger.error('Error enviando mensaje a Telegram:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje con archivo
   */
  async sendFile(telegramChatId, fileUrl, caption = '') {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendDocument(telegramChatId, fileUrl, {
        caption
      });
      return result;
    } catch (error) {
      logger.error('Error enviando archivo a Telegram:', error);
      throw error;
    }
  }

  /**
   * Enviar foto
   */
  async sendPhoto(telegramChatId, photoUrl, caption = '') {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const result = await this.bot.sendPhoto(telegramChatId, photoUrl, {
        caption
      });
      return result;
    } catch (error) {
      logger.error('Error enviando foto a Telegram:', error);
      throw error;
    }
  }

  /**
   * Obtener tipo de mensaje
   */
  getMessageType(msg) {
    if (msg.photo) return 'image';
    if (msg.document) return 'file';
    if (msg.audio || msg.voice) return 'audio';
    if (msg.video) return 'video';
    if (msg.location) return 'location';
    return 'text';
  }

  /**
   * Extraer adjuntos de mensaje de Telegram
   */
  extractAttachments(msg) {
    const attachments = [];

    if (msg.photo && msg.photo.length > 0) {
      const photo = msg.photo[msg.photo.length - 1]; // Última foto (mayor resolución)
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

  /**
   * Obtener enlace de descarga de archivo
   */
  async getFileLink(fileId) {
    if (!this.isInitialized) {
      throw new Error('Telegram Bot no inicializado');
    }

    try {
      const file = await this.bot.getFile(fileId);
      return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    } catch (error) {
      logger.error('Error obteniendo enlace de archivo:', error);
      throw error;
    }
  }

  /**
   * Verificar si el bot está activo
   */
  isActive() {
    return this.isInitialized && this.bot !== null;
  }
}

module.exports = new TelegramBotService();
