// backend/src/models/pluginAuditLog.model.js
module.exports = (sequelize, DataTypes) => {
  const PluginAuditLog = sequelize.define('PluginAuditLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // Identificador del plugin afectado
    pluginId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'SystemPlugins',
        key: 'id'
      }
    },
    pluginName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    // Tipo de acción realizada
    action: {
      type: DataTypes.ENUM(
        'PLUGIN_CREATED',
        'PLUGIN_UPDATED',
        'PLUGIN_DELETED',
        'PLUGIN_ACTIVATED',
        'PLUGIN_DEACTIVATED',
        'PLUGIN_RELOADED',
        'CONFIG_UPDATED',
        'CONFIG_VIEWED',
        'PLUGIN_INSTALLED',
        'PLUGIN_UNINSTALLED',
        'VALIDATION_FAILED',
        'SECURITY_ALERT',
        'ERROR'
      ),
      allowNull: false
    },
    // Usuario que realizó la acción
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // Nivel de severidad
    severity: {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
      defaultValue: 'INFO',
      allowNull: false
    },
    // Descripción de la acción
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Detalles adicionales en JSON
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('details');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('details', value ? JSON.stringify(value) : null);
      }
    },
    // IP del cliente
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    // User agent
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Estado anterior (para cambios)
    previousState: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('previousState');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('previousState', value ? JSON.stringify(value) : null);
      }
    },
    // Estado nuevo (para cambios)
    newState: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('newState');
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue('newState', value ? JSON.stringify(value) : null);
      }
    },
    // Éxito o fallo
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    // Mensaje de error si falló
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Stack trace si es error
    stackTrace: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Duración de la operación en ms
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duración en milisegundos'
    }
  }, {
    tableName: 'plugin_audit_logs',
    timestamps: true,
    createdAt: 'timestamp',
    updatedAt: false,
    indexes: [
      {
        fields: ['pluginId']
      },
      {
        fields: ['pluginName']
      },
      {
        fields: ['action']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['success']
      }
    ]
  });

  return PluginAuditLog;
};
