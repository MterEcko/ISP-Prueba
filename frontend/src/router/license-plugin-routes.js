// Rutas para licencias y plugins
import LicenseManagementView from '../views/license/LicenseManagementView.vue';
import LicenseActivationView from '../views/license/LicenseActivationView.vue';
import CompanyRegistrationView from '../views/license/CompanyRegistrationView.vue';
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
  },
  {
    path: '/license/register',
    name: 'CompanyRegistration',
    component: CompanyRegistrationView,
    meta: {
      requiresAuth: true,
      title: 'Registro de Empresa y Licencia'
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
  },
  {
    path: '/plugins/marketplace/:pluginId',
    name: 'PluginMarketplaceDetail',
    component: PluginMarketplaceView,
    meta: {
      requiresAuth: true,
      title: 'Detalles del Plugin'
    }
  }
];

// Exportar solo las rutas base inicialmente
export const pluginRoutes = [...basePluginRoutes];

// Exportar funcion para cargar rutas dinamicas
export { loadPluginRoutes };
