// backend/src/models/clientDocument.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientDocument = sequelize.define('ClientDocument', {
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
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    uploadDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'ClientDocuments',
    timestamps: true
  });

  return ClientDocument;
};