const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const N8nWorkflow = sequelize.define('N8nWorkflow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    n8nWorkflowId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "ID del workflow en n8n"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Nombre del workflow"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Si el workflow está activo"
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Tags del workflow"
    },
    nodes: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Nodos del workflow"
    },
    connections: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Conexiones entre nodos"
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Configuración del workflow"
    },
    staticData: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Datos estáticos del workflow"
    },
    lastExecutedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Última vez que se ejecutó"
    },
    executionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Número total de ejecuciones"
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Metadatos adicionales"
    }
  }, {
    tableName: 'Plugin_N8nWorkflows',
    timestamps: true
  });

  return N8nWorkflow;
};
