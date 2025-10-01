<template>
  <div class="resumen-tab">
    <div class="resumen-grid">
      
      <!-- Informaci贸n Personal -->
      <div class="card info-personal">
        <div class="card-header">
          <h3>Informaci贸n Personal</h3>
          <button @click="toggleEdit('personal')" class="edit-btn">
            <span v-if="!editing.personal">鉁忥笍</span>
            <span v-else>馃捑</span>
          </button>
        </div>
        
        <div class="card-content">
          <div class="info-row">
            <label>Nombre Completo:</label>
            <div v-if="!editing.personal" class="info-value">
              {{ client.firstName }} {{ client.lastName }}
            </div>
            <div v-else class="edit-group">
              <input v-model="editData.firstName" placeholder="Nombre" />
              <input v-model="editData.lastName" placeholder="Apellidos" />
            </div>
          </div>
          
          <div class="info-row">
            <label>Email:</label>
            <div v-if="!editing.personal" class="info-value">
              {{ this.client.email || 'No especificado1' }}
              <a v-if="client.email" :href="'mailto:' + client.email" class="action-link">馃摟</a>
            </div>
            <input v-else v-model="editData.email" type="email" placeholder="correo@ejemplo.com" />
          </div>
          
          <div class="info-row">
            <label>Tel茅fono:</label>
            <div v-if="!editing.personal" class="info-value">
              {{ client.phone || 'No especificado' }}
              <a v-if="client.phone" :href="'tel:' + client.phone" class="action-link">馃摓</a>
            </div>
            <input v-else v-model="editData.phone" type="tel" placeholder="+52 123 456 7890" />
          </div>
          
          <div class="info-row">
            <label>WhatsApp:</label>
            <div v-if="!editing.personal" class="info-value">
              {{ client.whatsapp || 'No especificado' }}
              <a v-if="client.whatsapp" :href="'https://wa.me/' + formatWhatsApp(client.whatsapp)" target="_blank" class="action-link">馃挰</a>
            </div>
            <input v-else v-model="editData.whatsapp" type="tel" placeholder="+52 123 456 7890" />
          </div>

          <div class="info-row">
            <label>Fecha de Nacimiento:</label>
            <div v-if="!editing.personal" class="info-value">
              {{ formatDate(client.birthDate) || 'No especificada' }}
            </div>
            <input v-else v-model="editData.birthDate" type="date" />
          </div>

          <div v-if="editing.personal" class="edit-actions">
            <button @click="savePersonalInfo" class="save-btn">Guardar</button>
            <button @click="cancelEdit('personal')" class="cancel-btn">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Ubicaci贸n y Servicio -->
      <div class="card ubicacion-servicio">
        <div class="card-header">
          <h3>Ubicaci贸n y Servicio</h3>
          <button @click="toggleEdit('location')" class="edit-btn">
            <span v-if="!editing.location">鉁忥笍</span>
            <span v-else>馃捑</span>
          </button>
        </div>
        
        <div class="card-content">
          <div class="info-row">
            <label>Direcci贸n:</label>
            <div v-if="!editing.location" class="info-value">
              {{ client.address || 'No especificada' }}
            </div>
            <textarea v-else v-model="editData.address" placeholder="Direcci贸n completa" rows="2"></textarea>
          </div>

          <div class="info-row">
            <label>Zona:</label>
            <div class="info-value">
              {{ client.Zone?.name || 'No asignada' }}
            </div>
          </div>

          <div class="info-row">
            <label>Nodo:</label>
            <div class="info-value">
              {{ client.Node?.name || 'No asignado' }}
            </div>
          </div>

          <div class="info-row">
            <label>Sector:</label>
            <div class="info-value">
              {{ client.Sector?.name || 'No asignado' }}
            </div>
          </div>

          <div class="info-row">
            <label>Coordenadas:</label>
            <div v-if="!editing.location" class="info-value">
              <span v-if="client.latitude && client.longitude">
                {{ client.latitude }}, {{ client.longitude }}
                <button @click="showOnMap" class="action-link">???</button>
              </span>
              <span v-else>No especificadas</span>
            </div>
            <div v-else class="coordinate-inputs">
              <input v-model="editData.latitude" type="number" step="0.0000001" placeholder="Latitud" />
              <input v-model="editData.longitude" type="number" step="0.0000001" placeholder="Longitud" />
              <button @click="getCurrentLocation" class="location-btn">馃搷</button>
            </div>
          </div>

          <div v-if="editing.location" class="edit-actions">
            <button @click="saveLocationInfo" class="save-btn">Guardar</button>
            <button @click="cancelEdit('location')" class="cancel-btn">Cancelar</button>
          </div>
        </div>
      </div>

      <!-- Estado del Servicio -->
      <div class="card estado-servicio">
        <div class="card-header">
          <h3>Estado del Servicio</h3>
        </div>
        
        <div class="card-content">
          <div class="service-status">
            <div class="status-item">
              <span class="status-label">Cliente:</span>
              <span :class="['status-value', client.active ? 'active' : 'inactive']">
                {{ client.active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>

            <div v-if="primarySubscription" class="status-item">
              <span class="status-label">Servicio:</span>
              <span :class="['status-value', 'service-' + primarySubscription.status]">
                {{ formatSubscriptionStatus(primarySubscription.status) }}
              </span>
            </div>

            <div v-if="primarySubscription" class="status-item">
              <span class="status-label">Plan:</span>
              <span class="status-value">
                {{ primarySubscription.ServicePackage?.name || 'No definido' }}
              </span>
            </div>

            <div v-if="primarySubscription" class="status-item">
              <span class="status-label">IP Asignada:</span>
              <span class="status-value ip-address">
                {{ primarySubscription.assignedIpAddress || 'No asignada' }}
                <button v-if="primarySubscription.assignedIpAddress" @click="pingIP" class="action-link">馃彄</button>
              </span>
            </div>

            <div v-if="primarySubscription" class="status-item">
              <span class="status-label">Usuario PPPoE:</span>
              <span class="status-value">
                {{ primarySubscription.pppoeUsername || 'No configurado' }}
              </span>
            </div>

            <div v-if="primarySubscription" class="status-item">
              <span class="status-label">Velocidad:</span>
              <span class="status-value">
                鈫搟{ primarySubscription.ServicePackage?.downloadSpeedMbps || 0 }} Mbps / 
                鈫憑{ primarySubscription.ServicePackage?.uploadSpeedMbps || 0 }} Mbps
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Informaci贸n de Facturaci贸n -->
      <div class="card facturacion-info">
        <div class="card-header">
          <h3>Informaci贸n de Facturaci贸n</h3>
        </div>
        
        <div class="card-content">
          <div v-if="billingInfo" class="billing-details">
            <div class="info-row">
              <label>D铆a de Cobro:</label>
              <div class="info-value">{{ billingInfo.billingDay || 'No definido' }}</div>
            </div>

            <div class="info-row">
              <label>Cuota Mensual:</label>
              <div class="info-value price">
                ${{ billingInfo.monthlyFee || '0.00' }} MXN
              </div>
            </div>

            <div class="info-row">
              <label>脷ltimo Pago:</label>
              <div class="info-value">
                {{ formatDate(billingInfo.lastPaymentDate) || 'Sin pagos registrados' }}
              </div>
            </div>

            <div class="info-row">
              <label>Pr贸ximo Vencimiento:</label>
              <div :class="['info-value', getPaymentStatusClass(billingInfo.nextDueDate)]">
                {{ formatDate(billingInfo.nextDueDate) || 'No definido' }}
                <span v-if="getDaysUntilDue(billingInfo.nextDueDate)" class="days-info">
                  ({{ getDaysUntilDue(billingInfo.nextDueDate) }})
                </span>
              </div>
            </div>

            <div class="info-row">
              <label>M茅todo de Pago:</label>
              <div class="info-value">
                {{ formatPaymentMethod(billingInfo.paymentMethod) }}
              </div>
            </div>

            <div class="info-row">
              <label>D铆as de Gracia:</label>
              <div class="info-value">{{ billingInfo.graceDays || 0 }} d铆as</div>
            </div>
          </div>
          
          <div v-else class="no-billing-info">
            <p>No hay informaci贸n de facturaci贸n configurada</p>
          </div>
        </div>
      </div>

      <!-- Mapa (si hay coordenadas) -->
      <div v-if="client.latitude && client.longitude" class="card mapa-ubicacion">
        <div class="card-header">
          <h3>Ubicaci贸n en Mapa</h3>
          <button @click="openFullMap" class="view-full-btn">Ver Completo</button>
        </div>
        
        <div class="card-content">
          <div id="mini-map" class="mini-map"></div>
        </div>
      </div>

      <!-- Resumen de Actividad -->
      <div class="card actividad-reciente">
        <div class="card-header">
          <h3>Actividad Reciente</h3>
        </div>
        
        <div class="card-content">
          <div class="activity-list">
            <div class="activity-item">
              <span class="activity-icon">馃懁</span>
              <div class="activity-info">
                <div class="activity-text">Cliente registrado</div>
                <div class="activity-date">{{ formatDate(client.createdAt) }}</div>
              </div>
            </div>

            <div v-if="primarySubscription" class="activity-item">
              <span class="activity-icon">馃摗</span>
              <div class="activity-info">
                <div class="activity-text">Servicio activado</div>
                <div class="activity-date">{{ formatDate(primarySubscription.startDate) }}</div>
              </div>
            </div>

            <div v-if="billingInfo?.lastPaymentDate" class="activity-item">
              <span class="activity-icon">馃挵</span>
              <div class="activity-info">
                <div class="activity-text">脷ltimo pago registrado</div>
                <div class="activity-date">{{ formatDate(billingInfo.lastPaymentDate) }}</div>
              </div>
            </div>

            <div v-if="primarySubscription?.lastStatusChange" class="activity-item">
              <span class="activity-icon">馃攧</span>
              <div class="activity-info">
                <div class="activity-text">Cambio de estado</div>
                <div class="activity-date">{{ formatDate(primarySubscription.lastStatusChange) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'ResumenTab',
  props: {
    client: {
      type: Object,
      required: true
    },
    primarySubscription: {
      type: Object,
      default: null
    },
    billingInfo: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      editing: {
        personal: false,
        location: false
      },
      editData: {},
      map: null
    };
  },
  methods: {
    toggleEdit(section) {
      if (this.editing[section]) {
        this.saveChanges(section);
      } else {
        this.startEdit(section);
      }
    },

async saveChanges(section) {
  try {
    // Emitir evento genérico al componente padre
    this.$emit('update-client', section, this.editData);
    
    // Resetear el estado de edición
    this.editing[section] = false;
    this.editData = {};
    
    // Actualizar mapa si es sección de ubicación y hay coordenadas
    if (section === 'location' && this.editData.latitude && this.editData.longitude) {
      this.updateMap();
    }
  } catch (error) {
    console.error(`Error guardando ${section}:`, error);
    alert('Error guardando cambios');
  }
},

    startEdit(section) {
      this.editing[section] = true;
      
      // Copiar datos actuales para edici贸n
      if (section === 'personal') {
        this.editData = {
          firstName: this.client.firstName,
          lastName: this.client.lastName,
          email: this.client.email,
          phone: this.client.phone,
          whatsapp: this.client.whatsapp,
          birthDate: this.client.birthDate
        };
      } else if (section === 'location') {
        this.editData = {
          address: this.client.address,
          latitude: this.client.latitude,
          longitude: this.client.longitude
        };
      }
    },

    cancelEdit(section) {
      this.editing[section] = false;
      this.editData = {};
    },

    async savePersonalInfo() {
      try {
        // Emitir evento para actualizar en el componente padre
        this.$emit('update-client', 'personal', this.editData);
        this.editing.personal = false;
        this.editData = {};
      } catch (error) {
        console.error('Error guardando informaci贸n personal:', error);
        alert('Error guardando cambios');
      }
    },

    async saveLocationInfo() {
      try {
        this.$emit('update-client', 'location', this.editData);
        this.editing.location = false;
        this.editData = {};
        
        // Actualizar mapa si hay coordenadas nuevas
        if (this.editData.latitude && this.editData.longitude) {
          this.updateMap();
        }
      } catch (error) {
        console.error('Error guardando informaci贸n de ubicaci贸n:', error);
        alert('Error guardando cambios');
      }
    },

    async getCurrentLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.editData.latitude = position.coords.latitude;
            this.editData.longitude = position.coords.longitude;
          },
          (error) => {
            console.error('Error obteniendo ubicaci贸n:', error);
            alert('No se pudo obtener la ubicaci贸n actual');
          }
        );
      } else {
        alert('Geolocalizaci贸n no soportada en este navegador');
      }
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

    formatWhatsApp(number) {
      return number.replace(/\D/g, '');
    },

    formatSubscriptionStatus(status) {
      const statusMap = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'cancelled': 'Cancelado',
        'cutService': 'Corte de Servicio',
        'pending': 'Pendiente'
      };
      return statusMap[status] || status;
    },

    formatPaymentMethod(method) {
      const methodMap = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'check': 'Cheque'
      };
      return methodMap[method] || method;
    },

    getPaymentStatusClass(dueDate) {
      if (!dueDate) return '';
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'overdue';
      if (diffDays <= 3) return 'due-soon';
      return '';
    },

    getDaysUntilDue(dueDate) {
      if (!dueDate) return null;
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return `${Math.abs(diffDays)} d铆as vencido`;
      if (diffDays === 0) return 'Vence hoy';
      if (diffDays === 1) return 'Vence ma帽ana';
      return `${diffDays} d铆as`;
    },

    showOnMap() {
      this.initMiniMap();
    },

    openFullMap() {
      const lat = this.client.latitude;
      const lng = this.client.longitude;
      this.$router.push(`/network/map?client=${this.client.id}&lat=${lat}&lng=${lng}`);
    },

    pingIP() {
      if (this.primarySubscription?.assignedIpAddress) {
        this.$emit('ping-test', this.primarySubscription.assignedIpAddress);
      }
    },

    initMiniMap() {
      if (!this.client.latitude || !this.client.longitude) return;

      this.$nextTick(() => {
        const mapElement = document.getElementById('mini-map');
        if (!mapElement) return;

        // Usar OpenStreetMap con Leaflet
        if (typeof L !== 'undefined') {
          //this.map = L.map('mini-map').setView([this.client.latitude, this.client.longitude], 15);
          
          /*L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '漏 OpenStreetMap contributors'
          }).addTo(this.map);*/

          /*L.marker([this.client.latitude, this.client.longitude])
            .addTo(this.map)
            .bindPopup(`${this.client.firstName} ${this.client.lastName}`)
            .openPopup();*/
        } else {
          // Fallback usando Google Maps static
          mapElement.innerHTML = `
            <img src="https://maps.googleapis.com/maps/api/staticmap?center=${this.client.latitude},${this.client.longitude}&zoom=15&size=300x200&markers=${this.client.latitude},${this.client.longitude}&key=YOUR_GOOGLE_MAPS_KEY" 
                 alt="Mapa de ubicaci贸n" style="width: 100%; height: 100%; border-radius: 6px;" />
          `;
        }
      });
    },

    updateMap() {
      if (this.map && this.client.latitude && this.client.longitude) {
        this.map.setView([this.client.latitude, this.client.longitude], 15);
      }
    }
  },

  mounted() {
    if (this.client.latitude && this.client.longitude) {
      this.initMiniMap();
    }
  },

  watch: {
    client: {
      handler() {
        if (this.client.latitude && this.client.longitude && !this.map) {
          this.initMiniMap();
        }
      },
      deep: true
    }
  }
};
</script>



<style scoped>
.resumen-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.resumen-grid {
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}

.card-header {
  padding: 20px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  margin-bottom: 0;
  padding-bottom: 15px;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
}

.card-content {
  padding: 20px 24px 24px;
}

/* ===============================
   BOTONES DE EDICI脫N
   =============================== */

.edit-btn {
  background: #f0f0f0;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.edit-btn:hover {
  background: #e0e0e0;
  transform: scale(1.05);
}

.view-full-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.view-full-btn:hover {
  background: #5a67d8;
}

/* ===============================
   FILAS DE INFORMACI脫N
   =============================== */

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  min-height: 24px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row label {
  font-weight: 600;
  color: #555;
  min-width: 140px;
  margin-right: 16px;
  line-height: 1.4;
}

.info-value {
  flex: 1;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.4;
}

.info-value.price {
  font-weight: 600;
  color: #4CAF50;
  font-size: 1.1rem;
}

.info-value.ip-address {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

/* Estados de pago */
.info-value.overdue {
  color: #f44336;
  font-weight: 600;
}

.info-value.due-soon {
  color: #ff9800;
  font-weight: 600;
}

.days-info {
  font-size: 0.85rem;
  color: #666;
  font-weight: normal;
}

/* ===============================
   CAMPOS DE EDICI脫N
   =============================== */

.edit-group {
  display: flex;
  gap: 10px;
  flex: 1;
}

.edit-group input {
  flex: 1;
}

input, textarea {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
  width: 100%;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.coordinate-inputs {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.coordinate-inputs input {
  flex: 1;
  min-width: 0;
}

.location-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  flex-shrink: 0;
}

.location-btn:hover {
  background: #45a049;
}

/* ===============================
   ACCIONES DE EDICI脫N
   =============================== */

.edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.save-btn, .cancel-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.save-btn {
  background: #4CAF50;
  color: white;
}

.save-btn:hover {
  background: #45a049;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

/* ===============================
   ENLACES DE ACCI脫N
   =============================== */

.action-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  text-decoration: none;
}

.action-link:hover {
  background: rgba(0,0,0,0.1);
}

/* ===============================
   ESTADO DEL SERVICIO
   =============================== */

.service-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.status-label {
  font-weight: 600;
  color: #555;
}

.status-value {
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-value.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-value.inactive {
  background: #ffebee;
  color: #c62828;
}

.status-value.service-active {
  background: #e3f2fd;
  color: #1565c0;
}

.status-value.service-suspended {
  background: #fff8e1;
  color: #f57f17;
}

.status-value.service-cancelled {
  background: #fce4ec;
  color: #ad1457;
}

/* ===============================
   INFORMACI脫N DE FACTURACI脫N
   =============================== */

.billing-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.no-billing-info {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

/* ===============================
   MAPA
   =============================== */

.mapa-ubicacion {
  grid-column: span 1;
}

.mini-map {
  height: 200px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border: 1px solid #e0e0e0;
}

/* ===============================
   ACTIVIDAD RECIENTE
   =============================== */

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #667eea;
}

.activity-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.activity-info {
  flex: 1;
}

.activity-text {
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.activity-date {
  font-size: 0.85rem;
  color: #666;
}

/* ===============================
   RESPONSIVE
   =============================== */

@media (max-width: 768px) {
  .resumen-tab {
    padding: 15px;
  }
  
  .resumen-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .card-header, .card-content {
    padding: 15px 20px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .info-row label {
    min-width: auto;
    margin-right: 0;
    margin-bottom: 4px;
  }
  
  .edit-group {
    flex-direction: column;
    gap: 8px;
  }
  
  .coordinate-inputs {
    flex-direction: column;
    align-items: stretch;
  }
  
  .edit-actions {
    flex-direction: column;
  }
  
  .status-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .resumen-tab {
    padding: 10px;
  }
  
  .card-header, .card-content {
    padding: 12px 16px;
  }
  
  .card-header h3 {
    font-size: 1.1rem;
  }
}
</style>