
// isp-system/backend/src/models/pluginLicense.model.js
module.exports = (sequelize, Sequelize) => {
  const PluginLicense = sequelize.define('plugin_license', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    plugin_id: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'ID del plugin (ej: email-advanced)'
    },
    license_key: {
      type: Sequelize.STRING(50),
      unique: true,
      allowNull: false,
      comment: 'License key del plugin'
    },
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'expired', 'suspended'),
      defaultValue: 'active',
      comment: 'Estado de la licencia'
    },
    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha de expiración (NULL = lifetime)'
    },
    activated_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Fecha de activación'
    },
    last_used: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Última vez que se usó el plugin'
    },
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'Metadata adicional'
    }
  }, {
    tableName: 'plugin_licenses',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_plugin_licenses_plugin_id',
        fields: ['plugin_id']
      },
      {
        name: 'idx_plugin_licenses_license_key',
        fields: ['license_key']
      },
      {
        name: 'idx_plugin_licenses_status',
        fields: ['status']
      }
    ]
  });
// Métodos de instancia
PluginLicense.prototype.isExpired = function() {
if (!this.expires_at) return false;
return new Date(this.expires_at) < new Date();
};
PluginLicense.prototype.isActive = function() {
return this.status === 'active' && !this.isExpired();
};
PluginLicense.prototype.daysRemaining = function() {
if (!this.expires_at) return null;
const diff = new Date(this.expires_at) - new Date();
return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
return PluginLicense;
};