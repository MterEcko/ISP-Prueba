'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar columnas category, displayName y description a SystemPlugins
    await queryInterface.addColumn('SystemPlugins', 'displayName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nombre para mostrar en UI'
    });

    await queryInterface.addColumn('SystemPlugins', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Descripción del plugin'
    });

    await queryInterface.addColumn('SystemPlugins', 'category', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'other',
      comment: 'payment, communication, automation, integration, other'
    });

    // Actualizar plugins existentes con categorías apropiadas
    await queryInterface.sequelize.query(`
      UPDATE "SystemPlugins" SET category = 'payment' WHERE name IN ('mercadopago', 'openpay', 'paypal', 'stripe');
      UPDATE "SystemPlugins" SET category = 'communication' WHERE name IN ('email', 'telegram', 'whatsapp');
      UPDATE "SystemPlugins" SET category = 'automation' WHERE name = 'n8n';
      UPDATE "SystemPlugins" SET category = 'other' WHERE category IS NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('SystemPlugins', 'category');
    await queryInterface.removeColumn('SystemPlugins', 'description');
    await queryInterface.removeColumn('SystemPlugins', 'displayName');
  }
};
