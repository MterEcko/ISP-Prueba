// Sistema de carga dinamica de plugins desde el backend
import api from '@/services/api';

// Mapa de componentes personalizados (sincronizados desde backend)
const customPluginComponents = {
  'mercadopago': () => import('@/views/plugins/payment/MercadopagoConfig.vue'),
  'openpay': () => import('@/views/plugins/payment/OpenpayConfig.vue'),
  'paypal': () => import('@/views/plugins/payment/PaypalConfig.vue'),
  'stripe': () => import('@/views/plugins/payment/StripeConfig.vue'),
  'email': () => import('@/views/plugins/payment/EmailConfig.vue')
};

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

      // Usar componente personalizado si existe, sino usar DynamicPluginConfig
      const component = customPluginComponents[pluginName]
        ? customPluginComponents[pluginName]
        : () => import('@/views/plugins/DynamicPluginConfig.vue');

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
