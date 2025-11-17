export default [
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/calendar/CalendarView.vue'),
    meta: {
      requiresAuth: true,
      title: 'Calendario'
    }
  }
];
