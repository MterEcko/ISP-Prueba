// backend/src/models/communicationLog.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationLog = sequelize.define('CommunicationLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    recipient: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'email, phone, chatId'
    },
    subject: {
      type: DataTypes.STRING
    },
    messageSent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'failed'),
      defaultValue: 'pending'
    },
    errorMessage: {
      type: DataTypes.TEXT
    },
    gatewayResponse: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    sentAt: {
      type: DataTypes.DATE
    },
    deliveredAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'CommunicationLogs',
    timestamps: true
  });

  return CommunicationLog;
};