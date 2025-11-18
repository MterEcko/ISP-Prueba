// frontend/src/store/modules/plugins.js
import pluginService from '@/services/plugin.service';

// Estado inicial
const state = {
  installedPlugins: [],
  availablePlugins: [],
  activePlugins: [],
  marketplacePlugins: [],
  currentPlugin: null,
  pluginConfig: null,
  stats: {
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: {}
  },
  loading: {
    installed: false,
    available: false,
    active: false,
    marketplace: false,
    config: false,
    operation: false
  },
  error: null,
  filters: {
    category: 'all',
    search: '',
    status: 'all'
  },
  pagination: {
    marketplace: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 12
    }
  }
};

// Getters
const getters = {
  // Obtener plugins instalados
  getInstalledPlugins: state => state.installedPlugins,

  // Obtener plugins disponibles (en filesystem)
  getAvailablePlugins: state => state.availablePlugins,

  // Obtener plugins activos
  getActivePlugins: state => state.activePlugins,

  // Obtener plugins del marketplace
  getMarketplacePlugins: state => state.marketplacePlugins,

  // Obtener plugin actual
  getCurrentPlugin: state => state.currentPlugin,

  // Obtener configuración actual
  getPluginConfig: state => state.pluginConfig,

  // Obtener estadísticas
  getStats: state => state.stats,

  // Obtener un plugin por ID
  getPluginById: state => id => {
    return state.installedPlugins.find(p => p.id === id);
  },

  // Verificar si un plugin está instalado
  isPluginInstalled: state => pluginName => {
    return state.installedPlugins.some(p => p.name === pluginName);
  },

  // Verificar si un plugin está activo
  isPluginActive: state => pluginName => {
    return state.activePlugins.some(p => p.name === pluginName);
  },

  // Filtrar plugins instalados
  getFilteredInstalledPlugins: state => {
    let filtered = [...state.installedPlugins];

    // Filtrar por categoría
    if (state.filters.category && state.filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === state.filters.category);
    }

    // Filtrar por estado
    if (state.filters.status === 'active') {
      filtered = filtered.filter(p => p.active === true);
    } else if (state.filters.status === 'inactive') {
      filtered = filtered.filter(p => p.active === false);
    }

    // Filtrar por búsqueda
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search) ||
          p.author?.toLowerCase().includes(search)
      );
    }

    return filtered;
  },

  // Obtener plugins por categoría
  getPluginsByCategory: state => category => {
    if (category === 'all') return state.installedPlugins;
    return state.installedPlugins.filter(p => p.category === category);
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

  // Obtener filtros actuales
  getFilters: state => state.filters,

  // Obtener paginación del marketplace
  getMarketplacePagination: state => state.pagination.marketplace,

  // Contar plugins por categoría
  getPluginCountByCategory: state => {
    const counts = {};
    state.installedPlugins.forEach(plugin => {
      const category = plugin.category || 'other';
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }
};

// Mutations
const mutations = {
  // Establecer plugins instalados
  SET_INSTALLED_PLUGINS(state, plugins) {
    state.installedPlugins = plugins;
    pluginService.saveInstalledPlugins(plugins);
  },

  // Establecer plugins disponibles
  SET_AVAILABLE_PLUGINS(state, plugins) {
    state.availablePlugins = plugins;
  },

  // Establecer plugins activos
  SET_ACTIVE_PLUGINS(state, plugins) {
    state.activePlugins = plugins;
  },

  // Establecer plugins del marketplace
  SET_MARKETPLACE_PLUGINS(state, { plugins, pagination }) {
    state.marketplacePlugins = plugins;
    if (pagination) {
      state.pagination.marketplace = {
        ...state.pagination.marketplace,
        ...pagination
      };
    }
  },

  // Agregar plugin instalado
  ADD_INSTALLED_PLUGIN(state, plugin) {
    state.installedPlugins.push(plugin);
    pluginService.saveInstalledPlugins(state.installedPlugins);
  },

  // Actualizar plugin
  UPDATE_PLUGIN(state, updatedPlugin) {
    const index = state.installedPlugins.findIndex(p => p.id === updatedPlugin.id);
    if (index !== -1) {
      state.installedPlugins.splice(index, 1, updatedPlugin);
      pluginService.saveInstalledPlugins(state.installedPlugins);
    }
  },

  // Eliminar plugin
  REMOVE_PLUGIN(state, pluginId) {
    state.installedPlugins = state.installedPlugins.filter(p => p.id !== pluginId);
    state.activePlugins = state.activePlugins.filter(p => p.id !== pluginId);
    pluginService.saveInstalledPlugins(state.installedPlugins);
  },

  // Establecer plugin actual
  SET_CURRENT_PLUGIN(state, plugin) {
    state.currentPlugin = plugin;
  },

  // Establecer configuración de plugin
  SET_PLUGIN_CONFIG(state, config) {
    state.pluginConfig = config;
  },

  // Establecer estadísticas
  SET_STATS(state, stats) {
    state.stats = stats;
  },

  // Establecer estado de carga
  SET_LOADING(state, { operation, value }) {
    if (Object.prototype.hasOwnProperty.call(state.loading, operation)) {
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

  // Establecer filtros
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },

  // Limpiar filtros
  CLEAR_FILTERS(state) {
    state.filters = {
      category: 'all',
      search: '',
      status: 'all'
    };
  },

  // Actualizar estado de plugin (activo/inactivo)
  UPDATE_PLUGIN_STATUS(state, { pluginId, active }) {
    const plugin = state.installedPlugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.active = active;
      pluginService.saveInstalledPlugins(state.installedPlugins);
    }
  }
};

// Actions
const actions = {
  /**
   * Obtener todos los plugins instalados
   */
  async fetchInstalledPlugins({ commit }) {
    commit('SET_LOADING', { operation: 'installed', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getAllPlugins();
      const plugins = response.data.data || [];
      commit('SET_INSTALLED_PLUGINS', plugins);
      return plugins;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      // Intentar cargar desde localStorage
      const localPlugins = pluginService.getInstalledPlugins();
      if (localPlugins.length > 0) {
        commit('SET_INSTALLED_PLUGINS', localPlugins);
      }
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'installed', value: false });
    }
  },

  /**
   * Obtener plugins disponibles en filesystem
   */
  async fetchAvailablePlugins({ commit }) {
    commit('SET_LOADING', { operation: 'available', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getAvailablePlugins();
      const plugins = response.data.data || [];
      commit('SET_AVAILABLE_PLUGINS', plugins);
      return plugins;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'available', value: false });
    }
  },

  /**
   * Obtener plugins activos
   */
  async fetchActivePlugins({ commit }) {
    commit('SET_LOADING', { operation: 'active', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getActivePlugins();
      const plugins = response.data.data || [];
      commit('SET_ACTIVE_PLUGINS', plugins);
      return plugins;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'active', value: false });
    }
  },

  /**
   * Obtener plugins del marketplace
   */
  async fetchMarketplacePlugins({ commit, state }, filters = {}) {
    commit('SET_LOADING', { operation: 'marketplace', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getMarketplacePlugins({
        ...filters,
        page: filters.page || state.pagination.marketplace.currentPage,
        limit: filters.limit || state.pagination.marketplace.perPage
      });

      const data = response.data.data || {};
      const plugins = data.plugins || [];
      const pagination = data.pagination || null;

      commit('SET_MARKETPLACE_PLUGINS', { plugins, pagination });
      return { plugins, pagination };
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'marketplace', value: false });
    }
  },

  /**
   * Obtener detalles de un plugin
   */
  async fetchPluginById({ commit }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getPluginById(pluginId);
      const plugin = response.data.data;
      commit('SET_CURRENT_PLUGIN', plugin);
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Crear/Registrar nuevo plugin
   */
  async createPlugin({ commit, dispatch }, pluginData) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.createPlugin(pluginData);
      const plugin = response.data.data;
      commit('ADD_INSTALLED_PLUGIN', plugin);
      await dispatch('updateStats');
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Actualizar plugin
   */
  async updatePlugin({ commit, dispatch }, { id, pluginData }) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.updatePlugin(id, pluginData);
      const plugin = response.data.data;
      commit('UPDATE_PLUGIN', plugin);
      await dispatch('updateStats');
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Eliminar plugin
   */
  async deletePlugin({ commit, dispatch }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      await pluginService.deletePlugin(pluginId);
      commit('REMOVE_PLUGIN', pluginId);
      await dispatch('updateStats');
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Activar plugin
   */
  async activatePlugin({ commit, dispatch }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.activatePlugin(pluginId);
      const plugin = response.data.data;
      commit('UPDATE_PLUGIN', plugin);
      commit('UPDATE_PLUGIN_STATUS', { pluginId, active: true });
      await dispatch('fetchActivePlugins');
      await dispatch('updateStats');
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Desactivar plugin
   */
  async deactivatePlugin({ commit, dispatch }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.deactivatePlugin(pluginId);
      const plugin = response.data.data;
      commit('UPDATE_PLUGIN', plugin);
      commit('UPDATE_PLUGIN_STATUS', { pluginId, active: false });
      await dispatch('fetchActivePlugins');
      await dispatch('updateStats');
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Recargar plugin
   */
  async reloadPlugin({ commit }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.reloadPlugin(pluginId);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Inicializar todos los plugins activos
   */
  async initializeAllPlugins({ commit }) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.initializeAllPlugins();
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Obtener configuración de plugin
   */
  async fetchPluginConfig({ commit }, pluginId) {
    commit('SET_LOADING', { operation: 'config', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.getPluginConfig(pluginId);
      const config = response.data.data;
      commit('SET_PLUGIN_CONFIG', config);
      return config;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'config', value: false });
    }
  },

  /**
   * Actualizar configuración de plugin
   */
  async updatePluginConfig({ commit }, { pluginId, config }) {
    commit('SET_LOADING', { operation: 'config', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.updatePluginConfig(pluginId, config);
      const updatedConfig = response.data.data;
      commit('SET_PLUGIN_CONFIG', updatedConfig);
      return updatedConfig;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'config', value: false });
    }
  },

  /**
   * Descargar plugin desde marketplace
   */
  async downloadPlugin({ commit }, pluginId) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.downloadPlugin(pluginId);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Instalar plugin
   */
  async installPlugin({ commit, dispatch }, pluginFile) {
    commit('SET_LOADING', { operation: 'operation', value: true });
    commit('CLEAR_ERROR');

    try {
      const response = await pluginService.installPlugin(pluginFile);
      const plugin = response.data.data;
      commit('ADD_INSTALLED_PLUGIN', plugin);
      await dispatch('updateStats');
      return plugin;
    } catch (error) {
      commit('SET_ERROR', error.response?.data?.message || error.message);
      throw error;
    } finally {
      commit('SET_LOADING', { operation: 'operation', value: false });
    }
  },

  /**
   * Actualizar estadísticas de plugins
   */
  // eslint-disable-next-line no-unused-vars
  async updateStats({ commit, state }) {
    const stats = await pluginService.getPluginStats();
    commit('SET_STATS', stats);
    return stats;
  },

  /**
   * Establecer filtros
   */
  setFilters({ commit }, filters) {
    commit('SET_FILTERS', filters);
  },

  /**
   * Limpiar filtros
   */
  clearFilters({ commit }) {
    commit('CLEAR_FILTERS');
  },

  /**
   * Cargar plugins desde localStorage
   */
  loadPluginsFromStorage({ commit }) {
    const plugins = pluginService.getInstalledPlugins();
    if (plugins.length > 0) {
      commit('SET_INSTALLED_PLUGINS', plugins);
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
