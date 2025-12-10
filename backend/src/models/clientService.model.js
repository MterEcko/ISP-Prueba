// backend/src/models/clientService.model.js
const { DataTypes } = require('sequelize');

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
        model: 'Clients', // Asegúrate que el nombre de tu tabla de clientes sea 'Clients'
        key: 'id'
      }
    },
    // Identificador del plugin (ej: 'gaming-pro', 'iot-home')
    pluginName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Tipo de servicio para reportes (ej: 'entertainment', 'security', 'utility')
    serviceType: {
      type: DataTypes.STRING,
      defaultValue: 'other'
    },
    // ID interno que solo el plugin entiende (ej: el ID de la cámara en el sistema de IoT)
    referenceId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'cancelled', 'pending'),
      defaultValue: 'pending'
    },
    // Datos visuales (Caché) para que el Core pueda pintar la lista sin llamar al plugin
    // Ej: { "label": "IP Dedicada Gamer", "price": 200, "icon": "🎮" }
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'ClientServices',
    timestamps: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['pluginName', 'referenceId'] }
    ]
  });

  return ClientService;
};