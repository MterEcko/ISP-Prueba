<template>
  <div class="store-dashboard-container">
    <div class="page-header">
      <h1>🛒 Plugin Marketplace</h1>
      <div class="license-badge" v-if="licenseInfo">
        <span class="badge-icon">🔑</span>
        <span class="badge-text">Licencia: {{ licenseInfo.planType }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Cargando información...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- Información de Licencia -->
      <div class="license-section" v-if="licenseInfo">
        <h2>📋 Mi Licencia</h2>
        <div class="license-card">
          <div class="license-header">
            <div class="license-plan">
              <span class="plan-icon">{{ getPlanIcon(licenseInfo.planType) }}</span>
              <div class="plan-info">
                <h3>Plan {{ licenseInfo.planType }}</h3>
                <p>{{ licenseInfo.companyName }}</p>
              </div>
            </div>
            <div class="license-status" :class="'status-' + licenseInfo.status">
              {{ licenseInfo.status }}
            </div>
          </div>
          <div class="license-details">
            <div class="detail-item">
              <span class="detail-label">Clave de Licencia:</span>
              <code class="detail-value">{{ licenseInfo.licenseKey }}</code>
            </div>
            <div class="detail-item" v-if="licenseInfo.expiresAt">
              <span class="detail-label">Válida hasta:</span>
              <span class="detail-value">{{ formatDate(licenseInfo.expiresAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas Rápidas -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-icon">🧩</div>
          <div class="stat-info">
            <div class="stat-label">Mis Plugins</div>
            <div class="stat-value">{{ myPlugins.length }}</div>
            <div class="stat-sublabel">{{ activePluginsCount }} activos</div>
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">🌟</div>
          <div class="stat-info">
            <div class="stat-label">Disponibles</div>
            <div class="stat-value">{{ availablePlugins.length }}</div>
            <div class="stat-sublabel">Para mi licencia</div>
          </div>
        </div>

        <div class="stat-card info">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <div class="stat-label">Por Categoría</div>
            <div class="stat-value">{{ categoriesCount }}</div>
            <div class="stat-sublabel">Categorías disponibles</div>
          </div>
        </div>
      </div>

      <!-- Mis Plugins Instalados -->
      <div class="section">
        <div class="section-header">
          <h2>🔌 Mis Plugins Instalados</h2>
          <button @click="goToPluginManagement" class="btn-secondary">
            Administrar →
          </button>
        </div>
        <div v-if="myPlugins.length > 0" class="plugins-grid">
          <div
            v-for="plugin in myPlugins"
            :key="plugin.id"
            class="plugin-card installed"
          >
            <div class="plugin-icon">{{ getCategoryIcon(plugin.category) }}</div>
            <div class="plugin-info">
              <h3>{{ plugin.name }}</h3>
              <p class="plugin-category">{{ getCategoryText(plugin.category) }}</p>
              <p class="plugin-version">v{{ plugin.version }}</p>
            </div>
            <div class="plugin-status">
              <span class="status-badge" :class="plugin.active ? 'active' : 'inactive'">
                {{ plugin.active ? '✓ Activo' : '○ Inactivo' }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="no-data">
          <p>No tienes plugins instalados</p>
          <button @click="goToMarketplace" class="btn-primary">
            Explorar Marketplace
          </button>
        </div>
      </div>

      <!-- Plugins Disponibles en Marketplace -->
      <div class="section">
        <div class="section-header">
          <h2>🛍️ Explorar Marketplace</h2>
          <button @click="goToMarketplace" class="btn-primary">
            Ver Todos →
          </button>
        </div>
        <div v-if="availablePlugins.length > 0" class="plugins-grid">
          <div
            v-for="plugin in availablePlugins.slice(0, 6)"
            :key="plugin.id"
            class="plugin-card marketplace"
          >
            <div class="plugin-badge" v-if="plugin.isFree">
              🆓 Gratis
            </div>
            <div class="plugin-badge premium" v-else>
              💎 ${{ plugin.price }}
            </div>
            <div class="plugin-icon">{{ getCategoryIcon(plugin.category) }}</div>
            <div class="plugin-info">
              <h3>{{ plugin.name }}</h3>
              <p class="plugin-description">{{ plugin.description }}</p>
              <p class="plugin-category">{{ getCategoryText(plugin.category) }}</p>
            </div>
            <button
              @click="installPlugin(plugin)"
              class="btn-install"
              :disabled="isPluginInstalled(plugin.id)"
            >
              {{ isPluginInstalled(plugin.id) ? '✓ Instalado' : '+ Obtener' }}
            </button>
          </div>
        </div>
        <div v-else class="no-data">
          <p>No hay plugins disponibles para tu licencia</p>
        </div>
      </div>

      <!-- Categorías -->
      <div class="section">
        <div class="section-header">
          <h2>📁 Por Categoría</h2>
        </div>
        <div class="categories-grid">
          <div
            v-for="category in pluginCategories"
            :key="category.value"
            @click="filterByCategory(category.value)"
            class="category-card"
          >
            <div class="category-icon">{{ category.icon }}</div>
            <div class="category-name">{{ category.label }}</div>
            <div class="category-count">{{ getCategoryCount(category.value) }} plugins</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreDashboard',

  data() {
    return {
      loading: false,
      licenseInfo: null,
      myPlugins: [],
      availablePlugins: [],
      pluginCategories: [
        { value: 'communication', label: 'Comunicación', icon: '💬' },
        { value: 'payment', label: 'Pagos', icon: '💳' },
        { value: 'automation', label: 'Automatización', icon: '🤖' },
        { value: 'analytics', label: 'Analytics', icon: '📊' },
        { value: 'security', label: 'Seguridad', icon: '🔒' },
        { value: 'other', label: 'Otros', icon: '🧩' }
      ]
    };
  },

  computed: {
    activePluginsCount() {
      return this.myPlugins.filter(p => p.active).length;
    },

    categoriesCount() {
      const categories = new Set(this.availablePlugins.map(p => p.category));
      return categories.size;
    }
  },

  mounted() {
    this.loadDashboard();
  },

  methods: {
    async loadDashboard() {
      this.loading = true;

      try {
        // Cargar licencia del localStorage
        const licenseKey = localStorage.getItem('licenseKey');
        if (licenseKey) {
          this.licenseInfo = {
            licenseKey,
            planType: this.getLicenseTier(licenseKey),
            companyName: 'Mi Empresa ISP',
            status: 'active'
          };
        }

        // Cargar plugins instalados desde Vuex
        await this.$store.dispatch('plugins/fetchInstalledPlugins');
        this.myPlugins = this.$store.getters['plugins/getInstalledPlugins'] || [];

        // Cargar plugins disponibles en marketplace
        await this.$store.dispatch('plugins/fetchMarketplacePlugins');
        this.availablePlugins = this.$store.getters['plugins/getMarketplacePlugins'] || [];

      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        this.loading = false;
      }
    },

    getLicenseTier(licenseKey) {
      if (licenseKey.includes('BASIC')) return 'Basic';
      if (licenseKey.includes('MEDIUM')) return 'Medium';
      if (licenseKey.includes('ADVANCED')) return 'Advanced';
      if (licenseKey.includes('ENTERPRISE')) return 'Enterprise';
      return 'Basic';
    },

    getPlanIcon(planType) {
      const icons = {
        basic: '📦',
        medium: '📈',
        advanced: '🚀',
        enterprise: '👑'
      };
      return icons[planType?.toLowerCase()] || '📦';
    },

    getCategoryIcon(category) {
      const icons = {
        payment: '💳',
        communication: '💬',
        analytics: '📊',
        security: '🔒',
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
        automation: 'Automatización',
        other: 'Otros'
      };
      return texts[category] || category;
    },

    getCategoryCount(category) {
      if (category === 'all') return this.availablePlugins.length;
      return this.availablePlugins.filter(p => p.category === category).length;
    },

    isPluginInstalled(pluginId) {
      return this.myPlugins.some(p => p.slug === pluginId || p.id === pluginId);
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },

    goToPluginManagement() {
      this.$router.push('/plugins/management');
    },

    goToMarketplace() {
      this.$router.push('/plugins/marketplace');
    },

    filterByCategory(category) {
      this.$router.push({
        path: '/plugins/marketplace',
        query: { category }
      });
    },

    async installPlugin(plugin) {
      try {
        await this.$store.dispatch('plugins/activatePlugin', {
          pluginId: plugin.id,
          pluginData: {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            category: plugin.category
          }
        });

        this.$notify?.({
          type: 'success',
          message: `Plugin "${plugin.name}" instalado exitosamente`
        });

        // Recargar lista de plugins
        await this.loadDashboard();
      } catch (error) {
        console.error('Error installing plugin:', error);
        this.$notify?.({
          type: 'error',
          message: 'Error al instalar el plugin'
        });
      }
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

.license-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-weight: 600;
}

.badge-icon {
  font-size: 20px;
}

/* License Section */
.license-section {
  margin-bottom: 30px;
}

.license-section h2 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #2c3e50;
}

.license-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.license-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #ecf0f1;
}

.license-plan {
  display: flex;
  align-items: center;
  gap: 15px;
}

.plan-icon {
  font-size: 48px;
}

.plan-info h3 {
  margin: 0 0 5px 0;
  font-size: 22px;
  color: #2c3e50;
  text-transform: capitalize;
}

.plan-info p {
  margin: 0;
  color: #7f8c8d;
}

.license-status {
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 12px;
}

.status-active {
  background: #d5f4e6;
  color: #27ae60;
}

.license-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-label {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  font-weight: 600;
}

.detail-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

.detail-value code {
  background: #ecf0f1;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

/* Stats Grid */
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
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
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
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.stat-sublabel {
  font-size: 13px;
  color: #95a5a6;
  margin-top: 4px;
}

/* Sections */
.section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

/* Buttons */
.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background: #bdc3c7;
}

/* Plugins Grid */
.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.plugin-card {
  position: relative;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.plugin-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.plugin-card.installed {
  border-left: 4px solid #2ecc71;
}

.plugin-card.marketplace {
  border-left: 4px solid #3498db;
}

.plugin-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #2ecc71;
  color: white;
}

.plugin-badge.premium {
  background: #f39c12;
}

.plugin-icon {
  font-size: 40px;
  margin-bottom: 15px;
}

.plugin-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #2c3e50;
}

.plugin-description {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #7f8c8d;
  line-height: 1.5;
}

.plugin-category {
  margin: 0 0 5px 0;
  font-size: 12px;
  color: #95a5a6;
  font-weight: 600;
  text-transform: uppercase;
}

.plugin-version {
  margin: 0;
  font-size: 11px;
  color: #bdc3c7;
  font-family: monospace;
}

.plugin-status {
  margin-top: 15px;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #d5f4e6;
  color: #27ae60;
}

.status-badge.inactive {
  background: #fadbd8;
  color: #e74c3c;
}

.btn-install {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-install:hover:not(:disabled) {
  background: #2980b9;
}

.btn-install:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}

.category-card {
  padding: 25px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.category-card:hover {
  transform: scale(1.05);
}

.category-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.category-name {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 6px;
}

.category-count {
  font-size: 12px;
  opacity: 0.9;
}

/* Loading & No Data */
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
}

.no-data p {
  margin: 0 0 20px 0;
  font-size: 15px;
}
</style>
