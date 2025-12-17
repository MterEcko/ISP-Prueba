const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StripeTransaction = sequelize.define('StripeTransaction', {
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
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del PaymentIntent de Stripe"
    },
    stripeChargeId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del cargo de Stripe"
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del cliente en Stripe"
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
      type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Tipo de método de pago (card, oxxo, spei, etc.)"
    },
    paymentMethodId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del método de pago en Stripe"
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
    tableName: 'Plugin_StripeTransactions',
    timestamps: true
  });

  return StripeTransaction;
};
