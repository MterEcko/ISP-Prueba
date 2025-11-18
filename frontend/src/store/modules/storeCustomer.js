import storeCustomerService from '@/services/storeCustomer.service';

const state = {
  customers: [],
  currentCustomer: null,
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  filters: {
    status: '',
    country: '',
    search: ''
  },
  pagination: {
    page: 1,
    limit: 50,
    total: 0
  },
  stats: {
    salesStats: null,
    customerStats: null
  }
};

const getters = {
  // Customers
  allCustomers: (state) => state.customers,
  activeCustomers: (state) => state.customers.filter(c => c.status === 'active'),
  totalCustomers: (state) => state.pagination.total,

  // Orders
  allOrders: (state) => state.orders,
  pendingOrders: (state) => state.orders.filter(o => o.status === 'pending'),
  completedOrders: (state) => state.orders.filter(o => o.status === 'completed'),

  // Current items
  currentCustomer: (state) => state.currentCustomer,
  currentOrder: (state) => state.currentOrder,

  // Stats
  salesStats: (state) => state.stats.salesStats,
  customerStats: (state) => state.stats.customerStats,

  // Loading
  isLoading: (state) => state.loading,
  error: (state) => state.error
};

const mutations = {
  // Customers
  SET_CUSTOMERS(state, customers) {
    state.customers = customers;
  },

  SET_CURRENT_CUSTOMER(state, customer) {
    state.currentCustomer = customer;
  },

  ADD_CUSTOMER(state, customer) {
    state.customers.unshift(customer);
  },

  UPDATE_CUSTOMER(state, updatedCustomer) {
    const index = state.customers.findIndex(c => c.id === updatedCustomer.id);
    if (index !== -1) {
      state.customers.splice(index, 1, updatedCustomer);
    }
  },

  REMOVE_CUSTOMER(state, customerId) {
    state.customers = state.customers.filter(c => c.id !== customerId);
  },

  // Orders
  SET_ORDERS(state, orders) {
    state.orders = orders;
  },

  SET_CURRENT_ORDER(state, order) {
    state.currentOrder = order;
  },

  ADD_ORDER(state, order) {
    state.orders.unshift(order);
  },

  UPDATE_ORDER(state, updatedOrder) {
    const index = state.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      state.orders.splice(index, 1, updatedOrder);
    }
  },

  // UI State
  SET_LOADING(state, loading) {
    state.loading = loading;
  },

  SET_ERROR(state, error) {
    state.error = error;
  },

  SET_FILTERS(state, filters) {
    state.filters = { ...state.filters, ...filters };
  },

  SET_PAGINATION(state, pagination) {
    state.pagination = { ...state.pagination, ...pagination };
  },

  // Stats
  SET_SALES_STATS(state, stats) {
    state.stats.salesStats = stats;
  },

  SET_CUSTOMER_STATS(state, stats) {
    state.stats.customerStats = stats;
  }
};

const actions = {
  // ===== CUSTOMERS =====

  /**
   * Fetch all customers
   */
  async fetchCustomers({ commit, state }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const filters = {
        ...state.filters,
        limit: state.pagination.limit,
        offset: (state.pagination.page - 1) * state.pagination.limit
      };

      const response = await storeCustomerService.getCustomers(filters);

      if (response.success) {
        commit('SET_CUSTOMERS', response.data);
        commit('SET_PAGINATION', response.pagination);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching customers:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Fetch customer by ID
   */
  async fetchCustomerById({ commit }, customerId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.getCustomerById(customerId);

      if (response.success) {
        commit('SET_CURRENT_CUSTOMER', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching customer:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Create customer
   */
  async createCustomer({ commit }, customerData) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.createCustomer(customerData);

      if (response.success) {
        commit('ADD_CUSTOMER', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error creating customer:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Update customer
   */
  async updateCustomer({ commit }, { customerId, updates }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.updateCustomer(customerId, updates);

      if (response.success) {
        commit('UPDATE_CUSTOMER', response.data);
        if (state.currentCustomer?.id === customerId) {
          commit('SET_CURRENT_CUSTOMER', response.data);
        }
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error updating customer:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Delete customer
   */
  async deleteCustomer({ commit }, customerId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.deleteCustomer(customerId);

      if (response.success) {
        commit('REMOVE_CUSTOMER', customerId);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error deleting customer:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Fetch customer statistics
   */
  async fetchCustomerStats({ commit }, customerId) {
    try {
      const response = await storeCustomerService.getCustomerStats(customerId);

      if (response.success) {
        commit('SET_CUSTOMER_STATS', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      throw error;
    }
  },

  // ===== ORDERS =====

  /**
   * Fetch all orders
   */
  async fetchOrders({ commit, state }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const filters = {
        ...state.filters,
        limit: state.pagination.limit,
        offset: (state.pagination.page - 1) * state.pagination.limit
      };

      const response = await storeCustomerService.getOrders(filters);

      if (response.success) {
        commit('SET_ORDERS', response.data);
        commit('SET_PAGINATION', response.pagination);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching orders:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Fetch order by ID
   */
  async fetchOrderById({ commit }, orderId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.getOrderById(orderId);

      if (response.success) {
        commit('SET_CURRENT_ORDER', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching order:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Create order
   */
  async createOrder({ commit }, { customerId, orderData }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.createOrder(customerId, orderData);

      if (response.success) {
        commit('ADD_ORDER', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error creating order:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Update order status
   */
  async updateOrderStatus({ commit }, { orderId, status, updates }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await storeCustomerService.updateOrderStatus(orderId, status, updates);

      if (response.success) {
        commit('UPDATE_ORDER', response.data);
        if (state.currentOrder?.id === orderId) {
          commit('SET_CURRENT_ORDER', response.data);
        }
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error updating order status:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Cancel order
   */
  // eslint-disable-next-line no-unused-vars
  async cancelOrder({ commit, dispatch }, { orderId, reason }) {
    try {
      const response = await storeCustomerService.cancelOrder(orderId, reason);

      if (response.success) {
        await dispatch('fetchOrderById', orderId);
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  },

  /**
   * Refund order
   */
  // eslint-disable-next-line no-unused-vars
  async refundOrder({ commit, dispatch }, { orderId, reason }) {
    try {
      const response = await storeCustomerService.refundOrder(orderId, reason);

      if (response.success) {
        await dispatch('fetchOrderById', orderId);
      }
    } catch (error) {
      console.error('Error refunding order:', error);
      throw error;
    }
  },

  // ===== STATS =====

  /**
   * Fetch sales statistics
   */
  async fetchSalesStats({ commit }, filters = {}) {
    try {
      const response = await storeCustomerService.getSalesStats(filters);

      if (response.success) {
        commit('SET_SALES_STATS', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching sales stats:', error);
      throw error;
    }
  },

  // ===== FILTERS =====

  /**
   * Update filters
   */
  updateFilters({ commit, dispatch }, filters) {
    commit('SET_FILTERS', filters);
    commit('SET_PAGINATION', { page: 1 }); // Reset to page 1
    dispatch('fetchCustomers');
  },

  /**
   * Update pagination
   */
  updatePagination({ commit, dispatch }, pagination) {
    commit('SET_PAGINATION', pagination);
    dispatch('fetchCustomers');
  },

  /**
   * Clear filters
   */
  clearFilters({ commit, dispatch }) {
    commit('SET_FILTERS', {
      status: '',
      country: '',
      search: ''
    });
    commit('SET_PAGINATION', { page: 1 });
    dispatch('fetchCustomers');
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
