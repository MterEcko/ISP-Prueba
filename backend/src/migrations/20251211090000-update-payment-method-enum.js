'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Agregar nuevos valores al enum de paymentMethod
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Payments_paymentMethod"
      ADD VALUE IF NOT EXISTS 'online';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Payments_paymentMethod"
      ADD VALUE IF NOT EXISTS 'mercadopago';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Payments_paymentMethod"
      ADD VALUE IF NOT EXISTS 'openpay';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Payments_paymentMethod"
      ADD VALUE IF NOT EXISTS 'paypal';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Payments_paymentMethod"
      ADD VALUE IF NOT EXISTS 'stripe';
    `);

    console.log('✅ Enum paymentMethod actualizado con métodos de plugins');
  },

  down: async (queryInterface, Sequelize) => {
    // No se puede eliminar valores de un enum en PostgreSQL fácilmente
    // Se requeriría recrear el enum y actualizar todas las referencias
    console.log('⚠️ Revertir enum no soportado - requiere recreación manual');
  }
};
