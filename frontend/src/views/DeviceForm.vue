<template>
  <div class="device-form">
    <h2>{{ isEdit ? 'Editar Dispositivo' : 'Nuevo Dispositivo' }}</h2>
    
    <form @submit.prevent="submitForm" class="form-container">
      <!-- Información Básica -->
      <div class="form-section">
        <h3>Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="serialNumber">Número de Serie</label>
            <input 
              type="text"
              id="serialNumber"
              v-model="device.serialNumber"
              placeholder="Ej: ABC123456789"
              @blur="searchInventoryBySerial"
            />
            <span class="field-help">Si existe en inventario, se cargarán los datos automáticamente</span>
          </div>

          <div class="form-group">
            <label for="macAddress">MAC Address</label>
            <input 
              type="text"
              id="macAddress"
              v-model="device.macAddress"
              placeholder="AA:BB:CC:DD:EE:FF"
              @blur="searchInventoryByMac"
            />
            <span v-if="macError" class="field-error">{{ macError }}</span>
          </div>
          
          
        </div>
		
<!-- Información del Inventario (si se encuentra) -->
        <div v-if="inventoryData" class="inventory-info">
          <h4>📦 Información del Inventario</h4>
          <div class="inventory-card">
            <div class="inventory-details">
              <p><strong>Numero de serie:</strong> {{ inventoryData.serialNumber }}</p>
              <p><strong>MAC:</strong> {{ inventoryData.macAddress }}</p>
              <p><strong>Nombre:</strong> {{ inventoryData.name }}</p>
              <p><strong>Marca:</strong> {{ inventoryData.brand }}</p>
<!--          <p><strong>Marca:</strong> {{ inventoryData.brand }}</p>-->
              <p><strong>Modelo:</strong> {{ inventoryData.model }}</p>		  
              <p><strong>Estado:</strong> {{ inventoryData.status }}</p>

              <p v-if="inventoryData.location"><strong>Ubicación:</strong> {{ inventoryData.location.name }}</p>
              <p v-if="inventoryData.assignedClient"><strong>Cliente Asignado:</strong> {{ inventoryData.assignedClient.firstName }} {{ inventoryData.assignedClient.lastName }}</p>
            </div>
            <button type="button" @click="useInventoryData" class="btn-use-inventory">
              Usar Datos del Inventario
            </button>
          </div>
        </div>

        <div class="form-row">


          <div class="form-group">
            <label for="name">Nombre del Dispositivo *</label>
            <input 
              type="text"
              id="name"
              v-model="device.name"
              required
              placeholder="Ej: Router-Principal-001"
            />
          </div>
 

          <div class="form-group">
            <label for="brand">Marca *</label>
            <select 
              id="brand"
              v-model="device.brand"
              @change="onBrandChange"
              required
            >
              <option value="">Seleccionar marca</option>
              <option value="mikrotik">Mikrotik</option>
              <option value="ubiquiti">Ubiquiti</option>
              <option value="tplink">TP-Link</option>
              <option value="cambium">Cambium</option>
              <option value="mimosa">Mimosa</option>
              <option value="huawei">Huawei</option>
              <option value="zte">ZTE</option>
              <option value="other">Otra</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="type">Tipo de Dispositivo *</label>
            <select 
              id="type"
              v-model="device.type"
              required
            >
              <option value="">Seleccionar tipo</option>
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="antenna">Antena/AP</option>
              <option value="cpe">CPE</option>
              <option value="ont">ONT (Fibra)</option>
              <option value="olt">OLT (Fibra)</option>
              <option value="other">Otro</option>
            </select>
          </div>          
          
        </div>

        
        
        <div class="form-row">

        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="model">Modelo</label>
            <input 
              type="text"
              id="model"
              v-model="device.model"
              :placeholder="getModelPlaceholder()"
            />
          </div>
          
          <div class="form-group">
            <label for="ipAddress">Dirección IP *</label>
            <input 
              type="text"
              id="ipAddress"
              v-model="device.ipAddress"
              required
              placeholder="192.168.1.100"
              @blur="validateIP"
            />
            <span v-if="ipError" class="field-error">{{ ipError }}</span>
          </div>

          <div class="form-group">
            <label for="firmwareVersion">Versión de Firmware</label>
            <input 
              type="text"
              id="firmwareVersion"
              v-model="device.firmwareVersion"
              placeholder="Ej: 7.1.5"
            />
          </div>
        </div>
        

      </div>
      
      <!-- Credenciales de Acceso -->
      <div class="form-section">
        <h3>Credenciales de Acceso</h3>
        
        <div class="credentials-header">
          <span>Credenciales configuradas: {{ credentials.length }}</span>
          <button type="button" @click="addCredential" class="btn-add">
            + Agregar Credencial
          </button>
        </div>

        <!-- Lista de Credenciales -->
        <div v-if="credentials.length === 0" class="no-credentials">
          <p>No hay credenciales configuradas para este dispositivo</p>
        </div>

        <div v-else class="credentials-list">
          <div 
            v-for="(credential, index) in credentials" 
            :key="index"
            class="credential-item"
            :class="{ active: credential.isActive }"
          >
            <div class="credential-header">
              <div class="credential-type">
                <select v-model="credential.connectionType" @change="onCredentialTypeChange(credential)">
                  <option value="ssh">SSH</option>
                  <option value="snmp">SNMP</option>
                  <option value="api">API</option>
                  <option value="RouterOs">RouterOS</option>
                  <option value="web">Web Interface</option>
                </select>
              </div>
              <div class="credential-actions">
                <button type="button" @click="toggleCredential(index)" class="btn-toggle">
                  {{ credential.isActive ? '✅' : '❌' }}
                </button>
                <button type="button" @click="removeCredential(index)" class="btn-remove">
                  🗑️
                </button>
              </div>
            </div>

            <div class="credential-form">
              <!-- Campos comunes -->
              <div class="form-row">
                <div class="form-group">
                  <label>Usuario</label>
                  <input 
                    type="text"
                    v-model="credential.username"
                    :placeholder="getDefaultUsername(device.brand)"
                  />
                </div>
                
                <div class="form-group">
                  <label>Contraseña</label>
                  <input 
                    type="password"
                    v-model="credential.password"
                    placeholder="Contraseña"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Puerto</label>
                  <input 
                    type="number"
                    v-model="credential.port"
                    :placeholder="getDefaultPort(credential.connectionType, device.brand).toString()"
                  />
                </div>
                
                <!-- Campos específicos para SNMP -->
                <div v-if="credential.connectionType === 'snmp'" class="form-group">
                  <label>Versión SNMP</label>
                  <select v-model="credential.snmpVersion">
                    <option value="v2c">v2c</option>
                    <option value="v3">v3</option>
                  </select>
                </div>
              </div>

              <!-- Campos adicionales para SNMP -->
              <div v-if="credential.connectionType === 'snmp'">
                <div class="form-row">
                  <div class="form-group">
                    <label>Community String</label>
                    <input 
                      type="text"
                      v-model="credential.snmpCommunity"
                      placeholder="public"
                    />
                  </div>
                  
                  <div v-if="credential.snmpVersion === 'v3'" class="form-group">
                    <label>Security Level</label>
                    <select v-model="credential.snmpSecurityLevel">
                      <option value="noAuthNoPriv">No Auth No Priv</option>
                      <option value="authNoPriv">Auth No Priv</option>
                      <option value="authPriv">Auth Priv</option>
                    </select>
                  </div>
                </div>

                <!-- Campos adicionales para SNMPv3 -->
                <div v-if="credential.snmpVersion === 'v3' && credential.snmpSecurityLevel !== 'noAuthNoPriv'">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Auth Protocol</label>
                      <select v-model="credential.snmpAuthProtocol">
                        <option value="MD5">MD5</option>
                        <option value="SHA">SHA</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label>Auth Key</label>
                      <input 
                        type="password"
                        v-model="credential.snmpAuthKey"
                        placeholder="Clave de autenticación"
                      />
                    </div>
                  </div>

                  <div v-if="credential.snmpSecurityLevel === 'authPriv'" class="form-row">
                    <div class="form-group">
                      <label>Priv Protocol</label>
                      <select v-model="credential.snmpPrivProtocol">
                        <option value="DES">DES</option>
                        <option value="AES">AES</option>
                      </select>
                    </div>
                    
                    <div class="form-group">
                      <label>Priv Key</label>
                      <input 
                        type="password"
                        v-model="credential.snmpPrivKey"
                        placeholder="Clave de privacidad"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Campos para SSH -->
              <div v-if="credential.connectionType === 'ssh'" class="form-row">
                <div class="form-group">
                  <label>SSH Key Path (Opcional)</label>
                  <input 
                    type="text"
                    v-model="credential.sshKeyPath"
                    placeholder="/path/to/ssh/key"
                  />
                </div>
              </div>

              <!-- Campos para API 
              <div v-if="credential.connectionType === 'api' || credential.connectionType === 'RouterOs'" class="form-row">
                <div class="form-group">
                  <label>API Key</label>
                  <input 
                    type="text"
                    v-model="credential.apiKey"
                    placeholder="API Key del dispositivo"
                  />
                </div>
              </div>-->

              <!-- Notas para la credencial -->
              <div class="form-group full-width">
                <label>Notas</label>
                <input 
                  type="text"
                  v-model="credential.notes"
                  placeholder="Notas sobre esta credencial..."
                />
              </div>


          <!-- Botón de Prueba de Conexión -->
          <div class="connection-test">
            <button 
              type="button" 
              class="btn btn-outline" 
              @click="testConnection"
              :disabled="testingConnection || !device.ipAddress || !device.username"
            >
              {{ testingConnection ? 'Probando...' : '🔗 Probar Conexión' }}
            </button>
            
            <div v-if="connectionResult" class="result-message" :class="connectionResult.success ? 'success' : 'error'">
              {{ connectionResult.message }}
            </div>
          </div>
              <!-- Prueba de conexión individual -->
              <div class="connection-test">
                <button 
                  type="button" 
                  @click="testSingleCredential(credential, index)" 
                  :disabled="testingCredentials[index]" 
                  class="test-btn"
                >
                  {{ testingCredentials[index] ? '⏳ Probando...' : '🔗 Probar Conexión' }}
                </button>
                
                <div v-if="credentialResults[index]" class="test-result" :class="credentialResults[index].success ? 'success' : 'error'">
                  {{ credentialResults[index].message }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Ubicación en Red -->
      <div class="form-section">
        <h3>Ubicación en Red</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="nodeId">Nodo</label>
            <select 
              id="nodeId"
              v-model="device.nodeId"
              @change="onNodeChange"
            >
              <option value="">Sin nodo asignado</option>
              <option v-for="node in nodes" :key="node.id" :value="node.id">
                {{ node.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="sectorId">Sector</label>
            <select 
              id="sectorId"
              v-model="device.sectorId"
              :disabled="!device.nodeId"
            >
              <option value="">Sin sector asignado</option>
              <option v-for="sector in availableSectors" :key="sector.id" :value="sector.id">
                {{ sector.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="clientId">Cliente Asignado</label>
            <select 
              id="clientId"
              v-model="device.clientId"
              @change="onClientChange"
            >
              <option value="">Sin cliente asignado</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="location">Ubicación Física</label>
            <input 
              type="text"
              id="location"
              v-model="device.location"
              placeholder="Ej: Torre principal, Casa del cliente"
            />
          </div>
        </div>

        <!-- Coordenadas (se llenan automáticamente si se selecciona cliente) -->
        <div class="form-row">
          <div class="form-group">
            <label for="latitude">Latitud</label>
            <input 
              type="number"
              id="latitude"
              v-model="device.latitude"
              step="0.0000001"
              placeholder="Ej: 20.123456"
            />
          </div>
          
          <div class="form-group">
            <label for="longitude">Longitud</label>
            <input 
              type="number"
              id="longitude"
              v-model="device.longitude"
              step="0.0000001"
              placeholder="Ej: -103.123456"
            />
          </div>
        </div>
      </div>
      
      <!-- Configuración Adicional -->
      <div class="form-section">
        <h3>Configuración Adicional</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label>Estado del Dispositivo</label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="device.status" value="online" />
                <span>En línea</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="device.status" value="offline" />
                <span>Fuera de línea</span>
              </label>
              <label class="radio-option">
                <input type="radio" v-model="device.status" value="maintenance" />
                <span>Mantenimiento</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="active">Activo</label>
            <div class="toggle-switch">
              <input 
                type="checkbox"
                id="active"
                v-model="device.active"
              />
              <label for="active" class="switch-label">
                {{ device.active ? 'Activo' : 'Inactivo' }}
              </label>
            </div>
          </div>
        </div>
        
        <div class="form-group full-width">
          <label for="notes">Descripción/Notas</label>
          <textarea 
            id="notes"
            v-model="device.notes"
            rows="3"
            placeholder="Información adicional sobre el dispositivo..."
          ></textarea>
        </div>
      </div>
      
      <!-- Configuración Específica para Fibra Óptica -->
      <div class="form-section" v-if="isFiberDevice">
        <h3>Configuración de Fibra Óptica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="ontSerial">Serial ONT</label>
            <input 
              type="text"
              id="ontSerial"
              v-model="device.ontSerial"
              placeholder="ABCD12345678"
            />
          </div>
          
          <div class="form-group">
            <label for="oltPort">Puerto OLT</label>
            <input 
              type="text"
              id="oltPort"
              v-model="device.oltPort"
              placeholder="1/1/1"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="vlanId">VLAN ID</label>
            <input 
              type="number"
              id="vlanId"
              v-model="device.vlanId"
              min="1"
              max="4094"
            />
          </div>
          
          <div class="form-group">
            <label for="connectorType">Tipo de Conector</label>
            <select id="connectorType" v-model="device.connectorType">
              <option value="">Seleccionar</option>
              <option value="SC/APC">SC/APC</option>
              <option value="SC/UPC">SC/UPC</option>
              <option value="LC/APC">LC/APC</option>
              <option value="LC/UPC">LC/UPC</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Botones de Acción -->
      <div class="form-actions">
        <button type="button" @click="cancel" class="cancel-button">
          Cancelar
        </button>
        <button type="submit" class="save-button" :disabled="loading || !isFormValid">
          {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }} Dispositivo
        </button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';
import InventoryService from '../services/inventory.service';
import NetworkService from '../services/network.service';
import ClientService from '../services/client.service';
// eslint-disable-next-line no-unused-vars
import MikrotikService from '../services/mikrotik.service';

export default {
  name: 'DeviceForm',
  data() {
    return {
      device: {
        name: '',
        brand: '',
        type: '',
        model: '',
        ipAddress: '',
        macAddress: '',
        nodeId: '',
        sectorId: '',
        clientId: '',
        location: '',
        latitude: null,
        longitude: null,
        firmwareVersion: '',
        serialNumber: '',
        status: 'offline',
        active: true,
        notes: '',
        // Campos específicos para fibra
        ontSerial: '',
        oltPort: '',
        vlanId: null,
        connectorType: ''
      },
      credentials: [],
      nodes: [],
      sectors: [],
      clients: [],
      availableSectors: [],
      inventoryData: null,
      isEdit: false,
      loading: false,
      errorMessage: '',
      successMessage: '',
      ipError: '',
      macError: '',
      testingCredentials: {},
      credentialResults: {}
    };
  },
  computed: {
    isFiberDevice() {
      return ['ont', 'olt', 'fiber_ont', 'fiber_olt'].includes(this.device.type);
    },
    isFormValid() {
      return this.device.name && 
             this.device.brand && 
             this.device.type && 
             this.device.ipAddress && 
             !this.ipError && 
             !this.macError;
    }
  },
 

  created() {
    // Obtener parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const brandParam = urlParams.get('brand');
    
    if (brandParam) {
      this.device.brand = brandParam;
      this.onBrandChange();
    }
    
    this.loadInitialData();
    const deviceId = this.$route.params.id;
    if (deviceId && deviceId !== 'new') {
      this.isEdit = true;
      this.loadDevice(deviceId);
    }
  },
  


  methods: {
    async loadInitialData() {
      try {
        const [nodesResponse, sectorsResponse, clientsResponse] = await Promise.all([
          NetworkService.getAllNodes({ active: true }),
          NetworkService.getAllSectors({ active: true }),
          ClientService.getAllClients({ active: true, size: 1000 })
        ]);
        
        this.nodes = nodesResponse.data.nodes || nodesResponse.data || [];
        this.sectors = sectorsResponse.data.sectors || sectorsResponse.data || [];
        this.clients = clientsResponse.data.clients || clientsResponse.data || [];
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
        this.errorMessage = 'Error cargando datos. Por favor, intente nuevamente.';
      }
    },
    
    async loadDevice(id) {
      this.loading = true;
      try {
        const response = await DeviceService.getDevice(id);
        const deviceData = response.data.device || response.data;
        
        // Mapear datos del dispositivo
        this.device = {
          ...this.device,
          ...deviceData
        };
        
        // Cargar credenciales del dispositivo
        await this.loadDeviceCredentials(id);
        
        // Cargar sectores del nodo seleccionado
        if (this.device.nodeId) {
          this.onNodeChange();
        }
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.errorMessage = 'Error cargando datos del dispositivo.';
      } finally {
        this.loading = false;
      }
    },

    async loadDeviceCredentials(deviceId) {
      try {
        const response = await DeviceService.getDeviceCredentials(deviceId);
        const credentialsData = response.data.credentials || response.data || [];
        this.credentials = Array.isArray(credentialsData) ? credentialsData : [];
      } catch (error) {
        console.error('Error cargando credenciales:', error);
        this.credentials = [];
      }
    },
	

    async searchInventoryByMac() {
      if (!this.device.macAddress || this.device.macAddress.length < 3) {
        this.inventoryData = null;
        return;
      }

      try {
        const response = await InventoryService.searchInventoryByMac(this.device.macAddress);
        const items = response.data.items || [];
        
        if (items.length > 0) {
          this.inventoryData = items[0]; // Tomar el primer resultado
          console.log('Datos del inventario encontrados:', this.inventoryData);
        } else {
          this.inventoryData = null;
        }
      } catch (error) {
        console.error('Error buscando en inventario:', error);
        this.inventoryData = null;
      }
    },

    async searchInventoryBySerial() {
      if (!this.device.serialNumber || this.device.serialNumber.length < 3) {
        this.inventoryData = null;
        return;
      }

      try {
        const response = await InventoryService.searchInventoryBySerial(this.device.serialNumber);
        const items = response.data.items || [];
        
        if (items.length > 0) {
          this.inventoryData = items[0]; // Tomar el primer resultado
          console.log('Datos del inventario encontrados:', this.inventoryData);
        } else {
          this.inventoryData = null;
        }
      } catch (error) {
        console.error('Error buscando en inventario:', error);
        this.inventoryData = null;
      }
    },

    useInventoryData() {
      if (!this.inventoryData) return;

      // Llenar campos automáticamente
      this.device.name = this.inventoryData.name || this.device.name;
      this.device.brand = this.inventoryData.brand?.toLowerCase() || this.device.brand;
      this.device.model = this.inventoryData.model || this.device.model;
      this.device.macAddress = this.inventoryData.macAddress || this.device.macAddress;

      // Si hay cliente asignado, seleccionarlo
      if (this.inventoryData.assignedClient) {
        this.device.clientId = this.inventoryData.assignedClient.id;
        this.onClientChange(); // Esto cargará las coordenadas del cliente
      }

      // Si hay ubicación, usarla
      if (this.inventoryData.location) {
        this.device.location = this.inventoryData.location.name;
      }

      this.successMessage = 'Datos del inventario aplicados correctamente';
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    },
    
    onBrandChange() {
      // Agregar credencial por defecto según la marca
      if (this.credentials.length === 0) {
        this.addDefaultCredential();
      }
    },

    addDefaultCredential() {
      const defaultCredential = this.createDefaultCredential();
      this.credentials.push(defaultCredential);
    },

    createDefaultCredential() {
      return {
        connectionType: this.getDefaultConnectionType(),
        username: this.getDefaultUsername(this.device.brand),
        password: '',
        port: null,
        isActive: true,
        // Campos SNMP
        snmpVersion: 'v2c',
        snmpCommunity: 'public',
        snmpSecurityLevel: 'noAuthNoPriv',
        snmpAuthProtocol: 'MD5',
        snmpAuthKey: '',
        snmpPrivProtocol: 'DES',
        snmpPrivKey: '',
        // Campos SSH
        sshKeyPath: '',
        // Campos API
        apiKey: '',
        // Notas
        notes: ''
      };
    },

    addCredential() {
      const newCredential = this.createDefaultCredential();
      this.credentials.push(newCredential);
    },

    removeCredential(index) {
      if (confirm('¿Está seguro de eliminar esta credencial?')) {
        this.credentials.splice(index, 1);
      }
    },

    toggleCredential(index) {
      this.credentials[index].isActive = !this.credentials[index].isActive;
    },

    onCredentialTypeChange(credential) {
      // Ajustar puerto por defecto según el tipo de conexión
      credential.port = this.getDefaultPort(credential.connectionType, this.device.brand);
    },
    
    onNodeChange() {
      // Filtrar sectores por nodo seleccionado
      this.availableSectors = this.sectors.filter(sector => 
        sector.nodeId === parseInt(this.device.nodeId)
      );
      
      // Limpiar sector seleccionado si no pertenece al nodo
      if (this.device.sectorId && !this.availableSectors.find(s => s.id === parseInt(this.device.sectorId))) {
        this.device.sectorId = '';
      }
    },

    async onClientChange() {
      if (!this.device.clientId) {
        this.device.latitude = null;
        this.device.longitude = null;
        return;
      }

      // Buscar el cliente seleccionado y usar sus coordenadas
      const selectedClient = this.clients.find(client => client.id === parseInt(this.device.clientId));
      if (selectedClient) {
        if (selectedClient.latitude && selectedClient.longitude) {
          this.device.latitude = selectedClient.latitude;
          this.device.longitude = selectedClient.longitude;
        }
        
        // También usar la dirección del cliente si no se ha especificado ubicación
        if (!this.device.location && selectedClient.address) {
          this.device.location = selectedClient.address;
        }
      }
    },
    
    getDefaultConnectionType() {
      const types = {
        mikrotik: 'RouterOs',
        ubiquiti: 'ssh',
        tplink: 'snmp',
        cambium: 'snmp',
        mimosa: 'snmp'
      };
      return types[this.device.brand] || 'ssh';
    },
    
    getDefaultPort(connectionType, brand) {
      const portMap = {
        ssh: 22,
        snmp: 161,
        RouterOs: 8728,
        api: 80,
        web: 80
      };

      // Puertos específicos por marca
      if (brand === 'mikrotik' && connectionType === 'RouterOs') return 8728;
      if (brand === 'ubiquiti' && connectionType === 'ssh') return 22;
      
      return portMap[connectionType] || 22;
    },
    
    getDefaultUsername(brand) {
      const usernames = {
        mikrotik: 'admin',
        ubiquiti: 'ubnt',
        tplink: 'admin',
        cambium: 'admin'
      };
      return usernames[brand] || 'admin';
    },
    
    getModelPlaceholder() {
      const placeholders = {
        mikrotik: 'ej: RB450Gx4, hEX',
        ubiquiti: 'ej: NanoStation M5, EdgeRouter',
        tplink: 'ej: CPE210, Archer',
        cambium: 'ej: ePMP 1000',
        mimosa: 'ej: A5c, B5c'
      };
      return placeholders[this.device.brand] || 'Modelo del dispositivo';
    },
    
    validateIP() {
      if (this.device.ipAddress && !DeviceService.isValidIP(this.device.ipAddress)) {
        this.ipError = 'Formato de IP inválido';
      } else {
        this.ipError = '';
      }
    },
    
    validateMAC() {
      if (this.device.macAddress && !DeviceService.isValidMAC(this.device.macAddress)) {
        this.macError = 'Formato de MAC inválido';
      } else {
        this.macError = '';
      }
    },

    async testConnection() {
      // Buscar credencial activa
      const activeCredential = this.credentials.find(cred => cred.isActive) || this.credentials[0];
      
      if (!activeCredential || !activeCredential.username) {
        this.connectionResult = {
          success: false,
          message: 'No hay credenciales configuradas'
        };
        return;
      }

      if (!DeviceService.isValidIP(this.device.ipAddress)) {
        this.connectionResult = {
          success: false,
          message: 'Formato de IP inválido'
        };
        return;
      }
  
      this.testingConnection = true;
      this.connectionResult = null;
  
      try {
        const response = await DeviceService.testConnection({
          ipAddress: this.device.ipAddress,
          username: activeCredential.username,
          password: activeCredential.password,
          port: activeCredential.port || this.getDefaultPort(activeCredential.connectionType, this.device.brand),
          connectionType: activeCredential.connectionType
        });
    
        this.connectionResult = {
          success: response.data.success,
          message: response.data.message
        };
    
        if (response.data.success) {
          this.connectionTestPassed = true;
        }
      } catch (error) {
        console.error('Error probando conexión:', error);
        this.connectionResult = {
          success: false,
          message: error.response?.data?.message || 'Error de conexión'
        };
        this.connectionTestPassed = false;
      } finally {
        this.testingConnection = false;
      }
    },    


    async testSingleCredential(credential, index) {
      if (!this.device.ipAddress || !credential.username) {
        this.credentialResults[index] = {
          success: false,
          message: 'Se requiere IP y usuario para probar la conexión'
        };
        return;
      }
      
      this.$set(this.testingCredentials, index, true);
      this.$set(this.credentialResults, index, null);
      
      try {
        const response = await DeviceService.testConnection({
          ipAddress: this.device.ipAddress,
          username: credential.username,
          password: credential.password,
          port: credential.port || this.getDefaultPort(credential.connectionType, this.device.brand),
          connectionType: credential.connectionType
        });
        
        this.$set(this.credentialResults, index, {
          success: response.data.success,
          message: response.data.message
        });
      } catch (error) {
        this.$set(this.credentialResults, index, {
          success: false,
          message: error.response?.data?.message || 'Error de conexión'
        });
      } finally {
        this.$set(this.testingCredentials, index, false);
      }
    },
    
    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      try {
    const activeCredential = this.credentials.find(cred => cred.isActive) || this.credentials[0];
    
      // ✅ SI ES MIKROTIK, AGREGAR CREDENCIALES AL DEVICE
      if (this.device.brand === 'mikrotik' && activeCredential) {
        this.device.username = activeCredential.username || 'admin';
        this.device.password = activeCredential.password || 'admin123';
        this.device.apiPort = activeCredential.port || 8728;
      }

        // Validar datos antes de enviar
        const validationErrors = DeviceService.validateDeviceData(this.device);
        if (validationErrors.length > 0) {
          this.errorMessage = validationErrors.join(', ');
          return;
        }
        
        let response;
        if (this.isEdit) {
          response = await DeviceService.updateDevice(this.device.id, this.device);
          
          // Actualizar credenciales
          await this.saveCredentials(this.device.id);
          
          this.successMessage = 'Dispositivo actualizado correctamente';
        } else {
          response = await DeviceService.createDevice(this.device);
          const deviceId = response.data.id || response.data.device?.id;
          
          if (deviceId) {
            // Guardar credenciales para el nuevo dispositivo
            await this.saveCredentials(deviceId);
          }
          
          this.successMessage = 'Dispositivo creado correctamente';
        }
        
        // Mostrar mensaje de éxito y redirigir
        setTimeout(() => {
          if (this.device.brand === 'mikrotik') {
            this.$router.push('/mikrotik');
          } else {
            this.$router.push('/devices');
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error guardando dispositivo:', error);
        this.errorMessage = error.response?.data?.message || 'Error guardando el dispositivo. Verifique los datos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    async saveCredentials(deviceId) {
      try {
        console.log('Guardando credenciales para dispositivo:', deviceId);
        console.log('Credenciales a guardar:', this.credentials);
    
        // Si es edición, eliminar credenciales existentes primero
        if (this.isEdit) {
          try {
            const existingResponse = await DeviceService.getDeviceCredentials(deviceId);
            const existingCredentials = existingResponse.data.credentials || existingResponse.data || [];
            
            // Eliminar credenciales existentes
            for (const existingCred of existingCredentials) {
              if (existingCred.id) {
                await DeviceService.deleteDeviceCredentials(existingCred.id);
              }
            }
          } catch (deleteError) {
            console.warn('Error eliminando credenciales existentes:', deleteError);
            // Continuar aunque falle la eliminación
          }
        }
    
        // Crear nuevas credenciales
        let credentialsCreated = 0;
        for (const credential of this.credentials) {
          // Validar que la credencial tenga datos mínimos
          if (!credential.username && !credential.apiKey) {
            console.log('Saltando credencial sin usuario/apiKey:', credential);
            continue;
          }
      
          const credentialData = {
            deviceId: deviceId,
            connectionType: credential.connectionType || 'ssh',
            username: credential.username || '',
            password: credential.password || '',
            port: credential.port || this.getDefaultPort(credential.connectionType, this.device.brand),
            apiKey: credential.apiKey || '',
            sshKeyPath: credential.sshKeyPath || '',
            snmpVersion: credential.snmpVersion || 'v2c',
            snmpCommunity: credential.snmpCommunity || 'public',
            snmpSecurityLevel: credential.snmpSecurityLevel || 'noAuthNoPriv',
            snmpAuthProtocol: credential.snmpAuthProtocol || 'MD5',
            snmpAuthKey: credential.snmpAuthKey || '',
            snmpPrivProtocol: credential.snmpPrivProtocol || 'DES',
            snmpPrivKey: credential.snmpPrivKey || '',
            isActive: credential.isActive !== undefined ? credential.isActive : true,
            notes: credential.notes || ''
          };
      
          console.log('Creando credencial:', credentialData);
      
          try {
            await DeviceService.createDeviceCredentials(deviceId, credentialData);
            credentialsCreated++;
          } catch (createError) {
            console.error('Error creando credencial individual:', createError);
            // No lanzar error, continuar con las demás
          }
        }
    
        console.log(`Credenciales creadas exitosamente: ${credentialsCreated}/${this.credentials.length}`);
    
      } catch (error) {
        console.error('Error en saveCredentials:', error);
        throw new Error(`Error guardando credenciales: ${error.message}`);
      }
    },    


    cancel() {
      this.$router.push('/devices');
    }
  }
  
};
</script>

<style scoped>
.device-form {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.form-container {
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
  font-size: 1.2em;
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

.full-width {
  width: 100%;
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

.field-error {
  color: #dc3545;
  font-size: 0.8em;
  margin-top: 4px;
  display: block;
}

.field-help {
  color: #6c757d;
  font-size: 0.8em;
  margin-top: 4px;
  display: block;
}

/* Inventory Info */
.inventory-info {
  background: #e8f5e9;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.inventory-info h4 {
  margin: 0 0 15px 0;
  color: #2e7d32;
}

.inventory-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.inventory-details p {
  margin: 5px 0;
  font-size: 14px;
}

.btn-use-inventory {
  background: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-use-inventory:hover {
  background: #45a049;
}

/* Credentials Section */
.credentials-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.btn-add {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-add:hover {
  background: #218838;
}

.no-credentials {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 30px;
}

.credentials-list {
  space-y: 20px;
}

.credential-item {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 20px;
  transition: border-color 0.3s;
}

.credential-item.active {
  border-color: #28a745;
}

.credential-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.credential-type select {
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-weight: 500;
}

.credential-actions {
  display: flex;
  gap: 10px;
}

.btn-toggle, .btn-remove {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-toggle {
  background: #6c757d;
  color: white;
}

.btn-remove {
  background: #dc3545;
  color: white;
}

.btn-toggle:hover {
  background: #5a6268;
}

.btn-remove:hover {
  background: #c82333;
}

.credential-form {
  padding: 20px;
}

.connection-test {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
}

.test-btn {
  padding: 8px 16px;
  background: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.test-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.test-result {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.test-result.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.test-result.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.radio-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-option input[type="radio"] {
  width: auto;
  margin: 0;
}

.toggle-switch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-switch input[type="checkbox"] {
  width: 50px;
  height: 24px;
  appearance: none;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-switch input[type="checkbox"]:checked {
  background: #007bff;
}

.toggle-switch input[type="checkbox"]::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.toggle-switch input[type="checkbox"]:checked::before {
  transform: translateX(26px);
}

.switch-label {
  font-weight: normal;
  margin: 0;
  cursor: pointer;
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
  transition: background-color 0.2s;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #545b62;
}

.save-button {
  background: #007bff;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #0056b3;
}

.save-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message, .success-message {
  margin-top: 20px;
  padding: 12px;
  border-radius: 4px;
  font-weight: 500;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

@media (max-width: 768px) {
  .device-form {
    padding: 10px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  
  .radio-group {
    flex-direction: column;
    gap: 10px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .inventory-card {
    flex-direction: column;
  }
  
  .credential-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .credential-actions {
    justify-content: center;
  }
}
</style>