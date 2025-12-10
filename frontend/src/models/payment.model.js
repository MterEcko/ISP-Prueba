// backend/src/models/payment.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Invoices',
        key: 'id'
      }
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    gatewayId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PaymentGateways',
        key: 'id'
      }
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Referencia única del gateway'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.ENUM('card', 'cash', 'transfer', 'oxxo', 'spei'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    gatewayResponse: {
      type: DataTypes.TEXT
    },
    paymentDate: {
      type: DataTypes.DATEONLY
    },
    paymentData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos adicionales del pago'
    },
    processedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'Payments',
    timestamps: true
  });

  return Payment;
};