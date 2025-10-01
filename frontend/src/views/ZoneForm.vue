<template>
  <div class="zone-form">
    <div class="form-header">
      <div class="header-content">
        <button class="back-btn" @click="goBack">
          <span class="icon">←</span>
        </button>
        <div class="header-info">
          <h1>{{ isEdit ? 'Editar Zona' : 'Nueva Zona' }}</h1>
          <p>{{ isEdit ? 'Modifique los datos de la zona' : 'Configure una nueva zona de cobertura' }}</p>
        </div>
      </div>
    </div>

    <div class="form-container">
      <form @submit.prevent="submitForm" class="zone-form-content">
        
        <!-- Información Básica -->
        <div class="form-section">
          <div class="section-header">
            <h2>Información Básica</h2>
            <span class="section-icon">📋</span>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label for="name" class="required">Nombre de la Zona</label>
              <input
                id="name"
                type="text"
                v-model="form.name"
                :class="{ 'error': errors.name }"
                placeholder="Ej: Los Ruiseñores, Centro, Las Acacias"
                required
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
            
            <div class="form-group full-width">
              <label for="description">Descripción</label>
              <textarea
                id="description"
                v-model="form.description"
                :class="{ 'error': errors.description }"
                placeholder="Descripción detallada de la zona de cobertura..."
                rows="3"
              ></textarea>
              <span v-if="errors.description" class="error-message">{{ errors.description }}</span>
            </div>
          </div>
        </div>

        <!-- Ubicación Geográfica -->
        <div class="form-section">
          <div class="section-header">
            <h2>Ubicación Geográfica</h2>
            <span class="section-icon">📍</span>
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label for="latitude">Latitud</label>
              <input
                id="latitude"
                type="number"
                v-model="form.latitude"
                :class="{ 'error': errors.latitude }"
                placeholder="20.6597"
                step="0.0000001"
                min="-90"
                max="90"
              />
              <span v-if="errors.latitude" class="error-message">{{ errors.latitude }}</span>
            </div>
            
            <div class="form-group">
              <label for="longitude">Longitud</label>
              <input
                id="longitude"
                type="number"
                v-model="form.longitude"
                :class="{ 'error': errors.longitude }"
                placeholder="-103.3496"
                step="0.0000001"
                min="-180"
                max="180"
              />
              <span v-if="errors.longitude" class="error-message">{{ errors.longitude }}</span>
            </div>
          </div>
          
          <div class="location-actions">
            <button type="button" class="btn btn-secondary" @click="getCurrentLocation">
              <span class="icon">📍</span>
              Obtener Ubicación Actual
            </button>
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="showMap = !showMap"
              v-if="form.latitude && form.longitude"
            >
              <span class="icon">🗺️</span>
              {{ showMap ? 'Ocultar Mapa' : 'Ver en Mapa' }}
            </button>
          </div>
          
          <!-- Mapa Simple -->
          <div v-if="showMap && form.latitude && form.longitude" class="map-container">
            <div class="map-placeholder">
              <div class="map-info">
                <span class="map-icon">📍</span>
                <div class="coordinates">
                  <p><strong>Coordenadas:</strong></p>
                  <p>Lat: {{ form.latitude }}</p>
                  <p>Lng: {{ form.longitude }}</p>
                </div>
              </div>
              <a 
                :href="`https://www.google.com/maps?q=${form.latitude},${form.longitude}`" 
                target="_blank"
                class="btn btn-primary btn-small"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>

        <!-- Estado y Configuración -->
        <div class="form-section">
          <div class="section-header">
            <h2>Estado y Configuración</h2>
            <span class="section-icon">⚙️</span>
          </div>
          
          <div class="form-group">
            <div class="checkbox-group">
              <input
                id="active"
                type="checkbox"
                v-model="form.active"
                class="checkbox-input"
              />
              <label for="active" class="checkbox-label">
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                  <strong>Zona Activa</strong>
                  <span class="checkbox-description">La zona estará disponible para asignar nodos y sectores</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- Información Adicional (solo en edición) -->
        <div v-if="isEdit && zoneData" class="form-section">
          <div class="section-header">
            <h2>Información del Sistema</h2>
            <span class="section-icon">ℹ️</span>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Fecha de Creación:</span>
              <span class="info-value">{{ formatDate(zoneData.createdAt) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Última Actualización:</span>
              <span class="info-value">{{ formatDate(zoneData.updatedAt) }}</span>
            </div>
<!--            <div class="info-item">
              <span class="info-label">Nodos Asociados:</span>
              <span class="info-value">{{ zoneData.nodes_count || 0 }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Total Sectores:</span>
              <span class="info-value">{{ zoneData.sectors_count || 0 }}</span>
            </div> -->
          </div>
        </div>

        <!-- Acciones del Formulario -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="goBack">
            <span class="icon">✕</span>
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="icon loading-spinner">⟳</span>
            <span v-else class="icon">{{ isEdit ? '💾' : '➕' }}</span>
            {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar Zona' : 'Crear Zona') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Error General -->
    <div v-if="generalError" class="error-banner">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <div class="error-text">
          <strong>Error al guardar</strong>
          <p>{{ generalError }}</p>
        </div>
        <button class="error-close" @click="generalError = null">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
import NetworkService from '@/services/network.service';

export default {
  name: 'ZoneForm',
  data() {
    return {
      form: {
        name: '',
        description: '',
        latitude: null,
        longitude: null,
        active: true
      },
      
      errors: {},
      loading: false,
      generalError: null,
      showMap: false,
      zoneData: null,
      nodes: [], // [NODOS] Almacena nodos para calcular sectores
      
      // Estadísticas calculadas
      totalSectors: 0,
      totalClients: 0,
      totalDevices: 0
    };
  },
  
  calculateStats() {
      this.totalSectors = this.nodes.reduce((sum, node) => sum + (node.sectors_count || 0), 0);
      this.totalClients = this.nodes.reduce((sum, node) => sum + (node.clients_count || 0), 0);
      this.totalDevices = this.nodes.reduce((sum, node) => sum + (node.devices_count || 0), 0);
  },
  
  computed: {
    isEdit() {
      return this.$route.params.id && this.$route.params.id !== 'new';
    },
    
    zoneId() {
      return this.$route.params.id;
    }
  },
  
  async created() {
    if (this.isEdit) {
      await this.loadZone();
    }
  },
  
  methods: {
    async loadZone() {
      this.loading = true;
      try {
        const response = await NetworkService.getZone(this.zoneId);
        
        if (response && response.data) {
          this.zoneData = response.data;
          
          // Llenar el formulario con los datos existentes
          this.form = {
            name: this.zoneData.name || '',
            description: this.zoneData.description || '',
            latitude: this.zoneData.latitude || null,
            longitude: this.zoneData.longitude || null,
            active: this.zoneData.active !== false
          };
        }
      } catch (error) {
        console.error('Error al cargar zona:', error);
        this.generalError = 'No se pudo cargar la información de la zona. Intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    validateForm() {
      this.errors = {};
      
      // Validar nombre (requerido)
      if (!this.form.name || this.form.name.trim().length === 0) {
        this.errors.name = 'El nombre de la zona es requerido';
      } else if (this.form.name.trim().length < 3) {
        this.errors.name = 'El nombre debe tener al menos 3 caracteres';
      } else if (this.form.name.trim().length > 100) {
        this.errors.name = 'El nombre no puede exceder 100 caracteres';
      }
      
      // Validar descripción (opcional pero con límite)
      if (this.form.description && this.form.description.length > 500) {
        this.errors.description = 'La descripción no puede exceder 500 caracteres';
      }
      
      // Validar coordenadas (opcionales pero deben ser válidas si se proporcionan)
      if (this.form.latitude !== null && this.form.latitude !== '') {
        const lat = parseFloat(this.form.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          this.errors.latitude = 'La latitud debe estar entre -90 y 90';
        }
      }
      
      if (this.form.longitude !== null && this.form.longitude !== '') {
        const lng = parseFloat(this.form.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          this.errors.longitude = 'La longitud debe estar entre -180 y 180';
        }
      }
      
      return Object.keys(this.errors).length === 0;
    },
    
    async submitForm() {
      this.generalError = null;
      
      // Validar formulario
      if (!this.validateForm()) {
        return;
      }
      
      this.loading = true;
      
      try {
        // Preparar datos para enviar
        const submitData = {
          name: this.form.name.trim(),
          description: this.form.description?.trim() || null,
          latitude: this.form.latitude ? parseFloat(this.form.latitude) : null,
          longitude: this.form.longitude ? parseFloat(this.form.longitude) : null,
          active: this.form.active
        };
        
        let response;
        if (this.isEdit) {
          response = await NetworkService.updateZone(this.zoneId, submitData);
        } else {
          response = await NetworkService.createZone(submitData);
        }
        
        if (response && response.data) {
          // Redirigir al detalle de la zona o a la lista
          const zoneId = this.isEdit ? this.zoneId : response.data.id;
          this.$router.push(`/zones/${zoneId}`);
        }
        
      } catch (error) {
        console.error('Error al guardar zona:', error);
        
        // Manejar errores específicos del servidor
        if (error.response && error.response.data) {
          const errorData = error.response.data;
          
          // Si hay errores de validación específicos por campo
          if (errorData.errors) {
            this.errors = errorData.errors;
          } else {
            this.generalError = errorData.message || 'Error al guardar la zona';
          }
        } else {
          this.generalError = 'Error de conexión. Verifique su conexión a internet e intente nuevamente.';
        }
      } finally {
        this.loading = false;
      }
    },
    
    getCurrentLocation() {
      if (!navigator.geolocation) {
        this.generalError = 'La geolocalización no está disponible en este navegador';
        return;
      }
      
      this.loading = true;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.form.latitude = position.coords.latitude;
          this.form.longitude = position.coords.longitude;
          this.loading = false;
        },
        (error) => {
          console.error('Error al obtener ubicación:', error);
          this.generalError = 'No se pudo obtener la ubicación actual. Verifique los permisos de ubicación.';
          this.loading = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    },
    
    goBack() {
      // Si estamos editando, ir al detalle de la zona
      if (this.isEdit) {
        this.$router.push(`/zones/${this.zoneId}`);
      } else {
        // Si estamos creando, ir a la lista de red
        this.$router.push('/network');
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '-';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return '-';
      }
    }
  }
};
</script>

<style scoped>
.zone-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* Header */
.form-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  background: #f8f9fa;
  border-color: #3498db;
}

.back-btn .icon {
  font-size: 1.2rem;
  color: #3498db;
}

.header-info h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
  font-weight: 600;
}

.header-info p {
  margin: 4px 0 0;
  color: #7f8c8d;
  font-size: 1rem;
}

/* Contenedor del formulario */
.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.zone-form-content {
  padding: 32px;
}

/* Secciones del formulario */
.form-section {
  margin-bottom: 40px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f3f4;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
  font-weight: 600;
}

.section-icon {
  font-size: 1.5rem;
  opacity: 0.7;
}

/* Grid del formulario */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

/* Labels */
label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
}

label.required::after {
  content: ' *';
  color: #e74c3c;
}

/* Inputs */
input, textarea, select {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

input.error, textarea.error {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

/* Mensajes de error */
.error-message {
  color: #e74c3c;
  font-size: 0.85rem;
  margin-top: 4px;
}

/* Checkbox personalizado */
.checkbox-group {
  margin-top: 8px;
}

.checkbox-input {
  display: none;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.2s;
}

.checkbox-label:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.checkbox-input:checked + .checkbox-label {
  border-color: #3498db;
  background: #e3f2fd;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #bdc3c7;
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s;
}

.checkbox-input:checked + .checkbox-label .checkbox-custom {
  background: #3498db;
  border-color: #3498db;
}

.checkbox-input:checked + .checkbox-label .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
}

.checkbox-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.checkbox-description {
  color: #7f8c8d;
  font-size: 0.85rem;
  font-weight: normal;
}

/* Acciones de ubicación */
.location-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* Mapa */
.map-container {
  margin-top: 24px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
}

.map-placeholder {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 24px;
  text-align: center;
  position: relative;
}

.map-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.map-icon {
  font-size: 2rem;
}

.coordinates {
  text-align: left;
}

.coordinates p {
  margin: 0;
  font-size: 0.9rem;
}

/* Información del sistema */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.info-label {
  display: block;
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 4px;
  font-weight: 600;
}

.info-value {
  font-size: 0.95rem;
  color: #2c3e50;
  font-weight: 500;
}

/* Acciones del formulario */
.form-actions {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 2px solid #f1f3f4;
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

/* Botones */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-small {
  padding: 8px 16px;
  font-size: 0.85rem;
}

/* Spinner de carga */
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Error banner */
.error-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

.error-content {
  background: #ffebee;
  border: 1px solid #ffcdd2;
  border-left: 4px solid #e74c3c;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 1.25rem;
  color: #e74c3c;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
}

.error-text strong {
  color: #c62828;
  display: block;
  margin-bottom: 4px;
}

.error-text p {
  color: #c62828;
  margin: 0;
  font-size: 0.9rem;
}

.error-close {
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .zone-form {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .header-info h1 {
    font-size: 1.5rem;
  }
  
  .zone-form-content {
    padding: 24px 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .location-actions {
    flex-direction: column;
  }
  
  .map-info {
    flex-direction: column;
    gap: 12px;
  }
  
  .coordinates {
    text-align: center;
  }
}
</style>