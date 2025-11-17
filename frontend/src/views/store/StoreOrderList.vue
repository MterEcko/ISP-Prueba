<template>
  <div class="store-orders-container">
    <div class="page-header">
      <h1>Órdenes del Store</h1>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-row">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          placeholder="Buscar por número de orden o transacción..."
          class="search-input"
        />

        <select v-model="statusFilter" @change="applyFilters" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="processing">Procesando</option>
          <option value="completed">Completada</option>
          <option value="failed">Fallida</option>
          <option value="refunded">Reembolsada</option>
          <option value="cancelled">Cancelada</option>
        </select>

        <select v-model="paymentStatusFilter" @change="applyFilters" class="filter-select">
          <option value="">Estado de pago</option>
          <option value="unpaid">Sin pagar</option>
          <option value="paid">Pagada</option>
          <option value="partially_paid">Pago parcial</option>
          <option value="refunded">Reembolsada</option>
        </select>

        <button @click="clearFilters" class="btn btn-secondary">
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-label">Total Órdenes</div>
        <div class="stat-value">{{ totalOrders }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pendientes</div>
        <div class="stat-value">{{ pendingOrdersCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completadas</div>
        <div class="stat-value">{{ completedOrdersCount }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando órdenes...</p>
    </div>

    <!-- Tabla de órdenes -->
    <div v-else-if="orders.length > 0" class="orders-table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>
              <div class="order-number">{{ order.orderNumber }}</div>
            </td>
            <td>
              <div v-if="order.customer">
                {{ order.customer.firstName }} {{ order.customer.lastName }}
                <div class="customer-email">{{ order.customer.email }}</div>
              </div>
            </td>
            <td>{{ formatDateTime(order.createdAt) }}</td>
            <td>
              <span :class="['status-badge', getStatusColor(order.status)]">
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            <td>
              <span :class="['status-badge', getStatusColor(order.paymentStatus)]">
                {{ getStatusLabel(order.paymentStatus) }}
              </span>
            </td>
            <td class="order-total">
              {{ formatCurrency(order.total, order.currency) }}
            </td>
            <td>
              <div class="actions">
                <button
                  @click="viewOrder(order)"
                  class="btn-icon"
                  title="Ver detalles"
                >
                  👁️
                </button>
                <button
                  v-if="order.status === 'pending'"
                  @click="processOrder(order)"
                  class="btn-icon"
                  title="Procesar"
                >
                  ✅
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginación -->
      <div class="pagination">
        <button
          @click="previousPage"
          :disabled="pagination.page === 1"
          class="btn btn-secondary"
        >
          Anterior
        </button>
        <span class="pagination-info">
          Página {{ pagination.page }} de {{ pagination.pages }}
        </span>
        <button
          @click="nextPage"
          :disabled="pagination.page === pagination.pages"
          class="btn btn-secondary"
        >
          Siguiente
        </button>
      </div>
    </div>

    <div v-else class="no-orders">
      No se encontraron órdenes
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import storeCustomerService from '@/services/storeCustomer.service';

export default {
  name: 'StoreOrderList',

  data() {
    return {
      searchQuery: '',
      statusFilter: '',
      paymentStatusFilter: '',
      searchTimeout: null
    };
  },

  computed: {
    ...mapState('storeCustomer', ['orders', 'loading', 'pagination']),
    ...mapGetters('storeCustomer', ['allOrders', 'pendingOrders', 'completedOrders']),

    totalOrders() {
      return this.pagination.total || 0;
    },

    pendingOrdersCount() {
      return this.pendingOrders.length;
    },

    completedOrdersCount() {
      return this.completedOrders.length;
    }
  },

  mounted() {
    this.fetchOrders();
  },

  methods: {
    ...mapActions('storeCustomer', ['fetchOrders', 'updateFilters', 'updatePagination']),

    handleSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.applyFilters();
      }, 500);
    },

    applyFilters() {
      this.updateFilters({
        search: this.searchQuery,
        status: this.statusFilter,
        paymentStatus: this.paymentStatusFilter
      });
    },

    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.paymentStatusFilter = '';
      this.updateFilters({
        search: '',
        status: '',
        paymentStatus: ''
      });
    },

    nextPage() {
      this.updatePagination({
        page: this.pagination.page + 1
      });
    },

    previousPage() {
      this.updatePagination({
        page: this.pagination.page - 1
      });
    },

    viewOrder(order) {
      this.$router.push(`/store/orders/${order.id}`);
    },

    processOrder(order) {
      // TODO: Implementar procesamiento de orden
      console.log('Process order:', order);
    },

    formatCurrency(amount, currency) {
      return storeCustomerService.formatCurrency(amount, currency);
    },

    formatDateTime(date) {
      return storeCustomerService.formatDateTime(date);
    },

    getStatusColor(status) {
      return storeCustomerService.getStatusColor(status);
    },

    getStatusLabel(status) {
      return storeCustomerService.getStatusLabel(status);
    }
  }
};
</script>

<style scoped>
.store-orders-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filters-row {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #2c3e50;
}

.orders-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table thead {
  background: #f8f9fa;
}

.orders-table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  font-size: 13px;
  text-transform: uppercase;
  color: #666;
}

.orders-table td {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.order-number {
  font-weight: 600;
  font-family: monospace;
}

.customer-email {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.order-total {
  font-weight: 600;
  font-size: 16px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
}

.status-badge.info {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.warning {
  background: #fff3cd;
  color: #856404;
}

.status-badge.danger {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.secondary {
  background: #e2e3e5;
  color: #383d41;
}

.status-badge.dark {
  background: #d6d8db;
  color: #1b1e21;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.no-orders {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  color: #999;
}
</style>
