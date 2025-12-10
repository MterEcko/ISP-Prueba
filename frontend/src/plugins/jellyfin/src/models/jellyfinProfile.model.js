const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JellyfinProfile = sequelize.define('JellyfinProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    jellyfinAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Relación con la cuenta principal del plugin"
    },
    // ID real en Jellyfin (cada perfil es un usuario allá)
    jellyfinUserId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Nombre visible (ej: Papá, Niños)"
    },
    isKid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    pin: { // Opcional: Para proteger perfil
      type: DataTypes.STRING, 
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'Plugin_JellyfinProfiles',
    timestamps: true
  });

  return JellyfinProfile;
};