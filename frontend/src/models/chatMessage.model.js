const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Usuario que envió el mensaje'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    messageType: {
      type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'video', 'location'),
      defaultValue: 'text'
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de archivos adjuntos con URLs'
    },
    replyToId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID del mensaje al que responde'
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    readBy: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de {userId, readAt}'
    },
    telegramMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del mensaje en Telegram'
    },
    whatsappMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del mensaje en WhatsApp'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'ChatMessages',
    timestamps: true,
    indexes: [
      { fields: ['conversationId'] },
      { fields: ['senderId'] },
      { fields: ['createdAt'] },
      { fields: ['telegramMessageId'] },
      { fields: ['whatsappMessageId'] }
    ]
  });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.ChatConversation, {
      foreignKey: 'conversationId',
      as: 'conversation'
    });

    ChatMessage.belongsTo(models.User, {
      foreignKey: 'senderId',
      as: 'sender'
    });

    // Auto-referencia para respuestas
    ChatMessage.belongsTo(models.ChatMessage, {
      foreignKey: 'replyToId',
      as: 'replyTo'
    });
  };

  return ChatMessage;
};
