const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ServicePackage = sequelize.define('ServicePackage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Información básica del paquete
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nombre del paquete (ej: Basic, Premium, Enterprise)'
    },

    slug: {
      type: DataTypes.STRING,
      unique: true,
      comment: 'URL-friendly identifier'
    },

    description: {
      type: DataTypes.TEXT,
      comment: 'Descripción corta del paquete'
    },

    longDescription: {
      type: DataTypes.TEXT,
      comment: 'Descripción detallada con características'
    },

    // Pricing
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Precio mensual del paquete'
    },

    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },

    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si el paquete es gratuito'
    },

    // Límites del paquete
    clientLimit: {
      type: DataTypes.INTEGER,
      comment: 'Límite de clientes (null = ilimitado)'
    },

    userLimit: {
      type: DataTypes.INTEGER,
      comment: 'Límite de usuarios (null = ilimitado)'
    },

    serviceLimit: {
      type: DataTypes.INTEGER,
      comment: 'Límite de servicios activos (null = ilimitado)'
    },

    branchLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Límite de sucursales'
    },

    // Características del paquete
    features: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de características incluidas'
    },

    // Configuración de renovación
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'yearly', 'one-time', 'custom'),
      defaultValue: 'monthly',
      comment: 'Ciclo de facturación'
    },

    // Estado
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deprecated'),
      defaultValue: 'active'
    },

    // Orden para mostrar en el marketplace
    displayOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de visualización (menor = más arriba)'
    },

    // Características habilitadas (para licencias)
    featuresEnabled: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Configuración de características para el sistema ISP'
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos adicionales configurables'
    }
  }, {
    tableName: 'ServicePackages',
    timestamps: true,
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['status'] },
      { fields: ['displayOrder'] }
    ]
  });

  ServicePackage.associate = (models) => {
    // Un paquete puede tener muchos clientes
    ServicePackage.hasMany(models.Customer, {
      foreignKey: 'servicePackageId',
      as: 'customers'
    });

    // Relación muchos a muchos con Plugins
    ServicePackage.belongsToMany(models.Plugin, {
      through: 'PluginPackages',
      foreignKey: 'servicePackageId',
      otherKey: 'pluginId',
      as: 'plugins'
    });
  };

  return ServicePackage;
};
