
<template>
  <div class="device-detail">
    <div class="header">
      <h2>Detalle de Dispositivo</h2>
      <div class="actions">
        <button @click="refreshDevice" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="goToEdit" class="edit-button">
          ✏️ Editar
        </button>
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando información del dispositivo...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="device-content">
      <!-- Información Básica -->
      <div class="panel device-info">
        <h3>Información del Dispositivo</h3>
        
        <div class="device-header-info">
          <div class="device-icon">
            {{ getBrandIcon(device.brand) }}
          </div>
          <div class="device-basic">
            <h4>{{ device.name }}</h4>
            <div class="device-tags">
              <span class="tag brand">{{ device.brand?.toUpperCase() }}</span>
              <span class="tag type">{{ device.type?.toUpperCase() }}</span>
              <span :class="['tag', 'status', device.status]">
                {{ getStatusText(device.status) }}
              </span>
            </div>
          </div>
          <div class="device-status-indicator">
            <div :class="['status-circle', device.status]"></div>
            <span class="last-seen">
              Última conexión: {{ formatDate(device.lastSeen) }}
            </span>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Modelo:</span>
            <span class="value">{{ device.model || 'No especificado' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Dirección IP:</span>
            <span class="value">{{ device.ipAddress || 'No asignada' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">MAC Address:</span>
            <span class="value">{{ device.macAddress || 'No disponible' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Firmware:</span>
            <span class="value">{{ device.firmwareVersion || 'No disponible' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Nodo:</span>
            <span class="value">{{ device.Node?.name || 'Sin nodo' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">Sector:</span>
            <span class="value">{{ device.Sector?.name || 'Sin sector' }}</span>
          </div>
          
          <div class="info-item" v-if="device.Client">
            <span class="label">Cliente Asignado:</span>
            <span class="value">
              <router-link :to="`/clients/${device.Client.id}`">
                {{ device.Client.firstName }} {{ device.Client.lastName }}
              </router-link>
            </span>
          </div>
          
          <div class="info-item">
            <span class="label">Activo:</span>
            <span class="value">{{ device.active ? 'Sí' : 'No' }}</span>
          </div>
        </div>
      </div>
      
      <!-- Métricas en Tiempo Real -->
      <div class="panel metrics-panel">
        <h3>Métricas en Tiempo Real</h3>
        
        <div class="metrics-actions">
          <button @click="refreshMetrics" :disabled="loadingMetrics">
            {{ loadingMetrics ? '⏳' : '🔄' }} Actualizar Métricas
          </button>
          <select v-model="selectedPeriod" @change="loadMetrics">
            <option value="1h">Última hora</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </div>
        
        <div v-if="loadingMetrics" class="loading-metrics">
          Cargando métricas...
        </div>
        
        <div v-else-if="currentMetrics" class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">🖥️</span>
              <span class="metric-title">CPU</span>
            </div>
            <div class="metric-value">{{ currentMetrics.cpuUsage || 0 }}%</div>
            <div class="metric-bar">
              <div class="metric-fill cpu" :style="{ width: (currentMetrics.cpuUsage || 0) + '%' }"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">💾</span>
              <span class="metric-title">RAM</span>
            </div>
            <div class="metric-value">{{ currentMetrics.memoryUsage || 0 }}%</div>
            <div class="metric-bar">
              <div class="metric-fill memory" :style="{ width: (currentMetrics.memoryUsage || 0) + '%' }"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">💿</span>
              <span class="metric-title">Disco</span>
            </div>
            <div class="metric-value">{{ currentMetrics.diskUsage || 0 }}%</div>
            <div class="metric-bar">
              <div class="metric-fill disk" :style="{ width: (currentMetrics.diskUsage || 0) + '%' }"></div>
            </div>
          </div>
          
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-icon">⏱️</span>
              <span class="metric-title">Uptime</span>
            </div>
            <div class="metric-value">{{ formatUptime(currentMetrics.uptime) }}</div>
            <div class="metric-status">
              {{ currentMetrics.uptime > 604800 ? 'Estable' : 'Reciente reinicio' }}
            </div>
          </div>
        </div>
        
        <div v-else class="no-metrics">
          No hay métricas disponibles
        </div>
      </div>
      
      <!-- Acciones y Comandos -->
      <div class="panel actions-panel">
        <h3>Acciones Rápidas</h3>
        
        <div class="actions-grid">
          <button @click="executeAction('get_device_info')" 
                  class="action-card info"
                  :disabled="executingAction">
            <div class="action-icon">ℹ️</div>
            <div class="action-text">
              <div class="action-title">Información</div>
              <div class="action-desc">Obtener datos del sistema</div>
            </div>
          </button>
          
          <button @click="executeAction('restart')" 
                  class="action-card restart"
                  :disabled="executingAction">
            <div class="action-icon">🔄</div>
            <div class="action-text">
              <div class="action-title">Reiniciar</div>
              <div class="action-desc">Reiniciar dispositivo</div>
            </div>
          </button>
          
          <button @click="executeAction('backup_config')" 
                  class="action-card backup"
                  :disabled="executingAction">
            <div class="action-icon">💾</div>
            <div class="action-text">
              <div class="action-title">Backup</div>
              <div class="action-desc">Respaldar configuración</div>
            </div>
          </button>
          
          <button @click="executeAction('get_interfaces')" 
                  class="action-card interfaces"
                  :disabled="executingAction">
            <div class="action-icon">🔌</div>
            <div class="action-text">
              <div class="action-title">Interfaces</div>
              <div class="action-desc">Estado de puertos</div>
            </div>
          </button>
          
          <button v-if="device.type === 'cpe'" 
                  @click="executeAction('get_metric_signal_strength')" 
                  class="action-card signal"
                  :disabled="executingAction">
            <div class="action-icon">📶</div>
            <div class="action-text">
              <div class="action-title">Señal</div>
              <div class="action-desc">Nivel de señal</div>
            </div>
          </button>
          
          <button @click="showAdvancedCommands" 
                  class="action-card advanced"
                  :disabled="executingAction">
            <div class="action-icon">⚙️</div>
            <div class="action-text">
              <div class="action-title">Avanzado</div>
              <div class="action-desc">Más comandos</div>
            </div>
          </button>
        </div>
        
        <div v-if="executingAction" class="executing-action">
          <div class="spinner"></div>
          <span>Ejecutando {{ currentAction }}...</span>
        </div>
      </div>
      
      <!-- Credenciales -->
      <div class="panel credentials-panel">
        <h3>Credenciales de Acceso</h3>
        
        <div v-if="credentials.length > 0">
          <div class="credential-item" v-for="cred in credentials" :key="cred.id">
            <div class="credential-info">
              <div class="credential-type">{{ cred.connectionType?.toUpperCase() }}</div>
              <div class="credential-details">
                <div>Usuario: {{ cred.username }}</div>
                <div>Puerto: {{ cred.port || 'Default' }}</div>
                <div v-if="cred.snmpCommunity">Community: {{ cred.snmpCommunity }}</div>
              </div>
            </div>
            <div class="credential-actions">
              <button @click="testConnection(cred)" class="test-btn">
                🔗 Probar
              </button>
              <button @click="editCredential(cred)" class="edit-btn">
                ✏️ Editar
              </button>
            </div>
          </div>
        </div>
        
        <div v-else class="no-credentials">
          No hay credenciales configuradas
        </div>
        
        <button @click="showAddCredentials" class="add-credentials-btn">
          + Agregar Credenciales
        </button>
      </div>
      
      <!-- Historial de Comandos -->
      <div class="panel history-panel">
        <h3>Historial de Comandos</h3>
        
        <div class="history-controls">
          <button @click="loadCommandHistory" :disabled="loadingHistory">
            🔄 Actualizar
          </button>
          <button @click="clearHistory" class="clear-btn">
            🗑️ Limpiar Historial
          </button>
        </div>
        
        <div v-if="loadingHistory" class="loading-history">
          Cargando historial...
        </div>
        
        <div v-else-if="commandHistory.length > 0" class="history-list">
          <div class="history-item" v-for="cmd in commandHistory" :key="cmd.id">
            <div class="history-header">
              <div class="command-info">
                <span class="command-name">{{ cmd.command }}</span>
                <span class="command-user">por {{ cmd.User?.fullName || 'Sistema' }}</span>
              </div>
              <div class="command-meta">
                <span :class="['status', cmd.success ? 'success' : 'error']">
                  {{ cmd.success ? '✅' : '❌' }}
                </span>
                <span class="timestamp">{{ formatDate(cmd.executedAt) }}</span>
              </div>
            </div>
            
            <div v-if="cmd.output" class="command-output">
              <pre>{{ cmd.output }}</pre>
            </div>
            
            <div v-if="cmd.error" class="command-error">
              {{ cmd.error }}
            </div>
          </div>
        </div>
        
        <div v-else class="no-history">
          No hay comandos ejecutados
        </div>
      </div>
    </div>
    
    <!-- Modal para resultado de acción -->
    <div v-if="showResultModal" class="modal" @click="closeResultModal">
      <div class="modal-content result-modal" @click.stop>
        <h3>Resultado: {{ lastExecutedAction }}</h3>
        
        <div class="result-content">
          <div v-if="actionResult.success" class="success-result">
            <div class="result-header">✅ Comando ejecutado exitosamente</div>
            <pre class="result-output">{{ actionResult.output }}</pre>
          </div>
          
          <div v-else class="error-result">
            <div class="result-header">❌ Error al ejecutar comando</div>
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

export default {
  name: 'DeviceDetail',
  data() {
    return {
      device: {},
      credentials: [],
      currentMetrics: null,
      commandHistory: [],
      loading: true,
      loadingMetrics: false,
      loadingHistory: false,
      executingAction: false,
      error: null,
      selectedPeriod: '24h',
      currentAction: '',
      showResultModal: false,
      actionResult: null,
      lastExecutedAction: ''
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
        this.device = response.data.data || response.data;
        
        // Cargar datos relacionados en paralelo
        await Promise.all([
          this.loadCredentials(),
          this.loadMetrics(),
          this.loadCommandHistory()
        ].map(p => p.catch(error => {
          console.error('Error en carga parcial:', error);
          return null; // Continúa incluso si una promesa falla
        })));
      } catch (error) {
        console.error('Error cargando dispositivo:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        this.error = error.response?.data?.message || 'Error cargando datos del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadCredentials() {
      try {
        const response = await DeviceService.getDeviceCredentials(this.device.id);
        this.credentials = response.data.data || response.data;
      } catch (error) {
        console.error('Error cargando credenciales:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      }
    },
    
    async loadMetrics() {
      this.loadingMetrics = true;
      try {
        const response = await DeviceService.getDeviceMetrics(this.device.id, {
          period: this.selectedPeriod
        });
        const metrics = response.data.data || response.data;
        this.currentMetrics = Array.isArray(metrics) && metrics.length > 0 ? metrics[0] : null;
      } catch (error) {
        console.error('Error cargando métricas:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      } finally {
        this.loadingMetrics = false;
      }
    },
    
    async loadCommandHistory() {
      this.loadingHistory = true;
      try {
        const response = await DeviceService.getDeviceCommandHistory(this.device.id);
        const history = response.data.data?.history || response.data.data || response.data;
        this.commandHistory = Array.isArray(history) ? history.slice(0, 10) : [];
      } catch (error) {
        console.error('Error cargando historial:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      } finally {
        this.loadingHistory = false;
      }
    },
    
    async refreshDevice() {
      await this.loadDevice();
    },
    
    async refreshMetrics() {
      await this.loadMetrics();
    },
    
    async executeAction(action) {
      this.executingAction = true;
      this.currentAction = action;
      
      try {
        const response = await DeviceService.executeDeviceAction(this.device.id, action, {});
        this.actionResult = {
          success: true,
          output: response.data.output || response.data.message || 'Comando ejecutado correctamente'
        };
        this.lastExecutedAction = action;
        this.showResultModal = true;
        
        // Recargar historial después de ejecutar comando
        await this.loadCommandHistory();
      } catch (error) {
        console.error('Error ejecutando acción:', {
          action,
          deviceId: this.device.id,
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        this.actionResult = {
          success: false,
          error: error.response?.data?.message || 'Error al ejecutar el comando'
        };
        this.lastExecutedAction = action;
        this.showResultModal = true;
      } finally {
        this.executingAction = false;
        this.currentAction = '';
      }
    },
    
    async testConnection(credential) {
      try {
        const response = await DeviceService.testConnection({
          ipAddress: this.device.ipAddress,
          username: credential.username,
          password: credential.password,
          port: credential.port,
          connectionType: credential.connectionType
        });
        alert('Conexión exitosa: ' + response.data.message);
      } catch (error) {
        console.error('Error probando conexión:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        alert('Error de conexión: ' + (error.response?.data?.message || error.message));
      }
    },
    
    editCredential(credential) {
      this.$router.push(`/devices/${this.device.id}/credentials/${credential.id}/edit`);
    },
    
    showAddCredentials() {
      this.$router.push(`/devices/${this.device.id}/credentials/new`);
    },
    
    showAdvancedCommands() {
      this.$router.push(`/devices/${this.device.id}/commands`);
    },
    
    async clearHistory() {
      if (confirm('¿Está seguro de limpiar el historial de comandos?')) {
        try {
          await DeviceService.cleanCommandHistory(this.device.id, {});
          await this.loadCommandHistory();
        } catch (error) {
          console.error('Error limpiando historial:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
        }
      }
    },
    
    goToEdit() {
      this.$router.push(`/devices/${this.device.id}/edit`);
    },
    
    goBack() {
      this.$router.push('/devices');
    },
    
    getBrandIcon(brand) {
      const icons = {
        mikrotik: '🔧',
        ubiquiti: '📡',
        tplink: '🌐',
        cambium: '📶',
        mimosa: '🎯'
      };
      return icons[brand?.toLowerCase()] || '🔌';
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
    },
    
    formatUptime(seconds) {
      if (!seconds) return 'No disponible';
      
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      return `${days}d ${hours}h ${minutes}m`;
    }
  }
};
</script>

<style scoped>
.device-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button {
  background-color: #6c757d;
  color: white;
}

.edit-button {
  background-color: #007bff;
  color: white;
}

.back-button {
  background-color: #e0e0e0;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.device-content {
  display: grid;
  gap: 20px;
}

.panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.device-header-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.device-icon {
  font-size: 3rem;
}

.device-basic h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.device-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
}

.tag.brand {
  background: #e3f2fd;
  color: #1976d2;
}

.tag.type {
  background: #f3e5f5;
  color: #7b1fa2;
}

.tag.status.online {
  background: #e8f5e8;
  color: #2e7d32;
}

.tag.status.offline {
  background: #ffebee;
  color: #c62828;
}

.tag.status.warning {
  background: #fff8e1;
  color: #f57f17;
}

.device-status-indicator {
  text-align: right;
}

.status-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 0 auto 5px;
}

.status-circle.online { background: #4caf50; }
.status-circle.offline { background: #f44336; }
.status-circle.warning { background: #ff9800; }
.status-circle.maintenance { background: #9e9e9e; }

.last-seen {
  font-size: 0.8em;
  color: #666;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
}

.value a {
  color: #007bff;
  text-decoration: none;
}

.metrics-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.metrics-actions button, .metrics-actions select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.metrics-actions button {
  background: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

.loading-metrics {
  text-align: center;
  padding: 20px;
  color: #666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.metric-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.metric-icon {
  font-size: 1.2em;
}

.metric-title {
  font-weight: 500;
  color: #666;
}

.metric-value {
  font-size: 1.5em;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.metric-bar {
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 5px;
}

.metric-fill {
  height: 100%;
  transition: width 0.3s;
}

.metric-fill.cpu { background: #28a745; }
.metric-fill.memory { background: #ffc107; }
.metric-fill.disk { background: #dc3545; }

.metric-status {
  font-size: 0.8em;
  color: #666;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.action-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.action-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-icon {
  font-size: 1.5em;
}

.action-text {
  flex: 1;
}

.action-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.action-desc {
  font-size: 0.8em;
  color: #666;
}

.executing-action {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
  padding: 10px;
  background: #fff3cd;
  border-radius: 4px;
  color: #856404;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.credential-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 10px;
}

.credential-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.credential-type {
  font-weight: bold;
  padding: 4px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 0.8em;
}

.credential-details {
  font-size: 0.9em;
  color: #666;
}

.credential-actions {
  display: flex;
  gap: 8px;
}

.test-btn, .edit-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.test-btn {
  background: #e8f5e8;
  color: #2e7d32;
}

.edit-btn {
  background: #e3f2fd;
  color: #1976d2;
}

.no-credentials {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}

.add-credentials-btn {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 15px;
}

.history-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.history-controls button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
}

.clear-btn {
  background: #ffebee !important;
  color: #c62828 !important;
  border-color: #ffcdd2 !important;
}

.loading-history {
  text-align: center;
  padding: 20px;
  color: #666;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 10px;
  padding: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.command-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.command-name {
  font-weight: bold;
  color: #333;
}

.command-user {
  font-size: 0.9em;
  color: #666;
}

.command-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status.success {
  color: #2e7d32;
}

.status.error {
  color: #c62828;
}

.timestamp {
  font-size: 0.8em;
  color: #999;
}

.command-output {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin-top: 8px;
}

.command-output pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.8em;
  white-space: pre-wrap;
  max-height: 150px;
  overflow-y: auto;
}

.command-error {
  background: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 0.9em;
}

.no-history, .no-metrics {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
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
  width: 600px;
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

@media (max-width: 768px) {
  .device-content {
    grid-template-columns: 1fr;
  }
  
  .device-header-info {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .history-controls {
    flex-direction: column;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .device-header-info {
    padding: 10px;
  }
  
  .credential-item {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>