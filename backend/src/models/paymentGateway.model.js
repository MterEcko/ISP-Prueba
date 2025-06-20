// backend/src/models/paymentGateway.model.js - CORE DEFAULTS
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentGateway = sequelize.define('PaymentGateway', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'MercadoPago, OpenPay, Transferencia'
    },
    gatewayType: {
      type: DataTypes.ENUM('online', 'cash', 'bankTransfer'),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      comment: 'MX, CO, AR, etc.'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Gateway por defecto del sistema'
    },
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'API keys, webhooks'
    }
  }, {
    tableName: 'PaymentGateways',
    timestamps: true
  });

  return PaymentGateway;
};