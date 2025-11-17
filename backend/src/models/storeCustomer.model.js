module.exports = (sequelize, DataTypes) => {
  const StoreCustomer = sequelize.define('StoreCustomer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Información básica
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Información de la empresa (opcional)
    companyName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    companyTaxId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'RFC, NIT, Tax ID, etc.'
    },
    companyWebsite: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Dirección
    country: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Estado de la cuenta
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'banned'),
      defaultValue: 'active'
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Contraseña (hasheada)
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Preferencias
    language: {
      type: DataTypes.STRING,
      defaultValue: 'es',
      comment: 'ISO 639-1 language code'
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      comment: 'ISO 4217 currency code'
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'America/Mexico_City'
    },

    // Estadísticas
    totalPurchases: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total number of completed orders'
    },
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total amount spent in default currency'
    },
    lastPurchaseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Marketing
    newsletter: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Subscribed to newsletter'
    },
    marketingConsent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Consent to receive marketing emails'
    },

    // Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes about the customer'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Tags for customer segmentation'
    },

    // Auditoría
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    registeredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'store_customers',
    timestamps: true,
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['status'] },
      { fields: ['country'] },
      { fields: ['emailVerified'] },
      { fields: ['createdAt'] }
    ]
  });

  StoreCustomer.associate = (models) => {
    // Un cliente puede tener muchas órdenes
    StoreCustomer.hasMany(models.StoreOrder, {
      foreignKey: 'customerId',
      as: 'orders'
    });

    // Un cliente puede tener muchas licencias activas
    StoreCustomer.hasMany(models.License, {
      foreignKey: 'storeCustomerId',
      as: 'licenses'
    });
  };

  return StoreCustomer;
};
