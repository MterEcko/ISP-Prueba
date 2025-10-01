<template>
  <div class="servicios-tab">
    <div class="servicios-grid">
      
      <!-- Servicios de Internet -->
      <div class="card servicios-internet">
        <div class="card-header">
          <h3>Servicios de Internet</h3>
          <button @click="$emit('add-subscription')" class="add-btn">
            + Agregar Servicio
          </button>
        </div>
        
        <div class="card-content">
          <div v-if="subscriptions.length > 0" class="subscriptions-list">
            <div 
              v-for="subscription in subscriptions" 
              :key="subscription.id"
              class="subscription-card"
            >
              <div class="subscription-header">
                <div class="subscription-info">
                  <h4>{{ subscription.ServicePackage?.name || 'Plan no definido' }}</h4>
                  <div class="subscription-meta">
                    <span class="subscription-id">ID: {{ subscription.id }}</span>
                    <span :class="['status-badge', 'status-' + subscription.status]">
                      {{ formatStatus(subscription.status) }}
                    </span>
                  </div>
                </div>
                <div class="subscription-actions">
                  <button @click="$emit('edit-subscription', subscription)" class="action-btn edit">
                    ✏️
                  </button>
                  <button @click="showSubscriptionMenu(subscription)" class="action-btn menu">
                    ⋮
                  </button>
                </div>
              </div>

              <div class="subscription-details">
                <div class="detail-row">
                  <span class="detail-label">Velocidad:</span>
                  <span class="detail-value">
                    ↓{{ subscription.ServicePackage?.downloadSpeedMbps || 0 }} Mbps / 
                    ↑{{ subscription.ServicePackage?.uploadSpeedMbps || 0 }} Mbps
                  </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">IP Asignada:</span>
                  <span class="detail-value ip-address">
                    {{ subscription.assignedIpAddress || 'No asignada' }}
                    <button 
                      v-if="subscription.assignedIpAddress" 
                      @click="pingIP(subscription.assignedIpAddress)"
                      class="ping-btn"
                      title="Ping"
                    >
                      🏓
                    </button>
                  </span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Usuario PPPoE:</span>
                  <span class="detail-value">{{ subscription.pppoeUsername || 'No configurado' }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Perfil Mikrotik:</span>
                  <span class="detail-value">{{ subscription.mikrotikProfileName || 'No asignado' }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Cuota Mensual:</span>
                  <span class="detail-value price">${{ subscription.monthlyFee || '0.00' }}</span>
                </div>

                <div class="detail-row">
                  <span class="detail-label">Fecha de Inicio:</span>
                  <span class="detail-value">{{ formatDate(subscription.startDate) }}</span>
                </div>

                <div v-if="subscription.notes" class="detail-row notes">
                  <span class="detail-label">Notas:</span>
                  <span class="detail-value">{{ subscription.notes }}</span>
                </div>
              </div>

              <!-- Menú contextual -->
              <div v-if="showMenu === subscription.id" class="subscription-menu">
                <button @click="changeStatus(subscription, 'suspend')" class="menu-item">
                  ⏸️ Suspender
                </button>
                <button @click="changeStatus(subscription, 'activate')" class="menu-item">
                  ▶️ Activar
                </button>
                <button @click="changePlan(subscription)" class="menu-item">
                  🔄 Cambiar Plan
                </button>
                <button @click="cancelSubscription(subscription)" class="menu-item danger">
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-subscriptions">
            <div class="empty-state">
              <span class="empty-icon">📡</span>
              <h4>Sin servicios de internet</h4>
              <p>Este cliente no tiene servicios de internet contratados</p>
              <button @click="$emit('add-subscription')" class="add-first-btn">
                Agregar Primer Servicio
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipos Asignados -->
      <div class="card equipos-asignados">
        <div class="card-header">
          <h3>Equipos Asignados</h3>
          <button @click="addDevice" class="add-btn">
            + Asignar Equipo
          </button>
        </div>
        
        <div class="card-content">
          <div v-if="devices.length > 0" class="devices-list">
            <div 
              v-for="device in devices" 
              :key="device.id"
              class="device-card"
            >
              <div class="device-image">
                <img 
                  v-if="device.imageUrl" 
                  :src="device.imageUrl" 
                  :alt="device.name"
                  class="device-photo"
                />
                <div v-else class="device-placeholder">
                  {{ getDeviceIcon(device.type) }}
                </div>
              </div>

              <div class="device-info">
                <h5>{{ device.name }}</h5>
                <div class="device-details">
                  <span class="device-brand">{{ device.brand }} {{ device.model }}</span>
                  <span :class="['device-status', device.status]">
                    {{ formatDeviceStatus(device.status) }}
                  </span>
                </div>
                
                <div class="device-specs">
                  <div class="spec-item">
                    <span class="spec-label">IP:</span>
                    <span class="spec-value">{{ device.ipAddress || 'No asignada' }}</span>
                  </div>
                  <div v-if="device.macAddress" class="spec-item">
                    <span class="spec-label">MAC:</span>
                    <span class="spec-value mac">{{ device.macAddress }}</span>
                  </div>
                  <div v-if="device.serialNumber" class="spec-item">
                    <span class="spec-label">S/N:</span>
                    <span class="spec-value">{{ device.serialNumber }}</span>
                  </div>
                </div>

                <div v-if="device.location" class="device-location">
                  📍 {{ device.location }}
                </div>
              </div>

              <div class="device-actions">
                <button 
                  @click="accessDevice(device)" 
                  class="device-action-btn access"
                  title="Acceder"
                >
                  🔗
                </button>
                <button 
                  @click="configureDevice(device)" 
                  class="device-action-btn config"
                  title="Configurar"
                >
                  ⚙️
                </button>
                <button 
                  @click="$emit('manage-device', device)" 
                  class="device-action-btn manage"
                  title="Gestionar"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-devices">
            <div class="empty-state">
              <span class="empty-icon">📶</span>
              <h4>Sin equipos asignados</h4>
              <p>No hay dispositivos de red asignados a este cliente</p>
              <button @click="addDevice" class="add-first-btn">
                Asignar Primer Equipo
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Servicios Adicionales -->
      <div class="card servicios-adicionales">
        <div class="card-header">
          <h3>Servicios Adicionales</h3>
          <button @click="addAdditionalService" class="add-btn">
            + Agregar
          </button>
        </div>
        
        <div class="card-content">
          
          <!-- Jellyfin / Streaming -->
          <div class="additional-service jellyfin">
            <div class="service-header">
              <div class="service-icon">📺</div>
              <div class="service-info">
                <h4>Jellyfin Streaming</h4>
                <p class="service-description">Servicio de streaming multimedia</p>
              </div>
              <div class="service-status">
                <span :class="['status-indicator', jellyfinStatus.active ? 'active' : 'inactive']">
                  {{ jellyfinStatus.active ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>

            <div v-if="jellyfinStatus.active" class="service-details">
              <div class="detail-row">
                <span class="detail-label">Usuario:</span>
                <span class="detail-value">{{ jellyfinStatus.username || 'No configurado' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Último acceso:</span>
                <span class="detail-value">{{ formatDate(jellyfinStatus.lastAccess) || 'Nunca' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tiempo de uso:</span>
                <span class="detail-value">{{ jellyfinStatus.watchTime || '0 hrs' }}</span>
              </div>
            </div>

            <div class="service-actions">
              <button 
                v-if="!jellyfinStatus.active" 
                @click="activateJellyfin" 
                class="service-btn activate"
              >
                Activar Jellyfin
              </button>
              <template v-else>
                <button @click="manageJellyfin" class="service-btn manage">
                  Gestionar
                </button>
                <button @click="deactivateJellyfin" class="service-btn deactivate">
                  Desactivar
                </button>
              </template>
            </div>
          </div>

          <!-- Soporte Técnico Prioritario -->
          <div class="additional-service support">
            <div class="service-header">
              <div class="service-icon">🛠️</div>
              <div class="service-info">
                <h4>Soporte Prioritario</h4>
                <p class="service-description">Atención técnica con prioridad alta</p>
              </div>
              <div class="service-status">
                <span :class="['status-indicator', prioritySupport ? 'active' : 'inactive']">
                  {{ prioritySupport ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>

            <div class="service-actions">
              <button 
                v-if="!prioritySupport" 
                @click="togglePrioritySupport" 
                class="service-btn activate"
              >
                Activar Soporte
              </button>
              <button 
                v-else 
                @click="togglePrioritySupport" 
                class="service-btn deactivate"
              >
                Desactivar
              </button>
            </div>
          </div>

          <!-- IP Fija -->
          <div class="additional-service static-ip">
            <div class="service-header">
              <div class="service-icon">🌐</div>
              <div class="service-info">
                <h4>IP Fija</h4>
                <p class="service-description">Dirección IP estática dedicada</p>
              </div>
              <div class="service-status">
                <span :class="['status-indicator', hasStaticIP ? 'active' : 'inactive']">
                  {{ hasStaticIP ? 'Configurada' : 'No configurada' }}
                </span>
              </div>
            </div>

            <div v-if="hasStaticIP" class="service-details">
              <div class="detail-row">
                <span class="detail-label">IP Asignada:</span>
                <span class="detail-value ip-address">{{ staticIPAddress }}</span>
              </div>
            </div>

            <div class="service-actions">
              <button 
                v-if="!hasStaticIP" 
                @click="configureStaticIP" 
                class="service-btn activate"
              >
                Configurar IP
              </button>
              <template v-else>
                <button @click="modifyStaticIP" class="service-btn manage">
                  Modificar
                </button>
                <button @click="removeStaticIP" class="service-btn deactivate">
                  Remover
                </button>
              </template>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- Modal para acciones de dispositivos -->
    <div v-if="showDeviceModal" class="modal-overlay" @click="closeDeviceModal">
      <div class="modal-content device-modal" @click.stop>
        <DeviceAccessModal 
          :device="selectedDevice"
          @close="closeDeviceModal"
          @access-granted="onDeviceAccess"
        />
      </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'ServicesTab',
  props: {
    client: {
      type: Object,
      required: true
    },
    subscriptions: {
      type: Array,
      default: () => []
    },
    devices: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      showMenu: null,
      showDeviceModal: false,
      selectedDevice: null,
      
      // Estados de servicios adicionales
      jellyfinStatus: {
        active: false,
        username: null,
        lastAccess: null,
        watchTime: null
      },
      prioritySupport: false,
      hasStaticIP: false,
      staticIPAddress: null
    };
  },
  methods: {
    // ===============================
    // GESTIÓN DE SUSCRIPCIONES
    // ===============================

    showSubscriptionMenu(subscription) {
      this.showMenu = this.showMenu === subscription.id ? null : subscription.id;
    },

    formatStatus(status) {
      const statusMap = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'cutService': 'Corte de Servicio',
        'pending': 'Pendiente'
      };
      return statusMap[status] || status;
    },

    formatDate(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    pingIP(ipAddress) {
      console.log('🏓 Ping a IP:', ipAddress);
      // Emitir evento hacia el componente padre
      this.$emit('ping-test', ipAddress);
    },

    changeStatus(subscription, action) {
      console.log(`${action} suscripción:`, subscription.id);
      this.showMenu = null;
      
      if (action === 'suspend') {
        this.$emit('suspend-subscription', subscription);
      } else if (action === 'activate') {
        this.$emit('activate-subscription', subscription);
      }
    },

    changePlan(subscription) {
      console.log('Cambiar plan:', subscription.id);
      this.showMenu = null;
      this.$emit('change-plan', subscription);
    },

    cancelSubscription(subscription) {
      if (confirm('¿Está seguro que desea cancelar esta suscripción?')) {
        console.log('Cancelar suscripción:', subscription.id);
        this.showMenu = null;
        this.$emit('cancel-subscription', subscription);
      }
    },

    // ===============================
    // GESTIÓN DE DISPOSITIVOS
    // ===============================

    getDeviceIcon(type) {
      const icons = {
        'router': '📡',
        'antenna': '📶',
        'switch': '🔌',
        'access_point': '📡',
        'fiber_ont': '💡',
        'fiber_olt': '🔗',
        'cpe': '📻'
      };
      return icons[type] || '📱';
    },

    formatDeviceStatus(status) {
      const statusMap = {
        'online': 'En línea',
        'offline': 'Fuera de línea',
        'warning': 'Advertencia',
        'error': 'Error',
        'maintenance': 'Mantenimiento'
      };
      return statusMap[status] || status;
    },

    addDevice() {
      console.log('Agregar dispositivo al cliente:', this.client.id);
      this.$router.push(`/devices/new?clientId=${this.client.id}`);
    },

    accessDevice(device) {
      console.log('Acceder a dispositivo:', device);
      this.selectedDevice = device;
      this.showDeviceModal = true;
    },

    configureDevice(device) {
      console.log('Configurar dispositivo:', device);
      this.$router.push(`/devices/${device.id}/configure`);
    },

    closeDeviceModal() {
      this.showDeviceModal = false;
      this.selectedDevice = null;
    },

    onDeviceAccess(accessData) {
      console.log('Acceso a dispositivo concedido:', accessData);
      this.closeDeviceModal();
      // Abrir en nueva ventana o iframe según configuración
      if (accessData.webInterface) {
        window.open(accessData.webInterface, '_blank');
      }
    },

    // ===============================
    // SERVICIOS ADICIONALES
    // ===============================

    addAdditionalService() {
      console.log('Agregar servicio adicional');
      // Mostrar modal o dropdown con opciones
    },

    // Jellyfin
    activateJellyfin() {
      console.log('Activando Jellyfin para cliente:', this.client.id);
      // Llamar al servicio para crear invitación
      this.jellyfinStatus.active = true;
      this.jellyfinStatus.username = `${this.client.firstName.toLowerCase()}${this.client.lastName.toLowerCase()}`;
    },

    deactivateJellyfin() {
      if (confirm('¿Desactivar acceso a Jellyfin?')) {
        console.log('Desactivando Jellyfin');
        this.jellyfinStatus.active = false;
      }
    },

    manageJellyfin() {
      console.log('Gestionar Jellyfin');
      this.$router.push(`/jellyfin/users/${this.jellyfinStatus.username}`);
    },

    // Soporte Prioritario
    togglePrioritySupport() {
      this.prioritySupport = !this.prioritySupport;
      console.log('Soporte prioritario:', this.prioritySupport ? 'activado' : 'desactivado');
    },

    // IP Estática
    configureStaticIP() {
      console.log('Configurar IP estática');
      // Mostrar modal para configurar IP
      this.hasStaticIP = true;
      this.staticIPAddress = '192.168.1.100'; // Ejemplo
    },

    modifyStaticIP() {
      console.log('Modificar IP estática');
      // Mostrar modal para modificar IP
    },

    removeStaticIP() {
      if (confirm('¿Remover configuración de IP estática?')) {
        this.hasStaticIP = false;
        this.staticIPAddress = null;
      }
    }
  },

  mounted() {
    // Cargar estado de servicios adicionales
    this.loadAdditionalServices();
    
    // Cerrar menús al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.subscription-menu') && !e.target.closest('.action-btn.menu')) {
        this.showMenu = null;
      }
    });
  },

  /*methods: {
    ...this.methods,
    
    async loadAdditionalServices() {
      try {
        // Cargar estado de Jellyfin
        // const jellyfinResponse = await JellyfinService.getClientStatus(this.client.id);
        // this.jellyfinStatus = jellyfinResponse.data;
        
        // Cargar otros servicios adicionales
        // ...
        
        console.log('Servicios adicionales cargados');
      } catch (error) {
        console.error('Error cargando servicios adicionales:', error);
      }
    }
  }*/
};
</script>

<style scoped>
.servicios-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.servicios-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.3rem;
  font-weight: 600;
}

.card-content {
  padding: 24px;
}

/* ===============================
   BOTONES
   =============================== */

.add-btn, .add-first-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.add-btn:hover, .add-first-btn:hover {
  background: #45a049;
}

.add-first-btn {
  margin-top: 16px;
}

/* ===============================
   TARJETAS DE SUSCRIPCIÓN
   =============================== */

.subscriptions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.subscription-card {
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  transition: all 0.2s ease;
  position: relative;
}

.subscription-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.subscription-info h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1.2rem;
}

.subscription-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subscription-id {
  font-size: 0.85rem;
  color: #666;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.status-active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.status-suspended {
  background: #fff8e1;
  color: #f57f17;
}

.status-badge.status-cancelled {
  background: #ffebee;
  color: #c62828;
}

.subscription-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 1rem;
}

.action-btn.edit {
  background: #e3f2fd;
  color: #1565c0;
}

.action-btn.menu {
  background: #f5f5f5;
  color: #666;
}

.action-btn:hover {
  opacity: 0.8;
}

/* Detalles de suscripción */
.subscription-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-row.notes {
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.detail-label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.detail-value {
  color: #333;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-value.price {
  font-weight: 600;
  color: #4CAF50;
  font-size: 1rem;
}

.detail-value.ip-address {
  font-family: 'Courier New', monospace;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.ping-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.ping-btn:hover {
  background: rgba(0,0,0,0.1);
}

/* Menú contextual */
.subscription-menu {
  position: absolute;
  top: 60px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
  min-width: 150px;
}

.menu-item {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 0.9rem;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item.danger {
  color: #f44336;
}

.menu-item.danger:hover {
  background: #ffebee;
}

/* ===============================
   TARJETAS DE DISPOSITIVOS
   =============================== */

.devices-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.device-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  gap: 16px;
  transition: all 0.2s ease;
}

.device-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.device-image {
  flex-shrink: 0;
}

.device-photo {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
}

.device-placeholder {
  width: 60px;
  height: 60px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.device-info {
  flex: 1;
}

.device-info h5 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1rem;
}

.device-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.device-brand {
  font-size: 0.85rem;
  color: #666;
}

.device-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
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

.device-status.warning {
  background: #fff8e1;
  color: #f57f17;
}

.device-specs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.spec-label {
  color: #666;
  font-weight: 500;
}

.spec-value {
  color: #333;
}

.spec-value.mac {
  font-family: 'Courier New', monospace;
}

.device-location {
  font-size: 0.8rem;
  color: #666;
  margin-top: 8px;
}

.device-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-action-btn {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.device-action-btn.access {
  background: #e3f2fd;
  color: #1565c0;
}

.device-action-btn.config {
  background: #f3e5f5;
  color: #7b1fa2;
}

.device-action-btn.manage {
  background: #e8f5e9;
  color: #2e7d32;
}

.device-action-btn:hover {
  transform: scale(1.05);
}

/* ===============================
   SERVICIOS ADICIONALES
   =============================== */

.additional-service {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 16px;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.service-icon {
  font-size: 2rem;
  width: 50px;
  text-align: center;
}

.service-info {
  flex: 1;
}

.service-info h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 1.1rem;
}

.service-description {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.service-status {
  text-align: right;
}

.status-indicator {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-indicator.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-indicator.inactive {
  background: #f5f5f5;
  color: #666;
}

.service-details {
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.service-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.service-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.service-btn.activate {
  background: #4CAF50;
  color: white;
}

.service-btn.activate:hover {
  background: #45a049;
}

.service-btn.manage {
  background: #2196F3;
  color: white;
}

.service-btn.manage:hover {
  background: #1976D2;
}

.service-btn.deactivate {
  background: #f44336;
  color: white;
}

.service-btn.deactivate:hover {
  background: #d32f2f;
}

/* ===============================
   ESTADOS VACÍOS
   =============================== */

.no-subscriptions, .no-devices {
  text-align: center;
  padding: 40px 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0;
  color: #666;
  font-size: 1.2rem;
}

.empty-state p {
  margin: 0;
  color: #999;
  font-size: 0.95rem;
}

/* ===============================
   MODAL
   =============================== */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.device-modal {
  max-width: 600px;
  width: 90vw;
}

/* ===============================
   RESPONSIVE
   =============================== */

@media (max-width: 768px) {
  .servicios-tab {
    padding: 15px;
  }
  
  .card-header, .card-content {
    padding: 16px 20px;
  }
  
  .subscription-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .devices-list {
    grid-template-columns: 1fr;
  }
  
  .device-card {
    flex-direction: column;
    text-align: center;
  }
  
  .device-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .service-header {
    flex-direction: column;
    text-align: center;
  }
  
  .service-details {
    grid-template-columns: 1fr;
  }
}
</style>