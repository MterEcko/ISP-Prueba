module.exports = (sequelize, Sequelize) => {
  const Device = sequelize.define("Device", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('router', 'switch', 'antenna', 'cpe', 'other'),
      allowNull: false
    },
    brand: {
      type: Sequelize.ENUM('mikrotik', 'ubiquiti', 'cambium', 'tplink', 'other'),
      allowNull: false
    },
    model: {
      type: Sequelize.STRING
    },
    ipAddress: {
      type: Sequelize.STRING
    },
    macAddress: {
      type: Sequelize.STRING
    },
    username: {
      type: Sequelize.STRING
    },
    password: {
      type: Sequelize.STRING
    },
    apiKey: {
      type: Sequelize.STRING
    },
    apiPort: {
      type: Sequelize.INTEGER,
      defaultValue: 8728
    },
    status: {
      type: Sequelize.ENUM('online', 'offline', 'maintenance', 'unknown'),
      defaultValue: 'unknown'
    },
    lastSeen: {
      type: Sequelize.DATE
    },
    location: {
      type: Sequelize.STRING
    },
    latitude: {
      type: Sequelize.FLOAT
    },
    longitude: {
      type: Sequelize.FLOAT
    },
    notes: {
      type: Sequelize.TEXT
    }
  });

  return Device;
};