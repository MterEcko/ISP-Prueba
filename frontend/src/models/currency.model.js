const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Currency = sequelize.define('Currency', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.STRING(3),
      allowNull: false,
      comment: 'Código ISO de la moneda (MXN, CLP, USD, EUR, etc.)'
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre de la moneda (Peso Mexicano, Peso Chileno, etc.)'
    },
    symbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Símbolo de la moneda ($, €, £, etc.)'
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'País de la moneda'
    },
    isBaseCurrency: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Si es la moneda base del sistema'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si la moneda está activa para usar'
    },
    decimalPlaces: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: 'Número de decimales para esta moneda'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notas adicionales sobre la moneda'
    }
  }, {
    tableName: 'Currencies',
    timestamps: true,
    indexes: [
      {
        fields: ['code']
      },
      {
        fields: ['isBaseCurrency']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return Currency;
};
