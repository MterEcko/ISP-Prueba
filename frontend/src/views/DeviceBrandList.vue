<template>
  <div class="brand-list">
    <div class="page-header">
      <h1>🏷️ Marcas de Dispositivos</h1>
      <router-link to="/device-brands/new" class="btn-primary">
        + Nueva Marca
      </router-link>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchTerm" 
          placeholder="Buscar marcas..."
          class="search-input"
        />
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedStatus" @change="loadBrands">
          <option value="">Todos los estados</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando marcas...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="brands.length === 0" class="empty-state">
      <div class="empty-icon">🏷️</div>
      <h3>No hay marcas registradas</h3>
      <p>Comience agregando marcas de dispositivos para organizar mejor su inventario.</p>
      <router-link to="/device-brands/new" class="btn-primary">
        Crear Primera Marca
      </router-link>
    </div>

    <!-- Brands Grid -->
    <div v-else class="brands-grid">
      <div 
        v-for="brand in filteredBrands" 
        :key="brand.id"
        class="brand-card"
        :class="{ inactive: !brand.active }"
      >
        <div class="brand-header">
          <div class="brand-logo">
            <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.name" />
            <div v-else class="brand-placeholder">
              {{ getInitials(brand.displayName || brand.name) }}
            </div>
          </div>
          <span :class="['status-dot', brand.active ? 'active' : 'inactive']"></span>
        </div>

        <div class="brand-content">
          <h3 class="brand-name">{{ brand.displayName || brand.name }}</h3>
          <p class="brand-description">{{ brand.description || 'Sin descripción' }}</p>
          
          <div class="brand-stats">
            <div class="stat-item">
              <span class="stat-value">{{ brand.familyCount || 0 }}</span>
              <span class="stat-label">Familias</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ brand.deviceCount || 0 }}</span>
              <span class="stat-label">Dispositivos</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ brand.commandCount || 0 }}</span>
              <span class="stat-label">Comandos</span>
            </div>
          </div>

          <div class="supported-protocols" v-if="brand.supportedProtocols">
            <span class="protocols-label">Protocolos:</span>
            <div class="protocol-tags">
              <span 
                v-for="protocol in brand.supportedProtocols" 
                :key="protocol"
                class="protocol-tag"
              >
                {{ protocol.toUpperCase() }}
              </span>
            </div>
          </div>
        </div>

        <div class="brand-actions">
          <router-link 
            :to="`/device-brands/${brand.id}/families`"
            class="btn-small btn-secondary"
            title="Ver familias"
          >
            👨‍👩‍👧‍👦 Familias
          </router-link>
          
          <router-link 
            :to="`/device-brands/${brand.id}/commands`"
            class="btn-small btn-secondary"
            title="Ver comandos"
          >
            🔧 Comandos
          </router-link>
          
          <router-link 
            :to="`/device-brands/${brand.id}/edit`"
            class="btn-small btn-primary"
            title="Editar marca"
          >
            ✏️
          </router-link>
          
          <button 
            @click="toggleBrand(brand.id)"
            class="btn-small btn-toggle"
            :disabled="togglingBrands[brand.id]"
            :title="brand.active ? 'Desactivar' : 'Activar'"
          >
            {{ togglingBrands[brand.id] ? '⏳' : (brand.active ? '⏸️' : '▶️') }}
          </button>
          
          <button 
            @click="deleteBrand(brand.id)"
            class="btn-small btn-delete"
            title="Eliminar marca"
          >
            🗑️
          </button>
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
  name: 'DeviceBrandList',
  data() {
    return {
      brands: [],
      loading: false,
      searchTerm: '',
      selectedStatus: '',
      togglingBrands: {},
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    filteredBrands() {
      let filtered = this.brands;
      
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(brand => 
          brand.name?.toLowerCase().includes(term) ||
          brand.displayName?.toLowerCase().includes(term) ||
          brand.description?.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    }
  },
  created() {
    this.loadBrands();
  },
  methods: {
    async loadBrands() {
      this.loading = true;
      try {
        const params = {
          active: this.selectedStatus || undefined
        };

        const response = await CommandService.getAllBrands(params);
        this.brands = response.data.brands || response.data || [];
        
        // Cargar estadísticas adicionales para cada marca
        await this.loadBrandStats();
      } catch (error) {
        console.error('Error cargando marcas:', error);
        this.errorMessage = 'Error cargando marcas de dispositivos';
      } finally {
        this.loading = false;
      }
    },

    async loadBrandStats() {
      // Cargar estadísticas adicionales para cada marca
      try {
        const statsPromises = this.brands.map(async (brand) => {
          try {
            const [familiesResponse, commandsResponse] = await Promise.all([
              CommandService.getFamiliesByBrand(brand.id),
              CommandService.getImplementationsByBrand(brand.id)
            ]);
            
            brand.familyCount = (familiesResponse.data.families || familiesResponse.data || []).length;
            brand.commandCount = (commandsResponse.data.implementations || commandsResponse.data || []).length;
            
            return brand;
          } catch (error) {
            // Si hay error, mantener valores por defecto
            brand.familyCount = 0;
            brand.commandCount = 0;
            return brand;
          }
        });
        
        await Promise.all(statsPromises);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    },

    async toggleBrand(id) {
      this.$set(this.togglingBrands, id, true);
      try {
        await CommandService.toggleBrand(id);
        this.successMessage = 'Estado de la marca actualizado correctamente';
        this.loadBrands();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error actualizando estado de la marca';
        this.clearMessages();
      } finally {
        this.$set(this.togglingBrands, id, false);
      }
    },

    async deleteBrand(id) {
      if (!confirm('¿Está seguro de que desea eliminar esta marca? Esta acción no se puede deshacer.')) {
        return;
      }

      try {
        await CommandService.deleteBrand(id);
        this.successMessage = 'Marca eliminada correctamente';
        this.loadBrands();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error eliminando marca';
        this.clearMessages();
      }
    },

    getInitials(name) {
      if (!name) return '??';
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
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
.brand-list {
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.search-box {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  border-color: #3498db;
  outline: none;
}

.filter-controls select {
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
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

.brands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.brand-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #3498db;
  overflow: hidden;
}

.brand-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.brand-card.inactive {
  opacity: 0.6;
  border-left-color: #95a5a6;
}

.brand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0;
}

.brand-logo {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-placeholder {
  font-weight: bold;
  font-size: 18px;
  color: #3498db;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.active { background: #2ecc71; }
.status-dot.inactive { background: #e74c3c; }

.brand-content {
  padding: 15px 20px;
}

.brand-name {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: 600;
}

.brand-description {
  color: #7f8c8d;
  margin: 0 0 15px 0;
  font-size: 14px;
  line-height: 1.4;
}

.brand-stats {
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
  font-size: 1.5em;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #7f8c8d;
  margin-top: 4px;
}

.supported-protocols {
  margin-top: 15px;
}

.protocols-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
}

.protocol-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.protocol-tag {
  background: #ecf0f1;
  color: #2c3e50;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.brand-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 15px 20px 20px;
  background: #f8f9fa;
}

.btn-primary, .btn-secondary, .btn-small {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  font-size: 12px;
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
  .brand-list {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .filters-section {
    flex-direction: column;
    gap: 15px;
  }
  
  .brands-grid {
    grid-template-columns: 1fr;
  }
  
  .brand-actions {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .btn-small {
    flex: 1;
    text-align: center;
  }
}
</style>