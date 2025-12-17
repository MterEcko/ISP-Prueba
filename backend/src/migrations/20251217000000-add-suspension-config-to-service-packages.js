'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear el enum para suspensionAction
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_ServicePackages_suspensionAction') THEN
          CREATE TYPE "enum_ServicePackages_suspensionAction" AS ENUM('disable', 'move_pool');
        END IF;
      END$$;
    `);

    // 2. Agregar columna suspensionAction
    await queryInterface.addColumn('ServicePackages', 'suspensionAction', {
      type: Sequelize.ENUM('disable', 'move_pool'),
      defaultValue: 'disable',
      allowNull: false,
      comment: 'Acción al suspender: disable = desactivar usuario, move_pool = mover a pool de suspendidos'
    }).catch(() => console.log('suspensionAction ya existe'));

    // 3. Agregar columna suspendedPoolName
    await queryInterface.addColumn('ServicePackages', 'suspendedPoolName', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Nombre del pool al que mover usuarios suspendidos (solo si suspensionAction = move_pool)'
    }).catch(() => console.log('suspendedPoolName ya existe'));

    console.log('✅ Campos de configuración de suspensión agregados a ServicePackages');
  },

  down: async (queryInterface, Sequelize) => {
    // Eliminar columnas
    await queryInterface.removeColumn('ServicePackages', 'suspensionAction');
    await queryInterface.removeColumn('ServicePackages', 'suspendedPoolName');

    // Eliminar enum
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_ServicePackages_suspensionAction";
    `);

    console.log('✅ Campos de configuración de suspensión eliminados de ServicePackages');
  }
};
