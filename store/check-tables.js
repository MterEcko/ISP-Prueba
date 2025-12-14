/**
 * Script para verificar las tablas de la base de datos
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || './database.sqlite',
  logging: false
});

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name;
    `);

    console.log('📋 Tablas encontradas:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });

    // Verificar estructura de la tabla de licencias
    console.log('\n📊 Buscando tabla de Licencias...\n');

    const licenseTable = tables.find(t =>
      t.name.toLowerCase().includes('license') ||
      t.name.toLowerCase().includes('licencia')
    );

    if (licenseTable) {
      console.log(`✅ Tabla encontrada: ${licenseTable.name}\n`);

      const [columns] = await sequelize.query(`PRAGMA table_info(${licenseTable.name});`);

      console.log(`📋 Columnas de la tabla ${licenseTable.name}:`);
      columns.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
      });

      const hasServicePackageId = columns.some(col => col.name === 'servicePackageId');

      if (hasServicePackageId) {
        console.log('\n✅ La columna servicePackageId ya existe');
      } else {
        console.log('\n⚠️ La columna servicePackageId NO existe');
        console.log(`\nPara agregarla, ejecuta:`);
        console.log(`ALTER TABLE ${licenseTable.name} ADD COLUMN servicePackageId TEXT;`);
      }
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkTables();
