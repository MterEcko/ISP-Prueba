// backend/src/models/notificationRule.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationRule = sequelize.define('NotificationRule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Recordatorio 3 días, Recordatorio 7 días'
    },
    eventType: {
      type: DataTypes.ENUM('payment_overdue', 'service_suspended', 'ticket_created', 'installation_scheduled', 'custom'),
      allowNull: false
    },
    triggerCondition: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Condiciones que disparan la notificación'
    },
    channelType: {
      type: DataTypes.ENUM('email', 'whatsapp', 'telegram', 'sms'),
      allowNull: false
    },
    templateId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'MessageTemplates',
        key: 'id'
      }
    },
    delayMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Retraso en minutos antes de enviar'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    }
  }, {
    tableName: 'NotificationRules',
    timestamps: true
  });

  return NotificationRule;
};