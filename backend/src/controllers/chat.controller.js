const db = require('../models');
const telegramBotService = require('../services/telegramBot.service');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// Obtener conversaciones del usuario
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await db.ChatConversation.findAll({
      where: {
        participants: { [Op.contains]: [userId] }
      },
      include: [
        {
          model: db.ChatMessage,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: db.User,
              as: 'sender',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    logger.error('Error getting conversations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Crear conversación
exports.createConversation = async (req, res) => {
  try {
    const { participantIds, name, type } = req.body;
    const userId = req.user.id;

    const conversation = await db.ChatConversation.create({
      name: name || null,
      type: type || 'direct',
      participants: [...new Set([userId, ...participantIds])]
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener mensajes de conversación
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const messages = await db.ChatMessage.findAll({
      where: {
        conversationId,
        isDeleted: false
      },
      include: [
        {
          model: db.User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    logger.error('Error getting messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enviar mensaje
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, messageType, attachments } = req.body;
    const userId = req.user.id;

    const conversation = await db.ChatConversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversación no encontrada' });
    }

    // Crear mensaje
    const message = await db.ChatMessage.create({
      conversationId,
      senderId: userId,
      content,
      messageType: messageType || 'text',
      attachments: attachments || []
    });

    // Actualizar conversación
    await conversation.update({
      lastMessageAt: new Date(),
      lastMessagePreview: content.substring(0, 100)
    });

    // Enviar a Telegram si está integrado
    if (conversation.telegramChatId && telegramBotService.isActive()) {
      try {
        const result = await telegramBotService.sendMessage(
          conversation.telegramChatId,
          content
        );
        await message.update({ telegramMessageId: result.message_id.toString() });
      } catch (error) {
        logger.error('Error enviando a Telegram:', error);
      }
    }

    // Emitir via WebSocket
    global.io?.to(`conversation:${conversationId}`).emit('new-message', {
      message,
      sender: req.user
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Marcar mensajes como leídos
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    await db.ChatMessage.update(
      {
        readBy: db.sequelize.fn(
          'array_append',
          db.sequelize.col('readBy'),
          { userId, readAt: new Date() }
        )
      },
      {
        where: {
          conversationId,
          senderId: { [Op.ne]: userId }
        }
      }
    );

    res.json({ success: true, message: 'Mensajes marcados como leídos' });
  } catch (error) {
    logger.error('Error marking as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Estado del Telegram Bot
exports.getTelegramStatus = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);

    res.json({
      success: true,
      data: {
        isActive: telegramBotService.isActive(),
        isLinked: !!user.telegramChatId,
        telegramUsername: user.telegramUsername
      }
    });
  } catch (error) {
    logger.error('Error getting telegram status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
