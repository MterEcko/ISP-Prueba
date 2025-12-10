const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JellyfinAccount = sequelize.define('JellyfinAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "ID del cliente en el Core"
    },
    // ID del usuario en el servidor Jellyfin (Hash)
    jellyfinUserId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Lógica de Negocio Híbrida
    hostingType: {
      type: DataTypes.ENUM('local', 'cloud'),
      defaultValue: 'local'
    },
    isFreeTier: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "True: Incluido en paquete de internet (Sin cobro extra)"
    },
    enableAds: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Para tu App personalizada: ¿Mostrar anuncios?"
    },
    maxScreens: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'Plugin_JellyfinAccounts', // Prefijo para no mezclar con Core
    timestamps: true
  });

  return JellyfinAccount;
};