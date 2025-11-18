module.exports = (sequelize, DataTypes) => {
  const StoreOrder = sequelize.define('StoreOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Cliente
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'StoreCustomers',
        key: 'id'
      }
    },

    // Número de orden
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Human-readable order number (e.g., ORD-2024-00001)'
    },

    // Estado de la orden
    status: {
      type: DataTypes.ENUM(
        'pending',       // Pendiente de pago
        'processing',    // Procesando pago
        'completed',     // Completada y pagada
        'failed',        // Pago fallido
        'refunded',      // Reembolsada
        'cancelled'      // Cancelada
      ),
      defaultValue: 'pending'
    },

    // Montos
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Subtotal before taxes and discounts'
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total tax amount'
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total discount amount'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Final total amount'
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      comment: 'ISO 4217 currency code'
    },

    // Información de pago
    paymentMethod: {
      type: DataTypes.ENUM(
        'credit_card',
        'paypal',
        'stripe',
        'bank_transfer',
        'cryptocurrency',
        'other'
      ),
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'paid', 'partially_paid', 'refunded'),
      defaultValue: 'unpaid'
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Transaction ID from payment gateway'
    },
    paymentGateway: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Payment gateway used (stripe, paypal, etc.)'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Cupón de descuento
    couponCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    couponDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },

    // Dirección de facturación
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON with billing address details'
    },

    // Información del cliente en el momento de la compra
    customerSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Customer information snapshot at purchase time'
    },

    // Notas
    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from customer'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal admin notes'
    },

    // Fechas importantes
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refundedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Additional order metadata'
    },

    // IP y User Agent
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'store_orders',
    timestamps: true,
    indexes: [
      { fields: ['customerId'] },
      { fields: ['orderNumber'], unique: true },
      { fields: ['status'] },
      { fields: ['paymentStatus'] },
      { fields: ['createdAt'] },
      { fields: ['paidAt'] }
    ]
  });

  StoreOrder.associate = (models) => {
    // Una orden pertenece a un cliente
    StoreOrder.belongsTo(models.StoreCustomer, {
      foreignKey: 'customerId',
      as: 'customer'
    });

    // Una orden tiene muchos items
    StoreOrder.hasMany(models.StoreOrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
  };

  // Hook para generar número de orden
  StoreOrder.beforeCreate(async (order) => {
    if (!order.orderNumber) {
      const year = new Date().getFullYear();
      const count = await StoreOrder.count({
        where: sequelize.where(
          sequelize.fn('YEAR', sequelize.col('createdAt')),
          year
        )
      });
      order.orderNumber = `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  });

  return StoreOrder;
};
