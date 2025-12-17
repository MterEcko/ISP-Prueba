// Script para registrar plugins disponibles en la base de datos
const path = require('path');
const fs = require('fs');

// Configurar environment si dotenv está disponible
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (e) {
  console.log('⚠️  dotenv no disponible, usando variables de entorno del sistema');
}

const db = require('../src/models');
const { SystemPlugin } = db;

async function registerPlugins() {
  try {
    console.log('🔌 Iniciando registro de plugins...\n');

    // Path de plugins
    const pluginsPath = path.join(__dirname, '../src/plugins');

    if (!fs.existsSync(pluginsPath)) {
      console.error('❌ Directorio de plugins no encontrado:', pluginsPath);
      process.exit(1);
    }

    // Leer directorios de plugins
    const pluginFolders = fs.readdirSync(pluginsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📦 Plugins encontrados: ${pluginFolders.length}`);
    pluginFolders.forEach(name => console.log(`   - ${name}`));
    console.log('');

    let registered = 0;
    let skipped = 0;
    let errors = 0;

    for (const pluginName of pluginFolders) {
      try {
        // Verificar si ya existe
        const existing = await SystemPlugin.findOne({
          where: { name: pluginName }
        });

        if (existing) {
          console.log(`⏭️  ${pluginName}: Ya existe (ID: ${existing.id})`);
          skipped++;
          continue;
        }

        // Leer manifest.json
        const manifestPath = path.join(pluginsPath, pluginName, 'manifest.json');

        if (!fs.existsSync(manifestPath)) {
          console.log(`⚠️  ${pluginName}: No tiene manifest.json, omitiendo`);
          skipped++;
          continue;
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Registrar en la base de datos
        const newPlugin = await SystemPlugin.create({
          name: pluginName,
          version: manifest.version || '1.0.0',
          displayName: manifest.displayName || pluginName,
          description: manifest.description || '',
          category: manifest.category || 'other',
          active: false, // Inicialmente inactivo
          configuration: manifest.configuration || {},
          pluginTables: manifest.tables || [],
          pluginRoutes: manifest.routes || []
        });

        console.log(`✅ ${pluginName}: Registrado exitosamente (ID: ${newPlugin.id})`);
        registered++;

      } catch (error) {
        console.error(`❌ ${pluginName}: Error - ${error.message}`);
        errors++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Registrados: ${registered}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📦 Total: ${pluginFolders.length}`);

    if (registered > 0) {
      console.log('\n💡 Para activar los plugins, usa el panel de gestión o el endpoint:');
      console.log('   POST /api/system-plugins/:id/activate');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
console.log('🚀 Script de registro de plugins\n');
db.sequelize.sync()
  .then(() => {
    console.log('✅ Base de datos conectada\n');
    return registerPlugins();
  })
  .catch(error => {
    console.error('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  });
