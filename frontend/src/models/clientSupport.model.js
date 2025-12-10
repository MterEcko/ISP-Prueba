// backend/src/models/clientSupport.model.js (ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientSupport = sequelize.define('ClientSupport', {
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
    ticketId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Tickets',
        key: 'id'
      },
      comment: 'Ticket relacionado (opcional)'
    },
    supportType: {
      type: DataTypes.ENUM('technical', 'billing', 'sales', 'general'),
      allowNull: false,
      // Nota: Tipo de soporte
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: 'general',
      comment: 'Categoría del problema'
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Descripción del problema o consulta'
    },
    handledBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que atendió el soporte'
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    resolution: {
      type: DataTypes.TEXT,
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Usuario que resolvió el caso'
    },
    resolvedDate: {
      type: DataTypes.DATE,
      comment: 'Fecha de resolución'
    },
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Requiere seguimiento'
    },
    followUpDate: {
      type: DataTypes.DATE,
      comment: 'Fecha para seguimiento'
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5
      },
      comment: 'Calificación del cliente (1-5)'
    }
  }, {
    tableName: 'ClientSupports',
    timestamps: true
  });

  return ClientSupport;
};
