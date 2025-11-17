import api from './api';

const storeCustomerService = {
  // ===== CUSTOMERS =====

  /**
   * Get all customers
   */
  async getCustomers(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.country) params.append('country', filters.country);
    if (filters.emailVerified !== undefined) params.append('emailVerified', filters.emailVerified);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/store/customers?${params.toString()}`);
    return response.data;
  },

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId) {
    const response = await api.get(`/store/customers/${customerId}`);
    return response.data;
  },

  /**
   * Create new customer
   */
  async createCustomer(customerData) {
    const response = await api.post('/store/customers', customerData);
    return response.data;
  },

  /**
   * Update customer
   */
  async updateCustomer(customerId, updates) {
    const response = await api.put(`/store/customers/${customerId}`, updates);
    return response.data;
  },

  /**
   * Delete customer
   */
  async deleteCustomer(customerId) {
    const response = await api.delete(`/store/customers/${customerId}`);
    return response.data;
  },

  /**
   * Get customer purchase history
   */
  async getCustomerPurchases(customerId, filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/store/customers/${customerId}/purchases?${params.toString()}`);
    return response.data;
  },

  /**
   * Get customer statistics
   */
  async getCustomerStats(customerId) {
    const response = await api.get(`/store/customers/${customerId}/stats`);
    return response.data;
  },

  /**
   * Get top customers
   */
  async getTopCustomers(limit = 10) {
    const response = await api.get(`/store/customers/top?limit=${limit}`);
    return response.data;
  },

  // ===== ORDERS =====

  /**
   * Get all orders
   */
  async getOrders(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.get(`/store/orders?${params.toString()}`);
    return response.data;
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    const response = await api.get(`/store/orders/${orderId}`);
    return response.data;
  },

  /**
   * Create new order
   */
  async createOrder(customerId, orderData) {
    const response = await api.post('/store/orders', {
      customerId,
      ...orderData
    });
    return response.data;
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, updates = {}) {
    const response = await api.put(`/store/orders/${orderId}/status`, {
      status,
      ...updates
    });
    return response.data;
  },

  /**
   * Process payment
   */
  async processPayment(orderId, paymentData) {
    const response = await api.post(`/store/orders/${orderId}/payment`, paymentData);
    return response.data;
  },

  /**
   * Cancel order
   */
  async cancelOrder(orderId, reason) {
    const response = await api.post(`/store/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Refund order
   */
  async refundOrder(orderId, reason) {
    const response = await api.post(`/store/orders/${orderId}/refund`, { reason });
    return response.data;
  },

  /**
   * Get sales statistics
   */
  async getSalesStats(filters = {}) {
    const params = new URLSearchParams();

    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await api.get(`/store/sales/stats?${params.toString()}`);
    return response.data;
  },

  // ===== HELPER METHODS =====

  /**
   * Format currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  },

  /**
   * Get status badge color
   */
  getStatusColor(status) {
    const colors = {
      // Customer status
      active: 'success',
      inactive: 'secondary',
      suspended: 'warning',
      banned: 'danger',

      // Order status
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger',
      refunded: 'secondary',
      cancelled: 'dark',

      // Payment status
      unpaid: 'warning',
      paid: 'success',
      partially_paid: 'info'
    };

    return colors[status] || 'secondary';
  },

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      // Customer status
      active: 'Activo',
      inactive: 'Inactivo',
      suspended: 'Suspendido',
      banned: 'Bloqueado',

      // Order status
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completada',
      failed: 'Fallida',
      refunded: 'Reembolsada',
      cancelled: 'Cancelada',

      // Payment status
      unpaid: 'Sin pagar',
      paid: 'Pagada',
      partially_paid: 'Pago parcial'
    };

    return labels[status] || status;
  },

  /**
   * Get product type label
   */
  getProductTypeLabel(type) {
    const labels = {
      plugin: 'Plugin',
      license: 'Licencia',
      bundle: 'Paquete',
      subscription: 'Suscripción'
    };

    return labels[type] || type;
  },

  /**
   * Format date
   */
  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date with time
   */
  formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default storeCustomerService;
