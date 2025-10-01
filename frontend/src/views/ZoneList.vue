<template>
  <div class="network-view">
    <div class="page-header">
      <h1 class="page-title">Gestión de Red</h1>
      <div class="header-actions">
        <button class="btn btn-primary" @click="goToCreateZone">
          <span class="icon">➕</span>
          Nueva Zona
        </button>
        <button class="btn btn-secondary" @click="toggleView">
          <span class="icon">{{ viewMode === 'grid' ? '📋' : '🏢' }}</span>
          {{ viewMode === 'grid' ? 'Vista Lista' : 'Vista Grid' }}
        </button>
      </div>
    </div>
    
    <!-- Resumen de estadísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏢</div>
        <div class="stat-info">
          <h3>{{ totalZones }}</h3>
          <p>Zonas</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📡</div>
        <div class="stat-info">
          <h3>{{ totalNodes }}</h3>
          <p>Nodos/Torres</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📶</div>
        <div class="stat-info">
          <h3>{{ totalSectors }}</h3>
          <p>Sectores</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <h3>{{ totalClients }}</h3>
          <p>Clientes</p>
        </div>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters">
        <div class="filter-group">
          <input 
            type="text" 
            v-model="filters.search" 
            placeholder="Buscar zonas..."
            @input="debouncedSearch"
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        <div class="filter-group">
          <select v-model="filters.status" @change="loadZones">
            <option value="">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="filters.sortBy" @change="loadZones">
            <option value="name">Ordenar por Nombre</option>
            <option value="createdAt">Ordenar por Fecha</option>
            <option value="nodes_count">Ordenar por Nodos</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Estados de carga -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando zonas...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Error al cargar datos</h3>
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadZones">
        <span class="icon">🔄</span>
        Reintentar
      </button>
    </div>
    
    <div v-else-if="zones.length === 0" class="empty-state">
      <div class="empty-icon">🏢</div>
      <h3>No hay zonas configuradas</h3>
      <p>Comience creando su primera zona de cobertura</p>
      <button class="btn btn-primary" @click="goToCreateZone">
        <span class="icon">➕</span>
        Crear Primera Zona
      </button>
    </div>
    
    <!-- Vista Grid -->
    <div v-else-if="viewMode === 'grid'" class="zones-grid">
      <div 
        v-for="zone in zones" 
        :key="zone.id" 
        class="zone-card"
        @click="viewZone(zone.id)"
      >
        <div class="zone-header">
          <h3>{{ zone.name }}</h3>
          <div class="zone-status">
            <span :class="['status-badge', zone.active ? 'active' : 'inactive']">
              {{ zone.active ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
        </div>
        
        <div class="zone-description">
          <p>{{ zone.description || 'Sin descripción' }}</p>
        </div>
        
        <div class="zone-stats">
          <div class="stat-item">
            <span class="stat-label">Nodos:</span>
            <span class="stat-value">{{ zone.nodes_count || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sectores:</span>
            <span class="stat-value">{{ zone.sectors_count || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Clientes:</span>
            <span class="stat-value">{{ zone.clients_count || 0 }}</span>
          </div>
        </div>
        
        <div class="zone-location" v-if="zone.latitude && zone.longitude">
          <span class="location-icon">📍</span>
          <span class="coordinates">
            {{ zone.latitude.toFixed(4) }}, {{ zone.longitude.toFixed(4) }}
          </span>
        </div>
        
        <div class="zone-actions" @click.stop>
          <button class="btn btn-small" @click="viewZone(zone.id)" title="Ver detalles">
            <span class="icon">👁️</span>
          </button>
          <button class="btn btn-small btn-edit" @click="editZone(zone.id)" title="Editar">
            <span class="icon">✏️</span>
          </button>
          <button class="btn btn-small btn-danger" @click="confirmDeleteZone(zone)" title="Eliminar">
            <span class="icon">🗑️</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Vista Lista -->
    <div v-else class="zones-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Zona</th>
            <th>Descripción</th>
            <th>Ubicación</th>
            <th>Nodos</th>
            <th>Sectores</th>
            <th>Clientes</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="zone in zones" :key="zone.id" @click="viewZone(zone.id)" class="table-row">
            <td>
              <div class="zone-name">
                <strong>{{ zone.name }}</strong>
              </div>
            </td>
            <td>
              <span class="description">{{ zone.description || '-' }}</span>
            </td>
            <td>
              <div v-if="zone.latitude && zone.longitude" class="location-cell">
                <span class="coordinates">{{ zone.latitude.toFixed(4) }}, {{ zone.longitude.toFixed(4) }}</span>
              </div>
              <span v-else>-</span>
            </td>
            <td>
              <div class="count-badge">{{ zone.nodes_count || 0 }}</div>
            </td>
            <td>
              <div class="count-badge">{{ zone.sectors_count || 0 }}</div>
            </td>
            <td>
              <div class="count-badge">{{ zone.clients_count || 0 }}</div>
            </td>
            <td>
              <span :class="['status-badge', zone.active ? 'active' : 'inactive']">
                {{ zone.active ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="actions" @click.stop>
              <button class="btn btn-small" @click="viewZone(zone.id)" title="Ver">
                👁️
              </button>
              <button class="btn btn-small btn-edit" @click="editZone(zone.id)" title="Editar">
                ✏️
              </button>
              <button class="btn btn-small btn-danger" @click="confirmDeleteZone(zone)" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Eliminación</h3>
          <button class="modal-close" @click="cancelDelete">✕</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar la zona <strong>{{ deleteItem?.name }}</strong>?</p>
          <div v-if="deleteItem?.nodes_count > 0" class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <p><strong>¡Atención!</strong></p>
              <p>Esta zona tiene {{ deleteItem.nodes_count }} nodo(s) asociado(s) que también serán eliminados.</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="cancelDelete">Cancelar</button>
          <button class="btn btn-danger" @click="confirmDelete">
            <span class="icon">🗑️</span>
            Eliminar Zona
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkService from '@/services/network.service';

export default {
  name: 'NetworkView',
  data() {
    return {
      zones: [],
      loading: false,
      error: null,
      viewMode: 'grid', // 'grid' o 'table'
      
      filters: {
        search: '',
        status: '',
        sortBy: 'name'
      },
      
      // Estadísticas
      totalZones: 0,
      totalNodes: 0,
      totalSectors: 0,
      totalClients: 0,
      
      // Modal de eliminación
      showDeleteModal: false,
      deleteItem: null,
      
      // Debounce para búsqueda
      searchTimeout: null
    };
  },
  
  created() {
    this.loadZones();
    this.loadStats();
  },
  
  methods: {
    async loadZones() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await NetworkService.getAllZones(this.filters);
        
        if (response && response.data) {
          this.zones = response.data;
          this.totalZones = this.zones.length;
        } else {
          throw new Error('Formato de respuesta inesperado');
        }
      } catch (error) {
        console.error('Error al cargar zonas:', error);
        this.error = error.response?.data?.message || 'Error al cargar las zonas. Intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadStats() {
      try {
        // Cargar estadísticas generales de la red
        const [nodesResponse, sectorsResponse] = await Promise.all([
          NetworkService.getAllNodes(),
          NetworkService.getAllSectors()
        ]);
        
        this.totalNodes = nodesResponse.data?.length || 0;
        this.totalSectors = sectorsResponse.data?.length || 0;
        
        // Calcular total de clientes (esto podría venir de una API específica)
        // Por ahora lo calculamos sumando los clientes de cada zona
        this.totalClients = this.zones.reduce((sum, zone) => sum + (zone.clients_count || 0), 0);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    },
    
    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.loadZones();
      }, 300);
    },
    
    toggleView() {
      this.viewMode = this.viewMode === 'grid' ? 'table' : 'grid';
    },
    
    // Navegación
    goToCreateZone() {
      this.$router.push('/zones/new');
    },
    
    viewZone(id) {
      this.$router.push(`/zones/${id}`);
    },
    
    editZone(id) {
      this.$router.push(`/zones/${id}/edit`);
    },
    
    // Eliminación
    confirmDeleteZone(zone) {
      this.deleteItem = zone;
      this.showDeleteModal = true;
    },
    
    async confirmDelete() {
      if (!this.deleteItem) return;
      
      try {
        await NetworkService.deleteZone(this.deleteItem.id);
        
        // Recargar datos
        await this.loadZones();
        await this.loadStats();
        
        this.showDeleteModal = false;
        this.deleteItem = null;
        
        // Mostrar mensaje de éxito (podrías usar un toast/notification aquí)
        console.log('Zona eliminada exitosamente');
        
      } catch (error) {
        console.error('Error al eliminar zona:', error);
        this.error = error.response?.data?.message || 'Error al eliminar la zona. Intente nuevamente.';
        this.showDeleteModal = false;
      }
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
      this.deleteItem = null;
    }
  }
};
</script>

<style scoped>
.network-view {
  padding: 24px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-info h3 {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.stat-info p {
  color: #7f8c8d;
  margin: 0;
  font-size: 0.9rem;
}

/* Filtros */
.filters-section {
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-group {
  position: relative;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #7f8c8d;
}

.filter-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  font-size: 0.95rem;
  cursor: pointer;
}

/* Estados */
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon, .empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.error-state h3, .empty-state h3 {
  color: #2c3e50;
  margin-bottom: 8px;
}

.error-state p, .empty-state p {
  color: #7f8c8d;
  margin-bottom: 24px;
}

/* Vista Grid */
.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.zone-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.zone-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.zone-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f1f3f4;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.zone-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.zone-description {
  padding: 0 20px 16px;
}

.zone-description p {
  color: #7f8c8d;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.zone-stats {
  padding: 0 20px 16px;
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: #7f8c8d;
  text-transform: uppercase;
  font-weight: 500;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: #3498db;
}

.zone-location {
  padding: 0 20px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.zone-actions {
  padding: 16px 20px;
  border-top: 1px solid #f1f3f4;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Vista Tabla */
.zones-table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8f9fa;
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 1px solid #e1e5e9;
}

.data-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f3f4;
}

.table-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.zone-name strong {
  color: #2c3e50;
  font-weight: 600;
}

.description {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.location-cell {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.count-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-block;
}

/* Estados y badges */
.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background: #ffebee;
  color: #c62828;
}

/* Botones */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
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

.btn-edit {
  background: #f39c12;
  color: white;
}

.btn-edit:hover {
  background: #d68910;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.8rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  padding: 4px;
}

.modal-body {
  padding: 24px;
}

.modal-body p {
  margin: 0 0 16px;
  color: #2c3e50;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.warning-icon {
  font-size: 1.25rem;
  color: #f39c12;
}

.warning-text p {
  margin: 0 0 4px;
  color: #d68910;
}

.modal-actions {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .network-view {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .zones-grid {
    grid-template-columns: 1fr;
  }
  
  .zone-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .data-table {
    font-size: 0.85rem;
  }
  
  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(6),
  .data-table td:nth-child(6) {
    display: none;
  }
}
</style>