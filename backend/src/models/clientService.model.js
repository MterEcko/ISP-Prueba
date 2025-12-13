// backend/src/models/clientService.model.js
const { DataTypes } = require('sequelize');

/**
 * ClientService - Servicios independientes asignados a clientes
 * Permite contratar servicios de plugins (Jellyfin, Gaming, etc.) sin necesidad de paquete de internet
 */
module.exports = (sequelize) => {
  const ClientService = sequelize.define('ClientService', {
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
      },
      onDelete: 'CASCADE'
    },
    // Identificador del plugin (ej: 'jellyfin', 'n8n', 'gaming-pro')
    pluginName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Nombre del servicio para mostrar al cliente
    serviceName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del servicio (ej: "Streaming Premium", "Gaming Pro")'
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Descripción del servicio'
    },
    // Tipo de servicio para reportes (ej: 'entertainment', 'security', 'utility')
    serviceType: {
      type: DataTypes.STRING,
      defaultValue: 'other'
    },
    // ID interno del plugin (ej: el ID de usuario en Jellyfin)
    referenceId: {
      type: DataTypes.STRING,
      comment: 'ID en el sistema externo del plugin'
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled', 'pending'),
      defaultValue: 'pending'
    },
    // ✅ Configuración específica del servicio basada en el plugin
    serviceConfig: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Configuración del servicio: { maxDevices: 2, quality: "HD", libraries: ["Movies"] }'
    },
    // ✅ Precios y facturación
    monthlyFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Tarifa mensual del servicio'
    },
    setupFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Tarifa única de instalación/activación'
    },
    billingCycle: {
      type: DataTypes.ENUM('monthly', 'weekly', 'yearly'),
      defaultValue: 'monthly'
    },
    // ✅ Fechas importantes
    activatedAt: {
      type: DataTypes.DATE,
      comment: 'Fecha de activación del servicio'
    },
    nextBillingDate: {
      type: DataTypes.DATE,
      comment: 'Próxima fecha de facturación'
    },
    lastBilledAt: {
      type: DataTypes.DATE,
      comment: 'Última vez que se facturó'
    },
    // Datos visuales (Caché) para que el Core pueda pintar la lista sin llamar al plugin
    // Ej: { "label": "IP Dedicada Gamer", "price": 200, "icon": "🎮" }
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Metadatos del plugin para display'
    },
    // Notas internas
    notes: {
      type: DataTypes.TEXT,
      comment: 'Notas internas sobre el servicio'
    }
  }, {
    tableName: 'ClientServices',
    timestamps: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['pluginName', 'referenceId'] },
      { fields: ['status'] },
      { fields: ['nextBillingDate'] }
    ]
  });

  return ClientService;
};