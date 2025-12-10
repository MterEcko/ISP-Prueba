// backend/src/models/messageTemplate.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageTemplate = sequelize.define('MessageTemplate', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    channelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'CommunicationChannels',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Recordatorio Pago, Instalación Programada'
    },
    subject: {
      type: DataTypes.STRING,
      comment: 'Para email'
    },
    messageBody: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    templateType: {
      type: DataTypes.ENUM('paymentReminder', 'installation', 'welcome', 'suspension', 'reactivation'),
      allowNull: false
    },
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de variables disponibles'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'MessageTemplates',
    timestamps: true
  });

  return MessageTemplate;
};