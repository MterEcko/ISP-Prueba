// backend/src/models/paymentTransaction.model.js
module.exports = (sequelize, DataTypes) => {
  const PaymentTransaction = sequelize.define('PaymentTransaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Invoices',
        key: 'id'
      },
      comment: 'Factura asociada al pago'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      },
      comment: 'Cliente que realizó el pago'
    },
    gatewayId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'PaymentGateways',
        key: 'id'
      },
      comment: 'Pasarela utilizada'
    },
    gatewayType: {
      type: DataTypes.ENUM('paypal', 'stripe', 'mercadopago', 'card', 'transfer', 'cash'),
      allowNull: false,
      comment: 'Tipo de pasarela'
    },
    transactionId: {
      type: DataTypes.STRING(200),
      allowNull: true,
      unique: true,
      comment: 'ID de transacción de la pasarela externa'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto del pago'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'MXN',
      comment: 'Moneda del pago'
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Comisión de la pasarela'
    },
    netAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monto neto recibido (amount - fee)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Estado del pago'
    },
    paymentMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Método de pago específico (tarjeta, cuenta PayPal, etc.)'
    },
    payerEmail: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Email del pagador'
    },
    payerName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nombre del pagador'
    },
    payerData: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('payerData');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('payerData', JSON.stringify(value));
      },
      comment: 'Datos adicionales del pagador'
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('metadata');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('metadata', JSON.stringify(value));
      },
      comment: 'Metadata adicional de la transacción'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje de error si el pago falló'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de procesamiento del pago'
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha de reembolso'
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto reembolsado'
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Razón del reembolso'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP del cliente al realizar el pago'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent del navegador'
    }
  }, {
    tableName: 'payment_transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['clientId']
      },
      {
        fields: ['invoiceId']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['gatewayType']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return PaymentTransaction;
};
