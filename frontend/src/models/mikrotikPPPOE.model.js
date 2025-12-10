// backend/src/models/mikrotikPPPOE.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MikrotikPPPOE = sequelize.define('MikrotikPPPOE', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    mikrotikRouterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MikrotikRouters',
        key: 'id'
      },
      comment: 'Router Mikrotik donde está configurado el usuario PPPoE'
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id'
      },
      comment: 'Suscripción específica del cliente (si tiene múltiples servicios)'
    },
    username: {
      type: DataTypes.STRING,
      //allowNull: false
      //comment: 'Username PPPoE - SINCRONIZABLE'
    },
    passwordEncrypted: {
      type: DataTypes.STRING,
      allowNull: false
    },
    
    // ✅ CAMBIO IMPORTANTE: Usar IDs en lugar de nombres
    profileId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID del perfil en RouterOS (ej: *1, *2) - INMUTABLE'
    },
    currentProfileName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre actual del perfil (puede cambiar) - SINCRONIZABLE'
    },
    
    poolId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del pool en RouterOS (ej: *5, *6) - INMUTABLE'
    },
    currentPoolName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre actual del pool (puede cambiar) - SINCRONIZABLE'
    },
    
    staticIp: {
      type: DataTypes.STRING,
      comment: 'IP estática asignada (opcional)'
    },
    mikrotikUserId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID del usuario PPPoE en RouterOS (/ppp/secret) - INMUTABLE'
    },
    
    // Estados y métricas
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'disabled'),
      defaultValue: 'active'
    },
    lastConnected: {
      type: DataTypes.DATE
    },
    lastDisconnected: {
      type: DataTypes.DATE
    },
    uptime: {
      type: DataTypes.STRING
    },
    bytesIn: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    bytesOut: {
      type: DataTypes.BIGINT,
      defaultValue: 0
    },
    lastSyncWithMikrotik: {
      type: DataTypes.DATE,
      comment: 'Última sincronización para actualizar nombres/estado'
    }
  }, {
    tableName: 'MikrotikPPPOEs',
    timestamps: true,
    indexes: [
      {
        // Índice único: un router no puede tener el mismo mikrotikUserId duplicado
        unique: true,
        fields: ['mikrotikRouterId', 'mikrotikUserId'],
        name: 'unique_router_user_id'
      },
      {
        fields: ['clientId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['profileId']
      },
      {
        fields: ['poolId']
      },
      {
        fields: ['lastSyncWithMikrotik']
      }
    ]
  });

  return MikrotikPPPOE;
};