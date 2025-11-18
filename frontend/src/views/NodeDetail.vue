<template>
  <div class="node-detail">
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">{{ node.name || 'Cargando...' }}</h1>
        <div class="breadcrumb">
          <router-link to="/network" class="breadcrumb-link">Red</router-link>
          <span class="breadcrumb-separator">›</span>
          <span class="breadcrumb-current">{{ node.name }}</span>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn btn-edit" @click="editNode" :disabled="loading">Editar</button>
        <button class="btn btn-danger" @click="confirmDelete" :disabled="loading">Eliminar</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      <div class="loading-spinner"></div>
      Cargando datos del nodo...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="content">
      <!-- Información básica del nodo -->
      <div class="card">
        <div class="card-header">
          <h3>Información del Nodo</h3>
          <span :class="['status-badge', node.active ? 'status-active' : 'status-inactive']">
            {{ node.active ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Zona</div>
            <div class="info-value">{{ node.Zone?.name || '-' }}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Ubicación</div>
            <div class="info-value">{{ node.location || '-' }}</div>
          </div>
          
          <div class="info-item" v-if="node.latitude && node.longitude">
            <div class="info-label">Coordenadas</div>
            <div class="info-value">
              {{ node.latitude.toFixed(6) }}, {{ node.longitude.toFixed(6) }}
              <a 
                :href="`https://maps.google.com/?q=${node.latitude},${node.longitude}`" 
                target="_blank" 
                class="map-link"
              >
                📍 Ver en mapa
              </a>
            </div>
          </div>
          
          <div class="info-item full-width" v-if="node.description">
            <div class="info-label">Descripción</div>
            <div class="info-value description">{{ node.description }}</div>
          </div>
        </div>
      </div>

      <!-- Equipos (Routers Mikrotik) -->
      <div class="card">
        <div class="card-header">
          <h3>Equipos de Red</h3>
          <button class="btn btn-primary btn-sm" @click="addRouter">
            ➕ Agregar Router
          </button>
        </div>
        
        <div v-if="loadingRouters" class="loading-indicator">
          Cargando equipos...
        </div>
        
        <div v-else-if="!mikrotikRouters || mikrotikRouters.length === 0" class="empty-state">
          <div class="empty-icon">🔌</div>
          <p>No hay equipos de red configurados en este nodo.</p>
          <button class="btn btn-primary" @click="addRouter">
            Agregar primer router
          </button>
        </div>
        
        <div v-else class="equipment-grid">
          <div v-for="router in mikrotikRouters" :key="router.id" class="equipment-card">
            <div class="equipment-header">
              <div class="equipment-name">
                <h4>{{ router.name }}</h4>
                <span :class="['status-dot', router.active ? 'status-active' : 'status-inactive']"></span>
              </div>
              <div class="equipment-actions">
                <button class="btn btn-small btn-edit" @click="editRouter(router.id)">
                  ✏️ Editar
                </button>
                <button class="btn btn-small" @click="viewRouter(router.id)">
                  👁️ Ver
                </button>
              </div>
            </div>
            
            <div class="equipment-info">
              <div class="info-row">
                <span class="label">IP:</span>
                <span class="value">{{ router.ip_address || router.ipAddress || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Modelo:</span>
                <span class="value">{{ router.router_model || router.routerModel || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">RouterOS:</span>
                <span class="value">{{ router.routeros_version || router.routerosVersion || '-' }}</span>
              </div>
              <div class="info-row" v-if="router.last_sync || router.lastSync">
                <span class="label">Última sincronización:</span>
                <span class="value">{{ formatDate(router.last_sync || router.lastSync) }}</span>
              </div>
            </div>
            
            <!-- Pools IP del router -->
            <div v-if="router.IpPools && router.IpPools.length > 0" class="pools-section">
              <h5>Pools IP ({{ router.IpPools.length }})</h5>
              <div class="pools-list">
                <div v-for="pool in router.IpPools" :key="pool.id" class="pool-item">
                  <span class="pool-name">{{ pool.pool_name || pool.poolName }}</span>
                  <span class="pool-network">{{ pool.network_address || pool.networkAddress }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sectores del nodo -->
      <div class="card">
        <div class="card-header">
          <h3>Sectores</h3>
          <div class="header-stats">
            <span class="stat">Total: {{ (node.Sectors || []).length }}</span>
            <span class="stat active">Activos: {{ activeSectorsCount }}</span>
            <button class="btn btn-primary btn-sm" @click="addSector">
              ➕ Agregar Sector
            </button>
          </div>
        </div>
        
        <div v-if="loadingSectors" class="loading-indicator">
          Cargando sectores...
        </div>
        
        <div v-else-if="!node.Sectors || node.Sectors.length === 0" class="empty-state">
          <div class="empty-icon">📡</div>
          <p>Este nodo no tiene sectores configurados.</p>
          <button class="btn btn-primary" @click="addSector">
            Crear primer sector
          </button>
        </div>
        
        <div v-else class="sectors-grid">
          <div v-for="sector in node.Sectors" :key="sector.id" class="sector-card">
            <div class="sector-header">
              <div class="sector-name">
                <h4>{{ sector.name }}</h4>
                <span :class="['status-badge', sector.active ? 'status-active' : 'status-inactive']">
                  {{ sector.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
            
            <div class="sector-specs">
              <div class="spec-item" v-if="sector.frequency">
                <span class="spec-label">Frecuencia:</span>
                <span class="spec-value">{{ sector.frequency }}</span>
              </div>
              <div class="spec-item" v-if="sector.azimuth !== null && sector.azimuth !== undefined">
                <span class="spec-label">Azimut:</span>
                <span class="spec-value">{{ sector.azimuth }}°</span>
              </div>
              <div class="spec-item" v-if="sector.polarization">
                <span class="spec-label">Polarización:</span>
                <span class="spec-value">{{ sector.polarization }}</span>
              </div>
              <div class="spec-item" v-if="sector.elevation !== null && sector.elevation !== undefined">
                <span class="spec-label">Elevación:</span>
                <span class="spec-value">{{ sector.elevation }}°</span>
              </div>
            </div>
            
            <div class="sector-actions">
              <button class="btn btn-small" @click="viewSector(sector.id)">
                👁️ Ver Detalles
              </button>
              <button class="btn btn-small btn-edit" @click="editSector(sector.id)">
                ✏️ Editar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas rápidas -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number">{{ mikrotikRouters?.length || 0 }}</div>
          <div class="stat-label">Equipos</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ (node.Sectors || []).length }}</div>
          <div class="stat-label">Sectores</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ totalIpPools }}</div>
          <div class="stat-label">Pools IP</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ activeSectorsCount }}</div>
          <div class="stat-label">Sectores Activos</div>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>⚠️ Confirmar Eliminación</h3>
        <p>¿Está seguro de que desea eliminar el nodo <strong>{{ node.name }}</strong>?</p>
        
        <div class="warning-details">
          <p v-if="(node.Sectors || []).length > 0" class="warning-text">
            🔸 Este nodo tiene <strong>{{ node.Sectors.length }}</strong> sectores que serán eliminados.
          </p>
          <p v-if="(mikrotikRouters || []).length > 0" class="warning-text">
            🔸 Este nodo tiene <strong>{{ mikrotikRouters.length }}</strong> equipos de red configurados.
          </p>
          <p class="warning-text">
            🔸 Esta acción no se puede deshacer.
          </p>
        </div>
        
        <div class="modal-actions">
          <button class="btn" @click="cancelDelete">Cancelar</button>
          <button class="btn btn-danger" @click="deleteNode">Eliminar Nodo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkService from '../services/network.service';
import DeviceService from '../services/device.service';
// eslint-disable-next-line no-unused-vars
import MikrotikService from '../services/mikrotik.service';

export default {
  name: 'NodeDetail',
  data() {
    return {
      node: {},
      mikrotikRouters: [],
      loading: true,
      loadingRouters: false,
      loadingSectors: false,
      error: null,
      showDeleteModal: false
    };
  },
  computed: {
    activeSectorsCount() {
      return (this.node.Sectors || []).filter(sector => sector.active).length;
    },
    totalIpPools() {
      if (!this.mikrotikRouters) return 0;
      return this.mikrotikRouters.reduce((total, router) => {
        return total + ((router.IpPools || []).length);
      }, 0);
    }
  },
  created() {
    this.loadNodeData();
  },
  methods: {
    async loadNodeData() {
      this.loading = true;
      this.error = null;
      
      try {
        const id = this.$route.params.id;
        
        // Cargar información del nodo con relaciones
        const nodeResponse = await NetworkService.getNode(id, {
          include: ['Zone', 'Sectors', 'MikrotikRouters', 'MikrotikRouters.IpPools']
        });
        this.node = nodeResponse.data;
        
        // Si no vienen los routers incluidos, cargarlos por separado
        if (!this.node.MikrotikRouters) {
          await this.loadMikrotikRouters(id);
        } else {
          this.mikrotikRouters = this.node.MikrotikRouters;
        }
        
      } catch (error) {
        console.error('Error al cargar nodo:', error);
        this.error = 'No se pudo cargar la información del nodo. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    async loadMikrotikRouters(nodeId) {
      this.loadingRouters = true;
      try {
    // ✅ CARGAR DISPOSITIVOS MIKROTIK DEL NODO
        const response = await DeviceService.getDevices({ 
          brand: 'mikrotik', 
          nodeId: nodeId,
          type: 'router'
        });
    
        this.mikrotikRouters = response.data.devices || response.data || [];
        console.log('Routers Mikrotik cargados:', this.mikrotikRouters);
    
      } catch (error) {
        console.error('Error al cargar routers Mikrotik:', error);
        this.mikrotikRouters = [];
        // No mostrar error si es solo por los routers
      } finally {
        this.loadingRouters = false;
      }
    },
    
    editNode() {
      this.$router.push(`/nodes/${this.$route.params.id}/edit`);
    },

    addRouter() {
      this.$router.push(`/routers/new?nodeId=${this.$route.params.id}&returnTo=node`);
    },

    editRouter(routerId) {
      this.$router.push(`/routers/${routerId}/edit?returnTo=node`);
    },

    viewRouter(routerId) {
      this.$router.push(`/routers/${routerId}`);
    },
    
    confirmDelete() {
      this.showDeleteModal = true;
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
    },
    
    async deleteNode() {
      try {
        await NetworkService.deleteNode(this.$route.params.id);
        this.$router.push('/network');
      } catch (error) {
        console.error('Error al eliminar nodo:', error);
        this.error = 'Error al eliminar el nodo. ' + (error.response?.data?.message || '');
        this.showDeleteModal = false;
      }
    },
    
    addSector() {
      this.$router.push(`/sectors/new?nodeId=${this.$route.params.id}&returnTo=node`);
    },
    
    viewSector(sectorId) {
      this.$router.push(`/sectors/${sectorId}`);
    },
    
    editSector(sectorId) {
      this.$router.push(`/sectors/${sectorId}/edit`);
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-MX', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }).format(date);
      } catch {
        return '-';
      }
    }
  }
};
</script>

<style scoped>
.node-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  color: #333;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #666;
}

.breadcrumb-link {
  color: #0066cc;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-separator {
  color: #999;
}

.breadcrumb-current {
  color: #333;
  font-weight: 500;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.header-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat {
  font-size: 0.85rem;
  color: #666;
  padding: 4px 8px;
  background-color: #f3f4f6;
  border-radius: 12px;
}

.stat.active {
  background-color: #dcfce7;
  color: #166534;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-label {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

.info-value {
  color: #333;
  font-size: 1rem;
}

.description {
  white-space: pre-line;
  line-height: 1.5;
}

.map-link {
  margin-left: 8px;
  color: #0066cc;
  text-decoration: none;
  font-size: 0.9rem;
}

.map-link:hover {
  text-decoration: underline;
}

/* Equipment Grid */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.equipment-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.equipment-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.equipment-name h4 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.equipment-actions {
  display: flex;
  gap: 8px;
}

.equipment-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
}

.value {
  color: #333;
  font-size: 0.9rem;
}

.pools-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.pools-section h5 {
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  color: #666;
}

.pools-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pool-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  padding: 2px 0;
}

.pool-name {
  font-weight: 500;
  color: #333;
}

.pool-network {
  color: #666;
  font-family: monospace;
}

/* Sectors Grid */
.sectors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.sector-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.sector-header {
  margin-bottom: 12px;
}

.sector-name {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sector-name h4 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.sector-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.spec-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.spec-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

.spec-value {
  font-size: 0.9rem;
  color: #333;
}

.sector-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.stat-card {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #0066cc;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9rem;
  color: #666;
}

/* Status indicators */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active {
  background-color: #dcfce7;
  color: #166534;
}

.status-inactive {
  background-color: #fef2f2;
  color: #dc2626;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.status-active {
  background-color: #22c55e;
}

.status-dot.status-inactive {
  background-color: #ef4444;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}

.btn-small {
  padding: 4px 8px;
  font-size: 0.8rem;
}

.btn-primary {
  background-color: #0066cc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0052a3;
}

.btn-edit {
  background-color: #f59e0b;
  color: white;
}

.btn-edit:hover {
  background-color: #d97706;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn:not(.btn-primary):not(.btn-edit):not(.btn-danger) {
  background-color: #f3f4f6;
  color: #374151;
}

.btn:not(.btn-primary):not(.btn-edit):not(.btn-danger):hover {
  background-color: #e5e7eb;
}

/* Loading and Empty States */
.loading-indicator {
  text-align: center;
  padding: 40px;
  color: #666;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.error-message {
  background-color: #fef2f2;
  color: #dc2626;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-bottom: 20px;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 24px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-bottom: 16px;
  color: #333;
}

.warning-details {
  background-color: #fef2f2;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  border-left: 4px solid #ef4444;
}

.warning-text {
  color: #dc2626;
  margin: 8px 0;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Responsive */
@media (max-width: 768px) {
  .node-detail {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .equipment-grid,
  .sectors-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .header-stats {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .sector-specs {
    grid-template-columns: 1fr;
  }
  
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>