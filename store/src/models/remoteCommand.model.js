const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RemoteCommand = sequelize.define('RemoteCommand', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    installationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Installations', key: 'id' }
    },
    command: {
      type: DataTypes.ENUM('block', 'unblock', 'restart', 'update', 'message', 'collect_logs'),
      allowNull: false
    },
    parameters: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'executed', 'failed'),
      defaultValue: 'pending'
    },
    sentAt: DataTypes.DATE,
    executedAt: DataTypes.DATE,
    response: DataTypes.JSON,
    error: DataTypes.TEXT,
    issuedBy: DataTypes.STRING
  }, {
    tableName: 'RemoteCommands',
    timestamps: true
  });

  RemoteCommand.associate = (models) => {
    RemoteCommand.belongsTo(models.Installation, { foreignKey: 'installationId' });
  };

  return RemoteCommand;
};
