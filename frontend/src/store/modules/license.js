// frontend/src/store/modules/license.js
import licenseService from '@/services/license.service';

// Estado inicial
const state = {
  currentLicense: null,
  licenses: [],
  licenseStatus: {
    hasLicense: false,
    status: 'no_license',
    message: 'No hay licencia activa',
    daysRemaining: null,
    planInfo: null
  },
  loading: {
    current: false,
    list: false,
    verify: false,
    activate: false
  },
  error: null,
  lastChecked: null
};

// Getters
const getters = {
  // Obtener licencia actual
  getCurrentLicense: state => state.currentLicense,

  // Obtener todas las licencias
  getAllLicenses: state => state.licenses,

  // Obtener estado de licencia
  getLicenseStatus: state => state.licenseStatus,

  // Verificar si tiene licencia activa
  hasActiveLicense: state => state.licenseStatus.hasLicense && state.licenseStatus.status !== 'expired',

  // Verificar si es licencia maestra
  isMasterLicense: state => {
    return state.currentLicense?.isMasterLicense === true || state.licenseStatus?.license?.isMasterLicense === true;
  },

  // Obtener plan actual
  getCurrentPlan: state => {
    if (!state.currentLicense) return 'freemium';
    return state.currentLicense.planType || 'freemium';
  },

  // Obtener límite de clientes
  getClientLimit: state => {
    if (!state.currentLicense) return 50;
    return state.currentLicense.clientLimit;
  },

  // Verificar si es plan ilimitado
  isUnlimitedPlan: state => {
    return state.currentLicense?.clientLimit === null;
  },

  // Verificar si una característica está habilitada
  isFeatureEnabled: state => featureName => {
    if (!state.currentLicense || !state.currentLicense.featuresEnabled) return false;
    return state.currentLicense.featuresEnabled[featureName] === true;
  },

  // Obtener características habilitadas
  getEnabledFeatures: state => {
    if (!state.currentLicense || !state.currentLicense.featuresEnabled) return {};
    return state.currentLicense.featuresEnabled;
  },

  // Obtener días restantes
  getDaysRemaining: state => {
    return state.licenseStatus.daysRemaining;
  },

  // Verificar si está próxima a vencer
  isExpiringSoon: state => {
    const days = state.licenseStatus.daysRemaining;
    return days !== null && days <= 30 && days > 0;
  },

  // Verificar si está expirada
  isExpired: state => {
    return state.licenseStatus.status === 'expired';
  },

  // Obtener mensaje de estado
  getStatusMessage: state => {
    return state.licenseStatus.message;
  },

  // Verificar si está cargando
  isLoading: state => operation => {
    if (operation) {
      return state.loading[operation] === true;
    }
    return Object.values(state.loading).some(loading => loading === true);
  },

  // Obtener error
  getError: state => state.error,

  // Obtener información completa del plan
  getPlanInfo: state => {
    if (!state.currentLicense) {
      return {
        planType: 'freemium',
        clientLimit: 50,
        unlimited: false,
        expiresAt: null,
        isMasterLicense: false
      };
    }

    return {
      planType: state.currentLicense.planType,
      clientLimit: state.currentLicense.clientLimit,
      unlimited: state.currentLicense.clientLimit === null,
      expiresAt: state.currentLicense.expiresAt,
      isMasterLicense: state.currentLicense.isMasterLicense || false,
      features: state.currentLicense.featuresEnabled || {}
    };
  }
};

// Mutations
const mutations = {
  // Establecer licencia actual
  SET_CURRENT_LICENSE(state, license) {
    state.currentLicense = license;
    if (license) {
      licenseService.saveActiveLicense(license);
    }
  },

  // Establecer lista de licencias
  SET_LICENSES(state, licenses) {
    state.licenses = licenses;
  },

  // Agregar licencia a la lista
  ADD_LICENSE(state, license) {
    state.licenses.unshift(license);
  },

  // Actualizar licencia en la lista
  UPDATE_LICENSE(state, updatedLicense) {
    const index = state.licenses.findIndex(l => l.id === updatedLicense.id);
    if (index !== -1) {
      state.licenses.splice(index, 1, updatedLicense);
    }
  },

  // Eliminar licencia de la lista
  REMOVE_LICENSE(state, licenseId) {
    state.licenses = state.licenses.filter(l => l.id !== licenseId);
  },

  // Establecer estado de licencia
  SET_LICENSE_STATUS(state, status) {
    state.licenseStatus = status;
  },

  // Establecer estado de carga
  SET_LOADING(state, { operation, value }) {
    if (state.loading.hasOwnProperty(operation)) {
      state.loading[operation] = value;
    }
  },

  // Establecer error
  SET_ERROR(state, error) {
    state.error = error;
  },

  // Limpiar error
  CLEAR_ERROR(state) {
    state.error = null;
  },

  // Actualizar timestamp de última verificación
  SET_LAST_CHECKED(state) {
    state.lastChecked = new Date().toISOString();
  },

  // Limpiar licencia actual
  CLEAR_CURRENT_LICENSE(state) {
    state.currentLicense = null;
    state.licenseStatus = {
      hasLicense: false,
      status: 'no_license',
      message: 'No hay licencia activa',
      daysRemaining: null,
      planInfo: null
    };
    licenseService.removeActiveLicense();
  }
};

// Actions
const actions = {
  /**
   * Obtener licencia actual del servidor
   */
  async fetchCurrentLicense({ commit }) {
    commit('SET_LOADING', { operation: 'current', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.getCurrentLicense();
      const license = response.data.data;
      commit('SET_CURRENT_LICENSE', license);
      return license;
    } catch (error) {
      // Si no hay licencia activa, intentar cargar desde localStorage
      const localLicense = licenseService.getActiveLicense();
      if (localLicense) {
        commit('SET_CURRENT_LICENSE', localLicense);
      } else {
        commit('SET_ERROR', error.response?.data?.message || error.message);
      }
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'current', value: false });
    }
  },

  /**
   * Obtener todas las licencias
   */
  async fetchAllLicenses({ commit }) {
    commit('SET_LOADING', { operation: 'list', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.getAllLicenses();
      const licenses = response.data.data;
      commit('SET_LICENSES', licenses);
      return licenses;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'list', value: false });
    }
  },

  /**
   * Activar licencia con clave
   */
  async activateLicense({ commit, dispatch }, { licenseKey, hardwareId = null }) {
    commit('SET_LOADING', { operation: 'activate', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.activateLicense(licenseKey, hardwareId);
      const license = response.data.data;
      commit('SET_CURRENT_LICENSE', license);

      // Actualizar estado de licencia
      await dispatch('checkLicenseStatus');

      return license;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'activate', value: false });
    }
  },

  /**
   * Verificar licencia
   */
  async verifyLicense({ commit }, { licenseKey, hardwareId = null }) {
    commit('SET_LOADING', { operation: 'verify', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.verifyLicense(licenseKey, hardwareId);
      const verification = response.data.data;

      // Si es válida, actualizar licencia actual
      if (verification.verification.isValid) {
        commit('SET_CURRENT_LICENSE', verification.license);
      }

      return verification;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'verify', value: false });
    }
  },

  /**
   * Crear nueva licencia
   */
  async createLicense({ commit }, licenseData) {
    commit('SET_LOADING', { operation: 'list', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.createLicense(licenseData);
      const license = response.data.data;
      commit('ADD_LICENSE', license);
      return license;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'list', value: false });
    }
  },

  /**
   * Actualizar licencia
   */
  async updateLicense({ commit }, { id, licenseData }) {
    commit('SET_LOADING', { operation: 'list', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.updateLicense(id, licenseData);
      const license = response.data.data;
      commit('UPDATE_LICENSE', license);
      return license;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'list', value: false });
    }
  },

  /**
   * Eliminar licencia
   */
  async deleteLicense({ commit }, licenseId) {
    commit('SET_LOADING', { operation: 'list', value: true });
    commit('CLEAR_ERROR');

    try {
      await licenseService.deleteLicense(licenseId);
      commit('REMOVE_LICENSE', licenseId);
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'list', value: false });
    }
  },

  /**
   * Desactivar licencia
   */
  async deactivateLicense({ commit, dispatch }, licenseId) {
    commit('SET_LOADING', { operation: 'current', value: true });
    commit('CLEAR_ERROR');

    try {
      await licenseService.deactivateLicense(licenseId);
      commit('CLEAR_CURRENT_LICENSE');
      await dispatch('checkLicenseStatus');
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'current', value: false });
    }
  },

  /**
   * Verificar estado de licencia (local)
   */
  checkLicenseStatus({ commit, state }) {
    const status = licenseService.getLicenseStatus();
    commit('SET_LICENSE_STATUS', status);
    commit('SET_LAST_CHECKED');
    return status;
  },

  /**
   * Verificar límite de clientes
   */
  async checkClientLimit({ state }) {
    return await licenseService.checkClientLimit();
  },

  /**
   * Cargar licencia desde localStorage
   */
  loadLicenseFromStorage({ commit, dispatch }) {
    const license = licenseService.getActiveLicense();
    if (license) {
      commit('SET_CURRENT_LICENSE', license);
      dispatch('checkLicenseStatus');
      return license;
    }
    return null;
  },

  /**
   * Renovar licencia
   */
  async renewLicense({ commit, dispatch }, { id, renewalData }) {
    commit('SET_LOADING', { operation: 'current', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.renewLicense(id, renewalData);
      const license = response.data.data;
      commit('SET_CURRENT_LICENSE', license);
      await dispatch('checkLicenseStatus');
      return license;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'current', value: false });
    }
  },

  /**
   * Obtener estadísticas de uso de licencia
   */
  async getLicenseUsage({ commit }, licenseId) {
    commit('CLEAR_ERROR');

    try {
      const response = await licenseService.getLicenseUsage(licenseId);
      return response.data.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
