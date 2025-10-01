//frontend\src\store/index.js
import { createStore } from 'vuex';
import { auth } from './auth.module';

export default createStore({
  modules: {
    auth
  }
});