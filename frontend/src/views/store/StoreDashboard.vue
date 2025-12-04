<template>
  <div class="store-dashboard-container">
    <div class="page-header">
      <h1>📊 Dashboard del Plugin Store</h1>
      <div class="refresh-btn">
        <button @click="loadAllStats" :disabled="loading" class="btn-refresh">
          <span v-if="!loading">🔄 Actualizar</span>
          <span v-else>⏳ Cargando...</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando estadísticas del Store...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- Tarjetas de estadísticas principales -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">🧩</div>
          <div class="stat-info">
            <div class="stat-label">Plugins Disponibles</div>
            <div class="stat-value">{{ storeStats.totalPlugins || 0 }}</div>
            <div class="stat-sublabel">{{ storeStats.publishedPlugins || 0 }} publicados</div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">🔑</div>
          <div class="stat-info">
            <div class="stat-label">Licencias Activas</div>
            <div class="stat-value">{{ storeStats.activeLicenses || 0 }}</div>
            <div class="stat-sublabel">{{ storeStats.totalLicenses || 0 }} totales</div>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <div class="stat-label">Plugin Activations</div>
            <div class="stat-value">{{ storeStats.totalActivations || 0 }}</div>
            <div class="stat-sublabel">Este mes: {{ storeStats.activationsThisMonth || 0 }}</div>
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">💻</div>
          <div class="stat-info">
            <div class="stat-label">Instalaciones ISP</div>
            <div class="stat-value">{{ storeStats.totalInstallations || 0 }}</div>
            <div class="stat-sublabel">{{ storeStats.activeInstallations || 0 }} activas</div>
          </div>
        </div>
      </div>

      <!-- Distribución de Licencias -->
      <div class="chart-section">
        <div class="section-header">
          <h2>📈 Distribución de Licencias</h2>
        </div>
        <div class="license-distribution">
          <div
            v-for="license in licenseDistribution"
            :key="license.type"
            class="license-bar"
          >
            <div class="license-header">
              <span class="license-name">{{ license.name }}</span>
              <span class="license-count">{{ license.count }}</span>
            </div>
            <div class="license-progress">
              <div
                class="license-progress-bar"
                :style="{
                  width: calculatePercentage(license.count) + '%',
                  backgroundColor: license.color
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Plugins más populares -->
      <div class="products-section">
        <div class="section-header">
          <h2>🔥 Plugins Más Descargados</h2>
        </div>
        <div v-if="topPlugins.length > 0" class="products-grid">
          <div
            v-for="(plugin, index) in topPlugins"
            :key="plugin.id"
            class="product-card"
          >
            <div class="product-rank">#{{ index + 1 }}</div>
            <div class="product-info">
              <div class="product-name">{{ plugin.name }}</div>
              <div class="product-type">
                {{ getCategoryIcon(plugin.category) }} {{ getCategoryText(plugin.category) }}
              </div>
            </div>
            <div class="product-stats">
              <div class="product-stat">
                <span class="stat-label">Descargas:</span>
                <span class="stat-value">{{ plugin.downloadCount || 0 }}</span>
              </div>
              <div class="product-stat">
                <span class="stat-label">Activaciones:</span>
                <span class="stat-value">{{ plugin.activationCount || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          No hay datos de plugins disponibles
        </div>
      </div>

      <!-- Últimas activaciones -->
      <div class="customers-section">
        <div class="section-header">
          <h2>⚡ Últimas Activaciones</h2>
        </div>
        <div v-if="recentActivations.length > 0" class="activations-list">
          <div
            v-for="activation in recentActivations.slice(0, 10)"
            :key="activation.id"
            class="activation-item"
          >
            <div class="activation-icon">🔌</div>
            <div class="activation-info">
              <div class="activation-plugin">
                <strong>{{ activation.Plugin?.name || 'N/A' }}</strong>
              </div>
              <div class="activation-installation">
                {{ activation.Installation?.companyName || 'Unknown ISP' }}
              </div>
            </div>
            <div class="activation-stats">
              <div class="activation-date">
                {{ formatDate(activation.activatedAt) }}
              </div>
              <div class="activation-status" :class="getStatusClass(activation.status)">
                {{ activation.status }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          No hay activaciones registradas
        </div>
      </div>

      <!-- Plugins por categoría -->
      <div class="categories-section">
        <div class="section-header">
          <h2>📦 Plugins por Categoría</h2>
        </div>
        <div class="categories-grid">
          <div
            v-for="category in pluginsByCategory"
            :key="category.category"
            class="category-card"
          >
            <div class="category-icon">{{ getCategoryIcon(category.category) }}</div>
            <div class="category-name">{{ getCategoryText(category.category) }}</div>
            <div class="category-count">{{ category.count }} plugins</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'StoreDashboard',

  data() {
    return {
      loading: false,
      storeStats: {},
      topPlugins: [],
      recentActivations: [],
      pluginsByCategory: [],
      licenseDistribution: []
    };
  },

  computed: {
    storeApiUrl() {
      return process.env.VUE_APP_MARKETPLACE_URL || 'http://localhost:3001/api/marketplace';
    }
  },

  mounted() {
    this.loadAllStats();
  },

  methods: {
    async loadAllStats() {
      this.loading = true;

      try {
        await Promise.all([
          this.loadStoreStats(),
          this.loadTopPlugins(),
          this.loadRecentActivations(),
          this.loadPluginsByCategory(),
          this.loadLicenseDistribution()
        ]);
      } catch (error) {
        console.error('Error loading Store stats:', error);
        this.$notify?.({ type: 'error', message: 'Error al cargar estadísticas del Store' });
      } finally {
        this.loading = false;
      }
    },

    async loadStoreStats() {
      try {
        const baseUrl = this.storeApiUrl.replace('/marketplace', '');

        // Cargar plugins
        const pluginsRes = await axios.get(`${baseUrl}/marketplace/plugins`);
        const plugins = pluginsRes.data.data || [];

        // Cargar licencias
        const licensesRes = await axios.get(`${baseUrl}/licenses`);
        const licenses = licensesRes.data.data || [];

        // Cargar instalaciones
        const installationsRes = await axios.get(`${baseUrl}/installations`);
        const installations = installationsRes.data.data || [];

        // Calcular estadísticas
        this.storeStats = {
          totalPlugins: plugins.length,
          publishedPlugins: plugins.filter(p => p.status === 'published').length,
          totalLicenses: licenses.length,
          activeLicenses: licenses.filter(l => l.status === 'active').length,
          totalInstallations: installations.length,
          activeInstallations: installations.filter(i => i.status === 'active').length,
          totalActivations: 0, // Se actualizará con activaciones
          activationsThisMonth: 0 // Se actualizará con activaciones
        };
      } catch (error) {
        console.error('Error loading store stats:', error);
      }
    },

    async loadTopPlugins() {
      try {
        const response = await axios.get(`${this.storeApiUrl}/plugins`);
        const plugins = response.data.data || [];

        // Ordenar por downloadCount descendente
        this.topPlugins = plugins
          .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
          .slice(0, 6);
      } catch (error) {
        console.error('Error loading top plugins:', error);
      }
    },

    async loadRecentActivations() {
      try {
        const baseUrl = this.storeApiUrl.replace('/marketplace', '');
        const response = await axios.get(`${baseUrl}/plugin-activations?limit=10&sort=createdAt:desc`);
        this.recentActivations = response.data.data || [];

        // Actualizar estadísticas de activaciones
        const totalActivationsRes = await axios.get(`${baseUrl}/plugin-activations/count`);
        this.storeStats.totalActivations = totalActivationsRes.data.data?.count || this.recentActivations.length;
      } catch (error) {
        console.error('Error loading recent activations:', error);
        this.recentActivations = [];
      }
    },

    async loadPluginsByCategory() {
      try {
        const response = await axios.get(`${this.storeApiUrl}/plugins`);
        const plugins = response.data.data || [];

        // Agrupar por categoría
        const categoryMap = {};
        plugins.forEach(plugin => {
          const category = plugin.category || 'other';
          if (!categoryMap[category]) {
            categoryMap[category] = 0;
          }
          categoryMap[category]++;
        });

        this.pluginsByCategory = Object.entries(categoryMap).map(([category, count]) => ({
          category,
          count
        }));
      } catch (error) {
        console.error('Error loading plugins by category:', error);
      }
    },

    async loadLicenseDistribution() {
      try {
        const baseUrl = this.storeApiUrl.replace('/marketplace', '');
        const response = await axios.get(`${baseUrl}/licenses`);
        const licenses = response.data.data || [];

        // Agrupar por tipo de plan
        const typeMap = {
          basic: { name: '📦 Basic', count: 0, color: '#3498db' },
          medium: { name: '📈 Medium', count: 0, color: '#9b59b6' },
          advanced: { name: '🚀 Advanced', count: 0, color: '#e67e22' },
          enterprise: { name: '👑 Enterprise', count: 0, color: '#f39c12' }
        };

        licenses.forEach(license => {
          const type = license.planType || 'basic';
          if (typeMap[type]) {
            typeMap[type].count++;
          }
        });

        this.licenseDistribution = Object.entries(typeMap).map(([type, data]) => ({
          type,
          ...data
        }));
      } catch (error) {
        console.error('Error loading license distribution:', error);
      }
    },

    calculatePercentage(count) {
      const total = this.licenseDistribution.reduce((sum, l) => sum + l.count, 0);
      if (total === 0) return 0;
      return (count / total) * 100;
    },

    getCategoryIcon(category) {
      const icons = {
        payment: '💳',
        communication: '💬',
        analytics: '📊',
        security: '🔒',
        utility: '🛠️',
        integration: '🔗',
        automation: '🤖',
        other: '🧩'
      };
      return icons[category] || '🧩';
    },

    getCategoryText(category) {
      const texts = {
        payment: 'Pagos',
        communication: 'Comunicación',
        analytics: 'Analytics',
        security: 'Seguridad',
        utility: 'Utilidad',
        integration: 'Integración',
        automation: 'Automatización',
        other: 'Otros'
      };
      return texts[category] || category;
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    getStatusClass(status) {
      return {
        'status-active': status === 'active',
        'status-inactive': status === 'inactive' ||status === 'suspended'
      };
    }
  }
};
</script>

<style scoped>
.store-dashboard-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  background-color: #f5f6fa;
  min-height: 100vh;
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
  color: #2c3e50;
}

.btn-refresh {
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-refresh:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 20px;
  border-left: 4px solid;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  color: #7f8c8d;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-sublabel {
  font-size: 13px;
  color: #95a5a6;
  margin-top: 4px;
}

.chart-section,
.products-section,
.customers-section,
.categories-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.license-distribution {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.license-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.license-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.license-name {
  font-weight: 600;
  font-size: 14px;
  color: #2c3e50;
}

.license-count {
  font-weight: 700;
  font-size: 16px;
  color: #3498db;
}

.license-progress {
  height: 20px;
  background-color: #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
}

.license-progress-bar {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 10px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #3498db;
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateX(5px);
}

.product-rank {
  font-size: 28px;
  font-weight: 700;
  color: #3498db;
  min-width: 45px;
  text-align: center;
}

.product-info {
  flex: 1;
}

.product-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
  color: #2c3e50;
}

.product-type {
  font-size: 13px;
  color: #7f8c8d;
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
  font-size: 13px;
}

.product-stat .stat-label {
  color: #95a5a6;
}

.product-stat .stat-value {
  font-weight: 700;
  color: #2c3e50;
}

.activations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activation-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.activation-item:hover {
  background: #e8f4f8;
}

.activation-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.activation-info {
  flex: 1;
}

.activation-plugin {
  font-size: 14px;
  margin-bottom: 4px;
}

.activation-installation {
  font-size: 12px;
  color: #7f8c8d;
}

.activation-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.activation-date {
  font-size: 12px;
  color: #95a5a6;
}

.activation-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background-color: #d5f4e6;
  color: #27ae60;
}

.status-inactive {
  background-color: #fadbd8;
  color: #e74c3c;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
}

.category-card {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  text-align: center;
  transition: transform 0.2s;
}

.category-card:hover {
  transform: scale(1.05);
}

.category-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
}

.category-count {
  font-size: 12px;
  opacity: 0.9;
}

.loading {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
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
  padding: 50px 20px;
  color: #95a5a6;
  font-size: 15px;
}
</style>
