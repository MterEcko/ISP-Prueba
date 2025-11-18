// backend/src/models/systemConfiguration.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemConfiguration = sequelize.define('SystemConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    configKey: {
      type: DataTypes.STRING,
      //allowNull: false
      //comment: 'telegramBotToken, smtpHost, etc.'
    },
    configValue: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    configType: {
      type: DataTypes.ENUM('string', 'json', 'encrypted'),
      defaultValue: 'string'
    },
    module: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'telegram, email, payments'
    },
    description: {
      type: DataTypes.STRING
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'SystemConfigurations',
    timestamps: true
  });

  return SystemConfiguration;
};
