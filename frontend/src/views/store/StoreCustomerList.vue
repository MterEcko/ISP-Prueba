<template>
  <div class="store-customers-container">
    <div class="page-header">
      <h1>Clientes del Store</h1>
      <button @click="showNewCustomerDialog = true" class="btn btn-primary">
        + Nuevo Cliente
      </button>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="filters-section">
      <div class="filters-row">
        <input
          v-model="searchQuery"
          @input="handleSearch"
          placeholder="Buscar por nombre, email, empresa..."
          class="search-input"
        />

        <select v-model="statusFilter" @change="applyFilters" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="suspended">Suspendido</option>
          <option value="banned">Bloqueado</option>
        </select>

        <button @click="clearFilters" class="btn btn-secondary">
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-label">Total Clientes</div>
        <div class="stat-value">{{ totalCustomers }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Clientes Activos</div>
        <div class="stat-value">{{ activeCustomersCount }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando clientes...</p>
    </div>

    <!-- Tabla de clientes -->
    <div v-else-if="customers.length > 0" class="customers-table-container">
      <table class="customers-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Empresa</th>
            <th>País</th>
            <th>Estado</th>
            <th>Compras</th>
            <th>Total Gastado</th>
            <th>Última Compra</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in customers" :key="customer.id">
            <td>
              <div class="customer-name">
                {{ customer.firstName }} {{ customer.lastName }}
              </div>
            </td>
            <td>{{ customer.email }}</td>
            <td>{{ customer.companyName || '-' }}</td>
            <td>{{ customer.country }}</td>
            <td>
              <span :class="['status-badge', getStatusColor(customer.status)]">
                {{ getStatusLabel(customer.status) }}
              </span>
            </td>
            <td class="text-center">{{ customer.totalPurchases || 0 }}</td>
            <td>{{ formatCurrency(customer.totalSpent || 0, customer.currency || 'USD') }}</td>
            <td>{{ formatDate(customer.lastPurchaseAt) }}</td>
            <td>
              <div class="actions">
                <button
                  @click="viewCustomer(customer)"
                  class="btn-icon"
                  title="Ver detalles"
                >
                  👁️
                </button>
                <button
                  @click="editCustomer(customer)"
                  class="btn-icon"
                  title="Editar"
                >
                  ✏️
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

    <div v-else class="no-customers">
      No se encontraron clientes
    </div>

    <!-- Dialog para nuevo cliente (placeholder) -->
    <div v-if="showNewCustomerDialog" class="dialog-overlay" @click.self="showNewCustomerDialog = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>Nuevo Cliente del Store</h3>
          <button @click="showNewCustomerDialog = false" class="btn-close">✕</button>
        </div>
        <div class="dialog-body">
          <p>Formulario de nuevo cliente próximamente...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import storeCustomerService from '@/services/storeCustomer.service';

export default {
  name: 'StoreCustomerList',

  data() {
    return {
      searchQuery: '',
      statusFilter: '',
      showNewCustomerDialog: false,
      searchTimeout: null
    };
  },

  computed: {
    ...mapState('storeCustomer', ['customers', 'loading', 'pagination']),
    ...mapGetters('storeCustomer', ['totalCustomers', 'activeCustomers']),

    activeCustomersCount() {
      return this.activeCustomers.length;
    }
  },

  mounted() {
    this.fetchCustomers();
  },

  methods: {
    ...mapActions('storeCustomer', ['fetchCustomers', 'updateFilters', 'updatePagination', 'clearFilters']),

    handleSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.applyFilters();
      }, 500);
    },

    applyFilters() {
      this.updateFilters({
        search: this.searchQuery,
        status: this.statusFilter
      });
    },

    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = '';
      this.updateFilters({
        search: '',
        status: ''
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

    viewCustomer(customer) {
      this.$router.push(`/store/customers/${customer.id}`);
    },

    editCustomer(customer) {
      this.$router.push(`/store/customers/${customer.id}/edit`);
    },

    formatCurrency(amount, currency) {
      return storeCustomerService.formatCurrency(amount, currency);
    },

    formatDate(date) {
      return storeCustomerService.formatDate(date);
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
.store-customers-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.customers-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
}

.customers-table thead {
  background: #f8f9fa;
}

.customers-table th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  font-size: 13px;
  text-transform: uppercase;
  color: #666;
}

.customers-table td {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.customer-name {
  font-weight: 600;
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

.status-badge.secondary {
  background: #e2e3e5;
  color: #383d41;
}

.status-badge.warning {
  background: #fff3cd;
  color: #856404;
}

.status-badge.danger {
  background: #f8d7da;
  color: #721c24;
}

.text-center {
  text-align: center;
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

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
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

.no-customers {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  color: #999;
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.dialog-body {
  padding: 20px;
}
</style>
