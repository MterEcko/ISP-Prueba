<template>
  <div class="mikrotik-management">
    <h1 class="page-title">Gestión de Mikrotik</h1>
    
    <!-- Sección de prueba de conexión -->
    <div class="card">
      <h2>Prueba de Conexión</h2>
      <div class="connection-form">
        <div class="form-row">
          <div class="form-group">
            <label for="testIp">Dirección IP</label>
            <input 
              type="text" 
              id="testIp" 
              v-model="connectionTest.ip" 
              placeholder="192.168.1.1"
            />
          </div>
          <div class="form-group">
            <label for="testUsername">Usuario</label>
            <input 
              type="text" 
              id="testUsername" 
              v-model="connectionTest.username" 
              placeholder="admin"
            />
          </div>
          <div class="form-group">
            <label for="testPassword">Contraseña (opcional)</label>
            <input 
              type="password" 
              id="testPassword" 
              v-model="connectionTest.password" 
              placeholder="Dejar vacío si no tiene"
            />
          </div>
          <div class="form-group">
            <label for="testPort">Puerto API</label>
            <input 
              type="number" 
              id="testPort" 
              v-model="connectionTest.port" 
              placeholder="8728"
            />
          </div>
        </div>
        <button 
          class="btn btn-primary" 
          @click="testConnection" 
          :disabled="testingConnection"
        >
          {{ testingConnection ? 'Probando...' : 'Probar Conexión' }}
        </button>
        
        <div v-if="connectionResult" class="result-message" :class="connectionResult.success ? 'success' : 'error'">
          {{ connectionResult.message }}
        </div>
      </div>
    </div>
    
    <!-- Lista de dispositivos Mikrotik -->
    <div class="card">
      <div class="card-header">
        <h2>Dispositivos Mikrotik</h2>
        <div class="header-actions">
          <button class="btn btn-outline" @click="loadMikrotikDevices">
            🔄 Actualizar
          </button>
          <router-link 
            to="/devices/new?brand=mikrotik" 
            class="btn btn-primary"
          >
            + Agregar Router Mikrotik
          </router-link>
        </div>
      </div>
      
      <div v-if="loading" class="loading-state">
        Cargando dispositivos...
      </div>
      
      <div v-else-if="mikrotikDevices.length === 0" class="empty-state">
        <p>No hay dispositivos Mikrotik registrados.</p>
        <router-link to="/devices/new?brand=mikrotik" class="btn">Agregar Primer Dispositivo</router-link>
      </div>
      
      <div v-else class="devices-grid">
        <div v-for="device in mikrotikDevices" :key="device.id" class="device-card">
          <div class="device-header">
            <h3>{{ device.name }}</h3>
            <span class="status-badge" :class="getStatusClass(device.status)">
              {{ getStatusText(device.status) }}
            </span>
          </div>
          
          <div class="device-info">
            <div class="info-item">
              <span class="label">IP:</span>
              <span class="value">{{ device.ipAddress || 'No configurada' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Modelo:</span>
              <span class="value">{{ device.model || 'No especificado' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Ubicación:</span>
              <span class="value">{{ device.location || 'No especificada' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Nodo:</span>
              <span class="value">{{ device.Node?.name || 'Sin nodo' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Último acceso:</span>
              <span class="value">{{ formatDate(device.updatedAt || device.lastSeen) }}</span>
            </div>
          </div>
          
          <div class="device-actions">
            <button 
              class="btn btn-small btn-primary" 
              @click="getDeviceInfo(device)"
              :disabled="device.checking"
            >
              {{ device.checking ? 'Consultando...' : 'Info Detallada' }}
            </button>
            <button 
              class="btn btn-small" 
              @click="openMikrotikPanel(device)"
            >
              Panel PPPoE
            </button>
            <router-link 
              :to="`/devices/${device.id}/edit`" 
              class="btn btn-small btn-outline"
            >
              ⚙️ Configurar
            </router-link>
            <router-link 
              :to="`/devices/${device.id}`" 
              class="btn btn-small btn-success"
            >
              👁️ Ver Detalle
            </router-link>
            <!-- ✅ AGREGAR ESTE BOTÓN: -->
            <button 
              class="btn btn-small btn-danger" 
              @click="openDeleteConfirmation(device)"
              title="Eliminar dispositivo (requiere confirmación triple)"
            >
               🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Panel de información del dispositivo -->
    <div v-if="selectedDevice && deviceInfo" class="card">
      <h2>Información Detallada: {{ selectedDevice.name }}</h2>
      <div class="device-details">
        <div class="details-grid">
          <div class="detail-item">
            <span class="label">Sistema:</span>
            <span class="value">{{ deviceInfo.identity || deviceInfo.name || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Versión:</span>
            <span class="value">{{ deviceInfo.version || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Arquitectura:</span>
            <span class="value">{{ deviceInfo.architecture || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Uptime:</span>
            <span class="value">{{ formatUptime(deviceInfo.uptime) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">CPU:</span>
            <span class="value">{{ deviceInfo.cpuLoad || deviceInfo['cpu-load'] || 'N/A' }}%</span>
          </div>
          <div class="detail-item">
            <span class="label">Memoria Libre:</span>
            <span class="value">{{ formatBytes(deviceInfo.freeMemory || deviceInfo['free-memory']) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Memoria Total:</span>
            <span class="value">{{ formatBytes(deviceInfo.totalMemory || deviceInfo['total-memory']) }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Board:</span>
            <span class="value">{{ deviceInfo.boardName || deviceInfo['board-name'] || 'N/A' }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Estadísticas de red -->
    <div class="card">
      <h2>Estadísticas de Red</h2>
      <div class="network-stats">
        <div class="stat-item">
          <div class="stat-value">{{ networkStats.totalDevices }}</div>
          <div class="stat-label">Dispositivos Mikrotik</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ networkStats.onlineDevices }}</div>
          <div class="stat-label">Dispositivos Online</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ networkStats.totalPPPoEUsers }}</div>
          <div class="stat-label">Usuarios PPPoE</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ networkStats.activeSessions }}</div>
          <div class="stat-label">Sesiones Activas</div>
        </div>
      </div>
    </div>
<!-- Modal de confirmación para eliminar dispositivo -->
<div v-if="showDeleteModal" class="modal-overlay">
  <div class="modal-content delete-modal">
    <h3>⚠️ Eliminar Dispositivo Mikrotik</h3>
    
    <div class="device-info-summary">
      <strong>{{ deviceToDelete?.name }}</strong><br>
      <span>{{ deviceToDelete?.ipAddress }}</span><br>
      <small>{{ deviceToDelete?.location }}</small>
    </div>

    <div class="warning-message">
      <p><strong>Esta acción realizará las siguientes operaciones:</strong></p>
      <ul>
        <li>🧹 Eliminará TODOS los usuarios PPPoE del router</li>
        <li>🔑 Eliminará las credenciales de acceso</li>
        <li>📱 Desactivará el dispositivo en el sistema</li>
        <li>📊 Los datos históricos se conservarán</li>
      </ul>
    </div>

    <div class="confirmation-steps">
      <!-- Paso 1 -->
      <label class="confirmation-step">
        <input 
          type="checkbox" 
          v-model="deleteConfirmationSteps.step1"
        />
        Entiendo que esta acción afectará a todos los clientes conectados a este router
      </label>

      <!-- Paso 2 -->
      <label class="confirmation-step">
        <input 
          type="checkbox" 
          v-model="deleteConfirmationSteps.step2"
        />
        Confirmo que he notificado a los clientes sobre esta desconexión
      </label>

      <!-- Paso 3 -->
      <div class="confirmation-step">
        <label>
          <input 
            type="checkbox" 
            v-model="deleteConfirmationSteps.step3"
          />
          Para confirmar, escriba el nombre del dispositivo:
        </label>
        <input 
          type="text" 
          v-model="deleteConfirmationSteps.deviceNameInput"
          :placeholder="deviceToDelete?.name"
          class="device-name-input"
        />
      </div>
    </div>

    <div class="modal-actions">
      <button 
        @click="showDeleteModal = false" 
        class="btn btn-secondary"
        :disabled="deletionInProgress"
      >
        Cancelar
      </button>
      
      <button 
        @click="executeDeviceDeletion" 
        class="btn btn-danger"
        :disabled="!canProceedWithDeletion || deletionInProgress"
      >
        {{ deletionInProgress ? 'Eliminando...' : 'Eliminar Dispositivo' }}
      </button>
    </div>
  </div>
</div>
  </div>
</template>

<script>
import MikrotikService from '../services/mikrotik.service';
import DeviceService from '../services/device.service';

export default {
  name: 'MikrotikManagement',
  data() {
    return {
      connectionTest: {
        ip: '',
        username: 'admin',
        password: '',
        port: 8728
      },
      testingConnection: false,
      connectionResult: null,
      mikrotikDevices: [],
      loading: false,
      selectedDevice: null,
      deviceInfo: null,
      networkStats: {
        totalDevices: 0,
        onlineDevices: 0,
        totalPPPoEUsers: 0,
        activeSessions: 0
      },
      showDeleteModal: false,
      deviceToDelete: null,
      deleteConfirmationSteps: {
        step1: false,
        step2: false,
        step3: false,
        deviceNameInput: ''
      },
      deletionInProgress: false
    };
  },
  
  // ✅ COMPUTED PROPERTIES (correctamente definidas)
  computed: {
    canProceedWithDeletion() {
      return this.deleteConfirmationSteps.step1 && 
             this.deleteConfirmationSteps.step2 && 
             this.deleteConfirmationSteps.step3 &&
             this.deleteConfirmationSteps.deviceNameInput === this.deviceToDelete?.name;
    }
  },
  
  created() {
    this.loadMikrotikDevices();
    this.loadNetworkStats();
  },
  
  methods: {
    async testConnection() {
      if (!this.connectionTest.ip || !this.connectionTest.username) {
        this.connectionResult = {
          success: false,
          message: 'Por favor ingrese al menos la IP y el username'
        };
        return;
      }
      
      if (!MikrotikService.isValidIP(this.connectionTest.ip)) {
        this.connectionResult = {
          success: false,
          message: 'Formato de IP inválido'
        };
        return;
      }
      
      this.testingConnection = true;
      this.connectionResult = null;
      
      try {
        const response = await MikrotikService.testConnection(
          this.connectionTest.ip,
          this.connectionTest.username,
          this.connectionTest.password,
          this.connectionTest.port
        );
        
        this.connectionResult = {
          success: response.data.success,
          message: response.data.message
        };
      } catch (error) {
        console.error('Error probando conexión:', error);
        this.connectionResult = {
          success: false,
          message: error.response?.data?.message || 'Error de conexión'
        };
      } finally {
        this.testingConnection = false;
      }
    },
    
    async loadMikrotikDevices() {
      this.loading = true;
      try {
        const response = await DeviceService.getAllDevices({ brand: 'mikrotik' });
        this.mikrotikDevices = response.data.devices || [];
      } catch (error) {
        console.error('Error cargando dispositivos Mikrotik:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async getDeviceInfo(device) {
      if (!device.ipAddress) {
        alert('El dispositivo no tiene configurada una dirección IP');
        return;
      }
      
      device.checking = true;
      this.selectedDevice = device;
      this.deviceInfo = null;
      
      try {
        const credentialsResponse = await DeviceService.getDeviceCredentials(device.id);
        const credentials = credentialsResponse.data.credentials || [];
        const activeCredential = credentials.find(cred => cred.isActive) || credentials[0];

        if (!activeCredential || !activeCredential.username) {
          alert('El dispositivo no tiene credenciales configuradas');
          return;
        }    
        
        const response = await MikrotikService.getDeviceInfo(
          device.ipAddress,
          activeCredential.username,
          activeCredential.password || '',
          activeCredential.port || device.apiPort || 8728
        );
    
        if (response.data.success) {
          this.deviceInfo = response.data.data || response.data;
          console.log('Información del dispositivo:', this.deviceInfo);
          device.status = 'online';
        } else {
          alert('No se pudo conectar al dispositivo: ' + response.data.message);
          device.status = 'offline';
        }
    
      } catch (error) {
        console.error('Error obteniendo información del dispositivo:', error);
    
        if (error.response?.status === 404) {
          alert('No se encontraron credenciales para este dispositivo');
        } else {
          alert('Error al obtener información del dispositivo: ' + (error.response?.data?.message || error.message));
        }
    
        device.status = 'offline';
      } finally {
        device.checking = false;
      }
    },
    
    openMikrotikPanel(device) {
      this.$router.push(`/mikrotik/device/${device.id}/pppoe`);
    },
    
    async loadNetworkStats() {
      try {
        const devicesResponse = await DeviceService.getAllDevices({ brand: 'mikrotik' });
        const devices = devicesResponse.data.devices || devicesResponse.data || [];
    
        this.networkStats.totalDevices = devices.length;
        this.networkStats.onlineDevices = devices.filter(d => d.status === 'online').length;
    
        let totalPPPoEUsers = 0;
        let activeSessions = 0;
    
        for (const device of devices.filter(d => d.ipAddress)) {
          try {
            const credentialsResponse = await DeviceService.getDeviceCredentials(device.id);
            const credentials = credentialsResponse.data.credentials || [];
        
            if (credentials.length === 0) {
              console.log(`Dispositivo ${device.name} sin credenciales, saltando...`);
              continue;
            }
        
            const usersResponse = await MikrotikService.getPPPoEUsers(device.id);
            if (usersResponse.data.success) {
              totalPPPoEUsers += usersResponse.data.count || 0;
            }
        
            const sessionsResponse = await MikrotikService.getActivePPPoESessions(device.id);
            if (sessionsResponse.data.success) {
              activeSessions += sessionsResponse.data.count || 0;
            }
        
          } catch (error) {
            console.warn(`Error obteniendo estadísticas de ${device.name}:`, error.message);
          }
        }
    
        this.networkStats.totalPPPoEUsers = totalPPPoEUsers;
        this.networkStats.activeSessions = activeSessions;
    
      } catch (error) {
        console.error('Error cargando estadísticas de red:', error);
      }
    },

    getStatusClass(status) {
      return {
        'status-online': status === 'online',
        'status-offline': status === 'offline' || status === 'unknown',
        'status-warning': status === 'warning',
        'status-maintenance': status === 'maintenance'
      };
    },
    
    getStatusText(status) {
      const texts = {
        online: 'Conectado',
        offline: 'Desconectado',
        unknown: 'Desconocido',
        warning: 'Con alertas',
        maintenance: 'Mantenimiento'
      };
      return texts[status] || 'Desconocido';
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        return `Hace ${diffMins} min`;
      } else if (diffMins < 1440) {
        return `Hace ${Math.floor(diffMins / 60)} h`;
      } else {
        return date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit'
        });
      }
    },
    
    formatUptime(uptime) {
      return MikrotikService.formatUptime(uptime);
    },
    
    formatBytes(bytes) {
      return MikrotikService.formatBytes(bytes);
    },

    // ===== MÉTODOS DE ELIMINACIÓN =====
    
    openDeleteConfirmation(device) {
      this.deviceToDelete = device;
      this.resetDeleteConfirmation();
      this.showDeleteModal = true;
    },

    resetDeleteConfirmation() {
      this.deleteConfirmationSteps = {
        step1: false,
        step2: false,
        step3: false,
        deviceNameInput: ''
      };
    },

    async executeDeviceDeletion() {
      if (!this.canProceedWithDeletion) {
        alert('Por favor complete todas las confirmaciones requeridas');
        return;
      }

      this.deletionInProgress = true;
      
      try {
        await this.hybridDeviceDeletion(this.deviceToDelete);
        
        await this.loadMikrotikDevices();
        await this.loadNetworkStats();
        
        this.showDeleteModal = false;
        
        alert(`Dispositivo ${this.deviceToDelete.name} eliminado exitosamente`);
        
      } catch (error) {
        console.error('Error durante la eliminación:', error);
        alert('Error durante la eliminación: ' + (error.message || error));
      } finally {
        this.deletionInProgress = false;
      }
    },

    async hybridDeviceDeletion(device) {
      const results = {
        mikrotikCleanup: false,
        credentialsRemoved: false,
        deviceDeactivated: false,
        pppoeUsersRemoved: false
      };

      try {
        // Limpiar configuraciones en Mikrotik
        if (device.ipAddress && device.status !== 'offline') {
          try {
            console.log('🧹 Limpiando configuraciones en Mikrotik...');
            
            const pppoeResponse = await MikrotikService.getPPPoEUsers(device.id);
            if (pppoeResponse.data.success && pppoeResponse.data.users) {
              for (const user of pppoeResponse.data.users) {
                try {
                  await MikrotikService.deletePPPoEUser(device.id, user.mikrotikId);
                  console.log(`✅ Usuario PPPoE eliminado: ${user.username}`);
                } catch (error) {
                  console.warn(`⚠️ Error eliminando usuario PPPoE ${user.username}:`, error);
                }
              }
            }
            
            results.mikrotikCleanup = true;
            results.pppoeUsersRemoved = true;
            
          } catch (error) {
            console.warn('⚠️ No se pudo limpiar Mikrotik (dispositivo offline):', error);
          }
        }

        // Eliminar credenciales
        try {
          console.log('🔑 Eliminando credenciales...');
          const credentialsResponse = await DeviceService.getDeviceCredentials(device.id);
          const credentials = credentialsResponse.data.credentials || [];
          
          for (const credential of credentials) {
            await DeviceService.deleteDeviceCredentials(credential.id);
            console.log(`✅ Credencial eliminada: ${credential.id}`);
          }
          
          results.credentialsRemoved = true;
          
        } catch (error) {
          console.warn('⚠️ Error eliminando credenciales:', error);
        }

        // Desactivar dispositivo
        try {
          console.log('📱 Desactivando dispositivo en base de datos...');
          
          await DeviceService.updateDevice(device.id, {
            status: 'deleted',
            active: false,
            notes: (device.notes || '') + `\n[ELIMINADO el ${new Date().toLocaleString()}]`
          });
          
          results.deviceDeactivated = true;
          console.log('✅ Dispositivo desactivado exitosamente');
          
        } catch (error) {
          console.error('❌ Error desactivando dispositivo:', error);
          throw new Error('No se pudo desactivar el dispositivo en la base de datos');
        }

        return results;

      } catch (error) {
        console.error('❌ Error en proceso de eliminación híbrida:', error);
        throw error;
      }
    },

    async cleanupMikrotikConfiguration(device) {
      if (!device.ipAddress) return;
      
      try {
        const users = await MikrotikService.getPPPoEUsers(device.id);
        if (users.data.success) {
          for (const user of users.data.users || []) {
            await MikrotikService.deletePPPoEUser(device.id, user.mikrotikId);
          }
        }
      } catch (error) {
        console.warn('No se pudo limpiar configuración Mikrotik:', error);
      }
    },

    async removeDeviceCredentials(device) {
      try {
        const credentials = await DeviceService.getDeviceCredentials(device.id);
        for (const credential of credentials.data.credentials || []) {
          await DeviceService.deleteDeviceCredentials(credential.id);
        }
      } catch (error) {
        console.warn('No se pudieron eliminar las credenciales:', error);
      }
    }
  }
};
</script>


<style scoped>
.mikrotik-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 20px;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.card h2 {
  font-size: 1.2rem;
  color: #34495e;
  margin-bottom: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.connection-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #555;
  margin-bottom: 5px;
}

.form-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.result-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-weight: 500;
}

.result-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 30px;
  color: #666;
}

.devices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.device-card {
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
  transition: box-shadow 0.2s;
}

.device-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.device-header h3 {
  margin: 0;
  color: #2c3e50;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-online {
  background-color: #d4edda;
  color: #155724;
}

.status-offline {
  background-color: #f8d7da;
  color: #721c24;
}

.status-warning {
  background-color: #fff3cd;
  color: #856404;
}

.status-maintenance {
  background-color: #e2e3e5;
  color: #383d41;
}

.device-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.info-item .label {
  font-weight: 600;
  color: #555;
}

.info-item .value {
  color: #333;
}

.device-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.device-details {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: white;
  border-radius: 4px;
}

.network-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  margin-top: 5px;
  color: #666;
  font-size: 0.9rem;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-outline {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline:hover {
  background-color: #3498db;
  color: white;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Estilos para el botón de eliminar y modal */
.btn-danger {
  background-color: #dc3545;
  color: white;
  border: 1px solid #dc3545;
}

.btn-danger:hover {
  background-color: #c82333;
  border-color: #bd2130;
}

.btn-danger:disabled {
  background-color: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.delete-modal {
  background: white;
  border-radius: 12px;
  padding: 30px;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-height: 80vh;
  overflow-y: auto;
}

.device-info-summary {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  text-align: center;
}

.warning-message {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
}

.warning-message ul {
  margin: 10px 0 0 20px;
}

.confirmation-steps {
  margin: 20px 0;
}

.confirmation-step {
  display: block;
  margin: 15px 0;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirmation-step:hover {
  background: #f8f9fa;
}

.confirmation-step input[type="checkbox"] {
  margin-right: 10px;
  transform: scale(1.2);
}

.device-name-input {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: 1px solid #6c757d;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Media queries para responsive */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .devices-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .device-actions {
    justify-content: center;
  }
}
</style>