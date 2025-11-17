module.exports = (sequelize, DataTypes) => {
  const N8nWorkflow = sequelize.define('N8nWorkflow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Información básica
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // ID del workflow en n8n
    n8nWorkflowId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },

    // Trigger type
    triggerType: {
      type: DataTypes.ENUM(
        'webhook',
        'client_created',
        'client_updated',
        'ticket_created',
        'ticket_updated',
        'invoice_created',
        'invoice_overdue',
        'payment_received',
        'service_activated',
        'service_suspended'
      ),
      allowNull: false
    },

    // Webhook URL (si es webhook trigger)
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Configuración del trigger
    triggerConfig: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Filtros y condiciones del trigger'
    },

    // Estado
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Estadísticas
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Configuración adicional
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    }
  }, {
    tableName: 'n8n_workflows',
    timestamps: true,
    indexes: [
      { fields: ['n8nWorkflowId'], unique: true },
      { fields: ['triggerType'] },
      { fields: ['isActive'] }
    ]
  });

  return N8nWorkflow;
};
