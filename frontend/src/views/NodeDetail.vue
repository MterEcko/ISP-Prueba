<template>
  <div class="node-detail">
    <div class="page-header">
      <h1 class="page-title">Detalles del Nodo</h1>
      <div class="page-actions">
        <button class="btn btn-edit" @click="editNode">Editar</button>
        <button class="btn btn-danger" @click="confirmDelete">Eliminar</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      Cargando datos del nodo...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="content">
      <div class="card">
        <div class="node-info">
          <div class="node-header">
            <h2>{{ node.name }}</h2>
            <span :class="['status-badge', node.active ? 'status-active' : 'status-inactive']">
              {{ node.active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <div class="info-label">Ubicación</div>
              <div class="info-value">{{ node.location || '-' }}</div>
            </div>
            
            <div class="info-row" v-if="node.latitude && node.longitude">
              <div class="info-label">Coordenadas</div>
              <div class="info-value">
                {{ node.latitude.toFixed(6) }}, {{ node.longitude.toFixed(6) }}
                <a 
                  :href="`https://maps.google.com/?q=${node.latitude},${node.longitude}`" 
                  target="_blank" 
                  class="map-link"
                >
                  Ver en mapa
                </a>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Descripción</div>
              <div class="info-value description">{{ node.description || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sección de sectores asociados -->
      <div class="card">
        <div class="card-header">
          <h3>Sectores</h3>
          <button class="btn btn-sm" @click="addSector">
            Agregar Sector
          </button>
        </div>
        
        <div v-if="loadingSectors" class="loading-indicator">
          Cargando sectores...
        </div>
        
        <div v-else-if="node.Sectors && node.Sectors.length === 0" class="empty-state">
          No hay sectores asociados a este nodo.
        </div>
        
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Frecuencia</th>
              <th>Azimut</th>
              <th>Polarización</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sector in node.Sectors" :key="sector.id">
              <td>{{ sector.name }}</td>
              <td>{{ sector.frequency || '-' }}</td>
              <td>{{ sector.azimuth !== null ? sector.azimuth + '°' : '-' }}</td>
              <td>{{ sector.polarization || '-' }}</td>
              <td>
                <span :class="['status-badge', sector.active ? 'status-active' : 'status-inactive']">
                  {{ sector.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-small" @click="viewSector(sector.id)">
                  Ver
                </button>
                <button class="btn btn-small btn-edit" @click="editSector(sector.id)">
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro de que desea eliminar el nodo <strong>{{ node.name }}</strong>?</p>
        <p v-if="node.Sectors && node.Sectors.length > 0" class="warning-text">
          ¡Atención! Este nodo tiene {{ node.Sectors.length }} sectores asociados que también serán eliminados.
        </p>
        <div class="modal-actions">
          <button class="btn" @click="cancelDelete">Cancelar</button>
          <button class="btn btn-danger" @click="deleteNode">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkService from '../services/network.service';

export default {
  name: 'NodeDetail',
  data() {
    return {
      node: {},
      loading: true,
      loadingSectors: false,
      error: null,
      showDeleteModal: false
    };
  },
  created() {
    this.loadNode();
  },
  methods: {
    async loadNode() {
      this.loading = true;
      this.error = null;
      
      try {
        const id = this.$route.params.id;
        const response = await NetworkService.getNode(id);
        this.node = response.data;
      } catch (error) {
        console.error('Error al cargar nodo:', error);
        this.error = 'No se pudo cargar la información del nodo. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    editNode() {
      this.$router.push(`/nodes/${this.$route.params.id}/edit`);
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
      // Redirigir a la página de creación de sector con el ID del nodo preseleccionado
      this.$router.push(`/sectors/new?nodeId=${this.$route.params.id}`);
    },
    
    viewSector(sectorId) {
      this.$router.push(`/sectors/${sectorId}`);
    },
    
    editSector(sectorId) {
      this.$router.push(`/sectors/${sectorId}/edit`);
    }
  }
};
</script>

<style scoped>
.node-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-actions {
  display: flex;
  gap: 10px;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 30px;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.node-header h2 {
  margin: 0;
  font-size: 1.8rem;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-row {
  display: flex;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.info-label {
  flex: 0 0 150px;
  font-weight: 600;
  color: #666;
}

.info-value {
  flex: 1;
}

.description {
  white-space: pre-line;
}

.map-link {
  margin-left: 10px;
  color: #3498db;
  text-decoration: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.loading-indicator {
  text-align: center;
  padding: 30px;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 30px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 0.85rem;
}

.status-active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-inactive {
  background-color: #ffebee;
  color: #c62828;
}

.btn {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 0.85rem;
}

.btn-small {
  padding: 5px 10px;
  font-size: 0.85rem;
  margin-right: 5px;
}

.btn-edit {
  background-color: #f39c12;
  color: white;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

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
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-bottom: 15px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.warning-text {
  color: #e74c3c;
  margin-top: 10px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .info-row {
    flex-direction: column;
    gap: 5px;
  }
  
  .info-label {
    flex: none;
  }
  
  .data-table th:nth-child(2),
  .data-table td:nth-child(2),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }
}
</style>