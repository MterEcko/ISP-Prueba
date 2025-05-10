<template>
  <div class="sector-detail">
    <div class="page-header">
      <h1 class="page-title">Detalles del Sector</h1>
      <div class="page-actions">
        <button class="btn btn-edit" @click="editSector">Editar</button>
        <button class="btn btn-danger" @click="confirmDelete">Eliminar</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-indicator">
      Cargando datos del sector...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="content">
      <div class="card">
        <div class="sector-info">
          <div class="sector-header">
            <h2>{{ sector.name }}</h2>
            <span :class="['status-badge', sector.active ? 'status-active' : 'status-inactive']">
              {{ sector.active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <div class="info-label">Nodo</div>
              <div class="info-value">
                <a @click="viewNode" class="node-link">{{ sector.Node ? sector.Node.name : '-' }}</a>
              </div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Frecuencia</div>
              <div class="info-value">{{ sector.frequency || '-' }}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Azimut</div>
              <div class="info-value">{{ sector.azimuth !== null ? sector.azimuth + '°' : '-' }}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Polarización</div>
              <div class="info-value">{{ getPolarizationLabel(sector.polarization) }}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Descripción</div>
              <div class="info-value description">{{ sector.description || '-' }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sección de clientes asociados -->
      <div class="card">
        <div class="card-header">
          <h3>Clientes en este Sector</h3>
        </div>
        
        <div v-if="loadingClients" class="loading-indicator">
          Cargando clientes...
        </div>
        
        <div v-else-if="sector.Clients && sector.Clients.length === 0" class="empty-state">
          No hay clientes asociados a este sector.
        </div>
        
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in sector.Clients" :key="client.id">
              <td>{{ client.firstName }} {{ client.lastName }}</td>
              <td>{{ client.email || '-' }}</td>
              <td>{{ client.phone || '-' }}</td>
              <td>
                <span :class="['status-badge', client.active ? 'status-active' : 'status-inactive']">
                  {{ client.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-small" @click="viewClient(client.id)">
                  Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Sección de dispositivos asociados -->
      <div class="card">
        <div class="card-header">
          <h3>Dispositivos en este Sector</h3>
          <button class="btn btn-sm" @click="addDevice">
            Agregar Dispositivo
          </button>
        </div>
        
        <div v-if="loadingDevices" class="loading-indicator">
          Cargando dispositivos...
        </div>
        
        <div v-else-if="!sector.Devices || sector.Devices.length === 0" class="empty-state">
          No hay dispositivos asociados a este sector.
        </div>
        
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Marca/Modelo</th>
              <th>IP</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in sector.Devices" :key="device.id">
              <td>{{ device.name }}</td>
              <td>{{ getDeviceTypeLabel(device.type) }}</td>
              <td>{{ device.brand }} {{ device.model }}</td>
              <td>{{ device.ipAddress || '-' }}</td>
              <td>
                <span :class="['status-badge', device.status === 'online' ? 'status-active' : 'status-inactive']">
                  {{ getDeviceStatusLabel(device.status) }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-small" @click="viewDevice(device.id)">
                  Ver
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
        <p>¿Está seguro de que desea eliminar el sector <strong>{{ sector.name }}</strong>?</p>
        <p v-if="sector.Clients && sector.Clients.length > 0" class="warning-text">
          ¡Atención! Este sector tiene {{ sector.Clients.length }} clientes asociados que pueden quedar sin servicio.
        </p>
        <div class="modal-actions">
          <button class="btn" @click="cancelDelete">Cancelar</button>
          <button class="btn btn-danger" @click="deleteSector">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkService from '../services/network.service';

export default {
  name: 'SectorDetail',
  data() {
    return {
      sector: {},
      loading: true,
      loadingClients: false,
      loadingDevices: false,
      error: null,
      showDeleteModal: false
    };
  },
  created() {
    this.loadSector();
  },
  methods: {
    async loadSector() {
      this.loading = true;
      this.error = null;
      
      try {
        const id = this.$route.params.id;
        const response = await NetworkService.getSector(id);
        this.sector = response.data;
      } catch (error) {
        console.error('Error al cargar sector:', error);
        this.error = 'No se pudo cargar la información del sector. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    getPolarizationLabel(polarization) {
      const labels = {
        'vertical': 'Vertical',
        'horizontal': 'Horizontal',
        'dual': 'Dual',
        'circular': 'Circular'
      };
      
      return labels[polarization] || '-';
    },
    
    getDeviceTypeLabel(type) {
      const labels = {
        'router': 'Router',
        'switch': 'Switch',
        'antenna': 'Antena',
        'cpe': 'CPE',
        'other': 'Otro'
      };
      
      return labels[type] || type;
    },
    
    getDeviceStatusLabel(status) {
      const labels = {
        'online': 'En línea',
        'offline': 'Fuera de línea',
        'maintenance': 'En mantenimiento',
        'unknown': 'Desconocido'
      };
      
      return labels[status] || status;
    },
    
    viewNode() {
      if (this.sector.nodeId) {
        this.$router.push(`/nodes/${this.sector.nodeId}`);
      }
    },
    
    editSector() {
      this.$router.push(`/sectors/${this.$route.params.id}/edit`);
    },
    
    confirmDelete() {
      this.showDeleteModal = true;
    },
    
    cancelDelete() {
      this.showDeleteModal = false;
    },
    
    async deleteSector() {
      try {
        await NetworkService.deleteSector(this.$route.params.id);
        this.$router.push('/network');
      } catch (error) {
        console.error('Error al eliminar sector:', error);
        this.error = 'Error al eliminar el sector. ' + (error.response?.data?.message || '');
        this.showDeleteModal = false;
      }
    },
    
    viewClient(clientId) {
      this.$router.push(`/clients/${clientId}`);
    },
    
    addDevice() {
      this.$router.push(`/devices/new?sectorId=${this.$route.params.id}`);
    },
    
    viewDevice(deviceId) {
      this.$router.push(`/devices/${deviceId}`);
    }
  }
};
</script>

<style scoped>
.sector-detail {
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

.sector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sector-header h2 {
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

.node-link {
  color: #3498db;
  cursor: pointer;
  text-decoration: none;
}

.node-link:hover {
  text-decoration: underline;
}

.description {
  white-space: pre-line;
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
  .data-table th:nth-child(3),
  .data-table td:nth-child(3) {
    display: none;
  }
}
</style>