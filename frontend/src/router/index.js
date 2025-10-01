import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import ClientList from '../views/ClientList.vue';
import ClientDetail from '../views/ClientDetail.vue';
import ClientForm from '../views/ClientForm.vue';
import ClientServicesForm from '../views/ClientServiceForm.vue';
import TicketList from '../views/TicketList.vue';
import TicketDetail from '../views/TicketDetail.vue';
import TicketForm from '../views/TicketForm.vue';
import SettingView from '../views/SettingView.vue';
import BackupManagementView from '../views/BackupManagementView.vue';
import PaymentPluginsView from '../views/PaymentPluginsView.vue';
import NetworkView from '../views/NetworkView.vue';
import NodeDetail from '../views/NodeDetail.vue';
import NodeForm from '../views/NodeForm.vue';
import SectorDetail from '../views/SectorDetail.vue';
import SectorForm from '../views/SectorForm.vue';
import InventarioManagement from '../views/InventarioManagement.vue';
//import DepartamentoList from '../views/DepartamentoList.vue';
import PermisoList from '../views/PermisoList.vue';
import RolList from '../views/RolList.vue';
import FibraOpticaList from '../views/FibraOpticaList.vue';

// Importar las vistas de roles y usuarios
import RoleList from '../views/RoleList.vue';
import RoleForm from '../views/RoleForm.vue';
import RolePermissions from '../views/RolePermissions.vue';
import UserList from '../views/UserList.vue';
import UserForm from '../views/UserForm.vue';

// Nuevas importaciones para Mikrotik
import MikrotikManagement from '../views/MikrotikManagement.vue';
import MikrotikClientControl from '../views/MikrotikClientControl.vue';
import MikrotikPools from '../views/MikrotikPools.vue';
import MikrotikProfiles from '../views/MikrotikProfiles.vue';

// Nuevas importaciones para inventario
import InventoryList from '../views/InventoryList.vue';
import InventoryForm from '../views/InventoryForm.vue';
import InventoryDetail from '../views/InventoryDetail.vue';
import InventoryLocationList from '../views/InventoryLocationList.vue';
import InventoryManagement from '../views/InventoryManagement.vue';
import InventoryManagementView from '../views/InventoryManagementView.vue';

// ===== NUEVAS IMPORTACIONES PARA DISPOSITIVOS =====
import DeviceList from '../views/DeviceList.vue';
import DeviceForm from '../views/DeviceForm.vue';
import DeviceDetail from '../views/DeviceDetail.vue';
import DeviceCommands from '../views/DeviceCommands.vue';
import DeviceCredentialsForm from '../views/DeviceCredentialsForm.vue';
import DeviceMetrics from '../views/DeviceMetrics.vue';
import DeviceConnectionHistory from '../views/DeviceConnectionHistory.vue';
import DeviceAlerts from '../views/DeviceAlerts.vue';
import NetworkMap from '../views/NetworkMap.vue';

// ===== IMPORTACIONES PARA COMANDOS =====
import CommandList from '../views/CommandList.vue';
import CommandForm from '../views/CommandForm.vue';
import CommandDetail from '../views/CommandDetail.vue';

import ZoneList from '../views/ZoneList.vue';
import ZoneForm from '../views/ZoneForm.vue';
import ZoneDetail from '../views/ZoneDetail.vue';
import ServicePackageList from '../views/ServicePackageList.vue';
import SubscriptionCard from '../components/SubscriptionCard.vue';

import BillingDashboard from '../views/BillingDashboard.vue';
import InvoiceList from '../views/InvoiceList.vue';
import InvoiceDetail from '../views/InvoiceDetail.vue';
import InvoiceForm from '../views/InvoiceForm.vue';
import PaymentList from '../views/PaymentList.vue';
import PaymentDetail from '../views/PaymentDetail.vue';
import ClientBillingConfig from '../views/ClientBillingConfig.vue';
import BillingReports from '../views/BillingReports.vue';
import OverdueInvoices from '../views/OverdueInvoices.vue';
import PaymentGateways from '../views/PaymentGateways.vue';
// ===== IMPORTACIONES PARA SUSCRIPCIONES =====
import SubscriptionForm from '../components/SubscriptionForm.vue';
import SubscriptionFormIntelligent from '../components/SubscriptionFormIntelligent.vue';

// ===== NOTA: LOS ARCHIVOS DE DEBUG Y SUSCRIPCIONES AVANZADAS EST??N COMENTADOS =====
// Descomenta cuando crees estos archivos:
// import DebugConsole from '../views/DebugConsole.vue';
// import TransactionMonitor from '../views/TransactionMonitor.vue';

// ===== ?? NUEVAS IMPORTACIONES PARA COMUNICACIONES =====
import CommunicationDashboard from '../views/CommunicationDashboard.vue';
// Comentamos las importaciones que a��n no existen como views
// import TemplateEditor from '../views/TemplateEditor.vue';
// import MessageComposer from '../views/MessageComposer.vue';
// import CommunicationSettings from '../views/CommunicationSettings.vue';
// import MassMessageWizard from '../views/MassMessageWizard.vue';
import CommunicationHistory from '../components/CommunicationHistory.vue';
import TemplateManager from '../components/TemplateManager.vue';
import ScheduledMessages from '../components/ScheduledMessages.vue';
// import ChannelConfiguration from '../views/ChannelConfiguration.vue';


const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/rol',
    name: 'RolList',
    component: RolList,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory',
    name: 'InventoryList',
    component: InventoryList,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/new',
    name: 'NewInventory',
    component: InventoryForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/:id',
    name: 'InventoryDetail',
    component: InventoryDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/management',
    name: 'InventoryManagement',
    component: InventoryManagement,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/managementview',
    name: 'InventoryManagementView',
    component: InventoryManagementView,
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/:id/edit',
    name: 'EditInventory',
    component: InventoryForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/FibraOpticaList',
    name: 'FibraOpticaList',
    component: FibraOpticaList,
    meta: { requiresAuth: true }
  },
  
  // ===============================
  // RUTAS DE CLIENTES
  // ===============================
  {
    path: '/clients',
    name: 'ClientList',
    component: ClientList,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/new',
    name: 'NewClient',
    component: ClientForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:id',
    name: 'ClientDetail',
    component: ClientDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:id/edit',
    name: 'EditClient',
    component: ClientForm,
    meta: { requiresAuth: true }
  },

  // ===== RUTAS LEGACY DE SUSCRIPCIONES (Mantener para compatibilidad) =====
  {
    path: '/clients/:id/addPackage',
    name: 'AddPackageClient',
    component: SubscriptionForm,
    meta: { 
      requiresAuth: true,
      title: 'Agregar Paquete (Legacy)'
    }
  },
  {
    path: '/clients/:id/editPackage/:idPackage',
    name: 'editPackageClient',
    component: SubscriptionForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Paquete (Legacy)'
    }
  },
// ===============================
// RUTAS DEL M�DULO DE BILLING/CONTABILIDAD
// ===============================

// Dashboard principal de facturaci�n
{
  path: '/billing',
  name: 'BillingDashboard',
  component: BillingDashboard,
  meta: { 
    requiresAuth: true,
    title: 'Dashboard Financiero'
  }
},

// Gesti�n de facturas
{
  path: '/billing/invoices',
  name: 'InvoiceList',
  component: InvoiceList,
  meta: { 
    requiresAuth: true,
    title: 'Gesti�n de Facturas'
  }
},
{
  path: '/billing/invoices/new',
  name: 'NewInvoice',
  component: InvoiceForm,
  meta: { 
    requiresAuth: true,
    title: 'Nueva Factura'
  }
},
{
  path: '/billing/invoices/:id',
  name: 'InvoiceDetail',
  component: InvoiceDetail,
  meta: { 
    requiresAuth: true,
    title: 'Detalle de Factura'
  }
},
{
  path: '/billing/invoices/:id/edit',
  name: 'EditInvoice',
  component: InvoiceForm,
  meta: { 
    requiresAuth: true,
    title: 'Editar Factura'
  }
},

// Gesti�n de pagos
{
  path: '/billing/payments',
  name: 'PaymentList',
  component: PaymentList,
  meta: { 
    requiresAuth: true,
    title: 'Gesti�n de Pagos'
  }
},
{
  path: '/billing/payments/:id',
  name: 'PaymentDetail',
  component: PaymentDetail,
  meta: { 
    requiresAuth: true,
    title: 'Detalle de Pago'
  }
},

// Configuraci�n de facturaci�n por cliente
{
  path: '/billing/clients/:clientId/config',
  name: 'ClientBillingConfig',
  component: ClientBillingConfig,
  meta: { 
    requiresAuth: true,
    title: 'Configuraci�n de Facturaci�n'
  }
},

// Reportes financieros
{
  path: '/billing/reports',
  name: 'BillingReports',
  component: BillingReports,
  meta: { 
    requiresAuth: true,
    title: 'Reportes Financieros'
  }
},

// Facturas vencidas (procesamiento masivo)
{
  path: '/billing/overdue',
  name: 'OverdueInvoices',
  component: OverdueInvoices,
  meta: { 
    requiresAuth: true,
    title: 'Facturas Vencidas'
  }
},

// Configuraci�n de pasarelas de pago
{
  path: '/billing/gateways',
  name: 'PaymentGateways',
  component: PaymentGateways,
  meta: { 
    requiresAuth: true,
    title: 'Pasarelas de Pago'
  }
},

  // ===============================
  // e??? RUTAS PARA SUSCRIPCIONES INTELIGENTES
  // ===============================
  
  // 1. NUEVA SUSCRIPCI?��N (Detecci?3n autom??tica si ya tiene suscripciones)
  {
    path: '/clients/:clientId/subscription/new',
    name: 'NewSubscription',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'Nueva Suscripci?3n',
      operationType: 'CREATE_NEW'
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      operationHint: 'new'
    })
  },
  
  // 2. CAMBIO DE PLAN (Solo velocidades/precios - mismo nodo)
  {
    path: '/clients/:clientId/subscription/:subscriptionId/change-plan',
    name: 'ChangeSubscriptionPlan',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'Cambio de Plan',
      operationType: 'CHANGE_PLAN'
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      subscriptionId: parseInt(route.params.subscriptionId),
      operationHint: 'change-plan'
    })
  },
  
  // 3. CAMBIO DE DOMICILIO (Mismo nodo, nueva direcci?3n)
  {
    path: '/clients/:clientId/subscription/:subscriptionId/change-address',
    name: 'ChangeSubscriptionAddress',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'Cambio de Domicilio',
      operationType: 'CHANGE_ADDRESS'
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      subscriptionId: parseInt(route.params.subscriptionId),
      operationHint: 'change-address'
    })
  },
  
  // 4. CAMBIO DE NODO/TORRE (Diferente nodo - requiere recrear PPPoE)
  {
    path: '/clients/:clientId/subscription/:subscriptionId/change-node',
    name: 'ChangeSubscriptionNode',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'a? ??? Cambio de Nodo/Torre',
      operationType: 'CHANGE_NODE',
      dangerous: true
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      subscriptionId: parseInt(route.params.subscriptionId),
      operationHint: 'change-node'
    })
  },
  
  // 5. CAMBIO DE ZONA (Nueva zona - validar paquetes + recrear PPPoE)
  {
    path: '/clients/:clientId/subscription/:subscriptionId/change-zone',
    name: 'ChangeSubscriptionZone',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'a? ??? Cambio de Zona',
      operationType: 'CHANGE_ZONE',
      dangerous: true
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      subscriptionId: parseInt(route.params.subscriptionId),
      operationHint: 'change-zone'
    })
  },
  
  // 6. GESTI?��N INTELIGENTE DE SUSCRIPCI?��N (Detecci?3n autom??tica del tipo)
  {
    path: '/clients/:clientId/subscription/manage',
    name: 'ManageSubscription',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'Gesti?3n de Suscripci?3n',
      operationType: 'AUTO_DETECT'
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      operationHint: null // Detectar autom??ticamente
    })
  },
  
  // 7. EDITAR SUSCRIPCI?��N ESPEC??FICA (Para enlaces directos)
  {
    path: '/clients/:clientId/subscription/:subscriptionId/edit',
    name: 'EditSubscription',
    component: SubscriptionFormIntelligent,
    meta: { 
      requiresAuth: true,
      title: 'Editar Suscripci?3n',
      operationType: 'EDIT'
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      subscriptionId: parseInt(route.params.subscriptionId),
      operationHint: 'edit'
    })
  },

  // ===============================
  // e?���� RUTAS PARA DEBUG Y MONITOREO (COMENTADAS HASTA QUE SE CREEN LOS ARCHIVOS)
  // ===============================
  
  // a? ??? DESCOMENTA CUANDO CREES LOS ARCHIVOS DebugConsole.vue y TransactionMonitor.vue
  /*
  // Debug Console (Solo en desarrollo o admin)
  {
    path: '/debug/console',
    name: 'DebugConsole',
    component: DebugConsole,
    meta: { 
      requiresAuth: true,
      title: 'e?��? Consola de Debug',
      adminOnly: true
    }
  },
  
  // Monitor de Transacciones
  {
    path: '/debug/transactions',
    name: 'TransactionMonitor',
    component: TransactionMonitor,
    meta: { 
      requiresAuth: true,
      title: 'e?��? Monitor de Transacciones',
      adminOnly: true
    }
  },
  
  // Debug espec?-fico de cliente
  {
    path: '/clients/:clientId/debug',
    name: 'ClientDebug',
    component: DebugConsole,
    meta: { 
      requiresAuth: true,
      title: 'e?��? Debug de Cliente',
      adminOnly: true
    },
    props: route => ({
      clientId: parseInt(route.params.clientId),
      filterBy: 'client'
    })
  },
  */

  // ===============================
  // e?��? RUTAS PARA VISTAS DE SUSCRIPCIONES (COMENTADAS)
  // ===============================
  
  // a? ??? DESCOMENTA CUANDO CREES LOS ARCHIVOS SubscriptionList.vue, SubscriptionDetail.vue, SubscriptionHistory.vue
  /*
  // Lista de todas las suscripciones del sistema
  {
    path: '/subscriptions',
    name: 'SubscriptionList',
    component: () => import('../views/SubscriptionList.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Gesti?3n de Suscripciones'
    }
  },
  
  // Detalle de suscripci?3n espec?-fica
  {
    path: '/subscriptions/:subscriptionId',
    name: 'SubscriptionDetail',
    component: () => import('../views/SubscriptionDetail.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Detalle de Suscripci?3n'
    },
    props: route => ({
      subscriptionId: parseInt(route.params.subscriptionId)
    })
  },
  
  // Historial de cambios de una suscripci?3n
  {
    path: '/subscriptions/:subscriptionId/history',
    name: 'SubscriptionHistory',
    component: () => import('../views/SubscriptionHistory.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Historial de Suscripci?3n'
    },
    props: route => ({
      subscriptionId: parseInt(route.params.subscriptionId)
    })
  },
  */

  // ===============================
  // RUTAS DE TICKETS
  // ===============================
  {
    path: '/tickets',
    name: 'TicketList',
    component: TicketList,
    meta: { requiresAuth: true }
  },
  {
    path: '/tickets/new',
    name: 'NewTicket',
    component: TicketForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/tickets/:id',
    name: 'TicketDetail',
    component: TicketDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/tickets/:id/edit',
    name: 'EditTicket',
    component: TicketForm,
    meta: { requiresAuth: true }
  },
  
// ===============================
  // ?? RUTAS PARA COMUNICACIONES
  // ===============================
  
  // Dashboard principal de comunicaciones
  {
    path: '/communications',
    name: 'CommunicationDashboard',
    component: CommunicationDashboard,
    meta: { 
      requiresAuth: true,
      title: 'Centro de Comunicaciones',
      permission: 'view_communications'
    }
  },
  
 //  COMENTAMOS LAS RUTAS QUE USAN VISTAS A��N NO CREADAS
  // Gesti��n de plantillas
  {
    path: '/communications/templates',
    name: 'TemplateManager',
    component: TemplateManager,
    meta: { 
      requiresAuth: true,
      title: 'Gesti��n de Plantillas',
      permission: 'manage_templates'
    }
  },
  
  // Editor de plantillas
  /*{
    path: '/communications/templates/new',
    name: 'NewTemplate',
    component: TemplateEditor,
    meta: { 
      requiresAuth: true,
      title: 'Nueva Plantilla',
      permission: 'create_templates'
    }
  },
*/  
  // Historial de comunicaciones
  {
    path: '/communications/history',
    name: 'CommunicationHistory',
    component: CommunicationHistory,
    meta: { 
      requiresAuth: true,
      title: 'Historial de Comunicaciones',
      permission: 'view_communication_history'
    }
  },
  // ===============================
  // RUTAS DE DISPOSITIVOS (NUEVAS)
  // ===============================
  {
    path: '/devices',
    name: 'DeviceList',
    component: DeviceList,
    meta: { 
      requiresAuth: true,
      title: 'Dispositivos de Red'
    }
  },
  {
    path: '/devices/new',
    name: 'NewDevice',
    component: DeviceForm,
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Dispositivo'
    }
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetail',
    component: DeviceDetail,
    meta: { 
      requiresAuth: true,
      title: 'Detalle de Dispositivo'
    }
  },
  {
    path: '/devices/:id/edit',
    name: 'EditDevice',
    component: DeviceForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Dispositivo'
    }
  },
  {
    path: '/devices/:deviceId/commands',
    name: 'DeviceCommands',
    component: DeviceCommands,
    meta: { 
      requiresAuth: true,
      title: 'Comandos Avanzados'
    }
  },
  {
    path: '/devices/:deviceId/credentials/new',
    name: 'NewDeviceCredentials',
    component: DeviceCredentialsForm,
    meta: { 
      requiresAuth: true,
      title: 'Agregar Credenciales'
    }
  },
  {
    path: '/devices/:deviceId/credentials/:credentialId/edit',
    name: 'EditDeviceCredentials',
    component: DeviceCredentialsForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Credenciales'
    }
  },
  {
    path: '/devices/:deviceId/metrics',
    name: 'DeviceMetrics',
    component: DeviceMetrics,
    meta: { 
      requiresAuth: true,
      title: 'M??tricas del Dispositivo'
    }
  },
  {
    path: '/devices/:deviceId/history',
    name: 'DeviceConnectionHistory',
    component: DeviceConnectionHistory,
    meta: { 
      requiresAuth: true,
      title: 'Historial de Conexiones'
    }
  },
  {
    path: '/devices/:deviceId/alerts',
    name: 'DeviceAlerts',
    component: DeviceAlerts,
    meta: { 
      requiresAuth: true,
      title: 'Alertas del Dispositivo'
    }
  },

  // ===============================
  // RUTAS PARA COMANDOS Y IMPLEMENTACIONES (NUEVAS)
  // ===============================
  {
    path: '/commands',
    name: 'CommandList',
    component: CommandList,
    meta: { 
      requiresAuth: true,
      title: 'Comandos del Sistema'
    }
  },
  {
    path: '/commands/new',
    name: 'NewCommand',
    component: CommandForm,
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Comando'
    }
  },
  {
    path: '/commands/:id',
    name: 'CommandDetail',
    component: CommandDetail,
    meta: { 
      requiresAuth: true,
      title: 'Detalle de Comando'
    }
  },
  {
    path: '/commands/:id/edit',
    name: 'EditCommand',
    component: CommandForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Comando'
    }
  },

  // ===============================
  // RUTAS PARA IMPLEMENTACIONES DE COMANDOS
  // ===============================
  {
    path: '/command-implementations',
    name: 'ImplementationList',
    component: () => import('../views/ImplementationList.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Implementaciones de Comandos'
    }
  },
  {
    path: '/command-implementations/new',
    name: 'NewImplementation',
    component: () => import('../views/ImplementationForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Nueva Implementaci?3n'
    }
  },
  {
    path: '/command-implementations/:id/edit',
    name: 'EditImplementation',
    component: () => import('../views/ImplementationForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Editar Implementaci?3n'
    }
  },

  // ===============================
  // RUTAS PARA GESTI?��N DE MARCAS Y FAMILIAS
  // ===============================
  {
    path: '/device-brands',
    name: 'DeviceBrandList',
    component: () => import('../views/DeviceBrandList.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Marcas de Dispositivos'
    }
  },
  {
    path: '/device-brands/new',
    name: 'NewDeviceBrand',
    component: () => import('../views/DeviceBrandForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Nueva Marca'
    }
  },
  {
    path: '/device-brands/:id/edit',
    name: 'EditDeviceBrand',
    component: () => import('../views/DeviceBrandForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Editar Marca'
    }
  },
  {
    path: '/device-families',
    name: 'DeviceFamilyList',
    component: () => import('../views/DeviceFamilyList.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Familias de Dispositivos'
    }
  },
  {
    path: '/device-families/new',
    name: 'NewDeviceFamily',
    component: () => import('../views/DeviceFamilyForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Nueva Familia'
    }
  },
  {
    path: '/device-families/:id/edit',
    name: 'EditDeviceFamily',
    component: () => import('../views/DeviceFamilyForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Editar Familia'
    }
  },
  
  // ===============================
  // RUTAS DE CONFIGURACI?��N
  // ===============================
  {
    path: '/settings/',
    name: 'SettingView',
    component: SettingView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/PaymentPlugins',
    name: 'Payments',
    component: PaymentPluginsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/backups',
    name: 'BackUpsView',
    component: BackupManagementView,
    meta: { requiresAuth: true }
  },
  
  // ===============================
  // RUTAS DE RED
  // ===============================
  {
    path: '/network',
    name: 'Network',
    component: NetworkView,
    meta: { requiresAuth: true }
  },
  
  // ===============================
  // RUTAS PARA ZONAS
  // ===============================  
  {
    path: '/zones/list',
    name: 'ZoneList',
    component: ZoneList,
    meta: { requiresAuth: true }
  },

  {
    path: '/zones/:id/edit',
    name: 'ZoneForm',
    component: ZoneForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/zones/new',
    name: 'ZoneForm',
    component: ZoneForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/zones/:id',
    name: 'Zone Detail',
    component: ZoneDetail,
    meta: { requiresAuth: true }
  },
  
  // ===== RUTAS PARA SERVICE PACKAGES =====

  // 1. Lista general de paquetes (sin zona espec?-fica)
  {
    path: '/service-packages',
    name: 'ServicePackageList',
    component: () => import('../views/ServicePackageList.vue'),
    meta: { requiresAuth: true }
  },

  // 2. Crear paquete SIN zona predefinida (usuario selecciona zona)
  {
    path: '/service-packages/new',
    name: 'NewServicePackage',
    component: () => import('../views/ServicePackageForm.vue'),
    meta: { requiresAuth: true }
  },

  // 3. Crear paquete CON zona predefinida (desde ZoneDetail)
  {
    path: '/zones/:zoneId/service-packages/new',
    name: 'NewServicePackageForZone',
    component: () => import('../views/ServicePackageForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Paquete para Zona'
    }
  },

  // 4. Ver paquete espec?-fico
  {
    path: '/service-packages/:id',
    name: 'ServicePackageDetail',
    component: () => import('../views/ServicePackageDetail.vue'),
    meta: { requiresAuth: true }
  },

  // 5. Editar paquete
  {
    path: '/service-packages/:id/edit',
    name: 'EditServicePackage',
    component: () => import('../views/ServicePackageForm.vue'),
    meta: { requiresAuth: true }
  },

  // 6. Editar paquete con zona espec?-fica
  {
    path: '/zones/:zoneId/service-packages/:id/edit',
    name: 'EditServicePackageForZone',
    component: () => import('../views/ServicePackageForm.vue'),
    meta: { requiresAuth: true }
  },

  // ===============================
  // RUTAS PARA Nodos
  // ===============================
  {
    path: '/nodes/new',
    name: 'CreateNode',
    component: () => import('../views/NodeForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/nodes/:id',
    name: 'NodeDetail',
    component: () => import('../views/NodeDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/nodes/:id/edit',
    name: 'EditNode',
    component: () => import('../views/NodeForm.vue'),
    meta: { requiresAuth: true }
  },
  
  // ===============================
  // RUTAS PARA SECTORES
  // ===============================
  {
    path: '/sectors/new',
    name: 'CreateSector',
    component: () => import('../views/SectorForm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/sectors/:id',
    name: 'SectorDetail',
    component: () => import('../views/SectorDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/sectors/:id/edit',
    name: 'EditSector',
    component: () => import('../views/SectorForm.vue'),
    meta: { requiresAuth: true }
  },
  
  {
    path: '/routers/:id/edit',
    name: 'EditMRouter',
    component: () => import('../views/DeviceForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Editar Router Mikrotik'
    }
  },
  {
    path: '/routers/:id/',
    name: 'RouterDetail',
    component: () => import('../views/DeviceDetail.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Detalle Router Mikrotik'
    }
  },
  
  // ===============================
  // RUTAS PARA MIKROTIK
  // ===============================
  {
    path: '/mikrotik',
    name: 'MikrotikManagement',
    component: MikrotikManagement,
    meta: { 
      requiresAuth: true,
      title: 'Gesti?3n Mikrotik'
    }
  },
  {
    path: '/mikrotik/device/new',
    name: 'NewMikrotikDevice',
    component: () => import('../views/MikrotikDeviceForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Router Mikrotik'
    }
  },
  {
    path: '/mikrotik/device/:deviceId/edit',
    name: 'EditMikrotikDevice',
    component: () => import('../views/MikrotikDeviceForm.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Editar Router Mikrotik'
    }
  },
  {
    path: '/mikrotik/device/:deviceId/pppoe',
    name: 'MikrotikClientControl',
    component: () => import('../views/MikrotikClientControl.vue'),
    meta: { 
      requiresAuth: true,
      title: 'Control PPPoE'
    }
  },
  {
    path: '/mikrotik/pools',
    name: 'MikrotikPools',
    component: MikrotikPools,
    meta: { 
      requiresAuth: true,
      title: 'Control POOLS'
    }
  },
  {
    path: '/mikrotik/profiles',
    name: 'MikrotikProfiles',
    component: MikrotikProfiles,
    meta: { 
      requiresAuth: true,
      title: 'Control Perfiles'
    }
  },
  
  // NUEVA RUTA: Para redirigir autom??ticamente errores de URL
  {
    path: '/mikrotik/device/:deviceId/ppoe', // URL incorrecta que usabas
    redirect: to => {
      console.log('Redirigiendo de URL incorrecta a correcta');
      return `/mikrotik/device/${to.params.deviceId}/pppoe`;
    }
  },
  
  // ===============================
  // RUTAS PARA GESTI?��N DE ROLES Y PERMISOS
  // ===============================
  {
    path: '/roles',
    name: 'RoleList',
    component: RoleList,
    meta: { 
      requiresAuth: true,
      title: 'Gesti?3n de Roles'
    }
  },
  {
    path: '/roles/new',
    name: 'NewRole',
    component: RoleForm,
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Rol'
    }
  },
  {
    path: '/roles/:id/edit',
    name: 'EditRole',
    component: RoleForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Rol'
    }
  },
  {
    path: '/roles/:id/permissions',
    name: 'RolePermissions',
    component: RolePermissions,
    meta: { 
      requiresAuth: true,
      title: 'Permisos del Rol'
    }
  },
  
  // ===============================
  // RUTAS PARA GESTI?��N DE USUARIOS
  // ===============================
  {
    path: '/users',
    name: 'UserList',
    component: UserList,
    meta: { 
      requiresAuth: true,
      title: 'Gesti?3n de Usuarios'
    }
  },
  {
    path: '/users/new',
    name: 'NewUser',
    component: UserForm,
    meta: { 
      requiresAuth: true,
      title: 'Nuevo Usuario'
    }
  },
  {
    path: '/users/:id/edit',
    name: 'EditUser',
    component: UserForm,
    meta: { 
      requiresAuth: true,
      title: 'Editar Usuario'
    }
  },
  {
    path: '/network/map',
    name: 'NetworkMap',
    component: () => import('../views/NetworkMap.vue'),
    meta: { requiresAuth: true }
  },

  // ===============================
  // e?��? RUTAS DE REDIRECCI?��N Y COMPATIBILIDAD
  // ===============================
  
  // Redirigir rutas legacy de suscripciones al nuevo sistema
  {
    path: '/clients/:clientId/subscription/:subscriptionId/change',
    redirect: to => {
      console.log('e?��? Redirigiendo a gesti?3n inteligente de suscripci?3n');
      return `/clients/${to.params.clientId}/subscription/manage`;
    }
  },
  
  // Redirigir gesti?3n de paquetes legacy
  {
    path: '/clients/:clientId/packages',
    redirect: to => {
      console.log('e?��? Redirigiendo a nueva suscripci?3n');
      return `/clients/${to.params.clientId}/subscription/new`;
    }
  },

  // ===============================
  // a??RUTA 404 Y MANEJO DE ERRORES
  // ===============================
  /*{
    path: '/404',
    name: 'NotFound',
    component: Dashboard, // Usar Dashboard temporalmente hasta crear NotFound.vue
    meta: { 
      title: 'P??gina no encontrada'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }*/
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  }
});

// ===============================
// e??????GUARDS DE NAVEGACI?��N B??SICOS
// ===============================

router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/login', '/404'];
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('user');
  
  // Log b??sico de navegaci?3n
  console.log('e?��- Navegando de', from.path, 'a', to.path);

  // Verificar autenticaci?3n
  if (authRequired && !loggedIn) {
    console.log('a??Acceso denegado - Usuario no autenticado');
    next('/login');
    return;
  }

  // Establecer t?-tulo de la p??gina
  if (to.meta?.title) {
    document.title = `${to.meta.title} - Sistema ISP`;
  } else {
    document.title = 'Sistema Integral ISP';
  }

  // Log para operaciones peligrosas
  if (to.meta?.dangerous) {
    console.warn('a? ??? NAVEGANDO A OPERACI?��N PELIGROSA:', {
      route: to.name,
      operationType: to.meta.operationType,
      params: to.params
    });
  }

  next();
});

// ===============================
// e??�� HELPERS DE NAVEGACI?��N B??SICOS
// ===============================

/**
 * Helper para navegar a diferentes tipos de operaciones de suscripci?3n
 */
export const subscriptionRoutes = {
  // Nueva suscripci?3n
  newSubscription: (clientId) => ({
    name: 'NewSubscription',
    params: { clientId }
  }),
  
  // Cambio de plan
  changePlan: (clientId, subscriptionId) => ({
    name: 'ChangeSubscriptionPlan',
    params: { clientId, subscriptionId }
  }),
  
  // Cambio de domicilio
  changeAddress: (clientId, subscriptionId) => ({
    name: 'ChangeSubscriptionAddress',
    params: { clientId, subscriptionId }
  }),
  
  // Cambio de nodo
  changeNode: (clientId, subscriptionId) => ({
    name: 'ChangeSubscriptionNode',
    params: { clientId, subscriptionId }
  }),
  
  // Cambio de zona
  changeZone: (clientId, subscriptionId) => ({
    name: 'ChangeSubscriptionZone',
    params: { clientId, subscriptionId }
  }),
  
  // Gesti?3n autom??tica
  manage: (clientId) => ({
    name: 'ManageSubscription',
    params: { clientId }
  }),
  
  // Edici?3n directa
  edit: (clientId, subscriptionId) => ({
    name: 'EditSubscription',
    params: { clientId, subscriptionId }
  })
};

// ===============================
// e?��? ANALYTICS DE NAVEGACI?��N B??SICOS
// ===============================

router.afterEach((to, from) => {
  // Log de navegaci?3n completada
  console.log('a??Navegaci?3n completada:', {
    from: from.name,
    to: to.name,
    operationType: to.meta?.operationType,
    timestamp: new Date().toISOString()
  });
  
  // Tracking espec?-fico para operaciones de suscripciones
  if (to.name && to.name.includes('Subscription')) {
    console.log('e?��? Tracking operaci?3n de suscripci?3n:', {
      operation: to.meta?.operationType,
      clientId: to.params?.clientId,
      subscriptionId: to.params?.subscriptionId,
      fromRoute: from.name
    });
  }
});

export default router;