module.exports = (sequelize, Sequelize) => {
  const ExpenseCategory = sequelize.define('ExpenseCategory', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Nombre de la categoría (ej: Nómina, Servicios, Renta)'
    },
    type: {
      type: Sequelize.ENUM('fixed', 'variable'),
      allowNull: false,
      defaultValue: 'variable',
      comment: 'Tipo de gasto: fijo o variable'
    },
    icon: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Emoji o icono para la categoría'
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descripción de la categoría'
    },
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Si la categoría está activa'
    }
  }, {
    tableName: 'expense_categories',
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['type']
      }
    ]
  });

  return ExpenseCategory;
};
