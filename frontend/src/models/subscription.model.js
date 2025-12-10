// backend/src/models/subscription.model.js - CON GESTIÓN DE POOLS
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    servicePackageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ServicePackages',
        key: 'id'
      }
    },
    currentIpPoolId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'IpPools',
        key: 'id'
      },
      comment: 'Pool actual donde está asignado el cliente'
    },
    
    // Fechas y estado
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endDate: {
      type: DataTypes.DATEONLY
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled', 'cutService'),
      defaultValue: 'active'
    },
    
    // Configuración PPPoE CORE
    pppoeUsername: {
      type: DataTypes.STRING(255),
	  allowNull: true,
      comment: 'Usuario PPPoE único'
    },
    pppoePassword: {
      type: DataTypes.STRING,
      comment: 'Contraseña PPPoE (encriptada)'
    },
    assignedIpAddress: {
      type: DataTypes.STRING,
      comment: 'IP asignada desde el pool'
    },
    mikrotikProfileName: {
      type: DataTypes.STRING,
      comment: 'Nombre del perfil aplicado en RouterOS'
    },
    
    // Facturación
    monthlyFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    billingDay: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 31 }
    },
    lastPaymentDate: {
      type: DataTypes.DATEONLY
    },
    nextDueDate: {
      type: DataTypes.DATEONLY
    },
    graceDays: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    
    // Control técnico
    lastStatusChange: {
      type: DataTypes.DATE,
      comment: 'Última vez que cambió de pool'
    },
    autoManagement: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si se gestiona automáticamente el cambio de pools'
    },
    
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'Subscriptions',
    timestamps: true,
    hooks: {
      // Hook para cambio automático de pools
      afterUpdate: async (subscription, options) => {
        if (subscription.changed('status') && subscription.autoManagement) {
          const IpPool = sequelize.models.IpPool;
          let targetPoolType;
          
          switch (subscription.status) {
            case 'active':
              targetPoolType = 'active';
              break;
            case 'suspended':
              targetPoolType = 'suspended';
              break;
            case 'cutService':
              targetPoolType = 'cutService';
              break;
            default:
              return; // No hacer nada para otros estados
          }
          
          // Buscar pool correspondiente en la zona del cliente
          const client = await subscription.getClient();
          const targetPool = await IpPool.findOne({
            where: {
              zoneId: client.zoneId,
              poolType: targetPoolType,
              active: true
            }
          });
          
          if (targetPool && targetPool.id !== subscription.currentIpPoolId) {
            await subscription.update({
              currentIpPoolId: targetPool.id,
              lastStatusChange: new Date()
            });
            
            console.log(`Cliente ${client.id} movido a pool ${targetPoolType} (${targetPool.poolName})`);
            
            // Aquí se puede integrar con RouterOS API para mover el cliente
            // await MikrotikService.moveClientToPool(subscription.pppoeUsername, targetPool);
          }
        }
      }
    }
  });

  return Subscription;
};