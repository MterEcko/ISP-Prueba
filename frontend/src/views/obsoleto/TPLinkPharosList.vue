<template>
  <div class="pharos-list">
    <h2>Dispositivos TP-Link Pharos</h2>
    
    <div class="actions-bar">
      <button @click="showAddModal = true" class="btn btn-primary">
        <i class="fas fa-plus"></i> Nuevo Dispositivo
      </button>
      <button @click="refreshData" class="btn btn-secondary">
        <i class="fas fa-sync"></i> Actualizar
      </button>
    </div>
    
    <div class="filters-bar">
      <div class="form-group">
        <input type="text" v-model="filters.name" placeholder="Buscar por nombre" class="form-control" @input="debouncedSearch">
      </div>
      
      <div class="form-group">
        <select v-model="filters.nodeId" class="form-control" @change="loadDevices">
          <option value="">Todos los nodos</option>
          <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.name }}</option>
        </select>
      </div>
      
      <div class="form-group">
        <select v-model="filters.sectorId" class="form-control" @change="loadDevices">
          <option value="">Todos los sectores</option>
          <option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.name }}</option>
        </select>
      </div>
      
      <div class="form-group">
        <select v-model="filters.status" class="form-control" @change="loadDevices">
          <option value="">Todos los estados</option>
          <option value="online">En línea</option>
          <option value="offline">Fuera de línea</option>
          <option value="warning">Alerta</option>
          <option value="unknown">Desconocido</option>
        </select>
      </div>
    </div>
    
    <div v-if="loading" class="text-center my-4">
      <div class="spinner-border" role="status">
        <span class="sr-only">Cargando...</span>
      </div>
    </div>
    
    <div v-else-if="devices.length === 0" class="alert alert-info">
      No se encontraron dispositivos Pharos.
    </div>
    
    <div v-else class="devices-table-container">
      <table class="table table-striped devices-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>IP</th>
            <th>MAC</th>
            <th>Modelo</th>
            <th>Nodo</th>
            <th>Sector</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.id">
            <td>{{ device.name }}</td>
            <td>{{ device.ipAddress }}</td>
            <td>{{ device.macAddress }}</td>
            <td>{{ device.model }}</td>
            <td>{{ device.node ? device.node.name : 'N/A' }}</td>
            <td>{{ device.sector ? device.sector.name : 'N/A' }}</td>
            <td>
              <span :class="'status-badge ' + device.connectionStatus">
                {{ getStatusLabel(device.connectionStatus) }}
              </span>
            </td>
            <td class="actions">
              <button @click="viewDevice(device)" class="btn btn-sm btn-info" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>
              <button @click="editDevice(device)" class="btn btn-sm btn-primary" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button @click="toggleDeviceStatus(device)" class="btn btn-sm" 
                :class="device.active ? 'btn-warning' : 'btn-success'" 
                :title="device.active ? 'Desactivar' : 'Activar'">
                <i class="fas" :class="device.active ? 'fa-power-off' : 'fa-play'"></i>
              </button>
              <button @click="confirmDelete(device)" class="btn btn-sm btn-danger" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="pagination">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1" 
          class="btn btn-sm btn-outline-secondary">
          Anterior
        </button>
        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages" 
          class="btn btn-sm btn-outline-secondary">
          Siguiente
        </button>
      </div>
    </div>
    
    <!-- Modal para agregar/editar dispositivo -->
    <div v-if="showAddModal || showEditModal" class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ showEditModal ? 'Editar Dispositivo' : 'Nuevo Dispositivo' }}</h3>
          <button @click="closeModals" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveDevice">
            <div class="form-group">
              <label>Nombre:</label>
              <input type="text" v-model="currentDevice.name" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Dirección IP:</label>
              <input type="text" v-model="currentDevice.ipAddress" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Dirección MAC:</label>
              <input type="text" v-model="currentDevice.macAddress" class="form-control">
            </div>
            
            <div class="form-group">
              <label>Modelo:</label>
              <input type="text" v-model="currentDevice.model" class="form-control">
            </div>
            
            <div class="form-group">
              <label>Puerto API:</label>
              <input type="number" v-model="currentDevice.apiPort" class="form-control">
            </div>
            
            <div class="form-group">
              <label>Nodo:</label>
              <select v-model="currentDevice.nodeId" class="form-control">
                <option value="">Seleccionar nodo</option>
                <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.name }}</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Sector:</label>
              <select v-model="currentDevice.sectorId" class="form-control">
                <option value="">Seleccionar sector</option>
                <option v-for="sector in sectors" :key="sector.id" :value="sector.id">{{ sector.name }}</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Usuario:</label>
              <input type="text" v-model="currentDevice.username" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label>Contraseña:</label>
              <input type="password" v-model="currentDevice.password" class="form-control" required>
            </div>
            
            <div class="modal-footer">
              <button type="button" @click="closeModals" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Modal para confirmar eliminación -->
    <div v-if="showDeleteModal" class="modal-backdrop">
      <div class="modal-content modal-sm">
        <div class="modal-header">
          <h3>Confirmar eliminación</h3>
          <button @click="showDeleteModal = false" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro que desea eliminar el dispositivo "{{ deviceToDelete?.name }}"?</p>
          <div class="modal-footer">
            <button @click="showDeleteModal = false" class="btn btn-secondary">Cancelar</button>
            <button @click="deleteDevice" class="btn btn-danger">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para ver detalles del dispositivo -->
    <div v-if="showViewModal" class="modal-backdrop">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3>Detalles del Dispositivo</h3>
          <button @click="showViewModal = false" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="loadingDetails" class="text-center my-4">
            <div class="spinner-border" role="status">
              <span class="sr-only">Cargando...</span>
            </div>
          </div>
          
          <div v-else>
            <div class="device-details">
              <div class="row">
                <div class="col-md-6">
                  <h4>Información Básica</h4>
                  <table class="table table-sm">
                    <tr><th>Nombre:</th><td>{{ currentDevice.name }}</td></tr>
                    <tr><th>IP:</th><td>{{ currentDevice.ipAddress }}</td></tr>
                    <tr><th>MAC:</th><td>{{ currentDevice.macAddress }}</td></tr>
                    <tr><th>Modelo:</th><td>{{ currentDevice.model }}</td></tr>
                    <tr><th>Firmware:</th><td>{{ currentDevice.firmwareVersion || 'N/A' }}</td></tr>
                    <tr><th>Estado:</th><td>{{ getStatusLabel(currentDevice.connectionStatus) }}</td></tr>
                    <tr><th>Nodo:</th><td>{{ currentDevice.node?.name || 'N/A' }}</td></tr>
                    <tr><th>Sector:</th><td>{{ currentDevice.sector?.name || 'N/A' }}</td></tr>
                  </table>
                </div>
                
                <div class="col-md-6">
                  <h4>Acciones</h4>
                  <div class="action-buttons">
                    <button @click="rebootDevice" class="btn btn-warning" :disabled="!deviceIsOnline">
                      <i class="fas fa-power-off"></i> Reiniciar
                    </button>
                    <button @click="refreshDeviceInfo" class="btn btn-primary">
                      <i class="fas fa-sync"></i> Actualizar Info
                    </button>
                    <button @click="getConnectedClients" class="btn btn-info" :disabled="!deviceIsOnline">
                      <i class="fas fa-users"></i> Clientes Conectados
                    </button>
                    <button @click="getTrafficStats" class="btn btn-success" :disabled="!deviceIsOnline">
                      <i class="fas fa-chart-line"></i> Estadísticas
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Sección para mostrar clientes conectados -->
              <div v-if="showClientsTab" class="mt-4">
                <h4>Clientes Conectados</h4>
                <div v-if="loadingClients" class="text-center my-4">
                  <div class="spinner-border" role="status">
                    <span class="sr-only">Cargando...</span>
                  </div>
                </div>
                <div v-else-if="connectedClients.length === 0" class="alert alert-info">
                  No hay clientes conectados.
                </div>
                <table v-else class="table table-striped">
                  <thead>
                    <tr>
                      <th>MAC</th>
                      <th>Hostname</th>
                      <th>IP</th>
                      <th>Señal</th>
                      <th>Tiempo Conectado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(client, index) in connectedClients" :key="index">
                      <td>{{ client.macAddress }}</td>
                      <td>{{ client.hostname || 'N/A' }}</td>
                      <td>{{ client.ipAddress || 'N/A' }}</td>
                      <td>{{ client.signalStrength || 'N/A' }}</td>
                      <td>{{ formatUptime(client.uptime) || 'N/A' }}</td>
                      <td>
                        <button @click="configureClientQoS(client)" class="btn btn-sm btn-primary">
                          <i class="fas fa-tachometer-alt"></i> QoS
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Sección para mostrar estadísticas de tráfico -->
              <div v-if="showStatsTab" class="mt-4">
                <h4>Estadísticas de Tráfico</h4>
                <div v-if="loadingStats" class="text-center my-4">
                  <div class="spinner-border" role="status">
                    <span class="sr-only">Cargando...</span>
                  </div>
                </div>
                <div v-else class="stats-container">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="card">
                        <div class="card-header">Resumen</div>
                        <div class="card-body">
                          <table class="table table-sm">
                            <tr><th>Tráfico Entrada:</th><td>{{ formatBytes(trafficStats.rxBytes) }}</td></tr>
                            <tr><th>Tráfico Salida:</th><td>{{ formatBytes(trafficStats.txBytes) }}</td></tr>
                            <tr><th>Clientes Conectados:</th><td>{{ trafficStats.clientsCount || 0 }}</td></tr>
                            <tr><th>Tiempo de Actividad:</th><td>{{ formatUptime(trafficStats.uptime) }}</td></tr>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="card">
                        <div class="card-header">Sistema</div>
                        <div class="card-body">
                          <table class="table table-sm">
                            <tr><th>CPU:</th><td>{{ trafficStats.cpuUsage || 'N/A' }}%</td></tr>
                            <tr><th>Memoria:</th><td>{{ trafficStats.memoryUsage || 'N/A' }}%</td></tr>
                            <tr><th>Temperatura:</th><td>{{ trafficStats.temperature || 'N/A' }}°C</td></tr>
                            <tr><th>Firmware:</th><td>{{ trafficStats.firmwareVersion || 'N/A' }}</td></tr>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button @click="showViewModal = false" class="btn btn-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para configurar QoS de cliente -->
    <div v-if="showQosModal" class="modal-backdrop">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Configurar QoS</h3>
          <button @click="showQosModal = false" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveQosConfig">
            <div class="form-group">
              <label>Cliente MAC:</label>
              <input type="text" v-model="qosConfig.macAddress" class="form-control" readonly>
            </div>
            
            <div class="form-group">
              <label>Velocidad de Descarga (Kbps):</label>
              <input type="number" v-model="qosConfig.downloadSpeed" class="form-control" required min="1">
            </div>
            
            <div class="form-group">
              <label>Velocidad de Subida (Kbps):</label>
              <input type="number" v-model="qosConfig.uploadSpeed" class="form-control" required min="1">
            </div>
            
            <div class="modal-footer">
              <button type="button" @click="showQosModal = false" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TpLinkService from '@/services/tplink.service';
import NodeService from '@/services/node.service';
import SectorService from '@/services/sector.service';
import { debounce } from 'lodash';

export default {
  name: 'TpLinkPharosList',
  data() {
    return {
      devices: [],
      nodes: [],
      sectors: [],
      loading: false,
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
      pageSize: 10,
      filters: {
        name: '',
        nodeId: '',
        sectorId: '',
        status: ''
      },
      showAddModal: false,
      showEditModal: false,
      showDeleteModal: false,
      showViewModal: false,
      showQosModal: false,
      currentDevice: {},
      deviceToDelete: null,
      loadingDetails: false,
      loadingClients: false,
      loadingStats: false,
      connectedClients: [],
      trafficStats: {},
      showClientsTab: false,
      showStatsTab: false,
      qosConfig: {
        macAddress: '',
        downloadSpeed: 1024,
        uploadSpeed: 1024
      },
      debouncedSearch: null
    };
  },
  computed: {
    deviceIsOnline() {
      return this.currentDevice.connectionStatus === 'online';
    }
  },
  created() {
    this.debouncedSearch = debounce(this.loadDevices, 500);
    this.loadDevices();
    this.loadNodes();
    this.loadSectors();
  },
  methods: {
    async loadDevices() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          ...this.filters
        };
        
        const response = await TpLinkService.getAllPharosDevices(params);
        this.devices = response.data.devices;
        this.totalItems = response.data.totalItems;
        this.totalPages = response.data.totalPages;
      } catch (error) {
        console.error('Error al cargar dispositivos:', error);
        alert('Error: Ocurrió un error al cargar los dispositivos');
      } finally {
        this.loading = false;
      }
    },
    
    async loadNodes() {
      try {
        const response = await NodeService.getAllNodes();
        this.nodes = response.data;
      } catch (error) {
        console.error('Error al cargar nodos:', error);
      }
    },
    
    async loadSectors() {
      try {
        const response = await SectorService.getAllSectors();
        this.sectors = response.data;
      } catch (error) {
        console.error('Error al cargar sectores:', error);
      }
    },
    
    changePage(page) {
      this.currentPage = page;
      this.loadDevices();
    },
    
    refreshData() {
      this.loadDevices();
    },
    
    getStatusLabel(status) {
      const statusMap = {
        'online': 'En línea',
        'offline': 'Fuera de línea',
        'warning': 'Alerta',
        'unknown': 'Desconocido'
      };
      
      return statusMap[status] || 'Desconocido';
    },
    
    formatBytes(bytes, decimals = 2) {
      if (!bytes) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },
    
    formatUptime(seconds) {
      if (!seconds) return 'N/A';
      
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0) result += `${hours}h `;
      if (minutes > 0) result += `${minutes}m`;
      
      return result.trim() || '< 1m';
    },
    
    resetDevice() {
      this.currentDevice = {
        name: '',
        ipAddress: '',
        macAddress: '',
        model: '',
        apiPort: 443,
        nodeId: '',
        sectorId: '',
        username: '',
        password: '',
        deviceType: 'pharos',
        active: true
      };
    },
    
    editDevice(device) {
      this.currentDevice = { ...device };
      this.currentDevice.password = ''; // No mostrar contraseña
      this.showEditModal = true;
    },
    
    viewDevice(device) {
      this.currentDevice = { ...device };
      this.showViewModal = true;
      this.showClientsTab = false;
      this.showStatsTab = false;
      this.refreshDeviceInfo();
    },
    
    async refreshDeviceInfo() {
      this.loadingDetails = true;
      try {
        const response = await TpLinkService.getPharosDeviceInfo(this.currentDevice.id);
        this.currentDevice = {
          ...this.currentDevice,
          ...response.data
        };
      } catch (error) {
        console.error('Error al cargar detalles del dispositivo:', error);
        alert('Error al obtener información del dispositivo');
      } finally {
        this.loadingDetails = false;
      }
    },
    
    async getConnectedClients() {
      this.loadingClients = true;
      this.showClientsTab = true;
      this.showStatsTab = false;
      try {
        const response = await TpLinkService.getPharosConnectedClients(this.currentDevice.id);
        this.connectedClients = response.data;
      } catch (error) {
        console.error('Error al cargar clientes conectados:', error);
        alert('Error al obtener clientes conectados');
      } finally {
        this.loadingClients = false;
      }
    },
    
    async getTrafficStats() {
      this.loadingStats = true;
      this.showStatsTab = true;
      this.showClientsTab = false;
      try {
        const response = await TpLinkService.getPharosTrafficStats(this.currentDevice.id);
        this.trafficStats = response.data;
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        alert('Error al obtener estadísticas de tráfico');
      } finally {
        this.loadingStats = false;
      }
    },
    
    async rebootDevice() {
      if (!confirm('¿Está seguro que desea reiniciar el dispositivo?')) return;
      
      try {
        await TpLinkService.rebootPharosDevice(this.currentDevice.id);
        alert('Reinicio iniciado correctamente');
      } catch (error) {
        console.error('Error al reiniciar dispositivo:', error);
        alert('Error al reiniciar el dispositivo');
      }
    },
    
    configureClientQoS(client) {
      this.qosConfig = {
        macAddress: client.macAddress,
        downloadSpeed: 1024,
        uploadSpeed: 1024
      };
      this.showQosModal = true;
    },
    
    async saveQosConfig() {
      try {
        await TpLinkService.configurePharosClientQoS(
          this.currentDevice.id, 
          this.qosConfig.macAddress, 
          this.qosConfig.downloadSpeed, 
          this.qosConfig.uploadSpeed
        );
        
        this.showQosModal = false;
        alert('Configuración QoS aplicada correctamente');
      } catch (error) {
        console.error('Error al configurar QoS:', error);
        alert('Error al configurar QoS del cliente');
      }
    },
    
    confirmDelete(device) {
      this.deviceToDelete = device;
      this.showDeleteModal = true;
    },
    
    async toggleDeviceStatus(device) {
      try {
        await TpLinkService.changePharosDeviceStatus(device.id, !device.active);
        alert(`Dispositivo ${device.active ? 'desactivado' : 'activado'} correctamente`);
        this.loadDevices();
      } catch (error) {
        console.error('Error al cambiar estado:', error);
        alert('Error al cambiar el estado del dispositivo');
      }
    },
    
    async deleteDevice() {
      try {
        await TpLinkService.deletePharosDevice(this.deviceToDelete.id);
        this.showDeleteModal = false;
        alert('Éxito: Dispositivo eliminado correctamente');
        this.loadDevices();
      } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        alert('Error al eliminar el dispositivo');
      }
    },
    
    async saveDevice() {
      try {
        if (this.showEditModal) {
          await TpLinkService.updatePharosDevice(this.currentDevice.id, this.currentDevice);
          alert('Éxito: Dispositivo actualizado correctamente');
        } else {
          await TpLinkService.createPharosDevice(this.currentDevice);
          alert('Éxito: Dispositivo creado correctamente');
        }
        
        this.closeModals();
        this.loadDevices();
      } catch (error) {
        console.error('Error al guardar dispositivo:', error);
        alert('Error: Error al guardar el dispositivo');
      }
    },
    
    closeModals() {
      this.showAddModal = false;
      this.showEditModal = false;
      this.resetDevice();
    }
  }
};
</script>

<style scoped>
.pharos-list {
  padding: 20px;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.filters-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.devices-table-container {
  overflow-x: auto;
}

.devices-table th,
.devices-table td {
  vertical-align: middle;
}

.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.status-badge.online {
  background-color: #28a745;
  color: white;
}

.status-badge.offline {
  background-color: #dc3545;
  color: white;
}

.status-badge.warning {
  background-color: #ffc107;
  color: black;
}

.status-badge.unknown {
  background-color: #6c757d;
  color: white;
}

.actions {
  display: flex;
  gap: 5px;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  margin-top: 20px;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 5px;
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.modal-sm {
  width: 400px;
}

.modal-content.modal-lg {
  width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #ddd;
}

.modal-body {
  padding: 15px;
}

.modal-footer {
  padding: 15px;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.device-details h4 {
  margin-top: 20px;
  margin-bottom: 10px;
}

.stats-container {
  margin-top: 15px;
}
</style>							