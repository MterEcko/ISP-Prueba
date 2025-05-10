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
      type: Sequelize.ENUM('open', 'in_progress', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    priority: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium'
    },
    category: {
      type: Sequelize.STRING
    },
    resolvedAt: {
      type: Sequelize.DATE
    },
    closedAt: {
      type: Sequelize.DATE
    }
  });

  return Ticket;
};