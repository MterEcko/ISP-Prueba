<template>
  <div class="tplink-settings">
    <h3>Configuración Específica TP-Link</h3>
    
    <p class="text-muted">
      Configure los parámetros específicos para dispositivos TP-Link {{ deviceType === 'pharos' ? 'Pharos' : 'Omada' }}
    </p>
    
    <div class="form-grid">
      <!-- Configuración específica para dispositivos Pharos -->
      <template v-if="deviceType === 'pharos'">
        <div class="form-group">
          <label for="wirelessMode">Modo Inalámbrico</label>
          <select id="wirelessMode" v-model="pharosSettings.wirelessMode">
            <option value="ap">Punto de Acceso</option>
            <option value="client">Cliente</option>
            <option value="repeater">Repetidor</option>
            <option value="bridge">Puente</option>
            <option value="ap-router">AP+Router</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="ssid">SSID</label>
          <input 
            type="text" 
            id="ssid" 
            v-model="pharosSettings.ssid" 
            placeholder="Nombre de la red WiFi"
          />
        </div>
      </template>
      
      <!-- Configuración específica para controladores Omada -->
      <template v-else>
        <div class="form-group">
          <label for="isController">Tipo de Dispositivo</label>
          <select id="isController" v-model="omadaSettings.isController">
            <option :value="true">Controlador Omada</option>
            <option :value="false">Dispositivo Gestionado</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="siteId">Sitio Predeterminado</label>
          <input 
            type="text" 
            id="siteId" 
            v-model="omadaSettings.siteId" 
            placeholder="Identificador del sitio (Ej: Default)"
          />
        </div>
        
        <div class="form-group">
          <label for="controllerVersion">Versión del Controlador</label>
          <select id="controllerVersion" v-model="omadaSettings.controllerVersion">
            <option value="v1">V1</option>
            <option value="v2">V2</option>
            <option value="v3">V3</option>
          </select>
        </div>
      </template>
      
      <!-- Configuración común para ambos tipos -->
      <div class="form-group">
        <label for="https">Usar HTTPS</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="https" 
            v-model="commonSettings.https"
          />
          <label for="https">{{ commonSettings.https ? 'Sí' : 'No' }}</label>
        </div>
      </div>
      
      <div class="form-group">
        <label for="validateCert">Validar Certificado</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="validateCert" 
            v-model="commonSettings.validateCert"
          />
          <label for="validateCert">{{ commonSettings.validateCert ? 'Sí' : 'No' }}</label>
        </div>
      </div>
      
      <div class="form-group">
        <label for="snmpCommunity">Comunidad SNMP</label>
        <input 
          type="text" 
          id="snmpCommunity" 
          v-model="commonSettings.snmpCommunity" 
          placeholder="public"
        />
      </div>
      
      <div class="form-group">
        <label for="snmpEnabled">SNMP Habilitado</label>
        <div class="toggle-switch">
          <input 
            type="checkbox" 
            id="snmpEnabled" 
            v-model="commonSettings.snmpEnabled"
          />
          <label for="snmpEnabled">{{ commonSettings.snmpEnabled ? 'Sí' : 'No' }}</label>
        </div>
      </div>
    </div>
    
    <div class="test-connection">
      <h4>Probar Conexión</h4>
      <p>
        Pruebe la conexión al dispositivo con las credenciales y configuración proporcionadas.
      </p>
      
      <button class="btn" @click="testConnection" :disabled="testingConnection">
        {{ testingConnection ? 'Probando...' : 'Probar Conexión' }}
      </button>
      
      <div v-if="testResult !== null" class="test-result mt-3" :class="{ success: testResult }">
        <strong>{{ testResult ? 'Éxito:' : 'Error:' }}</strong> 
        {{ testResultMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import TPLinkService from '../services/tplink.service';

export default {
  name: 'TPLinkDeviceForm',
  props: {
    deviceType: {
      type: String,
      default: 'pharos', // 'pharos' o 'omada'
      validator: value => ['pharos', 'omada'].includes(value)
    },
    ipAddress: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    apiPort: {
      type: [Number, String],
      default: 80
    },
    initialConfig: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      // Configuración para Pharos
      pharosSettings: {
        wirelessMode: this.initialConfig.wirelessMode || 'ap',
        ssid: this.initialConfig.ssid || ''
      },
      
      // Configuración para Omada
      omadaSettings: {
        isController: this.initialConfig.isController !== false,
        siteId: this.initialConfig.siteId || 'Default',
        controllerVersion: this.initialConfig.controllerVersion || 'v2'
      },
      
      // Configuración común
      commonSettings: {
        https: this.initialConfig.https !== false,
        validateCert: this.initialConfig.validateCert !== false,
        snmpCommunity: this.initialConfig.snmpCommunity || 'public',
        snmpEnabled: this.initialConfig.snmpEnabled !== false
      },
      
      // Estado de prueba de conexión
      testingConnection: false,
      testResult: null,
      testResultMessage: ''
    };
  },
  computed: {
    // Configuración combinada para emitir
    config() {
      const baseConfig = {
        ...this.commonSettings
      };
      
      if (this.deviceType === 'pharos') {
        return {
          ...baseConfig,
          ...this.pharosSettings
        };
      } else {
        return {
          ...baseConfig,
          ...this.omadaSettings
        };
      }
    }
  },
  methods: {
    // Probar conexión al dispositivo
    async testConnection() {
      this.testingConnection = true;
      this.testResult = null;
      this.testResultMessage = '';
      
      try {
        const connectionData = {
          ipAddress: this.ipAddress,
          port: this.apiPort,
          username: this.username,
          password: this.password,
          type: this.deviceType,
          https: this.commonSettings.https,
          validateCert: this.commonSettings.validateCert
        };
        
        const response = await TPLinkService.testConnection(connectionData);
        
        this.testResult = response.data.success;
        this.testResultMessage = response.data.message;
        
        // Emitir evento de prueba completada
        this.$emit('test-completed', {
          success: this.testResult,
          message: this.testResultMessage
        });
      } catch (error) {
        console.error('Error probando conexión:', error);
        this.testResult = false;
        this.testResultMessage = 'Error de conexión: ' + (error.response?.data?.message || error.message);
        
        // Emitir evento de error
        this.$emit('test-completed', {
          success: false,
          message: this.testResultMessage
        });
      } finally {
        this.testingConnection = false;
      }
    },
    
    // Obtener configuración actual
    getConfig() {
      return this.config;
    }
  },
  watch: {
    // Emitir eventos cuando cambia la configuración
    config: {
      deep: true,
      handler(newConfig) {
        this.$emit('config-changed', newConfig);
      }
    }
  }
};
</script>

<style scoped>
.tplink-settings {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: #f9f9f9;
}

.text-muted {
  color: var(--text-secondary);
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.toggle-switch input:checked + label {
  background-color: var(--primary);
}

.test-connection {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.test-result {
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  background-color: #ffe0e0;
  color: #c00;
}

.test-result.success {
  background-color: #e0ffe0;
  color: #0c0;
}

.mt-3 {
  margin-top: 15px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>