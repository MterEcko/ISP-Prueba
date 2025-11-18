<template>
  <div class="inventory-filters-container">
    <!-- Panel de filtros -->
    <div class="filters-panel">
      <!-- Sección superior con título y acciones -->
      <div class="filters-header">
        <h3 class="filters-title">
          <i class="icon-filter"></i>
          <span>Filtros avanzados</span>
        </h3>
        
        <div class="filters-actions">
          <button 
            type="button" 
            class="btn-link"
            @click="resetFilters"
            :disabled="!hasActiveFilters"
          >
            Limpiar filtros
          </button>
          
          <button 
            type="button"
            class="btn-icon toggle-filters"
            :class="{ 'active': isExpanded }"
            @click="toggleFiltersPanel"
            :title="isExpanded ? 'Contraer panel' : 'Expandir panel'"
          >
            <i :class="isExpanded ? 'icon-chevron-up' : 'icon-chevron-down'"></i>
          </button>
        </div>
      </div>
      
      <!-- Resumen de filtros activos (visible cuando está colapsado) -->
      <div v-if="!isExpanded && hasActiveFilters" class="active-filters-summary">
        <div v-for="(value, key) in getActiveFilters()" :key="key" class="filter-tag">
          <span class="filter-label">{{ getFilterLabel(key) }}:</span>
          <span class="filter-value">{{ formatFilterValue(key, value) }}</span>
          <button 
            type="button" 
            class="filter-remove" 
            @click="removeFilter(key)"
            title="Quitar filtro"
          >
            <i class="icon-x"></i>
          </button>
        </div>
      </div>
      
      <!-- Panel de filtros detallado (visible cuando está expandido) -->
      <div v-if="isExpanded" class="filters-content">
        <div class="filters-grid">
          <!-- Filtro por categoría -->
          <div class="filter-group">
            <label for="category">Categoría</label>
            <select id="category" v-model="filters.category" class="form-control" @change="handleCategoryChange">
              <option value="">Todas las categorías</option>
              <option 
                v-for="category in categories" 
                :key="category.id" 
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <!-- Filtro por tipo -->
          <div class="filter-group">
            <label for="type">Tipo</label>
            <select id="type" v-model="filters.type" class="form-control" :disabled="!filters.category">
              <option value="">Todos los tipos</option>
              <option 
                v-for="type in filteredTypes" 
                :key="type.id" 
                :value="type.id"
              >
                {{ type.name }}
              </option>
            </select>
          </div>
          
          <!-- Filtro por estado -->
          <div class="filter-group">
            <label for="status">Estado</label>
            <div class="checkbox-group">
              <label 
                v-for="status in statuses" 
                :key="status.id"
                class="checkbox-label"
              >
                <input 
                  type="checkbox" 
                  :value="status.id" 
                  v-model="selectedStatuses"
                  @change="updateStatusFilter"
                >
                <span class="status-badge" :class="getStatusClass(status.id)">
                  {{ status.name }}
                </span>
              </label>
            </div>
          </div>
          
          <!-- Filtro por ubicación -->
          <div class="filter-group">
            <label for="location">Ubicación</label>
            <select id="location" v-model="filters.location" class="form-control">
              <option value="">Todas las ubicaciones</option>
              <option 
                v-for="location in locations" 
                :key="location.id" 
                :value="location.id"
              >
                {{ location.name }}
              </option>
            </select>
          </div>
          
          <!-- Filtro por asignación -->
          <div class="filter-group">
            <label for="assignmentStatus">Asignación</label>
            <select id="assignmentStatus" v-model="filters.assignmentStatus" class="form-control">
              <option value="">Cualquier estado</option>
              <option value="assigned">Asignados</option>
              <option value="unassigned">No asignados</option>
            </select>
          </div>
          
          <!-- Filtro por cliente (si está asignado) -->
          <div class="filter-group" v-if="filters.assignmentStatus === 'assigned'">
            <label for="clientId">Cliente</label>
            <select id="clientId" v-model="filters.clientId" class="form-control">
              <option value="">Todos los clientes</option>
              <option 
                v-for="client in clients" 
                :key="client.id" 
                :value="client.id"
              >
                {{ client.name }}
              </option>
            </select>
          </div>
          
          <!-- Filtro por fecha de compra -->
          <div class="filter-group filter-date-range">
            <label>Fecha de compra</label>
            <div class="date-range-inputs">
              <div class="date-input">
                <label for="purchaseDateFrom" class="sublabel">Desde</label>
                <input 
                  id="purchaseDateFrom" 
                  type="date" 
                  v-model="filters.purchaseDateFrom" 
                  class="form-control"
                >
              </div>
              <div class="date-input">
                <label for="purchaseDateTo" class="sublabel">Hasta</label>
                <input 
                  id="purchaseDateTo" 
                  type="date" 
                  v-model="filters.purchaseDateTo" 
                  class="form-control"
                >
              </div>
            </div>
          </div>
          
          <!-- Filtro por garantía -->
          <div class="filter-group">
            <label for="warrantyStatus">Garantía</label>
            <select id="warrantyStatus" v-model="filters.warrantyStatus" class="form-control">
              <option value="">Cualquier estado</option>
              <option value="valid">En garantía</option>
              <option value="expired">Garantía vencida</option>
              <option value="expiring">Vence en 30 días</option>
              <option value="none">Sin garantía</option>
            </select>
          </div>
          
          <!-- Búsqueda en especificaciones técnicas -->
          <div class="filter-group filter-specifications">
            <label for="specifications">Especificaciones técnicas</label>
            <div class="specifications-filter">
              <input 
                id="specificationsKey" 
                type="text" 
                v-model="specKey" 
                placeholder="Propiedad" 
                class="form-control"
              >
              <input 
                id="specificationsValue" 
                type="text" 
                v-model="specValue" 
                placeholder="Valor" 
                class="form-control"
              >
              <button 
                type="button" 
                class="btn-icon add-spec-filter"
                @click="addSpecificationFilter"
                :disabled="!specKey"
                title="Agregar filtro"
              >
                <i class="icon-plus"></i>
              </button>
            </div>
            
            <!-- Lista de filtros de especificaciones agregados -->
            <div v-if="specFilters.length > 0" class="spec-filters-list">
              <div 
                v-for="(spec, index) in specFilters" 
                :key="index" 
                class="spec-filter-item"
              >
                <div class="spec-filter-text">
                  <span class="spec-key">{{ spec.key }}</span>
                  <span v-if="spec.value" class="spec-separator">:</span>
                  <span v-if="spec.value" class="spec-value">{{ spec.value }}</span>
                </div>
                <button 
                  type="button" 
                  class="btn-icon remove-spec-filter"
                  @click="removeSpecificationFilter(index)"
                  title="Quitar filtro"
                >
                  <i class="icon-x"></i>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Filtro por rango de costo -->
          <div class="filter-group filter-cost-range">
            <label>Costo</label>
            <div class="cost-range-inputs">
              <div class="cost-input">
                <label for="costFrom" class="sublabel">Desde</label>
                <div class="input-group">
                  <div class="input-prefix">$</div>
                  <input 
                    id="costFrom" 
                    type="number" 
                    v-model.number="filters.costFrom" 
                    min="0" 
                    step="1" 
                    class="form-control"
                  >
                </div>
              </div>
              <div class="cost-input">
                <label for="costTo" class="sublabel">Hasta</label>
                <div class="input-group">
                  <div class="input-prefix">$</div>
                  <input 
                    id="costTo" 
                    type="number" 
                    v-model.number="filters.costTo" 
                    min="0" 
                    step="1" 
                    class="form-control"
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Botón para aplicar filtros -->
        <div class="filters-actions-bottom">
          <button 
            type="button" 
            class="btn-primary apply-filters" 
            @click="applyFilters"
          >
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
    
    <!-- Chips de filtros activos (visible siempre) -->
    <div v-if="showFilterChips && hasActiveFilters" class="active-filters-chips">
      <span class="filters-label">Filtros activos:</span>
      <div class="filter-chips">
        <div 
          v-for="(value, key) in getActiveFilters()" 
          :key="key" 
          class="filter-chip"
        >
          <span class="chip-label">{{ getFilterLabel(key) }}:</span>
          <span class="chip-value">{{ formatFilterValue(key, value) }}</span>
          <button 
            type="button" 
            class="chip-remove" 
            @click="removeFilter(key)"
            title="Quitar filtro"
          >
            <i class="icon-x"></i>
          </button>
        </div>
        
        <button 
          type="button" 
          class="clear-all-chip" 
          @click="resetFilters"
        >
          Limpiar todos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import inventoryService from '@/services/inventory';
import clientService from '@/services/client';

export default {
  name: 'InventoryFilters',
  props: {
    // Si se muestran los chips de filtros activos
    showFilterChips: {
      type: Boolean,
      default: true
    },
    
    // Si el panel de filtros está expandido inicialmente
    initiallyExpanded: {
      type: Boolean,
      default: true
    },
    
    // Filtros iniciales (para restaurar estado)
    initialFilters: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      // Estado del panel
      isExpanded: this.initiallyExpanded,
      
      // Filtros
      filters: {
        category: '',
        type: '',
        status: '',
        location: '',
        assignmentStatus: '',
        clientId: '',
        purchaseDateFrom: '',
        purchaseDateTo: '',
        warrantyStatus: '',
        specifications: [],
        costFrom: null,
        costTo: null
      },
      
      // Metadatos
      categories: [],
      types: [],
      statuses: [],
      locations: [],
      clients: [],
      
      // Control de filtros múltiples
      selectedStatuses: [],
      
      // Control de filtros de especificaciones
      specKey: '',
      specValue: '',
      specFilters: []
    };
  },
  computed: {
    /**
     * Verificar si hay filtros activos
     */
    hasActiveFilters() {
      const activeFilters = this.getActiveFilters();
      return Object.keys(activeFilters).length > 0;
    },
    
    /**
     * Filtrar tipos según la categoría seleccionada
     */
    filteredTypes() {
      if (!this.filters.category) {
        return [];
      }
      
      return this.types.filter(type => type.categoryId === this.filters.category);
    }
  },
  created() {
    // Cargar datos necesarios
    this.loadMetadata();
    
    // Inicializar filtros con valores proporcionados
    this.initializeFilters();
  },
  methods: {
    /**
     * Cargar metadatos necesarios
     */
    async loadMetadata() {
      try {
        // Cargar categorías, estados, ubicaciones, etc.
        const [categories, types, statuses, locations, clients] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getTypes(),
          inventoryService.getStatuses(),
          inventoryService.getLocations(),
          clientService.getActiveClients()
        ]);
        
        this.categories = categories;
        this.types = types;
        this.statuses = statuses;
        this.locations = locations;
        this.clients = clients;
        
        // Inicializar estados seleccionados si hay filtro inicial
        if (this.initialFilters.status) {
          if (Array.isArray(this.initialFilters.status)) {
            this.selectedStatuses = [...this.initialFilters.status];
          } else {
            this.selectedStatuses = [this.initialFilters.status];
          }
        }
        
        // Inicializar filtros de especificaciones si hay iniciales
        if (this.initialFilters.specifications && Array.isArray(this.initialFilters.specifications)) {
          this.specFilters = [...this.initialFilters.specifications];
        }
      } catch (error) {
        console.error('Error al cargar metadatos para filtros:', error);
        this.$emit('error', 'Error al cargar datos para filtros. Por favor, intente nuevamente.');
      }
    },
    
    /**
     * Inicializar filtros con valores proporcionados
     */
    initializeFilters() {
      // Inicializar con filtros proporcionados
      if (this.initialFilters) {
        for (const key in this.initialFilters) {
          if (key in this.filters) {
            this.filters[key] = this.initialFilters[key];
          }
        }
      }
    },
    
    /**
     * Manejar cambio de categoría (para filtrar tipos)
     */
    handleCategoryChange() {
      // Resetear tipo al cambiar de categoría
      this.filters.type = '';
    },
    
    /**
     * Alternar panel de filtros expandido/contraído
     */
    toggleFiltersPanel() {
      this.isExpanded = !this.isExpanded;
    },
    
    /**
     * Actualizar filtro de estados desde checkboxes
     */
    updateStatusFilter() {
      if (this.selectedStatuses.length === 0) {
        this.filters.status = '';
      } else {
        // Convertir array de estados seleccionados a string para el filtro
        this.filters.status = this.selectedStatuses;
      }
    },
    
    /**
     * Agregar filtro de especificación
     */
    addSpecificationFilter() {
      if (!this.specKey) {
        return;
      }
      
      // Crear nuevo filtro de especificación
      const newSpec = {
        key: this.specKey,
        value: this.specValue
      };
      
      // Agregar a la lista
      this.specFilters.push(newSpec);
      
      // Actualizar filtro
      this.filters.specifications = this.specFilters;
      
      // Limpiar campos
      this.specKey = '';
      this.specValue = '';
    },
    
    /**
     * Eliminar filtro de especificación
     */
    removeSpecificationFilter(index) {
      this.specFilters.splice(index, 1);
      this.filters.specifications = this.specFilters;
    },
    
    /**
     * Aplicar filtros actuales
     */
    applyFilters() {
      // Emitir evento con filtros actuales
      this.$emit('apply-filters', { ...this.filters });
      
      // Contraer panel si es necesario
      if (this.isExpanded) {
        this.isExpanded = false;
      }
    },
    
    /**
     * Resetear todos los filtros
     */
    resetFilters() {
      // Limpiar todos los filtros
      this.filters = {
        category: '',
        type: '',
        status: '',
        location: '',
        assignmentStatus: '',
        clientId: '',
        purchaseDateFrom: '',
        purchaseDateTo: '',
        warrantyStatus: '',
        specifications: [],
        costFrom: null,
        costTo: null
      };
      
      // Limpiar estados seleccionados
      this.selectedStatuses = [];
      
      // Limpiar filtros de especificaciones
      this.specFilters = [];
      this.specKey = '';
      this.specValue = '';
      
      // Aplicar filtros (vacíos)
      this.applyFilters();
    },
    
    /**
     * Eliminar un filtro específico
     */
    removeFilter(key) {
      // Manejar casos especiales
      // eslint-disable-next-line no-unused-vars
      if (key === 'status') {
        this.selectedStatuses = [];
      } else if (key === 'specifications') {
        this.specFilters = [];
      }
      
      // Limpiar el filtro
      if (key in this.filters) {
        if (Array.isArray(this.filters[key])) {
          this.filters[key] = [];
        } else if (typeof this.filters[key] === 'number') {
          this.filters[key] = null;
        } else {
      // eslint-disable-next-line no-unused-vars
          this.filters[key] = '';
        }
      }
      
      // Aplicar filtros
      this.applyFilters();
    },
    
    /**
     * Obtener filtros activos (elimina valores vacíos)
     */
    getActiveFilters() {
      const activeFilters = {};
      
      for (const key in this.filters) {
        const value = this.filters[key];
        
        // Verificar si el filtro tiene valor
        if (
          (value !== '' && value !== null) && 
          !(Array.isArray(value) && value.length === 0)
        ) {
          activeFilters[key] = value;
        }
      }
      
      return activeFilters;
    },
    
    /**
     * Obtener etiqueta legible para un filtro
     */
    getFilterLabel(key) {
      const labels = {
        category: 'Categoría',
        type: 'Tipo',
        status: 'Estado',
        location: 'Ubicación',
        assignmentStatus: 'Asignación',
        clientId: 'Cliente',
        purchaseDateFrom: 'Compra desde',
        purchaseDateTo: 'Compra hasta',
        warrantyStatus: 'Garantía',
        specifications: 'Especificaciones',
        costFrom: 'Costo desde',
        costTo: 'Costo hasta'
      };
      
      return labels[key] || key;
    },
    
    /**
     * Formatear valor de filtro para mostrar
     */
    formatFilterValue(key, value) {
      // Casos especiales según el tipo de filtro
      switch (key) {
        case 'category':
          return this.getCategoryName(value);
          
        case 'type':
          return this.getTypeName(value);
          
        case 'status':
          if (Array.isArray(value)) {
            return value.map(id => this.getStatusName(id)).join(', ');
          }
          return this.getStatusName(value);
          
        case 'location':
          return this.getLocationName(value);
          
        case 'assignmentStatus':
          return value === 'assigned' ? 'Asignados' : 'No asignados';
          
        case 'clientId':
          return this.getClientName(value);
          
        case 'warrantyStatus':
          // eslint-disable-next-line no-case-declarations
          const warrantyLabels = {
            valid: 'En garantía',
            expired: 'Vencida',
            expiring: 'Vence pronto',
            none: 'Sin garantía'
          };
          return warrantyLabels[value] || value;
          
        case 'specifications':
          if (Array.isArray(value) && value.length > 0) {
            return `${value.length} filtro${value.length > 1 ? 's' : ''}`;
          }
          return value;
          
        case 'costFrom':
          return `$${value}`;
          
        case 'costTo':
          return `$${value}`;
          
        case 'purchaseDateFrom':
        case 'purchaseDateTo':
          return this.formatDate(value);
          
        default:
          return value;
      }
    },
    
    /**
     * Formatear fecha para visualización
     */
    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    
    /**
     * Obtener nombre de categoría
     */
    getCategoryName(categoryId) {
      if (!categoryId) return '';
      
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    },
    
    /**
     * Obtener nombre de tipo
     */
    getTypeName(typeId) {
      if (!typeId) return '';
      
      const type = this.types.find(t => t.id === typeId);
      return type ? type.name : typeId;
    },
    
    /**
     * Obtener nombre de estado
     */
    getStatusName(statusId) {
      if (!statusId) return '';
      
      const status = this.statuses.find(s => s.id === statusId);
      return status ? status.name : statusId;
    },
    
    /**
     * Obtener clase CSS para el estado
     */
    getStatusClass(statusId) {
      if (!statusId) return '';
      
      const status = this.statuses.find(s => s.id === statusId);
      if (!status) return '';
      
      return `status-${status.id.toLowerCase().replace(/\s+/g, '-')}`;
    },
    
    /**
     * Obtener nombre de ubicación
     */
    getLocationName(locationId) {
      if (!locationId) return '';
      
      const location = this.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
    },
    
    /**
     * Obtener nombre de cliente
     */
    getClientName(clientId) {
      if (!clientId) return '';
      
      const client = this.clients.find(c => c.id === clientId);
      return client ? client.name : clientId;
    }
  }
};
</script>

<style scoped>
.inventory-filters-container {
  margin-bottom: 24px;
}

/* Panel de filtros */
.filters-panel {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  overflow: hidden;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.filters-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.filters-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color, #1976d2);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  text-decoration: none;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: transparent;
  color: var(--text-secondary, #666);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: var(--text-primary, #333);
}

.btn-icon.active {
  color: var(--primary-color, #1976d2);
}

/* Resumen de filtros activos */
.active-filters-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  font-size: 13px;
}

.filter-label {
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.filter-value {
  color: var(--text-primary, #333);
}

.filter-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.filter-remove:hover {
  color: var(--error-color, #f44336);
}

/* Contenido de filtros */
.filters-content {
  padding: 16px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.filter-group {
  margin-bottom: 16px;
}

.filter-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: var(--bg-primary, white);
  transition: border-color 0.2s ease;
}

.form-control:focus {
  border-color: var(--primary-color, #1976d2);
  outline: none;
}

.form-control:disabled {
  background-color: var(--bg-secondary, #f5f5f5);
  cursor: not-allowed;
}

/* Checkboxes para estados */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  margin: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
}

/* Clases para diferentes estados */
.status-active {
  background-color: var(--success-light, #e8f5e9);
  color: var(--success-color, #4caf50);
}

.status-inactive {
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ff9800);
}

.status-maintenance {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #2196f3);
}

.status-damaged {
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #f44336);
}

.status-reserved {
  background-color: var(--purple-light, #f3e5f5);
  color: var(--purple-color, #9c27b0);
}

.status-assigned {
  background-color: var(--teal-light, #e0f2f1);
  color: var(--teal-color, #009688);
}

/* Filtro de rango de fechas */
.filter-date-range {
  grid-column: span 2;
}

.date-range-inputs {
  display: flex;
  gap: 12px;
}

.date-input {
  flex: 1;
}

.sublabel {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-secondary, #666);
  font-weight: normal;
}

/* Filtro de especificaciones */
.filter-specifications {
  grid-column: span 2;
}

.specifications-filter {
  display: flex;
  gap: 8px;
}

.add-spec-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 36px;
  border-radius: 4px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-spec-filter:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.add-spec-filter:disabled {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  cursor: not-allowed;
  border: 1px solid var(--border-color, #e0e0e0);
}

.spec-filters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.spec-filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  font-size: 13px;
}

.spec-filter-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.spec-key {
  font-weight: 500;
  color: var(--primary-color, #1976d2);
}

.spec-separator {
  color: var(--text-secondary, #666);
}

.spec-value {
  color: var(--text-primary, #333);
}

.remove-spec-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
}

.remove-spec-filter:hover {
  color: var(--error-color, #f44336);
}

/* Filtro de rango de costo */
.filter-cost-range {
  grid-column: span 2;
}

.cost-range-inputs {
  display: flex;
  gap: 12px;
}

.cost-input {
  flex: 1;
}

.input-group {
  display: flex;
  align-items: center;
}

.input-prefix {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-right: none;
  border-radius: 6px 0 0 6px;
  color: var(--text-secondary, #666);
  height: 36px;
}

.input-group .form-control {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  flex: 1;
}

/* Botones de acción */
.filters-actions-bottom {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

/* Chips de filtros activos */
.active-filters-chips {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  margin-bottom: 16px;
}

.filters-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--primary-lightest, #e3f2fd);
  border: 1px solid var(--primary-lighter, #bbdefb);
  border-radius: 16px;
  font-size: 13px;
}

.chip-label {
  font-weight: 500;
  color: var(--primary-dark, #1565c0);
}

.chip-value {
  color: var(--primary-color, #1976d2);
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: none;
  border: none;
  color: var(--primary-color, #1976d2);
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
}

.chip-remove:hover {
  color: var(--error-color, #f44336);
}

.clear-all-chip {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-chip:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* Responsive */
@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-date-range,
  .filter-cost-range,
  .filter-specifications {
    grid-column: span 1;
  }
  
  .specifications-filter {
    flex-direction: column;
    gap: 8px;
  }
  
  .date-range-inputs,
  .cost-range-inputs {
    flex-direction: column;
    gap: 8px;
  }
  
  .filters-label {
    display: none;
  }
}
</style>
