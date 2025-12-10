// backend/src/models/paymentReminder.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentReminder = sequelize.define('PaymentReminder', {
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
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Invoices',
        key: 'id'
      }
    },
    reminderType: {
      type: DataTypes.ENUM('email', 'sms', 'whatsapp'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending'
    },
    daysOverdue: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    messageSent: {
      type: DataTypes.TEXT
    },
    sentAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'payment_reminders',
    timestamps: true,
    underscored: true
  });

  return PaymentReminder;
};