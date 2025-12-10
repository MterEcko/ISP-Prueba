// Sistema de carga dinamica de plugins desde el backend
// Los archivos ConfigView.vue ahora están en el backend

export function loadPluginRoutes() {
  // Lista de plugins conocidos (se puede obtener dinámicamente desde la API)
  const knownPlugins = [
    'email',
    'jellyfin',
    'mercadopago',
    'openpay',
    'paypal',
    'stripe',
    'telegram',
    'whatsapp-meta',
    'whatsapp-twilio'
  ];

  const pluginRoutes = knownPlugins.map(pluginName => {
    // Convertir nombre-con-guiones a NombreEnCamelCase
    const componentName = pluginName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return {
      path: `/plugins/${pluginName}/config`,
      name: `${componentName}Config`,
      component: () => import('@/views/plugins/DynamicPluginConfig.vue'),
      meta: {
        requiresAuth: true,
        title: `Configuracion ${componentName}`,
        pluginName: pluginName
      }
    };
  });

  console.log(`✅ Total ${pluginRoutes.length} plugin routes loaded dynamically`);

  return pluginRoutes;
}
