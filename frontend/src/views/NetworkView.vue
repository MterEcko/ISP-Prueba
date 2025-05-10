<template>
  <div class="network-view">
    <h1 class="page-title">Gestión de Red</h1>
    
    <!-- SECCIÓN DE NODOS -->
    <div class="card">
      <div class="card-header">
        <h2>Nodos</h2>
        <button class="btn btn-primary" @click="goToCreateNode">Agregar Nodo</button>
      </div>
      
      <div class="filters">
        <div class="filter-group">
          <input 
            type="text" 
            v-model="nodeFilters.name" 
            placeholder="Buscar por nombre"
            @input="loadNodes"
          />
        </div>
        <div class="filter-group">
          <select v-model="nodeFilters.active" @change="loadNodes">
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>
      
      <div v-if="loadingNodes" class="loading-indicator">
        Cargando nodos...
      </div>
      
      <div v-else-if="nodeError" class="error-message">
        {{ nodeError }}
      </div>
      
      <div v-else-if="nodes.length === 0" class="empty-state">
        <p>No se encontraron nodos.</p>
        <button class="btn" @click="goToCreateNode">Crear Nodo</button>
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ubicación</th>
            <th>Coordenadas</th>
            <th>Sectores</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in nodes" :key="node.id">
            <td>{{ node.name }}</td>
            <td>{{ node.location || '-' }}</td>
            <td v-if="node.latitude && node.longitude">
              {{ node.latitude.toFixed(4) }}, {{ node.longitude.toFixed(4) }}
            </td>
            <td v-else>-</td>
            <td>{{ node.Sectors ? node.Sectors.length : 0 }}</td>
            <td>
              <span :class="['status-badge', node.active ? 'status-active' : 'status-inactive']">
                {{ node.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="actions">
              <button class="btn btn-small" @click="viewNode(node.id)">
                Ver
              </button>
              <button class="btn btn-small btn-edit" @click="editNode(node.id)">
                Editar
              </button>
              <button class="btn btn-small btn-danger" @click="confirmDeleteNode(node)">
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- SECCIÓN DE SECTORES -->
    <div class="card">
      <div class="card-header">
        <h2>Sectores</h2>
        <button class="btn btn-primary" @click="goToCreateSector">Agregar Sector</button>
      </div>
      
      <div class="filters">
        <div class="filter-group">
          <input 
            type="text" 
            v-model="sectorFilters.name" 
            placeholder="Buscar por nombre"
            @input="loadSectors"
          />
        </div>
        <div class="filter-group">
          <select v-model="sectorFilters.nodeId" @change="loadSectors">
            <option value="">Todos los nodos</option>
            <option v-for="node in nodes" :key="node.id" :value="node.id">
              {{ node.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <select v-model="sectorFilters.active" @change="loadSectors">
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>
      
      <div v-if="loadingSectors" class="loading-indicator">
        Cargando sectores...
      </div>
      
      <div v-else-if="sectorError" class="error-message">
        {{ sectorError }}
      </div>
      
      <div v-else-if="sectors.length === 0" class="empty-state">
        <p>No se encontraron sectores.</p>
        <button class="btn" @click="goToCreateSector">Crear Sector</button>
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Nodo</th>
            <th>Frecuencia</th>
            <th>Azimut</th>
            <th>Polarización</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sector in sectors" :key="sector.id">
            <td>{{ sector.name }}</td>
            <td>{{ sector.Node ? sector.Node.name : '-' }}</td>
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
              <button class="btn btn-small btn-danger" @click="confirmDeleteSector(sector)">
                Eliminar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Modal de confirmación para eliminar -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro de que desea eliminar {{ deleteType === 'node' ? 'el nodo' : 'el sector' }} <strong>{{ deleteItem.name }}</strong>?</p>
        <p v-if="deleteType === 'node' && deleteItem.Sectors && deleteItem.Sectors.length > 0" class="warning-text">
          ¡Atención! Este nodo tiene {{ deleteItem.Sectors.length }} sectores asociados que también serán eliminados.
        </p>
        <div class="modal-actions">
          <button class="btn" @click="cancelDelete">Cancelar</button>
          <button class="btn btn-danger" @click="confirmDelete">Eliminar</button>
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
      // Datos de nodos
      nodes: [],
      loadingNodes: false,
      nodeError: null,
      nodeFilters: {
        name: '',
        active: ''
      },
      
      // Datos de sectores
      sectors: [],
      loadingSectors: false,
      sectorError: null,
      sectorFilters: {
        name: '',
        nodeId: '',
        active: ''
      },
      
      // Modal de confirmación para eliminar
      showDeleteModal: false,
      deleteType: null, // 'node' o 'sector'
      deleteItem: null
    };
  },
  created() {
    // Cargar datos al iniciar el componente
    this.loadNodes();
    this.loadSectors();
  },
  methods: {
    // MÉTODOS PARA NODOS
    async loadNodes() {
      this.loadingNodes = true;
      this.nodeError = null;
      
      try {
      console.log('Solicitando nodos al servidor...');
        const response = await NetworkService.getAllNodes(this.nodeFilters);
        console.log('Respuesta completa:', response);
        if (response && response.data) {
          console.log('Nodos cargados:', response.data);
          this.nodes = response.data;
        } else {
          console.error('Formato de respuesta inesperado:', response);
          this.nodeError = 'La respuesta del servidor no tiene el formato esperado.';
        }
      } catch (error) {
        console.error('Error al cargar nodos:', error);
        const errorMessage = error.response?.data?.message || 'Error al cargar los nodos';
        this.nodeError = `No se pudieron cargar los nodos: ${errorMessage}`;
      } finally {
        this.loadingNodes = false;
      }
    },
    
    goToCreateNode() {
      this.$router.push('/nodes/new');
    },
    
    viewNode(id) {
      this.$router.push(`/nodes/${id}`);
    },
    
    editNode(id) {
      this.$router.push(`/nodes/${id}/edit`);
    },
    
    confirmDeleteNode(node) {
      this.deleteType = 'node';
      this.deleteItem = node;
      this.showDeleteModal = true;
    },
    
    // MÉTODOS PARA SECTORES
    async loadSectors() {
      this.loadingSectors = true;
      this.sectorError = null;
      
      try {
        const response = await NetworkService.getAllSectors(this.sectorFilters);
        console.log('Sectores cargados:', response.data);
        this.sectors = response.data;
      } catch (error) {
        console.error('Error al cargar sectores:', error);
        this.sectorError = 'No se pudieron cargar los sectores. Por favor, intente nuevamente.';
      } finally {
        this.loadingSectors = false;
      }
    },
    
    goToCreateSector() {
      this.$router.push('/sectors/new');
    },
    
    viewSector(id) {
      this.$router.push(`/sectors/${id}`);
    },
    
    editSector(id) {
      this.$router.push(`/sectors/${id}/edit`);
    },
    
    confirmDeleteSector(sector) {
      this.deleteType = 'sector';
      this.deleteItem = sector;
      this.showDeleteModal = true;
    },
    
    // MÉTODOS DEL MODAL DE CONFIRMACIÓN
    async confirmDelete() {
      try {
        if (this.deleteType === 'node') {
          await NetworkService.deleteNode(this.deleteItem.id);
          this.loadNodes();
        } else if (this.deleteType === 'sector') {
          await NetworkService.deleteSector(this.deleteItem.id);
          this.loadSectors();
        }
        
        this.showDeleteModal = false;
        this.deleteItem = null;
        this.deleteType = null;
      } catch (error) {
        console.error('Error al eliminar:', error);
        
        // Mostrar mensaje de error específico si el servidor lo proporciona
        const errorMessage = error.response?.data?.message || 'Error al eliminar. Intente nuevamente.';
        
        if (this.deleteType === 'node') {
          this.nodeError = errorMessage;
        } else {
          this.sectorError = errorMessage;
        }
        
        this.showDeleteModal = false;
      }
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
      this.deleteItem = null;
      this.deleteType = null;
    }
  }
};
</script>

<style scoped>
.network-view {
  padding: 20px;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-group input,
.filter-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
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

.data-table tbody tr:hover {
  background-color: #f8f9fa;
}

.loading-indicator {
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-state button {
  margin-top: 15px;
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

.actions {
  white-space: nowrap;
}

.btn {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #2980b9;
}

.btn-primary {
  background-color: #3498db;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-edit {
  background-color: #f39c12;
}

.btn-edit:hover {
  background-color: #d35400;
}

.btn-danger {
  background-color: #e74c3c;
}

.btn-danger:hover {
  background-color: #c0392b;
}

.btn-small {
  padding: 5px 10px;
  font-size: 0.85rem;
  margin-right: 5px;
}

/* Modal de confirmación */
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
  .filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .data-table th:nth-child(3),
  .data-table td:nth-child(3),
  .data-table th:nth-child(4),
  .data-table td:nth-child(4) {
    display: none;
  }
  
  .btn-small {
    padding: 4px 8px;
    font-size: 0.8rem;
  }
}
</style>