<template>
  <div class="inventory-detail">
    <div class="header">
      <h2>Detalle de Item de Inventario</h2>
      <div class="actions">
        <button @click="goToEdit" class="edit-button">Editar</button>
        <button @click="goBack" class="back-button">Volver</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando información del item...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="item-content">
      <div class="panel basic-info">
        <h3>Información Básica</h3>
        <div class="status-badge" :class="item.status">
          {{ formatStatus(item.status) }}
        </div>
        
        <div class="info-item">
          <span class="label">ID:</span>
          <span class="value">{{ item.id }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Nombre:</span>
          <span class="value">{{ item.name }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Marca:</span>
          <span class="value">{{ item.brand || 'No especificada' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Modelo:</span>
          <span class="value">{{ item.model || 'No especificado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Número de Serie:</span>
          <span class="value">{{ item.serialNumber || 'No especificado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Fecha de Compra:</span>
          <span class="value">{{ formatDate(item.purchaseDate) || 'No especificada' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Costo:</span>
          <span class="value">{{ formatCurrency(item.cost) || 'No especificado' }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Fecha de Creación:</span>
          <span class="value">{{ formatDate(item.createdAt ) }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Última Actualización:</span>
          <span class="value">{{ formatDate(item.updatedAt ) }}</span>
        </div>
      </div>
      
      <div class="panel location-info">
        <h3>Ubicación y Asignación</h3>
        
        <div class="info-item">
          <span class="label">Ubicación Actual:</span>
          <span class="value" v-if="item.location">
            {{ item.location.name }}
            <span class="location-type">({{ formatLocationType(item.location.type) }})</span>
          </span>
          <span v-else class="value">Sin ubicación asignada</span>
        </div>
        
        <div class="info-item" v-if="item.location && item.location.description">
          <span class="label">Descripción de Ubicación:</span>
          <span class="value">{{ item.location.description }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">Cliente Asignado:</span>
          <span class="value" v-if="item.assignedClient">
            <router-link :to="`/clients/${item.assignedClient.id}`" class="client-link">
              {{ item.assignedClient.firstName }} {{ item.assignedClient.lastName }}
            </router-link>
          </span>
          <span v-else class="value">Sin asignar</span>
        </div>
        
        <div class="action-buttons" v-if="item.status === 'available'">
          <button @click="showAssignModal = true" class="assign-button">
            Asignar a Cliente
          </button>
          <button @click="showLocationModal = true" class="location-button">
            Cambiar Ubicación
          </button>
        </div>
        
        <div class="action-buttons">
          <button @click="showStatusModal = true" class="status-button">
            Cambiar Estado
          </button>
        </div>
      </div>
      
      <div class="panel description-notes">
        <h3>Descripción y Notas</h3>
        
        <div class="info-item" v-if="item.description">
          <span class="label">Descripción:</span>
          <div class="value description-content">{{ item.description }}</div>
        </div>
        
        <div class="info-item" v-if="item.notes">
          <span class="label">Notas:</span>
          <div class="value notes-content">{{ item.notes }}</div>
        </div>
        
        <div v-if="!item.description && !item.notes" class="no-content">
          No hay descripción o notas registradas.
        </div>
      </div>
      
      <div class="panel movements">
        <h3>Historial de Movimientos</h3>
        
        <div v-if="item.movements && item.movements.length > 0">
          <div class="movement-item" v-for="movement in item.movements" :key="movement.id">
            <div class="movement-header">
              <span class="movement-type" :class="movement.type">
                {{ formatMovementType(movement.type) }}
              </span>
              <span class="movement-date">{{ formatDateTime(movement.movementDate) }}</span>
            </div>
            
            <div class="movement-details">
              <div v-if="movement.fromLocation" class="movement-location">
                <strong>Desde:</strong> {{ movement.fromLocation.name }}
              </div>
              <div v-if="movement.toLocation" class="movement-location">
                <strong>Hacia:</strong> {{ movement.toLocation.name }}
              </div>
              <div v-if="movement.reason" class="movement-reason">
                <strong>Razón:</strong> {{ movement.reason }}
              </div>
              <div v-if="movement.movedBy" class="movement-user">
                <strong>Realizado por:</strong> {{ movement.movedBy.fullName || movement.movedBy.username }}
              </div>
              <div v-if="movement.notes" class="movement-notes">
                <strong>Notas:</strong> {{ movement.notes }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="no-movements">
          No hay movimientos registrados para este item.
        </div>
      </div>
    </div>
    
    <!-- Modal para cambio de estado -->
    <div v-if="showStatusModal" class="modal">
      <div class="modal-content">
        <h3>Cambiar Estado</h3>
        <form @submit.prevent="saveStatusChange">
          <div class="form-group">
            <label for="newStatus">Nuevo Estado:</label>
            <select id="newStatus" v-model="statusChange.status" required>
              <option value="available">Disponible</option>
              <option value="in_use">En uso</option>
              <option value="defective">Defectuoso</option>
              <option value="in_repair">En reparación</option>
              <option value="retired">Retirado</option>
            </select>
          </div>
          <div class="form-group">
            <label for="statusReason">Razón:</label>
            <input type="text" id="statusReason" v-model="statusChange.reason" />
          </div>
          <div class="form-group">
            <label for="statusNotes">Notas:</label>
            <textarea id="statusNotes" v-model="statusChange.notes" rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showStatusModal = false">Cancelar</button>
            <button type="submit" class="save">Guardar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal para asignación a cliente -->
    <div v-if="showAssignModal" class="modal">
      <div class="modal-content">
        <h3>Asignar a Cliente</h3>
        <form @submit.prevent="saveAssignment">
          <div class="form-group">
            <label for="clientSelect">Cliente:</label>
            <select id="clientSelect" v-model="assignment.clientId" required>
              <option value="">Seleccionar cliente</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.firstName }} {{ client.lastName }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="assignReason">Razón:</label>
            <input type="text" id="assignReason" v-model="assignment.reason" />
          </div>
          <div class="form-group">
            <label for="assignNotes">Notas:</label>
            <textarea id="assignNotes" v-model="assignment.notes" rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAssignModal = false">Cancelar</button>
            <button type="submit" class="save">Asignar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal para cambiar ubicación -->
    <div v-if="showLocationModal" class="modal">
      <div class="modal-content">
        <h3>Cambiar Ubicación</h3>
        <form @submit.prevent="saveLocationChange">
          <div class="form-group">
            <label for="locationSelect">Nueva Ubicación:</label>
            <select id="locationSelect" v-model="locationChange.locationId" required>
              <option value="">Seleccionar ubicación</option>
              <option v-for="location in locations" :key="location.id" :value="location.id">
                {{ location.name }} ({{ formatLocationType(location.type) }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="locationReason">Razón:</label>
            <input type="text" id="locationReason" v-model="locationChange.reason" />
          </div>
          <div class="form-group">
            <label for="locationNotes">Notas:</label>
            <textarea id="locationNotes" v-model="locationChange.notes" rows="3"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showLocationModal = false">Cancelar</button>
            <button type="submit" class="save">Cambiar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import InventoryService from '../services/inventory.service';
import ClientService from '../services/client.service';

export default {
  name: 'InventoryDetail',
  data() {
    return {
      item: {},
      clients: [],
      locations: [],
      loading: true,
      error: null,
      showStatusModal: false,
      statusChange: {
        status: '',
        reason: '',
        notes: ''
      },
      showAssignModal: false,
      assignment: {
        clientId: '',
        reason: '',
        notes: ''
      },
      showLocationModal: false,
      locationChange: {
        locationId: '',
        reason: '',
        notes: ''
      }
    };
  },
  created() {
    this.loadItem();
    this.loadClients();
    this.loadLocations();
  },
  methods: {
    async loadItem() {
      this.loading = true;
      try {
        const response = await InventoryService.getInventory(this.$route.params.id);
        this.item = response.data;
      } catch (error) {
        console.error('Error cargando item:', error);
        this.error = 'Error cargando datos del item. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    async loadClients() {
      try {
        const response = await ClientService.getAllClients({ active: true, size: 100 });
        this.clients = response.data.clients || [];
      } catch (error) {
        console.error('Error cargando clientes:', error);
      }
    },
    async loadLocations() {
      try {
        const response = await InventoryService.getAllLocations({ active: true });
        this.locations = response.data.locations || response.data || [];
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
      }
    },
    formatDate(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    formatDateTime(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    formatCurrency(amount) {
      if (!amount) return null;
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    },
    formatStatus(status) {
      const statusMap = {
        'available': 'Disponible',
        'in_use': 'En uso',
        'defective': 'Defectuoso',
        'in_repair': 'En reparación',
        'retired': 'Retirado'
      };
      return statusMap[status] || status;
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
    formatMovementType(type) {
      const typeMap = {
        'in': 'Entrada',
        'out': 'Salida',
        'transfer': 'Transferencia',
        'adjustment': 'Ajuste',
        'maintenance': 'Mantenimiento'
      };
      return typeMap[type] || type;
    },
    goToEdit() {
      this.$router.push(`/inventory/${this.item.id}/edit`);
    },
    goBack() {
      this.$router.push('/inventory');
    },
    async saveStatusChange() {
      try {
        await InventoryService.changeStatus(
          this.item.id,
          this.statusChange.status,
          this.statusChange.reason,
          this.statusChange.notes
        );
        this.showStatusModal = false;
        this.loadItem(); // Recargar para mostrar cambios
      } catch (error) {
        console.error('Error cambiando estado:', error);
        this.error = 'Error cambiando estado. Por favor, intente nuevamente.';
      }
    },
    async saveAssignment() {
      try {
        await InventoryService.assignToClient(
          this.item.id,
          this.assignment.clientId,
          this.assignment.reason,
          this.assignment.notes
        );
        this.showAssignModal = false;
        this.loadItem(); // Recargar para mostrar cambios
      } catch (error) {
        console.error('Error asignando a cliente:', error);
        this.error = 'Error asignando a cliente. Por favor, intente nuevamente.';
      }
    },
    async saveLocationChange() {
      try {
        // Hacer un update con la nueva ubicación
        await InventoryService.updateInventory(this.item.id, {
          ...this.item,
          ubicacion_id: this.locationChange.locationId,
          moveReason: this.locationChange.reason,
          moveNotes: this.locationChange.notes
        });
        this.showLocationModal = false;
        this.loadItem(); // Recargar para mostrar cambios
      } catch (error) {
        console.error('Error cambiando ubicación:', error);
        this.error = 'Error cambiando ubicación. Por favor, intente nuevamente.';
      }
    }
  }
};
</script>

<style scoped>
.inventory-detail {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-button {
  background-color: #2196F3;
  color: white;
}

.back-button {
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

.item-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
}

.basic-info, .location-info {
  grid-column: span 1;
}

.description-notes, .movements {
  grid-column: 1 / -1;
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.status-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.status-badge.available {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-badge.in_use {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-badge.defective {
  background-color: #ffebee;
  color: #c62828;
}

.status-badge.in_repair {
  background-color: #e3f2fd;
  color: #1565c0;
}

.status-badge.retired {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.info-item {
  margin-bottom: 12px;
  display: flex;
}

.label {
  font-weight: bold;
  width: 160px;
  color: #666;
}

.value {
  flex: 1;
}

.location-type {
  color: #999;
  font-size: 0.9em;
}

.client-link {
  color: #2196F3;
  text-decoration: none;
}

.client-link:hover {
  text-decoration: underline;
}

.action-buttons {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.assign-button, .location-button, .status-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.assign-button {
  background-color: #4CAF50;
  color: white;
}

.location-button {
  background-color: #FF9800;
  color: white;
}

.status-button {
  background-color: #2196F3;
  color: white;
}

.description-content, .notes-content {
  white-space: pre-line;
  color: #666;
  margin-top: 8px;
}

.no-content, .no-movements {
  color: #999;
  font-style: italic;
  padding: 10px 0;
}

.movement-item {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
}

.movement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.movement-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  font-weight: bold;
}

.movement-type.in {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.movement-type.out {
  background-color: #ffebee;
  color: #c62828;
}

.movement-type.transfer {
  background-color: #e3f2fd;
  color: #1565c0;
}

.movement-type.adjustment {
  background-color: #fff3e0;
  color: #ef6c00;
}

.movement-type.maintenance {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.movement-date {
  color: #999;
  font-size: 0.9em;
}

.movement-details {
  color: #666;
  font-size: 0.9em;
}

.movement-details > div {
  margin-bottom: 4px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal h3 {
  margin-top: 0;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #555;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.form-group textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button.save {
  background-color: #4CAF50;
  color: white;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

@media (max-width: 800px) {
  .item-content {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>