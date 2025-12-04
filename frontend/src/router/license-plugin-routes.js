// Rutas para licencias y plugins
import LicenseManagementView from '../views/license/LicenseManagementView.vue';
import LicenseActivationView from '../views/license/LicenseActivationView.vue';
import PluginManagementView from '../views/plugins/PluginManagementView.vue';
import PluginMarketplaceView from '../views/plugins/PluginMarketplaceView.vue';

export const licenseRoutes = [
  {
    path: '/license/management',
    name: 'LicenseManagement',
    component: LicenseManagementView,
    meta: {
      requiresAuth: true,
      title: 'Gestión de Licencias'
    }
  },
  {
    path: '/license/activate',
    name: 'LicenseActivation',
    component: LicenseActivationView,
    meta: {
      requiresAuth: true,
      title: 'Activar Licencia'
    }
  }
];

export const pluginRoutes = [
  {
    path: '/plugins/management',
    name: 'PluginManagement',
    component: PluginManagementView,
    meta: {
      requiresAuth: true,
      title: 'Gestión de Plugins'
    }
  },
  {
    path: '/plugins/marketplace',
    name: 'PluginMarketplace',
    component: PluginMarketplaceView,
    meta: {
      requiresAuth: true,
      title: 'Plugin Marketplace'
    }
  }
];
