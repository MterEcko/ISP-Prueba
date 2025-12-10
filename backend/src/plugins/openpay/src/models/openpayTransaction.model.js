const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OpenpayTransaction = sequelize.define('OpenpayTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID del cliente"
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID de la factura relacionada"
    },
    openpayChargeId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del cargo en Openpay"
    },
    openpayCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del cliente en Openpay"
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Monto de la transacción"
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'MXN'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Método de pago (card, store, bank_account)"
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Referencia de pago"
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos adicionales"
    }
  }, {
    tableName: 'Plugin_OpenpayTransactions',
    timestamps: true
  });

  return OpenpayTransaction;
};
