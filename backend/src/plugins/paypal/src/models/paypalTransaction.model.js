const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaypalTransaction = sequelize.define('PaypalTransaction', {
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
    paypalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID de la orden de PayPal"
    },
    paypalCaptureId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID de captura de PayPal"
    },
    paypalPayerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del pagador en PayPal"
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Monto de la transacción"
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('created', 'approved', 'captured', 'completed', 'refunded', 'cancelled'),
      defaultValue: 'created'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Método de pago de PayPal"
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
    tableName: 'Plugin_PaypalTransactions',
    timestamps: true
  });

  return PaypalTransaction;
};
