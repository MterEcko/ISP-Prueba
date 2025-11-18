<template>
  <div class="implementation-form">
    <div class="page-header">
      <h1>{{ isEdit ? 'Editar Implementación' : 'Nueva Implementación de Comando' }}</h1>
      <button @click="goBack" class="btn-secondary">
        ← Volver
      </button>
    </div>

    <form @submit.prevent="saveImplementation" class="form-container">
      <!-- Información Básica -->
      <div class="form-section">
        <h3>📋 Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="commonCommandId">Comando Común *</label>
            <select 
              id="commonCommandId"
              v-model="implementation.commonCommandId"
              required
              :disabled="isEdit"
            >
              <option value="">Seleccionar comando</option>
              <option 
                v-for="command in commands" 
                :key="command.id" 
                :value="command.id"
              >
                {{ command.displayName || command.name }} ({{ command.category }})
              </option>
            </select>
            <span class="field-help">El comando común que implementará esta configuración</span>
          </div>
          
          <div class="form-group">
            <label for="brandId">Marca de Dispositivo *</label>
            <select 
              id="brandId"
              v-model="implementation.brandId"
              @change="onBrandChange"
              required
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
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="familyId">Familia de Dispositivo (Opcional)</label>
            <select 
              id="familyId"
              v-model="implementation.familyId"
              :disabled="!implementation.brandId"
            >
              <option value="">Todas las familias de la marca</option>
              <option 
                v-for="family in availableFamilies" 
                :key="family.id" 
                :value="family.id"
              >
                {{ family.displayName || family.name }}
              </option>
            </select>
            <span class="field-help">Especifica una familia específica o deja vacío para aplicar a toda la marca</span>
          </div>
          
          <div class="form-group">
            <label for="connectionType">Tipo de Conexión *</label>
            <select 
              id="connectionType"
              v-model="implementation.connectionType"
              required
            >
              <option value="">Seleccionar tipo</option>
              <option 
                v-for="type in availableConnectionTypes" 
                :key="type.value" 
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Implementación -->
      <div class="form-section">
        <h3>🔧 Implementación</h3>
        
        <div class="form-group full-width">
          <label for="implementation">Comando/Script/OID *</label>
          <textarea 
            id="implementation"
            v-model="implementation.implementation"
            required
            rows="4"
            :placeholder="getImplementationPlaceholder()"
            class="code-textarea"
          ></textarea>
          <span class="field-help">{{ getImplementationHelp() }}</span>
        </div>

        <div class="form-row" v-if="implementation.connectionType === 'snmp'">
          <div class="form-group">
            <label for="snmpVersion">Versión SNMP</label>
            <select id="snmpVersion" v-model="implementation.snmpVersion">
              <option value="v2c">v2c</option>
              <option value="v3">v3</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="snmpCommunity">Community String</label>
            <input 
              type="text"
              id="snmpCommunity"
              v-model="implementation.snmpCommunity"
              placeholder="public"
            />
          </div>
        </div>
      </div>

      <!-- Parámetros -->
      <div class="form-section">
        <h3>⚙️ Parámetros del Comando</h3>
        
        <div class="parameters-section">
          <div class="parameters-header">
            <span>Parámetros configurados: {{ implementation.parameters?.length || 0 }}</span>
            <button type="button" @click="addParameter" class="btn-small btn-primary">
              + Agregar Parámetro
            </button>
          </div>

          <div v-if="!implementation.parameters || implementation.parameters.length === 0" class="empty-parameters">
            <p>Este comando no requiere parámetros adicionales</p>
          </div>

          <div v-else class="parameters-list">
            <div 
              v-for="(param, index) in implementation.parameters" 
              :key="index"
              class="parameter-item"
            >
              <div class="param-row">
                <div class="param-field">
                  <label>Nombre:</label>
                  <input 
                    type="text"
                    v-model="param.name"
                    placeholder="nombre_parametro"
                  />
                </div>
                
                <div class="param-field">
                  <label>Tipo:</label>
                  <select v-model="param.type">
                    <option value="string">Texto</option>
                    <option value="integer">Número</option>
                    <option value="boolean">Verdadero/Falso</option>
                    <option value="float">Decimal</option>
                  </select>
                </div>
                
                <div class="param-field">
                  <label>Requerido:</label>
                  <input type="checkbox" v-model="param.required" />
                </div>
                
                <div class="param-actions">
                  <button type="button" @click="removeParameter(index)" class="btn-delete-param">
                    🗑️
                  </button>
                </div>
              </div>
              
              <div class="param-row">
                <div class="param-field full-width">
                  <label>Descripción:</label>
                  <input 
                    type="text"
                    v-model="param.description"
                    placeholder="Descripción del parámetro..."
                  />
                </div>
              </div>
              
              <div class="param-row">
                <div class="param-field">
                  <label>Valor por Defecto:</label>
                  <input 
                    type="text"
                    v-model="param.defaultValue"
                    placeholder="Valor opcional por defecto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración Avanzada -->
      <div class="form-section">
        <h3>🔧 Configuración Avanzada</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="timeout">Timeout (segundos)</label>
            <input 
              type="number"
              id="timeout"
              v-model="implementation.timeout"
              min="1"
              max="300"
              placeholder="30"
            />
            <span class="field-help">Tiempo máximo de espera para la ejecución</span>
          </div>
          
          <div class="form-group">
            <label for="retries">Reintentos</label>
            <input 
              type="number"
              id="retries"
              v-model="implementation.retries"
              min="0"
              max="5"
              placeholder="3"
            />
            <span class="field-help">Número de reintentos en caso de fallo</span>
          </div>
        </div>

        <div class="form-group full-width">
          <label for="expectedResponse">Respuesta Esperada</label>
          <textarea 
            id="expectedResponse"
            v-model="implementation.expectedResponse"
            rows="3"
            placeholder="Patrón de respuesta exitosa (regex o texto literal)"
          ></textarea>
          <span class="field-help">Patrón para validar si el comando se ejecutó correctamente</span>
        </div>

        <div class="form-group full-width">
          <label for="script">Script Personalizado</label>
          <textarea 
            id="script"
            v-model="implementation.script"
            rows="6"
            placeholder="Script adicional de procesamiento..."
            class="code-textarea"
          ></textarea>
          <span class="field-help">JavaScript para procesar la respuesta o realizar acciones adicionales</span>
        </div>
      </div>

      <!-- Estado -->
      <div class="form-section">
        <h3>📊 Estado y Activación</h3>
        
        <div class="form-group">
          <label class="toggle-label">
            <input 
              type="checkbox"
              v-model="implementation.active"
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">{{ implementation.active ? 'Activa' : 'Inactiva' }}</span>
          </label>
          <span class="field-help">Las implementaciones inactivas no estarán disponibles para ejecución</span>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="form-actions">
        <button type="button" @click="goBack" class="btn-secondary">
          Cancelar
        </button>
        <button 
          type="button" 
          @click="testImplementation" 
          class="btn-test"
          :disabled="!canTest || testing"
        >
          {{ testing ? '⏳ Probando...' : '🧪 Probar Implementación' }}
        </button>
        <button 
          type="submit" 
          class="btn-primary" 
          :disabled="saving || !isFormValid"
        >
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Implementación
        </button>
      </div>
    </form>

    <!-- Test Results -->
    <div v-if="testResult" class="test-results" :class="testResult.success ? 'success' : 'error'">
      <h4>{{ testResult.success ? '✅ Prueba Exitosa' : '❌ Prueba Fallida' }}</h4>
      <pre>{{ testResult.output }}</pre>
    </div>

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
  name: 'ImplementationForm',
  data() {
    return {
      implementation: {
        commonCommandId: '',
        brandId: '',
        familyId: '',
        connectionType: '',
        implementation: '',
        parameters: [],
        timeout: 30,
        retries: 3,
        expectedResponse: '',
        script: '',
        active: true,
        snmpVersion: 'v2c',
        snmpCommunity: 'public'
      },
      commands: [],
      brands: [],
      families: [],
      availableFamilies: [],
      isEdit: false,
      saving: false,
      testing: false,
      loading: false,
      testResult: null,
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    availableConnectionTypes() {
      return CommandService.getAvailableConnectionTypes();
    },
    isFormValid() {
      return this.implementation.commonCommandId && 
             this.implementation.brandId && 
             this.implementation.connectionType && 
             this.implementation.implementation;
    },
    canTest() {
      return this.isFormValid && !this.isEdit; // Solo permitir pruebas en creación
    }
  },
  created() {
    this.loadInitialData();
    
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const commandId = urlParams.get('commandId');
    if (commandId) {
      this.implementation.commonCommandId = commandId;
    }
    
    const implementationId = this.$route.params.id;
    if (implementationId && implementationId !== 'new') {
      this.isEdit = true;
      this.loadImplementation(implementationId);
    }
  },
  methods: {
    async loadInitialData() {
      try {
        const [commandsResponse, brandsResponse] = await Promise.all([
          CommandService.getAllCommands({ active: true, size: 1000 }),
          CommandService.getAllBrands({ active: true })
        ]);
        
        this.commands = commandsResponse.data.commands || commandsResponse.data || [];
        this.brands = brandsResponse.data.brands || brandsResponse.data || [];
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.errorMessage = 'Error cargando datos iniciales';
      }
    },

    async loadImplementation(id) {
      this.loading = true;
      try {
        const response = await CommandService.getImplementation(id);
        this.implementation = {
          ...this.implementation,
          ...response.data.implementation || response.data
        };
        
        // Cargar familias de la marca seleccionada
        if (this.implementation.brandId) {
          await this.onBrandChange();
        }
      } catch (error) {
        console.error('Error cargando implementación:', error);
        this.errorMessage = 'Error al cargar los datos de la implementación';
      } finally {
        this.loading = false;
      }
    },

    async onBrandChange() {
      if (!this.implementation.brandId) {
        this.availableFamilies = [];
        return;
      }

      try {
        const response = await CommandService.getFamiliesByBrand(this.implementation.brandId);
        this.availableFamilies = response.data.families || response.data || [];
      } catch (error) {
        console.error('Error cargando familias:', error);
        this.availableFamilies = [];
      }
    },

    getImplementationPlaceholder() {
      switch (this.implementation.connectionType) {
        case 'ssh':
          return 'Ejemplo: /system identity print';
        case 'snmp':
          return 'Ejemplo: 1.3.6.1.2.1.1.5.0';
        case 'RouterOs':
          return 'Ejemplo: /system/identity/print';
        case 'api':
          return 'Ejemplo: GET /api/system/info';
        default:
          return 'Ingrese el comando, OID o endpoint específico...';
      }
    },

    getImplementationHelp() {
      switch (this.implementation.connectionType) {
        case 'ssh':
          return 'Comando SSH que se ejecutará en el dispositivo';
        case 'snmp':
          return 'OID SNMP para consultar o configurar (ej: 1.3.6.1.2.1.1.5.0)';
        case 'RouterOs':
          return 'Comando para la API de RouterOS de Mikrotik';
        case 'api':
          return 'Endpoint de API REST (incluir método HTTP si es necesario)';
        default:
          return 'Especifique la implementación según el tipo de conexión seleccionado';
      }
    },

    addParameter() {
      if (!this.implementation.parameters) {
        this.implementation.parameters = [];
      }
      
      this.implementation.parameters.push({
        name: '',
        type: 'string',
        description: '',
        defaultValue: '',
        required: false
      });
    },

    removeParameter(index) {
      this.implementation.parameters.splice(index, 1);
    },

    async testImplementation() {
      if (!this.canTest) return;

      this.testing = true;
      this.testResult = null;

      try {
        // Crear implementación temporal para prueba
        // eslint-disable-next-line no-unused-vars
        const tempImpl = {
          ...this.implementation,
          // Incluir datos necesarios para la prueba
        };

        const response = await CommandService.testImplementation('temp', null);
        this.testResult = {
          success: response.data.success,
          output: response.data.output || response.data.message
        };
      } catch (error) {
        this.testResult = {
          success: false,
          output: error.response?.data?.message || 'Error ejecutando prueba'
        };
      } finally {
        this.testing = false;
      }
    },

    async saveImplementation() {
      // Validar datos antes de enviar
      const validationErrors = CommandService.validateImplementationData(this.implementation);
      if (validationErrors.length > 0) {
        this.errorMessage = validationErrors.join(', ');
        return;
      }

      this.saving = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        if (this.isEdit) {
          await CommandService.updateImplementation(this.implementation.id, this.implementation);
          this.successMessage = 'Implementación actualizada correctamente';
        } else {
          // eslint-disable-next-line no-unused-vars
          const response = await CommandService.createImplementation(this.implementation);
          this.successMessage = 'Implementación creada correctamente';
          
          // Redirigir al listado después de crear
          setTimeout(() => {
            this.$router.push('/command-implementations');
          }, 1500);
          return;
        }

        // Limpiar mensaje de éxito después de 3 segundos
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);

      } catch (error) {
        console.error('Error guardando implementación:', error);
        this.errorMessage = error.response?.data?.message || 'Error al guardar la implementación';
      } finally {
        this.saving = false;
      }
    },

    goBack() {
      this.$router.push('/command-implementations');
    }
  }
};
</script>

<style scoped>
.implementation-form {
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

.code-textarea {
  font-family: 'Courier New', monospace;
  background: #2c3e50;
  color: #ecf0f1;
  border: 2px solid #34495e;
}

.code-textarea:focus {
  border-color: #3498db;
  background: #2c3e50;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.field-help {
  display: block;
  color: #7f8c8d;
  font-size: 12px;
  margin-top: 5px;
  font-style: italic;
}

/* Parameters Section */
.parameters-section {
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  padding: 20px;
}

.parameters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ecf0f1;
}

.empty-parameters {
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  padding: 20px;
}

.parameters-list {
  space-y: 20px;
}

.parameter-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
}

.param-row {
  display: flex;
  gap: 15px;
  margin-bottom: 10px;
  align-items: end;
}

.param-field {
  flex: 1;
}

.param-field.full-width {
  flex: 100%;
}

.param-field label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #6c757d;
}

.param-field input, .param-field select {
  padding: 8px;
  font-size: 13px;
}

.param-actions {
  flex: 0 0 auto;
}

.btn-delete-param {
  padding: 8px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
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
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 25px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

/* Test Results */
.test-results {
  margin-top: 20px;
  padding: 20px;
  border-radius: 6px;
  border-left: 4px solid;
}

.test-results.success {
  background: #d5f4e6;
  border-color: #27ae60;
}

.test-results.error {
  background: #fadbd8;
  border-color: #e74c3c;
}

.test-results h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.test-results pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0;
  font-size: 13px;
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

/* Responsive */
@media (max-width: 768px) {
  .implementation-form {
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
  
  .form-actions {
    flex-direction: column;
  }
  
  .param-row {
    flex-direction: column;
    gap: 10px;
  }
  
  .parameters-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>