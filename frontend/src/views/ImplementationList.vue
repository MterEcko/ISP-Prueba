<template>
  <div class="implementation-list">
    <div class="page-header">
      <h1>🔧 Implementaciones de Comandos</h1>
      <router-link to="/command-implementations/new" class="btn-primary">
        + Nueva Implementación
      </router-link>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters-row">
        <div class="filter-group">
          <input 
            type="text" 
            v-model="searchTerm" 
            placeholder="Buscar implementaciones..."
            class="search-input"
          />
        </div>
        
        <div class="filter-group">
          <select v-model="selectedBrand" @change="loadImplementations">
            <option value="">Todas las marcas</option>
            <option v-for="brand in brands" :key="brand.id" :value="brand.id">
              {{ brand.displayName || brand.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <select v-model="selectedCommand" @change="loadImplementations">
            <option value="">Todos los comandos</option>
            <option v-for="command in commands" :key="command.id" :value="command.id">
              {{ command.displayName || command.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <select v-model="selectedStatus" @change="loadImplementations">
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando implementaciones...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="implementations.length === 0" class="empty-state">
      <div class="empty-icon">🔧</div>
      <h3>No hay implementaciones</h3>
      <p>No se encontraron implementaciones con los filtros aplicados.</p>
      <router-link to="/command-implementations/new" class="btn-primary">
        Crear Primera Implementación
      </router-link>
    </div>

    <!-- Implementations Grid -->
    <div v-else class="implementations-grid">
      <div 
        v-for="impl in filteredImplementations" 
        :key="impl.id"
        class="implementation-card"
        :class="{ inactive: !impl.active }"
      >
        <div class="card-header">
          <div class="brand-info">
            <span :class="['brand-badge', impl.DeviceBrand?.name?.toLowerCase()]">
              {{ impl.DeviceBrand?.displayName || impl.DeviceBrand?.name }}
            </span>
            <span v-if="impl.DeviceFamily" class="family-badge">
              {{ impl.DeviceFamily?.displayName || impl.DeviceFamily?.name }}
            </span>
          </div>
          <span :class="['status-dot', impl.active ? 'active' : 'inactive']"></span>
        </div>

        <div class="card-content">
          <h4 class="command-title">
            {{ impl.CommonCommand?.displayName || impl.CommonCommand?.name }}
          </h4>
          
          <div class="implementation-details">
            <div class="detail-row">
              <span class="label">Conexión:</span>
              <span class="connection-type">{{ getConnectionTypeDisplayName(impl.connectionType) }}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Implementación:</span>
              <code class="implementation-code">{{ truncateImplementation(impl.implementation) }}</code>
            </div>
            
            <div v-if="impl.successRate !== null" class="detail-row">
              <span class="label">Éxito:</span>
              <span :class="['success-rate', getSuccessRateClass(impl.successRate)]">
                {{ (impl.successRate * 100).toFixed(1) }}%
              </span>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button 
            @click="testImplementation(impl.id)"
            class="btn-test"
            :disabled="testingImplementations[impl.id]"
            title="Probar implementación"
          >
            {{ testingImplementations[impl.id] ? '⏳' : '🧪' }}
          </button>
          
          <router-link 
            :to="`/command-implementations/${impl.id}/edit`"
            class="btn-edit"
            title="Editar implementación"
          >
            ✏️
          </router-link>
          
          <button 
            @click="toggleImplementation(impl.id)"
            class="btn-toggle"
            :disabled="togglingImplementations[impl.id]"
            :title="impl.active ? 'Desactivar' : 'Activar'"
          >
            {{ togglingImplementations[impl.id] ? '⏳' : (impl.active ? '⏸️' : '▶️') }}
          </button>
          
          <button 
            @click="deleteImplementation(impl.id)"
            class="btn-delete"
            title="Eliminar implementación"
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
  name: 'ImplementationList',
  data() {
    return {
      implementations: [],
      brands: [],
      commands: [],
      loading: false,
      searchTerm: '',
      selectedBrand: '',
      selectedCommand: '',
      selectedStatus: '',
      currentPage: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 0,
      testingImplementations: {},
      togglingImplementations: {},
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    filteredImplementations() {
      let filtered = this.implementations;
      
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(impl => 
          impl.CommonCommand?.name?.toLowerCase().includes(term) ||
          impl.CommonCommand?.displayName?.toLowerCase().includes(term) ||
          impl.DeviceBrand?.name?.toLowerCase().includes(term) ||
          impl.implementation?.toLowerCase().includes(term)
        );
      }
      
      return filtered;
    }
  },
  created() {
    this.loadInitialData();
  },
  methods: {
    async loadInitialData() {
      try {
        const [brandsResponse, commandsResponse] = await Promise.all([
          CommandService.getAllBrands({ active: true }),
          CommandService.getAllCommands({ active: true, size: 1000 })
        ]);
        
        this.brands = brandsResponse.data.brands || brandsResponse.data || [];
        this.commands = commandsResponse.data.commands || commandsResponse.data || [];
        
        await this.loadImplementations();
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.errorMessage = 'Error cargando datos iniciales';
      }
    },

    async loadImplementations() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          brandId: this.selectedBrand || undefined,
          commandId: this.selectedCommand || undefined,
          active: this.selectedStatus || undefined
        };

        const response = await CommandService.getAllImplementations(params);
        this.implementations = response.data.implementations || response.data.items || response.data || [];
        this.totalItems = response.data.totalItems || this.implementations.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
      } catch (error) {
        console.error('Error cargando implementaciones:', error);
        this.errorMessage = 'Error cargando implementaciones';
      } finally {
        this.loading = false;
      }
    },

    async testImplementation(id) {
      this.$set(this.testingImplementations, id, true);
      try {
        const response = await CommandService.testImplementation(id);
        this.successMessage = response.data.message || 'Prueba ejecutada correctamente';
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error ejecutando prueba';
        this.clearMessages();
      } finally {
        this.$set(this.testingImplementations, id, false);
      }
    },

    async toggleImplementation(id) {
      this.$set(this.togglingImplementations, id, true);
      try {
        await CommandService.toggleImplementation(id);
        this.successMessage = 'Estado actualizado correctamente';
        this.loadImplementations();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error actualizando estado';
        this.clearMessages();
      } finally {
        this.$set(this.togglingImplementations, id, false);
      }
    },

    async deleteImplementation(id) {
      if (!confirm('¿Está seguro de que desea eliminar esta implementación?')) {
        return;
      }

      try {
        await CommandService.deleteImplementation(id);
        this.successMessage = 'Implementación eliminada correctamente';
        this.loadImplementations();
        this.clearMessages();
      } catch (error) {
        this.errorMessage = error.response?.data?.message || 'Error eliminando implementación';
        this.clearMessages();
      }
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadImplementations();
      }
    },

    getConnectionTypeDisplayName(type) {
      return CommandService.getConnectionTypeDisplayName(type);
    },

    truncateImplementation(implementation) {
      if (!implementation) return '';
      return implementation.length > 50 ? implementation.substring(0, 50) + '...' : implementation;
    },

    getSuccessRateClass(rate) {
      if (rate >= 0.9) return 'excellent';
      if (rate >= 0.7) return 'good';
      if (rate >= 0.5) return 'fair';
      return 'poor';
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
.implementation-list {
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
  margin-bottom: 30px;
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

.implementations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.implementation-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-left: 4px solid #3498db;
}

.implementation-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.implementation-card.inactive {
  opacity: 0.6;
  border-left-color: #95a5a6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px 0;
}

.brand-info {
  display: flex;
  gap: 8px;
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

.family-badge {
  background: #95a5a6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

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

.command-title {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.implementation-details {
  space-y: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.label {
  font-weight: 500;
  color: #7f8c8d;
  font-size: 13px;
}

.connection-type {
  background: #ecf0f1;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.implementation-code {
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.success-rate {
  font-weight: 600;
  font-size: 13px;
}

.success-rate.excellent { color: #27ae60; }
.success-rate.good { color: #f39c12; }
.success-rate.fair { color: #e67e22; }
.success-rate.poor { color: #e74c3c; }

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 15px;
}

.btn-test, .btn-edit, .btn-toggle, .btn-delete {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-test { background: #3498db; color: white; }
.btn-edit { background: #f39c12; color: white; }
.btn-toggle { background: #95a5a6; color: white; }
.btn-delete { background: #e74c3c; color: white; }

.btn-test:hover { background: #2980b9; }
.btn-edit:hover { background: #e67e22; }
.btn-toggle:hover { background: #7f8c8d; }
.btn-delete:hover { background: #c0392b; }

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
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
  .implementation-list {
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
  
  .implementations-grid {
    grid-template-columns: 1fr;
  }
}
</style>