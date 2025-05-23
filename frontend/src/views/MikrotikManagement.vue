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
            to="/mikrotik/device/new" 
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
        <router-link to="/devices/new" class="btn">Agregar Primer Dispositivo</router-link>
      </div>
      
      <div v-else class="devices-grid">
        <div v-for="device in mikrotikDevices" :key="device.id" class="device-card">
          <div class="device-header">
            <h3>{{ device.name }}</h3>
            <span class="status-badge" :class="getStatusClass(device.status)">
              {{ device.status === 'online' ? 'Conectado' : 'Desconectado' }}
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
              <span class="label">Último acceso:</span>
              <span class="value">{{ formatDate(device.lastSeen) }}</span>
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
              :to="`/mikrotik/device/${device.id}/edit`" 
              class="btn btn-small btn-outline"
            >
              ⚙️ Configurar
            </router-link>
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
            <span class="value">{{ deviceInfo.name || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Versión:</span>
            <span class="value">{{ deviceInfo.version || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">Uptime:</span>
            <span class="value">{{ deviceInfo.uptime || 'N/A' }}</span>
          </div>
          <div class="detail-item">
            <span class="label">CPU:</span>
            <span class="value">{{ deviceInfo.cpuLoad || 'N/A' }}%</span>
          </div>
          <div class="detail-item">
            <span class="label">Memoria:</span>
            <span class="value">{{ deviceInfo.memoryUsage || 'N/A' }}%</span>
          </div>
          <div class="detail-item">
            <span class="label">Clientes Configuraddos PPPoE:</span>
            <span class="value">{{ deviceInfo.clients || 0 }}</span>
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
      }
    };
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
        // Cargar solo dispositivos Mikrotik
        const response = await DeviceService.getDevices({ brand: 'mikrotik' });
        this.mikrotikDevices = response.data.devices || [];
      } catch (error) {
        console.error('Error cargando dispositivos Mikrotik:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async getDeviceInfo(device) {
      // Verificar que el dispositivo tenga credenciales
      if (!device.ipAddress || !device.username || !device.password) {
        alert('El dispositivo no tiene configuradas las credenciales necesarias');
        return;
      }
      
      device.checking = true;
      this.selectedDevice = device;
      this.deviceInfo = null;
      
      try {
        const response = await MikrotikService.getDeviceInfo(
          device.ipAddress,
          device.username,
          device.password,
          device.apiPort || 8728
        );
        
        this.deviceInfo = response.data.data;
        // Actualizar estado del dispositivo
        device.status = response.data.success ? 'online' : 'offline';
      } catch (error) {
        console.error('Error obteniendo información del dispositivo:', error);
        alert('Error al obtener información del dispositivo');
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
        // Cargar estadísticas generales
        const devicesResponse = await DeviceService.getDevices({ brand: 'mikrotik' });
        const devices = devicesResponse.data.devices || [];
        
        this.networkStats.totalDevices = devices.length;
        this.networkStats.onlineDevices = devices.filter(d => d.status === 'online').length;
        
        // Cargar estadísticas de PPPoE para cada dispositivo online
        let totalPPPoEUsers = 0;
        let activeSessions = 0;
        
        for (const device of devices.filter(d => d.status === 'online' && d.ipAddress)) {
          try {
            // Obtener usuarios PPPoE
            const usersResponse = await MikrotikService.getPPPoEUsers(device.id);
            if (usersResponse.data.success) {
              totalPPPoEUsers += usersResponse.data.count || 0;
            }
            
            // Obtener sesiones activas
            const sessionsResponse = await MikrotikService.getActivePPPoESessions(device.id);
            if (sessionsResponse.data.success) {
              activeSessions += sessionsResponse.data.count || 0;
            }
          } catch (error) {
            console.error(`Error obteniendo estadísticas de ${device.name}:`, error);
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
        'status-offline': status === 'offline',
        'status-unknown': status === 'unknown'
      };
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

.status-unknown {
  background-color: #fff3cd;
  color: #856404;
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

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

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
}
</style>