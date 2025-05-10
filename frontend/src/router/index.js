import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import ClientList from '../views/ClientList.vue';
import ClientDetail from '../views/ClientDetail.vue';
import ClientForm from '../views/ClientForm.vue';
import TicketList from '../views/TicketList.vue';
import TicketDetail from '../views/TicketDetail.vue';
import TicketForm from '../views/TicketForm.vue';
import DeviceList from '../views/DeviceList.vue';
import DeviceDetail from '../views/DeviceDetail.vue';
import DeviceForm from '../views/DeviceForm.vue';
import SettingView from '../views/SettingView.vue';
import NetworkView from '../views/NetworkView.vue';
import NodeDetail from '../views/NodeDetail.vue';
import NodeForm from '../views/NodeForm.vue';
import SectorDetail from '../views/SectorDetail.vue';
import SectorForm from '../views/SectorForm.vue';

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
  // Rutas de Clientes
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
  // Rutas de Tickets
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
  // Rutas de Dispositivos
  {
    path: '/devices',
    name: 'DeviceList',
    component: DeviceList,
    meta: { requiresAuth: true }
  },
  {
    path: '/devices/new',
    name: 'NewDevice',
    component: DeviceForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/devices/:id',
    name: 'DeviceDetail',
    component: DeviceDetail,
    meta: { requiresAuth: true }
  },
  {
    path: '/devices/:id/edit',
    name: 'EditDevice',
    component: DeviceForm,
    meta: { requiresAuth: true }
  },
  {
    path: '/settings/',
    name: 'SettingView',
    component: SettingView,
    meta: { requiresAuth: true }
  },
  // Dentro del array de rutas, añade:
  {
    path: '/network',
    name: 'Network',
    component: NetworkView,
    meta: { requiresAuth: true }
  },
// Rutas para nodos
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
// Rutas para sectores
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
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  const publicPages = ['/', '/login'];
  const authRequired = !publicPages.includes(to.path);
  const loggedIn = localStorage.getItem('user');

  if (authRequired && !loggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router;