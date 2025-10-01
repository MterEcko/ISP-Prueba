<template>
  <div class="client-form">
    <h2>{{ isEdit ? 'Editar Cliente' : 'Nuevo Cliente' }}</h2>
    
    <div @submit.prevent="submitForm">
      <!-- Información Personal -->
      <div class="form-section">
        <h3>Información Personal</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">Nombre *</label>
            <input 
              type="text"
              id="firstName"
              v-model="client.firstName"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="lastName">Apellidos *</label>
            <input 
              type="text"
              id="lastName"
              v-model="client.lastName"
              required
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email"
              id="email"
              v-model="client.email"
            />
          </div>
          
          <div class="form-group">
            <label for="phone">Teléfono</label>
            <input 
              type="tel"
              id="phone"
              v-model="client.phone"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="whatsapp">WhatsApp</label>
            <input 
              type="tel"
              id="whatsapp"
              v-model="client.whatsapp"
            />
          </div>
          
          <div class="form-group">
            <label for="birthDate">Fecha de Nacimiento</label>
            <input 
              type="date"
              id="birthDate"
              v-model="client.birthDate"
            />
          </div>
        </div>
      </div>
      
      <!-- Ubicación del Servicio -->
      <div class="form-section">
        <h3>Ubicación del Servicio</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="zoneId">Zona *</label>
            <select 
              id="zoneId"
              v-model.number="selectedZoneId"
              @change="onZoneChange"
              required
            >
              <option value="">Seleccionar Zona</option>
              <option v-for="zone in zones" :key="zone.id" :value="zone.id">
                {{ zone.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="nodeId">Nodo *</label>
            <select 
              id="nodeId"
              v-model.number="client.nodeId"
              @change="onNodeChange"
              :disabled="!selectedZoneId"
              required
            >
              <option value="">Seleccionar Nodo</option>
              <option v-for="node in filteredNodesCache" :key="node.id" :value="node.id">
                {{ node.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="sectorId">Sector</label>
            <select 
              id="sectorId"
              v-model.number="client.sectorId"
              :disabled="!client.nodeId"
            >
              <option value="">Sin sector específico</option>
              <option v-for="sector in filteredSectorsCache" :key="sector.id" :value="sector.id">
                {{ sector.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Información de ubicación -->
        <div class="location-info" v-if="selectedZone">
          <div class="zone-info">
            <h4>{{ selectedZone.name }}</h4>
            <p v-if="selectedZone.description">{{ selectedZone.description }}</p>
          </div>
        </div>
      </div>
      
      <!-- Dirección e Instalación - MEJORADO -->
      <div class="form-section location-section">
        <h3>📍 Dirección e Instalación</h3>
        
        <!-- Campo de dirección con búsqueda -->
        <div class="form-group full-width">
          <label for="address">Dirección de Instalación</label>
          <div class="address-input-group">
            <input 
              type="text"
              id="address"
              v-model="client.address"
              placeholder="Calle, número, colonia, ciudad..."
              class="address-input"
            />
            <button 
              type="button" 
              @click="searchAddressCoordinates"
              :disabled="loadingLocation || !client.address?.trim()"
              class="btn btn-search"
              :class="{ loading: loadingLocation }"
            >
              {{ loadingLocation ? '🔄' : '📍' }} Buscar
            </button>
          </div>
          <small class="help-text">
            Ingrese la dirección completa para obtener coordenadas automáticamente
          </small>
        </div>
        
        <!-- Sección de coordenadas GPS mejorada -->
        <div class="coordinates-section">
          <div class="coordinates-header">
            <h4>🛰️ Coordenadas GPS</h4>
            <div class="location-actions">
              <button 
                type="button" 
                @click="getCurrentLocation"
                :disabled="loadingLocation"
                class="btn btn-location"
                :class="{ loading: loadingLocation }"
              >
                {{ loadingLocation ? '🔄 Obteniendo...' : '📱 Mi Ubicación' }}
              </button>
              
              <button 
                type="button" 
                @click="openGoogleMaps"
                :disabled="!client.latitude && !client.address"
                class="btn btn-maps"
              >
                🗺️ Ver en Maps
              </button>
              
              <button 
                v-if="client.latitude || client.longitude"
                type="button" 
                @click="clearLocation"
                class="btn btn-clear"
              >
                🗑️ Limpiar
              </button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="latitude">Latitud</label>
              <input 
                type="number"
                id="latitude"
                v-model="client.latitude"
                step="0.0000001"
                placeholder="20.123456"
                :class="{ 'has-value': client.latitude }"
              />
            </div>
            
            <div class="form-group">
              <label for="longitude">Longitud</label>
              <input 
                type="number"
                id="longitude"
                v-model="client.longitude"
                step="0.0000001"
                placeholder="-103.123456"
                :class="{ 'has-value': client.longitude }"
              />
            </div>
          </div>
          
          <!-- Status de coordenadas -->
          <div v-if="client.latitude && client.longitude" class="coordinates-status success">
            ✅ Coordenadas establecidas: {{ client.latitude.toFixed(6) }}, {{ client.longitude.toFixed(6) }}
          </div>
        </div>
        
        <!-- Ayuda y consejos -->
        <div class="location-tips">
          <strong>💡 Consejos para una mejor ubicación:</strong>
          <ul>
            <li>Use "Mi Ubicación" si está en el sitio de instalación</li>
            <li>Ingrese la dirección completa para búsqueda automática</li>
            <li>Verifique la ubicación en Google Maps antes de guardar</li>
            <li>Las coordenadas precisas ayudan a los técnicos</li>
          </ul>
        </div>
      </div>
      
      <!-- Notas -->
      <div class="form-section">
        <h3>Notas y Observaciones</h3>
        
        <div class="form-group full-width">
          <label for="notes">Notas adicionales</label>
          <textarea 
            id="notes"
            v-model="client.notes"
            rows="4"
            placeholder="Información adicional sobre el cliente, referencias de ubicación, horarios de contacto..."
          ></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel" class="btn btn-secondary">
          Cancelar
        </button>
        <button type="button" @click="submitForm" class="btn btn-primary" :disabled="loading">
          <span v-if="loading" class="loading-spinner small"></span>
          {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar Cliente' : 'Crear Cliente') }}
        </button>
      </div>
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';
import NetworkService from '../services/network.service';

export default {
  name: 'ClientForm',
  data() {
    return {
      client: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        whatsapp: '',
        address: '',
        latitude: null,
        longitude: null,
        birthDate: '',
        nodeId: '',
        sectorId: '',
        active: true,
        notes: ''
      },
      selectedZoneId: '',
      zones: [],
      nodes: [],
      sectors: [],
      filteredNodesCache: [],
      filteredSectorsCache: [],
      isEdit: false,
      loading: false,
      loadingLocation: false, // Nuevo estado para operaciones de ubicación
      errorMessage: ''
    };
  },
  computed: {
    selectedZone() {
      return this.zones.find(zone => zone.id == this.selectedZoneId);
    },
    filteredNodes() {
      if (!this.selectedZoneId) return [];
      return this.nodes.filter(node => node.zoneId == this.selectedZoneId);
    },
    filteredSectors() {
      if (!this.client.nodeId) return [];
      return this.sectors.filter(sector => sector.nodeId == this.client.nodeId);
    }
  },
  created() {
    this.initializeForm();
  },
  methods: {
    async initializeForm() {
      await this.loadZones();
      await this.loadNodes();
      await this.loadSectors();
      
      const clientId = this.$route.params.id;
      if (clientId && clientId !== 'new') {
        this.isEdit = true;
        await this.loadClient(clientId);
      } else {
        const zoneId = this.$route.query.zoneId;
        if (zoneId) {
          this.selectedZoneId = parseInt(zoneId);
          this.onZoneChange();
        }
      }
    },

    async loadZones() {
      try {
        const response = await NetworkService.getAllZones({ active: true });
        this.zones = response.data;
      } catch (error) {
        console.error('Error cargando zonas:', error);
        this.errorMessage = 'Error cargando zonas disponibles.';
      }
    },

    async loadNodes() {
      try {
        const response = await NetworkService.getAllNodes({ active: true });
        this.nodes = response.data;
      } catch (error) {
        console.error('Error cargando nodos:', error);
        this.errorMessage = 'Error cargando nodos disponibles.';
      }
    },

    async loadSectors() {
      try {
        const response = await NetworkService.getAllSectors({ active: true });
        this.sectors = response.data;
      } catch (error) {
        console.error('Error cargando sectores:', error);
        this.errorMessage = 'Error cargando sectores disponibles.';
      }
    },

    async loadClient(id) {
      this.loading = true;
      try {
        const response = await ClientService.getClient(id);
        const client = response.data;
        
        if (client.birthDate) {
          client.birthDate = new Date(client.birthDate).toISOString().split('T')[0];
        }
        if (client.startDate) {
          client.startDate = new Date(client.startDate).toISOString().split('T')[0];
        }
        
        this.client = client;
        
        if (client.nodeId) {
          const node = this.nodes.find(n => n.id == client.nodeId);
          if (node) {
            this.selectedZoneId = node.zoneId;
            this.updateFilteredNodes();
            this.updateFilteredSectors();
          }
        }
      } catch (error) {
        console.error('Error cargando cliente:', error);
        this.errorMessage = 'Error cargando datos del cliente. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    // ================================
    // NUEVOS MÉTODOS DE GEOLOCALIZACIÓN
    // ================================

    getCurrentLocation() {
      this.loadingLocation = true;
      this.errorMessage = '';
      
      if (!navigator.geolocation) {
        this.errorMessage = 'La geolocalización no está disponible en este navegador.';
        this.loadingLocation = false;
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.client.latitude = position.coords.latitude;
          this.client.longitude = position.coords.longitude;
          this.loadingLocation = false;
          this.errorMessage = '';
          
          // Opcional: Mostrar mensaje de éxito
          this.$nextTick(() => {
            const msg = document.createElement('div');
            msg.className = 'success-message';
            msg.textContent = '✅ Ubicación obtenida exitosamente';
            msg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 4px; z-index: 1000;';
            document.body.appendChild(msg);
            setTimeout(() => document.body.removeChild(msg), 3000);
          });
        },
        (error) => {
          let message = 'Error obteniendo ubicación: ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message += 'Acceso denegado por el usuario.';
              break;
            case error.POSITION_UNAVAILABLE:
              message += 'Información de ubicación no disponible.';
              break;
            case error.TIMEOUT:
              message += 'Tiempo de espera agotado.';
              break;
            default:
              message += 'Error desconocido.';
              break;
          }
          this.errorMessage = message;
          this.loadingLocation = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutos
        }
      );
    },

    openGoogleMaps() {
      if (this.client.latitude && this.client.longitude) {
        const url = `https://www.google.com/maps/search/?api=1&query=${this.client.latitude},${this.client.longitude}`;
        window.open(url, '_blank');
      } else if (this.client.address?.trim()) {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.client.address)}`;
        window.open(url, '_blank');
      } else {
        this.errorMessage = 'Ingrese una dirección o coordenadas para abrir Google Maps.';
      }
    },

// En ClientForm.vue, reemplaza el método searchAddressCoordinates:

async searchAddressCoordinates() {
  if (!this.client.address?.trim()) {
    this.errorMessage = 'Ingrese una dirección para buscar coordenadas.';
    return;
  }

  this.loadingLocation = true;
  this.errorMessage = '';
  
  try {
    // Usar Nominatim (OpenStreetMap) - GRATIS
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.client.address)}&limit=1&countrycodes=mx`
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      this.client.latitude = parseFloat(result.lat);
      this.client.longitude = parseFloat(result.lon);
      
      // Opcional: actualizar con la dirección formateada
      if (result.display_name) {
        this.client.address = result.display_name;
      }
      
      this.errorMessage = '';
      
      // Mostrar mensaje de éxito
      this.$nextTick(() => {
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.textContent = '✅ Coordenadas encontradas automáticamente';
        msg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4CAF50; color: white; padding: 10px 20px; border-radius: 4px; z-index: 1000;';
        document.body.appendChild(msg);
        setTimeout(() => document.body.removeChild(msg), 3000);
      });
      
    } else {
      throw new Error('No se encontraron coordenadas para esta dirección');
    }
    
  } catch (error) {
    console.error('Error buscando coordenadas:', error);
    this.errorMessage = 'Error buscando coordenadas. Verifique la dirección e intente nuevamente.';
  } finally {
    this.loadingLocation = false;
  }
},
    clearLocation() {
      this.client.latitude = null;
      this.client.longitude = null;
      this.errorMessage = '';
    },

    // ================================
    // MÉTODOS EXISTENTES (sin cambios)
    // ================================

    onZoneChange() {
      this.client.nodeId = '';
      this.client.sectorId = '';
      this.errorMessage = '';
      this.updateFilteredNodes();
    },

    onNodeChange() {
      this.client.sectorId = '';
      this.errorMessage = '';
      this.updateFilteredSectors();
    },

    updateFilteredNodes() {
      if (!this.selectedZoneId) {
        this.filteredNodesCache = [];
        return;
      }
      this.filteredNodesCache = this.nodes.filter(node => node.zoneId === this.selectedZoneId);
      this.$forceUpdate();
    },

    updateFilteredSectors() {
      if (!this.client.nodeId) {
        this.filteredSectorsCache = [];
        return;
      }
      this.filteredSectorsCache = this.sectors.filter(sector => sector.nodeId === this.client.nodeId);
      this.$forceUpdate();
    },

    validateForm() {
      if (!this.client.firstName?.trim()) {
        throw new Error('El nombre es obligatorio.');
      }
      if (!this.client.lastName?.trim()) {
        throw new Error('Los apellidos son obligatorios.');
      }
      if (!this.selectedZoneId) {
        throw new Error('Debe seleccionar una zona.');
      }
      if (!this.client.nodeId) {
        throw new Error('Debe seleccionar un nodo.');
      }
      
      if (this.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.client.email)) {
        throw new Error('El formato del email no es válido.');
      }
    },

    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        this.validateForm();

        const clientData = {
          ...this.client,
          zoneId: this.selectedZoneId, // ✅ Incluir zoneId
          sectorId: this.client.sectorId || null,
          latitude: this.client.latitude || null,
          longitude: this.client.longitude || null,
          email: this.client.email?.trim() || null,
          phone: this.client.phone?.trim() || null,
          whatsapp: this.client.whatsapp?.trim() || null,
          address: this.client.address?.trim() || null,
          notes: this.client.notes?.trim() || null
        };

        if (this.isEdit) {
          await ClientService.updateClient(this.client.id, clientData);
        } else {
          await ClientService.createClient(clientData);
        }
        
        const returnTo = this.$route.query.returnTo;
        if (returnTo === 'zone' && this.selectedZoneId) {
          this.$router.push(`/zones/${this.selectedZoneId}`);
        } else {
          this.$router.push('/clients');
        }
      } catch (error) {
        console.error('Error guardando cliente:', error);
        this.errorMessage = error.message || 'Error guardando datos del cliente. Por favor, verifique los campos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    cancel() {
      const returnTo = this.$route.query.returnTo;
      if (returnTo === 'zone' && this.selectedZoneId) {
        this.$router.push(`/zones/${this.selectedZoneId}`);
      } else {
        this.$router.push('/clients');
      }
    }
  }
};
</script>

<style scoped>
.client-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.form-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #555;
  font-size: 1.2em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.3s;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

input.has-value {
  background-color: #e8f5e9;
  border-color: #4CAF50;
}

textarea {
  resize: vertical;
}

/* ================================ */
/* NUEVOS ESTILOS PARA UBICACIÓN */
/* ================================ */

.location-section {
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  border: 1px solid #b3d9ff;
}

.address-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.address-input {
  flex: 1;
}

.coordinates-section {
  margin-top: 16px;
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  border: 1px solid #e1f5fe;
}

.coordinates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.coordinates-header h4 {
  margin: 0;
  color: #0277bd;
  font-size: 1.1em;
}

.location-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.coordinates-status {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.9em;
}

.coordinates-status.success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.location-tips {
  margin-top: 16px;
  padding: 12px;
  background-color: #fff3e0;
  border-radius: 4px;
  border: 1px solid #ffcc02;
  font-size: 0.9em;
  color: #e65100;
}

.location-tips ul {
  margin: 4px 0;
  padding-left: 20px;
}

.location-tips li {
  margin-bottom: 4px;
}

.help-text {
  color: #666;
  font-size: 0.9em;
  margin-top: 4px;
  display: block;
}

/* Botones */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-search {
  background-color: #4CAF50;
  color: white;
}

.btn-location {
  background-color: #2196F3;
  color: white;
}

.btn-maps {
  background-color: #FF5722;
  color: white;
}

.btn-clear {
  background-color: #9E9E9E;
  color: white;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
}

.btn.loading {
  position: relative;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.error-message {
  color: #f44336;
  margin-top: 16px;
  padding: 12px;
  background-color: #ffebee;
  border-radius: 4px;
  border: 1px solid #f44336;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.zone-info {
  margin-top: 12px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.zone-info h4 {
  margin: 0 0 4px 0;
  color: #0277bd;
}

.zone-info p {
  margin: 0;
  color: #666;
  font-size: 0.9em;
}

/* Responsive */
@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .coordinates-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .location-actions {
    justify-content: space-between;
  }
  
  .address-input-group {
    flex-direction: column;
  }
}
</style>