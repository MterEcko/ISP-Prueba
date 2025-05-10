<template>
  <div class="device-list">
    <h1 class="page-title">Dispositivos de Red</h1>
    
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h2>Equipos de Red</h2>
        <button class="btn btn-primary" @click="openNewDeviceForm">
          Nuevo Dispositivo
        </button>
      </div>
      
      <div class="filters mb-4">
        <div class="d-flex align-center flex-wrap">
          <div class="search-box mr-3 mb-2">
            <input 
              type="text" 
              v-model="filters.search" 
              placeholder="Buscar dispositivo..." 
              @keyup.enter="loadDevices"
            />
          </div>
          
          <div class="filter-select mr-3 mb-2">
            <select v-model="filters.type" @change="loadDevices">
              <option value="">Todos los tipos</option>
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="antenna">Antena</option>
              <option value="cpe">CPE</option>
              <option value="other">Otro</option>
            </select>
          </div>
          
          <div class="filter-select mr-3 mb-2">
            <select v-model="filters.brand" @change="loadDevices">
              <option value="">Todas las marcas</option>
              <option value="mikrotik">Mikrotik</option>
              <option value="ubiquiti">Ubiquiti</option>
              <option value="cambium">Cambium</option>
              <option value="tplink">TP-Link</option>
              <option value="other">Otra</option>
            </select>
          </div>
          
          <div class="filter-select mr-3 mb-2">
            <select v-model="filters.status" @change="loadDevices">
              <option value="">Todos los estados</option>
              <option value="online">En línea</option>
              <option value="offline">Fuera de línea</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="unknown">Desconocido</option>
            </select>
          </div>
          
          <button class="btn mb-2" @click="resetFilters">
            Limpiar Filtros
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading-spinner">
        Cargando dispositivos...
      </div>
      
      <div v-else-if="devices.length === 0" class="empty-state">
        <p>No se encontraron dispositivos con los filtros seleccionados.</p>
        <button class="btn" @click="resetFilters">Limpiar Filtros</button>
      </div>
      
      <table v-else class="device-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Marca/Modelo</th>
            <th>IP</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.id">
            <td>{{ device.name }}</td>
            <td>{{ getTypeText(device.type) }}</td>
            <td>{{ getBrandText(device.brand) }} {{ device.model }}</td>
            <td>{{ device.ipAddress || '-' }}</td>
            <td>
              <span v-if="device.location">{{ device.location }}</span>
              <span v-else-if="device.Client">Cliente: {{ device.Client.firstName }} {{ device.Client.lastName }}</span>
              <span v-else-if="device.Node">Nodo: {{ device.Node.name }}</span>
              <span v-else-if="device.Sector">Sector: {{ device.Sector.name }}</span>
              <span v-else>-</span>
            </td>
            <td>
              <span class="status" :class="getStatusClass(device.status)">
                {{ getStatusText(device.status) }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-icon" @click="viewDevice(device.id)" title="Ver detalles">
                👁️
              </button>
              <button class="btn-icon" @click="editDevice(device.id)" title="Editar">
                ✏️
              </button>
              <button class="btn-icon" @click="checkStatus(device.id)" title="Verificar estado">
                🔄
              </button>
              <button class="btn-icon" @click="rebootDevice(device.id)" title="Reiniciar">
                🔌
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="devices.length > 0" class="pagination mt-3">
        <button 
          class="btn" 
          @click="prevPage" 
          :disabled="pagination.currentPage === 1"
        >
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ pagination.currentPage }} de {{ pagination.totalPages }}
        </span>
        
        <button 
          class="btn" 
          @click="nextPage" 
          :disabled="pagination.currentPage === pagination.totalPages"
        >
          Siguiente
        </button>
      </div>
    </div>
    
    <!-- Modal de confirmación para reinicio -->
    <div v-if="showRebootModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Reinicio</h3>
        <p>¿Está seguro que desea reiniciar el dispositivo <strong>{{ selectedDevice.name }}</strong>?</p>
        <p class="warning">Esta acción puede causar una interrupción en el servicio.</p>
        <div class="modal-actions">
          <button class="btn" @click="showRebootModal = false">Cancelar</button>
          <button class="btn btn-danger" @click="confirmReboot" :disabled="rebootLoading">
            {{ rebootLoading ? 'Reiniciando...' : 'Reiniciar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';

export default {
  name: 'DeviceList',
  data() {
    return {
      devices: [],
      loading: false,
      filters: {
        search: '',
        type: '',
        brand: '',
        status: '',
        nodeId: '',
        sectorId: '',
        clientId: ''
      },
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        pageSize: 10
      },
      showRebootModal: false,
      selectedDevice: {},
      rebootLoading: false
    };
  },
  created() {
    this.loadDevices();
  },
  methods: {
    async loadDevices() {
      this.loading = true;
      
      try {
        const params = {
          page: this.pagination.currentPage,
          size: this.pagination.pageSize,
          ...this.filters
        };
        
        const response = await DeviceService.getDevices(params);
        
        this.devices = response.data.devices;
        this.pagination.totalItems = response.data.totalItems;
        this.pagination.totalPages = response.data.totalPages;
        
      } catch (error) {
        console.error('Error cargando dispositivos:', error);
      } finally {
        this.loading = false;
      }
    },
    
    resetFilters() {
      this.filters = {
        search: '',
        type: '',
        brand: '',
        status: '',
        nodeId: '',
        sectorId: '',
        clientId: ''
      };
      this.pagination.currentPage = 1;
      this.loadDevices();
    },
    
    prevPage() {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--;
        this.loadDevices();
      }
    },
    
    nextPage() {
      if (this.pagination.currentPage < this.pagination.totalPages) {
        this.pagination.currentPage++;
        this.loadDevices();
      }
    },
    
    openNewDeviceForm() {
      this.$router.push('/devices/new');
    },
    
    viewDevice(id) {
      this.$router.push(`/devices/${id}`);
    },
    
    editDevice(id) {
      this.$router.push(`/devices/${id}/edit`);
    },
    
    async checkStatus(id) {
      try {
        // Implementación simplificada - en una aplicación real, mostraría el resultado en un modal
        const response = await DeviceService.checkDeviceStatus(id);
        alert(`Estado del dispositivo: ${response.data.status}\nÚltima vez visto: ${response.data.lastSeen ? new Date(response.data.lastSeen).toLocaleString() : 'Nunca'}`);
        
        // Recargar la lista para mostrar el estado actualizado
        this.loadDevices();
      } catch (error) {
        console.error('Error verificando estado:', error);
        alert('Error al verificar el estado del dispositivo');
      }
    },
    
    rebootDevice(id) {
      // Buscar el dispositivo seleccionado
      const device = this.devices.find(d => d.id === id);
      if (device) {
        this.selectedDevice = device;
        this.showRebootModal = true;
      }
    },
    
    async confirmReboot() {
      this.rebootLoading = true;
      
      try {
        await DeviceService.executeDeviceAction(this.selectedDevice.id, 'reboot');
        this.showRebootModal = false;
        alert(`Se ha enviado la orden de reinicio al dispositivo ${this.selectedDevice.name}`);
        
        // Recargar la lista después de un breve tiempo
        setTimeout(() => {
          this.loadDevices();
        }, 3000);
      } catch (error) {
        console.error('Error al reiniciar dispositivo:', error);
        alert(`Error al reiniciar el dispositivo: ${error.message}`);
      } finally {
        this.rebootLoading = false;
      }
    },
    
    getTypeText(type) {
      switch (type) {
        case 'router': return 'Router';
        case 'switch': return 'Switch';
        case 'antenna': return 'Antena';
        case 'cpe': return 'CPE';
        case 'other': return 'Otro';
        default: return type;
      }
    },
    
    getBrandText(brand) {
      switch (brand) {
        case 'mikrotik': return 'Mikrotik';
        case 'ubiquiti': return 'Ubiquiti';
        case 'cambium': return 'Cambium';
        case 'tplink': return 'TP-Link';
        case 'other': return 'Otra';
        default: return brand;
      }
    },
    
    getStatusClass(status) {
      switch (status) {
        case 'online': return 'status-success';
        case 'offline': return 'status-danger';
        case 'maintenance': return 'status-warning';
        case 'unknown': return 'status-inactive';
        default: return '';
      }
    },
    
    getStatusText(status) {
      switch (status) {
        case 'online': return 'En línea';
        case 'offline': return 'Fuera de línea';
        case 'maintenance': return 'Mantenimiento';
        case 'unknown': return 'Desconocido';
        default: return status;
      }
    }
  }
};
</script>

<style scoped>
.device-list {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
}

.search-box input {
  width: 300px;
}

.filter-select select {
  min-width: 150px;
}

.loading-spinner, .empty-state {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
}

.device-table {
  width: 100%;
}

.status {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background-color: #f5f5f5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.page-info {
  color: var(--text-secondary);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  width: 400px;
  max-width: 90%;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content .warning {
  color: var(--danger);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>