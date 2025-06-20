// backend/src/models/ticketComment.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const TicketComment = sequelize.define("TicketComment", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticketId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id'
      }
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    isInternal: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'TicketComments',
    timestamps: true
  });

  return TicketComment;
};
