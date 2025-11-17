const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatConversation = sequelize.define('ChatConversation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del grupo (si aplica)'
    },
    type: {
      type: DataTypes.ENUM('direct', 'group', 'channel'),
      defaultValue: 'direct',
      comment: 'Tipo de conversación'
    },
    participants: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de IDs de usuarios participantes'
    },
    telegramChatId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del chat en Telegram (si está integrado)'
    },
    whatsappChatId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del chat en WhatsApp (si está integrado)'
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastMessagePreview: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unreadCount: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Contador de no leídos por usuario: {userId: count}'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'ChatConversations',
    timestamps: true,
    indexes: [
      { fields: ['telegramChatId'] },
      { fields: ['whatsappChatId'] },
      { fields: ['type'] },
      { fields: ['lastMessageAt'] }
    ]
  });

  ChatConversation.associate = (models) => {
    ChatConversation.hasMany(models.ChatMessage, {
      foreignKey: 'conversationId',
      as: 'messages'
    });
  };

  return ChatConversation;
};
