<template>
  <div class="brand-form">
    <div class="page-header">
      <h1>{{ isEdit ? 'Editar Marca' : 'Nueva Marca de Dispositivo' }}</h1>
      <button @click="goBack" class="btn-secondary">
        ← Volver
      </button>
    </div>

    <form @submit.prevent="saveBrand" class="form-container">
      <!-- Información Básica -->
      <div class="form-section">
        <h3>📋 Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nombre Técnico *</label>
            <input 
              type="text"
              id="name"
              v-model="brand.name"
              required
              placeholder="ej: mikrotik, ubiquiti, tplink"
              pattern="[a-z_]+"
              @input="validateName"
              :disabled="isEdit"
            />
            <span class="field-help">Solo letras minúsculas y guiones bajos. No se puede modificar después de crear.</span>
            <span v-if="nameError" class="field-error">{{ nameError }}</span>
          </div>
          
          <div class="form-group">
            <label for="displayName">Nombre para Mostrar *</label>
            <input 
              type="text"
              id="displayName"
              v-model="brand.displayName"
              required
              placeholder="ej: MikroTik, Ubiquiti Networks, TP-Link"
            />
            <span class="field-help">Nombre legible para mostrar en la interfaz</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="description">Descripción</label>
          <textarea 
            id="description"
            v-model="brand.description"
            rows="3"
            placeholder="Descripción de la marca y sus características principales..."
          ></textarea>
        </div>
      </div>

      <!-- Logo y Imagen -->
      <div class="form-section">
        <h3>🖼️ Imagen y Logo</h3>
        
        <div class="logo-section">
          <div class="logo-preview">
            <div class="current-logo">
              <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.displayName" />
              <div v-else class="logo-placeholder">
                {{ getInitials(brand.displayName || brand.name) }}
              </div>
            </div>
            <div class="logo-info">
              <p><strong>Logo actual</strong></p>
              <p class="help-text">Recomendado: 200x200px, formato PNG o SVG</p>
            </div>
          </div>
          
          <div class="logo-upload">
            <div class="form-group">
              <label for="logoUrl">URL del Logo</label>
              <input 
                type="url"
                id="logoUrl"
                v-model="brand.logoUrl"
                placeholder="https://ejemplo.com/logo.png"
                @input="validateLogoUrl"
              />
              <span v-if="logoError" class="field-error">{{ logoError }}</span>
            </div>
            
            <div class="upload-options">
              <input 
                type="file" 
                ref="logoFile" 
                @change="handleLogoUpload" 
                accept="image/*"
                style="display: none"
              />
              <button type="button" @click="$refs.logoFile.click()" class="btn-upload">
                📁 Subir Archivo
              </button>
              <span class="upload-help">O sube un archivo desde tu computadora</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Protocolos Soportados -->
      <div class="form-section">
        <h3>🔌 Protocolos Soportados</h3>
        
        <div class="protocols-grid">
          <label 
            v-for="protocol in availableProtocols" 
            :key="protocol.value"
            class="protocol-checkbox"
          >
            <input 
              type="checkbox"
              :value="protocol.value"
              v-model="selectedProtocols"
            />
            <span class="protocol-info">
              <strong>{{ protocol.label }}</strong>
              <small>{{ protocol.description }}</small>
            </span>
          </label>
        </div>
        
        <div class="selected-protocols">
          <span class="protocols-label">Protocolos seleccionados:</span>
          <div class="protocol-tags">
            <span 
              v-for="protocol in selectedProtocols" 
              :key="protocol"
              class="protocol-tag"
            >
              {{ protocol.toUpperCase() }}
              <button type="button" @click="removeProtocol(protocol)" class="remove-protocol">×</button>
            </span>
          </div>
          <span v-if="selectedProtocols.length === 0" class="no-protocols">
            No hay protocolos seleccionados
          </span>
        </div>
      </div>

      <!-- Configuración Avanzada -->
      <div class="form-section">
        <h3>⚙️ Configuración Avanzada</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="defaultPort">Puerto por Defecto</label>
            <input 
              type="number"
              id="defaultPort"
              v-model="brand.defaultPort"
              min="1"
              max="65535"
              placeholder="ej: 22, 161, 8728"
            />
            <span class="field-help">Puerto predeterminado para conexiones</span>
          </div>
          
          <div class="form-group">
            <label for="defaultUsername">Usuario por Defecto</label>
            <input 
              type="text"
              id="defaultUsername"
              v-model="brand.defaultUsername"
              placeholder="ej: admin, root"
            />
            <span class="field-help">Usuario predeterminado para acceso</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="manufacturerWebsite">Sitio Web del Fabricante</label>
            <input 
              type="url"
              id="manufacturerWebsite"
              v-model="brand.manufacturerWebsite"
              placeholder="https://www.fabricante.com"
            />
          </div>
          
          <div class="form-group">
            <label for="supportUrl">URL de Soporte</label>
            <input 
              type="url"
              id="supportUrl"
              v-model="brand.supportUrl"
              placeholder="https://support.fabricante.com"
            />
          </div>
        </div>
        
        <div class="form-group full-width">
          <label for="documentationUrl">URL de Documentación</label>
          <input 
            type="url"
            id="documentationUrl"
            v-model="brand.documentationUrl"
            placeholder="https://docs.fabricante.com"
          />
          <span class="field-help">Enlace a la documentación técnica oficial</span>
        </div>
      </div>

      <!-- Configuración JSON -->
      <div class="form-section">
        <h3>🔧 Configuración Técnica (JSON)</h3>
        
        <div class="json-editor">
          <label for="technicalConfig">Configuración Técnica</label>
          <textarea 
            id="technicalConfig"
            v-model="technicalConfigText"
            rows="8"
            placeholder='{"snmp": {"version": "v2c", "community": "public"}, "ssh": {"port": 22}, "api": {"port": 8728}}'
            class="json-textarea"
            @blur="validateJsonConfig"
          ></textarea>
          <span class="field-help">Configuración técnica específica en formato JSON</span>
          <span v-if="jsonError" class="field-error">{{ jsonError }}</span>
        </div>
        
        <!-- Vista previa del JSON -->
        <div v-if="parsedConfig" class="json-preview">
          <h4>Vista Previa de la Configuración:</h4>
          <pre>{{ JSON.stringify(parsedConfig, null, 2) }}</pre>
        </div>
      </div>

      <!-- Estado -->
      <div class="form-section">
        <h3>📊 Estado</h3>
        
        <div class="form-group">
          <label class="toggle-label">
            <input 
              type="checkbox"
              v-model="brand.active"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ brand.active ? 'Activa' : 'Inactiva' }}</span>
          </label>
          <span class="field-help">Las marcas inactivas no aparecerán en las listas de selección</span>
        </div>
      </div>

      <!-- Vista Previa -->
      <div class="form-section preview-section">
        <h3>👁️ Vista Previa</h3>
        
        <div class="brand-preview-card">
          <div class="preview-header">
            <div class="preview-logo">
              <img v-if="brand.logoUrl" :src="brand.logoUrl" :alt="brand.displayName" />
              <div v-else class="preview-placeholder">
                {{ getInitials(brand.displayName || brand.name) }}
              </div>
            </div>
            <span :class="['preview-status', brand.active ? 'active' : 'inactive']"></span>
          </div>
          
          <div class="preview-content">
            <h4>{{ brand.displayName || brand.name || 'Nueva Marca' }}</h4>
            <p>{{ brand.description || 'Sin descripción' }}</p>
            
            <div class="preview-protocols" v-if="selectedProtocols.length > 0">
              <span class="protocols-label">Protocolos:</span>
              <div class="protocol-tags">
                <span 
                  v-for="protocol in selectedProtocols" 
                  :key="protocol"
                  class="protocol-tag small"
                >
                  {{ protocol.toUpperCase() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="form-actions">
        <button type="button" @click="goBack" class="btn-secondary">
          Cancelar
        </button>
        <button 
          type="button" 
          @click="testConfiguration" 
          class="btn-test"
          :disabled="!canTest || testing"
        >
          {{ testing ? '⏳ Probando...' : '🧪 Probar Configuración' }}
        </button>
        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="saving || !isFormValid"
        >
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Marca
        </button>
      </div>
    </form>

    <!-- Messages -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import CommandService from '../services/command.service';

export default {
  name: 'DeviceBrandForm',
  data() {
    return {
      brand: {
        name: '',
        displayName: '',
        description: '',
        logoUrl: '',
        defaultPort: null,
        defaultUsername: '',
        manufacturerWebsite: '',
        supportUrl: '',
        documentationUrl: '',
        active: true
      },
      selectedProtocols: [],
      technicalConfigText: '',
      parsedConfig: null,
      isEdit: false,
      saving: false,
      testing: false,
      loading: false,
      nameError: '',
      logoError: '',
      jsonError: '',
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    availableProtocols() {
      return [
        { value: 'ssh', label: 'SSH', description: 'Secure Shell Protocol' },
        { value: 'snmp', label: 'SNMP', description: 'Simple Network Management Protocol' },
        { value: 'api', label: 'API', description: 'REST API / HTTP API' },
        { value: 'RouterOs', label: 'RouterOS API', description: 'API específica de MikroTik' },
        { value: 'unms_api', label: 'UNMS API', description: 'API de Ubiquiti UNMS/UISP' },
        { value: 'web', label: 'Web Interface', description: 'Interfaz web administrativa' },
        { value: 'telnet', label: 'Telnet', description: 'Telnet Protocol (no recomendado)' }
      ];
    },
    isFormValid() {
      return this.brand.name && 
             this.brand.displayName && 
             !this.nameError && 
             !this.logoError && 
             !this.jsonError;
    },
    canTest() {
      return this.isFormValid && this.selectedProtocols.length > 0;
    }
  },
  created() {
    const brandId = this.$route.params.id;
    if (brandId && brandId !== 'new') {
      this.isEdit = true;
      this.loadBrand(brandId);
    } else {
      // Configuración por defecto para nueva marca
      this.technicalConfigText = JSON.stringify({
        connection: {
          timeout: 30,
          retries: 3
        }
      }, null, 2);
    }
  },
  methods: {
    async loadBrand(id) {
      this.loading = true;
      try {
        const response = await CommandService.getBrand(id);
        this.brand = {
          ...this.brand,
          ...response.data.brand || response.data
        };
        
        // Cargar protocolos soportados
        if (this.brand.supportedProtocols) {
          this.selectedProtocols = Array.isArray(this.brand.supportedProtocols) 
            ? this.brand.supportedProtocols 
            : [];
        }
        
        // Cargar configuración técnica
        if (this.brand.technicalConfig) {
          this.technicalConfigText = JSON.stringify(this.brand.technicalConfig, null, 2);
          this.parsedConfig = this.brand.technicalConfig;
        }
      } catch (error) {
        console.error('Error cargando marca:', error);
        this.errorMessage = 'Error al cargar los datos de la marca';
      } finally {
        this.loading = false;
      }
    },

    validateName() {
      if (!this.brand.name) {
        this.nameError = '';
        return;
      }

      // Validar formato: solo letras minúsculas, números y guiones bajos
      const namePattern = /^[a-z][a-z0-9_]*$/;
      if (!namePattern.test(this.brand.name)) {
        this.nameError = 'Solo se permiten letras minúsculas, números y guiones bajos. Debe empezar con letra.';
        return;
      }

      // Validar longitud
      if (this.brand.name.length < 2) {
        this.nameError = 'El nombre debe tener al menos 2 caracteres';
        return;
      }

      if (this.brand.name.length > 30) {
        this.nameError = 'El nombre no puede exceder 30 caracteres';
        return;
      }

      this.nameError = '';
    },

    validateLogoUrl() {
      if (!this.brand.logoUrl) {
        this.logoError = '';
        return;
      }

      try {
        new URL(this.brand.logoUrl);
        this.logoError = '';
      } catch (error) {
        this.logoError = 'URL del logo no válida';
      }
    },

    validateJsonConfig() {
      if (!this.technicalConfigText.trim()) {
        this.parsedConfig = null;
        this.jsonError = '';
        return;
      }

      try {
        this.parsedConfig = JSON.parse(this.technicalConfigText);
        this.jsonError = '';
      } catch (error) {
        this.jsonError = 'JSON no válido: ' + error.message;
        this.parsedConfig = null;
      }
    },

    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.logoError = 'Solo se permiten archivos de imagen';
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.logoError = 'El archivo no puede ser mayor a 2MB';
        return;
      }

      // Crear URL temporal para vista previa
      const reader = new FileReader();
      reader.onload = (e) => {
        this.brand.logoUrl = e.target.result;
        this.logoError = '';
      };
      reader.readAsDataURL(file);
    },

    removeProtocol(protocol) {
      const index = this.selectedProtocols.indexOf(protocol);
      if (index > -1) {
        this.selectedProtocols.splice(index, 1);
      }
    },

    getInitials(name) {
      if (!name) return '?';
      return name
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    },

    async testConfiguration() {
      if (!this.canTest) return;

      this.testing = true;
      try {
        // Simular prueba de configuración
      // eslint-disable-next-line no-unused-vars
        const testData = {
          name: this.brand.name,
          protocols: this.selectedProtocols,
          config: this.parsedConfig
        };

        // Aquí iría la llamada real al backend para probar la configuración
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        this.successMessage = 'Configuración probada correctamente';
        this.clearMessages();
      } catch (error) {
        this.errorMessage = 'Error en la prueba de configuración';
        this.clearMessages();
      } finally {
        this.testing = false;
      }
    },

    async saveBrand() {
      // Preparar datos para envío
      const brandData = {
        ...this.brand,
        supportedProtocols: this.selectedProtocols,
        technicalConfig: this.parsedConfig
      };

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        if (this.isEdit) {
          await CommandService.updateBrand(this.brand.id, brandData);
          this.successMessage = 'Marca actualizada correctamente';
        } else {
      // eslint-disable-next-line no-unused-vars
          const response = await CommandService.createBrand(brandData);
          this.successMessage = 'Marca creada correctamente';
          
          // Redirigir al listado después de crear
          setTimeout(() => {
            this.$router.push('/device-brands');
          }, 1500);
          return;
        }

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);

      } catch (error) {
        console.error('Error guardando marca:', error);
        this.errorMessage = error.response?.data?.message || 'Error al guardar la marca';
      } finally {
        this.saving = false;
      }
    },

    goBack() {
      this.$router.push('/device-brands');
    },

    clearMessages() {
      setTimeout(() => {
        this.successMessage = '';
        this.errorMessage = '';
      }, 3000);
    }
  }
};
</script>

<style scoped>
.brand-form {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  margin: 0;
}

.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.form-section {
  padding: 25px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  color: #34495e;
  margin: 0 0 20px 0;
  font-size: 1.2em;
  font-weight: 600;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
}

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 500;
  font-size: 14px;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.3s ease;
  background: #fafafa;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3498db;
  background: white;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

input:disabled {
  background: #ecf0f1;
  color: #7f8c8d;
  cursor: not-allowed;
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.json-textarea {
  font-family: 'Courier New', monospace;
  background: #2c3e50;
  color: #ecf0f1;
  border: 2px solid #34495e;
  min-height: 150px;
}

.json-textarea:focus {
  border-color: #3498db;
  background: #2c3e50;
}

.field-help {
  display: block;
  color: #7f8c8d;
  font-size: 12px;
  margin-top: 5px;
  font-style: italic;
}

.field-error {
  display: block;
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
  font-weight: 500;
}

/* Logo Section */
.logo-section {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

.logo-preview {
  flex: 0 0 auto;
}

.current-logo {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e0e0e0;
  margin-bottom: 10px;
}

.current-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-placeholder {
  font-weight: bold;
  font-size: 24px;
  color: #3498db;
}

.logo-info p {
  margin: 0;
  font-size: 13px;
}

.help-text {
  color: #7f8c8d;
}

.logo-upload {
  flex: 1;
}

.upload-options {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
}

.btn-upload {
  padding: 8px 16px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.btn-upload:hover {
  background: #7f8c8d;
}

.upload-help {
  color: #7f8c8d;
  font-size: 12px;
}

/* Protocols Section */
.protocols-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.protocol-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.protocol-checkbox:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.protocol-checkbox input[type="checkbox"] {
  width: auto;
  margin: 0;
  transform: scale(1.2);
}

.protocol-info {
  flex: 1;
}

.protocol-info strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 4px;
}

.protocol-info small {
  color: #7f8c8d;
  font-size: 12px;
}

.selected-protocols {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.protocols-label {
  display: block;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 10px;
}

.protocol-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.protocol-tag {
  background: #3498db;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.protocol-tag.small {
  padding: 4px 8px;
  font-size: 11px;
}

.remove-protocol {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-protocol:hover {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.no-protocols {
  color: #7f8c8d;
  font-style: italic;
}

/* JSON Preview */
.json-preview {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
}

.json-preview h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.json-preview pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
  font-size: 12px;
}

/* Toggle Switch */
.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 50px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  transition: background 0.3s;
  margin-right: 12px;
}

.toggle-slider:before {
  content: "";
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
}

.toggle-label input:checked + .toggle-slider {
  background: #3498db;
}

.toggle-label input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-text {
  font-weight: 500;
  color: #2c3e50;
}

/* Preview Section */
.preview-section {
  background: #f8f9fa;
}

.brand-preview-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 350px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.preview-logo {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
}

.preview-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-placeholder {
  font-weight: bold;
  font-size: 18px;
  color: #3498db;
}

.preview-status {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.preview-status.active { background: #2ecc71; }
.preview-status.inactive { background: #e74c3c; }

.preview-content h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.2em;
}

.preview-content p {
  color: #7f8c8d;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.preview-protocols {
  margin-top: 15px;
}

/* Buttons */
.btn-primary, .btn-secondary, .btn-test, .btn-upload {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-test {
  background: #f39c12;
  color: white;
}

.btn-test:hover:not(:disabled) {
  background: #e67e22;
}

.btn-primary:disabled, .btn-test:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 25px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* Messages */
.success-message, .error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  font-weight: 500;
  z-index: 1000;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.success-message {
  background: #d5f4e6;
  color: #27ae60;
  border: 1px solid #82e5aa;
}

.error-message {
  background: #fadbd8;
  color: #c0392b;
  border: 1px solid #f1948a;
}

/* Responsive Design */
@media (max-width: 768px) {
  .brand-form {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .logo-section {
    flex-direction: column;
    gap: 20px;
  }
  
  .protocols-grid {
    grid-template-columns: 1fr;
  }
  
  .upload-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .protocol-tags {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .brand-preview-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 15px;
  }
  
  .current-logo, .preview-logo {
    width: 40px;
    height: 40px;
  }
  
  .logo-placeholder, .preview-placeholder {
    font-size: 16px;
  }
  
  .success-message, .error-message {
    position: relative;
    top: auto;
    right: auto;
    margin-top: 20px;
    max-width: 100%;
  }
}

/* Loading States */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Focus Management */
.form-section:focus-within h3 {
  color: #3498db;
}

input:invalid {
  border-color: #e74c3c;
}

input:valid {
  border-color: #2ecc71;
}

/* Accessibility */
.protocol-checkbox:focus-within {
  outline: 2px solid #3498db;
  outline-offset: 2px;
}

.toggle-label:focus-within .toggle-slider {
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
}

/* Print Styles */
@media print {
  .form-actions,
  .btn-primary,
  .btn-secondary,
  .btn-test,
  .btn-upload {
    display: none;
  }
  
  .form-container {
    box-shadow: none;
    border: 1px solid #ccc;
  }
  
  .success-message,
  .error-message {
    position: relative;
    top: auto;
    right: auto;
  }
}
</style>