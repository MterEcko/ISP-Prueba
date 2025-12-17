/**
 * Script para limpiar tablas problemáticas en la base de datos
 * Esto permite que Sequelize las recree con la estructura correcta
 *
 * ADVERTENCIA: Esto eliminará datos de las tablas afectadas
 *
 * Ejecutar con: node reset-tables.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: console.log
});

async function resetTables() {
  try {
    console.log('🔧 Iniciando limpieza de tablas...\n');

    await sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Lista de tablas que pueden tener problemas con alter
    const problematicTables = [
      'PluginPackages',
      'Licenses',
      'ServicePackages',
      'Customers'
    ];

    console.log('⚠️  Se eliminarán las siguientes tablas para recrearlas correctamente:');
    problematicTables.forEach(table => console.log(`   - ${table}`));
    console.log('');

    // Eliminar tablas problemáticas
    for (const table of problematicTables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${table};`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.log(`⚠️  No se pudo eliminar ${table} (puede que no exista)`);
      }
    }

    console.log('\n✅ Limpieza completada');
    console.log('\n📋 Siguiente paso:');
    console.log('   1. Reinicia el servidor del Store');
    console.log('   2. Sequelize creará las tablas con la estructura correcta');
    console.log('   3. Las tablas estarán vacías - necesitarás crear nuevos paquetes y clientes\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    console.error('Detalles:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

// Ejecutar
resetTables();
