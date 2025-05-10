import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import './assets/css/global.css';

// Importar otros plugins o configuraciones globales según sea necesario

createApp(App)
  .use(store)
  .use(router)
  .mount('#app');