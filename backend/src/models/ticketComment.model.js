module.exports = (sequelize, Sequelize) => {
  const TicketComment = sequelize.define("TicketComment", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    isInternal: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  });

  return TicketComment;
};