<template>
  <div class="inventory-list"> <div class="page-header">
      <div class="header-content">
        <h2>
          <i class="fas fa-map-marker-alt mr-3"></i>
          Gestión de Ubicaciones
        </h2>
        <div class="header-stats">
          </div>
      </div>
    </div>
    
    <div class="filters-section">
      <div class="search-controls">
        <div class="search-box">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            v-model="searchName" 
            placeholder="Buscar por nombre..."
            @keyup.enter="loadLocations"
          />
        </div>
      </div>
      
      <div class="action-controls">
        <div class="filter-controls-group">
          <div class="filter-group">
            <label>Tipo</label>
            <select v-model="selectedType" @change="loadLocations">
              <option value="">Todos los tipos</option>
              <option value="warehouse">Almacén</option>
              <option value="vehicle">Vehículo</option>
              <option value="client_site">Sitio Cliente</option>
              <option value="repair_shop">Taller</option>
              <option value="other">Otro</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Estado</label>
            <select v-model="selectedStatus" @change="loadLocations">
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>

          <button @click="loadLocations" class="btn-apply-filters" style="align-self: flex-end;">
            <i class="fas fa-search"></i>
            Buscar
          </button>
        </div>
        
        <div class="action-buttons">
          <router-link to="/inventory" class="btn-secondary-link">
            <i class="fas fa-boxes"></i>
            Ir a Inventario
          </router-link>
          <button class="btn-add" @click="openNewLocationForm">
            <i class="fas fa-plus"></i>
            Nueva Ubicación
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando ubicaciones...</p>
      </div>
    </div>
    
    <div v-else-if="locations.length === 0" class="empty-state">
      <div class="empty-content">
        <i class="fas fa-map-signs"></i>
        <h3>No se encontraron ubicaciones</h3>
        <p>Comienza agregando tu primera ubicación de inventario.</p>
        <button @click="openNewLocationForm" class="btn-primary">
          <i class="fas fa-plus"></i>
          Agregar Ubicación
        </button>
      </div>
    </div>
    
    <div v-else class="table-view">
      <div class="table-container">
        <table class="inventory-table"> <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Items</th>
              <th>Sub-ubicaciones</th>
              <th>Estado</th>
              <th class="actions-header">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="location in locations" :key="location.id">
              <td>
                <span class="item-id">#{{ location.id }}</span>
              </td>
              <td>
                <div class="item-name">
                  <strong>{{ location.name }}</strong>
                  <small v-if="location.address">{{ location.address }}</small>
                </div>
              </td>
              <td>{{ formatType(location.type) }}</td>
              <td>{{ location.description || '-' }}</td>
              <td>{{ location.items ? location.items.length : 0 }}</td>
              <td>{{ location.children ? location.children.length : 0 }}</td>
              <td>
                <span :class="['status-badge', location.active ? 'available' : 'defective']">
                  <i :class="location.active ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
                  {{ location.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="actions">
                <div class="action-buttons">
                  <button @click="viewLocation(location.id)" title="Ver detalles" class="btn-action view">
                     <i class="fas fa-eye"></i>
                  </button>
                  <button @click="editLocation(location.id)" title="Editar" class="btn-action edit">
                     <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    @click="toggleLocationStatus(location)" 
                    :title="location.active ? 'Desactivar' : 'Activar'"
                    :class="['btn-action', location.active ? 'unassign' : 'assign']"
                  >
                    <i :class="location.active ? 'fas fa-toggle-off' : 'fas fa-toggle-on'"></i>
                  </button>
                  <button @click="confirmDelete(location)" title="Eliminar" class="btn-action delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div v-if="totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        Mostrando {{ (currentPage - 1) * pageSize + 1 }} - 
        {{ Math.min(currentPage * pageSize, totalItems) }} de {{ totalItems }} elementos
      </div>
      
      <nav class="pagination">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          <i class="fas fa-chevron-left"></i>
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Siguiente
          <i class="fas fa-chevron-right"></i>
        </button>
      </nav>
    </div>
    
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content delete-modal">
        <div class="modal-header">
          <h3>
            <i class="fas fa-exclamation-triangle"></i>
            Confirmar Eliminación
          </h3>
          <button @click="showDeleteModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro que desea eliminar la ubicación <strong>{{ locationToDelete.name }}</strong>?</p>
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i>
            Esta acción no se puede deshacer.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showDeleteModal = false" class="btn-secondary">Cancelar</button>
          <button @click="deleteLocation" class="btn-danger">
            <i class="fas fa-trash"></i>
            Eliminar
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="showLocationModal" class="modal-overlay" @click.self="showLocationModal = false">
      <div class="modal-content location-modal">
        <div class="modal-header">
          <h3>
            <i :class="editingLocation ? 'fas fa-edit' : 'fas fa-plus-circle'"></i>
            {{ editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación' }}
          </h3>
          <button @click="showLocationModal = false" class="modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form @submit.prevent="saveLocation">
          <div class="modal-body">
            <div class="form-group">
              <label for="locationName">Nombre *</label>
              <input type="text" id="locationName" v-model="currentLocation.name" required class="form-control" />
            </div>
            <div class="form-group">
              <label for="locationType">Tipo *</label>
              <select id="locationType" v-model="currentLocation.type" required class="form-control">
                <option value="warehouse">Almacén</option>
                <option value="vehicle">Vehículo</option>
                <option value="client_site">Sitio Cliente</option>
                <option value="repair_shop">Taller</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label for="locationDescription">Descripción</label>
              <textarea id="locationDescription" v-model="currentLocation.description" rows="3" class="form-control"></textarea>
            </div>
            <div class="form-group">
              <label for="locationAddress">Dirección</label>
              <input type="text" id="locationAddress" v-model="currentLocation.address" class="form-control" />
            </div>
            <div class="form-group">
              <label for="parentLocation">Ubicación Padre</label>
              <select id="parentLocation" v-model="currentLocation.parent_id" class="form-control">
                <option :value="null">Sin ubicación padre</option>
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
          </div>
          <div class="modal-footer">
            <button type="button" @click="showLocationModal = false" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              <i v-if="saving" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import InventoryService from '../../services/inventory.service';

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
/* ===============================
   IMPORTAR ESTILOS GLOBALES
   =============================== */
/* Esto asume que los estilos de 'InventoryManagementView.vue' 
  están en un archivo CSS separado que puedes importar.
  
  SI NO ES ASÍ, copia y pega el bloque <style scoped> COMPLETO
  de 'InventoryManagementView.vue' aquí mismo.
*/
/* @import '@/styles/inventory-list.css'; */


/* ===============================
   COPIA Y PEGA EL CSS DE INVENTORYMANAGEMENTVIEW.VUE AQUÍ
   
   (Pego una versión resumida para que se vea igual)
   =============================== */
.inventory-list {
  --primary-color: #667eea;
  --primary-hover: #5a67d8;
  --secondary-color: #718096;
  --success-color: #48bb78;
  --warning-color: #ed8936;
  --error-color: #f56565;
  --info-color: #4299e1;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f7fafc;
  --bg-tertiary: #edf2f7;
  --bg-group: #f1f5f9;
  
  --text-primary: #2d3748;
  --text-secondary: #4a5568;
  --text-muted: #718096;
  
  --border-color: #e2e8f0;
  --border-hover: #cbd5e0;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}

.inventory-list {
  padding: var(--spacing-xl);
  background-color: var(--bg-secondary);
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* --- Header --- */
.page-header {
  background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  color: white;
  box-shadow: var(--shadow-lg);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.header-content h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
}

.header-content h2 i {
  margin-right: var(--spacing-md);
  opacity: 0.9;
}

.header-stats {
  display: flex;
  gap: var(--spacing-lg);
}

/* --- Filtros --- */
.filters-section {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.search-controls {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 300px;
  max-width: 500px;
}

.search-box input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 2.5rem;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}

.filter-group select {
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.filter-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

.btn-apply-filters {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-apply-filters {
  background: var(--primary-color);
  color: white;
}

.btn-apply-filters:hover {
  background: var(--primary-hover);
}

/* --- Controles de Acción --- */
.action-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.filter-controls-group {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-md);
}

.btn-add {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  background: var(--success-color);
  color: white;
}
.btn-add:hover {
  background: #38a169;
}

.btn-secondary-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  text-decoration: none;
  font-size: 1rem;
}
.btn-secondary-link:hover {
  background: var(--border-color);
}

/* --- Estados de Carga/Vacío --- */
.loading-state, .empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}
.loading-spinner {
  text-align: center;
  color: var(--text-muted);
}
.loading-spinner i {
  font-size: 2rem;
  margin-bottom: var(--spacing-md);
  color: var(--primary-color);
}
.empty-content {
  text-align: center;
  max-width: 400px;
  padding: var(--spacing-xl);
}
.empty-content i {
  font-size: 4rem;
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}
.empty-content h3 {
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}
.empty-content p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-lg);
}
.btn-primary {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  background: var(--primary-hover);
}

/* --- Estilos de Tabla --- */
.table-view {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}
.table-container {
  overflow-x: auto;
}
.inventory-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.inventory-table th {
  background: var(--bg-tertiary);
  padding: var(--spacing-md);
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
}
.inventory-table td {
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
.inventory-table tr:hover {
  background: var(--bg-secondary);
}
.item-id {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 600;
  color: var(--text-secondary);
}
.item-name strong {
  color: var(--text-primary);
  display: block;
}
.item-name small {
  color: var(--text-muted);
  font-size: 0.75rem;
  display: block;
  margin-top: var(--spacing-xs);
}

/* --- Badges de Estado --- */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status-badge.available { /* (Activa) */
  background: #e6fffa;
  color: #234e52;
}
.status-badge.defective { /* (Inactiva) */
  background: #fed7d7;
  color: #742a2a;
}

/* --- Botones de Acción --- */
.actions {
  white-space: nowrap;
}
.action-buttons {
  display: flex;
  gap: var(--spacing-xs);
}
.btn-action {
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.btn-action:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.btn-action.view {
  background: var(--info-color);
  color: white;
}
.btn-action.edit {
  background: var(--warning-color);
  color: white;
}
.btn-action.assign { /* (Activar) */
  background: var(--success-color);
  color: white;
}
.btn-action.unassign { /* (Desactivar) */
  background: #e53e3e;
  color: white;
}
.btn-action.delete {
  background: var(--error-color);
  color: white;
}

/* --- Paginación --- */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-lg);
  border: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}
.pagination-info {
  color: var(--text-secondary);
  font-size: 0.875rem;
}
.pagination {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.pagination-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}
.pagination-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Modales --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
  padding: var(--spacing-lg);
}
.modal-content {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
  width: 500px; /* Ancho estándar para modales de formulario */
}
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.modal-header {
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-color) 0%, #764ba2 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.modal-close {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  transition: background 0.2s ease;
}
.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
}
.modal-body {
  padding: var(--spacing-xl);
  max-height: 60vh;
  overflow-y: auto;
}
.modal-footer {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  border-top: 1px solid var(--border-color);
}
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-secondary:hover {
  background: var(--border-color);
}
.btn-danger {
  background: var(--error-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-danger:hover {
  background: #e53e3e;
}
.btn-danger:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.alert {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.alert-warning {
  background: #fef5e7;
  color: #744210;
  border: 1px solid #f6e05e;
}

/* --- Estilos de Formulario --- */
.form-group {
  margin-bottom: var(--spacing-lg);
}
.form-group label {
  display: block;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: 0.875rem;
}
.form-control {
  width: 100%;
  padding: var(--spacing-md);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
}
.form-control:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--text-primary);
}
.checkbox-label input[type="checkbox"] {
  width: auto;
}
</style>

