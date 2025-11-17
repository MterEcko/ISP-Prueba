const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CalendarEvent = sequelize.define('CalendarEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    allDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    location: {
      type: DataTypes.STRING
    },
    eventType: {
      type: DataTypes.ENUM('meeting', 'task', 'reminder', 'installation', 'maintenance', 'call', 'other'),
      defaultValue: 'other'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
      defaultValue: 'pending'
    },
    color: {
      type: DataTypes.STRING,
      defaultValue: '#3498db'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Usuario que creó el evento'
    },
    assignedTo: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de IDs de usuarios asignados'
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Cliente relacionado (si aplica)'
    },
    installationId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Instalación relacionada (si aplica)'
    },
    // Integración con Google Calendar
    googleEventId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      comment: 'ID del evento en Google Calendar'
    },
    googleCalendarId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del calendario en Google'
    },
    // Integración con Microsoft Calendar
    microsoftEventId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      comment: 'ID del evento en Microsoft Calendar'
    },
    microsoftCalendarId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID del calendario en Microsoft'
    },
    syncedWith: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de servicios con los que está sincronizado: ["google", "microsoft"]'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recurrence: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Reglas de recurrencia: {type: "daily|weekly|monthly", interval: 1, endDate: null}'
    },
    reminders: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de recordatorios: [{minutes: 15, method: "notification"}]'
    },
    attachments: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array de archivos adjuntos'
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'CalendarEvents',
    timestamps: true,
    indexes: [
      { fields: ['startDate'] },
      { fields: ['endDate'] },
      { fields: ['createdBy'] },
      { fields: ['status'] },
      { fields: ['eventType'] },
      { fields: ['googleEventId'] },
      { fields: ['microsoftEventId'] }
    ]
  });

  CalendarEvent.associate = (models) => {
    // Relación con usuario creador
    CalendarEvent.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    // Relación con cliente (si existe)
    if (models.Client) {
      CalendarEvent.belongsTo(models.Client, {
        foreignKey: 'clientId',
        as: 'client'
      });
    }
  };

  return CalendarEvent;
};
