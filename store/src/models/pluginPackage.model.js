const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PluginPackage = sequelize.define('PluginPackage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Relaciones
    pluginId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Plugins',
        key: 'id'
      }
    },

    servicePackageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ServicePackages',
        key: 'id'
      }
    },

    // Configuración del plugin para este paquete
    isFree: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el plugin es gratis en este paquete'
    },

    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el plugin está habilitado para este paquete'
    },

    // Credenciales específicas del plugin para este paquete
    // Por ejemplo, diferentes credenciales de email para cada paquete
    credentials: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Credenciales del plugin específicas para este paquete (ej: email, API keys)'
    },

    // Configuración específica
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Configuración adicional del plugin para este paquete'
    },

    // Precio adicional si el plugin no es gratis
    additionalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Precio adicional si el plugin es de pago en este paquete'
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Datos adicionales'
    }
  }, {
    tableName: 'PluginPackages',
    timestamps: true,
    indexes: [
      // Evitar duplicados de plugin-paquete
      {
        unique: true,
        fields: ['pluginId', 'servicePackageId'],
        name: 'unique_plugin_package'
      },
      { fields: ['pluginId'] },
      { fields: ['servicePackageId'] },
      { fields: ['isEnabled'] }
    ]
  });

  PluginPackage.associate = (models) => {
    PluginPackage.belongsTo(models.Plugin, {
      foreignKey: 'pluginId',
      as: 'plugin'
    });

    PluginPackage.belongsTo(models.ServicePackage, {
      foreignKey: 'servicePackageId',
      as: 'package'
    });
  };

  return PluginPackage;
};
