// backend/src/models/ipPool.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IpPool = sequelize.define('IpPool', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    zoneId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Zones',
        key: 'id'
      },
      comment: 'Pools organizados por zona'
    },
    mikrotikRouterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'MikrotikRouters',
        key: 'id'
      }
    },
    
    // ✅ CAMBIO IMPORTANTE: Agregar poolId de RouterOS
    poolId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'ID del pool en RouterOS (ej: *1, *2, *3) - INMUTABLE'
    },
    poolName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre actual del pool en RouterOS (puede cambiar) - SINCRONIZABLE'
    },
    
    networkAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '192.168.100.0/24'
    },
    startIp: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '192.168.100.10'
    },
    endIp: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '192.168.100.250'
    },
    gateway: {
      type: DataTypes.STRING
    },
    dnsPrimary: {
      type: DataTypes.STRING
    },
    dnsSecondary: {
      type: DataTypes.STRING
    },
    poolType: {
      type: DataTypes.ENUM('active', 'suspended', 'cutService')
      //allowNull: false,
      //comment: 'Tipo de pool para gestión automática de cortes'
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    
    // Sincronización con RouterOS
    ranges: {
      type: DataTypes.STRING,
      comment: 'Rangos del pool tal como están en RouterOS (para sincronización)'
    },
    lastSyncWithMikrotik: {
      type: DataTypes.DATE,
      comment: 'Última sincronización para actualizar nombre/configuración'
    }
  }, {
    tableName: 'IpPools',
    timestamps: true,
    indexes: [
      {
        // Índice único: un router no puede tener el mismo poolId duplicado
        unique: true,
        fields: ['mikrotikRouterId', 'poolId'],
        name: 'unique_router_pool_id'
      },
      {
        fields: ['zoneId']
      },
      {
        fields: ['poolType']
      },
      {
        fields: ['lastSyncWithMikrotik']
      }
    ]
  });

  return IpPool;
};