<template>
  <div class="credentials-form">
    <div class="header">
      <h2>{{ isEdit ? 'Editar' : 'Agregar' }} Credenciales - {{ device.name }}</h2>
      <div class="actions">
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando información...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="form-container">
      <!-- Información del Dispositivo -->
      <div class="device-info">
        <div class="device-header">
          <div class="device-icon">{{ getBrandIcon(device.brand) }}</div>
          <div class="device-details">
            <h3>{{ device.name }}</h3>
            <div class="device-meta">
              <span class="brand">{{ device.brand?.toUpperCase() }}</span>
              <span class="type">{{ device.type?.toUpperCase() }}</span>
              <span class="ip">{{ device.ipAddress }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Formulario de Credenciales -->
      <form @submit.prevent="submitForm" class="credentials-form-content">
        <div class="form-section">
          <h3>Configuración de Conexión</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="connectionType">Tipo de Conexión *</label>
              <select 
                id="connectionType" 
                v-model="credentials.connectionType" 
                @change="onConnectionTypeChange"
                required
              >
                <option value="">Seleccionar tipo</option>
                <option value="ssh">SSH</option>
                <option value="snmp">SNMP</option>
                <option value="api">API</option>
                <option value="web">Web UI</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="port">Puerto</label>
              <input 
                type="number"
                id="port"
                v-model="credentials.port"
                :placeholder="getDefaultPort(credentials.connectionType)"
                min="1"
                max="65535"
              />
              <small class="field-help">Puerto predeterminado: {{ getDefaultPort(credentials.connectionType) }}</small>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="username">Usuario *</label>
              <input 
                type="text"
                id="username"
                v-model="credentials.username"
                required
                placeholder="admin"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Contraseña *</label>
              <div class="password-input">
                <input 
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  v-model="credentials.password"
                  required
                />
                <button 
                  type="button" 
                  @click="togglePasswordVisibility"
                  class="password-toggle"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Configuración SNMP -->
        <div class="form-section" v-if="credentials.connectionType === 'snmp'">
          <h3>Configuración SNMP</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="snmpCommunity">Community String</label>
              <input 
                type="text"
                id="snmpCommunity"
                v-model="credentials.snmpCommunity"
                placeholder="public"
              />
            </div>
            
            <div class="form-group">
              <label for="snmpVersion">Versión SNMP</label>
              <select id="snmpVersion" v-model="credentials.snmpVersion">
                <option value="v1">v1</option>
                <option value="v2c">v2c</option>
                <option value="v3">v3</option>
              </select>
            </div>
          </div>
          
          <!-- Configuración SNMP v3 -->
          <div v-if="credentials.snmpVersion === 'v3'" class="snmpv3-config">
            <div class="form-row">
              <div class="form-group">
                <label for="snmpSecurityLevel">Nivel de Seguridad</label>
                <select id="snmpSecurityLevel" v-model="credentials.snmpSecurityLevel">
                  <option value="noAuthNoPriv">No Auth, No Priv</option>
                  <option value="authNoPriv">Auth, No Priv</option>
                  <option value="authPriv">Auth, Priv</option>
                </select>
              </div>
              
              <div class="form-group" v-if="credentials.snmpSecurityLevel !== 'noAuthNoPriv'">
                <label for="snmpAuthProtocol">Protocolo de Autenticación</label>
                <select id="snmpAuthProtocol" v-model="credentials.snmpAuthProtocol">
                  <option value="MD5">MD5</option>
                  <option value="SHA">SHA</option>
                </select>
              </div>
            </div>
            
            <div class="form-row" v-if="credentials.snmpSecurityLevel !== 'noAuthNoPriv'">
              <div class="form-group">
                <label for="snmpAuthPassword">Contraseña de Autenticación</label>
                <input 
                  type="password"
                  id="snmpAuthPassword"
                  v-model="credentials.snmpAuthPassword"
                />
              </div>
              
              <div class="form-group" v-if="credentials.snmpSecurityLevel === 'authPriv'">
                <label for="snmpPrivPassword">Contraseña de Privacidad</label>
                <input 
                  type="password"
                  id="snmpPrivPassword"
                  v-model="credentials.snmpPrivPassword"
                />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Configuración API -->
        <div class="form-section" v-if="credentials.connectionType === 'api'">
          <h3>Configuración API</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="apiEndpoint">Endpoint Base</label>
              <input 
                type="url"
                id="apiEndpoint"
                v-model="credentials.apiEndpoint"
                placeholder="https://device-ip/api"
              />
            </div>
            
            <div class="form-group">
              <label for="apiVersion">Versión API</label>
              <input 
                type="text"
                id="apiVersion"
                v-model="credentials.apiVersion"
                placeholder="v1"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="apiKey">API Key</label>
              <input 
                type="text"
                id="apiKey"
                v-model="credentials.apiKey"
                placeholder="Tu API Key aquí"
              />
            </div>
          </div>
        </div>
        
        <!-- Configuración Adicional -->
        <div class="form-section">
          <h3>Configuración Adicional</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="timeout">Timeout (segundos)</label>
              <input 
                type="number"
                id="timeout"
                v-model="credentials.timeout"
                min="5"
                max="300"
                placeholder="30"
              />
            </div>
            
            <div class="form-group">
              <label for="retries">Reintentos</label>
              <input 
                type="number"
                id="retries"
                v-model="credentials.retries"
                min="0"
                max="5"
                placeholder="3"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="description">Descripción</label>
            <textarea 
              id="description"
              v-model="credentials.description"
              rows="3"
              placeholder="Descripción opcional de estas credenciales..."
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox"
                v-model="credentials.isDefault"
              />
              <span>Usar como credenciales predeterminadas</span>
            </label>
          </div>
        </div>
        
        <!-- Prueba de Conexión -->
        <div class="form-section test-section">
          <h3>Prueba de Conexión</h3>
          
          <div class="test-container">
            <button 
              type="button" 
              @click="testConnection" 
              :disabled="testingConnection || !canTest"
              class="test-button"
            >
              {{ testingConnection ? '⏳ Probando...' : '🔗 Probar Conexión' }}
            </button>
            
            <div v-if="testResult" class="test-result">
              <div v-if="testResult.success" class="test-success">
                ✅ {{ testResult.message }}
              </div>
              <div v-else class="test-error">
                ❌ {{ testResult.message }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Botones de Acción -->
        <div class="form-actions">
          <button type="button" @click="cancel" class="cancel-button">
            Cancelar
          </button>
          <button type="submit" class="save-button" :disabled="saving">
            {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Guardar') }} Credenciales
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';

export default {
  name: 'DeviceCredentialsForm',
  data() {
    return {
      device: {},
      credentials: {
        connectionType: '',
        username: '',
        password: '',
        port: null,
        snmpCommunity: 'public',
        snmpVersion: 'v2c',
        snmpSecurityLevel: 'noAuthNoPriv',
        snmpAuthProtocol: 'MD5',
        snmpAuthPassword: '',
        snmpPrivPassword: '',
        apiEndpoint: '',
        apiVersion: '',
        apiKey: '',
        timeout: 30,
        retries: 3,
        description: '',
        isDefault: false
      },
      isEdit: false,
      loading: true,
      saving: false,
      testingConnection: false,
      error: null,
      testResult: null,
      showPassword: false
    };
  },
  computed: {
    canTest() {
      return this.credentials.connectionType && 
             this.credentials.username && 
             this.credentials.password;
    }
  },
  created() {
    this.loadDevice();
  },
  methods: {
    async loadDevice() {
      this.loading = true;
      try {
        const deviceId = this.$route.params.deviceId;
        const credentialId = this.$route.params.credentialId;
        
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
        
        if (credentialId && credentialId !== 'new') {
          this.isEdit = true;
          await this.loadCredential(credentialId);
        } else {
          // Configurar valores por defecto según el dispositivo
          this.setDefaultValues();
        }
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error = 'Error cargando información del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadCredential(credentialId) {
      try {
        const response = await DeviceService.getDeviceCredentials(this.device.id);
        const credential = response.data.find(cred => cred.id === parseInt(credentialId));
        
        if (credential) {
          this.credentials = { ...this.credentials, ...credential };
        } else {
          this.error = 'Credencial no encontrada.';
        }
      } catch (error) {
        console.error('Error cargando credencial:', error);
        this.error = 'Error cargando credenciales.';
      }
    },
    
    setDefaultValues() {
      // Establecer valores por defecto según la marca del dispositivo
      const brandDefaults = {
        mikrotik: {
          connectionType: 'api',
          port: 8728,
          username: 'admin'
        },
        ubiquiti: {
          connectionType: 'ssh',
          port: 22,
          username: 'ubnt'
        },
        tplink: {
          connectionType: 'snmp',
          port: 161,
          snmpCommunity: 'public'
        },
        cambium: {
          connectionType: 'snmp',
          port: 161,
          snmpCommunity: 'public'
        },
        mimosa: {
          connectionType: 'snmp',
          port: 161,
          snmpCommunity: 'public'
        }
      };
      
      const defaults = brandDefaults[this.device.brand] || {
        connectionType: 'ssh',
        port: 22,
        username: 'admin'
      };
      
      Object.assign(this.credentials, defaults);
    },
    
    onConnectionTypeChange() {
      // Actualizar puerto por defecto cuando cambia el tipo de conexión
      const port = this.getDefaultPort(this.credentials.connectionType);
      if (port) {
        this.credentials.port = parseInt(port);
      }
    },
    
    getDefaultPort(connectionType) {
      const portDefaults = {
        ssh: '22',
        snmp: '161',
        api: '8728',
        web: '80'
      };
      
      return portDefaults[connectionType] || '';
    },
    
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
    },
    
    async testConnection() {
      this.testingConnection = true;
      this.testResult = null;
      
      try {
        const testData = {
          deviceId: this.device.id,
          ipAddress: this.device.ipAddress,
          ...this.credentials
        };
        
        const response = await DeviceService.testConnection(testData);
        this.testResult = {
          success: true,
          message: response.data.message || 'Conexión exitosa'
        };
      } catch (error) {
        this.testResult = {
          success: false,
          message: error.response?.data?.message || 'Error de conexión'
        };
      } finally {
        this.testingConnection = false;
      }
    },
    
    async submitForm() {
      this.saving = true;
      this.error = null;
      
      try {
        if (this.isEdit) {
          await DeviceService.updateCredentials(this.credentials.id, this.credentials);
        } else {
          await DeviceService.createDeviceCredentials(this.device.id, this.credentials);
        }
        
        // Redirigir de vuelta al detalle del dispositivo
        this.$router.push(`/devices/${this.device.id}`);
      } catch (error) {
        console.error('Error guardando credenciales:', error);
        this.error = error.response?.data?.message || 'Error guardando credenciales.';
      } finally {
        this.saving = false;
      }
    },
    
    cancel() {
      this.$router.push(`/devices/${this.device.id}`);
    },
    
    goBack() {
      this.$router.push(`/devices/${this.device.id}`);
    },
    
    getBrandIcon(brand) {
      const icons = {
        mikrotik: '🔧',
        ubiquiti: '📡',
        tplink: '🌐',
        cambium: '📶',
        mimosa: '🎯'
      };
      return icons[brand] || '🔌';
    }
  }
};
</script>

<style scoped>
.credentials-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #e0e0e0;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.form-container {
  display: grid;
  gap: 20px;
}

.device-info {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.device-icon {
  font-size: 2rem;
}

.device-details h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.device-meta {
  display: flex;
  gap: 10px;
}

.brand, .type, .ip {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f8f9fa;
  color: #495057;
}

.credentials-form-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-of-type {
  border-bottom: none;
}

h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.1em;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
}

.form-group {
  flex: 1;
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

.field-help {
  font-size: 0.8em;
  color: #6c757d;
  margin-top: 4px;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 0;
  width: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.snmpv3-config {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
}

.test-section {
  background: #f8f9fa;
}

.test-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.test-button {
  padding: 12px 24px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  align-self: flex-start;
}

.test-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.test-result {
  padding: 10px;
  border-radius: 4px;
}

.test-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  padding: 10px;
  border-radius: 4px;
}

.test-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.cancel-button, .save-button {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.save-button {
  background: #007bff;
  color: white;
}

.save-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .credentials-form {
    padding: 10px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .device-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .test-container {
    align-items: stretch;
  }
  
  .test-button {
    align-self: stretch;
  }
}
</style>