<template>
  <div class="device-form">
    <h1 class="page-title">{{ isEdit ? 'Editar Dispositivo' : 'Nuevo Dispositivo' }}</h1>
    
    <div class="card">
      <form @submit.prevent="submitForm">
        <div class="form-section">
          <h3>Información Básica</h3>
          
          <div class="form-group">
            <label for="name">Nombre *</label>
            <input 
              type="text" 
              id="name" 
              v-model="device.name" 
              required
              placeholder="Ingrese un nombre descriptivo (ej. Router Principal)"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="type">Tipo *</label>
              <select id="type" v-model="device.type" required>
                <option value="">Seleccione un tipo</option>
                <option value="router">Router</option>
                <option value="switch">Switch</option>
                <option value="antenna">Antena</option>
                <option value="cpe">CPE</option>
                <option value="other">Otro</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="brand">Marca *</label>
              <select id="brand" v-model="device.brand" required>
                <option value="">Seleccione una marca</option>
                <option value="mikrotik">Mikrotik</option>
                <option value="ubiquiti">Ubiquiti</option>
                <option value="cambium">Cambium</option>
                <option value="tplink">TP-Link</option>
                <option value="other">Otra</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="model">Modelo</label>
            <input 
              type="text" 
              id="model" 
              v-model="device.model" 
              placeholder="Modelo del dispositivo (ej. RB450G, NanoStation M5)"
            />
          </div>
        </div>
        
        <div class="form-section">
          <h3>Ubicación y Asignación</h3>
          
          <div class="form-group">
            <label for="location">Ubicación</label>
            <input 
              type="text" 
              id="location" 
              v-model="device.location" 
              placeholder="Ubicación física (ej. Rack Principal, Torre Norte)"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="latitude">Latitud</label>
              <input 
                type="number" 
                id="latitude" 
                v-model="device.latitude" 
                step="0.0000001"
                placeholder="Coordenadas GPS (ej. 19.4326)"
              />
            </div>
            
            <div class="form-group">
              <label for="longitude">Longitud</label>
              <input 
                type="number" 
                id="longitude" 
                v-model="device.longitude" 
                step="0.0000001"
                placeholder="Coordenadas GPS (ej. -99.1332)"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="nodeId">Nodo</label>
              <select id="nodeId" v-model="device.nodeId">
                <option value="">No asignado</option>
                <option v-for="node in nodes" :key="node.id" :value="node.id">
                  {{ node.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="sectorId">Sector</label>
              <select id="sectorId" v-model="device.sectorId">
                <option value="">No asignado</option>
                <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
                  {{ sector.name }} ({{ sector.Node ? sector.Node.name : 'Sin nodo' }})
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="clientId">Cliente</label>
            <select id="clientId" v-model="device.clientId">
              <option value="">No asignado</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-section">
          <h3>Conectividad</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="ipAddress">Dirección IP</label>
              <input 
                type="text" 
                id="ipAddress" 
                v-model="device.ipAddress" 
                placeholder="Dirección IP (ej. 192.168.1.1)"
              />
            </div>
            
            <div class="form-group">
              <label for="macAddress">Dirección MAC</label>
              <input 
                type="text" 
                id="macAddress" 
                v-model="device.macAddress" 
                placeholder="Dirección MAC (ej. 00:11:22:33:44:55)"
              />
            </div>
          </div>
          
          <div class="form-section-header">
            <h4>Credenciales para API</h4>
            <p class="text-muted">Necesario para gestionar el dispositivo remotamente</p>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="username">Usuario</label>
              <input 
                type="text" 
                id="username" 
                v-model="device.username" 
                placeholder="Usuario para acceso API"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input 
                type="password" 
                id="password" 
                v-model="device.password" 
                placeholder="Contraseña para acceso API"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" v-if="isMikrotik()">
              <label for="apiPort">Puerto API</label>
              <input 
                type="number" 
                id="apiPort" 
                v-model="device.apiPort" 
                placeholder="8728 (predeterminado)"
              />
            </div>
            
            <div class="form-group" v-if="isUbiquiti()">
              <label for="apiKey">API Key</label>
              <input 
                type="text" 
                id="apiKey" 
                v-model="device.apiKey" 
                placeholder="Clave API para Ubiquiti"
              />
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3>Notas</h3>
          
          <div class="form-group">
            <label for="notes">Notas adicionales</label>
            <textarea 
              id="notes" 
              v-model="device.notes" 
              rows="4" 
              placeholder="Información adicional sobre el dispositivo (ubicación específica, detalles de instalación, etc.)"
            ></textarea>
          </div>
        </div>
        
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" @click="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';
import NetworkService from '../services/network.service';
import ClientService from '../services/client.service';

export default {
  name: 'DeviceForm',
  data() {
    return {
      device: {
        name: '',
        type: '',
        brand: '',
        model: '',
        ipAddress: '',
        macAddress: '',
        username: '',
        password: '',
        apiKey: '',
        apiPort: 8728,
        nodeId: '',
        sectorId: '',
        clientId: '',
        location: '',
        latitude: null,
        longitude: null,
        notes: ''
      },
      nodes: [],
      sectors: [],
      clients: [],
      loading: false,
      loadingData: false,
      errorMessage: '',
      isEdit: false
    };
  },
  created() {
    // Verificar si estamos en modo edición
    const deviceId = this.$route.params.id;
    this.isEdit = deviceId && deviceId !== 'new';
    
    // Cargar datos para el formulario
    this.loadFormData();
    
    if (this.isEdit) {
      this.loadDevice(deviceId);
    }
  },
  methods: {
    async loadDevice(id) {
      this.loading = true;
      try {
        const response = await DeviceService.getDevice(id);
        const device = response.data;
        
        // Asignar datos al formulario
        this.device = {
          name: device.name,
          type: device.type,
          brand: device.brand,
          model: device.model || '',
          ipAddress: device.ipAddress || '',
          macAddress: device.macAddress || '',
          username: device.username || '',
          password: device.password || '',
          apiKey: device.apiKey || '',
          apiPort: device.apiPort || 8728,
          nodeId: device.nodeId || '',
          sectorId: device.sectorId || '',
          clientId: device.clientId || '',
          location: device.location || '',
          latitude: device.latitude || null,
          longitude: device.longitude || null,
          notes: device.notes || ''
        };
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.errorMessage = 'Error al cargar los datos del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadFormData() {
      this.loadingData = true;
      try {
        // Cargar nodos
        const nodesResponse = await NetworkService.getAllNodes();
        this.nodes = nodesResponse.data || [];
        
        // Cargar sectores
        const sectorsResponse = await NetworkService.getAllSectors();
        this.sectors = sectorsResponse.data || [];
        
        // Cargar clientes
        const clientsResponse = await ClientService.getAllClients();
        this.clients = clientsResponse.data.clients || [];
      } catch (error) {
        console.error('Error cargando datos del formulario:', error);
        
        // Datos de prueba si falla la carga
        this.nodes = [
          { id: 1, name: 'Nodo Principal' },
          { id: 2, name: 'Nodo Norte' },
          { id: 3, name: 'Nodo Sur' },
          { id: 4, name: 'Nodo Este' }
        ];
        
        this.sectors = [
          { id: 1, name: 'Sector 1', Node: { name: 'Nodo Principal' } },
          { id: 2, name: 'Sector 2', Node: { name: 'Nodo Principal' } },
          { id: 3, name: 'Sector Norte', Node: { name: 'Nodo Norte' } },
          { id: 4, name: 'Sector Este', Node: { name: 'Nodo Este' } }
        ];
        
        this.clients = [
          { id: 1, firstName: 'Juan', lastName: 'Pérez' },
          { id: 2, firstName: 'María', lastName: 'González' },
          { id: 3, firstName: 'Carlos', lastName: 'Rodríguez' }
        ];
      } finally {
        this.loadingData = false;
      }
    },
    
    async submitForm() {
      // Validación básica
      if (!this.device.name || !this.device.type || !this.device.brand) {
        this.errorMessage = 'Por favor complete todos los campos obligatorios.';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          // Actualizar dispositivo existente
          await DeviceService.updateDevice(this.$route.params.id, this.device);
          this.$router.push(`/devices/${this.$route.params.id}`);
        } else {
          // Crear nuevo dispositivo
          const response = await DeviceService.createDevice(this.device);
          this.$router.push(`/devices/${response.data.device.id}`);
        }
      } catch (error) {
        console.error('Error guardando dispositivo:', error);
        this.errorMessage = 'Error al guardar el dispositivo. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    isMikrotik() {
      return this.device.brand === 'mikrotik';
    },
    
    isUbiquiti() {
      return this.device.brand === 'ubiquiti';
    },
    
    cancel() {
      if (this.isEdit) {
        this.$router.push(`/devices/${this.$route.params.id}`);
      } else {
        this.$router.push('/devices');
      }
    }
  }
};
</script>

<style scoped>
.device-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-section {
  margin-bottom: 30px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 20px;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 1.2rem;
}

.form-section-header {
  margin-bottom: 15px;
}

.form-section-header h4 {
  margin-bottom: 5px;
  color: var(--text-primary);
  font-size: 1rem;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.error-message {
  color: var(--danger);
  margin: 15px 0;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>