<template>
  <div class="inventory-search">
    <!-- Barra de búsqueda principal -->
    <div class="search-bar-container">
      <div class="search-bar">
        <div class="search-input-wrapper">
          <i class="icon-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            class="search-input" 
            placeholder="Buscar en inventario (nombre, serial, marca, modelo...)" 
            @keyup.enter="executeSearch"
            @input="handleSearchInput"
          />
          <button 
            v-if="searchQuery" 
            @click="clearSearch" 
            class="search-clear-btn" 
            title="Limpiar búsqueda"
          >
            <i class="icon-x"></i>
          </button>
        </div>
        
        <div class="search-actions">
          <button 
            class="btn-icon" 
            @click="toggleAdvancedSearch" 
            :class="{ 'active': showAdvanced }"
            title="Búsqueda avanzada"
          >
            <i class="icon-sliders"></i>
          </button>
          <button 
            class="btn-primary" 
            @click="executeSearch"
            :disabled="isSearchEmpty"
          >
            Buscar
          </button>
        </div>
      </div>
      
      <!-- Sugerencias de búsqueda -->
      <div v-if="showSuggestions && suggestions.length > 0" class="search-suggestions">
        <div 
          v-for="(suggestion, index) in suggestions" 
          :key="index"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <div class="suggestion-icon">
            <i :class="getSuggestionIcon(suggestion)"></i>
          </div>
          <div class="suggestion-content">
            <div class="suggestion-text">
              <span class="suggestion-highlight">{{ suggestion.highlight }}</span>
              {{ suggestion.text }}
            </div>
            <div class="suggestion-meta">{{ suggestion.meta }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Panel de búsqueda avanzada -->
    <div v-if="showAdvanced" class="advanced-search-panel">
      <div class="panel-header">
        <h3>Búsqueda Avanzada</h3>
        <button class="btn-icon" @click="toggleAdvancedSearch" title="Cerrar panel">
          <i class="icon-x"></i>
        </button>
      </div>
      
      <div class="panel-body">
        <!-- Criterios de búsqueda -->
        <div class="search-criteria">
          <div class="criteria-group">
            <!-- Propiedades básicas -->
            <div class="criteria-section">
              <h4>Propiedades Básicas</h4>
              
              <div class="criteria-grid">
                <div class="criteria-item">
                  <label>Nombre:</label>
                  <input type="text" v-model="advancedCriteria.name" placeholder="Nombre del equipo" />
                </div>
                
                <div class="criteria-item">
                  <label>Número de Serie:</label>
                  <input type="text" v-model="advancedCriteria.serialNumber" placeholder="Número de serie" />
                </div>
                
                <div class="criteria-item">
                  <label>Marca:</label>
                  <input type="text" v-model="advancedCriteria.brand" placeholder="Marca" />
                </div>
                
                <div class="criteria-item">
                  <label>Modelo:</label>
                  <input type="text" v-model="advancedCriteria.model" placeholder="Modelo" />
                </div>
                
                <div class="criteria-item">
                  <label>Dirección MAC:</label>
                  <input type="text" v-model="advancedCriteria.macAddress" placeholder="XX:XX:XX:XX:XX:XX" />
                </div>
                
                <div class="criteria-item">
                  <label>Categoría:</label>
                  <select v-model="advancedCriteria.category">
                    <option value="">Todas las categorías</option>
                    <option v-for="category in categories" :key="category.id" :value="category.id">
                      {{ category.name }}
                    </option>
                  </select>
                </div>
                
                <div class="criteria-item">
                  <label>Estado:</label>
                  <select v-model="advancedCriteria.status">
                    <option value="">Todos los estados</option>
                    <option v-for="status in statuses" :key="status.id" :value="status.id">
                      {{ status.name }}
                    </option>
                  </select>
                </div>
                
                <div class="criteria-item">
                  <label>Ubicación:</label>
                  <select v-model="advancedCriteria.location">
                    <option value="">Todas las ubicaciones</option>
                    <option v-for="location in locations" :key="location.id" :value="location.id">
                      {{ location.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Fechas y valores -->
            <div class="criteria-section">
              <h4>Fechas y Valores</h4>
              
              <div class="criteria-grid">
                <div class="criteria-item date-range">
                  <label>Fecha de Compra:</label>
                  <div class="date-inputs">
                    <div class="date-field">
                      <label>Desde:</label>
                      <input type="date" v-model="advancedCriteria.purchaseDateFrom" />
                    </div>
                    <div class="date-field">
                      <label>Hasta:</label>
                      <input type="date" v-model="advancedCriteria.purchaseDateTo" />
                    </div>
                  </div>
                </div>
                
                <div class="criteria-item date-range">
                  <label>Fecha Fin Garantía:</label>
                  <div class="date-inputs">
                    <div class="date-field">
                      <label>Desde:</label>
                      <input type="date" v-model="advancedCriteria.warrantyExpirationFrom" />
                    </div>
                    <div class="date-field">
                      <label>Hasta:</label>
                      <input type="date" v-model="advancedCriteria.warrantyExpirationTo" />
                    </div>
                  </div>
                </div>
                
                <div class="criteria-item range-input">
                  <label>Valor:</label>
                  <div class="range-inputs">
                    <div class="range-field">
                      <label>Desde:</label>
                      <input 
                        type="number" 
                        v-model="advancedCriteria.valueMin" 
                        min="0" 
                        step="100" 
                        placeholder="Mínimo" 
                      />
                    </div>
                    <div class="range-field">
                      <label>Hasta:</label>
                      <input 
                        type="number" 
                        v-model="advancedCriteria.valueMax" 
                        min="0" 
                        step="100" 
                        placeholder="Máximo" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Asignación y Proveedor -->
            <div class="criteria-section">
              <h4>Asignación y Proveedor</h4>
              
              <div class="criteria-grid">
                <div class="criteria-item">
                  <label>Asignado a:</label>
                  <select v-model="advancedCriteria.assignedTo">
                    <option value="">Cualquier asignación</option>
                    <option value="unassigned">Sin asignar</option>
                    <option v-for="user in users" :key="user.id" :value="user.id">
                      {{ user.name }}
                    </option>
                  </select>
                </div>
                
                <div class="criteria-item">
                  <label>Proveedor:</label>
                  <select v-model="advancedCriteria.supplier">
                    <option value="">Todos los proveedores</option>
                    <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                      {{ supplier.name }}
                    </option>
                  </select>
                </div>
                
                <div class="criteria-item">
                  <label>Próximo mantenimiento:</label>
                  <div class="date-inputs">
                    <div class="date-field">
                      <label>Antes de:</label>
                      <input type="date" v-model="advancedCriteria.nextMaintenanceBefore" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Operadores de búsqueda -->
            <div class="criteria-section">
              <h4>Operador de Búsqueda</h4>
              
              <div class="search-operator">
                <div class="operator-options">
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      v-model="advancedCriteria.operator" 
                      value="AND" 
                    />
                    <span>Cumplir TODOS los criterios (AND)</span>
                  </label>
                  
                  <label class="radio-label">
                    <input 
                      type="radio" 
                      v-model="advancedCriteria.operator" 
                      value="OR" 
                    />
                    <span>Cumplir ALGUNO de los criterios (OR)</span>
                  </label>
                </div>
                
                <div class="operator-description">
                  <i class="icon-info"></i>
                  <span>
                    <strong>AND:</strong> Los resultados deben cumplir todas las condiciones.<br>
                    <strong>OR:</strong> Los resultados pueden cumplir cualquiera de las condiciones.
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Controles de búsqueda avanzada -->
          <div class="advanced-search-actions">
            <button class="btn-outline" @click="clearAdvancedCriteria">
              <i class="icon-refresh"></i> Limpiar Criterios
            </button>
            <button 
              class="btn-primary" 
              @click="executeAdvancedSearch" 
              :disabled="isAdvancedSearchEmpty"
            >
              <i class="icon-search"></i> Buscar
            </button>
          </div>
        </div>
        
        <!-- Búsquedas guardadas -->
        <div v-if="savedSearches.length > 0" class="saved-searches">
          <h4>Búsquedas Guardadas</h4>
          
          <div class="saved-searches-list">
            <div 
              v-for="(search, index) in savedSearches" 
              :key="index"
              class="saved-search-item"
            >
              <div class="saved-search-content">
                <div class="saved-search-name">{{ search.name }}</div>
                <div class="saved-search-description">{{ search.description }}</div>
              </div>
              
              <div class="saved-search-actions">
                <button class="btn-icon" @click="loadSavedSearch(search)" title="Cargar búsqueda">
                  <i class="icon-arrow-right-circle"></i>
                </button>
                <button class="btn-icon" @click="deleteSavedSearch(index)" title="Eliminar búsqueda">
                  <i class="icon-trash-2"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Resultados de búsqueda -->
    <div v-if="hasExecutedSearch" class="search-results">
      <div class="results-header">
        <div class="results-summary">
          <span class="results-count">{{ searchResults.length }} resultados</span>
          <span class="results-query" v-if="lastSearchQuery">
            para <strong>"{{ lastSearchQuery }}"</strong>
          </span>
          <span class="results-filters" v-if="hasAppliedAdvancedFilters">
            <i class="icon-filter"></i> Filtros avanzados aplicados
          </span>
        </div>
        
        <div class="results-actions">
          <div class="sort-options">
            <label>Ordenar por:</label>
            <select v-model="sortOption" @change="sortResults">
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="name_desc">Nombre (Z-A)</option>
              <option value="serialNumber_asc">Número de Serie (A-Z)</option>
              <option value="serialNumber_desc">Número de Serie (Z-A)</option>
              <option value="category_asc">Categoría (A-Z)</option>
              <option value="status_asc">Estado (A-Z)</option>
              <option value="purchaseDate_desc">Fecha de compra (Reciente)</option>
              <option value="purchaseDate_asc">Fecha de compra (Antiguo)</option>
              <option value="value_desc">Valor (Mayor a menor)</option>
              <option value="value_asc">Valor (Menor a mayor)</option>
            </select>
          </div>
          
          <div class="result-view-options">
            <button 
              @click="viewMode = 'list'"
              :class="['btn-view-option', { active: viewMode === 'list' }]"
              title="Vista de lista"
            >
              <i class="icon-list"></i>
            </button>
            <button 
              @click="viewMode = 'grid'"
              :class="['btn-view-option', { active: viewMode === 'grid' }]"
              title="Vista de cuadrícula"
            >
              <i class="icon-grid"></i>
            </button>
          </div>
          
          <button 
            v-if="hasAppliedFilters"
            class="btn-outline btn-clear-filters" 
            @click="clearAllFilters"
          >
            <i class="icon-x"></i> Limpiar filtros
          </button>
          
          <button 
            v-if="showSaveSearchButton"
            class="btn-outline btn-save-search" 
            @click="showSaveSearchDialog = true"
          >
            <i class="icon-save"></i> Guardar búsqueda
          </button>
        </div>
      </div>
      
      <!-- Vista de resultados tipo lista -->
      <div v-if="viewMode === 'list' && searchResults.length > 0" class="results-list-view">
        <table class="results-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Serial</th>
              <th>Categoría</th>
              <th>Marca/Modelo</th>
              <th>Estado</th>
              <th>Ubicación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in searchResults" :key="item.id" @click="viewItemDetails(item)">
              <td>{{ item.name }}</td>
              <td>{{ item.serialNumber }}</td>
              <td>{{ getCategoryName(item.category) }}</td>
              <td>{{ item.brand }} {{ item.model ? '/ ' + item.model : '' }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(item.status)]">
                  {{ getStatusName(item.status) }}
                </span>
              </td>
              <td>{{ getLocationName(item.location) }}</td>
              <td class="actions-cell">
                <button class="btn-icon" @click.stop="viewItemDetails(item)" title="Ver detalles">
                  <i class="icon-eye"></i>
                </button>
                <button class="btn-icon" @click.stop="editItem(item)" title="Editar">
                  <i class="icon-edit-2"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Vista de resultados tipo cuadrícula -->
      <div v-else-if="viewMode === 'grid' && searchResults.length > 0" class="results-grid-view">
        <div 
          v-for="item in searchResults" 
          :key="item.id"
          class="grid-item"
          @click="viewItemDetails(item)"
        >
          <div class="grid-item-header">
            <div class="item-category">{{ getCategoryName(item.category) }}</div>
            <div :class="['item-status', getStatusClass(item.status)]">
              {{ getStatusName(item.status) }}
            </div>
          </div>
          
          <div class="grid-item-body">
            <h3 class="item-name">{{ item.name }}</h3>
            <div class="item-serial">{{ item.serialNumber }}</div>
            <div class="item-model">{{ item.brand }} {{ item.model ? '/ ' + item.model : '' }}</div>
            
            <div class="item-details">
              <div class="detail-item">
                <i class="icon-map-pin"></i>
                <span>{{ getLocationName(item.location) }}</span>
              </div>
              <div class="detail-item" v-if="item.purchaseDate">
                <i class="icon-calendar"></i>
                <span>{{ formatDate(item.purchaseDate) }}</span>
              </div>
            </div>
          </div>
          
          <div class="grid-item-actions">
            <button class="btn-icon" @click.stop="viewItemDetails(item)" title="Ver detalles">
              <i class="icon-eye"></i>
            </button>
            <button class="btn-icon" @click.stop="editItem(item)" title="Editar">
              <i class="icon-edit-2"></i>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Estado sin resultados -->
      <div v-else class="no-results">
        <div class="no-results-icon">
          <i class="icon-search"></i>
        </div>
        <h3 class="no-results-title">No se encontraron resultados</h3>
        <p class="no-results-message">
          No hay elementos que coincidan con los criterios de búsqueda.
          <br>Intente con diferentes términos o elimine algunos filtros.
        </p>
        <button class="btn-secondary" @click="clearAllFilters">
          <i class="icon-refresh"></i> Limpiar todos los filtros
        </button>
      </div>
    </div>
    
    <!-- Diálogo para guardar búsqueda -->
    <div v-if="showSaveSearchDialog" class="save-search-dialog-overlay" @click.self="showSaveSearchDialog = false">
      <div class="save-search-dialog">
        <div class="dialog-header">
          <h3>Guardar Búsqueda</h3>
          <button class="btn-icon" @click="showSaveSearchDialog = false">
            <i class="icon-x"></i>
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="form-group">
            <label>Nombre de la búsqueda:</label>
            <input 
              type="text" 
              v-model="savedSearchName" 
              placeholder="Ej. Equipos Mikrotik en Torre Norte"
              class="form-control"
            />
          </div>
          
          <div class="form-group">
            <label>Descripción (opcional):</label>
            <textarea 
              v-model="savedSearchDescription" 
              placeholder="Descripción breve de esta búsqueda"
              class="form-control"
            ></textarea>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="btn-outline" @click="showSaveSearchDialog = false">
            Cancelar
          </button>
          <button 
            class="btn-primary" 
            @click="saveSearch" 
            :disabled="!savedSearchName"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive } from 'vue';
import { formatDate } from '@/utils/formatters';

export default {
  name: 'InventorySearch',
  props: {
    /**
     * Lista de categorías disponibles
     */
    categories: {
      type: Array,
      default: () => [
        { id: 'network', name: 'Equipos de Red' },
        { id: 'computer', name: 'Computadoras' },
        { id: 'telecom', name: 'Telecomunicaciones' },
        { id: 'office', name: 'Equipos de Oficina' },
        { id: 'tools', name: 'Herramientas' }
      ]
    },
    /**
     * Lista de estados disponibles
     */
    statuses: {
      type: Array,
      default: () => [
        { id: 'active', name: 'Activo' },
        { id: 'maintenance', name: 'En Mantenimiento' },
        { id: 'broken', name: 'Defectuoso' },
        { id: 'storage', name: 'En Almacén' },
        { id: 'retired', name: 'Retirado' }
      ]
    },
    /**
     * Lista de ubicaciones disponibles
     */
    locations: {
      type: Array,
      default: () => [
        { id: 'headquarters', name: 'Oficina Central' },
        { id: 'warehouse', name: 'Almacén Principal' },
        { id: 'north-tower', name: 'Torre Norte' },
        { id: 'south-tower', name: 'Torre Sur' },
        { id: 'client-site', name: 'Sitio Cliente' }
      ]
    },
    /**
     * Lista de usuarios para asignación
     */
    users: {
      type: Array,
      default: () => [
        { id: 'user1', name: 'Carlos Mendez' },
        { id: 'user2', name: 'María López' },
        { id: 'user3', name: 'Jorge Suárez' },
        { id: 'user4', name: 'Ana Castro' },
        { id: 'user5', name: 'Roberto Díaz' }
      ]
    },
    /**
     * Lista de proveedores
     */
    suppliers: {
      type: Array,
      default: () => [
        { id: 'supplier1', name: 'TechStore' },
        { id: 'supplier2', name: 'NetworkSolutions' },
        { id: 'supplier3', name: 'OfficeSupplies' },
        { id: 'supplier4', name: 'DellMexico' },
        { id: 'supplier5', name: 'ToolsPlus' }
      ]
    },
    /**
     * Lista inicial de elementos para buscar
     */
    inventoryItems: {
      type: Array,
      default: () => []
    }
  },
  setup(props, { emit }) {
    // Estado de búsqueda principal
    const searchQuery = ref('');
    const showAdvanced = ref(false);
    const showSuggestions = ref(false);
    const suggestions = ref([]);
    const lastSearchQuery = ref('');
    const hasExecutedSearch = ref(false);
    
    // Resultados y visualización
    const searchResults = ref([]);
    const viewMode = ref('list');
    const sortOption = ref('name_asc');
    
    // Búsqueda avanzada
    const advancedCriteria = reactive({
      name: '',
      serialNumber: '',
      brand: '',
      model: '',
      macAddress: '',
      category: '',
      status: '',
      location: '',
      purchaseDateFrom: '',
      purchaseDateTo: '',
      warrantyExpirationFrom: '',
      warrantyExpirationTo: '',
      valueMin: '',
      valueMax: '',
      assignedTo: '',
      supplier: '',
      nextMaintenanceBefore: '',
      operator: 'AND'
    });
    
    // Guardar búsquedas
    const savedSearches = ref([]);
    const showSaveSearchDialog = ref(false);
    const savedSearchName = ref('');
    const savedSearchDescription = ref('');
    
    // Computed properties
    const isSearchEmpty = computed(() => {
      return !searchQuery.value.trim();
    });
    
    const isAdvancedSearchEmpty = computed(() => {
      return Object.keys(advancedCriteria).every(key => {
        if (key === 'operator') return true; // Ignorar el operador
        return !advancedCriteria[key];
      });
    });
    
    const hasAppliedFilters = computed(() => {
      return !!searchQuery.value.trim() || hasAppliedAdvancedFilters.value;
    });
    
    const hasAppliedAdvancedFilters = computed(() => {
      return Object.keys(advancedCriteria).some(key => {
        if (key === 'operator') return false; // Ignorar el operador
        return !!advancedCriteria[key];
      });
    });
    
    const showSaveSearchButton = computed(() => {
      return hasExecutedSearch.value && searchResults.value.length > 0 && hasAppliedFilters.value;
    });
    
    // Métodos
    function toggleAdvancedSearch() {
      showAdvanced.value = !showAdvanced.value;
      if (showAdvanced.value) {
        // Ocultar sugerencias si se abre el panel avanzado
        showSuggestions.value = false;
      }
    }
    
    function handleSearchInput() {
      // Mostrar sugerencias después de 2 caracteres
      if (searchQuery.value.trim().length >= 2) {
        generateSuggestions();
        showSuggestions.value = true;
      } else {
        showSuggestions.value = false;
      }
    }
    
    function generateSuggestions() {
      const query = searchQuery.value.trim().toLowerCase();
      if (!query) {
        suggestions.value = [];
        return;
      }
      
      // Generar sugerencias basadas en el inventario
      const items = props.inventoryItems.length > 0 ? props.inventoryItems : getMockInventoryData();
      const results = [];
      
      // Buscar coincidencias
      items.forEach(item => {
        // Buscar en nombre
        if (item.name.toLowerCase().includes(query)) {
          results.push({
            id: item.id,
            highlight: item.name.substring(0, query.length),
            text: item.name.substring(query.length),
            meta: `Serial: ${item.serialNumber}`,
            type: 'name',
            item
          });
        }
        
        // Buscar en número de serie
        if (item.serialNumber.toLowerCase().includes(query)) {
          results.push({
            id: item.id,
            highlight: item.serialNumber.substring(0, query.length),
            text: item.serialNumber.substring(query.length),
            meta: `${item.name}`,
            type: 'serial',
            item
          });
        }
        
        // Buscar en marca
        if (item.brand && item.brand.toLowerCase().includes(query)) {
          results.push({
            id: item.id,
            highlight: item.brand.substring(0, query.length),
            text: item.brand.substring(query.length),
            meta: `${item.name} - ${item.model || ''}`,
            type: 'brand',
            item
          });
        }
        
        // Buscar en modelo
        if (item.model && item.model.toLowerCase().includes(query)) {
          results.push({
            id: item.id,
            highlight: item.model.substring(0, query.length),
            text: item.model.substring(query.length),
            meta: `${item.name} - ${item.brand || ''}`,
            type: 'model',
            item
          });
        }
      });
      
      // Limitar a 5 sugerencias
      suggestions.value = results.slice(0, 5);
    }
    
    function getSuggestionIcon(suggestion) {
      const icons = {
        'name': 'icon-box',
        'serial': 'icon-hash',
        'brand': 'icon-tag',
        'model': 'icon-layers'
      };
      
      return icons[suggestion.type] || 'icon-search';
    }
    
    function selectSuggestion(suggestion) {
      searchQuery.value = suggestion.type === 'name' ? suggestion.highlight + suggestion.text :
                          suggestion.item.name;
      showSuggestions.value = false;
      
      // Ejecutar búsqueda directamente
      executeSearch();
    }
    
    function executeSearch() {
      if (isSearchEmpty.value) return;
      
      lastSearchQuery.value = searchQuery.value;
      showSuggestions.value = false;
      hasExecutedSearch.value = true;
      
      // Realizar búsqueda
      const query = searchQuery.value.trim().toLowerCase();
      const items = props.inventoryItems.length > 0 ? props.inventoryItems : getMockInventoryData();
      
      const results = items.filter(item => {
        return (
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
          (item.brand && item.brand.toLowerCase().includes(query)) ||
          (item.model && item.model.toLowerCase().includes(query))
        );
      });
      
      // Si hay filtros avanzados, aplicarlos
      const filteredResults = hasAppliedAdvancedFilters.value 
        ? applyAdvancedFilters(results) 
        : results;
      
      searchResults.value = filteredResults;
      
      // Ordenar resultados
      sortResults();
      
      // Emitir evento
      emit('search', {
        query: searchQuery.value,
        results: filteredResults,
        criteria: { ...advancedCriteria }
      });
    }
    
    function executeAdvancedSearch() {
      if (isAdvancedSearchEmpty.value) return;
      
      showSuggestions.value = false;
      hasExecutedSearch.value = true;
      
      // Si hay query de texto, usarla como base
      if (searchQuery.value.trim()) {
        executeSearch(); // Esto también aplicará los filtros avanzados
      } else {
        // Realizar solo búsqueda por criterios avanzados
        const items = props.inventoryItems.length > 0 ? props.inventoryItems : getMockInventoryData();
        searchResults.value = applyAdvancedFilters(items);
        
        // Ordenar resultados
        sortResults();
        
        // Emitir evento
        emit('search', {
          query: '',
          results: searchResults.value,
          criteria: { ...advancedCriteria }
        });
      }
    }
    
    function applyAdvancedFilters(items) {
      const isAnd = advancedCriteria.operator === 'AND';
      
      return items.filter(item => {
        const conditions = [];
        
        if (advancedCriteria.name) {
          conditions.push(item.name && item.name.toLowerCase().includes(advancedCriteria.name.toLowerCase()));
        }
        
        if (advancedCriteria.serialNumber) {
          conditions.push(item.serialNumber && item.serialNumber.toLowerCase().includes(advancedCriteria.serialNumber.toLowerCase()));
        }
        
        if (advancedCriteria.brand) {
          conditions.push(item.brand && item.brand.toLowerCase().includes(advancedCriteria.brand.toLowerCase()));
        }
        
        if (advancedCriteria.model) {
          conditions.push(item.model && item.model.toLowerCase().includes(advancedCriteria.model.toLowerCase()));
        }
        
        if (advancedCriteria.macAddress) {
          conditions.push(item.macAddress && item.macAddress.toLowerCase().includes(advancedCriteria.macAddress.toLowerCase()));
        }
        
        if (advancedCriteria.category) {
          conditions.push(item.category === advancedCriteria.category);
        }
        
        if (advancedCriteria.status) {
          conditions.push(item.status === advancedCriteria.status);
        }
        
        if (advancedCriteria.location) {
          conditions.push(item.location === advancedCriteria.location);
        }
        
        if (advancedCriteria.purchaseDateFrom && item.purchaseDate) {
          conditions.push(new Date(item.purchaseDate) >= new Date(advancedCriteria.purchaseDateFrom));
        }
        
        if (advancedCriteria.purchaseDateTo && item.purchaseDate) {
          conditions.push(new Date(item.purchaseDate) <= new Date(advancedCriteria.purchaseDateTo));
        }
        
        if (advancedCriteria.warrantyExpirationFrom && item.warrantyExpiration) {
          conditions.push(new Date(item.warrantyExpiration) >= new Date(advancedCriteria.warrantyExpirationFrom));
        }
        
        if (advancedCriteria.warrantyExpirationTo && item.warrantyExpiration) {
          conditions.push(new Date(item.warrantyExpiration) <= new Date(advancedCriteria.warrantyExpirationTo));
        }
        
        if (advancedCriteria.valueMin && item.value) {
          conditions.push(parseFloat(item.value) >= parseFloat(advancedCriteria.valueMin));
        }
        
        if (advancedCriteria.valueMax && item.value) {
          conditions.push(parseFloat(item.value) <= parseFloat(advancedCriteria.valueMax));
        }
        
        if (advancedCriteria.assignedTo) {
          if (advancedCriteria.assignedTo === 'unassigned') {
            conditions.push(!item.assignedTo);
          } else {
            conditions.push(item.assignedTo === advancedCriteria.assignedTo);
          }
        }
        
        if (advancedCriteria.supplier) {
          conditions.push(item.supplier === advancedCriteria.supplier);
        }
        
        if (advancedCriteria.nextMaintenanceBefore && item.nextMaintenance) {
          conditions.push(new Date(item.nextMaintenance) <= new Date(advancedCriteria.nextMaintenanceBefore));
        }
        
        // Si no hay condiciones, incluir el elemento
        if (conditions.length === 0) {
          return true;
        }
        
        // Aplicar operador AND u OR
        if (isAnd) {
          return conditions.every(condition => condition);
        } else {
          return conditions.some(condition => condition);
        }
      });
    }
    
    function sortResults() {
      if (!searchResults.value.length) return;
      
      const [field, direction] = sortOption.value.split('_');
      const isAsc = direction === 'asc';
      
      searchResults.value.sort((a, b) => {
        if (field === 'purchaseDate' || field === 'warrantyExpiration') {
          // Ordenar por fecha
          const dateA = a[field] ? new Date(a[field]) : new Date(0);
          const dateB = b[field] ? new Date(b[field]) : new Date(0);
          
          return isAsc ? dateA - dateB : dateB - dateA;
        } else if (field === 'value') {
          // Ordenar por valor numérico
          const valueA = parseFloat(a[field] || 0);
          const valueB = parseFloat(b[field] || 0);
          
          return isAsc ? valueA - valueB : valueB - valueA;
        } else {
          // Ordenar por texto
          const valueA = (a[field] || '').toString().toLowerCase();
          const valueB = (b[field] || '').toString().toLowerCase();
          
          return isAsc ? 
            valueA.localeCompare(valueB) : 
            valueB.localeCompare(valueA);
        }
      });
    }
    
    function clearSearch() {
      searchQuery.value = '';
      showSuggestions.value = false;
      
      if (!hasAppliedAdvancedFilters.value) {
        // Solo limpiar resultados si no hay filtros avanzados
        searchResults.value = [];
        lastSearchQuery.value = '';
        hasExecutedSearch.value = false;
      } else {
        // Si hay filtros avanzados, volver a ejecutar la búsqueda
        executeAdvancedSearch();
      }
    }
    
    function clearAdvancedCriteria() {
      Object.keys(advancedCriteria).forEach(key => {
        if (key === 'operator') {
          advancedCriteria[key] = 'AND';
        } else {
          advancedCriteria[key] = '';
        }
      });
    }
    
    function clearAllFilters() {
      searchQuery.value = '';
      lastSearchQuery.value = '';
      clearAdvancedCriteria();
      searchResults.value = [];
      hasExecutedSearch.value = false;
    }
    
    function viewItemDetails(item) {
      emit('view-item', item);
    }
    
    function editItem(item) {
      emit('edit-item', item);
    }
    
    function getCategoryName(categoryId) {
      const category = props.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    }
    
    function getStatusName(statusId) {
      const status = props.statuses.find(s => s.id === statusId);
      return status ? status.name : statusId;
    }
    
    function getLocationName(locationId) {
      const location = props.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
    }
    
    function getStatusClass(statusId) {
      const statusClasses = {
        'active': 'status-active',
        'maintenance': 'status-maintenance',
        'broken': 'status-broken',
        'storage': 'status-storage',
        'retired': 'status-retired'
      };
      
      return statusClasses[statusId] || 'status-default';
    }
    
    // Guardar búsquedas
    function saveSearch() {
      if (!savedSearchName.value) return;
      
      const newSearch = {
        name: savedSearchName.value,
        description: savedSearchDescription.value,
        query: searchQuery.value,
        criteria: { ...advancedCriteria }
      };
      
      savedSearches.value.push(newSearch);
      
      // Limpiar el formulario
      savedSearchName.value = '';
      savedSearchDescription.value = '';
      showSaveSearchDialog.value = false;
      
      // Guardar en localStorage (opcional)
      try {
        localStorage.setItem('inventorySearches', JSON.stringify(savedSearches.value));
      } catch (error) {
        console.error('Error al guardar búsquedas en localStorage:', error);
      }
    }
    
    function loadSavedSearch(search) {
      searchQuery.value = search.query || '';
      
      // Cargar criterios avanzados
      if (search.criteria) {
        Object.keys(search.criteria).forEach(key => {
          if (advancedCriteria.hasOwnProperty(key)) {
            advancedCriteria[key] = search.criteria[key];
          }
        });
      }
      
      // Ejecutar búsqueda
      if (search.query) {
        executeSearch();
      } else {
        executeAdvancedSearch();
      }
    }
    
    function deleteSavedSearch(index) {
      savedSearches.value.splice(index, 1);
      
      // Actualizar localStorage
      try {
        localStorage.setItem('inventorySearches', JSON.stringify(savedSearches.value));
      } catch (error) {
        console.error('Error al guardar búsquedas en localStorage:', error);
      }
    }
    
    // Cargar búsquedas guardadas al iniciar
    function loadSavedSearches() {
      try {
        const saved = localStorage.getItem('inventorySearches');
        if (saved) {
          savedSearches.value = JSON.parse(saved);
        }
      } catch (error) {
        console.error('Error al cargar búsquedas guardadas:', error);
      }
    }
    
    // Datos de ejemplo
    function getMockInventoryData() {
      return [
        {
          id: 'INV-001',
          name: 'Router Mikrotik hAP ac³',
          serialNumber: 'MTK-83726554',
          category: 'network',
          status: 'active',
          location: 'north-tower',
          brand: 'Mikrotik',
          model: 'hAP ac³',
          purchaseDate: '2024-06-15',
          value: 3200,
          assignedTo: 'user3',
          supplier: 'supplier1',
          warrantyExpiration: '2026-06-15',
          lastMaintenance: '2025-02-10',
          nextMaintenance: '2025-08-10',
          macAddress: '00:11:22:33:44:55'
        },
        {
          id: 'INV-002',
          name: 'Switch Cisco SG350-28',
          serialNumber: 'CSC-92837465',
          category: 'network',
          status: 'active',
          location: 'headquarters',
          brand: 'Cisco',
          model: 'SG350-28',
          purchaseDate: '2023-11-20',
          value: 12500,
          assignedTo: null,
          supplier: 'supplier2',
          warrantyExpiration: '2025-11-20',
          lastMaintenance: '2025-01-05',
          nextMaintenance: '2025-07-05',
          macAddress: 'AA:BB:CC:DD:EE:FF'
        },
        {
          id: 'INV-003',
          name: 'Antena Ubiquiti LiteBeam 5AC',
          serialNumber: 'UBQ-12345678',
          category: 'network',
          status: 'maintenance',
          location: 'warehouse',
          brand: 'Ubiquiti',
          model: 'LiteBeam 5AC',
          purchaseDate: '2024-03-10',
          value: 1800,
          assignedTo: 'user2',
          supplier: 'supplier1',
          warrantyExpiration: '2026-03-10',
          lastMaintenance: '2025-08-15',
          nextMaintenance: '2026-02-15',
          macAddress: 'FF:EE:DD:CC:BB:AA'
        },
        {
          id: 'INV-004',
          name: 'Laptop Dell Latitude 5420',
          serialNumber: 'DLL-56473829',
          category: 'computer',
          status: 'active',
          location: 'headquarters',
          brand: 'Dell',
          model: 'Latitude 5420',
          purchaseDate: '2024-01-20',
          value: 18000,
          assignedTo: 'user5',
          supplier: 'supplier4',
          warrantyExpiration: '2027-01-20',
          lastMaintenance: null,
          nextMaintenance: '2025-12-20',
          macAddress: 'AB:CD:EF:12:34:56'
        },
        {
          id: 'INV-005',
          name: 'Router Mikrotik RB2011UiAS-2HnD',
          serialNumber: 'MTK-65748392',
          category: 'network',
          status: 'active',
          location: 'south-tower',
          brand: 'Mikrotik',
          model: 'RB2011UiAS-2HnD',
          purchaseDate: '2023-08-05',
          value: 2800,
          assignedTo: 'user1',
          supplier: 'supplier1',
          warrantyExpiration: '2025-08-05',
          lastMaintenance: '2024-08-10',
          nextMaintenance: '2025-08-10',
          macAddress: '11:22:33:44:55:66'
        },
        {
          id: 'INV-006',
          name: 'Impresora HP LaserJet Pro M404dn',
          serialNumber: 'HPL-87654321',
          category: 'office',
          status: 'active',
          location: 'headquarters',
          brand: 'HP',
          model: 'LaserJet Pro M404dn',
          purchaseDate: '2024-04-15',
          value: 5400,
          assignedTo: null,
          supplier: 'supplier3',
          warrantyExpiration: '2026-04-15',
          lastMaintenance: null,
          nextMaintenance: '2025-10-15',
          macAddress: 'CC:DD:EE:FF:AA:BB'
        },
        {
          id: 'INV-007',
          name: 'Kit de herramientas redes',
          serialNumber: 'TLS-12398745',
          category: 'tools',
          status: 'active',
          location: 'warehouse',
          brand: 'NetGear',
          model: 'Pro Toolkit',
          purchaseDate: '2023-09-30',
          value: 3200,
          assignedTo: 'user4',
          supplier: 'supplier5',
          warrantyExpiration: null,
          lastMaintenance: null,
          nextMaintenance: null
        },
        {
          id: 'INV-008',
          name: 'Teléfono IP Yealink T54W',
          serialNumber: 'YLK-45678912',
          category: 'telecom',
          status: 'broken',
          location: 'warehouse',
          brand: 'Yealink',
          model: 'T54W',
          purchaseDate: '2024-02-10',
          value: 3800,
          assignedTo: null,
          supplier: 'supplier1',
          warrantyExpiration: '2026-02-10',
          lastMaintenance: '2025-06-20',
          nextMaintenance: null,
          macAddress: 'DD:55:33:EF:CB:A9'
        }
      ];
    }
    
    // Inicialización
    loadSavedSearches();
    
    return {
      // Estado
      searchQuery,
      showAdvanced,
      showSuggestions,
      suggestions,
      searchResults,
      lastSearchQuery,
      hasExecutedSearch,
      advancedCriteria,
      viewMode,
      sortOption,
      savedSearches,
      showSaveSearchDialog,
      savedSearchName,
      savedSearchDescription,
      
      // Computed
      isSearchEmpty,
      isAdvancedSearchEmpty,
      hasAppliedFilters,
      hasAppliedAdvancedFilters,
      showSaveSearchButton,
      
      // Métodos
      toggleAdvancedSearch,
      handleSearchInput,
      getSuggestionIcon,
      selectSuggestion,
      executeSearch,
      executeAdvancedSearch,
      sortResults,
      clearSearch,
      clearAdvancedCriteria,
      clearAllFilters,
      viewItemDetails,
      editItem,
      getCategoryName,
      getStatusName,
      getLocationName,
      getStatusClass,
      saveSearch,
      loadSavedSearch,
      deleteSavedSearch,
      formatDate
    };
  }
};
</script>

<style scoped>
.inventory-search {
  position: relative;
}

/* Barra de búsqueda */
.search-bar-container {
  position: relative;
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-input-wrapper i {
  position: absolute;
  left: 12px;
  color: var(--text-secondary, #666);
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--bg-secondary, #f5f5f5);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color, #1976d2);
  background-color: var(--bg-primary, white);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.search-clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-icon.active {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-color: var(--primary-color, #1976d2);
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Sugerencias de búsqueda */
.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-top: 6px;
  z-index: 10;
  overflow: hidden;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.suggestion-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--primary-color, #1976d2);
}

.suggestion-content {
  flex: 1;
}

.suggestion-text {
  font-size: 14px;
  color: var(--text-primary, #333);
}

.suggestion-highlight {
  font-weight: 600;
  color: var(--primary-color, #1976d2);
}

.suggestion-meta {
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-top: 2px;
}

/* Panel de búsqueda avanzada */
.advanced-search-panel {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.panel-header .btn-icon {
  background-color: transparent;
  border: none;
  color: white;
  width: 30px;
  height: 30px;
}

.panel-header .btn-icon:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.panel-body {
  padding: 16px;
}

/* Criterios de búsqueda */
.search-criteria {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.criteria-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.criteria-section {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
}

.criteria-section h4 {
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 8px;
}

.criteria-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.criteria-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.criteria-item label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.criteria-item input,
.criteria-item select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.criteria-item input:focus,
.criteria-item select:focus {
  outline: none;
  border-color: var(--primary-color, #1976d2);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.date-range, .range-input {
  grid-column: span 2;
}

.date-inputs, .range-inputs {
  display: flex;
  gap: 12px;
}

.date-field, .range-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Operador de búsqueda */
.search-operator {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.operator-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-label input {
  margin: 0;
}

.operator-description {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  background-color: var(--info-lightest, #e1f5fe);
  border-radius: 6px;
  padding: 10px;
}

.operator-description i {
  color: var(--info-color, #03a9f4);
}

/* Acciones de búsqueda avanzada */
.advanced-search-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-outline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background-color: transparent;
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Búsquedas guardadas */
.saved-searches {
  margin-top: 24px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  padding-top: 16px;
}

.saved-searches h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
}

.saved-searches-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.saved-search-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  padding: 12px;
}

.saved-search-content {
  flex: 1;
  min-width: 0;
}

.saved-search-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--text-primary, #333);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-search-description {
  font-size: 12px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-search-actions {
  display: flex;
  gap: 6px;
}

.saved-search-actions .btn-icon {
  width: 30px;
  height: 30px;
}

/* Resultados de búsqueda */
.search-results {
  margin-top: 24px;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.results-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.results-count {
  font-weight: 600;
}

.results-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--warning-color, #ff9800);
}

.results-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.sort-options label {
  color: var(--text-secondary, #666);
}

.sort-options select {
  padding: 6px 10px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
}

.result-view-options {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  overflow: hidden;
}

.btn-view-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--bg-primary, white);
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view-option.active {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
}

.btn-clear-filters, .btn-save-search {
  padding: 6px 12px;
  font-size: 13px;
}

/* Vista de lista */
.results-list-view {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
}

.results-table th,
.results-table td {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.results-table th {
  font-weight: 600;
  color: var(--text-primary, #333);
  background-color: var(--bg-secondary, #f5f5f5);
}

.results-table tbody tr {
  cursor: pointer;
  transition: all 0.2s ease;
}

.results-table tbody tr:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: rgba(76, 175, 80, 0.1);
  color: #2e7d32;
}

.status-maintenance {
  background-color: rgba(255, 152, 0, 0.1);
  color: #ef6c00;
}

.status-broken {
  background-color: rgba(244, 67, 54, 0.1);
  color: #c62828;
}

.status-storage {
  background-color: rgba(33, 150, 243, 0.1);
  color: #1565c0;
}

.status-retired {
  background-color: rgba(158, 158, 158, 0.1);
  color: #616161;
}

.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 6px;
}

.actions-cell .btn-icon {
  width: 30px;
  height: 30px;
}

/* Vista de cuadrícula */
.results-grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.grid-item {
  position: relative;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.grid-item-header {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.item-category {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.item-status {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
}

.grid-item-body {
  padding: 16px;
}

.item-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
}

.item-serial {
  font-size: 13px;
  color: var(--text-secondary, #666);
  margin-bottom: 6px;
}

.item-model {
  font-size: 14px;
  color: var(--text-primary, #333);
  margin-bottom: 16px;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grid-item-actions {
  display: flex;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.grid-item-actions .btn-icon {
  flex: 1;
  border-radius: 0;
  background-color: transparent;
  border: none;
  height: 40px;
}

/* Sin resultados */
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  text-align: center;
}

.no-results-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 50%;
  font-size: 32px;
  color: var(--text-secondary, #666);
  margin-bottom: 16px;
}

.no-results-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.no-results-message {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-secondary:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Diálogo para guardar búsqueda */
.save-search-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.save-search-dialog {
  width: 100%;
  max-width: 500px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.dialog-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--bg-secondary, #f5f5f5);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color, #1976d2);
  background-color: var(--bg-primary, white);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

/* Responsive */
@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-actions {
    justify-content: flex-end;
  }
  
  .criteria-grid {
    grid-template-columns: 1fr;
  }
  
  .date-range, .range-input {
    grid-column: 1;
  }
  
  .date-inputs, .range-inputs {
    flex-direction: column;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .results-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .sort-options {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .sort-options select {
    width: 100%;
  }
}
</style>
