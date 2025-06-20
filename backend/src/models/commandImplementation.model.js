// backend/src/models/commandImplementation.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const CommandImplementation = sequelize.define('CommandImplementation', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    commonCommandId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'CommonCommands',
        key: 'id'
      }
    },
    brandId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'DeviceBrands',
        key: 'id'
      }
    },
    familyId: {
      type: Sequelize.INTEGER,
      allowNull: true, // NULL para toda la marca
      references: {
        model: 'DeviceFamilies',
        key: 'id'
      }
    },
    type: {
      type: Sequelize.ENUM('SSH', 'SNMP', 'API'),
      allowNull: false
    },
    implementation: {
      type: Sequelize.TEXT,
      allowNull: false // Comando/OID/Endpoint
    },
    parameterConfig: {
      type: Sequelize.JSON,
      defaultValue: {} // Formato JSON para parámetros
    },
    script: {
      type: Sequelize.TEXT,
      allowNull: true // Script completo si es complejo
    },
    expectedResponse: {
      type: Sequelize.TEXT,
      allowNull: true // Patrón para validar respuesta
    },
    errorHandling: {
      type: Sequelize.JSON,
      defaultValue: {} // JSON para manejar errores
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'CommandImplementations',
    timestamps: true
  });

  return CommandImplementation;
};
