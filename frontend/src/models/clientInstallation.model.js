// backend/src/models/clientInstallation.model.js (ACTUALIZADO)
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClientInstallation = sequelize.define('ClientInstallation', {
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
    technicianId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'Técnico asignado'
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha programada para la instalación'
    },
    completedDate: {
      type: DataTypes.DATE,
      comment: 'Fecha real de instalación'
    },
    installationType: {
      type: DataTypes.ENUM('new', 'upgrade', 'migration', 'repair'),
      defaultValue: 'new'
      // Nota: Tipo de instalación
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
      defaultValue: 'scheduled'
    },
    equipment: {
      type: DataTypes.JSON,
    },
    signalStrength: {
      type: DataTypes.INTEGER,
      comment: 'Intensidad de señal (-dBm)'
    },
    photoUrl: {
      type: DataTypes.STRING,
      comment: 'URL de foto de la instalación'
    },
    notes: {
      type: DataTypes.TEXT,
      comment: 'Notas generales'
    },
    completionNotes: {
      type: DataTypes.TEXT,
      comment: 'Notas al completar la instalación'
    }
  }, {
    tableName: 'ClientInstallations',
    timestamps: true
  });

  return ClientInstallation;
};
