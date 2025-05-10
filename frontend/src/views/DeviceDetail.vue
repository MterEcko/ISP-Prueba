<template>
  <div class="device-detail">
    <h1 class="page-title">Detalle de Dispositivo</h1>
    
    <div v-if="loading" class="loading-spinner">
      Cargando información del dispositivo...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="device-content">
      <div class="card mb-4">
        <div class="device-header d-flex justify-between">
          <div>
            <h2>{{ device.name }}</h2>
            <div class="device-meta">
              <span class="status" :class="getStatusClass(device.status)">
                {{ getStatusText(device.status) }}
              </span>
              <span v-if="device.lastSeen" class="last-seen">
                Última vez visto: {{ formatDate(device.lastSeen) }}
              </span>
            </div>
          </div>
          
          <div class="device-actions">
            <button class="btn mr-2" @click="goBack">Volver</button>
            <button class="btn btn-primary mr-2" @click="editDevice">Editar</button>
            <button 
              class="btn btn-outline-success mr-2" 
              @click="checkStatus"
              :disabled="checkingStatus"
            >
              {{ checkingStatus ? 'Verificando...' : 'Verificar Estado' }}
            </button>
            <button class="btn btn-outline-danger" @click="showRebootModal = true">
              Reiniciar
            </button>
          </div>
        </div>
        
        <div class="device-info-grid mt-4">
          <div class="device-info-item">
            <div class="info-label">Tipo</div>
            <div class="info-value">{{ getTypeText(device.type) }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Marca</div>
            <div class="info-value">{{ getBrandText(device.brand) }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Modelo</div>
            <div class="info-value">{{ device.model || 'No especificado' }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Dirección IP</div>
            <div class="info-value">
              <a v-if="device.ipAddress" :href="`http://${device.ipAddress}`" target="_blank">
                {{ device.ipAddress }}
              </a>
              <span v-else>No especificada</span>
            </div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Dirección MAC</div>
            <div class="info-value">{{ device.macAddress || 'No especificada' }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Ubicación</div>
            <div class="info-value">{{ device.location || 'No especificada' }}</div>
          </div>
        </div>
        
        <div class="device-info-grid mt-4">
          <div class="device-info-item">
            <div class="info-label">Nodo</div>
            <div class="info-value">
              <router-link
                v-if="device.Node"
                :to="`/nodes/${device.Node.id}`"
              >
                {{ device.Node.name }}
              </router-link>
              <span v-else>No asignado</span>
            </div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Sector</div>
            <div class="info-value">
              <router-link
                v-if="device.Sector"
                :to="`/sectors/${device.Sector.id}`"
              >
                {{ device.Sector.name }}
              </router-link>
              <span v-else>No asignado</span>
            </div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Cliente</div>
            <div class="info-value">
              <router-link
                v-if="device.Client"
                :to="`/clients/${device.Client.id}`"
              >
                {{ device.Client.firstName }} {{ device.Client.lastName }}
              </router-link>
              <span v-else>No asignado</span>
            </div>
          </div>
        </div>
        
        <div v-if="device.notes" class="device-notes mt-4">
          <h3>Notas</h3>
          <div class="notes-content">
            {{ device.notes }}
          </div>
        </div>
      </div>
      
      <div class="card mb-4">
        <h3>Información del Dispositivo</h3>
        
        <div v-if="deviceInfo" class="device-info-grid">
          <div class="device-info-item">
            <div class="info-label">Nombre</div>
            <div class="info-value">{{ deviceInfo.name }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Modelo</div>
            <div class="info-value">{{ deviceInfo.model }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Versión</div>
            <div class="info-value">{{ deviceInfo.version }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Uptime</div>
            <div class="info-value">{{ deviceInfo.uptime }}</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">CPU</div>
            <div class="info-value">{{ deviceInfo.cpuLoad }}%</div>
          </div>
          
          <div class="device-info-item">
            <div class="info-label">Memoria</div>
            <div class="info-value">{{ deviceInfo.memoryUsage }}%</div>
          </div>
          
          <div v-if="isMikrotik()" class="device-info-item">
            <div class="info-label">Interfaces</div>
            <div class="info-value">{{ deviceInfo.interfaces }}</div>
          </div>
          
          <div v-if="isMikrotik()" class="device-info-item">
            <div class="info-label">Clientes Conectados</div>
            <div class="info-value">{{ deviceInfo.clients }}</div>
          </div>
          
          <div v-if="isUbiquiti()" class="device-info-item">
            <div class="info-label">Señal</div>
            <div class="info-value">{{ deviceInfo.signal }} dBm</div>
          </div>
          
          <div v-if="isUbiquiti()" class="device-info-item">
            <div class="info-label">Ruido</div>
            <div class="info-value">{{ deviceInfo.noiseFloor }} dBm</div>
          </div>
          
          <div v-if="isUbiquiti()" class="device-info-item">
            <div class="info-label">Frecuencia</div>
            <div class="info-value">{{ deviceInfo.frequency }}</div>
          </div>
          
          <div v-if="isUbiquiti()" class="device-info-item">
            <div class="info-label">Canal</div>
            <div class="info-value">{{ deviceInfo.channel }}</div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>No hay información disponible del dispositivo.</p>
          <button 
            class="btn" 
            @click="checkStatus" 
            :disabled="checkingStatus"
          >
            {{ checkingStatus ? 'Verificando...' : 'Obtener Información' }}
          </button>
        </div>
      </div>
      
      <div class="card mb-4">
        <div class="d-flex justify-between align-center mb-3">
          <h3>Métricas</h3>
          
          <div class="metrics-period">
            <select v-model="metricsPeriod" @change="loadMetrics">
              <option value="1h">Última hora</option>
              <option value="6h">Últimas 6 horas</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </div>
        </div>
        
        <div v-if="loadingMetrics" class="loading-spinner">
          Cargando métricas...
        </div>
        
        <div v-else-if="!metrics" class="empty-state">
          <p>No hay métricas disponibles para el dispositivo.</p>
          <button class="btn" @click="loadMetrics">Cargar Métricas</button>
        </div>
        
        <div v-else class="metrics-container">
          <!-- En una aplicación real, aquí usaríamos Chart.js u otra biblioteca de gráficos -->
          <div class="metrics-item">
            <h4>Uso de CPU</h4>
            <div class="chart-placeholder">
              (Gráfico de CPU)
              <div class="chart-value">
                {{ metrics.cpu[metrics.cpu.length - 1].value }}%
              </div>
            </div>
          </div>
          
          <div class="metrics-item">
            <h4>Uso de Memoria</h4>
            <div class="chart-placeholder">
              (Gráfico de Memoria)
              <div class="chart-value">
                {{ metrics.memory[metrics.memory.length - 1].value }}%
              </div>
            </div>
          </div>
          
          <div class="metrics-item">
            <h4>Tráfico de Red</h4>
            <div class="chart-placeholder">
              (Gráfico de Tráfico)
              <div class="chart-value">
                ↓ {{ formatBytes(metrics.traffic[metrics.traffic.length - 1].rx) }}/s
                <br>
                ↑ {{ formatBytes(metrics.traffic[metrics.traffic.length - 1].tx) }}/s
              </div>
            </div>
          </div>
          
          <div v-if="isUbiquiti() && metrics.signal" class="metrics-item">
            <h4>Intensidad de Señal</h4>
            <div class="chart-placeholder">
              (Gráfico de Señal)
              <div class="chart-value">
                {{ metrics.signal[metrics.signal.length - 1].value }} dBm
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card mb-4">
        <h3>Acciones del Dispositivo</h3>
        
        <div class="device-actions-grid">
          <button class="action-button reboot" @click="showRebootModal = true">
            <span class="action-icon">🔄</span>
            <span class="action-name">Reiniciar</span>
          </button>
          
          <button class="action-button backup" @click="backupDevice">
            <span class="action-icon">💾</span>
            <span class="action-name">Backup</span>
          </button>
          
          <button 
            v-if="isMikrotik()" 
            class="action-button update" 
            @click="checkUpdate"
          >
            <span class="action-icon">⬆️</span>
            <span class="action-name">Verificar Actualización</span>
          </button>
          
          <button 
            v-if="isUbiquiti()" 
            class="action-button scan" 
            @click="spectrumScan"
          >
            <span class="action-icon">📊</span>
            <span class="action-name">Escaneo de Espectro</span>
          </button>
          
          <button class="action-button reset" @click="showResetModal = true">
            <span class="action-icon">⚠️</span>
            <span class="action-name">Reset de Fábrica</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para reinicio -->
    <div v-if="showRebootModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Reinicio</h3>
        <p>¿Está seguro que desea reiniciar el dispositivo <strong>{{ device.name }}</strong>?</p>
        <p class="warning">Esta acción puede causar una interrupción en el servicio.</p>
        <div class="modal-actions">
          <button class="btn" @click="showRebootModal = false">Cancelar</button>
          <button 
            class="btn btn-danger" 
            @click="confirmReboot" 
            :disabled="actionLoading"
          >
            {{ actionLoading ? 'Reiniciando...' : 'Reiniciar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación para reset de fábrica -->
    <div v-if="showResetModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Reset de Fábrica</h3>
        <p>¿Está seguro que desea resetear a configuración de fábrica el dispositivo <strong>{{ device.name }}</strong>?</p>
        <p class="warning">¡ADVERTENCIA! Esta acción eliminará toda la configuración del dispositivo y lo restaurará a sus valores predeterminados.</p>
        <div class="modal-actions">
          <button class="btn" @click="showResetModal = false">Cancelar</button>
          <button 
            class="btn btn-danger" 
            @click="confirmReset" 
            :disabled="actionLoading"
          >
            {{ actionLoading ? 'Reseteando...' : 'Reset de Fábrica' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';

export default {
  name: 'DeviceDetail',
  data() {
    return {
      device: {},
      deviceInfo: null,
      metrics: null,
      loading: true,
      checkingStatus: false,
      loadingMetrics: false,
      error: null,
      metricsPeriod: '1h',
      showRebootModal: false,
      showResetModal: false,
      actionLoading: false
    };
  },
  created() {
    this.loadDevice();
  },
  methods: {
    async loadDevice() {
      this.loading = true;
      this.error = null;
      
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
        
        // Si el dispositivo está online, cargar información y métricas
        if (this.device.status === 'online') {
          this.checkStatus();
          this.loadMetrics();
        }
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error = 'Error al cargar la información del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async checkStatus() {
      this.checkingStatus = true;
      
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.checkDeviceStatus(deviceId);
        
        // Actualizar estado e información del dispositivo
        this.device.status = response.data.status;
        this.device.lastSeen = response.data.lastSeen;
        this.deviceInfo = response.data.deviceInfo;
        
        // Si está online, cargar métricas
        if (this.device.status === 'online' && !this.metrics) {
          this.loadMetrics();
        }
      } catch (error) {
        console.error('Error verificando estado:', error);
      } finally {
        this.checkingStatus = false;
      }
    },
    
    async loadMetrics() {
      this.loadingMetrics = true;
      
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.getDeviceMetrics(deviceId, this.metricsPeriod);
        this.metrics = response.data.metrics;
      } catch (error) {
        console.error('Error cargando métricas:', error);
      } finally {
        this.loadingMetrics = false;
      }
    },
    
    async confirmReboot() {
      this.actionLoading = true;
      
      try {
        const deviceId = this.$route.params.id;
        await DeviceService.executeDeviceAction(deviceId, 'reboot');
        this.showRebootModal = false;
        
        // Actualizar estado del dispositivo
        this.device.status = 'unknown';
        
        // Mostrar mensaje
        alert(`Se ha enviado la orden de reinicio al dispositivo ${this.device.name}`);
        
        // Recargar información después de un tiempo prudencial
        setTimeout(() => {
          this.checkStatus();
        }, 30000); // 30 segundos
      } catch (error) {
        console.error('Error al reiniciar dispositivo:', error);
        alert(`Error al reiniciar el dispositivo: ${error.message}`);
      } finally {
        this.actionLoading = false;
      }
    },
    
    async confirmReset() {
      this.actionLoading = true;
      
      try {
        const deviceId = this.$route.params.id;
        const action = this.isMikrotik() ? 'reset-configuration' : 'factory-reset';
        
        await DeviceService.executeDeviceAction(deviceId, action);
        this.showResetModal = false;
        
        // Actualizar estado del dispositivo
        this.device.status = 'unknown';
        
        // Mostrar mensaje
        alert(`Se ha enviado la orden de reset de fábrica al dispositivo ${this.device.name}`);
      } catch (error) {
        console.error('Error al resetear dispositivo:', error);
        alert(`Error al resetear el dispositivo: ${error.message}`);
      } finally {
        this.actionLoading = false;
      }
    },
    
    async backupDevice() {
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.executeDeviceAction(deviceId, 'backup');
        
        // En una aplicación real, aquí manejaríamos la descarga del archivo de backup
        alert(`Backup realizado exitosamente: ${response.data.result.details.fileName}`);
      } catch (error) {
        console.error('Error al hacer backup:', error);
        alert(`Error al realizar el backup: ${error.message}`);
      }
    },
    
    async checkUpdate() {
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.executeDeviceAction(deviceId, 'check-update');
        
        // Mostrar resultado
        alert(`Verificación de actualización: ${response.data.result.message}`);
      } catch (error) {
        console.error('Error al verificar actualización:', error);
        alert(`Error al verificar actualización: ${error.message}`);
      }
    },
    
    async spectrumScan() {
      try {
        const deviceId = this.$route.params.id;
        const response = await DeviceService.executeDeviceAction(deviceId, 'spectrum-scan');
        
        // En una aplicación real, aquí mostraríamos los resultados en un gráfico
        alert(`Escaneo de espectro completado. Se encontraron ${response.data.result.details.frequencies.length} frecuencias.`);
      } catch (error) {
        console.error('Error al realizar escaneo de espectro:', error);
        alert(`Error al realizar escaneo de espectro: ${error.message}`);
      }
    },
    
    isMikrotik() {
      return this.device.brand === 'mikrotik';
    },
    
    isUbiquiti() {
      return this.device.brand === 'ubiquiti';
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
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    goBack() {
      this.$router.push('/devices');
    },
    
    editDevice() {
      this.$router.push(`/devices/${this.device.id}/edit`);
    }
  }
};
</script>

<style scoped>
.device-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-spinner, .error-message, .empty-state {
  padding: 30px;
  text-align: center;
}

.error-message {
  color: var(--danger);
}

.device-header {
  margin-bottom: 20px;
}

.device-meta {
  margin-top: 10px;
}

.last-seen {
  margin-left: 10px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.device-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.device-info-item {
  margin-bottom: 10px;
}

.info-label {
  font-weight: bold;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.device-notes {
  margin-top: 20px;
}

.notes-content {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  white-space: pre-line;
}

.metrics-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.metrics-item {
  margin-bottom: 20px;
}

.metrics-item h4 {
  margin-bottom: 10px;
}

.chart-placeholder {
  height: 150px;
  background-color: #f9f9f9;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
}

.chart-value {
  font-size: 1.2rem;
  font-weight: bold;
  margin-left: 20px;
}

.device-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.action-button {
  padding: 15px;
  border: none;
  border-radius: 8px;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #e0e0e0;
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.action-name {
  font-weight: bold;
}

.action-button.reboot {
  background-color: #e3f2fd;
}

.action-button.backup {
  background-color: #e8f5e9;
}

.action-button.update {
  background-color: #fff3e0;
}

.action-button.scan {
  background-color: #f3e5f5;
}

.action-button.reset {
  background-color: #ffebee;
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

@media (max-width: 768px) {
  .device-header {
    flex-direction: column;
  }
  
  .device-actions {
    margin-top: 15px;
  }
  
  .device-info-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-container {
    grid-template-columns: 1fr;
  }
}
</style>