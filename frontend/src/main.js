import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import vuetify from './plugins/vuetify';
import './assets/css/global.css';
import 'leaflet/dist/leaflet.css';

// Importar otros plugins o configuraciones globales según sea necesario

createApp(App)
  .use(store)
  .use(router)
  .use(vuetify)
  .mount('#app');