<template>
  <div class="network-configuration">
    <!-- PPPoE Configuration -->
    <div class="config-section">
      <h5>🌐 Configuración PPPoE</h5>
      
      <div class="form-row">
        <!-- Username -->
        <div class="form-group">
          <label for="pppoeUsername">
            Usuario PPPoE *
            <span class="info-tooltip" title="Nombre de usuario para autenticación PPPoE">ℹ️</span>
          </label>
          <div class="username-input-group">
            <input
              type="text"
              id="pppoeUsername"
              :value="modelPppoeConfig.username"
              @input="updateUsername"
              :placeholder="suggestedUsername"
              :disabled="!allowUsernameEdit"
              pattern="[a-z0-9_]{3,20}"
              class="username-input"
            />
            <button 
              type="button" 
              @click="generateUsername" 
              class="btn-generate"
              :disabled="!allowUsernameEdit"
              title="Generar usuario automáticamente"
            >
              🎯
            </button>
          </div>
          <small class="help-text">
            <template v-if="operationType === 'CREATE_NEW'">
              3-20 caracteres (solo letras, números y _). Dejar vacío para generar automáticamente.
            </template>
            <template v-else>
              Usuario actual preservado para evitar interrupciones del servicio.
            </template>
          </small>
        </div>

        <!-- Password -->
        <div class="form-group">
          <label for="pppoePassword">
            Contraseña PPPoE
            <span class="info-tooltip" title="Contraseña para autenticación PPPoE">ℹ️</span>
          </label>
          <div class="password-input-group">
            <input
              :type="showPassword ? 'text' : 'password'"
              id="pppoePassword"
              :value="modelPppoeConfig.password"
              @input="updatePassword"
              :placeholder="allowPasswordEdit ? 'Generar automáticamente si se deja vacío' : 'Contraseña preservada'"
              :disabled="!allowPasswordEdit"
              class="password-input"
            />
            <button 
              type="button" 
              @click="togglePasswordVisibility" 
              class="btn-toggle-password"
              :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
            <button 
              type="button" 
              @click="generatePassword" 
              class="btn-generate"
              :disabled="!allowPasswordEdit"
              title="Generar contraseña segura"
            >
              🔑
            </button>
          </div>
          <small class="help-text">
            <template v-if="allowPasswordEdit">
              Dejar vacío para generar automáticamente una contraseña segura.
            </template>
            <template v-else>
              Contraseña actual preservada por seguridad.
            </template>
          </small>
        </div>
      </div>

      <!-- Preserve credentials toggle (for changes) -->
      <div class="form-group" v-if="operationType !== 'CREATE_NEW'">
        <div class="toggle-group">
          <input
            type="checkbox"
            id="preserveCredentials"
            :checked="modelPppoeConfig.preserveCredentials"
            @change="updatePreserveCredentials"
          />
          <label for="preserveCredentials">
            🔒 Preservar credenciales actuales
          </label>
        </div>
        <small class="help-text">
          Mantener usuario y contraseña existentes para evitar reconfiguración en dispositivos del cliente.
        </small>
      </div>
    </div>

    <!-- IP Pool Selection -->
    <div class="config-section" v-if="showIpPoolSelection">
      <h5>🌊 Pool de IPs</h5>
      
      <div class="form-group">
        <label for="ipPool">
          Pool de IPs *
          <span class="info-tooltip" title="Rango de IPs del cual se asignará la IP del cliente">ℹ️</span>
        </label>
        <select
          id="ipPool"
          :value="modelIpPoolId"
          @change="updateIpPool"
          :disabled="!allowIpPoolChange"
        >
          <option value="">Seleccionar pool de IPs</option>
          <option 
            v-for="pool in availablePools" 
            :key="pool.id" 
            :value="pool.id"
            :disabled="!pool.active || pool.availableIps <= 0"
          >
            {{ pool.poolName }} - {{ pool.networkAddress }} 
            ({{ pool.availableIps }} IPs disponibles)
          </option>
        </select>
        <small class="help-text" v-if="!allowIpPoolChange">
          Pool actual preservado para {{ operationType === 'CHANGE_PLAN' ? 'cambio de plan' : 'mantener conectividad' }}.
        </small>
      </div>

      <!-- Pool information -->
      <div class="pool-info" v-if="selectedPool">
        <div class="pool-details">
          <div class="pool-detail-item">
            <span class="detail-label">Red:</span>
            <span class="detail-value">{{ selectedPool.networkAddress }}</span>
          </div>
          <div class="pool-detail-item">
            <span class="detail-label">Gateway:</span>
            <span class="detail-value">{{ selectedPool.gateway }}</span>
          </div>
          <div class="pool-detail-item">
            <span class="detail-label">DNS:</span>
            <span class="detail-value">{{ selectedPool.dnsPrimary }}, {{ selectedPool.dnsSecondary }}</span>
          </div>
          <div class="pool-detail-item">
            <span class="detail-label">IPs disponibles:</span>
            <span class="detail-value">{{ selectedPool.availableIps }}/{{ selectedPool.totalIps }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Static IP Configuration (Optional) -->
    <div class="config-section" v-if="showStaticIpOption">
      <h5>📍 IP Estática (Opcional)</h5>
      
      <div class="form-group">
        <div class="toggle-group">
          <input
            type="checkbox"
            id="useStaticIp"
            v-model="useStaticIp"
            @change="toggleStaticIp"
          />
          <label for="useStaticIp">
            Asignar IP estática específica
          </label>
        </div>
      </div>

      <div class="static-ip-config" v-if="useStaticIp">
        <div class="form-group">
          <label for="staticIp">Dirección IP Estática</label>
          <input
            type="text"
            id="staticIp"
            v-model="staticIp"
            placeholder="192.168.1.100"
            pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
            @input="validateStaticIp"
          />
          <small class="help-text">
            IP específica a asignar al cliente (debe estar dentro del rango del pool).
          </small>
        </div>
      </div>
    </div>

    <!-- Advanced Network Settings -->
    <div class="config-section" v-if="showAdvancedSettings">
      <div class="section-header" @click="toggleAdvancedSettings">
        <h5>⚙️ Configuración Avanzada</h5>
        <span class="toggle-indicator">{{ showAdvanced ? '▼' : '▶' }}</span>
      </div>
      
      <div class="advanced-settings" v-show="showAdvanced">
        <!-- DNS Override -->
        <div class="form-row">
          <div class="form-group">
            <label for="dnsPrimary">DNS Primario</label>
            <input
              type="text"
              id="dnsPrimary"
              v-model="advancedConfig.dnsPrimary"
              placeholder="Usar DNS del pool"
            />
          </div>
          <div class="form-group">
            <label for="dnsSecondary">DNS Secundario</label>
            <input
              type="text"
              id="dnsSecondary"
              v-model="advancedConfig.dnsSecondary"
              placeholder="Usar DNS del pool"
            />
          </div>
        </div>

        <!-- Connection limits -->
        <div class="form-row">
          <div class="form-group">
            <label for="sessionTimeout">Tiempo de Sesión (minutos)</label>
            <input
              type="number"
              id="sessionTimeout"
              v-model="advancedConfig.sessionTimeout"
              min="0"
              max="1440"
              placeholder="Sin límite"
            />
          </div>
          <div class="form-group">
            <label for="idleTimeout">Tiempo de Inactividad (minutos)</label>
            <input
              type="number"
              id="idleTimeout"
              v-model="advancedConfig.idleTimeout"
              min="0"
              max="120"
              placeholder="Sin límite"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Summary -->
    <div class="config-summary" v-if="showSummary">
      <h5>📋 Resumen de Configuración</h5>
      <div class="summary-items">
        <div class="summary-item">
          <span class="summary-label">Usuario PPPoE:</span>
          <span class="summary-value">{{ effectiveUsername || 'Se generará automáticamente' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Contraseña:</span>
          <span class="summary-value">{{ effectivePassword ? '••••••••' : 'Se generará automáticamente' }}</span>
        </div>
        <div class="summary-item" v-if="selectedPool">
          <span class="summary-label">Pool de IPs:</span>
          <span class="summary-value">{{ selectedPool.poolName }} ({{ selectedPool.networkAddress }})</span>
        </div>
        <div class="summary-item" v-if="useStaticIp && staticIp">
          <span class="summary-label">IP Estática:</span>
          <span class="summary-value">{{ staticIp }}</span>
        </div>
      </div>
    </div>

    <!-- Validation Errors -->
    <div class="validation-errors" v-if="validationErrors.length > 0">
      <div class="error-item" v-for="error in validationErrors" :key="error.code">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ error.message }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'

export default {
  name: 'NetworkConfiguration',
  props: {
    modelPppoeConfig: {
      type: Object,
      required: true
    },
    modelIpPoolId: {
      type: [Number, String],
      default: null
    },
    availablePools: {
      type: Array,
      default: () => []
    },
    suggestedUsername: {
      type: String,
      default: ''
    },
    operationType: {
      type: String,
      required: true
    },
    targetNodeId: {
      type: [Number, String],
      default: null
    },
    showAdvancedSettings: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelPppoeConfig', 'update:modelIpPoolId', 'configChanged'],
  setup(props, { emit }) {
    // ===============================
    // ESTADO LOCAL
    // ===============================
    
    const showPassword = ref(false)
    const showAdvanced = ref(false)
    const useStaticIp = ref(false)
    const staticIp = ref('')
    const validationErrors = ref([])
    
    const advancedConfig = ref({
      dnsPrimary: '',
      dnsSecondary: '',
      sessionTimeout: null,
      idleTimeout: null
    })

    // ===============================
    // COMPUTED PROPERTIES
    // ===============================
    
    const allowUsernameEdit = computed(() => {
      return props.operationType === 'CREATE_NEW' || !props.modelPppoeConfig.preserveCredentials
    })

    const allowPasswordEdit = computed(() => {
      return props.operationType === 'CREATE_NEW' || !props.modelPppoeConfig.preserveCredentials
    })

    const allowIpPoolChange = computed(() => {
      // Solo permitir cambio de pool en nuevas suscripciones o cambios de nodo/zona
      return ['CREATE_NEW', 'CHANGE_NODE', 'CHANGE_ZONE'].includes(props.operationType)
    })

    const showIpPoolSelection = computed(() => {
      return props.operationType === 'CREATE_NEW' || allowIpPoolChange.value
    })

    const showStaticIpOption = computed(() => {
      return props.operationType === 'CREATE_NEW' && selectedPool.value
    })

    const showSummary = computed(() => {
      return effectiveUsername.value || selectedPool.value
    })

    const selectedPool = computed(() => {
      if (!props.modelIpPoolId || !props.availablePools.length) return null
      return props.availablePools.find(pool => pool.id == props.modelIpPoolId)
    })

    const effectiveUsername = computed(() => {
      return props.modelPppoeConfig.username || props.suggestedUsername
    })

    const effectivePassword = computed(() => {
      return props.modelPppoeConfig.password
    })

    // ===============================
    // MÉTODOS
    // ===============================
    
    const updateUsername = (event) => {
      const value = event.target.value
      console.log('👤 Usuario PPPoE actualizado:', value)
      
      const updatedConfig = { ...props.modelPppoeConfig, username: value }
      emit('update:modelPppoeConfig', updatedConfig)
      
      validateUsername(value)
      emitConfigChange()
    }

    const updatePassword = (event) => {
      const value = event.target.value
      console.log('🔑 Contraseña PPPoE actualizada')
      
      const updatedConfig = { ...props.modelPppoeConfig, password: value }
      emit('update:modelPppoeConfig', updatedConfig)
      
      validatePassword(value)
      emitConfigChange()
    }

    const updatePreserveCredentials = (event) => {
      const preserve = event.target.checked
      console.log('🔒 Preservar credenciales:', preserve)
      
      const updatedConfig = { ...props.modelPppoeConfig, preserveCredentials: preserve }
      emit('update:modelPppoeConfig', updatedConfig)
      
      emitConfigChange()
    }

    const updateIpPool = (event) => {
      const poolId = event.target.value
      console.log('🌊 Pool de IP actualizado:', poolId)
      
      emit('update:modelIpPoolId', poolId || null)
      
      validateIpPool(poolId)
      emitConfigChange()
    }

    const generateUsername = () => {
      const username = props.suggestedUsername || generateRandomUsername()
      console.log('🎯 Usuario generado automáticamente:', username)
      
      const updatedConfig = { ...props.modelPppoeConfig, username }
      emit('update:modelPppoeConfig', updatedConfig)
      
      emitConfigChange()
    }

    const generatePassword = () => {
      const password = generateSecurePassword()
      console.log('🔑 Contraseña generada automáticamente')
      
      const updatedConfig = { ...props.modelPppoeConfig, password }
      emit('update:modelPppoeConfig', updatedConfig)
      
      emitConfigChange()
    }

    const generateRandomUsername = () => {
      const prefixes = ['user', 'client', 'cpe']
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
      return `${prefix}${suffix}`
    }

    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
    }

    const toggleAdvancedSettings = () => {
      showAdvanced.value = !showAdvanced.value
    }

    const toggleStaticIp = () => {
      if (!useStaticIp.value) {
        staticIp.value = ''
      }
      emitConfigChange()
    }

    // ===============================
    // VALIDACIONES
    // ===============================
    
    const validateUsername = (username) => {
      clearValidationError('USERNAME')
      
      if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
        addValidationError('USERNAME', 'El usuario debe tener 3-20 caracteres (solo letras minúsculas, números y _)')
      }
    }

    const validatePassword = (password) => {
      clearValidationError('PASSWORD')
      
      if (password && password.length < 6) {
        addValidationError('PASSWORD', 'La contraseña debe tener al menos 6 caracteres')
      }
    }

    const validateIpPool = (poolId) => {
      clearValidationError('IP_POOL')
      
      if (props.operationType === 'CREATE_NEW' && !poolId) {
        addValidationError('IP_POOL', 'Debe seleccionar un pool de IPs')
      }
    }

    const validateStaticIp = () => {
      clearValidationError('STATIC_IP')
      
      if (useStaticIp.value && staticIp.value) {
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
        if (!ipRegex.test(staticIp.value)) {
          addValidationError('STATIC_IP', 'Formato de IP inválido')
        }
        // Aquí podrías agregar validación adicional para verificar que la IP esté en el rango del pool
      }
    }

    const addValidationError = (code, message) => {
      const existingIndex = validationErrors.value.findIndex(error => error.code === code)
      const error = { code, message }
      
      if (existingIndex >= 0) {
        validationErrors.value[existingIndex] = error
      } else {
        validationErrors.value.push(error)
      }
    }

    const clearValidationError = (code) => {
      const index = validationErrors.value.findIndex(error => error.code === code)
      if (index >= 0) {
        validationErrors.value.splice(index, 1)
      }
    }

    const emitConfigChange = () => {
      const configData = {
        pppoeConfig: props.modelPppoeConfig,
        ipPoolId: props.modelIpPoolId,
        staticIp: useStaticIp.value ? staticIp.value : null,
        advancedConfig: advancedConfig.value,
        isValid: validationErrors.value.length === 0,
        warnings: getConfigWarnings()
      }
      
      emit('configChanged', configData)
    }

    const getConfigWarnings = () => {
      const warnings = []
      
      if (!props.modelPppoeConfig.username && !props.suggestedUsername) {
        warnings.push('Usuario PPPoE se generará automáticamente')
      }
      
      if (!props.modelPppoeConfig.password) {
        warnings.push('Contraseña se generará automáticamente')
      }
      
      return warnings
    }

    // ===============================
    // WATCHERS
    // ===============================
    
    watch(() => props.operationType, (newType) => {
      console.log('🔄 Tipo de operación cambiado:', newType)
      
      // Limpiar errores de validación
      validationErrors.value = []
      
      // Resetear configuración avanzada si es necesario
      if (newType !== 'CREATE_NEW') {
        showAdvanced.value = false
        useStaticIp.value = false
      }
    })

    watch(() => staticIp.value, validateStaticIp)

    // ===============================
    // LIFECYCLE
    // ===============================
    
    onMounted(() => {
      // Validaciones iniciales
      if (props.modelPppoeConfig.username) {
        validateUsername(props.modelPppoeConfig.username)
      }
      if (props.modelPppoeConfig.password) {
        validatePassword(props.modelPppoeConfig.password)
      }
      if (props.modelIpPoolId) {
        validateIpPool(props.modelIpPoolId)
      }
      
      // Emitir configuración inicial
      emitConfigChange()
    })

    return {
      // Estado
      showPassword,
      showAdvanced,
      useStaticIp,
      staticIp,
      validationErrors,
      advancedConfig,
      
      // Computed
      allowUsernameEdit,
      allowPasswordEdit,
      allowIpPoolChange,
      showIpPoolSelection,
      showStaticIpOption,
      showSummary,
      selectedPool,
      effectiveUsername,
      effectivePassword,
      
      // Métodos
      updateUsername,
      updatePassword,
      updatePreserveCredentials,
      updateIpPool,
      generateUsername,
      generatePassword,
      togglePasswordVisibility,
      toggleAdvancedSettings,
      toggleStaticIp,
      validateStaticIp
    }
  }
}
</script>

<style scoped>
.network-configuration {
  width: 100%;
}

.config-section {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
}

.config-section h5 {
  margin: 0 0 16px 0;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle-indicator {
  color: #666;
  font-size: 0.9em;
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

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: bold;
  color: #555;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-tooltip {
  cursor: help;
  color: #2196f3;
}

.username-input-group, .password-input-group {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.username-input, .password-input {
  flex: 1;
  border: none;
  padding: 10px;
  font-size: 1em;
  outline: none;
}

.username-input:disabled, .password-input:disabled {
  background-color: #f5f5f5;
  color: #666;
}

.btn-generate, .btn-toggle-password {
  background-color: #f5f5f5;
  border: none;
  border-left: 1px solid #ddd;
  padding: 10px 12px;
  cursor: pointer;
  color: #666;
  transition: background-color 0.2s;
}

.btn-generate:hover, .btn-toggle-password:hover {
  background-color: #e0e0e0;
}

.btn-generate:disabled, .btn-toggle-password:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.toggle-group label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.help-text {
  display: block;
  margin-top: 4px;
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

/* Pool information */
.pool-info {
  margin-top: 12px;
  padding: 12px;
  background-color: #f0f4f8;
  border-radius: 4px;
  border-left: 3px solid #2196f3;
}

.pool-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.pool-detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
}

.detail-label {
  color: #666;
  font-weight: bold;
}

.detail-value {
  color: #333;
  font-family: monospace;
}

/* Static IP Configuration */
.static-ip-config {
  margin-top: 12px;
  padding: 12px;
  background-color: #fff3e0;
  border-radius: 4px;
  border-left: 3px solid #ff9800;
}

/* Advanced Settings */
.advanced-settings {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #ddd;
}

/* Configuration Summary */
.config-summary {
  background-color: #e8f5e9;
  border-radius: 6px;
  padding: 16px;
  margin-top: 20px;
  border-left: 4px solid #4caf50;
}

.config-summary h5 {
  margin: 0 0 12px 0;
  color: #2e7d32;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
}

.summary-label {
  color: #666;
  font-weight: bold;
}

.summary-value {
  color: #333;
  font-family: monospace;
}

/* Validation Errors */
.validation-errors {
  margin-top: 16px;
}

.error-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #ffebee;
  border: 1px solid #f44336;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 0.9em;
}

.error-icon {
  flex-shrink: 0;
}

.error-message {
  color: #c62828;
}

/* Form controls styling */
input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

input:focus, select:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

input:disabled, select:disabled {
  background-color: #f5f5f5;
  color: #666;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .pool-details {
    grid-template-columns: 1fr;
  }
  
  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .username-input-group, .password-input-group {
    flex-wrap: wrap;
  }
  
  .btn-generate, .btn-toggle-password {
    min-width: 44px;
  }
}

</style>