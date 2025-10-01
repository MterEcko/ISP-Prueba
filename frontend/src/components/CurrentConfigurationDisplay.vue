<template>
  <div class="current-configuration-display">
    <!-- Información de la suscripción actual -->
    <div class="config-section subscription-info">
      <h5>📦 Suscripción Actual</h5>
      <div class="config-grid">
        <div class="config-item">
          <span class="label">Paquete:</span>
          <span class="value">{{ subscription?.ServicePackage?.name || 'No especificado' }}</span>
        </div>
        <div class="config-item">
          <span class="label">Velocidad:</span>
          <span class="value">
            ↓{{ subscription?.ServicePackage?.downloadSpeedMbps || 0 }} / 
            ↑{{ subscription?.ServicePackage?.uploadSpeedMbps || 0 }} Mbps
          </span>
        </div>
        <div class="config-item">
          <span class="label">Precio:</span>
          <span class="value price">${{ getCurrentPrice() }}/mes</span>
        </div>
        <div class="config-item">
          <span class="label">Estado:</span>
          <span class="value" :class="getStatusClass()">
            {{ formatStatus(subscription?.status) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Configuración de red actual -->
    <div class="config-section network-info" v-if="networkConfig">
      <h5>🌐 Configuración de Red</h5>
      <div class="config-grid">
        <div class="config-item">
          <span class="label">Usuario PPPoE:</span>
          <span class="value monospace">{{ networkConfig.pppoeUsername || 'No configurado' }}</span>
        </div>
        <div class="config-item">
          <span class="label">IP Estática:</span>
          <span class="value monospace">{{ networkConfig.staticIp || 'Dinámica' }}</span>
        </div>
        <div class="config-item">
          <span class="label">Protocolo:</span>
          <span class="value">{{ formatProtocol(networkConfig.protocol) }}</span>
        </div>
        <div class="config-item">
          <span class="label">MAC Address:</span>
          <span class="value monospace">{{ networkConfig.macAddress || 'No registrada' }}</span>
        </div>
      </div>
    </div>

    <!-- Información del router/nodo actual -->
    <div class="config-section router-info" v-if="getCurrentRouter()">
      <h5>🗼 Router/Nodo Actual</h5>
      <div class="config-grid">
        <div class="config-item">
          <span class="label">Router:</span>
          <span class="value">{{ getCurrentRouter().name }}</span>
        </div>
        <div class="config-item">
          <span class="label">IP del Router:</span>
          <span class="value monospace">{{ getCurrentRouter().ipAddress }}</span>
        </div>
        <div class="config-item">
          <span class="label">Nodo:</span>
          <span class="value">{{ getCurrentRouter().Node?.name || 'No especificado' }}</span>
        </div>
        <div class="config-item">
          <span class="label">Zona:</span>
          <span class="value">{{ getCurrentRouter().Node?.Zone?.name || 'No especificada' }}</span>
        </div>
      </div>
    </div>

    <!-- Datos de Mikrotik en tiempo real -->
    <div class="config-section mikrotik-info" v-if="mikrotikData">
      <h5>🔧 Estado en Mikrotik</h5>
      <div class="config-grid">
        <div class="config-item">
          <span class="label">Perfil Activo:</span>
          <span class="value">{{ mikrotikData.currentProfileName || 'No encontrado' }}</span>
        </div>
        <div class="config-item">
          <span class="label">Pool Asignado:</span>
          <span class="value">{{ mikrotikData.currentPoolName || 'No asignado' }}</span>
        </div>
        <div class="config-item">
          <span class="label">IP Actual:</span>
          <span class="value monospace">{{ mikrotikData.assignedIpAddress || 'No asignada' }}</span>
        </div>
        <div class="config-item">
          <span class="label">Estado Conexión:</span>
          <span class="value" :class="getConnectionStatusClass(mikrotikData.status)">
            {{ formatConnectionStatus(mikrotikData.status) }}
          </span>
        </div>
      </div>
      
      <!-- Estadísticas de tráfico si están disponibles -->
      <div class="traffic-stats" v-if="mikrotikData.bytesIn || mikrotikData.bytesOut">
        <h6>📊 Estadísticas de Tráfico</h6>
        <div class="traffic-grid">
          <div class="traffic-item">
            <span class="traffic-label">Descarga:</span>
            <span class="traffic-value">{{ formatBytes(mikrotikData.bytesIn) }}</span>
          </div>
          <div class="traffic-item">
            <span class="traffic-label">Subida:</span>
            <span class="traffic-value">{{ formatBytes(mikrotikData.bytesOut) }}</span>
          </div>
          <div class="traffic-item" v-if="mikrotikData.uptime">
            <span class="traffic-label">Tiempo Activo:</span>
            <span class="traffic-value">{{ formatUptime(mikrotikData.uptime) }}</span>
          </div>
          <div class="traffic-item" v-if="mikrotikData.lastConnected">
            <span class="traffic-label">Última Conexión:</span>
            <span class="traffic-value">{{ formatDate(mikrotikData.lastConnected) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Alertas o advertencias sobre la configuración -->
    <div class="config-section alerts" v-if="getConfigurationAlerts().length > 0">
      <h5>⚠️ Alertas de Configuración</h5>
      <div class="alert-list">
        <div 
          class="alert-item" 
          v-for="alert in getConfigurationAlerts()" 
          :key="alert.code"
          :class="alert.severity"
        >
          <span class="alert-icon">{{ getAlertIcon(alert.severity) }}</span>
          <span class="alert-message">{{ alert.message }}</span>
        </div>
      </div>
    </div>

    <!-- Botones de acción rápida -->
    <div class="quick-actions" v-if="showQuickActions">
      <button 
        class="action-btn refresh-btn" 
        @click="$emit('refresh-config')"
        :disabled="refreshing"
      >
        🔄 {{ refreshing ? 'Actualizando...' : 'Actualizar Estado' }}
      </button>
      
      <button 
        class="action-btn sync-btn" 
        @click="$emit('sync-mikrotik')"
        :disabled="syncing"
      >
        🔄 {{ syncing ? 'Sincronizando...' : 'Sincronizar con Mikrotik' }}
      </button>
      
      <button 
        class="action-btn test-btn" 
        @click="$emit('test-connection')"
        :disabled="testing"
      >
        🧪 {{ testing ? 'Probando...' : 'Probar Conexión' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CurrentConfigurationDisplay',
  props: {
    subscription: {
      type: Object,
      default: null
    },
    networkConfig: {
      type: Object,
      default: null
    },
    mikrotikData: {
      type: Object,
      default: null
    },
    availableRouters: {
      type: Array,
      default: () => []
    },
    showQuickActions: {
      type: Boolean,
      default: true
    },
    refreshing: {
      type: Boolean,
      default: false
    },
    syncing: {
      type: Boolean,
      default: false
    },
    testing: {
      type: Boolean,
      default: false
    }
  },
  emits: ['refresh-config', 'sync-mikrotik', 'test-connection'],
  
  methods: {
    getCurrentPrice() {
      if (!this.subscription) return '0.00'
      
      // Priorizar precio personalizado si existe
      if (this.subscription.monthlyFee) {
        const monthlyFee = parseFloat(this.subscription.monthlyFee)
        if (!isNaN(monthlyFee)) {
          return monthlyFee.toFixed(2)
        }
      }
      
      // Usar precio del paquete
      if (this.subscription.ServicePackage?.price) {
        const packagePrice = parseFloat(this.subscription.ServicePackage.price)
        if (!isNaN(packagePrice)) {
          return packagePrice.toFixed(2)
        }
      }
      
      return '0.00'
    },
    
    getCurrentRouter() {
      if (!this.subscription?.primaryRouterId || !this.availableRouters.length) {
        return null
      }
      
      return this.availableRouters.find(router => 
        router.id === this.subscription.primaryRouterId
      )
    },
    
    formatStatus(status) {
      const statusLabels = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'pending': 'Pendiente',
        'cutService': 'Servicio Cortado'
      }
      return statusLabels[status] || status || 'Desconocido'
    },
    
    getStatusClass() {
      if (!this.subscription?.status) return 'status-unknown'
      
      const statusClasses = {
        'active': 'status-active',
        'suspended': 'status-suspended',
        'cancelled': 'status-cancelled',
        'pending': 'status-pending',
        'cutService': 'status-cut'
      }
      
      return statusClasses[this.subscription.status] || 'status-unknown'
    },
    
    formatProtocol(protocol) {
      const protocolLabels = {
        'pppoe': 'PPPoE',
        'static': 'IP Estática',
        'dhcp': 'DHCP'
      }
      return protocolLabels[protocol] || protocol || 'No especificado'
    },
    
    formatConnectionStatus(status) {
      const connectionLabels = {
        'online': 'Conectado',
        'offline': 'Desconectado',
        'connecting': 'Conectando',
        'suspended': 'Suspendido'
      }
      return connectionLabels[status] || status || 'Desconocido'
    },
    
    getConnectionStatusClass(status) {
      const statusClasses = {
        'online': 'connection-online',
        'offline': 'connection-offline',
        'connecting': 'connection-connecting',
        'suspended': 'connection-suspended'
      }
      return statusClasses[status] || 'connection-unknown'
    },
    
    formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B'
      
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    
    formatUptime(uptime) {
      if (!uptime) return 'No disponible'
      
      // Convertir uptime (en segundos) a formato legible
      const seconds = parseInt(uptime)
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      
      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`
      } else if (hours > 0) {
        return `${hours}h ${minutes}m`
      } else {
        return `${minutes}m`
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return 'No disponible'
      
      const date = new Date(dateString)
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    getConfigurationAlerts() {
      const alerts = []
      
      // Verificar sincronización entre BD y Mikrotik
      if (this.subscription && this.mikrotikData) {
        // Verificar usuario PPPoE
        if (this.subscription.pppoeUsername !== this.mikrotikData.username) {
          alerts.push({
            code: 'PPPOE_USER_MISMATCH',
            severity: 'warning',
            message: 'El usuario PPPoE en BD no coincide con Mikrotik'
          })
        }
        
        // Verificar estado
        if (this.subscription.status === 'active' && this.mikrotikData.status !== 'online') {
          alerts.push({
            code: 'STATUS_MISMATCH',
            severity: 'error',
            message: 'Suscripción activa pero usuario desconectado en Mikrotik'
          })
        }
        
        // Verificar IP
        if (this.subscription.assignedIpAddress !== this.mikrotikData.assignedIpAddress) {
          alerts.push({
            code: 'IP_MISMATCH',
            severity: 'warning',
            message: 'La IP asignada en BD no coincide con Mikrotik'
          })
        }
      }
      
      // Verificar si falta configuración de red
      if (this.subscription && !this.networkConfig) {
        alerts.push({
          code: 'NO_NETWORK_CONFIG',
          severity: 'error',
          message: 'Suscripción sin configuración de red'
        })
      }
      
      // Verificar si no hay datos de Mikrotik
      if (this.subscription && this.subscription.status === 'active' && !this.mikrotikData) {
        alerts.push({
          code: 'NO_MIKROTIK_DATA',
          severity: 'error',
          message: 'No se encontraron datos en Mikrotik para suscripción activa'
        })
      }
      
      return alerts
    },
    
    getAlertIcon(severity) {
      const icons = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'error': '❌',
        'critical': '🚨'
      }
      return icons[severity] || '⚠️'
    }
  }
}
</script>

<style scoped>
.current-configuration-display {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.config-section {
  background: white;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid #e0e0e0;
}

.config-section h5 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 1em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-section h6 {
  margin: 12px 0 8px 0;
  color: #555;
  font-size: 0.9em;
}

.subscription-info {
  border-left-color: #4CAF50;
}

.network-info {
  border-left-color: #2196F3;
}

.router-info {
  border-left-color: #FF9800;
}

.mikrotik-info {
  border-left-color: #9C27B0;
}

.alerts {
  border-left-color: #F44336;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.config-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 0.9em;
  color: #666;
  font-weight: 500;
}

.value {
  font-weight: bold;
  color: #333;
}

.value.monospace {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

.value.price {
  color: #4CAF50;
  font-size: 1.1em;
}

/* Estados de suscripción */
.status-active { color: #4CAF50; }
.status-suspended { color: #FF9800; }
.status-cancelled { color: #F44336; }
.status-pending { color: #2196F3; }
.status-cut { color: #9C27B0; }
.status-unknown { color: #666; }

/* Estados de conexión */
.connection-online { color: #4CAF50; }
.connection-offline { color: #F44336; }
.connection-connecting { color: #FF9800; }
.connection-suspended { color: #9C27B0; }
.connection-unknown { color: #666; }

/* Estadísticas de tráfico */
.traffic-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #ddd;
}

.traffic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.traffic-item {
  display: flex;
  flex-direction: column;
  text-align: center;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
}

.traffic-label {
  font-size: 0.8em;
  color: #666;
  margin-bottom: 2px;
}

.traffic-value {
  font-weight: bold;
  font-size: 0.9em;
  color: #333;
}

/* Alertas */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
}

.alert-item.info {
  background: #e3f2fd;
  color: #1565c0;
}

.alert-item.warning {
  background: #fff3e0;
  color: #ef6c00;
}

.alert-item.error {
  background: #ffebee;
  color: #c62828;
}

.alert-item.critical {
  background: #f3e5f5;
  color: #7b1fa2;
}

.alert-icon {
  flex-shrink: 0;
}

.alert-message {
  flex: 1;
}

/* Botones de acción rápida */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.refresh-btn {
  background: #e3f2fd;
  color: #1565c0;
}

.refresh-btn:hover:not(:disabled) {
  background: #bbdefb;
}

.sync-btn {
  background: #f3e5f5;
  color: #7b1fa2;
}

.sync-btn:hover:not(:disabled) {
  background: #e1bee7;
}

.test-btn {
  background: #fff3e0;
  color: #ef6c00;
}

.test-btn:hover:not(:disabled) {
  background: #ffe0b2;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
  
  .traffic-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>