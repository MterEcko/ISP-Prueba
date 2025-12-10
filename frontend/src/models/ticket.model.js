// backend/src/models/ticket.model.js - VERSIÓN ACTUALIZADA
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Ticket = sequelize.define("Ticket", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('open', 'inProgress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    category: {
      type: Sequelize.STRING
    },
    
    // Relaciones
    ticketTypeId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'TicketTypes',
        key: 'id'
      },
      comment: 'Referencia al tipo de ticket'
    },
    clientId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Clients',
        key: 'id'
      }
    },
    assignedToId: {
      type: Sequelize.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    createdById: {
      type: Sequelize.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    
    // Programación
    scheduledDate: {
      type: Sequelize.DATEONLY,
      comment: 'Fecha programada para la visita'
    },
    scheduledTime: {
      type: Sequelize.TIME,
      comment: 'Hora programada para la visita'
    },
    
    // Resolución
    resolutionNotes: {
      type: Sequelize.TEXT,
      comment: 'Notas de resolución del técnico'
    },
    resolvedAt: {
      type: Sequelize.DATE
    },
    closedAt: {
      type: Sequelize.DATE
    },
    
    // Costos
    estimatedCost: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Costo estimado de la reparación/instalación'
    },
    actualCost: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Costo real final'
    }
  }, {
    tableName: 'Tickets',
    timestamps: true
  });

  return Ticket;
};
