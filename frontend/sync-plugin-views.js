#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directorio de plugins en el backend
const backendPluginsDir = path.join(__dirname, '..', 'backend', 'src', 'plugins');
// Directorio de destino en el frontend
const frontendPluginsDir = path.join(__dirname, 'src', 'views', 'plugins', 'dynamic');

// Escanear automáticamente todos los plugins que tengan ConfigView.vue
function discoverPlugins() {
  const plugins = [];
  if (!fs.existsSync(backendPluginsDir)) {
    console.error(`❌ Directorio de plugins no encontrado: ${backendPluginsDir}`);
    return plugins;
  }

  const pluginDirs = fs.readdirSync(backendPluginsDir, { withFileTypes: true });

  for (const dir of pluginDirs) {
    if (dir.isDirectory()) {
      const configViewPath = path.join(backendPluginsDir, dir.name, 'views', 'ConfigView.vue');
      if (fs.existsSync(configViewPath)) {
        plugins.push(dir.name);
      }
    }
  }

  return plugins;
}

console.log('🔄 Sincronizando ConfigView.vue desde backend...\n');

// Descubrir plugins automáticamente
const discoveredPlugins = discoverPlugins();
console.log(`🔍 Encontrados ${discoveredPlugins.length} plugins con ConfigView.vue\n`);

// Crear directorio de destino si no existe
if (!fs.existsSync(frontendPluginsDir)) {
  fs.mkdirSync(frontendPluginsDir, { recursive: true });
}

let syncedCount = 0;
let errorCount = 0;

discoveredPlugins.forEach(pluginName => {
  const sourceFile = path.join(backendPluginsDir, pluginName, 'views', 'ConfigView.vue');

  // Convertir nombre a PascalCase para el archivo de destino
  const componentName = pluginName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const destFile = path.join(frontendPluginsDir, `${componentName}Config.vue`);

  if (fs.existsSync(sourceFile)) {
    try {
      // Leer contenido del backend
      let content = fs.readFileSync(sourceFile, 'utf8');

      // TRANSFORMACIONES:
      // 1. Reemplazar rutas /api/plugins/ con /plugins/ (el servicio api ya incluye /api/)
      content = content.replace(/\/api\/plugins\//g, '/plugins/');

      // Escribir al frontend
      fs.writeFileSync(destFile, content, 'utf8');

      console.log(`✅ ${pluginName}: ConfigView.vue -> ${componentName}Config.vue`);
      syncedCount++;
    } catch (error) {
      console.error(`❌ Error sincronizando ${pluginName}:`, error.message);
      errorCount++;
    }
  } else {
    console.warn(`⚠️  ${pluginName}: ConfigView.vue no encontrado en backend`);
    errorCount++;
  }
});

// Generar archivo index.js con todos los imports estáticos
const indexContent = `// Auto-generado por sync-plugin-views.js - NO EDITAR MANUALMENTE
// Este archivo mapea nombres de plugins a sus componentes Vue

${discoveredPlugins.map(pluginName => {
  const componentName = pluginName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `import ${componentName}Config from './${componentName}Config.vue';`;
}).join('\n')}

export const pluginComponents = {
${discoveredPlugins.map(pluginName => {
  const componentName = pluginName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return `  '${pluginName}': ${componentName}Config`;
}).join(',\n')}
};

export function hasPluginComponent(pluginName) {
  return pluginName in pluginComponents;
}

export function getPluginComponent(pluginName) {
  return pluginComponents[pluginName] || null;
}
`;

const indexFile = path.join(frontendPluginsDir, 'index.js');
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log(`\n📦 Generado index.js con ${discoveredPlugins.length} componentes`);

console.log(`\n📊 Resumen:`);
console.log(`   ✅ Sincronizados: ${syncedCount}`);
console.log(`   ❌ Errores: ${errorCount}`);
console.log(`\n✨ Sincronizacion completada!`);
