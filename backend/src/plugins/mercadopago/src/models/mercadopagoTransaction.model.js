const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MercadopagoTransaction = sequelize.define('MercadopagoTransaction', {
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
    preferenceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID de la preferencia de Mercado Pago"
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID del pago en Mercado Pago"
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
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'in_process', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    statusDetail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Detalle del estado"
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Método de pago usado"
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Tipo de pago (credit_card, debit_card, ticket, etc.)"
    },
    externalReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Referencia externa"
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos adicionales de la transacción"
    }
  }, {
    tableName: 'Plugin_MercadopagoTransactions',
    timestamps: true
  });

  return MercadopagoTransaction;
};
