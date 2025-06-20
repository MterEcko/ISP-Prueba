// backend/src/models/notificationQueue.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationQueue = sequelize.define('NotificationQueue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    channelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'CommunicationChannels',
        key: 'id'
      }
    },
    templateId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'MessageTemplates',
        key: 'id'
      }
    },
    ruleId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'NotificationRules',
        key: 'id'
      }
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Email, phone, chatId del destinatario'
    },
    messageData: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'JSON con datos completos del mensaje'
    },
    scheduledFor: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    processedAt: {
      type: DataTypes.DATE
    },
    result: {
      type: DataTypes.TEXT,
      comment: 'JSON con resultado del envío'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    }
  }, {
    tableName: 'NotificationQueue',
    timestamps: true
  });

  return NotificationQueue;
};

