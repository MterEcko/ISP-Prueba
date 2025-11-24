// Rutas del módulo de inventario
export default [
  {
    path: '/inventory',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'InventoryDashboard',
        component: () => import('@/views/inventory/InventoryDashboard.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Panel de Inventario'
        }
      },
      {
        path: 'list',
        name: 'InventoryList',
        component: () => import('@/views/inventory/InventoryList.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Listado de Inventario'
        }
      },
      {
        path: 'new',
        name: 'NewInventoryItem',
        component: () => import('@/views/inventory/InventoryForm.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Nuevo Ítem de Inventario'
        }
      },
      {
        path: ':id',
        name: 'InventoryDetail',
        component: () => import('@/views/inventory/InventoryDetail.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Detalle de Ítem'
        }
      },
      {
        path: ':id/edit',
        name: 'EditInventoryItem',
        component: () => import('@/views/inventory/InventoryForm.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Editar Ítem'
        }
      },
      {
        path: 'movements',
        name: 'InventoryMovements',
        component: () => import('@/views/inventory/MovementsList.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Movimientos de Inventario'
        }
      },
      {
        path: 'movements/:id',
        name: 'MovementDetail',
        component: () => import('@/views/inventory/MovementDetail.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Detalle de Movimiento'
        }
      },
      {
        path: 'alerts',
        name: 'InventoryAlerts',
        component: () => import('@/views/inventory/StockAlertsList.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Alertas de Stock'
        }
      },
      {
        path: 'assign/:id',
        name: 'AssignInventory',
        component: () => import('@/views/inventory/AssignmentForm.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Asignar Ítem'
        }
      },
      {
        path: 'locations',
        name: 'LocationsList',
        component: () => import('@/views/inventory/LocationsList.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Ubicaciones'
        }
      },
      {
        path: 'locations/new',
        name: 'NewLocation',
        component: () => import('@/views/inventory/LocationForm.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Nueva Ubicación'
        }
      },
      {
        path: 'locations/:id',
        name: 'LocationDetail',
        component: () => import('@/views/inventory/LocationDetail.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Detalle de Ubicación'
        }
      },
      {
        path: 'locations/:id/edit',
        name: 'EditLocation',
        component: () => import('@/views/inventory/LocationForm.vue'),
        props: true,
        meta: { 
          requiresAuth: true,
          title: 'Editar Ubicación'
        }
      },
      {
        path: 'suppliers',
        name: 'SuppliersList',
        component: () => import('@/views/inventory/SuppliersList.vue'),
        meta: { 
          requiresAuth: true,
          title: 'Proveedores'
        }
      },
      {
        path: 'reports',
        name: 'InventoryReports',
        component: () => import('@/views/inventory/ReportGenerator.vue'),
        meta: {
          requiresAuth: true,
          title: 'Informes de Inventario'
        }
      },
      {
        path: 'categories',
        name: 'InventoryCategories',
        component: () => import('@/views/inventory/InventoryCategoriesView.vue'),
        meta: {
          requiresAuth: true,
          title: 'Categorías de Inventario'
        }
      },
      {
        path: 'types',
        name: 'InventoryTypes',
        component: () => import('@/views/inventory/InventoryTypesView.vue'),
        meta: {
          requiresAuth: true,
          title: 'Tipos de Materiales'
        }
      }
    ]
  }
];