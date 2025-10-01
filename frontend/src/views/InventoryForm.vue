<template>
  <div class="inventory-form">
    <h2>{{ isEdit ? 'Editar Item' : 'Nuevo Item de Inventario' }}</h2>
    
    <form @submit.prevent="submitForm">
      <div class="form-section">
        <h3>Información Básica</h3>
        
        <div class="form-row">
          <div class="form-group">
            <label for="name">Nombre *</label>
            <input 
              type="text"
              id="name"
              v-model="item.name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="brand">Marca</label>
            <input 
              type="text"
              id="brand"
              v-model="item.brand"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="model">Modelo</label>
            <input 
              type="text"
              id="model"
              v-model="item.model"
            />
          </div>
          
          <div class="form-group">
            <label for="serialNumber">Número de Serie</label>
            <input 
              type="text"
              id="serialNumber"
              v-model="item.serialNumber"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="status">Estado *</label>
            <select 
              id="status"
              v-model="item.status"
              required
            >
              <option value="available">Disponible</option>
              <option value="inUse">En uso</option>
              <option value="defective">Defectuoso</option>
              <option value="inRepair">En reparación</option>
              <option value="retired">Retirado</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="purchaseDate">Fecha de Compra</label>
            <input 
              type="date"
              id="purchaseDate"
              v-model="item.purchaseDate"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="cost">Costo</label>
            <input 
              type="number"
              id="cost"
              v-model="item.cost"
              step="0.01"
              min="0"
            />
          </div>
          
          <div class="form-group">
            <label for="ubicacion_id">Ubicación</label>
            <select 
              id="locationId"
              v-model="item.locationId"
            >
              <option value="">Sin ubicación asignada</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }} ({{ formatLocationType(location.type) }})
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Descripción y Notas</h3>
        
        <div class="form-group full-width">
          <label for="description">Descripción</label>
          <textarea 
            id="description"
            v-model="item.description"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group full-width">
          <label for="notes">Notas</label>
          <textarea 
            id="notes"
            v-model="item.notes"
            rows="4"
          ></textarea>
        </div>
      </div>
      
      <div class="form-section" v-if="!isEdit">
        <h3>Asignación (Opcional)</h3>
        
        <div class="form-group">
          <label for="cliente_id">Cliente Asignado</label>
          <select 
            id="clientId"
            v-model="item.clientId"
          >
            <option value="">Sin asignar</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.firstName }} {{ client.lastName }}
            </option>
          </select>
          <small class="help-text">Si asignas el item a un cliente, su estado cambiará automáticamente a "En uso"</small>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel">Cancelar</button>
        <button type="submit" class="save" :disabled="loading">
          {{ loading ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </form>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import InventoryService from '../services/inventory.service';
import ClientService from '../services/client.service';

export default {
  name: 'InventoryForm',
  data() {
    return {
      item: {
        name: '',
        brand: '',
        model: '',
        serialNumber: '',
        status: 'available',
        description: '',
        purchaseDate: '',
        cost: null,
        notes: '',
        locationId: '',
        clientId: ''
      },
      locations: [],
      clients: [],
      isEdit: false,
      loading: false,
      errorMessage: ''
    };
  },
  created() {
    this.loadLocations();
    this.loadClients();
    const itemId = this.$route.params.id;
    if (itemId && itemId !== 'new') {
      this.isEdit = true;
      this.loadItem(itemId);
    }
  },
  methods: {
    // En InventoryForm.vue, método loadLocations:
    async loadLocations() {
        try {
            const response = await InventoryService.getAllLocations({ active: true });
            console.log("Response de ubicaciones:", response); // Para debug
            
            // Manejar diferentes estructuras de respuesta
            if (response.data?.locations) {
                this.locations = response.data.locations;
            } else if (response.data?.data) {
                this.locations = response.data.data;
            } else if (Array.isArray(response.data)) {
                this.locations = response.data;
            } else {
                this.locations = [];
            }
            
            console.log("Ubicaciones cargadas:", this.locations); // Para debug
        } catch (error) {
            console.error('Error cargando ubicaciones:', error);
            this.errorMessage = 'Error cargando ubicaciones. Por favor, intente nuevamente.';
        }
    },
    async loadClients() {
      try {
        const response = await ClientService.getAllClients({ active: true, size: 100 });
        this.clients = response.data.clients || [];
      } catch (error) {
        console.error('Error cargando clientes:', error);
        this.errorMessage = 'Error cargando clientes. Por favor, intente nuevamente.';
      }
    },
    async loadItem(id) {
      this.loading = true;
      try {
        const response = await InventoryService.getInventory(id);
        const item = response.data;
        
        // Formatear fecha para el formato input date
        if (item.purchaseDate) {
          item.purchaseDate = new Date(item.purchaseDate).toISOString().split('T')[0];
        }
        
        this.item = item;
      } catch (error) {
        console.error('Error cargando item:', error);
        this.errorMessage = 'Error cargando datos del item. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    formatLocationType(type) {
      const typeMap = {
        'warehouse': 'Almacén',
        'vehicle': 'Vehículo',
        'client_site': 'Sitio Cliente',
        'repair_shop': 'Taller',
        'other': 'Otro'
      };
      return typeMap[type] || type;
    },
    async submitForm() {
      this.loading = true;
      this.errorMessage = '';
      
      try {
        // Validar campos requeridos
        if (!this.item.name) {
          this.errorMessage = 'El nombre es requerido';
          return;
        }
        
        // Preparar datos para enviar
        const itemData = { ...this.item };
        
        // Convertir valores vacíos a null
        if (!itemData.locationId) itemData.locationId = null;
        if (!itemData.clientId) itemData.clientId = null;
        if (!itemData.cost) itemData.cost = null;
        
        // Si se asigna a un cliente, cambiar estado a en uso
        if (itemData.clientId && itemData.status === 'available') {
          itemData.status = 'inUse';
        }
        
        if (this.isEdit) {
          await InventoryService.updateInventory(this.item.id, itemData);
        } else {
          await InventoryService.createInventory(itemData);
        }
        
        // Redirigir a la lista de inventario
        this.$router.push('/inventory');
      } catch (error) {
        console.error('Error guardando item:', error);
        this.errorMessage = error.message || 'Error guardando datos del item. Por favor, verifique los campos e intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    cancel() {
      this.$router.push('/inventory');
    }
  }
};
</script>

<style scoped>
.inventory-form {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.form-section {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #555;
  font-size: 1.2em;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
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

.full-width {
  width: 100%;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

textarea {
  resize: vertical;
}

.help-text {
  color: #666;
  font-size: 0.9em;
  margin-top: 4px;
  display: block;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.form-actions button:first-child {
  background-color: #e0e0e0;
}

.form-actions button.save {
  background-color: #4CAF50;
  color: white;
}

.form-actions button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #f44336;
  margin-top: 16px;
  text-align: center;
  padding: 10px;
  background-color: #ffebee;
  border-radius: 4px;
  border: 1px solid #f44336;
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>