const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    whatsapp: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.FLOAT
    },
    longitude: {
      type: DataTypes.FLOAT
    },
    birthDate: {
      type: DataTypes.DATEONLY
    },
    startDate: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT
    },
    // Campos para integración con Mikrotik
    contractNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    mikrotikUsername: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    mikrotikProfile: {
      type: DataTypes.STRING,
      allowNull: true
    },
    deviceId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Devices',
        key: 'id'
      },
      allowNull: true
    },
    // Información del plan de servicio
    serviceType: {
      type: DataTypes.ENUM('residential', 'business', 'enterprise'),
      defaultValue: 'residential'
    },
    downloadSpeed: {
      type: DataTypes.INTEGER, // en Mbps
      allowNull: true
    },
    uploadSpeed: {
      type: DataTypes.INTEGER, // en Mbps
      allowNull: true
    },
    dataLimit: {
      type: DataTypes.INTEGER, // en GB, null para ilimitado
      allowNull: true
    }
  });

  return Client;
};