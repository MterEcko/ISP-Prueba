<template>
  <div class="family-list">
    <div class="page-header">
      <h1>👨‍👩‍👧‍👦 Familias de Dispositivos</h1>
      <router-link to="/device-families/new" class="btn-primary">
        + Nueva Familia
      </router-link>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="filter-group">
          <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="Buscar familias..."
            class="search-input"
          />
        </div>
        
        <div class="filter-group">
          <select v-model="selectedBrand" @change="loadFamilies">
            <option value="">Todas las marcas</option>
            <option v-for="brand in brands" :key="brand.id" :value="brand.id">
              {{ brand.displayName || brand.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <select v-model="selectedStatus" @change="loadFamilies">
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Breadcrumb si viene de una marca específica -->
    <div v-if="fromBrand" class="breadcrumb">
      <router-link to="/device-brands" class="breadcrumb-link">Marcas</router-link>
      <span class="breadcrumb-separator">›</span>
      <router-link :to="`/device-brands/${fromBrand.id}`" class="breadcrumb-link">
        {{ fromBrand.displayName || fromBrand.name }}
      </router-link>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Familias</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando familias...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="families.length === 0" class="empty-state">
      <div class="empty-icon">👨‍👩‍👧‍👦</div>
      <h3>No hay familias registradas</h3>
      <p v-if="selectedBrand">No se encontraron familias para la marca seleccionada.</p>
      <p v-else>Comience agregando familias de dispositivos para organizar mejor su inventario.</p>
      <router-link 
        :to="selectedBrand ? `/device-families/new?brandId=${selectedBrand}` : '/device-families/new'" 
        class="btn-primary"
      >
        Crear Primera Familia
      </router-link>
    </div>

    <!-- Families Grid -->
    <div v-else class="families-grid">
      <div 
        v-for="family in filteredFamilies" 
        :key="family.id"
        class="family-card"
        :class="{ inactive: !family.active }"
      >
        <div class="card-header">
          <div class="family-brand">
            <span :class="['brand-badge', family.DeviceBrand?.name?.toLowerCase()]">
              {{ family.DeviceBrand?.displayName || family.DeviceBrand?.name }}
            </span>
            <span :class="['status-dot', family.active ? 'active' : 'inactive']"></span>
          </div>
        </div>

        <div class="card-content">
          <div class="family-info">
            <h3 class="family-name">{{ family.displayName || family.name }}</h3>
            <p class="family-description">{{ family.description || 'Sin descripción' }}</p>
            
            <div class="system-type" v-if="family.systemType">
              <span class="system-label">Sistema:</span>
              <span class="system-value">{{ family.systemType }}</span>
            </div>
          </div>
          
          <div class="family-stats">
            <div class="stat-item">
              <span class="stat-value">{{ family.deviceCount || 0 }}</span>
              <span class="stat-label">Dispositivos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ family.commandCount || 0 }}</span>
              <span class="stat-label">Comandos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ family.oidCount || 0 }}</span>
              <span class="stat-label">OIDs SNMP</span>
            </div>
          </div>

          <!-- Tecnologías/Características -->
          <div class="family-features" v-if="family.features && family.features.length > 0">
            <div class="features-label">Características:</div>
            <div class="feature-tags">
              <span 
                v-for="feature in family.features.slice(0, 3)" 
                :key="feature"
                class="feature-tag"
              >
                {{ feature }}
              </span>
              <span v-if="family.features.length > 3" class="more-features">
                +{{ family.features.length - 3 }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <router-link 
            :to="`/device-families/${family.id}/devices`"
            class="btn-small btn-secondary"
            title="Ver dispositivos"
          >
            📱 Dispositivos
          </router-link>
          
          <router-link 
            :to="`/device-families/${family.id}/commands`"
            class="btn-small btn-secondary"
            title="Ver comandos"
          >
            🔧 Comandos
          </router-link>
          
          <router-link 
            :to="`/device-families/${family.id}/snmp-oids`"
            class="btn-small btn-secondary"
            title="Ver OIDs SNMP"
          >
            📊 OIDs
          </router-link>
          
          <router-link 
            :to="`/device-families/${family.id}/edit`"
            class="btn-small btn-primary"
            title="Editar familia"
          >
            ✏️
          </router-link>
          
          <button 
            @click="toggleFamily(family.id)"
            class="btn-small btn-toggle"
            :disabled="togglingFamilies[family.id]"
            :title="family.active ? 'Desactivar' : 'Activar'"
          >
            {{ togglingFamilies[family.id] ? '⏳' : (family.active ? '⏸️' : '▶️') }}
          </button>
          
          <button 
            @click="deleteFamily(family.id)"
            class="btn-small btn-delete"
            title="Eliminar familia"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="btn-pagination"
      >
        ← Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="btn-pagination"
      >
        Siguiente →
      </button>
    </div>

    <!-- Statistics Summary -->
    <div v-if="families.length > 0" class="summary-stats">
      <div class="summary-card">
        <h4>📊 Resumen</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-value">{{ families.length }}</span>
            <span class="summary-label">Familias Total</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ activeFamilies }}</span>
            <span class="summary-label">Activas</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ totalDevices }}</span>
            <span class="summary-label">Dispositivos</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ totalCommands }}</span>
            <span class="summary-label">Comandos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import CommandService from '../services/command.service';

export default {
  name: 'DeviceFamilyList',
  data() {
    return {
      families: [],
      brands: [],
      loading: false,
      searchTerm: '',
      selectedBrand: '',
      selectedStatus: '',
      currentPage: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 0,
      togglingFamilies: {},
      successMessage: '',
      errorMessage: '',
      fromBrand: null
    };
  },
  computed: {
    filteredFamilies() {
      let filtered = this.families;
      
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(family => 
          family.name?.toLowerCase().includes(term) ||
          family.displayName?.toLowerCase().includes(term) ||
          family.description?.toLowerCase().includes(term) ||
          family.systemType?.toLowerCase().includes(term) ||
          family.DeviceBrand?.name?.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    },
    activeFamilies() {
      return this.families.filter(family => family.active).length;
    },
    totalDevices() {
      return this.families.reduce((sum, family) => sum + (family.deviceCount || 0), 0);
    },
    totalCommands() {
      return this.families.reduce((sum, family) => sum + (family.commandCount || 0), 0);
    }
  },
  created() {
    // Verificar si viene de una marca específica
    const brandId = this.$route.query.brandId;
    if (brandId) {
      this.selectedBrand = brandId;
      this.loadBrandInfo(brandId);
    }
    
    this.loadInitialData();
  },
  methods: {
    async loadInitialData() {
      try {
        const brandsResponse = await CommandService.getAllBrands({ active: true });
        this.brands = brandsResponse.data.brands || brandsResponse.data || [];
        
        await this.loadFamilies();
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.errorMessage = 'Error cargando datos iniciales';
      }
    },

    async loadBrandInfo(brandId) {
      try {
        const response = await CommandService.getBrand(brandId);
        this.fromBrand = response.data.brand || response.data;
      } catch (error) {
        console.error('Error cargando información de marca:', error);
      }
    },

    async loadFamilies() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          brandId: this.selectedBrand || undefined,
          active: this.selectedStatus || undefined
        };

        const response = await CommandService.getAllFamilies(params);
        this.families = response.data.families || response.data.items || response.data || [];
        this.totalItems = response.data.totalItems || this.families.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        // Cargar estadísticas adicionales
        await this.loadFamilyStats();
      } catch (error) {
        console.error('Error cargando familias:', error);
        this.errorMessage = 'Error cargando familias de dispositivos';
      } finally {
        this.loading = false;
      }
    },

    async loadFamilyStats() {
      try {
        const statsPromises = this.families.map(async (family) => {
          try {
            const [devicesResponse, commandsResponse, oidsResponse] = await Promise.all([
              // Asumiendo que existe un endpoint para dispositivos por familia
              CommandService.getFamilyDevices ? CommandService.getFamilyDevices(family.id) : Promise.resolve({ data: [] }),
              CommandService.getImplementationsByFamily(family.id),
              CommandService.getSnmpOidsByFamily(family.id)
            ]);
            
            family.deviceCount = (devicesResponse.data.devices || devicesResponse.data || []).length;
            family.commandCount = (commandsResponse.data.implementations || commandsResponse.data || []).length;
            family.oidCount = (oidsResponse.data.oids || oidsResponse.data || []).length;
            
            return family;
          } catch (error) {
            // Si hay error, mantener valores por defecto
            family.deviceCount = 0;
            family.commandCount = 0;
            family.oidCount = 0;
            return family;
          }
        });
        
        await Promise.all(statsPromises);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    },

    async toggleFamily(id) {
      this.$set(this.togglingFamilies, id, true);
      try {
        await CommandService.toggleFamily(id);
        this.successMessage = 'Estado de la familia actualizado correctamente';
        this.loadFamilies();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error actualizando estado de la familia';
        this.clearMessages();
      } finally {
        this.$set(this.togglingFamilies, id, false);
      }
    },

    async deleteFamily(id) {
      const family = this.families.find(f => f.id === id);
      if (!confirm(`¿Está seguro de que desea eliminar la familia "${family?.displayName || family?.name}"? Esta acción no se puede deshacer.`)) {
        return;
      }

      try {
        await CommandService.deleteFamily(id);
        this.successMessage = 'Familia eliminada correctamente';
        this.loadFamilies();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error eliminando familia';
        this.clearMessages();
      }
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadFamilies();
      }
    },

    clearMessages() {
      setTimeout(() => {
        this.successMessage = '';
        this.errorMessage = '';
      }, 3000);
    }
  }
};
</script>

<style scoped>
.family-list {
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
  color: #2c3e50;
  margin: 0;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.filters-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.search-input, select {
  width: 100%;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus, select:focus {
  border-color: #3498db;
  outline: none;
}

.breadcrumb {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 15px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.breadcrumb-link {
  color: #3498db;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  margin: 0 10px;
  color: #7f8c8d;
}

.breadcrumb-current {
  color: #2c3e50;
  font-weight: 500;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.families-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.family-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #9b59b6;
  overflow: hidden;
}

.family-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.family-card.inactive {
  opacity: 0.6;
  border-left-color: #95a5a6;
}

.card-header {
  padding: 15px 20px 0;
}

.family-brand {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-badge {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.brand-badge.mikrotik { background: #e74c3c; }
.brand-badge.ubiquiti { background: #2ecc71; }
.brand-badge.tplink { background: #f39c12; }
.brand-badge.cambium { background: #9b59b6; }
.brand-badge.mimosa { background: #1abc9c; }

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.active { background: #2ecc71; }
.status-dot.inactive { background: #e74c3c; }

.card-content {
  padding: 15px 20px;
}

.family-info {
  margin-bottom: 15px;
}

.family-name {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: 600;
}

.family-description {
  color: #7f8c8d;
  margin: 0 0 10px 0;
  font-size: 14px;
  line-height: 1.4;
}

.system-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.system-label {
  font-weight: 500;
  color: #7f8c8d;
  font-size: 13px;
}

.system-value {
  background: #ecf0f1;
  color: #2c3e50;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.family-stats {
  display: flex;
  justify-content: space-around;
  padding: 15px 0;
  border-top: 1px solid #ecf0f1;
  border-bottom: 1px solid #ecf0f1;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.3em;
  font-weight: bold;
  color: #9b59b6;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 4px;
}

.family-features {
  margin-top: 15px;
}

.features-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
  margin-bottom: 8px;
}

.feature-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.feature-tag {
  background: #f8f9fa;
  color: #2c3e50;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid #e9ecef;
}

.more-features {
  background: #e9ecef;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 15px 20px 20px;
  background: #f8f9fa;
  flex-wrap: wrap;
}

.btn-primary, .btn-secondary, .btn-small {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  font-size: 11px;
  text-align: center;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-toggle {
  background: #f39c12;
  color: white;
}

.btn-toggle:hover:not(:disabled) {
  background: #e67e22;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background: #c0392b;
}

.btn-small:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.btn-pagination {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-pagination:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.page-info {
  color: #7f8c8d;
  font-size: 14px;
}

.summary-stats {
  margin-top: 30px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary-card h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.summary-item {
  text-align: center;
}

.summary-value {
  display: block;
  font-size: 1.8em;
  font-weight: bold;
  color: #9b59b6;
}

.summary-label {
  display: block;
  font-size: 13px;
  color: #7f8c8d;
  margin-top: 4px;
}

.success-message, .error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  font-weight: 500;
  z-index: 1000;
}

.success-message {
  background: #d5f4e6;
  color: #27ae60;
  border: 1px solid #82e5aa;
}

.error-message {
  background: #fadbd8;
  color: #c0392b;
  border: 1px solid #f1948a;
}

@media (max-width: 768px) {
  .family-list {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .filters-row {
    flex-direction: column;
  }
  
  .families-grid {
    grid-template-columns: 1fr;
  }
  
  .card-actions {
    justify-content: center;
    gap: 8px;
  }
  
  .btn-small {
    flex: 1;
    min-width: 70px;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>