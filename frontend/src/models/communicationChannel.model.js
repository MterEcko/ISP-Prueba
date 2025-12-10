// backend/src/models/communicationChannel.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunicationChannel = sequelize.define('CommunicationChannel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Email, WhatsApp, Telegram, SMS'
    },
    channelType: {
      type: DataTypes.ENUM('email', 'whatsapp', 'telegram', 'sms'),
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    configuration: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'API settings'
    }
  }, {
    tableName: 'CommunicationChannels',
    timestamps: true
  });

  return CommunicationChannel;
};