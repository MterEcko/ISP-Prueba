const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Installation = sequelize.define('Installation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    // Identificación
    installationKey: {
      type: DataTypes.STRING,
      // unique removido - se define como índice único abajo para evitar bug de Sequelize
      allowNull: false,
      comment: 'Clave única de instalación generada al instalar el software'
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    contactPhone: {
      type: DataTypes.STRING
    },

    // Hardware ID
    hardwareId: {
      type: DataTypes.STRING,
      // unique removido - se define como índice único abajo para evitar bug de Sequelize
      allowNull: false,
      comment: 'ID único del hardware donde está instalado'
    },

    // Database ID (anti-piratería)
    databaseId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID único de la base de datos para detectar clonación'
    },

    // Información del sistema
    systemInfo: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Información del sistema operativo, arquitectura, etc'
    },

    // Versión del software
    softwareVersion: {
      type: DataTypes.STRING,
      comment: 'Versión de ISP-Prueba instalada'
    },

    // Estado
    status: {
      type: DataTypes.ENUM('active', 'blocked', 'suspended', 'inactive'),
      defaultValue: 'active'
    },
    blockedReason: {
      type: DataTypes.TEXT,
      comment: 'Razón del bloqueo si status es blocked'
    },
    blockedAt: {
      type: DataTypes.DATE
    },

    // Licencia activa
    currentLicenseId: {
      type: DataTypes.UUID,
      references: {
        model: 'Licenses',
        key: 'id'
      }
    },

    // Telemetría
    lastHeartbeat: {
      type: DataTypes.DATE,
      comment: 'Última vez que la instalación envió un heartbeat'
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    // Ubicación actual
    currentLatitude: {
      type: DataTypes.DECIMAL(10, 8)
    },
    currentLongitude: {
      type: DataTypes.DECIMAL(11, 8)
    },
    currentCountry: {
      type: DataTypes.STRING
    },
    currentCity: {
      type: DataTypes.STRING
    },

    // Estadísticas
    totalClients: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalUsers: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'Installations',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['installationKey'], name: 'unique_installation_key' },
      { unique: true, fields: ['hardwareId'], name: 'unique_hardware_id' },
      { fields: ['status'] },
      { fields: ['currentLicenseId'] },
      { fields: ['isOnline'] }
    ]
  });

  Installation.associate = (models) => {
    Installation.belongsTo(models.License, {
      foreignKey: 'currentLicenseId',
      as: 'currentLicense'
    });

    Installation.hasMany(models.TelemetryData, {
      foreignKey: 'installationId',
      as: 'telemetryData'
    });

    Installation.hasMany(models.InstallationMetrics, {
      foreignKey: 'installationId',
      as: 'metrics'
    });

    Installation.hasMany(models.InstallationLocation, {
      foreignKey: 'installationId',
      as: 'locationHistory'
    });

    Installation.hasMany(models.RemoteCommand, {
      foreignKey: 'installationId',
      as: 'remoteCommands'
    });
  };

  return Installation;
};
