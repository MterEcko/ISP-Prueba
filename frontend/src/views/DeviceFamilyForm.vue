<template>
  <div class="family-form">
    <div class="page-header">
      <h1>{{ isEdit ? 'Editar Familia' : 'Nueva Familia de Dispositivo' }}</h1>
      <button @click="goBack" class="btn-secondary">
        ← Volver
      </button>
    </div>

    <form @submit.prevent="saveFamily" class="form-container">
      <!-- Información Básica -->
      <div class="form-section">
        <h3>📋 Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="brandId">Marca de Dispositivo *</label>
            <select 
              id="brandId"
              v-model="family.brandId"
              @change="onBrandChange"
              required
              :disabled="isEdit"
            >
              <option value="">Seleccionar marca</option>
              <option 
                v-for="brand in brands" 
                :key="brand.id" 
                :value="brand.id"
              >
                {{ brand.displayName || brand.name }}
              </option>
            </select>
            <span class="field-help">La marca no se puede cambiar después de crear la familia</span>
          </div>
          
          <div class="form-group">
            <label for="name">Nombre Técnico *</label>
            <input 
              type="text"
              id="name"
              v-model="family.name"
              required
              placeholder="ej: routeros, unifi, pharos"
              pattern="[a-z_]+"
              @input="validateName"
              :disabled="isEdit"
            />
            <span class="field-help">Solo letras minúsculas y guiones bajos. No se puede modificar después de crear.</span>
            <span v-if="nameError" class="field-error">{{ nameError }}</span>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="displayName">Nombre para Mostrar *</label>
            <input 
              type="text"
              id="displayName"
              v-model="family.displayName"
              required
              placeholder="ej: RouterOS, UniFi Controller, Pharos Control"
            />
            <span class="field-help">Nombre legible para mostrar en la interfaz</span>
          </div>
          
          <div class="form-group">
            <label for="systemType">Tipo de Sistema</label>
            <input 
              type="text"
              id="systemType"
              v-model="family.systemType"
              placeholder="ej: RouterOS, UniFi OS, OpenWrt"
            />
            <span class="field-help">Sistema operativo o firmware base</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="description">Descripción</label>
          <textarea 
            id="description"
            v-model="family.description"
            rows="3"
            placeholder="Descripción de la familia de dispositivos y sus características..."
          ></textarea>
        </div>
      </div>

      <!-- Características y Tecnologías -->
      <div class="form-section">
        <h3>🔧 Características y Tecnologías</h3>
        
        <div class="features-section">
          <div class="features-header">
            <label>Características Soportadas</label>
            <button type="button" @click="addFeature" class="btn-small btn-primary">
              + Agregar Característica
            </button>
          </div>

          <div v-if="!family.features || family.features.length === 0" class="empty-features">
            <p>No hay características definidas</p>
          </div>

          <div v-else class="features-list">
            <div 
              v-for="(feature, index) in family.features" 
              :key="index"
              class="feature-item"
            >
              <input 
                type="text"
                v-model="family.features[index]"
                placeholder="ej: WiFi 6, PoE+, VLAN, QoS"
                class="feature-input"
              />
              <button 
                type="button" 
                @click="removeFeature(index)" 
                class="btn-remove-feature"
                title="Eliminar característica"
              >
                🗑️
              </button>
            </div>
          </div>

          <div class="common-features">
            <span class="common-label">Características comunes:</span>
            <div class="common-tags">
              <button 
                v-for="common in commonFeatures" 
                :key="common"
                type="button"
                @click="addCommonFeature(common)"
                class="common-tag"
                :disabled="family.features && family.features.includes(common)"
              >
                {{ common }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración de Versiones -->
      <div class="form-section">
        <h3>📊 Configuración de Versiones</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="minVersion">Versión Mínima Soportada</label>
            <input 
              type="text"
              id="minVersion"
              v-model="family.minVersion"
              placeholder="ej: 6.40, 1.0.0, 4.3.21"
            />
            <span class="field-help">Versión mínima del sistema soportada</span>
          </div>
          
          <div class="form-group">
            <label for="maxVersion">Versión Máxima Soportada</label>
            <input 
              type="text"
              id="maxVersion"
              v-model="family.maxVersion"
              placeholder="ej: 7.10, 2.5.0, 5.0.12"
            />
            <span class="field-help">Versión máxima del sistema soportada (opcional)</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="versionNotes">Notas sobre Versiones</label>
          <textarea 
            id="versionNotes"
            v-model="family.versionNotes"
            rows="2"
            placeholder="Notas importantes sobre compatibilidad de versiones..."
          ></textarea>
        </div>
      </div>

      <!-- Configuración de Conexión -->
      <div class="form-section">
        <h3>🔌 Configuración de Conexión</h3>
        
        <div class="connection-grid">
          <div class="connection-group">
            <h4>Puertos por Defecto</h4>
            <div class="port-inputs">
              <div class="port-field">
                <label for="defaultSshPort">SSH</label>
                <input 
                  type="number"
                  id="defaultSshPort"
                  v-model="family.defaultSshPort"
                  min="1"
                  max="65535"
                  placeholder="22"
                />
              </div>
              <div class="port-field">
                <label for="defaultApiPort">API</label>
                <input 
                  type="number"
                  id="defaultApiPort"
                  v-model="family.defaultApiPort"
                  min="1"
                  max="65535"
                  placeholder="8728"
                />
              </div>
              <div class="port-field">
                <label for="defaultSnmpPort">SNMP</label>
                <input 
                  type="number"
                  id="defaultSnmpPort"
                  v-model="family.defaultSnmpPort"
                  min="1"
                  max="65535"
                  placeholder="161"
                />
              </div>
              <div class="port-field">
                <label for="defaultWebPort">Web</label>
                <input 
                  type="number"
                  id="defaultWebPort"
                  v-model="family.defaultWebPort"
                  min="1"
                  max="65535"
                  placeholder="80"
                />
              </div>
            </div>
          </div>

          <div class="connection-group">
            <h4>Credenciales por Defecto</h4>
            <div class="credential-inputs">
              <div class="credential-field">
                <label for="defaultUsername">Usuario</label>
                <input 
                  type="text"
                  id="defaultUsername"
                  v-model="family.defaultUsername"
                  placeholder="admin"
                />
              </div>
              <div class="credential-field">
                <label for="defaultPassword">Contraseña</label>
                <input 
                  type="text"
                  id="defaultPassword"
                  v-model="family.defaultPassword"
                  placeholder="admin, (vacío)"
                />
              </div>
              <div class="credential-field">
                <label for="defaultSnmpCommunity">SNMP Community</label>
                <input 
                  type="text"
                  id="defaultSnmpCommunity"
                  v-model="family.defaultSnmpCommunity"
                  placeholder="public"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración Específica (JSON) -->
      <div class="form-section">
        <h3>⚙️ Configuración Específica</h3>
        
        <div class="json-editor">
          <label for="specificConfig">Configuración Específica (JSON)</label>
          <textarea 
            id="specificConfig"
            v-model="specificConfigText"
            rows="8"
            placeholder='{"api": {"timeout": 30}, "snmp": {"retries": 3}, "features": ["backup", "restore"]}'
            class="json-textarea"
            @blur="validateJsonConfig"
          ></textarea>
          <span class="field-help">Configuración técnica específica para esta familia en formato JSON</span>
          <span v-if="jsonError" class="field-error">{{ jsonError }}</span>
        </div>
        
        <!-- Vista previa del JSON -->
        <div v-if="parsedConfig" class="json-preview">
          <h4>Vista Previa de la Configuración:</h4>
          <pre>{{ JSON.stringify(parsedConfig, null, 2) }}</pre>
        </div>

        <!-- Ejemplos de configuración -->
        <div class="config-examples">
          <h4>Ejemplos de Configuración:</h4>
          <div class="example-tabs">
            <button 
              v-for="example in configExamples" 
              :key="example.name"
              type="button"
              @click="loadConfigExample(example)"
              class="example-tab"
            >
              {{ example.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Documentación y Enlaces -->
      <div class="form-section">
        <h3>📚 Documentación y Enlaces</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="documentationUrl">URL de Documentación</label>
            <input 
              type="url"
              id="documentationUrl"
              v-model="family.documentationUrl"
              placeholder="https://docs.fabricante.com/familia"
            />
          </div>
          
          <div class="form-group">
            <label for="downloadUrl">URL de Descarga</label>
            <input 
              type="url"
              id="downloadUrl"
              v-model="family.downloadUrl"
              placeholder="https://www.fabricante.com/downloads"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="supportUrl">URL de Soporte</label>
            <input 
              type="url"
              id="supportUrl"
              v-model="family.supportUrl"
              placeholder="https://support.fabricante.com"
            />
          </div>
          
          <div class="form-group">
            <label for="forumUrl">URL del Foro</label>
            <input 
              type="url"
              id="forumUrl"
              v-model="family.forumUrl"
              placeholder="https://forum.fabricante.com"
            />
          </div>
        </div>
      </div>

      <!-- Estado -->
      <div class="form-section">
        <h3>📊 Estado y Activación</h3>
        
        <div class="form-group">
          <label class="toggle-label">
            <input 
              type="checkbox"
              v-model="family.active"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ family.active ? 'Activa' : 'Inactiva' }}</span>
          </label>
          <span class="field-help">Las familias inactivas no aparecerán en las listas de selección</span>
        </div>
      </div>

      <!-- Vista Previa -->
      <div class="form-section preview-section">
        <h3>👁️ Vista Previa</h3>
        
        <div class="family-preview-card">
          <div class="preview-header">
            <div class="preview-brand">
              <span :class="['brand-badge', selectedBrand?.name?.toLowerCase()]">
                {{ selectedBrand?.displayName || selectedBrand?.name || 'Marca' }}
              </span>
              <span :class="['status-dot', family.active ? 'active' : 'inactive']"></span>
            </div>
          </div>
          
          <div class="preview-content">
            <h4>{{ family.displayName || family.name || 'Nueva Familia' }}</h4>
            <p>{{ family.description || 'Sin descripción' }}</p>
            
            <div class="preview-system" v-if="family.systemType">
              <span class="system-label">Sistema:</span>
              <span class="system-value">{{ family.systemType }}</span>
            </div>
            
            <div class="preview-features" v-if="family.features && family.features.length > 0">
              <span class="features-label">Características:</span>
              <div class="feature-tags">
                <span 
                  v-for="feature in family.features.slice(0, 3)" 
                  :key="feature"
                  class="feature-tag small"
                >
                  {{ feature }}
                </span>
                <span v-if="family.features.length > 3" class="more-features">
                  +{{ family.features.length - 3 }}
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
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Familia
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
  name: 'DeviceFamilyForm',
  data() {
    return {
      family: {
        brandId: '',
        name: '',
        displayName: '',
        description: '',
        systemType: '',
        features: [],
        minVersion: '',
        maxVersion: '',
        versionNotes: '',
        defaultSshPort: null,
        defaultApiPort: null,
        defaultSnmpPort: null,
        defaultWebPort: null,
        defaultUsername: '',
        defaultPassword: '',
        defaultSnmpCommunity: '',
        documentationUrl: '',
        downloadUrl: '',
        supportUrl: '',
        forumUrl: '',
        active: true
      },
      brands: [],
      selectedBrand: null,
      specificConfigText: '',
      parsedConfig: null,
      isEdit: false,
      saving: false,
      testing: false,
      loading: false,
      nameError: '',
      jsonError: '',
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    commonFeatures() {
      return [
        'WiFi', 'WiFi 6', 'PoE', 'PoE+', 'VLAN', 'QoS', 'VPN', 'Firewall',
        'Load Balancing', 'Failover', 'SNMP', 'SSH', 'Telnet', 'Web Interface',
        'API REST', 'DHCP Server', 'DNS Server', 'NTP Client', 'Syslog',
        'Backup/Restore', 'Configuration Sync', 'User Management', 'ACL',
        'Traffic Shaping', 'Bandwidth Control', 'Port Mirroring', 'LACP'
      ];
    },
    configExamples() {
      return [
        {
          name: 'MikroTik RouterOS',
          config: {
            api: {
              port: 8728,
              timeout: 30,
              ssl: false
            },
            ssh: {
              port: 22,
              timeout: 30
            },
            snmp: {
              version: 'v2c',
              community: 'public',
              port: 161
            },
            features: ['backup', 'restore', 'user_management', 'firewall'],
            backup: {
              format: 'binary',
              include_passwords: false
            }
          }
        },
        {
          name: 'Ubiquiti UniFi',
          config: {
            ssh: {
              port: 22,
              timeout: 30
            },
            web: {
              port: 443,
              ssl: true
            },
            features: ['provisioning', 'firmware_upgrade', 'statistics'],
            unifi: {
              controller_required: true,
              adoption_method: 'ssh'
            }
          }
        },
        {
          name: 'TP-Link Pharos',
          config: {
            web: {
              port: 80,
              ssl: false
            },
            snmp: {
              version: 'v2c',
              community: 'public',
              port: 161
            },
            features: ['monitoring', 'configuration', 'firmware_upgrade'],
            pharos: {
              control_utility: 'required'
            }
          }
        }
      ];
    },
    isFormValid() {
      return this.family.brandId && 
             this.family.name && 
             this.family.displayName && 
             !this.nameError && 
             !this.jsonError;
    },
    canTest() {
      return this.isFormValid && this.parsedConfig;
    }
  },
  created() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const brandId = urlParams.get('brandId');
    if (brandId) {
      this.family.brandId = brandId;
    }
    
    this.loadInitialData();
    
    const familyId = this.$route.params.id;
    if (familyId && familyId !== 'new') {
      this.isEdit = true;
      this.loadFamily(familyId);
    } else {
      // Configuración por defecto para nueva familia
      this.specificConfigText = JSON.stringify({
        connection: {
          timeout: 30,
          retries: 3
        },
        features: []
      }, null, 2);
    }
  },
  methods: {
    async loadInitialData() {
      try {
        const brandsResponse = await CommandService.getAllBrands({ active: true });
        this.brands = brandsResponse.data.brands || brandsResponse.data || [];
        
        // Si hay brandId preseleccionado, encontrar la marca
        if (this.family.brandId) {
          this.selectedBrand = this.brands.find(b => b.id == this.family.brandId);
        }
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.errorMessage = 'Error cargando datos iniciales';
      }
    },

    async loadFamily(id) {
      this.loading = true;
      try {
        const response = await CommandService.getFamily(id);
        this.family = {
          ...this.family,
          ...response.data.family || response.data
        };
        
        // Cargar información de la marca
        if (this.family.brandId) {
          this.selectedBrand = this.brands.find(b => b.id == this.family.brandId);
        }
        
        // Cargar configuración específica
        if (this.family.specificConfig) {
          this.specificConfigText = JSON.stringify(this.family.specificConfig, null, 2);
          this.parsedConfig = this.family.specificConfig;
        }
        
        // Asegurar que features sea un array
        if (!Array.isArray(this.family.features)) {
          this.family.features = [];
        }
      } catch (error) {
        console.error('Error cargando familia:', error);
        this.errorMessage = 'Error al cargar los datos de la familia';
      } finally {
        this.loading = false;
      }
    },

    onBrandChange() {
      this.selectedBrand = this.brands.find(b => b.id == this.family.brandId);
      
      // Establecer valores por defecto según la marca
      if (this.selectedBrand) {
        const brandName = this.selectedBrand.name?.toLowerCase();
        
        // Configurar puertos por defecto según la marca
        switch (brandName) {
          case 'mikrotik':
            this.family.defaultSshPort = 22;
            this.family.defaultApiPort = 8728;
            this.family.defaultSnmpPort = 161;
            this.family.defaultWebPort = 80;
            this.family.defaultUsername = 'admin';
            this.family.defaultPassword = '';
            break;
          case 'ubiquiti':
            this.family.defaultSshPort = 22;
            this.family.defaultWebPort = 443;
            this.family.defaultSnmpPort = 161;
            this.family.defaultUsername = 'ubnt';
            this.family.defaultPassword = 'ubnt';
            break;
          case 'tplink':
            this.family.defaultWebPort = 80;
            this.family.defaultSnmpPort = 161;
            this.family.defaultUsername = 'admin';
            this.family.defaultPassword = 'admin';
            break;
        }
      }
    },

    validateName() {
      if (!this.family.name) {
        this.nameError = '';
        return;
      }

      // Validar formato: solo letras minúsculas, números y guiones bajos
      const namePattern = /^[a-z][a-z0-9_]*$/;
      if (!namePattern.test(this.family.name)) {
        this.nameError = 'Solo se permiten letras minúsculas, números y guiones bajos. Debe empezar con letra.';
        return;
      }

      // Validar longitud
      if (this.family.name.length < 2) {
        this.nameError = 'El nombre debe tener al menos 2 caracteres';
        return;
      }

      if (this.family.name.length > 40) {
        this.nameError = 'El nombre no puede exceder 40 caracteres';
        return;
      }

      this.nameError = '';
    },

    validateJsonConfig() {
      if (!this.specificConfigText.trim()) {
        this.parsedConfig = null;
        this.jsonError = '';
        return;
      }

      try {
        this.parsedConfig = JSON.parse(this.specificConfigText);
        this.jsonError = '';
      } catch (error) {
        this.jsonError = 'JSON no válido: ' + error.message;
        this.parsedConfig = null;
      }
    },

    addFeature() {
      if (!this.family.features) {
        this.family.features = [];
      }
      this.family.features.push('');
    },

    removeFeature(index) {
      this.family.features.splice(index, 1);
    },

    addCommonFeature(feature) {
      if (!this.family.features) {
        this.family.features = [];
      }
      if (!this.family.features.includes(feature)) {
        this.family.features.push(feature);
      }
    },

    loadConfigExample(example) {
      this.specificConfigText = JSON.stringify(example.config, null, 2);
      this.validateJsonConfig();
    },

    async testConfiguration() {
      if (!this.canTest) return;

      this.testing = true;
      try {
        // Simular prueba de configuración
        // eslint-disable-next-line no-unused-vars
        const testData = {
          brandId: this.family.brandId,
          name: this.family.name,
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

    async saveFamily() {
      // Preparar datos para envío
      const familyData = {
        ...this.family,
        specificConfig: this.parsedConfig,
        features: this.family.features?.filter(f => f.trim()) || []
      };

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        if (this.isEdit) {
          await CommandService.updateFamily(this.family.id, familyData);
          this.successMessage = 'Familia actualizada correctamente';
        } else {
          // eslint-disable-next-line no-unused-vars
          const response = await CommandService.createFamily(familyData);
          this.successMessage = 'Familia creada correctamente';
          
          // Redirigir al listado después de crear
          setTimeout(() => {
            this.$router.push('/device-families');
          }, 1500);
          return;
        }

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);

      } catch (error) {
        console.error('Error guardando familia:', error);
        this.errorMessage = error.response?.data?.message || 'Error al guardar la familia';
      } finally {
        this.saving = false;
      }
    },

    goBack() {
      this.$router.push('/device-families');
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
.family-form {
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
  border-bottom: 2px solid #9b59b6;
  padding-bottom: 8px;
}

.form-section h4 {
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1em;
  font-weight: 600;
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
  border-color: #9b59b6;
  background: white;
  box-shadow: 0 0 0 3px rgba(155, 89, 182, 0.1);
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

.json-textarea:focus {
  border-color: #9b59b6;
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

/* Features Section */
.features-section {
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  padding: 20px;
}

.features-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ecf0f1;
}

.features-header label {
  margin: 0;
  font-weight: 600;
  color: #2c3e50;
}

.empty-features {
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  padding: 20px;
}

.features-list {
  margin-bottom: 20px;
}

.feature-item {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.feature-input {
  flex: 1;
  margin: 0;
}

.btn-remove-feature {
  padding: 8px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-remove-feature:hover {
  background: #c0392b;
}

.common-features {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.common-label {
  display: block;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 13px;
}

.common-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.common-tag {
  background: #ecf0f1;
  color: #2c3e50;
  padding: 6px 10px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.common-tag:hover:not(:disabled) {
  background: #9b59b6;
  color: white;
  border-color: #9b59b6;
}

.common-tag:disabled {
  background: #d5dbdb;
  color: #7f8c8d;
  cursor: not-allowed;
}

/* Connection Configuration */
.connection-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.connection-group {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.port-inputs, .credential-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.port-field, .credential-field {
  display: flex;
  flex-direction: column;
}

.port-field label, .credential-field label {
  font-size: 12px;
  margin-bottom: 5px;
  color: #6c757d;
}

.port-field input, .credential-field input {
  padding: 8px;
  font-size: 13px;
}

/* JSON Configuration */
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

.config-examples {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.config-examples h4 {
  margin-bottom: 10px;
}

.example-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.example-tab {
  padding: 8px 15px;
  background: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.example-tab:hover {
  background: #9b59b6;
  color: white;
  border-color: #9b59b6;
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
  background: #9b59b6;
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

.family-preview-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 380px;
  border-left: 4px solid #9b59b6;
}

.preview-header {
  margin-bottom: 15px;
}

.preview-brand {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-badge {
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.brand-badge.mikrotik { background: #e74c3c; }
.brand-badge.ubiquiti { background: #2ecc71; }
.brand-badge.tplink { background: #f39c12; }
.brand-badge.cambium { background: #9b59b6; }
.brand-badge.mimosa { background: #1abc9c; }

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.active { background: #2ecc71; }
.status-dot.inactive { background: #e74c3c; }

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

.preview-system {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.system-label {
  font-weight: 500;
  color: #7f8c8d;
  font-size: 13px;
}

.system-value {
  background: #ecf0f1;
  color: #2c3e50;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.preview-features {
  margin-top: 15px;
}

.features-label {
  font-size: 12px;
  color: #7f8c8d;
  font-weight: 500;
  margin-bottom: 8px;
  display: block;
}

.feature-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.feature-tag {
  background: #f8f9fa;
  color: #2c3e50;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid #e9ecef;
}

.feature-tag.small {
  padding: 3px 6px;
  font-size: 10px;
}

.more-features {
  background: #e9ecef;
  color: #6c757d;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

/* Buttons */
.btn-primary, .btn-secondary, .btn-test, .btn-small {
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
  background: #9b59b6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #8e44ad;
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

.btn-small {
  padding: 8px 15px;
  font-size: 13px;
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
  .family-form {
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
  
  .connection-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .port-inputs, .credential-inputs {
    grid-template-columns: 1fr;
  }
  
  .common-tags {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .example-tabs {
    flex-direction: column;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .family-preview-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 15px;
  }
  
  .connection-group {
    padding: 15px;
  }
  
  .feature-item {
    flex-direction: column;
    gap: 8px;
  }
  
  .btn-remove-feature {
    align-self: flex-end;
    width: 40px;
  }
  
  .success-message, .error-message {
    position: relative;
    top: auto;
    right: auto;
    margin-top: 20px;
    max-width: 100%;
  }
}

/* Focus Management */
.form-section:focus-within h3 {
  color: #9b59b6;
}

input:invalid {
  border-color: #e74c3c;
}

input:valid:not(:placeholder-shown) {
  border-color: #2ecc71;
}

/* Accessibility */
.toggle-label:focus-within .toggle-slider {
  box-shadow: 0 0 0 3px rgba(155, 89, 182, 0.3);
}

.common-tag:focus {
  outline: 2px solid #9b59b6;
  outline-offset: 2px;
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
  border-top: 5px solid #9b59b6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Print Styles */
@media print {
  .form-actions,
  .btn-primary,
  .btn-secondary,
  .btn-test,
  .btn-small {
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