/**
 * Script para agregar columnas faltantes a la tabla SystemLicenses
 */

const db = require('./src/models');

async function fixSystemLicenses() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    console.log('🔧 Agregando columnas faltantes a SystemLicenses...\n');

    // Definir las columnas que faltan y sus definiciones SQL
    const columnsToAdd = [
      { name: 'hardwareId', sql: 'ALTER TABLE SystemLicenses ADD COLUMN hardwareId VARCHAR(64);' },
      { name: 'userLimit', sql: 'ALTER TABLE SystemLicenses ADD COLUMN userLimit INTEGER DEFAULT 5;' },
      { name: 'pluginLimit', sql: 'ALTER TABLE SystemLicenses ADD COLUMN pluginLimit INTEGER DEFAULT 3;' },
      { name: 'includedPlugins', sql: 'ALTER TABLE SystemLicenses ADD COLUMN includedPlugins JSON DEFAULT \'[]\';' },
      { name: 'activatedAt', sql: 'ALTER TABLE SystemLicenses ADD COLUMN activatedAt DATETIME;' },
      { name: 'lastValidated', sql: 'ALTER TABLE SystemLicenses ADD COLUMN lastValidated DATETIME;' }
    ];

    // Verificar columnas existentes
    const [columns] = await db.sequelize.query(`PRAGMA table_info(SystemLicenses);`);
    const existingColumns = columns.map(c => c.name);

    for (const col of columnsToAdd) {
      if (existingColumns.includes(col.name)) {
        console.log(`  ⏭️  ${col.name} - Ya existe`);
      } else {
        try {
          await db.sequelize.query(col.sql);
          console.log(`  ✅ ${col.name} - Agregada`);
        } catch (error) {
          if (error.message.includes('duplicate column name')) {
            console.log(`  ⏭️  ${col.name} - Ya existe`);
          } else {
            console.log(`  ❌ ${col.name} - Error: ${error.message}`);
          }
        }
      }
    }

    console.log('\n✅ Migración completada');
    console.log('\n📋 Siguiente paso:');
    console.log('   Reinicia el backend del ISP para que use el modelo actualizado\n');

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

fixSystemLicenses();
