import axios from 'axios';
import authHeader from '@/services/auth-header';

const api = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:3000/api',
  headers: authHeader()
});

// Estado inicial
const state = {
  assets: [],
  categories: [],
  locations: [],
  statuses: [],
  users: [],
  suppliers: [],
  movements: [],
  loading: {
    assets: false,
    categories: false,
    locations: false,
    statuses: false,
    users: false,
    suppliers: false,
    movements: false
  },
  error: null,
  filters: {
    category: null,
    location: null,
    status: null,
    search: null,
    assignedTo: null
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 20
  },
  lastUpdated: null
};

// Getters
const getters = {
  // Obtener todos los activos
  getAllAssets: state => state.assets,
  
  // Obtener un activo por su ID
  getAssetById: state => id => {
    return state.assets.find(asset => asset.id === id);
  },
  
  // Activos filtrados
  getFilteredAssets: state => {
    let result = [...state.assets];
    
    if (state.filters.category) {
      result = result.filter(asset => asset.category === state.filters.category);
    }
    
    if (state.filters.location) {
      result = result.filter(asset => asset.location === state.filters.location);
    }
    
    if (state.filters.status) {
      result = result.filter(asset => asset.status === state.filters.status);
    }
    
    if (state.filters.assignedTo === 'unassigned') {
      result = result.filter(asset => !asset.assignedTo);
    } else if (state.filters.assignedTo) {
      result = result.filter(asset => asset.assignedTo === state.filters.assignedTo);
    }
    
    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      result = result.filter(asset =>
        (asset.name && asset.name.toLowerCase().includes(searchTerm)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm)) ||
        (asset.model && asset.model.toLowerCase().includes(searchTerm)) ||
        (asset.brand && asset.brand.toLowerCase().includes(searchTerm))
      );
    }
    
    return result;
  },
  
  // Obtener activos por categoría
  getAssetsByCategory: state => categoryId => {
    return state.assets.filter(asset => asset.category === categoryId);
  },
  
  // Obtener activos por ubicación
  getAssetsByLocation: state => locationId => {
    return state.assets.filter(asset => asset.location === locationId);
  },
  
  // Obtener activos por estado
  getAssetsByStatus: state => statusId => {
    return state.assets.filter(asset => asset.status === statusId);
  },
  
  // Obtener activos asignados a un usuario
  getAssetsByUser: state => userId => {
    return state.assets.filter(asset => asset.assignedTo === userId);
  },
  
  // Obtener activos por proveedor
  getAssetsBySupplier: state => supplierId => {
    return state.assets.filter(asset => asset.supplier === supplierId);
  },
  
  // Obtener categoría por ID
  getCategoryById: state => id => {
    return state.categories.find(category => category.id === id);
  },
  
  // Obtener ubicación por ID
  getLocationById: state => id => {
    return state.locations.find(location => location.id === id);
  },
  
  // Obtener estado por ID
  getStatusById: state => id => {
    return state.statuses.find(status => status.id === status.id);
  },
  
  // Obtener usuario por ID
  getUserById: state => id => {
    return state.users.find(user => user.id === id);
  },
  
  // Obtener proveedor por ID
  getSupplierById: state => id => {
    return state.suppliers.find(supplier => supplier.id === id);
  },
  
  // Obtener movimientos de un activo
  getAssetMovements: state => assetId => {
    return state.movements.filter(movement => movement.assetId === assetId);
  },
  
  // Estado de carga
  isLoading: state => resource => {
    return state.loading[resource] || false;
  },
  
  // Verificar si hay error
  hasError: state => !!state.error,
  
  // Obtener estadísticas básicas
  getInventoryStats: state => {
    const stats = {
      total: state.assets.length,
      byCategory: {},
      byStatus: {},
      byLocation: {},
      valueTotal: 0
    };
    
    // Contar por categoría
    state.assets.forEach(asset => {
      // Contar por categoría
      if (asset.category) {
        stats.byCategory[asset.category] = (stats.byCategory[asset.category] || 0) + 1;
      }
      
      // Contar por estado
      if (asset.status) {
        stats.byStatus[asset.status] = (stats.byStatus[asset.status] || 0) + 1;
      }
      
      // Contar por ubicación
      if (asset.location) {
        stats.byLocation[asset.location] = (stats.byLocation[asset.location] || 0) + 1;
      }
      
      // Sumar valor total
      if (asset.value && !isNaN(parseFloat(asset.value))) {
        stats.valueTotal += parseFloat(asset.value);
      }
    });
    
    return stats;
  }
};

// Mutaciones
const mutations = {
  // Actualizar estado de carga
  SET_LOADING(state, { resource, isLoading }) {
    state.loading = {
      ...state.loading,
      [resource]: isLoading
    };
  },
  
  // Establecer error
  SET_ERROR(state, error) {
    state.error = error;
  },
  
  // Limpiar error
  CLEAR_ERROR(state) {
    state.error = null;
  },
  
  // Establecer activos
  SET_ASSETS(state, assets) {
    state.assets = assets;
    state.lastUpdated = new Date();
  },
  
  // Establecer categorías
  SET_CATEGORIES(state, categories) {
    state.categories = categories;
  },
  
  // Establecer ubicaciones
  SET_LOCATIONS(state, locations) {
    state.locations = locations;
  },
  
  // Establecer estados
  SET_STATUSES(state, statuses) {
    state.statuses = statuses;
  },
  
  // Establecer usuarios
  SET_USERS(state, users) {
    state.users = users;
  },
  
  // Establecer proveedores
  SET_SUPPLIERS(state, suppliers) {
    state.suppliers = suppliers;
  },
  
  // Establecer movimientos
  SET_MOVEMENTS(state, movements) {
    state.movements = movements;
  },
  
  // Establecer filtros
  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },
  
  // Establecer paginación
  SET_PAGINATION(state, pagination) {
    state.pagination = { ...state.pagination, ...pagination };
  },
  
  // Añadir un activo
  ADD_ASSET(state, asset) {
    state.assets.push(asset);
  },
  
  // Actualizar un activo
  UPDATE_ASSET(state, updatedAsset) {
    const index = state.assets.findIndex(asset => asset.id === updatedAsset.id);
    if (index !== -1) {
      state.assets.splice(index, 1, updatedAsset);
    }
  },
  
  // Eliminar un activo
  DELETE_ASSET(state, assetId) {
    state.assets = state.assets.filter(asset => asset.id !== assetId);
  },
  
  // Añadir una categoría
  ADD_CATEGORY(state, category) {
    state.categories.push(category);
  },
  
  // Actualizar una categoría
  UPDATE_CATEGORY(state, updatedCategory) {
    const index = state.categories.findIndex(category => category.id === updatedCategory.id);
    if (index !== -1) {
      state.categories.splice(index, 1, updatedCategory);
    }
  },
  
  // Eliminar una categoría
  DELETE_CATEGORY(state, categoryId) {
    state.categories = state.categories.filter(category => category.id !== categoryId);
  },
  
  // Añadir una ubicación
  ADD_LOCATION(state, location) {
    state.locations.push(location);
  },
  
  // Actualizar una ubicación
  UPDATE_LOCATION(state, updatedLocation) {
    const index = state.locations.findIndex(location => location.id === updatedLocation.id);
    if (index !== -1) {
      state.locations.splice(index, 1, updatedLocation);
    }
  },
  
  // Eliminar una ubicación
  DELETE_LOCATION(state, locationId) {
    state.locations = state.locations.filter(location => location.id !== locationId);
  },
  
  // Añadir un estado
  ADD_STATUS(state, status) {
    state.statuses.push(status);
  },
  
  // Actualizar un estado
  UPDATE_STATUS(state, updatedStatus) {
    const index = state.statuses.findIndex(status => status.id === updatedStatus.id);
    if (index !== -1) {
      state.statuses.splice(index, 1, updatedStatus);
    }
  },
  
  // Eliminar un estado
  DELETE_STATUS(state, statusId) {
    state.statuses = state.statuses.filter(status => status.id !== statusId);
  },
  
  // Añadir un movimiento
  ADD_MOVEMENT(state, movement) {
    state.movements.push(movement);
  }
};

// Acciones
const actions = {
  // Cargar todos los activos
  async fetchAssets({ commit }, params = {}) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getAssets(params);
      commit('SET_ASSETS', response.data);
      
      // Si la respuesta incluye metadatos de paginación
      if (response.meta && response.meta.pagination) {
        commit('SET_PAGINATION', response.meta.pagination);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar los activos');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Obtener un activo por ID
  async fetchAssetById({ commit }, assetId) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getAssetById(assetId);
      // No reemplazamos todo el array de activos, solo actualizamos uno
      commit('UPDATE_ASSET', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar el activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Crear un nuevo activo
  async createAsset({ commit }, assetData) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.createAsset(assetData);
      commit('ADD_ASSET', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al crear el activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Actualizar un activo existente
  async updateAsset({ commit }, { id, data }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.updateAsset(id, data);
      commit('UPDATE_ASSET', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al actualizar el activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Eliminar un activo
  async deleteAsset({ commit }, assetId) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      await api.inventory.deleteAsset(assetId);
      commit('DELETE_ASSET', assetId);
      return true;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al eliminar el activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Asignar activo a un usuario
  async assignAsset({ commit }, { assetId, userId, notes }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.assignAsset(assetId, { userId, notes });
      
      // Actualizar el activo
      commit('UPDATE_ASSET', response.data.asset);
      
      // Añadir el movimiento
      if (response.data.movement) {
        commit('ADD_MOVEMENT', response.data.movement);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al asignar el activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Cambiar estado de un activo
  async changeAssetStatus({ commit }, { assetId, statusId, notes }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.changeAssetStatus(assetId, { statusId, notes });
      
      // Actualizar el activo
      commit('UPDATE_ASSET', response.data.asset);
      
      // Añadir el movimiento
      if (response.data.movement) {
        commit('ADD_MOVEMENT', response.data.movement);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cambiar el estado del activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Cambiar ubicación de un activo
  async changeAssetLocation({ commit }, { assetId, locationId, notes }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.changeAssetLocation(assetId, { locationId, notes });
      
      // Actualizar el activo
      commit('UPDATE_ASSET', response.data.asset);
      
      // Añadir el movimiento
      if (response.data.movement) {
        commit('ADD_MOVEMENT', response.data.movement);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cambiar la ubicación del activo');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Cargar historial de movimientos de un activo
  async fetchAssetMovements({ commit }, assetId) {
    commit('SET_LOADING', { resource: 'movements', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getAssetMovements(assetId);
      
      // Solo establece los movimientos para este activo, no todos
      const movements = response.data;
      
      // En una implementación real, deberíamos manejar cómo se combinan los movimientos
      // existentes con los nuevos. Aquí simplemente los añadimos.
      movements.forEach(movement => {
        commit('ADD_MOVEMENT', movement);
      });
      
      return movements;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar el historial de movimientos');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'movements', isLoading: false });
    }
  },
  
  // Cargar todos los movimientos
  async fetchAllMovements({ commit }, params = {}) {
    commit('SET_LOADING', { resource: 'movements', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getAllMovements(params);
      commit('SET_MOVEMENTS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar los movimientos');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'movements', isLoading: false });
    }
  },
  
  // Cargar todas las categorías
  async fetchCategories({ commit }) {
    commit('SET_LOADING', { resource: 'categories', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getCategories();
      commit('SET_CATEGORIES', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar las categorías');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'categories', isLoading: false });
    }
  },
  
  // Crear una nueva categoría
  async createCategory({ commit }, categoryData) {
    commit('SET_LOADING', { resource: 'categories', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.createCategory(categoryData);
      commit('ADD_CATEGORY', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al crear la categoría');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'categories', isLoading: false });
    }
  },
  
  // Actualizar una categoría existente
  async updateCategory({ commit }, { id, data }) {
    commit('SET_LOADING', { resource: 'categories', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.updateCategory(id, data);
      commit('UPDATE_CATEGORY', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al actualizar la categoría');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'categories', isLoading: false });
    }
  },
  
  // Eliminar una categoría
  async deleteCategory({ commit }, categoryId) {
    commit('SET_LOADING', { resource: 'categories', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      await api.inventory.deleteCategory(categoryId);
      commit('DELETE_CATEGORY', categoryId);
      return true;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al eliminar la categoría');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'categories', isLoading: false });
    }
  },
  
  // Cargar todas las ubicaciones
  async fetchLocations({ commit }) {
    commit('SET_LOADING', { resource: 'locations', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getLocations();
      commit('SET_LOCATIONS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar las ubicaciones');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'locations', isLoading: false });
    }
  },
  
  // Crear una nueva ubicación
  async createLocation({ commit }, locationData) {
    commit('SET_LOADING', { resource: 'locations', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.createLocation(locationData);
      commit('ADD_LOCATION', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al crear la ubicación');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'locations', isLoading: false });
    }
  },
  
  // Actualizar una ubicación existente
  async updateLocation({ commit }, { id, data }) {
    commit('SET_LOADING', { resource: 'locations', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.updateLocation(id, data);
      commit('UPDATE_LOCATION', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al actualizar la ubicación');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'locations', isLoading: false });
    }
  },
  
  // Eliminar una ubicación
  async deleteLocation({ commit }, locationId) {
    commit('SET_LOADING', { resource: 'locations', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      await api.inventory.deleteLocation(locationId);
      commit('DELETE_LOCATION', locationId);
      return true;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al eliminar la ubicación');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'locations', isLoading: false });
    }
  },
  
  // Cargar todos los estados
  async fetchStatuses({ commit }) {
    commit('SET_LOADING', { resource: 'statuses', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getStatuses();
      commit('SET_STATUSES', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar los estados');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'statuses', isLoading: false });
    }
  },
  
  // Crear un nuevo estado
  async createStatus({ commit }, statusData) {
    commit('SET_LOADING', { resource: 'statuses', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.createStatus(statusData);
      commit('ADD_STATUS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al crear el estado');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'statuses', isLoading: false });
    }
  },
  
  // Actualizar un estado existente
  async updateStatus({ commit }, { id, data }) {
    commit('SET_LOADING', { resource: 'statuses', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.updateStatus(id, data);
      commit('UPDATE_STATUS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al actualizar el estado');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'statuses', isLoading: false });
    }
  },
  
  // Eliminar un estado
  async deleteStatus({ commit }, statusId) {
    commit('SET_LOADING', { resource: 'statuses', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      await api.inventory.deleteStatus(statusId);
      commit('DELETE_STATUS', statusId);
      return true;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al eliminar el estado');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'statuses', isLoading: false });
    }
  },
  
  // Cargar usuarios
  async fetchUsers({ commit }) {
    commit('SET_LOADING', { resource: 'users', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.users.getUsers();
      commit('SET_USERS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar los usuarios');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'users', isLoading: false });
    }
  },
  
  // Cargar proveedores
  async fetchSuppliers({ commit }) {
    commit('SET_LOADING', { resource: 'suppliers', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.getSuppliers();
      commit('SET_SUPPLIERS', response.data);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al cargar los proveedores');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'suppliers', isLoading: false });
    }
  },
  
  // Aplicar filtros
  setFilters({ commit }, filters) {
    commit('SET_FILTERS', filters);
  },
  
  // Exportar inventario
  async exportInventory({ commit }, { format, filters }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      // Formato puede ser 'csv', 'xlsx', etc.
      const response = await api.inventory.exportInventory(format, filters);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al exportar el inventario');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Importar inventario
  async importInventory({ commit }, { file, options }) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.importInventory(file, options);
      
      // Si la importación fue exitosa, refrescamos los activos
      if (response.data.success) {
        const assetsResponse = await api.inventory.getAssets();
        commit('SET_ASSETS', assetsResponse.data);
      }
      
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al importar el inventario');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  },
  
  // Generar reporte de inventario
  async generateInventoryReport({ commit }, reportParams) {
    commit('SET_LOADING', { resource: 'assets', isLoading: true });
    commit('CLEAR_ERROR');
    
    try {
      const response = await api.inventory.generateReport(reportParams);
      return response.data;
    } catch (error) {
      commit('SET_ERROR', error.message || 'Error al generar el reporte');
      throw error;
    } finally {
      commit('SET_LOADING', { resource: 'assets', isLoading: false });
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
