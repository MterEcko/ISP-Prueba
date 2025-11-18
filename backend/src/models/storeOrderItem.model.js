module.exports = (sequelize, DataTypes) => {
  const StoreOrderItem = sequelize.define('StoreOrderItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Orden
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'StoreOrders',
        key: 'id'
      }
    },

    // Tipo de producto
    productType: {
      type: DataTypes.ENUM('plugin', 'license', 'bundle', 'subscription'),
      allowNull: false
    },

    // ID del producto (puede ser plugin o licencia)
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'References plugin or license depending on productType'
    },

    // Información del producto en el momento de la compra
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product name snapshot'
    },
    productVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Product version at purchase time'
    },
    productDescription: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Precios
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price per unit'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'quantity * unitPrice'
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Discount applied to this item'
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Tax for this item'
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Final total for this line item'
    },

    // Licencia generada (si aplica)
    generatedLicenseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Licenses',
        key: 'id'
      },
      comment: 'License generated for this purchase'
    },

    // Tipo de licencia (si aplica)
    licenseType: {
      type: DataTypes.ENUM('trial', 'personal', 'business', 'enterprise', 'lifetime'),
      allowNull: true
    },
    licenseDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in days (null for lifetime)'
    },

    // Suscripción (si aplica)
    isSubscription: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    subscriptionPeriod: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'lifetime'),
      allowNull: true
    },
    subscriptionStartDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscriptionEndDate: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Estado
    status: {
      type: DataTypes.ENUM('pending', 'delivered', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the product was delivered (license sent, etc.)'
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Additional item metadata'
    }
  }, {
    tableName: 'store_order_items',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['productType'] },
      { fields: ['productId'] },
      { fields: ['generatedLicenseId'] },
      { fields: ['status'] }
    ]
  });

  StoreOrderItem.associate = (models) => {
    // Un item pertenece a una orden
    StoreOrderItem.belongsTo(models.StoreOrder, {
      foreignKey: 'orderId',
      as: 'order'
    });

    // Un item puede referenciar un plugin
    StoreOrderItem.belongsTo(models.Plugin, {
      foreignKey: 'productId',
      as: 'plugin',
      constraints: false
    });

    // Un item puede tener una licencia generada
    StoreOrderItem.belongsTo(models.License, {
      foreignKey: 'generatedLicenseId',
      as: 'generatedLicense'
    });
  };

  // Hook para calcular subtotal
  StoreOrderItem.beforeSave(async (item) => {
    item.subtotal = item.quantity * item.unitPrice;
    item.total = item.subtotal - item.discount + item.tax;
  });

  return StoreOrderItem;
};
