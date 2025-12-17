const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TelegramMessage = sequelize.define('TelegramMessage', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID del cliente (si aplica)"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID del usuario del sistema"
    },
    telegramChatId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID del chat de Telegram"
    },
    telegramMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del mensaje en Telegram"
    },
    telegramUserId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del usuario de Telegram"
    },
    telegramUsername: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Username de Telegram"
    },
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false,
      comment: "Dirección del mensaje"
    },
    messageType: {
      type: DataTypes.ENUM('text', 'photo', 'video', 'document', 'audio', 'voice', 'location', 'sticker'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Contenido del mensaje"
    },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
      defaultValue: 'sent'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos adicionales del mensaje"
    }
  }, {
    tableName: 'Plugin_TelegramMessages',
    timestamps: true
  });

  return TelegramMessage;
};
