<template>
  <div class="device-list">
    <h2>Gestión de Dispositivos de Red</h2>
    
    <div class="filters">
      <div class="search-filters">
        <div class="filter-row">
          <select v-model="selectedBrand" @change="loadDevices">
            <option value="">Todas las marcas</option>
            <option value="mikrotik">Mikrotik</option>
            <option value="ubiquiti">Ubiquiti</option>
            <option value="tplink">TP-Link</option>
            <option value="cambium">Cambium</option>
            <option value="mimosa">Mimosa</option>
          </select>
          
          <select v-model="selectedType" @change="loadDevices">
            <option value="">Todos los tipos</option>
            <option value="router">Router</option>
            <option value="switch">Switch</option>
            <option value="antenna">Antena</option>
            <option value="cpe">CPE</option>
            <option value="ont">ONT</option>
            <option value="olt">OLT</option>
          </select>
          
          <select v-model="selectedStatus" @change="loadDevices">
            <option value="">Todos los estados</option>
            <option value="online">En línea</option>
            <option value="offline">Fuera de línea</option>
            <option value="warning">Con alertas</option>
            <option value="maintenance">En mantenimiento</option>
          </select>
          
          <select v-model="selectedNode" @change="loadDevices">
            <option value="">Todos los nodos</option>
            <option v-for="node in nodes" :key="node.id" :value="node.id">
              {{ node.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="action-buttons">
        <button @click="refreshDevices" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="openNewDeviceForm" class="add-button">
          + Nuevo Dispositivo
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando dispositivos...
    </div>
    
    <div v-else-if="devices.length === 0" class="no-data">
      No se encontraron dispositivos.
    </div>
    
    <div v-else class="devices-grid">
      <div class="device-card" 
           v-for="device in devices" 
           :key="device.id"
           @click="viewDeviceDetail(device.id)">
        
        <!-- Header de la tarjeta -->
        <div class="device-header">
          <div class="device-info">
            <h3>{{ device.name }}</h3>
            <div class="device-meta">
              <span class="brand">{{ getBrandIcon(device.brand) }} {{ device.brand?.toUpperCase() }}</span>
              <span class="type">{{ device.type?.toUpperCase() }}</span>
            </div>
          </div>
          
          <div class="device-status">
            <span :class="['status-indicator', device.status]">
              {{ getStatusIcon(device.status) }}
            </span>
            <span class="status-text">{{ getStatusText(device.status) }}</span>
          </div>
        </div>
        
        <!-- Información técnica -->
        <div class="device-details">
          <div class="detail-item">
            <span class="label">IP:</span>
            <span class="value">{{ device.ipAddress || 'No asignada' }}</span>
          </div>
          
          <div class="detail-item">
            <span class="label">Modelo:</span>
            <span class="value">{{ device.model || 'No especificado' }}</span>
          </div>
          
          <div class="detail-item">
            <span class="label">Nodo:</span>
            <span class="value">{{ device.Node?.name || 'Sin nodo' }}</span>
          </div>
          
          <div class="detail-item">
            <span class="label">Sector:</span>
            <span class="value">{{ device.Sector?.name || 'Sin sector' }}</span>
          </div>
          
          <div class="detail-item" v-if="device.Client">
            <span class="label">Cliente:</span>
            <span class="value">{{ device.Client.firstName }} {{ device.Client.lastName }}</span>
          </div>
        </div>
        
        <!-- Métricas rápidas -->
        <div class="device-metrics" v-if="device.lastMetrics">
          <div class="metric">
            <span class="metric-label">CPU</span>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: device.lastMetrics.cpuUsage + '%' }"></div>
            </div>
            <span class="metric-value">{{ device.lastMetrics.cpuUsage }}%</span>
          </div>
          
          <div class="metric">
            <span class="metric-label">RAM</span>
            <div class="metric-bar">
              <div class="metric-fill" :style="{ width: device.lastMetrics.memoryUsage + '%' }"></div>
            </div>
            <span class="metric-value">{{ device.lastMetrics.memoryUsage }}%</span>
          </div>
        </div>
        
        <!-- Acciones rápidas -->
        <div class="device-actions">
          <button @click.stop="checkDeviceStatus(device)" 
                  class="action-btn status-btn"
                  :disabled="device.checkingStatus">
            {{ device.checkingStatus ? '⏳' : '📡' }} Estado
          </button>
          
          <button @click.stop="showQuickActions(device)" 
                  class="action-btn actions-btn">
            ⚡ Acciones
          </button>
          
          <button @click.stop="viewDeviceDetail(device.id)" 
                  class="action-btn detail-btn">
            👁️ Detalles
          </button>
        </div>
        
        <!-- Última actualización -->
        <div class="last-update">
          <small>Última actualización: {{ formatDate(device.updatedAt) }}</small>
        </div>
      </div>
    </div>
    
    <!-- Paginación -->
    <div class="pagination" v-if="totalPages > 1">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
      >
        Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
      >
        Siguiente
      </button>
    </div>
    
    <!-- Modal de acciones rápidas -->
    <div v-if="showActionsModal" class="modal" @click="closeActionsModal">
      <div class="modal-content" @click.stop>
        <h3>Acciones Rápidas - {{ selectedDevice?.name }}</h3>
        
        <div class="quick-actions">
          <button @click="executeAction('restart')" class="action-button restart">
            🔄 Reiniciar Dispositivo
          </button>
          
          <button @click="executeAction('get_device_info')" class="action-button info">
            ℹ️ Información del Sistema
          </button>
          
          <button @click="executeAction('backup_config')" class="action-button backup">
            💾 Backup de Configuración
          </button>
          
          <button @click="executeAction('get_interfaces')" class="action-button interfaces">
            🔌 Estado de Interfaces
          </button>
          
          <button v-if="selectedDevice?.type === 'cpe'" 
                  @click="executeAction('get_metric_signal_strength')" 
                  class="action-button signal">
            📶 Nivel de Señal
          </button>
        </div>
        
        <div class="modal-actions">
          <button @click="closeActionsModal">Cerrar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de resultado de acción -->
    <div v-if="showResultModal" class="modal" @click="closeResultModal">
      <div class="modal-content result-modal" @click.stop>
        <h3>Resultado de {{ lastExecutedAction }}</h3>
        
        <div class="result-content">
          <div v-if="actionResult.success" class="success-result">
            <div class="result-header">
              ✅ Comando ejecutado exitosamente
            </div>
            <pre class="result-output">{{ actionResult.output }}</pre>
          </div>
          
          <div v-else class="error-result">
            <div class="result-header">
              ❌ Error al ejecutar comando
            </div>
            <div class="error-message">{{ actionResult.error }}</div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeResultModal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';
import NetworkService from '../services/network.service';

export default {
  name: 'DeviceList',
  data() {
    return {
      devices: [],
      nodes: [],
      loading: false,
      selectedBrand: '',
      selectedType: '',
      selectedStatus: '',
      selectedNode: '',
      currentPage: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 0,
      showActionsModal: false,
      showResultModal: false,
      selectedDevice: null,
      actionResult: null,
      lastExecutedAction: ''
    };
  },
  created() {
    this.loadNodes();
    this.loadDevices();
  },
  methods: {
    async loadNodes() {
      try {
        const response = await NetworkService.getAllNodes({ active: true });
        this.nodes = response.data;
      } catch (error) {
        console.error('Error cargando nodos:', error);
      }
    },
    
    async loadDevices() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          brand: this.selectedBrand || undefined,
          type: this.selectedType || undefined,
          status: this.selectedStatus || undefined,
          nodeId: this.selectedNode || undefined
        };
        
        const response = await DeviceService.getAllDevices(params);
        this.devices = response.data.items || response.data.devices || response.data;
        this.totalItems = response.data.totalItems || 0;
        this.totalPages = response.data.totalPages || 1;
      } catch (error) {
        console.error('Error cargando dispositivos:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async refreshDevices() {
      await this.loadDevices();
    },
    
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadDevices();
      }
    },
    
    openNewDeviceForm() {
      this.$router.push('/devices/new');
    },
    
    viewDeviceDetail(id) {
      this.$router.push(`/devices/${id}`);
    },
    
    async checkDeviceStatus(device) {
      device.checkingStatus = true;
      try {
        const response = await DeviceService.getDeviceStatus(device.id);
        device.status = response.data.status;
        device.lastSeen = response.data.lastSeen;
      } catch (error) {
        console.error('Error verificando estado:', error);
      } finally {
        device.checkingStatus = false;
      }
    },
    
    showQuickActions(device) {
      this.selectedDevice = device;
      this.showActionsModal = true;
    },
    
    closeActionsModal() {
      this.showActionsModal = false;
      this.selectedDevice = null;
    },
    
    async executeAction(action) {
      if (!this.selectedDevice) return;
      
      try {
        this.lastExecutedAction = action;
        const response = await DeviceService.executeDeviceAction(
          this.selectedDevice.id, 
          action
        );
        
        this.actionResult = {
          success: true,
          output: response.data.output || 'Comando ejecutado correctamente'
        };
      } catch (error) {
        this.actionResult = {
          success: false,
          error: error.response?.data?.message || 'Error al ejecutar el comando'
        };
      }
      
      this.closeActionsModal();
      this.showResultModal = true;
    },
    
    closeResultModal() {
      this.showResultModal = false;
      this.actionResult = null;
      this.lastExecutedAction = '';
    },
    
    getBrandIcon(brand) {
      const icons = {
        mikrotik: '🔧',
        ubiquiti: '📡',
        tplink: '🌐',
        cambium: '📶',
        mimosa: '🎯'
      };
      return icons[brand] || '🔌';
    },
    
    getStatusIcon(status) {
      const icons = {
        online: '🟢',
        offline: '🔴',
        warning: '🟡',
        maintenance: '🔧'
      };
      return icons[status] || '⚪';
    },
    
    getStatusText(status) {
      const texts = {
        online: 'En línea',
        offline: 'Fuera de línea',
        warning: 'Con alertas',
        maintenance: 'Mantenimiento'
      };
      return texts[status] || 'Desconocido';
    },
    
    formatDate(dateString) {
      if (!dateString) return 'No disponible';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.device-list {
  padding: 20px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.search-filters .filter-row {
  display: flex;
  gap: 10px;
}

.search-filters select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 150px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.refresh-button, .add-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button {
  background-color: #6c757d;
  color: white;
}

.add-button {
  background-color: #007bff;
  color: white;
}

.loading, .no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.device-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.device-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.device-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 1.2em;
}

.device-meta {
  display: flex;
  gap: 10px;
}

.brand, .type {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f8f9fa;
  color: #495057;
}

.device-status {
  text-align: right;
}

.status-indicator {
  font-size: 1.2em;
  margin-right: 5px;
}

.status-text {
  font-size: 0.9em;
  color: #666;
}

.device-details {
  margin-bottom: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
}

.device-metrics {
  margin-bottom: 15px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.metric-label {
  width: 40px;
  font-size: 0.9em;
  color: #666;
}

.metric-bar {
  flex: 1;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #28a745, #ffc107, #dc3545);
  transition: width 0.3s;
}

.metric-value {
  width: 40px;
  text-align: right;
  font-size: 0.9em;
  color: #666;
}

.device-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.action-btn {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  font-size: 0.8em;
  cursor: pointer;
  transition: background-color 0.2s;
}

.status-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.actions-btn {
  background: #fff3e0;
  color: #f57c00;
}

.detail-btn {
  background: #e8f5e8;
  color: #388e3c;
}

.action-btn:hover {
  opacity: 0.8;
}

.last-update {
  text-align: center;
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9em;
  color: #666;
}

/* Modal styles */
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
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.action-button {
  padding: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.action-button.restart {
  background: #ffebee;
  color: #c62828;
}

.action-button.info {
  background: #e3f2fd;
  color: #1976d2;
}

.action-button.backup {
  background: #e8f5e8;
  color: #388e3c;
}

.action-button.interfaces {
  background: #fff3e0;
  color: #f57c00;
}

.action-button.signal {
  background: #f3e5f5;
  color: #7b1fa2;
}

.action-button:hover {
  opacity: 0.8;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

.result-modal {
  width: 600px;
}

.result-content {
  margin-bottom: 20px;
}

.result-header {
  font-weight: bold;
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 4px;
}

.success-result .result-header {
  background: #e8f5e8;
  color: #2e7d32;
}

.error-result .result-header {
  background: #ffebee;
  color: #c62828;
}

.result-output {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.error-message {
  background: #ffebee;
  padding: 15px;
  border-radius: 4px;
  color: #c62828;
}

@media (max-width: 768px) {
  .devices-grid {
    grid-template-columns: 1fr;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .search-filters .filter-row {
    flex-wrap: wrap;
  }
  
  .search-filters select {
    min-width: auto;
    flex: 1;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
  }
}
</style>