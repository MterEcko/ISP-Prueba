<template>
  <div class="inventory-list">
    <h2>Gestión de Inventario</h2>
    
    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchName" 
          placeholder="Buscar por nombre"
          @keyup.enter="loadInventory"
        />
        <button @click="loadInventory">Buscar</button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedBrand" @change="loadInventory">
          <option value="">Todas las marcas</option>
          <option v-for="brand in brands" :key="brand" :value="brand">
            {{ brand }}
          </option>
        </select>
        
        <select v-model="selectedStatus" @change="loadInventory">
          <option value="">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="inUse">En uso</option>
          <option value="defective">Defectuoso</option>
          <option value="inRepair">En reparación</option>
          <option value="retired">Retirado</option>
        </select>
        
        <select v-model="selectedLocation" @change="loadInventory">
          <option value="">Todas las ubicaciones</option>
          <option v-for="location in locations" :key="location.id" :value="location.id">
            {{ location.name }}
          </option>
        </select>
        
        <select v-model="assignedFilter" @change="loadInventory">
          <option value="">Todos</option>
          <option value="true">Asignados</option>
          <option value="false">No asignados</option>
        </select>
      </div>
      
      <button class="add-button" @click="openNewInventoryForm">+ Nuevo Item</button>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando inventario...
    </div>
    
    <div v-else-if="items.length === 0" class="no-data">
      No se encontraron items de inventario.
    </div>
    
    <table v-else class="inventory-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Marca</th>
          <th>Modelo</th>
          <th>N° Serie</th>
          <th>Estado</th>
          <th>Ubicación</th>
          <th>Cliente Asignado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id">
          <td>{{ item.id }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.brand || '-' }}</td>
          <td>{{ item.model || '-' }}</td>
          <td>{{ item.serialNumber || '-' }}</td>
          <td>
            <span :class="['status', item.status]">
              {{ formatStatus(item.status) }}
            </span>
          </td>
          <td>{{ item.location ? item.location.name : '-' }}</td>
          <td>{{ item.assignedClient ? `${item.assignedClient.firstName} ${item.assignedClient.lastName}` : '-' }}</td>
          <td class="actions">
            <button @click="viewItem(item.id)" title="Ver detalles">
              Ver
            </button>
            <button @click="editItem(item.id)" title="Editar">
              Editar
            </button>
            <button 
              @click="changeStatus(item)" 
              title="Cambiar estado"
            >
              Estado
            </button>
            <button 
              @click="assignToClient(item)" 
              title="Asignar a cliente"
              v-if="item.status === 'available'"
            >
              Asignar
            </button>
            <button @click="confirmDelete(item)" title="Eliminar" class="delete">
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
      >
        Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
      >
        Siguiente
      </button>
    </div>
    
    <!-- Modal para confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro que desea eliminar el item <strong>{{ itemToDelete.name }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false">Cancelar</button>
          <button @click="deleteItem" class="delete">Eliminar</button>
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
              <option value="inUse">En uso</option>
              <option value="defective">Defectuoso</option>
              <option value="inRepair">En reparación</option>
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
  </div>
</template>

<script>
import InventoryService from '../services/inventory.service';
import ClientService from '../services/client.service';

export default {
  name: 'InventoryList',
  data() {
    return {
      items: [],
      locations: [],
      clients: [],
      brands: [],
      loading: false,
      searchName: '',
      selectedBrand: '',
      selectedStatus: '',
      selectedLocation: '',
      assignedFilter: '',
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      showDeleteModal: false,
      itemToDelete: null,
      showStatusModal: false,
      statusChange: {
        item: null,
        status: '',
        reason: '',
        notes: ''
      },
      showAssignModal: false,
      assignment: {
        item: null,
        clientId: '',
        reason: '',
        notes: ''
      }
    };
  },
  created() {
    this.loadLocations();
    this.loadClients();
    this.loadInventory();
  },
  methods: {
    async loadLocations() {
      try {
        const response = await InventoryService.getAllLocations({ active: true });
        this.locations = response.data.locations || response.data || [];
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
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
    async loadInventory() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          //name: this.searchName || undefined,
          //brand: this.selectedBrand || undefined,
          //status: this.selectedStatus || undefined,
          //locationId: this.selectedLocation || undefined,
          //assignedOnly: this.assignedFilter || undefined
        };
		
        // Solo agregar parámetros si tienen valor válido
        if (this.searchName && this.searchName.trim()) {
          params.name = this.searchName;
        }
        if (this.selectedBrand && this.selectedBrand !== '') {
          params.brand = this.selectedBrand;
        }
        if (this.selectedStatus && this.selectedStatus !== '') {
          params.status = this.selectedStatus;
        }
        if (this.selectedLocation && this.selectedLocation !== '') {
          params.locationId = this.selectedLocation;
        }
        if (this.assignedFilter && this.assignedFilter !== '') {
          params.assignedOnly = this.assignedFilter;
        }
        
        const response = await InventoryService.getAllInventory(params);
        this.items = response.data.items || response.data || [];
        this.totalItems = response.data.totalItems || this.items.length;
        this.totalPages = response.data.totalPages || 1;
        
        // Extraer marcas únicas para el filtro
        const uniqueBrands = [...new Set(this.items.map(item => item.brand).filter(Boolean))];
        this.brands = uniqueBrands;
      } catch (error) {
        console.error('Error cargando inventario:', error);
      } finally {
        this.loading = false;
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadInventory();
      }
    },
    formatStatus(status) {
      const statusMap = {
        'available': 'Disponible',
        'inUse': 'En uso',
        'defective': 'Defectuoso',
        'inRepair': 'En reparación',
        'retired': 'Retirado'
      };
      return statusMap[status] || status;
    },
    openNewInventoryForm() {
      this.$router.push('/inventory/new');
    },
    viewItem(id) {
      this.$router.push(`/inventory/${id}`);
    },
    editItem(id) {
      this.$router.push(`/inventory/${id}/edit`);
    },
    changeStatus(item) {
      this.statusChange = {
        item,
        status: item.status,
        reason: '',
        notes: ''
      };
      this.showStatusModal = true;
    },
    async saveStatusChange() {
      try {
        await InventoryService.changeStatus(
          this.statusChange.item.id,
          this.statusChange.status,
          this.statusChange.reason,
          this.statusChange.notes
        );
        this.showStatusModal = false;
        this.loadInventory();
      } catch (error) {
        console.error('Error cambiando estado:', error);
      }
    },
    assignToClient(item) {
      this.assignment = {
        item,
        clientId: '',
        reason: '',
        notes: ''
      };
      this.showAssignModal = true;
    },
    async saveAssignment() {
      try {
        await InventoryService.assignToClient(
          this.assignment.item.id,
          this.assignment.clientId,
          this.assignment.reason,
          this.assignment.notes
        );
        this.showAssignModal = false;
        this.loadInventory();
      } catch (error) {
        console.error('Error asignando a cliente:', error);
      }
    },
    confirmDelete(item) {
      this.itemToDelete = item;
      this.showDeleteModal = true;
    },
    async deleteItem() {
      try {
        await InventoryService.deleteInventory(this.itemToDelete.id);
        this.showDeleteModal = false;
        this.loadInventory();
      } catch (error) {
        console.error('Error eliminando item:', error);
      }
    }
  }
};
</script>


<style scoped>
.inventory-list {
  padding: 20px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-box {
  display: flex;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  width: 250px;
}

.search-box button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading, .no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.inventory-table th,
.inventory-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.inventory-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.inventory-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.inventory-table tr:hover {
  background-color: #f5f5f5;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status.available {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status.in_use {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status.defective {
  background-color: #ffebee;
  color: #c62828;
}

.status.in_repair {
  background-color: #e3f2fd;
  color: #1565c0;
}

.status.retired {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.actions button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #e0e0e0;
  font-size: 0.9em;
}

.actions button:hover {
  background-color: #bdbdbd;
}

.actions button.delete {
  background-color: #ffcdd2;
  color: #c62828;
}

.actions button.delete:hover {
  background-color: #ef9a9a;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9em;
  color: #666;
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

.modal .warning {
  color: #c62828;
  font-size: 0.9em;
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

.modal-actions button.delete {
  background-color: #f44336;
  color: white;
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

@media (max-width: 768px) {
  .inventory-table {
    font-size: 0.9em;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>