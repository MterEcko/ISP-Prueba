<template>
  <div class="device-commands">
    <div class="page-header">
      <h1>Comandos para {{ device?.name || 'Dispositivo' }}</h1>
      <div class="header-actions">
        <button @click="refreshData" class="btn-refresh" :disabled="loading.device || loading.commands || loading.history">
          🔄 Actualizar
        </button>
      </div>
    </div>

    <!-- Información del Dispositivo -->
    <div class="card device-info">
      <h2>Información del Dispositivo</h2>
      <div v-if="loading.device" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando datos del dispositivo...</p>
      </div>
      <div v-else-if="error.device" class="error-state">
        <p>{{ error.device }}</p>
        <button @click="loadDevice" class="btn-primary">Reintentar</button>
      </div>
      <div v-else class="info-grid">
        <div class="info-item">
          <span class="label">Nombre:</span>
          <span class="value">{{ device.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">Marca:</span>
          <span class="value">{{ device.brand }}</span>
        </div>
        <div class="info-item">
          <span class="label">Tipo:</span>
          <span class="value">{{ device.type }}</span>
        </div>
        <div class="info-item">
          <span class="label">IP:</span>
          <span class="value">{{ device.ipAddress }}</span>
        </div>
        <div class="info-item">
          <span class="label">Estado:</span>
          <span :class="['status-badge', device.status]">{{ getStatusText(device.status) }}</span>
        </div>
        <div class="info-item">
          <span class="label">Ubicación:</span>
          <span class="value">{{ device.location || 'No especificada' }}</span>
        </div>
      </div>
    </div>

    <!-- Filtros de Comandos -->
    <div class="filters-section">
      <div class="filters">
        <div class="filter-group">
          <label>Categoría:</label>
          <select v-model="selectedCategory" @change="filterCommands">
            <option value="">Todas</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ getCategoryName(category) }}
            </option>
          </select>
        </div>
        <div class="filter-group search-group">
          <label>Buscar:</label>
          <input 
            type="text" 
            v-model="searchTerm" 
            @keyup.enter="filterCommands"
            placeholder="Nombre o descripción"
          />
          <button @click="filterCommands" class="search-btn">🔍</button>
        </div>
      </div>
    </div>

    <!-- Lista de Comandos Disponibles -->
    <div class="card commands-list">
      <h2>Comandos Disponibles</h2>
      <div v-if="loading.commands" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando comandos...</p>
      </div>
      <div v-else-if="error.commands" class="error-state">
        <p>{{ error.commands }}</p>
        <button @click="loadAvailableCommands" class="btn-primary">Reintentar</button>
      </div>
      <div v-else-if="filteredCommands.length === 0" class="empty-state">
        <p>No hay comandos disponibles para este dispositivo.</p>
      </div>
      <div v-else class="commands-grid">
        <div v-for="command in filteredCommands" :key="command.id" class="command-card">
          <div class="command-header">
            <h3>{{ command.commandName }}</h3>
            <div class="command-badges">
              <span :class="['badge', 'category', command.category]">
                {{ getCategoryName(command.category) }}
              </span>
              <span :class="['badge', 'permission-level', getPermissionClass(command.permissionLevel)]">
                Nivel {{ command.permissionLevel }}
              </span>
              <span v-if="command.requiresConfirmation" class="badge warning">
                ⚠️ Confirmación
              </span>
              <span v-if="command.affectsService" class="badge danger">
                🚨 Afecta Servicio
              </span>
            </div>
          </div>
          <div class="command-description">
            <p>{{ command.description }}</p>
          </div>
          <div class="command-actions">
            <button 
              @click="openExecuteModal(command)"
              class="btn-small btn-primary"
              :disabled="executingCommand"
            >
              ▶️ Ejecutar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Historial de Comandos -->
    <div class="card command-history">
      <h2>Historial de Comandos</h2>
      <div v-if="loading.history" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando historial...</p>
      </div>
      <div v-else-if="error.history" class="error-state">
        <p>{{ error.history }}</p>
        <button @click="loadCommandHistory" class="btn-primary">Reintentar</button>
      </div>
      <div v-else-if="commandHistory.length === 0" class="empty-state">
        <p>No hay historial de comandos para este dispositivo.</p>
      </div>
      <div v-else class="history-table">
        <table>
          <thead>
            <tr>
              <th>Comando</th>
              <th>Usuario</th>
              <th>Resultado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in commandHistory" :key="entry.id">
              <td>{{ entry.command }}</td>
              <td>{{ entry.user?.fullName || entry.user?.username || 'N/A' }}</td>
              <td :class="{ 'success': entry.success, 'error': !entry.success }">
                {{ entry.success ? 'Éxito' : 'Error' }}
              </td>
              <td>{{ formatDate(entry.createdAt) }}</td>
              <td>
                <button 
                  @click="viewHistoryDetails(entry)"
                  class="btn-small btn-info"
                >
                  👁️ Detalles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de Ejecución de Comando -->
    <div v-if="showExecuteModal" class="modal" @click="closeExecuteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Ejecutar: {{ selectedCommand?.commandName }}</h3>
          <button @click="closeExecuteModal" class="close-btn">❌</button>
        </div>
        <div class="modal-body">
          <p>{{ selectedCommand?.description }}</p>
          <div v-if="selectedCommand?.requiresConfirmation" class="warning">
            ⚠️ Este comando requiere confirmación y puede {{ selectedCommand.affectsService ? 'afectar el servicio' : 'tener impactos' }}.
          </div>
          <div class="form-group">
            <label>Parámetros (JSON):</label>
            <textarea
              v-model="commandParameters"
              rows="4"
              placeholder='{"key": "value"}'
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeExecuteModal" class="btn-secondary">Cancelar</button>
          <button 
            @click="executeCommand"
            class="btn-primary"
            :disabled="executingCommand"
          >
            {{ executingCommand ? 'Ejecutando...' : 'Ejecutar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Detalles del Historial -->
    <div v-if="showHistoryModal" class="modal" @click="closeHistoryModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h3>Detalles de Ejecución</h3>
          <button @click="closeHistoryModal" class="close-btn">❌</button>
        </div>
        <div class="modal-body">
          <div class="detail-row">
            <span class="label">Comando:</span>
            <span class="value">{{ selectedHistory?.command }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Usuario:</span>
            <span class="value">{{ selectedHistory?.user?.fullName || selectedHistory?.user?.username }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Fecha:</span>
            <span class="value">{{ formatDate(selectedHistory?.createdAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Parámetros:</span>
            <pre class="value">{{ JSON.stringify(selectedHistory?.parameters, null, 2) }}</pre>
          </div>
          <div class="detail-row">
            <span class="label">Resultado:</span>
            <pre class="value">{{ JSON.stringify(selectedHistory?.result, null, 2) }}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeHistoryModal" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';

export default {
  name: 'DeviceCommands',
  data() {
    return {
      device: null,
      availableCommands: [],
      filteredCommands: [],
      commandHistory: [],
      categories: [],
      selectedCategory: '',
      searchTerm: '',
      loading: {
        device: false,
        commands: false,
        history: false
      },
      error: {
        device: null,
        commands: null,
        history: null
      },
      showExecuteModal: false,
      showHistoryModal: false,
      selectedCommand: null,
      selectedHistory: null,
      commandParameters: '{}',
      executingCommand: false
    };
  },
  created() {
    this.loadDevice();
    this.loadAvailableCommands();
    this.loadCommandHistory();
  },
  methods: {
    async loadDevice() {
      this.loading.device = true;
      this.error.device = null;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error.device = error.response?.data?.message || 'Error cargando datos del dispositivo';
      } finally {
        this.loading.device = false;
      }
    },

    async loadAvailableCommands() {
      this.loading.commands = true;
      this.error.commands = null;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getAvailableCommands(deviceId);
        this.availableCommands = response.data.data || response.data;
        this.filteredCommands = [...this.availableCommands];
        this.categories = [...new Set(this.availableCommands.map(cmd => cmd.category))];
      } catch (error) {
        console.error('Error cargando comandos:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        const status = error.response?.status;
        const message = error.response?.data?.message || 'Error desconocido';
        if (status === 404) {
          this.error.commands = 'No se encontraron comandos disponibles para este dispositivo.';
        } else if (status === 403) {
          this.error.commands = 'No tiene permisos para ver los comandos disponibles.';
        } else {
          this.error.commands = `Error cargando comandos: ${message}`;
        }
      } finally {
        this.loading.commands = false;
      }
    },

    async loadCommandHistory() {
      this.loading.history = true;
      this.error.history = null;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getDeviceCommandHistory(deviceId);
        this.commandHistory = response.data.data.history || [];
      } catch (error) {
        console.error('Error cargando historial:', error);
        this.error.history = error.response?.data?.message || 'Error cargando historial de comandos';
      } finally {
        this.loading.history = false;
      }
    },

    filterCommands() {
      let filtered = [...this.availableCommands];
      if (this.selectedCategory) {
        filtered = filtered.filter(cmd => cmd.category === this.selectedCategory);
      }
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(cmd => 
          cmd.commandName.toLowerCase().includes(term) ||
          cmd.description?.toLowerCase().includes(term)
        );
      }
      this.filteredCommands = filtered;
    },

    openExecuteModal(command) {
      this.selectedCommand = command;
      this.commandParameters = '{}';
      this.showExecuteModal = true;
    },

    closeExecuteModal() {
      this.showExecuteModal = false;
      this.selectedCommand = null;
      this.commandParameters = '{}';
    },

    async executeCommand() {
      if (!this.selectedCommand) return;
      this.executingCommand = true;
      try {
        let parameters = {};
        try {
          parameters = JSON.parse(this.commandParameters);
        } catch (e) {
          alert('Parámetros JSON inválidos');
          return;
        }

        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.executeDeviceAction(deviceId, this.selectedCommand.id, parameters);
        alert('Comando ejecutado: ' + response.data.message);
        this.closeExecuteModal();
        this.loadCommandHistory();
      } catch (error) {
        console.error('Error ejecutando comando:', error);
        alert('Error: ' + (error.response?.data?.message || error.message));
      } finally {
        this.executingCommand = false;
      }
    },

    viewHistoryDetails(entry) {
      this.selectedHistory = entry;
      this.showHistoryModal = true;
    },

    closeHistoryModal() {
      this.showHistoryModal = false;
      this.selectedHistory = null;
    },

    refreshData() {
      this.loadDevice();
      this.loadAvailableCommands();
      this.loadCommandHistory();
    },

    getCategoryName(category) {
      const names = {
        system: 'Sistema',
        network: 'Red',
        wireless: 'Inalámbrico',
        interface: 'Interfaces',
        monitoring: 'Monitoreo',
        backup: 'Respaldo',
        maintenance: 'Mantenimiento'
      };
      return names[category] || category;
    },

    getPermissionClass(level) {
      if (level <= 1) return 'basic';
      if (level <= 2) return 'intermediate';
      if (level <= 3) return 'advanced';
      if (level <= 4) return 'critical';
      return 'admin';
    },

    getStatusText(status) {
      const texts = {
        online: 'En línea',
        offline: 'Fuera de línea',
        maintenance: 'Mantenimiento'
      };
      return texts[status] || status;
    },

    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      return new Date(dateString).toLocaleString('es-MX');
    }
  }
};
</script>

<style scoped>
.device-commands {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-refresh {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.device-info .info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.info-item {
  padding: 10px;
}

.info-item .label {
  font-weight: 500;
  color: #555;
}

.info-item .value {
  color: #333;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
}

.status-badge.online {
  background: #d4edda;
  color: #155724;
}

.status-badge.offline {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.maintenance {
  background: #fff3cd;
  color: #856404;
}

.filters-section {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.filters {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 200px;
}

.search-group {
  flex-direction: row;
  align-items: end;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #555;
}

.filter-group select,
.filter-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-btn {
  padding: 8px 12px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.command-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  border-left: 4px solid #007bff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.command-header h3 {
  margin: 0;
  font-size: 1.1em;
}

.command-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.badge {
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.75em;
}

.badge.category {
  background: #e3f2fd;
  color: #1976d2;
}

.badge.permission-level.basic { background: #e8f5e8; color: #2e7d32; }
.badge.permission-level.intermediate { background: #fff3e0; color: #f57c00; }
.badge.permission-level.advanced { background: #fce4ec; color: #c2185b; }
.badge.permission-level.critical { background: #ffebee; color: #d32f2f; }
.badge.permission-level.admin { background: #f3e5f5; color: #7b1fa2; }
.badge.warning { background: #fff8e1; color: #f57f17; }
.badge.danger { background: #ffebee; color: #c62828; }

.command-description p {
  color: #666;
  margin: 0 0 10px;
}

.command-actions {
  display: flex;
  gap: 8px;
}

.btn-small {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.history-table table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.history-table th {
  background: #f8f9fa;
}

.history-table .success {
  color: #28a745;
}

.history-table .error {
  color: #dc3545;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
}

.large-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
}

.modal-body {
  margin-bottom: 15px;
}

.modal-body .form-group {
  margin-bottom: 15px;
}

.modal-body textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.warning {
  color: #dc3545;
  margin-bottom: 10px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.detail-row {
  margin-bottom: 10px;
}

.detail-row .label {
  font-weight: 500;
  color: #555;
  display: inline-block;
  width: 120px;
}

.detail-row .value {
  color: #333;
}

.detail-row pre {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>