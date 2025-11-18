// Script para limpiar tipos ENUM antiguos con nombres incorrectos
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

async function cleanupEnumTypes() {
  try {
    console.log('🔍 Buscando tipos ENUM antiguos con nombres incorrectos...\n');

    // Obtener todos los tipos ENUM
    const [enumTypes] = await sequelize.query(`
      SELECT typname
      FROM pg_type
      WHERE typname LIKE 'enum_%'
      ORDER BY typname;
    `);

    console.log(`📊 Tipos ENUM encontrados: ${enumTypes.length}\n`);

    // Buscar tipos ENUM con minúsculas (incorrectos)
    const incorrectEnums = enumTypes.filter(t => {
      const typname = t.typname;
      // Buscar patrones como enum_servicePackages, enum_paymentGateways, etc.
      // (con minúscula después de enum_)
      const match = typname.match(/^enum_([a-z])/);
      return match !== null;
    });

    if (incorrectEnums.length === 0) {
      console.log('✅ No se encontraron tipos ENUM con nombres incorrectos');
      return;
    }

    console.log(`❌ Encontrados ${incorrectEnums.length} tipos ENUM con nombres incorrectos:`);
    incorrectEnums.forEach(t => console.log(`  - ${t.typname}`));
    console.log();

    console.log('🗑️  Eliminando tipos ENUM incorrectos...\n');

    for (const enumType of incorrectEnums) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumType.typname}" CASCADE;`);
        console.log(`✅ Eliminado: ${enumType.typname}`);
      } catch (error) {
        console.error(`❌ Error eliminando ${enumType.typname}:`, error.message);
      }
    }

    console.log('\n✅ Limpieza completada');
    console.log('\nAhora puedes reiniciar el backend y Sequelize creará los tipos ENUM correctos.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

cleanupEnumTypes();
