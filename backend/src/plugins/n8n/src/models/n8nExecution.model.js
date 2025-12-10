const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const N8nExecution = sequelize.define('N8nExecution', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    workflowId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID del workflow local"
    },
    n8nExecutionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "ID de la ejecución en n8n"
    },
    n8nWorkflowId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID del workflow en n8n"
    },
    mode: {
      type: DataTypes.ENUM('manual', 'trigger', 'webhook', 'retry'),
      defaultValue: 'manual',
      comment: "Modo de ejecución"
    },
    status: {
      type: DataTypes.ENUM('running', 'success', 'error', 'waiting', 'cancelled'),
      defaultValue: 'running',
      comment: "Estado de la ejecución"
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Fecha de inicio"
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Fecha de finalización"
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duración en milisegundos"
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos de entrada"
    },
    resultData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos de salida"
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Mensaje de error si falló"
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Stack trace del error"
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Metadatos adicionales"
    }
  }, {
    tableName: 'Plugin_N8nExecutions',
    timestamps: true
  });

  N8nExecution.associate = (models) => {
    N8nExecution.belongsTo(models.N8nWorkflow, {
      foreignKey: 'workflowId',
      as: 'workflow'
    });
  };

  return N8nExecution;
};
