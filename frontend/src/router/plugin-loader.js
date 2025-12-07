// Sistema de carga dinamica de plugins
// Escanea la carpeta de plugins y registra rutas automaticamente

export function loadPluginRoutes() {
  const pluginRoutes = [];

  // Usar require.context para obtener todos los ConfigView.vue
  try {
    const pluginContext = require.context(
      '../views/plugins',
      true,
      /ConfigView\.vue$/
    );

    pluginContext.keys().forEach(key => {
      // Extraer nombre del plugin de la ruta
      // Ejemplo: ./whatsapp-twilio/ConfigView.vue -> whatsapp-twilio
      const match = key.match(/\.\/([^/]+)\/ConfigView\.vue$/);

      if (match) {
        const pluginName = match[1];

        // Convertir nombre-con-guiones a NombreEnCamelCase
        const componentName = pluginName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join('');

        // Crear ruta dinamica
        pluginRoutes.push({
          path: `/plugins/${pluginName}/config`,
          name: `${componentName}Config`,
          component: () => import(`../views/plugins/${pluginName}/ConfigView.vue`),
          meta: {
            requiresAuth: true,
            title: `Configuracion ${componentName}`,
            pluginName: pluginName
          }
        });

        console.log(`✅ Plugin route registered: /plugins/${pluginName}/config`);
      }
    });

    console.log(`✅ Total ${pluginRoutes.length} plugin routes loaded dynamically`);
  } catch (error) {
    console.error('Error loading plugin routes:', error);
  }

  return pluginRoutes;
}
