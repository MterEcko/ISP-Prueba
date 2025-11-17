const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CalendarIntegration = sequelize.define('CalendarIntegration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: false
    },
    provider: {
      type: DataTypes.ENUM('google', 'microsoft'),
      allowNull: false
    },
    providerUserId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del usuario en el proveedor'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Token de acceso (encriptado en producción)'
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Token de refresco para renovar acceso'
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scope: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Permisos otorgados'
    },
    defaultCalendarId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del calendario por defecto'
    },
    calendars: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Lista de calendarios disponibles'
    },
    syncEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    syncDirection: {
      type: DataTypes.ENUM('bidirectional', 'from_provider', 'to_provider'),
      defaultValue: 'bidirectional',
      comment: 'Dirección de sincronización'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    syncErrors: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Log de errores de sincronización'
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Configuraciones adicionales'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'CalendarIntegrations',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['provider'] },
      { fields: ['email'] },
      {
        unique: true,
        fields: ['userId', 'provider', 'email'],
        name: 'unique_user_provider_email'
      }
    ]
  });

  CalendarIntegration.associate = (models) => {
    CalendarIntegration.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return CalendarIntegration;
};
