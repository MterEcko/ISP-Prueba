<template>
  <div class="store-dashboard-container">
    <div class="page-header">
      <h1>Dashboard de Ganancias</h1>
      <div class="date-filters">
        <select v-model="dateRange" @change="loadStats" class="date-select">
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Último año</option>
          <option value="all">Todo el tiempo</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando estadísticas...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- Tarjetas de estadísticas principales -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-label">Ingresos Totales</div>
            <div class="stat-value">{{ formatCurrency(salesStats?.totalSales || 0) }}</div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-label">Órdenes Completadas</div>
            <div class="stat-value">{{ salesStats?.orderCount || 0 }}</div>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <div class="stat-label">Ticket Promedio</div>
            <div class="stat-value">{{ formatCurrency(salesStats?.averageOrderValue || 0) }}</div>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-label">Clientes Activos</div>
            <div class="stat-value">{{ activeCustomersCount }}</div>
          </div>
        </div>
      </div>

      <!-- Gráfica de ventas mensuales -->
      <div class="chart-section">
        <div class="section-header">
          <h2>Ventas Mensuales</h2>
        </div>
        <div class="chart-container">
          <div v-if="salesByMonth.length > 0" class="bar-chart">
            <div
              v-for="(month, index) in salesByMonth"
              :key="index"
              class="bar-item"
            >
              <div class="bar-wrapper">
                <div
                  class="bar"
                  :style="{
                    height: calculateBarHeight(month.totalSales) + '%'
                  }"
                  :title="`${month.month}: ${formatCurrency(month.totalSales)}`"
                ></div>
              </div>
              <div class="bar-label">
                {{ formatMonthLabel(month.month) }}
              </div>
              <div class="bar-value">
                {{ formatCurrency(month.totalSales) }}
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            No hay datos de ventas disponibles
          </div>
        </div>
      </div>

      <!-- Productos más vendidos -->
      <div class="products-section">
        <div class="section-header">
          <h2>Productos Más Vendidos</h2>
        </div>
        <div v-if="topProducts.length > 0" class="products-grid">
          <div
            v-for="(product, index) in topProducts"
            :key="index"
            class="product-card"
          >
            <div class="product-rank">#{index + 1}</div>
            <div class="product-info">
              <div class="product-name">{{ product.productName }}</div>
              <div class="product-type">{{ getProductTypeLabel(product.productType) }}</div>
            </div>
            <div class="product-stats">
              <div class="product-stat">
                <span class="stat-label">Vendidos:</span>
                <span class="stat-value">{{ product.totalQuantity }}</span>
              </div>
              <div class="product-stat">
                <span class="stat-label">Ingresos:</span>
                <span class="stat-value">{{ formatCurrency(product.totalRevenue) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          No hay datos de productos disponibles
        </div>
      </div>

      <!-- Clientes top -->
      <div class="customers-section">
        <div class="section-header">
          <h2>Mejores Clientes</h2>
        </div>
        <div v-if="topCustomers.length > 0" class="customers-list">
          <div
            v-for="(customer, index) in topCustomers.slice(0, 5)"
            :key="customer.id"
            class="customer-item"
          >
            <div class="customer-rank">#{index + 1}</div>
            <div class="customer-info">
              <div class="customer-name">
                {{ customer.firstName }} {{ customer.lastName }}
              </div>
              <div class="customer-email">{{ customer.email }}</div>
            </div>
            <div class="customer-stats">
              <div class="customer-stat">
                <span class="stat-label">Compras:</span>
                <span class="stat-value">{{ customer.totalPurchases }}</span>
              </div>
              <div class="customer-stat primary">
                <span class="stat-value">{{ formatCurrency(customer.totalSpent) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          No hay datos de clientes disponibles
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import storeCustomerService from '@/services/storeCustomer.service';

export default {
  name: 'StoreDashboard',

  data() {
    return {
      dateRange: '90',
      loading: false,
      salesStats: null,
      topCustomers: []
    };
  },

  computed: {
    ...mapGetters('storeCustomer', ['activeCustomers']),

    activeCustomersCount() {
      return this.topCustomers.filter(c => c.status === 'active').length;
    },

    salesByMonth() {
      return this.salesStats?.salesByMonth || [];
    },

    topProducts() {
      return this.salesStats?.topProducts || [];
    },

    maxSales() {
      if (this.salesByMonth.length === 0) return 0;
      return Math.max(...this.salesByMonth.map(m => parseFloat(m.totalSales)));
    }
  },

  mounted() {
    this.loadStats();
    this.loadTopCustomers();
  },

  methods: {
    ...mapActions('storeCustomer', ['fetchSalesStats']),

    async loadStats() {
      this.loading = true;

      try {
        const filters = this.getDateFilters();
        const response = await storeCustomerService.getSalesStats(filters);

        if (response.success) {
          this.salesStats = response.data;
        }
      } catch (error) {
        console.error('Error loading sales stats:', error);
        this.$notify({ type: 'error', message: 'Error al cargar estadísticas' });
      } finally {
        this.loading = false;
      }
    },

    async loadTopCustomers() {
      try {
        const response = await storeCustomerService.getTopCustomers(10);

        if (response.success) {
          this.topCustomers = response.data;
        }
      } catch (error) {
        console.error('Error loading top customers:', error);
      }
    },

    getDateFilters() {
      const filters = {};

      if (this.dateRange !== 'all') {
        const days = parseInt(this.dateRange);
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);

        filters.dateFrom = dateFrom.toISOString().split('T')[0];
        filters.dateTo = dateTo.toISOString().split('T')[0];
      }

      return filters;
    },

    calculateBarHeight(value) {
      if (!this.maxSales) return 0;
      return (parseFloat(value) / this.maxSales) * 100;
    },

    formatMonthLabel(month) {
      const [year, monthNum] = month.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${months[parseInt(monthNum) - 1]} ${year.slice(2)}`;
    },

    formatCurrency(amount) {
      return storeCustomerService.formatCurrency(amount);
    },

    getProductTypeLabel(type) {
      return storeCustomerService.getProductTypeLabel(type);
    }
  }
};
</script>

<style scoped>
.store-dashboard-container {
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

.date-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
  border-left: 4px solid;
}

.stat-card.primary {
  border-left-color: #3498db;
}

.stat-card.success {
  border-left-color: #2ecc71;
}

.stat-card.info {
  border-left-color: #9b59b6;
}

.stat-card.warning {
  border-left-color: #f39c12;
}

.stat-icon {
  font-size: 48px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 600;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
}

.chart-section,
.products-section,
.customers-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 25px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.chart-container {
  height: 300px;
}

.bar-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 250px;
  gap: 10px;
  padding: 0 10px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 80px;
}

.bar-wrapper {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 10px;
}

.bar {
  width: 100%;
  background: linear-gradient(to top, #3498db, #5dade2);
  border-radius: 4px 4px 0 0;
  transition: all 0.3s;
  cursor: pointer;
  min-height: 5px;
}

.bar:hover {
  opacity: 0.8;
}

.bar-label {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
  white-space: nowrap;
}

.bar-value {
  font-size: 11px;
  font-weight: 600;
  color: #2c3e50;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.product-rank {
  font-size: 24px;
  font-weight: 700;
  color: #3498db;
  min-width: 40px;
  text-align: center;
}

.product-info {
  flex: 1;
}

.product-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.product-type {
  font-size: 12px;
  color: #666;
}

.product-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.product-stat {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.product-stat .stat-label {
  color: #666;
}

.product-stat .stat-value {
  font-weight: 600;
}

.customers-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.customer-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.customer-rank {
  font-size: 20px;
  font-weight: 700;
  color: #f39c12;
  min-width: 40px;
  text-align: center;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.customer-email {
  font-size: 12px;
  color: #666;
}

.customer-stats {
  display: flex;
  gap: 20px;
}

.customer-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.customer-stat .stat-label {
  font-size: 11px;
  color: #666;
}

.customer-stat .stat-value {
  font-weight: 600;
  font-size: 16px;
}

.customer-stat.primary .stat-value {
  color: #3498db;
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

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
