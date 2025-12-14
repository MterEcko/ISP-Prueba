/**
 * Migración: Agregar columna servicePackageId a la tabla Licenses
 *
 * Ejecutar con: node migrate-add-servicepackageid.js
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Configurar conexión a la base de datos
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: console.log
});

async function migrate() {
  try {
    console.log('🔧 Iniciando migración...');

    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida');

    const queryInterface = sequelize.getQueryInterface();

    // Intentar agregar la columna directamente (si ya existe, fallará pero lo manejamos)
    console.log('➕ Agregando columna servicePackageId a la tabla Licenses...');

    try {
      await sequelize.query(`
        ALTER TABLE Licenses
        ADD COLUMN servicePackageId TEXT
        REFERENCES ServicePackages(id);
      `);
      console.log('✅ Columna agregada exitosamente');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ La columna servicePackageId ya existe en la tabla Licenses');
      } else {
        throw error;
      }
    }

    console.log('✅ Migración completada exitosamente');
    console.log('');
    console.log('📋 Siguiente paso:');
    console.log('   Reinicia el servidor del Store para que los cambios surtan efecto');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    console.error('Error details:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
