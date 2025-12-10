// backend/src/models/snmpOid.model.js
module.exports = (sequelize, Sequelize) => {
  const SnmpOid = sequelize.define('SnmpOid', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    oid: {
      type: Sequelize.STRING,
      allowNull: false
    },
    dataType: {
      type: Sequelize.STRING,
      allowNull: false // INTEGER, STRING, etc.
    },
    mode: {
      type: Sequelize.ENUM('read', 'write', 'both'),
      defaultValue: 'read'
    },
    unit: {
      type: Sequelize.STRING,
      allowNull: true // bps, %, etc.
    },
    conversion: {
      type: Sequelize.STRING,
      allowNull: true // fórmula si requiere conversión
    },
    category: {
      type: Sequelize.STRING,
      allowNull: true // monitoring, system, network, etc.
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    }
  });

  return SnmpOid;
};