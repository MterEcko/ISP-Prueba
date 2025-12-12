#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directorio de plugins en el backend
const backendPluginsDir = path.join(__dirname, '..', 'backend', 'src', 'plugins');
// Directorio de destino en el frontend
const frontendPluginsDir = path.join(__dirname, 'src', 'views', 'plugins', 'payment');

// Plugins que queremos sincronizar (incluye pago, comunicación y servicios)
const paymentPlugins = ['mercadopago', 'openpay', 'paypal', 'stripe', 'email', 'jellyfin', 'whatsapp-twilio'];

console.log('🔄 Sincronizando ConfigView.vue desde backend...\n');

// Crear directorio de destino si no existe
if (!fs.existsSync(frontendPluginsDir)) {
  fs.mkdirSync(frontendPluginsDir, { recursive: true });
}

let syncedCount = 0;
let errorCount = 0;

paymentPlugins.forEach(pluginName => {
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

console.log(`\n📊 Resumen:`);
console.log(`   ✅ Sincronizados: ${syncedCount}`);
console.log(`   ❌ Errores: ${errorCount}`);
console.log(`\n✨ Sincronizacion completada!`);
