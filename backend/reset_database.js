// Script para eliminar todas las tablas y tipos ENUM de la base de datos
// Permite que Sequelize recree todo desde cero con los esquemas correctos
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
    logging: false // Silenciar logs para output más limpio
  }
);

async function resetDatabase() {
  try {
    console.log('⚠️  ADVERTENCIA: Este script eliminará TODAS las tablas de la base de datos');
    console.log(`📊 Base de datos: ${process.env.DB_NAME || 'ispdev'}\n`);

    // Listar todas las tablas
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Tablas encontradas: ${tables.length}`);
    if (tables.length > 0) {
      console.log('\nTablas a eliminar:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }
    console.log();

    // Listar todos los tipos ENUM
    const [enumTypes] = await sequelize.query(`
      SELECT typname
      FROM pg_type
      WHERE typname LIKE 'enum_%'
      ORDER BY typname;
    `);

    console.log(`📊 Tipos ENUM encontrados: ${enumTypes.length}`);
    if (enumTypes.length > 0) {
      console.log('\nTipos ENUM a eliminar:');
      enumTypes.forEach(t => console.log(`  - ${t.typname}`));
    }
    console.log();

    // Eliminar todas las tablas
    console.log('🗑️  Eliminando todas las tablas...\n');

    // Desactivar foreign key checks temporalmente
    await sequelize.query('SET session_replication_role = replica;');

    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
        console.log(`✅ Tabla eliminada: ${table.table_name}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${table.table_name}:`, error.message);
      }
    }

    // Reactivar foreign key checks
    await sequelize.query('SET session_replication_role = DEFAULT;');

    console.log();

    // Eliminar todos los tipos ENUM
    console.log('🗑️  Eliminando todos los tipos ENUM...\n');

    for (const enumType of enumTypes) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumType.typname}" CASCADE;`);
        console.log(`✅ ENUM eliminado: ${enumType.typname}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${enumType.typname}:`, error.message);
      }
    }

    console.log('\n✅ Base de datos limpiada exitosamente');
    console.log('\n🚀 Ahora puedes iniciar el backend y Sequelize creará todas las tablas correctamente:');
    console.log('   npm start');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('   RESET DE BASE DE DATOS - ISP Management System');
console.log('═══════════════════════════════════════════════════════════════\n');

resetDatabase();
