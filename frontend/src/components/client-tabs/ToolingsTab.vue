<template>
  <div class="herramientas-tab">
    <div class="herramientas-grid">
      
      <!-- Diagnóstico de Red -->
      <div class="card diagnostico">
        <div class="card-header">
          <h3>Diagnóstico de Red</h3>
        </div>
        
        <div class="card-content">
          <div class="diagnostic-tools">
            
            <!-- Ping Test -->
            <div class="tool-section">
              <h4>Test de Conectividad (Ping)</h4>
              <div class="ping-tool">
                <div class="ping-input">
                  <input 
                    v-model="pingTarget" 
                    type="text" 
                    placeholder="IP o dominio (ej: 8.8.8.8)"
                    class="tool-input"
                    @keyup.enter="executePing"
                  />
                  <button @click="executePing" :disabled="pinging" class="tool-btn">
                    {{ pinging ? 'Ejecutando...' : 'Ping' }}
                  </button>
                </div>
                
                <div class="quick-targets">
                  <button 
                    v-if="primarySubscription?.assignedIpAddress"
                    @click="pingTarget = primarySubscription.assignedIpAddress; executePing()"
                    class="quick-target"
                  >
                    IP Cliente: {{ primarySubscription.assignedIpAddress }}
                  </button>
                  <button @click="pingTarget = '8.8.8.8'; executePing()" class="quick-target">
                    Google DNS: 8.8.8.8
                  </button>
                  <button @click="pingTarget = 'google.com'; executePing()" class="quick-target">
                    google.com
                  </button>
                </div>
                
                <div v-if="pingResult" class="ping-result">
                  <div :class="['result-status', pingResult.success ? 'success' : 'error']">
                    {{ pingResult.success ? '✅ Ping exitoso' : '❌ Ping falló' }}
                  </div>
                  <div class="result-details">
                    <pre>{{ pingResult.output }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- Traceroute -->
            <div class="tool-section">
              <h4>Rastreo de Ruta (Traceroute)</h4>
              <div class="traceroute-tool">
                <div class="tool-input-group">
                  <input 
                    v-model="tracerouteTarget" 
                    type="text" 
                    placeholder="Destino para traceroute"
                    class="tool-input"
                    @keyup.enter="executeTraceroute"
                  />
                  <button @click="executeTraceroute" :disabled="tracing" class="tool-btn">
                    {{ tracing ? 'Ejecutando...' : 'Traceroute' }}
                  </button>
                </div>
                
                <div v-if="tracerouteResult" class="traceroute-result">
                  <div class="result-header">Ruta hacia {{ tracerouteTarget }}:</div>
                  <div class="result-content">
                    <pre>{{ tracerouteResult.output }}</pre>
                  </div>
                </div>
              </div>
            </div>

            <!-- Speed Test -->
            <div class="tool-section">
              <h4>Test de Velocidad</h4>
              <div class="speed-test">
                <button @click="executeSpeedTest" :disabled="speedTesting" class="speed-test-btn">
                  {{ speedTesting ? 'Ejecutando...' : 'Iniciar Speed Test' }}
                </button>
                
                <div v-if="speedTestResult" class="speed-result">
                  <div class="speed-metrics">
                    <div class="speed-metric">
                      <span class="metric-label">Descarga:</span>
                      <span class="metric-value">{{ speedTestResult.download }} Mbps</span>
                    </div>
                    <div class="speed-metric">
                      <span class="metric-label">Subida:</span>
                      <span class="metric-value">{{ speedTestResult.upload }} Mbps</span>
                    </div>
                    <div class="speed-metric">
                      <span class="metric-label">Latencia:</span>
                      <span class="metric-value">{{ speedTestResult.ping }} ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Acceso a Dispositivos -->
      <div class="card acceso-dispositivos">
        <div class="card-header">
          <h3>Acceso a Dispositivos</h3>
        </div>
        
        <div class="card-content">
          <div v-if="devices.length > 0" class="devices-access">
            <div 
              v-for="device in devices" 
              :key="device.id"
              class="device-access-card"
            >
              <div class="device-info">
                <div class="device-name">{{ device.name }}</div>
                <div class="device-details">
                  {{ device.brand }} {{ device.model }} - {{ device.ipAddress }}
                </div>
                <div :class="['device-status', device.status]">
                  {{ formatDeviceStatus(device.status) }}
                </div>
              </div>
              
              <div class="device-actions">
                <button 
                  @click="accessWebInterface(device)" 
                  class="access-btn web"
                  title="Interfaz Web"
                  :disabled="device.status !== 'online'"
                >
                  🌐
                </button>
                <button 
                  @click="accessSSH(device)" 
                  class="access-btn ssh"
                  title="SSH"
                  :disabled="device.status !== 'online'"
                >
                  💻
                </button>
                <button 
                  @click="accessTelnet(device)" 
                  class="access-btn telnet"
                  title="Telnet"
                  :disabled="device.status !== 'online'"
                >
                  📟
                </button>

<button 
                  @click="rebootDevice(device)" 
                  class="access-btn reboot"
                  title="Reiniciar"
                  :disabled="device.status !== 'online'"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-devices">
            <div class="empty-state">
              <span class="empty-icon">📱</span>
              <h4>Sin dispositivos</h4>
              <p>No hay dispositivos asignados a este cliente</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Monitoreo de Tráfico -->
      <div class="card trafico">
        <div class="card-header">
          <h3>Monitoreo de Tráfico</h3>
          <div class="traffic-controls">
            <select v-model="trafficPeriod" @change="loadTrafficData" class="period-select">
              <option value="1h">Última hora</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
            <button @click="loadTrafficData" class="refresh-btn">🔄</button>
          </div>
        </div>
        
        <div class="card-content">
          <div v-if="trafficData" class="traffic-stats">
            <div class="traffic-summary">
              <div class="traffic-stat">
                <span class="stat-label">Descarga Total:</span>
                <span class="stat-value">{{ formatBytes(trafficData.totalDownload) }}</span>
              </div>
              <div class="traffic-stat">
                <span class="stat-label">Subida Total:</span>
                <span class="stat-value">{{ formatBytes(trafficData.totalUpload) }}</span>
              </div>
              <div class="traffic-stat">
                <span class="stat-label">Velocidad Promedio:</span>
                <span class="stat-value">{{ trafficData.avgSpeed }} Mbps</span>
              </div>
            </div>
            
            <div class="traffic-chart">
              <canvas ref="trafficChart" width="400" height="200"></canvas>
            </div>
          </div>
          
          <div v-else class="loading-traffic">
            <div class="loading-spinner"></div>
            <p>Cargando datos de tráfico...</p>
          </div>
        </div>
      </div>

      <!-- Información del Sistema -->
      <div class="card sistema-info">
        <div class="card-header">
          <h3>Información del Sistema</h3>
          <button @click="refreshSystemInfo" class="refresh-btn">🔄</button>
        </div>
        
        <div class="card-content">
          <div class="system-stats">
            <div class="stat-group">
              <h5>Conectividad</h5>
              <div class="stat-item">
                <span class="stat-name">Estado de Conexión:</span>
                <span :class="['stat-value', connectionStatus.class]">
                  {{ connectionStatus.text }}
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-name">Tiempo en Línea:</span>
                <span class="stat-value">{{ systemInfo.uptime || 'No disponible' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-name">Última Conexión:</span>
                <span class="stat-value">{{ formatDate(systemInfo.lastConnection) }}</span>
              </div>
            </div>

            <div class="stat-group">
              <h5>Configuración de Red</h5>
              <div class="stat-item">
                <span class="stat-name">IP Pública:</span>
                <span class="stat-value">{{ systemInfo.publicIP || 'No detectada' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-name">DNS:</span>
                <span class="stat-value">{{ systemInfo.dns || 'Automático' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-name">MTU:</span>
                <span class="stat-value">{{ systemInfo.mtu || '1500' }}</span>
              </div>
            </div>

            <div class="stat-group">
              <h5>Rendimiento</h5>
              <div class="stat-item">
                <span class="stat-name">Pérdida de Paquetes:</span>
                <span :class="['stat-value', getPacketLossClass(systemInfo.packetLoss)]">
                  {{ systemInfo.packetLoss || '0' }}%
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-name">Latencia Promedio:</span>
                <span :class="['stat-value', getLatencyClass(systemInfo.avgLatency)]">
                  {{ systemInfo.avgLatency || 'N/A' }} ms
                </span>
              </div>
              <div class="stat-item">
                <span class="stat-name">Jitter:</span>
                <span class="stat-value">{{ systemInfo.jitter || 'N/A' }} ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Herramientas de Mikrotik -->
      <div v-if="hasMikrotikDevices" class="card mikrotik-tools">
        <div class="card-header">
          <h3>Herramientas Mikrotik</h3>
        </div>
        
        <div class="card-content">
          <div class="mikrotik-actions">
            <button @click="viewMikrotikUsers" class="mikrotik-btn">
              👥 Ver Usuarios PPPoE
            </button>
            <button @click="viewMikrotikQueues" class="mikrotik-btn">
              📊 Ver Colas de Tráfico
            </button>
            <button @click="viewMikrotikInterfaces" class="mikrotik-btn">
              🔌 Ver Interfaces
            </button>
            <button @click="viewMikrotikFirewall" class="mikrotik-btn">
              🛡️ Reglas de Firewall
            </button>
            <button @click="exportMikrotikConfig" class="mikrotik-btn">
              💾 Exportar Configuración
            </button>
            <button @click="openWinbox" class="mikrotik-btn">
              🪟 Abrir Winbox
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal para resultados detallados -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ modalTitle }}</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <pre>{{ modalContent }}</pre>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import MikrotikService from '../../services/mikrotik.service';
import DeviceService from '../../services/device.service';

export default {
  name: 'HerramientasTab',
  props: {
    client: {
      type: Object,
      required: true
    },
    primarySubscription: {
      type: Object,
      default: null
    },
    devices: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      // Ping
      pingTarget: '',
      pinging: false,
      pingResult: null,
      
      // Traceroute
      tracerouteTarget: '',
      tracing: false,
      tracerouteResult: null,
      
      // Speed Test
      speedTesting: false,
      speedTestResult: null,
      
      // Tráfico
      trafficPeriod: '24h',
      trafficData: null,
      
      // Sistema
      systemInfo: {},
      connectionStatus: {
        text: 'Verificando...',
        class: 'checking'
      },
      
      // Modal
      showModal: false,
      modalTitle: '',
      modalContent: '',
      
      // Chart
      trafficChart: null
    };
  },
  computed: {
    hasMikrotikDevices() {
      return this.devices.some(device => device.brand?.toLowerCase() === 'mikrotik');
    }
  },
  methods: {
    // ===============================
    // HERRAMIENTAS DE DIAGNÓSTICO
    // ===============================

    async executePing() {
      if (!this.pingTarget.trim()) return;
      
      this.pinging = true;
      this.pingResult = null;
      
      try {
        // Simular ping (en implementación real, usar API)
        await this.simulatePing();
        
        // En implementación real:
        // const response = await NetworkService.ping(this.pingTarget);
        // this.pingResult = response.data;
        
      } catch (error) {
        console.error('Error ejecutando ping:', error);
        this.pingResult = {
          success: false,
          output: 'Error ejecutando ping: ' + error.message
        };
      } finally {
        this.pinging = false;
      }
    },

    async simulatePing() {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isSuccess = Math.random() > 0.2; // 80% de éxito
      
      if (isSuccess) {
        this.pingResult = {
          success: true,
          output: `PING ${this.pingTarget} (${this.pingTarget}): 56 data bytes
64 bytes from ${this.pingTarget}: icmp_seq=0 ttl=54 time=28.123 ms
64 bytes from ${this.pingTarget}: icmp_seq=1 ttl=54 time=27.891 ms
64 bytes from ${this.pingTarget}: icmp_seq=2 ttl=54 time=28.456 ms
64 bytes from ${this.pingTarget}: icmp_seq=3 ttl=54 time=27.678 ms

--- ${this.pingTarget} ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 27.678/28.037/28.456/0.325 ms`
        };
      } else {
        this.pingResult = {
          success: false,
          output: `PING ${this.pingTarget}: Host no alcanzable`
        };
      }
    },

    async executeTraceroute() {
      if (!this.tracerouteTarget.trim()) return;
      
      this.tracing = true;
      this.tracerouteResult = null;
      
      try {
        // Simular traceroute
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        this.tracerouteResult = {
          output: `traceroute to ${this.tracerouteTarget} (${this.tracerouteTarget}), 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)  1.234 ms  1.123 ms  1.089 ms
 2  10.0.0.1 (10.0.0.1)  5.678 ms  5.543 ms  5.432 ms
 3  isp-core.net (203.0.113.1)  12.345 ms  12.234 ms  12.123 ms
 4  * * *
 5  ${this.tracerouteTarget} (${this.tracerouteTarget})  28.123 ms  27.891 ms  28.456 ms`
        };
        
      } catch (error) {
        console.error('Error ejecutando traceroute:', error);
      } finally {
        this.tracing = false;
      }
    },

    async executeSpeedTest() {
      this.speedTesting = true;
      this.speedTestResult = null;
      
      try {
        // Simular speed test
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        this.speedTestResult = {
          download: (Math.random() * 50 + 10).toFixed(1),
          upload: (Math.random() * 20 + 5).toFixed(1),
          ping: (Math.random() * 30 + 10).toFixed(0)
        };
        
      } catch (error) {
        console.error('Error ejecutando speed test:', error);
      } finally {
        this.speedTesting = false;
      }
    },

    // ===============================
    // ACCESO A DISPOSITIVOS
    // ===============================

    formatDeviceStatus(status) {
      const statusMap = {
        'online': 'En línea',
        'offline': 'Fuera de línea',
        'warning': 'Advertencia',
        'error': 'Error'
      };
      return statusMap[status] || status;
    },

    accessWebInterface(device) {
      const url = `http://${device.ipAddress}`;
      window.open(url, '_blank');
    },

    accessSSH(device) {
      // Mostrar información de SSH o abrir cliente SSH
      this.showModal = true;
      this.modalTitle = `Acceso SSH - ${device.name}`;
      this.modalContent = `Para conectar por SSH:

ssh admin@${device.ipAddress}

O usando PuTTY:
Host: ${device.ipAddress}
Port: 22
Username: admin

Nota: Asegúrate de tener las credenciales correctas.`;
    },

    accessTelnet(device) {
      this.showModal = true;
      this.modalTitle = `Acceso Telnet - ${device.name}`;
      this.modalContent = `Para conectar por Telnet:

telnet ${device.ipAddress}

Puerto: 23
Username: admin

Nota: Telnet no es seguro. Se recomienda usar SSH.`;
    },

    async rebootDevice(device) {
      if (!confirm(`¿Está seguro que desea reiniciar ${device.name}?`)) {
        return;
      }
      
      try {
        // En implementación real:
        // await DeviceService.reboot(device.id);
        
        console.log('Reiniciando dispositivo:', device.name);
        alert('Comando de reinicio enviado');
        
      } catch (error) {
        console.error('Error reiniciando dispositivo:', error);
        alert('Error reiniciando dispositivo');
      }
    },

    // ===============================
    // MONITOREO DE TRÁFICO
    // ===============================

    async loadTrafficData() {
      try {
        // Simular carga de datos de tráfico
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.trafficData = {
          totalDownload: Math.random() * 10000000000, // 10GB max
          totalUpload: Math.random() * 2000000000,    // 2GB max
          avgSpeed: (Math.random() * 50 + 10).toFixed(1)
        };
        
        this.renderTrafficChart();
        
      } catch (error) {
        console.error('Error cargando datos de tráfico:', error);
      }
    },

    renderTrafficChart() {
      // Implementar gráfico de tráfico
      // Usar Chart.js o similar
      console.log('Renderizando gráfico de tráfico');
    },

    // ===============================
    // INFORMACIÓN DEL SISTEMA
    // ===============================

    async refreshSystemInfo() {
      try {
        // Simular carga de información del sistema
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        this.systemInfo = {
          uptime: '2d 14h 32m',
          lastConnection: new Date(),
          publicIP: '203.0.113.45',
          dns: '8.8.8.8, 8.8.4.4',
          mtu: '1500',
          packetLoss: (Math.random() * 2).toFixed(1),
          avgLatency: (Math.random() * 50 + 10).toFixed(0),
          jitter: (Math.random() * 10 + 1).toFixed(1)
        };
        
        // Actualizar estado de conexión
        if (this.primarySubscription?.status === 'active') {
          this.connectionStatus = {
            text: 'Conectado',
            class: 'connected'
          };
        } else {
          this.connectionStatus = {
            text: 'Desconectado',
            class: 'disconnected'
          };
        }
        
      } catch (error) {
        console.error('Error cargando información del sistema:', error);
      }
    },

    // ===============================
    // HERRAMIENTAS MIKROTIK
    // ===============================

    viewMikrotikUsers() {
      this.$router.push(`/mikrotik/users?clientId=${this.client.id}`);
    },

    viewMikrotikQueues() {
      this.$router.push(`/mikrotik/queues?clientId=${this.client.id}`);
    },

    viewMikrotikInterfaces() {
      this.$router.push(`/mikrotik/interfaces?clientId=${this.client.id}`);
    },

    viewMikrotikFirewall() {
      this.$router.push(`/mikrotik/firewall?clientId=${this.client.id}`);
    },

    async exportMikrotikConfig() {
      try {
        // Obtener configuración exportada
        console.log('Exportando configuración Mikrotik');
        alert('Configuración exportada');
        
      } catch (error) {
        console.error('Error exportando configuración:', error);
      }
    },

    openWinbox() {
      const mikrotikDevice = this.devices.find(d => d.brand?.toLowerCase() === 'mikrotik');
      if (mikrotikDevice) {
        // Intentar abrir Winbox
        window.location.href = `winbox://${mikrotikDevice.ipAddress}`;
      }
    },

    // ===============================
    // UTILIDADES
    // ===============================

    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('es-MX');
    },

    getPacketLossClass(loss) {
      const lossNum = parseFloat(loss);
      if (lossNum === 0) return 'excellent';
      if (lossNum < 1) return 'good';
      if (lossNum < 3) return 'warning';
      return 'error';
    },

    getLatencyClass(latency) {
      const latencyNum = parseFloat(latency);
      if (latencyNum < 20) return 'excellent';
      if (latencyNum < 50) return 'good';
      if (latencyNum < 100) return 'warning';
      return 'error';
    },

    closeModal() {
      this.showModal = false;
      this.modalTitle = '';
      this.modalContent = '';
    }
  },

  mounted() {
    this.refreshSystemInfo();
    this.loadTrafficData();
    
    // Auto-configurar ping target con IP del cliente
    if (this.primarySubscription?.assignedIpAddress) {
      this.pingTarget = this.primarySubscription.assignedIpAddress;
    }
  }
};
</script>

<style scoped>
.herramientas-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.herramientas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ===============================
   TARJETAS
   =============================== */

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
}

.card-content {
  padding: 24px;
}

/* ===============================
   HERRAMIENTAS DE DIAGNÓSTICO
   =============================== */

.diagnostic-tools {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.tool-section {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
}

.tool-section h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 1.1rem;
}

.ping-input, .tool-input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.tool-input {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;
}

.tool-input:focus {
  outline: none;
  border-color: #667eea;
}

.tool-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.tool-btn:hover:not(:disabled) {
  background: #5a67d8;
}

.tool-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.quick-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-target {
  padding: 6px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-target:hover {
  background: #e0e0e0;
}

.ping-result, .traceroute-result {
  margin-top: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.result-status {
  padding: 12px;
  font-weight: 500;
}

.result-status.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-status.error {
  background: #ffebee;
  color: #c62828;
}

.result-details, .result-content {
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.result-details pre, .result-content pre {
  margin: 0;
  padding: 16px;
  font-size: 0.85rem;
  line-height: 1.4;
  overflow-x: auto;
}

/* Speed Test */
.speed-test {
  text-align: center;
}

.speed-test-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.speed-test-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.speed-test-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
}

.speed-result {
  margin-top: 20px;
}

.speed-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.speed-metric {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.metric-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

/* ===============================
   ACCESO A DISPOSITIVOS
   =============================== */

.devices-access {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-access-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  transition: border-color 0.2s ease;
}

.device-access-card:hover {
  border-color: #667eea;
}

.device-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.device-details {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 4px;
}

.device-status {
  font-size: 0.85rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.device-status.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.device-status.offline {
  background: #ffebee;
  color: #c62828;
}

.device-actions {
  display: flex;
  gap: 8px;
}

.access-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.access-btn.web {
  background: #e3f2fd;
  color: #1565c0;
}

.access-btn.ssh {
  background: #e8f5e9;
  color: #2e7d32;
}

.access-btn.telnet {
  background: #fff3e0;
  color: #f57c00;
}

.access-btn.reboot {
  background: #ffebee;
  color: #c62828;
}

.access-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.access-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* ===============================
   MONITOREO DE TRÁFICO
   =============================== */

.traffic-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.period-select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.refresh-btn {
  padding: 6px 10px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.refresh-btn:hover {
  background: #e0e0e0;
}

.traffic-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.traffic-stat {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.traffic-chart {
  height: 200px;
  border: 1px solid #eee;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

/* ===============================
   INFORMACIÓN DEL SISTEMA
   =============================== */

.system-stats {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stat-group {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
}

.stat-group h5 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1rem;
  font-weight: 600;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-name {
  font-size: 0.9rem;
  color: #666;
}

</style>