// Rutas para licencias y plugins
import LicenseManagementView from '../views/license/LicenseManagementView.vue';
import LicenseActivationView from '../views/license/LicenseActivationView.vue';
import PluginManagementView from '../views/plugins/PluginManagementView.vue';
import PluginMarketplaceView from '../views/plugins/PluginMarketplaceView.vue';

// Sistema de carga dinamica de plugins
import { loadPluginRoutes } from './plugin-loader';

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

// Rutas base de plugins (management y marketplace)
const basePluginRoutes = [
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

// Cargar rutas de configuracion de plugins dinamicamente
const dynamicPluginRoutes = loadPluginRoutes();

// Exportar todas las rutas de plugins (base + dinamicas)
export const pluginRoutes = [
  ...basePluginRoutes,
  ...dynamicPluginRoutes
];
