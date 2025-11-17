<template>
  <div class="filter-panel">
    <div class="filter-header">
      <h3 class="filter-title">Filtros avanzados</h3>
      <div class="filter-actions">
        <div class="filter-presets" v-if="savedPresets.length > 0">
          <button class="btn-presets" @click="togglePresetMenu">
            <i class="icon-preset"></i> Filtros guardados
            <i class="icon-chevron-down"></i>
          </button>
          <div class="presets-dropdown" v-if="showPresetMenu">
            <ul>
              <li v-for="preset in savedPresets" :key="preset.name">
                <button @click="loadPreset(preset)">
                  {{ preset.name }}
                </button>
                <button class="delete-preset" @click="deletePreset(preset.name)" title="Eliminar filtro">
                  <i class="icon-delete"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="action-buttons">
          <button class="btn-save" @click="showSaveFilterModal = true" title="Guardar filtro">
            <i class="icon-save"></i> Guardar
          </button>
          <button class="btn-reset" @click="resetFilters" title="Limpiar filtros">
            <i class="icon-reset"></i> Limpiar
          </button>
        </div>
      </div>
    </div>
    
    <div class="filter-body">
      <div class="filter-grid">
        <!-- Categoría -->
        <div class="filter-group">
          <label>Categoría</label>
          <div class="category-selector">
            <div 
              v-for="category in categories" 
              :key="category.id"
              :class="['category-chip', { active: localFilters.category === category.id }]"
              @click="toggleCategory(category.id)"
            >
              <i :class="getCategoryIcon(category.code)"></i>
              <span>{{ category.name }}</span>
            </div>
          </div>
        </div>
        
        <!-- Estado -->
        <div class="filter-group">
          <label>Estado</label>
          <div class="status-selector">
            <div 
              v-for="(label, value) in statuses" 
              :key="value"
              :class="['status-chip', value, { active: localFilters.status === value }]"
              @click="toggleStatus(value)"
            >
              <span class="status-dot"></span>
              <span>{{ label }}</span>
            </div>
          </div>
        </div>
        
        <!-- Ubicación -->
        <div class="filter-group">
          <label>Ubicación</label>
          <div class="select-with-clear">
            <select v-model="localFilters.location">
              <option value="">Todas las ubicaciones</option>
              <optgroup 
                v-for="group in locationGroups" 
                :key="group.name" 
                :label="group.name"
              >
                <option 
                  v-for="location in group.locations" 
                  :key="location.id" 
                  :value="location.id"
                >
                  {{ location.name }}
                </option>
              </optgroup>
            </select>
            <button 
              v-if="localFilters.location" 
              class="clear-select" 
              @click="localFilters.location = ''"
            >
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
        
        <!-- Marca -->
        <div class="filter-group">
          <label>Marca</label>
          <div class="select-with-clear">
            <select v-model="localFilters.brand">
              <option value="">Todas las marcas</option>
              <option v-for="brand in brands" :key="brand" :value="brand">
                {{ brand }}
              </option>
            </select>
            <button 
              v-if="localFilters.brand" 
              class="clear-select" 
              @click="localFilters.brand = ''"
            >
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
        
        <!-- Cliente asignado -->
        <div class="filter-group">
          <label>Cliente</label>
          <div class="select-with-clear">
            <select v-model="localFilters.assignedOnly">
              <option value="">Todos los equipos</option>
              <option value="true">Solo asignados</option>
              <option value="false">Sin asignar</option>
            </select>
            <button 
              v-if="localFilters.assignedOnly" 
              class="clear-select" 
              @click="localFilters.assignedOnly = ''"
            >
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
        
        <!-- Stock -->
        <div class="filter-group">
          <label>Stock</label>
          <div class="select-with-clear">
            <select v-model="localFilters.inStock">
              <option value="">Todo el inventario</option>
              <option value="true">En stock</option>
              <option value="false">Fuera de stock</option>
              <option value="low">Stock bajo</option>
            </select>
            <button 
              v-if="localFilters.inStock" 
              class="clear-select" 
              @click="localFilters.inStock = ''"
            >
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
        
        <!-- Fecha de adquisición (rango) -->
        <div class="filter-group date-range">
          <label>Fecha de adquisición</label>
          <div class="date-inputs">
            <div class="date-input">
              <input 
                type="date" 
                v-model="localFilters.dateFrom" 
                placeholder="Desde"
              >
            </div>
            <span class="date-separator">-</span>
            <div class="date-input">
              <input 
                type="date" 
                v-model="localFilters.dateTo" 
                placeholder="Hasta"
              >
            </div>
            <button 
              v-if="localFilters.dateFrom || localFilters.dateTo" 
              class="clear-dates" 
              @click="clearDates"
            >
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
        
        <!-- Filtros adicionales (colapsables) -->
        <div class="additional-filters" v-if="showAdditional">
          <!-- Precio (rango) -->
          <div class="filter-group price-range">
            <label>Precio</label>
            <div class="price-inputs">
              <div class="price-input">
                <input 
                  type="number" 
                  v-model="localFilters.priceMin" 
                  placeholder="Mínimo"
                  min="0"
                  step="100"
                >
              </div>
              <span class="price-separator">-</span>
              <div class="price-input">
                <input 
                  type="number" 
                  v-model="localFilters.priceMax" 
                  placeholder="Máximo"
                  min="0"
                  step="100"
                >
              </div>
              <button 
                v-if="localFilters.priceMin || localFilters.priceMax" 
                class="clear-price" 
                @click="clearPriceRange"
              >
                <i class="icon-close"></i>
              </button>
            </div>
          </div>
          
          <!-- Proveedor -->
          <div class="filter-group">
            <label>Proveedor</label>
            <div class="select-with-clear">
              <select v-model="localFilters.supplier">
                <option value="">Todos los proveedores</option>
                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                  {{ supplier.name }}
                </option>
              </select>
              <button 
                v-if="localFilters.supplier" 
                class="clear-select" 
                @click="localFilters.supplier = ''"
              >
                <i class="icon-close"></i>
              </button>
            </div>
          </div>
          
          <!-- Garantía -->
          <div class="filter-group">
            <label>Garantía</label>
            <div class="select-with-clear">
              <select v-model="localFilters.warranty">
                <option value="">Cualquier garantía</option>
                <option value="active">En garantía</option>
                <option value="expired">Garantía vencida</option>
                <option value="expiring">Vence en 30 días</option>
                <option value="none">Sin garantía</option>
              </select>
              <button 
                v-if="localFilters.warranty" 
                class="clear-select" 
                @click="localFilters.warranty = ''"
              >
                <i class="icon-close"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Botón para mostrar más filtros -->
      <button class="toggle-additional-filters" @click="showAdditional = !showAdditional">
        {{ showAdditional ? 'Mostrar menos filtros' : 'Mostrar más filtros' }}
        <i :class="showAdditional ? 'icon-chevron-up' : 'icon-chevron-down'"></i>
      </button>
      
      <!-- Sección de filtros aplicados -->
      <div class="applied-filters" v-if="hasFilters">
        <div class="applied-filters-header">
          <span>Filtros aplicados:</span>
          <button class="clear-all-filters" @click="resetFilters">
            Limpiar todos
          </button>
        </div>
        <div class="filter-tags">
          <div class="filter-tag" v-if="localFilters.category">
            <span>Categoría: {{ getCategoryName(localFilters.category) }}</span>
            <button @click="localFilters.category = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.status">
            <span>Estado: {{ statuses[localFilters.status] }}</span>
            <button @click="localFilters.status = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.location">
            <span>Ubicación: {{ getLocationName(localFilters.location) }}</span>
            <button @click="localFilters.location = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.brand">
            <span>Marca: {{ localFilters.brand }}</span>
            <button @click="localFilters.brand = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.assignedOnly">
            <span>
              Cliente: {{ localFilters.assignedOnly === 'true' ? 'Asignados' : 'Sin asignar' }}
            </span>
            <button @click="localFilters.assignedOnly = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.inStock">
            <span>
              Stock: 
              {{ 
                localFilters.inStock === 'true' ? 'En stock' : 
                localFilters.inStock === 'false' ? 'Fuera de stock' : 'Stock bajo'
              }}
            </span>
            <button @click="localFilters.inStock = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.dateFrom || localFilters.dateTo">
            <span>
              Fecha: {{ formatDateRange(localFilters.dateFrom, localFilters.dateTo) }}
            </span>
            <button @click="clearDates">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.priceMin || localFilters.priceMax">
            <span>
              Precio: {{ formatPriceRange(localFilters.priceMin, localFilters.priceMax) }}
            </span>
            <button @click="clearPriceRange">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.supplier">
            <span>
              Proveedor: {{ getSupplierName(localFilters.supplier) }}
            </span>
            <button @click="localFilters.supplier = ''">
              <i class="icon-close"></i>
            </button>
          </div>
          
          <div class="filter-tag" v-if="localFilters.warranty">
            <span>
              Garantía: 
              {{ 
                localFilters.warranty === 'active' ? 'En garantía' : 
                localFilters.warranty === 'expired' ? 'Garantía vencida' : 
                localFilters.warranty === 'expiring' ? 'Vence en 30 días' : 'Sin garantía'
              }}
            </span>
            <button @click="localFilters.warranty = ''">
              <i class="icon-close"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Aplicar filtros -->
    <div class="filter-footer">
      <button class="btn-outline" @click="$emit('cancel')">Cancelar</button>
      <button class="btn-primary" @click="applyFilters">Aplicar filtros</button>
    </div>

    <!-- Modal para guardar filtro -->
    <div v-if="showSaveFilterModal" class="save-filter-modal">
      <div class="save-filter-content">
        <h3>Guardar filtro</h3>
        <div class="form-group">
          <label for="filterName">Nombre del filtro</label>
          <input 
            type="text" 
            id="filterName" 
            v-model="newPresetName"
            placeholder="Ej: Equipos disponibles en almacén central"
          />
        </div>
        <div class="save-filter-actions">
          <button class="btn-outline" @click="showSaveFilterModal = false">Cancelar</button>
          <button 
            class="btn-primary" 
            @click="savePreset" 
            :disabled="!newPresetName.trim()"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterPanel',
  props: {
    /**
     * Categorías disponibles para filtrar
     */
    categories: {
      type: Array,
      default: () => []
    },
    /**
     * Ubicaciones disponibles para filtrar
     */
    locations: {
      type: Array,
      default: () => []
    },
    /**
     * Estados disponibles (objeto con key = valor y value = etiqueta)
     */
    statuses: {
      type: Object,
      default: () => ({
        available: 'Disponible',
        inUse: 'En uso',
        defective: 'Defectuoso',
        inRepair: 'En reparación',
        retired: 'Retirado'
      })
    },
    /**
     * Marcas disponibles para filtrar
     */
    brands: {
      type: Array,
      default: () => []
    },
    /**
     * Clientes disponibles para filtrar
     */
    clients: {
      type: Array,
      default: () => []
    },
    /**
     * Proveedores disponibles para filtrar
     */
    suppliers: {
      type: Array,
      default: () => []
    },
    /**
     * Filtros actuales seleccionados
     */
    selectedFilters: {
      type: Object,
      default: () => ({
        category: '',
        status: '',
        location: '',
        brand: '',
        assignedOnly: '',
        inStock: '',
        dateFrom: '',
        dateTo: '',
        priceMin: '',
        priceMax: '',
        supplier: '',
        warranty: ''
      })
    }
  },
  data() {
    return {
      // Filtros locales (copia de selectedFilters)
      localFilters: {
        category: '',
        status: '',
        location: '',
        brand: '',
        assignedOnly: '',
        inStock: '',
        dateFrom: '',
        dateTo: '',
        priceMin: '',
        priceMax: '',
        supplier: '',
        warranty: ''
      },
      // Control de interfaz
      showAdditional: false,
      showPresetMenu: false,
      showSaveFilterModal: false,
      newPresetName: '',
      savedPresets: []
    };
  },
  computed: {
    /**
     * Agrupar ubicaciones por tipo para el selector
     */
    locationGroups() {
      const groups = {};
      
      // Primero encontrar todos los tipos únicos
      this.locations.forEach(location => {
        const type = location.type || 'Otros';
        if (!groups[type]) {
          groups[type] = {
            name: this.formatLocationType(type),
            locations: []
          };
        }
        groups[type].locations.push(location);
      });
      
      // Convertir a array y ordenar
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    },
    
    /**
     * Verificar si hay filtros aplicados
     */
    hasFilters() {
      return Object.values(this.localFilters).some(value => 
        value !== '' && value !== null && value !== undefined
      );
    }
  },
  created() {
    // Inicializar filtros locales con los valores proporcionados
    this.localFilters = { ...this.selectedFilters };
    
    // Cargar filtros guardados desde localStorage
    this.loadSavedPresets();
  },
  methods: {
    /**
     * Aplicar filtros y emitir evento
     */
    applyFilters() {
      this.$emit('filter-change', { ...this.localFilters });
    },
    
    /**
     * Resetear todos los filtros
     */
    resetFilters() {
      this.localFilters = {
        category: '',
        status: '',
        location: '',
        brand: '',
        assignedOnly: '',
        inStock: '',
        dateFrom: '',
        dateTo: '',
        priceMin: '',
        priceMax: '',
        supplier: '',
        warranty: ''
      };
      this.$emit('reset-filters');
    },
    
    /**
     * Alternar selección de categoría
     */
    toggleCategory(categoryId) {
      this.localFilters.category = this.localFilters.category === categoryId ? '' : categoryId;
    },
    
    /**
     * Alternar selección de estado
     */
    toggleStatus(status) {
      this.localFilters.status = this.localFilters.status === status ? '' : status;
    },
    
    /**
     * Limpiar rango de fechas
     */
    clearDates() {
      this.localFilters.dateFrom = '';
      this.localFilters.dateTo = '';
    },
    
    /**
     * Limpiar rango de precios
     */
    clearPriceRange() {
      this.localFilters.priceMin = '';
      this.localFilters.priceMax = '';
    },
    
    /**
     * Formatear tipo de ubicación para mostrar
     */
    formatLocationType(type) {
      const typeMap = {
        warehouse: 'Almacenes',
        office: 'Oficinas',
        client: 'Clientes',
        technician: 'Técnicos',
        other: 'Otros'
      };
      
      return typeMap[type.toLowerCase()] || type;
    },
    
    /**
     * Obtener nombre de categoría por ID
     */
    getCategoryName(categoryId) {
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    },
    
    /**
     * Obtener ícono de categoría por código
     */
    getCategoryIcon(categoryCode) {
      const iconMap = {
        router: 'icon-router',
        antenna: 'icon-antenna',
        switch: 'icon-switch',
        cable: 'icon-cable',
        accessory: 'icon-accessory',
        computer: 'icon-computer',
        phone: 'icon-phone',
        other: 'icon-device'
      };
      
      return iconMap[categoryCode] || 'icon-device';
    },
    
    /**
     * Obtener nombre de ubicación por ID
     */
    getLocationName(locationId) {
      const location = this.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
    },
    
    /**
     * Obtener nombre de proveedor por ID
     */
    getSupplierName(supplierId) {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      return supplier ? supplier.name : supplierId;
    },
    
    /**
     * Formatear rango de fechas para mostrar
     */
    formatDateRange(from, to) {
      if (from && to) {
        return `${this.formatDate(from)} - ${this.formatDate(to)}`;
      } else if (from) {
        return `Desde ${this.formatDate(from)}`;
      } else if (to) {
        return `Hasta ${this.formatDate(to)}`;
      }
      return '';
    },
    
    /**
     * Formatear fecha para mostrar
     */
    formatDate(dateString) {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch (error) {
        return dateString;
      }
    },
    
    /**
     * Formatear rango de precios para mostrar
     */
    formatPriceRange(min, max) {
      if (min && max) {
        return `$${min} - $${max}`;
      } else if (min) {
        return `Desde $${min}`;
      } else if (max) {
        return `Hasta $${max}`;
      }
      return '';
    },
    
    /**
     * Cargar presets guardados desde localStorage
     */
    loadSavedPresets() {
      try {
        const savedPresets = localStorage.getItem('inventoryFilterPresets');
        if (savedPresets) {
          this.savedPresets = JSON.parse(savedPresets);
        }
      } catch (error) {
        console.error('Error cargando filtros guardados:', error);
        this.savedPresets = [];
      }
    },
    
    /**
     * Guardar preset actual
     */
    savePreset() {
      // Validar nombre
      if (!this.newPresetName.trim()) return;
      
      // Crear preset
      const preset = {
        name: this.newPresetName.trim(),
        filters: { ...this.localFilters }
      };
      
      // Verificar si ya existe un preset con el mismo nombre
      const existingIndex = this.savedPresets.findIndex(p => p.name === preset.name);
      if (existingIndex >= 0) {
        // Reemplazar existente
        this.savedPresets.splice(existingIndex, 1, preset);
      } else {
        // Agregar nuevo
        this.savedPresets.push(preset);
      }
      
      // Guardar en localStorage
      localStorage.setItem('inventoryFilterPresets', JSON.stringify(this.savedPresets));
      
      // Limpiar y cerrar modal
      this.newPresetName = '';
      this.showSaveFilterModal = false;
      
      // Notificar
      this.$emit('save-filter', preset);
    },
    
    /**
     * Cargar preset guardado
     */
    loadPreset(preset) {
      this.localFilters = { ...preset.filters };
      this.showPresetMenu = false;
      this.$emit('load-filter', preset);
    },
    
    /**
     * Eliminar preset guardado
     */
    deletePreset(name) {
      const index = this.savedPresets.findIndex(p => p.name === name);
      if (index >= 0) {
        this.savedPresets.splice(index, 1);
        localStorage.setItem('inventoryFilterPresets', JSON.stringify(this.savedPresets));
      }
    },
    
    /**
     * Alternar menú de presets
     */
    togglePresetMenu() {
      this.showPresetMenu = !this.showPresetMenu;
    }
  }
}
</script>

<style scoped>
.filter-panel {
  background-color: var(--bg-secondary, #f8f8f8);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Encabezado del panel de filtros */
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--bg-primary, white);
}

.filter-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-presets {
  position: relative;
}

.btn-presets {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
}

.btn-presets:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.presets-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  width: 220px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 4px;
  overflow: hidden;
}

.presets-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.presets-dropdown li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.presets-dropdown li:last-child {
  border-bottom: none;
}

.presets-dropdown button {
  background: transparent;
  border: none;
  padding: 10px 12px;
  text-align: left;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.presets-dropdown button:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.presets-dropdown .delete-preset {
  width: auto;
  padding: 6px;
  color: var(--text-secondary, #666);
}

.presets-dropdown .delete-preset:hover {
  color: var(--error-color, #f44336);
  background-color: var(--error-light, #ffebee);
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-save,
.btn-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save {
  background-color: var(--primary-light, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border: 1px solid var(--primary-color, #1976d2);
}

.btn-save:hover {
  background-color: var(--primary-lighter, #bbdefb);
}

.btn-reset {
  background-color: transparent;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-reset:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Cuerpo del panel de filtros */
.filter-body {
  padding: 20px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
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

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.filter-group select:focus,
.filter-group input:focus {
  border-color: var(--primary-color, #1976d2);
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-light, #e3f2fd);
}

/* Selector de categoría */
.category-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-chip:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.category-chip.active {
  background-color: var(--primary-light, #e3f2fd);
  border-color: var(--primary-color, #1976d2);
  color: var(--primary-color, #1976d2);
}

.category-chip i {
  font-size: 14px;
}

/* Selector de estado */
.status-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-chip:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.status-chip.active {
  background-color: var(--bg-primary, white);
  font-weight: 500;
}

.status-chip .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-secondary, #666);
}

.status-chip.available .status-dot {
  background-color: var(--success-color, #4caf50);
}

.status-chip.inUse .status-dot {
  background-color: var(--warning-color, #ff9800);
}

.status-chip.defective .status-dot {
  background-color: var(--error-color, #f44336);
}

.status-chip.inRepair .status-dot {
  background-color: var(--info-color, #2196f3);
}

.status-chip.retired .status-dot {
  background-color: var(--text-secondary, #9e9e9e);
}

.status-chip.active.available {
  border-color: var(--success-color, #4caf50);
  color: var(--success-color, #4caf50);
}

.status-chip.active.inUse {
  border-color: var(--warning-color, #ff9800);
  color: var(--warning-color, #ff9800);
}

.status-chip.active.defective {
  border-color: var(--error-color, #f44336);
  color: var(--error-color, #f44336);
}

.status-chip.active.inRepair {
  border-color: var(--info-color, #2196f3);
  color: var(--info-color, #2196f3);
}

.status-chip.active.retired {
  border-color: var(--text-secondary, #9e9e9e);
  color: var(--text-secondary, #9e9e9e);
}

/* Selectores con botón de limpiar */
.select-with-clear {
  position: relative;
}

.clear-select {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.7;
  border-radius: 50%;
}

.clear-select:hover {
  opacity: 1;
  background-color: var(--hover-bg, #f0f0f0);
}

/* Campos de fecha */
.date-range {
  grid-column: span 2;
}

.date-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.date-input {
  flex: 1;
}

.date-separator {
  font-size: 16px;
  color: var(--text-secondary, #666);
}

.clear-dates {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.7;
  border-radius: 50%;
}

.clear-dates:hover {
  opacity: 1;
  background-color: var(--hover-bg, #f0f0f0);
}

/* Campos de precio */
.price-range {
  grid-column: span 2;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.price-input {
  flex: 1;
}

.price-separator {
  font-size: 16px;
  color: var(--text-secondary, #666);
}

.clear-price {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.7;
  border-radius: 50%;
}

.clear-price:hover {
  opacity: 1;
  background-color: var(--hover-bg, #f0f0f0);
}

/* Filtros adicionales */
.additional-filters {
  grid-column: 1 / -1;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  margin-top: 10px;
}

/* Botón de alternar filtros adicionales */
.toggle-additional-filters {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px;
  margin-top: 10px;
  background-color: transparent;
  border: none;
  font-size: 14px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-additional-filters:hover {
  color: var(--primary-color, #1976d2);
}

.toggle-additional-filters i {
  font-size: 12px;
}

/* Sección de filtros aplicados */
.applied-filters {
  margin-top: 20px;
  padding: 15px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.applied-filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.applied-filters-header span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.clear-all-filters {
  background: transparent;
  border: none;
  color: var(--primary-color, #1976d2);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: underline;
}

.clear-all-filters:hover {
  color: var(--primary-dark, #1565c0);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--primary-lightest, #e3f2fd);
  border-radius: 16px;
  font-size: 13px;
  color: var(--primary-color, #1976d2);
}

.filter-tag button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--primary-color, #1976d2);
  cursor: pointer;
  padding: 2px;
  font-size: 12px;
  border-radius: 50%;
  opacity: 0.7;
}

.filter-tag button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.05);
}

/* Pie del panel de filtros */
.filter-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  background-color: var(--bg-primary, white);
}

/* Modal para guardar filtro */
.save-filter-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.save-filter-content {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
  padding: 20px;
}

.save-filter-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
}

.save-filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Botones estándar */
.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

.btn-primary:disabled {
  background-color: var(--disabled-bg, #e0e0e0);
  color: var(--disabled-text, #9e9e9e);
  cursor: not-allowed;
}

.btn-outline {
  background-color: transparent;
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Responsive */
@media (max-width: 768px) {
  .filter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .date-range, .price-range {
    grid-column: 1;
  }
  
  .presets-dropdown {
    width: 100%;
    left: 0;
    right: unset;
  }
}
</style>