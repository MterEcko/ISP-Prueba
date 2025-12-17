const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const License = sequelize.define('License', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Clave de licencia
    licenseKey: {
      type: DataTypes.STRING(64),
      // unique removed - defined in indexes below to avoid Sequelize PostgreSQL sync bug
      allowNull: false
    },

    // Tipo de plan
    planType: {
      type: DataTypes.ENUM('freemium', 'basic', 'premium', 'enterprise', 'master'),
      allowNull: false,
      defaultValue: 'freemium'
    },

    // Límites
    clientLimit: {
      type: DataTypes.INTEGER,
      comment: 'null = ilimitado'
    },
    userLimit: {
      type: DataTypes.INTEGER,
      comment: 'null = ilimitado'
    },
    branchLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },

    // Características habilitadas
    featuresEnabled: {
      type: DataTypes.JSON,
      defaultValue: {}
    },

    // Validez
    issuedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      comment: 'null = sin expiración'
    },
    activatedAt: {
      type: DataTypes.DATE
    },

    // Estado
    status: {
      type: DataTypes.ENUM('pending', 'active', 'expired', 'revoked', 'suspended'),
      defaultValue: 'pending'
    },

    // Asociación
    installationId: {
      type: DataTypes.UUID,
      references: {
        model: 'Installations',
        key: 'id'
      }
    },

    // Paquete de servicio asociado
    servicePackageId: {
      type: DataTypes.UUID,
      references: {
        model: 'ServicePackages',
        key: 'id'
      },
      comment: 'Paquete de servicio al que pertenece esta licencia'
    },

    // Hardware binding
    boundToHardwareId: {
      type: DataTypes.STRING,
      comment: 'Hardware ID al que está vinculada esta licencia'
    },

    // Pricing
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },

    // Renovación
    isRecurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    recurringInterval: {
      type: DataTypes.ENUM('monthly', 'yearly')
      // comment removed to avoid Sequelize PostgreSQL ENUM sync bug with USING clause
    },
    lastRenewalDate: {
      type: DataTypes.DATE
    },
    nextRenewalDate: {
      type: DataTypes.DATE
    },

    // Master license flag
    isMasterLicense: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Metadata
    notes: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'Licenses',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['licenseKey'], name: 'unique_license_key' },
      { fields: ['status'] },
      { fields: ['planType'] },
      { fields: ['installationId'] },
      { fields: ['expiresAt'] }
    ]
  });

  License.associate = (models) => {
    License.belongsTo(models.Installation, {
      foreignKey: 'installationId',
      as: 'installation'
    });

    License.belongsTo(models.ServicePackage, {
      foreignKey: 'servicePackageId',
      as: 'servicePackage'
    });
  };

  // Métodos de instancia
  License.prototype.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  };

  License.prototype.daysRemaining = function() {
    if (!this.expiresAt) return null;
    const diff = new Date(this.expiresAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  License.prototype.isActive = function() {
    return this.status === 'active' && !this.isExpired();
  };

  return License;
};
