// Sistema de carga dinamica de plugins desde el backend
import api from '@/services/api';

// Función para cargar componente personalizado dinámicamente
function loadPluginComponent(pluginName) {
  // Convertir nombre-con-guiones a NombreEnCamelCase para el nombre del archivo
  const componentName = pluginName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  // Intentar cargar componente sincronizado, si falla usar DynamicPluginConfig
  return () => import(`@/views/plugins/dynamic/${componentName}Config.vue`)
    .catch(() => import('@/views/plugins/DynamicPluginConfig.vue'));
}

let pluginRoutesCache = [];

export async function loadPluginRoutes() {
  try {
    // Obtener lista de plugins activos desde la API
    const response = await api.get('/system-plugins/active');

    if (!response.data.success) {
      console.error('Error obteniendo plugins activos:', response.data.message);
      return [];
    }

    const plugins = response.data.data || [];

    const pluginRoutes = plugins.map(plugin => {
      const pluginName = plugin.name;

      // Convertir nombre-con-guiones a NombreEnCamelCase
      const componentName = pluginName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      // Cargar componente dinámicamente (intentará componente sincronizado, sino DynamicPluginConfig)
      const component = loadPluginComponent(pluginName);

      return {
        path: `/plugins/${pluginName}/config`,
        name: `${componentName}Config`,
        component: component,
        meta: {
          requiresAuth: true,
          title: `Configuracion ${componentName}`,
          pluginName: pluginName
        }
      };
    });

    pluginRoutesCache = pluginRoutes;
    console.log(`✅ Total ${pluginRoutes.length} plugin routes loaded dynamically`);

    return pluginRoutes;

  } catch (error) {
    console.error('Error loading plugin routes:', error);
    // Retornar cache si hay error
    return pluginRoutesCache;
  }
}
