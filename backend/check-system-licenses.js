/**
 * Script para verificar la estructura de la tabla SystemLicenses
 */

const db = require('./src/models');

async function checkSystemLicenses() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión establecida\n');

    // Verificar si la tabla existe
    const [tables] = await db.sequelize.query(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='SystemLicenses';
    `);

    if (tables.length === 0) {
      console.log('❌ La tabla SystemLicenses NO EXISTE');
      console.log('\n💡 Solución: Ejecuta el sync de Sequelize o crea la tabla manualmente\n');
      process.exit(1);
    }

    console.log('✅ Tabla SystemLicenses encontrada\n');

    // Mostrar estructura de la tabla
    const [columns] = await db.sequelize.query(`PRAGMA table_info(SystemLicenses);`);

    console.log('📋 Columnas de la tabla SystemLicenses:');
    console.log('─'.repeat(60));
    columns.forEach(col => {
      console.log(`  ${col.name.padEnd(20)} | ${col.type.padEnd(15)} | ${col.notnull ? 'NOT NULL' : 'NULL'}`);
    });
    console.log('─'.repeat(60));

    // Verificar columnas específicas
    const columnNames = columns.map(c => c.name);

    console.log('\n🔍 Verificación de columnas críticas:');

    const checks = [
      { camel: 'licenseKey', snake: 'license_key' },
      { camel: 'hardwareId', snake: 'hardware_id' },
      { camel: 'planType', snake: 'plan_type' },
      { camel: 'clientLimit', snake: 'client_limit' },
      { camel: 'expiresAt', snake: 'expires_at' },
    ];

    let foundFormat = null;

    checks.forEach(check => {
      const hasCamel = columnNames.includes(check.camel);
      const hasSnake = columnNames.includes(check.snake);

      if (hasCamel) {
        console.log(`  ✅ ${check.camel} (camelCase) - ENCONTRADA`);
        if (!foundFormat) foundFormat = 'camelCase';
      } else if (hasSnake) {
        console.log(`  ✅ ${check.snake} (snake_case) - ENCONTRADA`);
        if (!foundFormat) foundFormat = 'snake_case';
      } else {
        console.log(`  ❌ ${check.camel}/${check.snake} - NO ENCONTRADA`);
      }
    });

    console.log('\n📊 RESULTADO:');
    if (foundFormat === 'camelCase') {
      console.log('  🔹 Las columnas están en camelCase');
      console.log('  💡 Solución: Cambiar underscored: false en el modelo\n');
    } else if (foundFormat === 'snake_case') {
      console.log('  🔹 Las columnas están en snake_case');
      console.log('  💡 Solución: Mantener underscored: true en el modelo\n');
    } else {
      console.log('  ⚠️  No se pudo determinar el formato de columnas');
      console.log('  💡 La tabla puede estar corrupta o vacía\n');
    }

    // Contar registros
    const [count] = await db.sequelize.query(`SELECT COUNT(*) as total FROM SystemLicenses;`);
    console.log(`📊 Total de licencias registradas: ${count[0].total}\n`);

    await db.sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

checkSystemLicenses();
