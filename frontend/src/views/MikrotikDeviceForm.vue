<template>
  <div class="mikrotik-device-form">
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? 'Editar Router Mikrotik' : 'Agregar Router Mikrotik' }}</h1>
      <button class="btn btn-outline" @click="goBack">
        ← Volver
      </button>
    </div>

    <div class="form-container">
      <form @submit.prevent="saveDevice">
        <!-- Información Básica -->
        <div class="form-section">
          <h3>Información del Router</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="deviceName">Nombre del Router *</label>
              <input 
                type="text" 
                id="deviceName" 
                v-model="device.name" 
                required
                placeholder="ej. RouterMikrotik-Principal"
              />
            </div>
            
            <div class="form-group">
              <label for="deviceModel">Modelo</label>
              <input 
                type="text" 
                id="deviceModel" 
                v-model="device.model" 
                placeholder="ej. RB450G, CCR1036"
              />
            </div>
          </div>

          <!-- ===== NUEVOS CAMPOS: MAC Y SERIAL ===== -->
          <div class="form-row">
            <div class="form-group">
              <label for="macAddress">MAC Address</label>
              <input 
                type="text"
                id="macAddress"
                v-model="device.macAddress"
                placeholder="AA:BB:CC:DD:EE:FF"
                @blur="searchInventoryByMac"
              />
            </div>
            
            <div class="form-group">
              <label for="serialNumber">Número de Serie</label>
              <input 
                type="text"
                id="serialNumber"
                v-model="device.serialNumber"
                placeholder="Ej: ABC123456789"
                @blur="searchInventoryBySerial"
              />
            </div>
          </div>

          <!-- Información del Inventario (si se encuentra) -->
          <div v-if="inventoryData" class="inventory-info">
            <h4>📦 Información del Inventario</h4>
            <div class="inventory-card">
              <div class="inventory-details">
                <p><strong>Nombre:</strong> {{ inventoryData.name }}</p>
                <p><strong>Marca:</strong> {{ inventoryData.brand }}</p>
                <p><strong>Modelo:</strong> {{ inventoryData.model }}</p>
                <p><strong>Estado:</strong> {{ inventoryData.status }}</p>
                <p v-if="inventoryData.location"><strong>Ubicación:</strong> {{ inventoryData.location.name }}</p>
              </div>
              <button type="button" @click="useInventoryData" class="btn-use-inventory">
                Usar Datos del Inventario
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label for="deviceLocation">Ubicación</label>
            <input 
              type="text" 
              id="deviceLocation" 
              v-model="device.location" 
              placeholder="ej. Torre Principal, Rack Sala Servidores"
            />
          </div>
        </div>

        <!-- ===== NUEVA SECCIÓN: UBICACIÓN EN RED ===== -->
        <div class="form-section">
          <h3>Ubicación en Red</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="zoneId">Zona *</label>
              <select 
                id="zoneId"
                v-model="device.zoneId"
                @change="onZoneChange"
                required
              >
                <option value="">Seleccionar zona</option>
                <option v-for="zone in zones" :key="zone.id" :value="zone.id">
                  {{ zone.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="nodeId">Nodo *</label>
              <select 
                id="nodeId"
                v-model="device.nodeId"
                @change="onNodeChange"
                :disabled="!device.zoneId"
                required
              >
                <option value="">Seleccionar nodo</option>
                <option v-for="node in availableNodes" :key="node.id" :value="node.id">
                  {{ node.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Coordenadas (se llenan automáticamente del nodo) -->
          <div class="form-row">
            <div class="form-group">
              <label for="deviceLatitude">Latitud</label>
              <input 
                type="number" 
                id="deviceLatitude" 
                v-model="device.latitude" 
                step="0.0000001"
                placeholder="Se completa automáticamente del nodo"
                readonly
              />
            </div>
            
            <div class="form-group">
              <label for="deviceLongitude">Longitud</label>
              <input 
                type="number" 
                id="deviceLongitude" 
                v-model="device.longitude" 
                step="0.0000001"
                placeholder="Se completa automáticamente del nodo"
                readonly
              />
            </div>
          </div>
        </div>

        <!-- Configuración de Conectividad -->
        <div class="form-section">
          <h3>Configuración de Conectividad</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="deviceIp">Dirección IP *</label>
              <input 
                type="text" 
                id="deviceIp" 
                v-model="device.ipAddress" 
                required
                placeholder="192.168.1.1"
              />
            </div>
            
            <div class="form-group">
              <label for="devicePort">Puerto API</label>
              <input 
                type="number" 
                id="devicePort" 
                v-model="device.apiPort" 
                placeholder="8728"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="deviceUsername">Usuario *</label>
              <input 
                type="text" 
                id="deviceUsername" 
                v-model="device.username" 
                required
                placeholder="admin"
              />
            </div>
            
            <div class="form-group">
              <label for="devicePassword">Contraseña (opcional)</label>
              <input 
                type="password" 
                id="devicePassword" 
                v-model="device.password" 
                placeholder="Dejar vacío si no tiene"
              />
            </div>
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
        </div>

        <!-- Información Adicional -->
        <div class="form-section">
          <h3>Información Adicional</h3>
          
          <div class="form-group">
            <label for="deviceNotes">Notas</label>
            <textarea 
              id="deviceNotes" 
              v-model="device.notes" 
              rows="4"
              placeholder="Notas adicionales sobre el router (configuración especial, ubicación exacta, etc.)"
            ></textarea>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="form-actions">
          <button type="button" class="btn" @click="goBack">
            Cancelar
          </button>
          <button 
            type="submit" 
            class="btn btn-primary" 
            :disabled="saving || (!isEdit && !connectionTestPassed)"
          >
            {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Router' : 'Agregar Router') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Alerta de conexión requerida -->
    <div v-if="!isEdit && !connectionTestPassed" class="connection-warning">
      ⚠️ Es recomendable probar la conexión antes de guardar el router
    </div>
  </div>
</template>

<script>
import MikrotikService from '../services/mikrotik.service';
import DeviceService from '../services/device.service';
import InventoryService from '../services/inventory.service';
import NetworkService from '../services/network.service';

export default {
  name: 'MikrotikDeviceForm',
  data() {
    return {
      device: {
        name: '',
        brand: 'mikrotik',
        type: 'router',
        model: '',
        ipAddress: '',
        macAddress: '',
        serialNumber: '',
        apiPort: 8728,
        username: 'admin',
        password: '',
        location: '',
        latitude: null,
        longitude: null,
        notes: '',
        zoneId: null,        // ← NUEVO
        nodeId: null,
        sectorId: null,
        clientId: null // Siempre null para routers Mikrotik
      },
      zones: [],             // ← NUEVO
      nodes: [],             // ← NUEVO
      availableNodes: [],    // ← NUEVO
      inventoryData: null,   // ← NUEVO
      isEdit: false,
      saving: false,
      testingConnection: false,
      connectionResult: null,
      connectionTestPassed: false
    };
  },
  created() {
    const deviceId = this.$route.params.id;
    this.isEdit = deviceId && deviceId !== 'new';
    
    // ===== CARGAR DATOS INICIALES =====
    this.loadInitialData();
    
    if (this.isEdit) {
      this.loadDevice(deviceId);
    }
  },
  methods: {
    // ===== NUEVO: CARGAR ZONAS Y NODOS =====
    async loadInitialData() {
      try {
        const [zonesResponse, nodesResponse] = await Promise.all([
          NetworkService.getAllZones({ active: true }),
          NetworkService.getAllNodes({ active: true })
        ]);
        
        this.zones = zonesResponse.data.zones || zonesResponse.data || [];
        this.nodes = nodesResponse.data.nodes || nodesResponse.data || [];
      } catch (error) {
        console.error('Error cargando datos iniciales:', error);
      }
    },

    // ===== NUEVO: CAMBIO DE ZONA =====
    onZoneChange() {
      // Filtrar nodos por zona seleccionada
      this.availableNodes = this.nodes.filter(node => 
        node.zoneId === parseInt(this.device.zoneId)
      );
      
      // Limpiar nodo seleccionado si no pertenece a la zona
      if (this.device.nodeId && !this.availableNodes.find(n => n.id === parseInt(this.device.nodeId))) {
        this.device.nodeId = null;
        this.device.latitude = null;
        this.device.longitude = null;
        this.device.location = '';
      }
    },

    // ===== NUEVO: CAMBIO DE NODO =====
    onNodeChange() {
      if (!this.device.nodeId) {
        this.device.latitude = null;
        this.device.longitude = null;
        this.device.location = '';
        return;
      }

      // Buscar el nodo seleccionado y usar sus coordenadas
      const selectedNode = this.availableNodes.find(node => node.id === parseInt(this.device.nodeId));
      if (selectedNode) {
        if (selectedNode.latitude && selectedNode.longitude) {
          this.device.latitude = selectedNode.latitude;
          this.device.longitude = selectedNode.longitude;
        }
        
        // Usar la ubicación del nodo
        if (selectedNode.location) {
          this.device.location = selectedNode.location;
        }
      }
    },

    // ===== NUEVO: BÚSQUEDA POR MAC =====
    async searchInventoryByMac() {
      if (!this.device.macAddress || this.device.macAddress.length < 3) {
        this.inventoryData = null;
        return;
      }

      try {
        const response = await InventoryService.searchInventoryByMac(this.device.macAddress);
        const items = response.data.items || [];
        
        if (items.length > 0) {
          this.inventoryData = items[0];
        } else {
          this.inventoryData = null;
        }
      } catch (error) {
        console.error('Error buscando en inventario:', error);
        this.inventoryData = null;
      }
    },

    // ===== NUEVO: BÚSQUEDA POR SERIAL =====
    async searchInventoryBySerial() {
      if (!this.device.serialNumber || this.device.serialNumber.length < 3) {
        this.inventoryData = null;
        return;
      }

      try {
        const response = await InventoryService.searchInventoryBySerial(this.device.serialNumber);
        const items = response.data.items || [];
        
        if (items.length > 0) {
          this.inventoryData = items[0];
        } else {
          this.inventoryData = null;
        }
      } catch (error) {
        console.error('Error buscando en inventario:', error);
        this.inventoryData = null;
      }
    },

    // ===== NUEVO: USAR DATOS DEL INVENTARIO =====
    useInventoryData() {
      if (!this.inventoryData) return;

      // Llenar campos automáticamente
      this.device.name = this.inventoryData.name || this.device.name;
      this.device.model = this.inventoryData.model || this.device.model;
      this.device.macAddress = this.inventoryData.macAddress || this.device.macAddress;
      this.device.serialNumber = this.inventoryData.serialNumber || this.device.serialNumber;

      // Si hay ubicación, usarla
      if (this.inventoryData.location) {
        this.device.location = this.inventoryData.location.name;
      }
    },

    async loadDevice(id) {
      try {
        const response = await DeviceService.getDevice(id);
        const device = response.data;
        
        this.device = {
          id: device.id,
          name: device.name,
          brand: device.brand,
          type: device.type,
          model: device.model || '',
          ipAddress: device.ipAddress || '',
          macAddress: device.macAddress || '',
          serialNumber: device.serialNumber || '',
          apiPort: device.apiPort || 8728,
          username: device.username || '',
          password: '', // Por seguridad, no cargar la contraseña
          location: device.location || '',
          latitude: device.latitude || null,
          longitude: device.longitude || null,
          notes: device.notes || '',
          zoneId: device.zoneId || null,      // ← NUEVO
          nodeId: device.nodeId || null,
          sectorId: device.sectorId || null,
          clientId: device.clientId || null
        };
        
        // ===== CARGAR NODOS DE LA ZONA =====
        if (this.device.zoneId) {
          this.onZoneChange();
        }
        
        // Si es edición, marcar como conexión probada
        this.connectionTestPassed = true;
      } catch (error) {
        console.error('Error cargando router:', error);
        alert('Error al cargar los datos del router');
      }
    },
    
    async testConnection() {
      if (!MikrotikService.isValidIP(this.device.ipAddress)) {
        this.connectionResult = {
          success: false,
          message: 'Formato de IP inválido'
        };
        return;
      }
      
      this.testingConnection = true;
      this.connectionResult = null;
      
      try {
        const response = await MikrotikService.testConnection(
          this.device.ipAddress,
          this.device.username,
          this.device.password,
          this.device.apiPort
        );
        
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
    
    async saveDevice() {
      // Validaciones
      if (!this.device.name || !this.device.ipAddress || !this.device.username || !this.device.zoneId || !this.device.nodeId) {
        alert('Por favor complete los campos obligatorios (nombre, IP, usuario, zona, nodo)');
        return;
      }
      
      if (!this.isEdit && !this.connectionTestPassed) {
        const confirmSave = confirm('No se ha probado la conexión. ¿Está seguro que desea continuar?');
        if (!confirmSave) return;
      }
      
      this.saving = true;
      
      try {
        // ===== PREPARAR DATOS COMPLETOS =====
        const deviceData = {
          ...this.device,
          // Asegurarse de que es un router Mikrotik
          brand: 'mikrotik',
          type: 'router',
          // Los routers no se asocian a clientes
          clientId: null,
          // Establecer estado basado en la prueba de conexión
          status: this.connectionTestPassed ? 'online' : 'unknown',
          // ===== INCLUIR CREDENCIALES =====
          username: this.device.username,
          password: this.device.password,
          apiPort: this.device.apiPort,
          apiType: 'RouterOs'
        };
        
        if (this.isEdit) {
          await DeviceService.updateDevice(this.device.id, deviceData);
        } else {
          await DeviceService.createDevice(deviceData);
        }
        
        // Redirigir al panel de Mikrotik
        this.$router.push('/mikrotik');
      } catch (error) {
        console.error('Error guardando router:', error);
        alert('Error al guardar el router: ' + (error.response?.data?.message || error.message));
      } finally {
        this.saving = false;
      }
    },
    
    goBack() {
      this.$router.push('/mikrotik');
    }
  }
};
</script>

<style scoped>
.mikrotik-device-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0;
}

.form-container {
  background-color: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e0e6ed;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  color: #34495e;
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #555;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.connection-test {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.result-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-weight: 500;
}

.result-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.result-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e6ed;
}

.connection-warning {
  margin-top: 20px;
  padding: 15px;
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  text-align: center;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-outline {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline:hover {
  background-color: #3498db;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>