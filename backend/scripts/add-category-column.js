// Script para agregar columnas a SystemPlugins
const db = require('../src/models');

async function addColumns() {
  try {
    const queryInterface = db.sequelize.getQueryInterface();

    console.log('Agregando columnas a SystemPlugins...');

    // Agregar displayName
    try {
      await queryInterface.addColumn('SystemPlugins', 'displayName', {
        type: db.Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Columna displayName agregada');
    } catch (err) {
      console.log('⚠️  displayName ya existe o error:', err.message);
    }

    // Agregar description
    try {
      await queryInterface.addColumn('SystemPlugins', 'description', {
        type: db.Sequelize.TEXT,
        allowNull: true
      });
      console.log('✅ Columna description agregada');
    } catch (err) {
      console.log('⚠️  description ya existe o error:', err.message);
    }

    // Agregar category
    try {
      await queryInterface.addColumn('SystemPlugins', 'category', {
        type: db.Sequelize.STRING,
        allowNull: true,
        defaultValue: 'other'
      });
      console.log('✅ Columna category agregada');
    } catch (err) {
      console.log('⚠️  category ya existe o error:', err.message);
    }

    // Actualizar categorías de plugins existentes
    await db.sequelize.query(`
      UPDATE "SystemPlugins" SET category = 'payment' WHERE name IN ('mercadopago', 'openpay', 'paypal', 'stripe');
    `);
    await db.sequelize.query(`
      UPDATE "SystemPlugins" SET category = 'communication' WHERE name IN ('email', 'telegram', 'whatsapp');
    `);
    await db.sequelize.query(`
      UPDATE "SystemPlugins" SET category = 'automation' WHERE name = 'n8n';
    `);
    await db.sequelize.query(`
      UPDATE "SystemPlugins" SET category = 'other' WHERE category IS NULL;
    `);

    console.log('✅ Categorías actualizadas');
    console.log('✅ Migración completada');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

addColumns();
