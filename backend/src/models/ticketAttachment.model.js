// backend/src/models/ticketAttachment.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketAttachment = sequelize.define('TicketAttachment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tickets',
        key: 'id'
      }
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    attachmentType: {
      type: DataTypes.ENUM('photo', 'document', 'video'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'TicketAttachments',
    timestamps: true
  });

  return TicketAttachment;
};
