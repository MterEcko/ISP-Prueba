// Script para recrear la tabla plugin_audit_logs con el esquema correcto
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
    logging: console.log
  }
);

async function fixPluginAuditLog() {
  try {
    console.log('🔍 Verificando tabla plugin_audit_logs...\n');

    // Verificar si la tabla existe
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'plugin_audit_logs';
    `);

    if (tables.length === 0) {
      console.log('ℹ️  La tabla plugin_audit_logs no existe');
      console.log('✅ Sequelize la creará automáticamente en el próximo sync');
      return;
    }

    console.log('📊 La tabla plugin_audit_logs existe. Verificando columnas...\n');

    // Verificar columnas
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'plugin_audit_logs'
      ORDER BY ordinal_position;
    `);

    console.log('Columnas actuales:');
    columns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));
    console.log();

    // Verificar si existe la columna action
    const hasAction = columns.some(col => col.column_name === 'action');

    if (!hasAction) {
      console.log('❌ La columna "action" NO existe en la tabla');
      console.log('🗑️  Eliminando tabla plugin_audit_logs para recrearla...\n');

      // Eliminar la tabla y sus dependencias
      await sequelize.query('DROP TABLE IF EXISTS "plugin_audit_logs" CASCADE;');
      console.log('✅ Tabla eliminada exitosamente');

      // Eliminar tipos ENUM relacionados
      await sequelize.query('DROP TYPE IF EXISTS "enum_plugin_audit_logs_action" CASCADE;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_plugin_audit_logs_severity" CASCADE;');
      console.log('✅ Tipos ENUM eliminados');

      console.log('\n✅ Ahora puedes reiniciar el backend y Sequelize recreará la tabla correctamente');
    } else {
      console.log('✅ La columna "action" existe en la tabla');
      console.log('ℹ️  El problema podría ser otro. Revisa los logs del backend.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixPluginAuditLog();
