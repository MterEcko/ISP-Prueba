<template>
  <div class="location-list">
    <h2>Gestión de Ubicaciones de Inventario</h2>
    
    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchName" 
          placeholder="Buscar por nombre"
          @keyup.enter="loadLocations"
        />
        <button @click="loadLocations">Buscar</button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedType" @change="loadLocations">
          <option value="">Todos los tipos</option>
          <option value="warehouse">Almacén</option>
          <option value="vehicle">Vehículo</option>
          <option value="client_site">Sitio Cliente</option>
          <option value="repair_shop">Taller</option>
          <option value="other">Otro</option>
        </select>
        
        <select v-model="selectedStatus" @change="loadLocations">
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </div>
      
      <button class="add-button" @click="openNewLocationForm">+ Nueva Ubicación</button>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando ubicaciones...
    </div>
    
    <div v-else-if="locations.length === 0" class="no-data">
      No se encontraron ubicaciones.
    </div>
    
    <table v-else class="location-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Tipo</th>
          <th>Descripción</th>
          <th>Items</th>
          <th>Sub-ubicaciones</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="location in locations" :key="location.id">
          <td>{{ location.id }}</td>
          <td>{{ location.name }}</td>
          <td>{{ formatType(location.type) }}</td>
          <td>{{ location.description || '-' }}</td>
          <td>{{ location.items ? location.items.length : 0 }}</td>
          <td>{{ location.children ? location.children.length : 0 }}</td>
          <td>
            <span :class="['status', location.active ? 'active' : 'inactive']">
              {{ location.active ? 'Activa' : 'Inactiva' }}
            </span>
          </td>
          <td class="actions">
            <button @click="viewLocation(location.id)" title="Ver detalles">
              Ver
            </button>
            <button @click="editLocation(location.id)" title="Editar">
              Editar
            </button>
            <button 
              @click="toggleLocationStatus(location)" 
              :title="location.active ? 'Desactivar' : 'Activar'"
            >
              {{ location.active ? 'Desactivar' : 'Activar' }}
            </button>
            <button @click="confirmDelete(location)" title="Eliminar" class="delete">
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
        <p>¿Está seguro que desea eliminar la ubicación <strong>{{ locationToDelete.name }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false">Cancelar</button>
          <button @click="deleteLocation" class="delete">Eliminar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal para crear/editar ubicación -->
    <div v-if="showLocationModal" class="modal">
      <div class="modal-content">
        <h3>{{ editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación' }}</h3>
        <form @submit.prevent="saveLocation">
          <div class="form-group">
            <label for="locationName">Nombre *</label>
            <input type="text" id="locationName" v-model="currentLocation.name" required />
          </div>
          <div class="form-group">
            <label for="locationType">Tipo *</label>
            <select id="locationType" v-model="currentLocation.type" required>
              <option value="warehouse">Almacén</option>
              <option value="vehicle">Vehículo</option>
              <option value="client_site">Sitio Cliente</option>
              <option value="repair_shop">Taller</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label for="locationDescription">Descripción</label>
            <textarea id="locationDescription" v-model="currentLocation.description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="locationAddress">Dirección</label>
            <input type="text" id="locationAddress" v-model="currentLocation.address" />
          </div>
          <div class="form-group">
            <label for="parentLocation">Ubicación Padre</label>
            <select id="parentLocation" v-model="currentLocation.parent_id">
              <option value="">Sin ubicación padre</option>
              <option v-for="location in parentLocations" :key="location.id" :value="location.id">
                {{ location.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="currentLocation.active" />
              Ubicación activa
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showLocationModal = false">Cancelar</button>
            <button type="submit" class="save" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import InventoryService from '../services/inventory.service';

export default {
  name: 'InventoryLocationList',
  data() {
    return {
      locations: [],
      parentLocations: [],
      loading: false,
      saving: false,
      searchName: '',
      selectedType: '',
      selectedStatus: '',
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      showDeleteModal: false,
      locationToDelete: null,
      showLocationModal: false,
      editingLocation: false,
      currentLocation: {
        name: '',
        type: 'warehouse',
        description: '',
        address: '',
        parent_id: '',
        active: true
      }
    };
  },
  created() {
    this.loadLocations();
  },
  methods: {
    async loadLocations() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          name: this.searchName || undefined,
          type: this.selectedType || undefined,
          active: this.selectedStatus || undefined
        };
        
        const response = await InventoryService.getAllLocations(params);
        this.locations = response.data.locations || response.data || [];
        this.totalItems = response.data.totalItems || this.locations.length;
        this.totalPages = response.data.totalPages || 1;
        
        // Cargar ubicaciones para parent dropdown (excluyendo la actual si estamos editando)
        this.loadParentLocations();
      } catch (error) {
        console.error('Error cargando ubicaciones:', error);
      } finally {
        this.loading = false;
      }
    },
    async loadParentLocations() {
      try {
        const response = await InventoryService.getAllLocations({ active: true });
        this.parentLocations = (response.data.locations || response.data || [])
          .filter(loc => !this.editingLocation || loc.id !== this.currentLocation.id);
      } catch (error) {
        console.error('Error cargando ubicaciones padre:', error);
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadLocations();
      }
    },
    formatType(type) {
      const typeMap = {
        'warehouse': 'Almacén',
        'vehicle': 'Vehículo',
        'client_site': 'Sitio Cliente',
        'repair_shop': 'Taller',
        'other': 'Otro'
      };
      return typeMap[type] || type;
    },
    openNewLocationForm() {
      this.editingLocation = false;
      this.currentLocation = {
        name: '',
        type: 'warehouse',
        description: '',
        address: '',
        parent_id: '',
        active: true
      };
      this.loadParentLocations();
      this.showLocationModal = true;
    },
    viewLocation(id) {
      // Navegar a vista detallada
      console.log('Ver ubicación:', id);
    },
    editLocation(id) {
      const location = this.locations.find(l => l.id === id);
      if (location) {
        this.editingLocation = true;
        this.currentLocation = { ...location };
        this.loadParentLocations();
        this.showLocationModal = true;
      }
    },
    async toggleLocationStatus(location) {
      try {
        const updatedLocation = { ...location, active: !location.active };
        await InventoryService.updateLocation(location.id, updatedLocation);
        // Actualizar en la lista local
        location.active = !location.active;
      } catch (error) {
        console.error('Error cambiando estado de ubicación:', error);
      }
    },
    confirmDelete(location) {
      this.locationToDelete = location;
      this.showDeleteModal = true;
    },
    async deleteLocation() {
      try {
        await InventoryService.deleteLocation(this.locationToDelete.id);
        this.showDeleteModal = false;
        this.loadLocations();
      } catch (error) {
        console.error('Error eliminando ubicación:', error);
        // Mostrar mensaje de error si tiene items o sub-ubicaciones
        alert(error.message || 'Error eliminando ubicación');
      }
    },
    async saveLocation() {
      this.saving = true;
      try {
        if (this.editingLocation) {
          await InventoryService.updateLocation(this.currentLocation.id, this.currentLocation);
        } else {
          await InventoryService.createLocation(this.currentLocation);
        }
        this.showLocationModal = false;
        this.loadLocations();
      } catch (error) {
        console.error('Error guardando ubicación:', error);
        alert(error.message || 'Error guardando ubicación');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.location-list {
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

.location-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.location-table th,
.location-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.location-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.location-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.location-table tr:hover {
  background-color: #f5f5f5;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status.inactive {
  background-color: #ffebee;
  color: #c62828;
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
  width: 500px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #555;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
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

.modal-actions button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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
  .location-table {
    font-size: 0.9em;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>