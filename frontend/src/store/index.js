//frontend\src\store/index.js
import { createStore } from 'vuex';
import { auth } from './auth.module';
import inventory from './modules/inventory';
import license from './modules/license';
import plugins from './modules/plugins';
import calendar from './modules/calendar';
import chat from './modules/chat';
import storeCustomer from './modules/storeCustomer';

export default createStore({
  modules: {
    auth,
    inventory,
    license,
    plugins,
    calendar,
    chat,
    storeCustomer
  }
});