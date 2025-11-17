//frontend\src\store/index.js
import { createStore } from 'vuex';
import { auth } from './auth.module';
import inventory from './modules/inventory';
import license from './modules/license';
import plugins from './modules/plugins';

export default createStore({
  modules: {
    auth,
    inventory,
    license,
    plugins
  }
});