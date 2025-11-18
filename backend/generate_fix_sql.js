// Script para generar comandos SQL de corrección
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ispdev',
  process.env.DB_USER || 'ispdev',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    dialect: 'postgres',
    logging: false
  }
);

async function generateFixSQL() {
  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   COMANDOS SQL DE CORRECCIÓN - ISP Management System');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Listar todos los tipos ENUM
    const [enumTypes] = await sequelize.query(`
      SELECT typname
      FROM pg_type
      WHERE typname LIKE 'enum_%'
      ORDER BY typname;
    `);

    console.log(`📊 Tipos ENUM encontrados: ${enumTypes.length}\n`);

    // Separar ENUM correctos e incorrectos
    const incorrectEnums = [];
    const correctEnums = [];

    enumTypes.forEach(t => {
      const typname = t.typname;
      // Incorrectos: empiezan con enum_ seguido de minúscula
      // Ejemplo: enum_servicePackages, enum_paymentGateways
      const match = typname.match(/^enum_([a-z])/);
      if (match) {
        incorrectEnums.push(typname);
      } else {
        correctEnums.push(typname);
      }
    });

    console.log(`❌ Tipos ENUM con nombres INCORRECTOS (minúscula): ${incorrectEnums.length}`);
    if (incorrectEnums.length > 0) {
      incorrectEnums.forEach(e => console.log(`  - ${e}`));
    }
    console.log();

    console.log(`✅ Tipos ENUM con nombres CORRECTOS (PascalCase): ${correctEnums.length}`);
    if (correctEnums.length > 0 && correctEnums.length <= 20) {
      correctEnums.forEach(e => console.log(`  - ${e}`));
    }
    console.log();

    // 2. Listar tablas problemáticas conocidas
    const problematicTables = ['plugin_audit_logs', 'notifications'];

    console.log('📊 Verificando tablas con esquemas problemáticos...\n');

    const tablesWithIssues = [];

    for (const tableName of problematicTables) {
      const [tables] = await sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = '${tableName}';
      `);

      if (tables.length > 0) {
        const [columns] = await sequelize.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          ORDER BY ordinal_position;
        `);

        // Verificar si tiene las columnas esperadas
        const columnNames = columns.map(c => c.column_name);

        let hasIssues = false;
        let missingColumns = [];

        if (tableName === 'plugin_audit_logs' && !columnNames.includes('action')) {
          hasIssues = true;
          missingColumns.push('action');
        }
        if (tableName === 'notifications' && !columnNames.includes('type')) {
          hasIssues = true;
          missingColumns.push('type');
        }

        if (hasIssues) {
          tablesWithIssues.push({ name: tableName, missingColumns });
          console.log(`❌ Tabla "${tableName}" tiene problemas:`);
          console.log(`   Columnas faltantes: ${missingColumns.join(', ')}`);
          console.log(`   Columnas actuales: ${columnNames.join(', ')}`);
          console.log();
        }
      }
    }

    // 3. Generar comandos SQL
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   COMANDOS SQL PARA EJECUTAR EN POSTGRESQL');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('-- Paso 1: Eliminar tipos ENUM incorrectos (con minúscula)');
    console.log('-- Estos se recrearán automáticamente con los nombres correctos\n');

    if (incorrectEnums.length > 0) {
      incorrectEnums.forEach(enumType => {
        console.log(`DROP TYPE IF EXISTS "public"."${enumType}" CASCADE;`);
      });
    } else {
      console.log('-- No hay tipos ENUM incorrectos');
    }

    console.log('\n-- Paso 2: Eliminar tablas con esquemas incorrectos');
    console.log('-- Estas se recrearán automáticamente con los esquemas correctos\n');

    if (tablesWithIssues.length > 0) {
      tablesWithIssues.forEach(table => {
        console.log(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
      });
    } else {
      console.log('-- No hay tablas con esquemas incorrectos');
    }

    console.log('\n-- Paso 3: Eliminar tipos ENUM relacionados a las tablas eliminadas\n');

    if (tablesWithIssues.length > 0) {
      tablesWithIssues.forEach(table => {
        // Buscar ENUM relacionados
        const relatedEnums = enumTypes.filter(e =>
          e.typname.includes(table.name.replace('_', ''))
        );
        relatedEnums.forEach(e => {
          console.log(`DROP TYPE IF EXISTS "public"."${e.typname}" CASCADE;`);
        });
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   RESUMEN');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Tipos ENUM a eliminar: ${incorrectEnums.length}`);
    console.log(`📊 Tablas a eliminar: ${tablesWithIssues.length}`);

    if (incorrectEnums.length === 0 && tablesWithIssues.length === 0) {
      console.log('\n✅ No se encontraron problemas en la base de datos');
      console.log('ℹ️  Si sigues teniendo errores, revisa los logs del backend');
    } else {
      console.log('\n📝 INSTRUCCIONES:');
      console.log('1. Copia los comandos SQL de arriba');
      console.log('2. Conéctate a PostgreSQL:');
      console.log(`   psql -h localhost -p 5433 -U ispdev -d ispdev`);
      console.log('3. Ejecuta los comandos SQL');
      console.log('4. Reinicia el backend: npm start');
      console.log('5. Sequelize recreará automáticamente los tipos ENUM y tablas correctos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

generateFixSQL();
