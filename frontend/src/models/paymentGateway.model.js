// backend/src/models/paymentGateway.model.js
module.exports = (sequelize, DataTypes) => {
  const PaymentGateway = sequelize.define('PaymentGateway', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre de la pasarela (paypal, stripe, mercadopago)'
    },
    displayName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: 'Nombre para mostrar al usuario'
    },
    type: {
      type: DataTypes.ENUM('paypal', 'stripe', 'mercadopago', 'card', 'transfer', 'cash'),
      allowNull: false,
    },
    gatewayType: {
      type: DataTypes.ENUM('paypal', 'stripe', 'mercadopago', 'card', 'transfer', 'cash'),
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si la pasarela está activa'
    },
    mode: {
      type: DataTypes.ENUM('sandbox', 'live'),
      defaultValue: 'sandbox'
      // Nota: Modo de operación (sandbox para pruebas, live para producción)
    },
    configuration: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('configuration');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('configuration', JSON.stringify(value));
      },
      comment: 'Configuración JSON de la pasarela (API keys, etc.)'
    },
    feeFixed: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Comisión fija por transacción'
    },
    feePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Porcentaje de comisión por transacción'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'MXN',
      comment: 'Moneda por defecto'
    },
    minAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Monto mínimo para procesar'
    },
    maxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monto máximo para procesar'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción de la pasarela'
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL del logo de la pasarela'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el registro está activo'
    }
  }, {
    tableName: 'payment_gateways',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['type']
      },
      {
        fields: ['enabled']
      }
    ]
  });

  return PaymentGateway;
};
