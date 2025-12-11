'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar nuevo tipo de plan
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_SystemLicenses_planType" ADD VALUE IF NOT EXISTS 'full_access';
    `).catch(() => {
      // Si falla es porque ya existe o no se puede agregar, ignorar
      console.log('ℹ️  enum full_access ya existe o no se pudo agregar');
    });

    // Agregar hardwareId
    await queryInterface.addColumn('SystemLicenses', 'hardwareId', {
      type: Sequelize.STRING(64),
      allowNull: true
    }).catch(() => console.log('hardwareId ya existe'));

    // Agregar userLimit
    await queryInterface.addColumn('SystemLicenses', 'userLimit', {
      type: Sequelize.INTEGER,
      defaultValue: 5
    }).catch(() => console.log('userLimit ya existe'));

    // Agregar pluginLimit
    await queryInterface.addColumn('SystemLicenses', 'pluginLimit', {
      type: Sequelize.INTEGER,
      defaultValue: 3
    }).catch(() => console.log('pluginLimit ya existe'));

    // Agregar includedPlugins
    await queryInterface.addColumn('SystemLicenses', 'includedPlugins', {
      type: Sequelize.JSON,
      defaultValue: []
    }).catch(() => console.log('includedPlugins ya existe'));

    // Agregar activatedAt
    await queryInterface.addColumn('SystemLicenses', 'activatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    }).catch(() => console.log('activatedAt ya existe'));

    // Agregar lastValidated
    await queryInterface.addColumn('SystemLicenses', 'lastValidated', {
      type: Sequelize.DATE,
      allowNull: true
    }).catch(() => console.log('lastValidated ya existe'));
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('SystemLicenses', 'hardwareId');
    await queryInterface.removeColumn('SystemLicenses', 'userLimit');
    await queryInterface.removeColumn('SystemLicenses', 'pluginLimit');
    await queryInterface.removeColumn('SystemLicenses', 'includedPlugins');
    await queryInterface.removeColumn('SystemLicenses', 'activatedAt');
    await queryInterface.removeColumn('SystemLicenses', 'lastValidated');
  }
};
