<template>
  <div class="inventory-list-container">
    <!-- Cabecera con título y acciones principales -->
    <div class="page-header">
      <div class="header-title">
        <h1>Inventario</h1>
        <span class="item-count" v-if="totalItems > 0">{{ totalItems }} elementos</span>
      </div>
      
      <div class="header-actions">
        <button 
          class="btn-outline"
          @click="openExportDialog"
          :disabled="loading || selectedItems.length === 0 && !hasFilters && totalItems === 0"
        >
          <i class="icon-download"></i> Exportar
        </button>
        
        <button 
          class="btn-outline"
          @click="openQRDialog"
          :disabled="loading || selectedItems.length === 0"
        >
          <i class="icon-qrcode"></i> Generar QR
        </button>
        
        <button 
          class="btn-outline"
          @click="openImportDialog"
          :disabled="loading"
        >
          <i class="icon-upload"></i> Importar
        </button>
        
        <button 
          class="btn-primary"
          @click="openCreateDialog"
          :disabled="loading"
        >
          <i class="icon-plus"></i> Nuevo elemento
        </button>
      </div>
    </div>
    
    <!-- Barra de búsqueda y filtros -->
    <div class="search-filter-bar">
      <div class="search-box">
        <i class="icon-search"></i>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar en inventario..." 
          @input="handleSearchInput"
        />
        <button 
          v-if="searchQuery" 
          class="clear-search" 
          @click="clearSearch"
        >
          <i class="icon-x"></i>
        </button>
      </div>
      
      <div class="filter-actions">
        <button 
          class="btn-filter"
          @click="toggleFilters"
          :class="{ active: showFilters }"
        >
          <i class="icon-filter"></i> Filtros
          <span class="filter-count" v-if="activeFiltersCount > 0">{{ activeFiltersCount }}</span>
        </button>
        
        <div class="view-options">
          <button 
            class="btn-view"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="Vista de lista"
          >
            <i class="icon-list"></i>
          </button>
          
          <button 
            class="btn-view"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Vista de cuadrícula"
          >
            <i class="icon-grid"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Panel de filtros (desplegable) -->
    <div class="filters-panel" v-if="showFilters">
      <div class="filters-grid">
        <!-- Filtro por categoría -->
        <div class="filter-group">
          <label>Categoría</label>
          <select v-model="filters.category">
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
        
        <!-- Filtro por estado -->
        <div class="filter-group">
          <label>Estado</label>
          <select v-model="filters.status">
            <option value="">Todos los estados</option>
            <option 
              v-for="status in statuses" 
              :key="status.id" 
              :value="status.id"
            >
              {{ status.name }}
            </option>
          </select>
        </div>
        
        <!-- Filtro por ubicación -->
        <div class="filter-group">
          <label>Ubicación</label>
          <select v-model="filters.location">
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
        
        <!-- Filtro por fecha de compra -->
        <div class="filter-group">
          <label>Fecha de compra</label>
          <div class="date-range">
            <input 
              type="date" 
              v-model="filters.purchaseDateFrom" 
              placeholder="Desde"
            />
            <span class="date-separator">a</span>
            <input 
              type="date" 
              v-model="filters.purchaseDateTo" 
              placeholder="Hasta"
            />
          </div>
        </div>
      </div>
      
      <div class="filter-actions">
        <button class="btn-outline" @click="clearFilters">
          Limpiar filtros
        </button>
        
        <button class="btn-primary" @click="applyFilters">
          Aplicar filtros
        </button>
      </div>
    </div>
    
    <!-- Barra de acciones para elementos seleccionados -->
    <div class="selection-actions" v-if="selectedItems.length > 0">
      <div class="selection-info">
        <span>{{ selectedItems.length }} elementos seleccionados</span>
        <button class="btn-link" @click="clearSelection">Deseleccionar todo</button>
      </div>
      
      <div class="batch-actions">
        <button class="btn-outline" @click="openBatchEditDialog">
          <i class="icon-edit"></i> Edición masiva
        </button>
        
        <button class="btn-outline" @click="printSelected">
          <i class="icon-printer"></i> Imprimir
        </button>
        
        <button class="btn-outline danger" @click="confirmBatchDelete">
          <i class="icon-trash"></i> Eliminar seleccionados
        </button>
      </div>
    </div>
    
    <!-- Tabla de inventario (vista de lista) -->
    <div class="inventory-table-container" v-if="viewMode === 'list'">
      <table class="inventory-table" v-if="!loading && items.length > 0">
        <thead>
          <tr>
            <th class="checkbox-column">
              <input 
                type="checkbox" 
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th 
              v-for="column in visibleColumns" 
              :key="column.id"
              :class="{ sortable: column.sortable }"
              @click="column.sortable ? updateSort(column.id) : null"
            >
              <div class="column-header">
                {{ column.label }}
                <span v-if="column.sortable" class="sort-icon">
                  <i 
                    :class="{
                      'icon-chevron-up': sortBy === column.id && sortDirection === 'asc',
                      'icon-chevron-down': sortBy === column.id && sortDirection === 'desc',
                      'icon-chevrons-up-down': sortBy !== column.id
                    }"
                  ></i>
                </span>
              </div>
            </th>
            <th class="actions-column">Acciones</th>
          </tr>
        </thead>
        
        <tbody>
          <tr 
            v-for="item in items" 
            :key="item.id"
            :class="{ selected: selectedItems.includes(item.id) }"
          >
            <td class="checkbox-column">
              <input 
                type="checkbox" 
                :checked="selectedItems.includes(item.id)"
                @change="toggleItemSelection(item.id)"
              />
            </td>
            
            <td 
              v-for="column in visibleColumns" 
              :key="`${item.id}-${column.id}`"
              :class="column.class || ''"
            >
              <div v-if="column.id === 'name'" class="item-name-cell">
                <span class="item-name">{{ item[column.id] }}</span>
              </div>
              
              <div v-else-if="column.id === 'status'" class="status-cell">
                <span 
                  class="status-badge"
                  :class="getStatusClass(item.status)"
                >
                  {{ getStatusName(item.status) }}
                </span>
              </div>
              
              <div v-else>
                {{ formatCellValue(item[column.id], column.id) }}
              </div>
            </td>
            
            <td class="actions-column">
              <div class="actions-menu">
                <button class="btn-icon" @click="viewItemDetails(item.id)" title="Ver detalles">
                  <i class="icon-eye"></i>
                </button>
                
                <button class="btn-icon" @click="editItem(item.id)" title="Editar">
                  <i class="icon-edit"></i>
                </button>
                
                <button class="btn-icon danger" @click="confirmDelete(item.id)" title="Eliminar">
                  <i class="icon-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Estado vacío para la tabla -->
      <div class="empty-state" v-else-if="!loading && items.length === 0">
        <div class="empty-state-content">
          <i class="icon-box"></i>
          <h3>No hay elementos en el inventario</h3>
          <p v-if="hasFilters || searchQuery">
            No se encontraron elementos con los filtros o búsqueda actuales.
          </p>
          <p v-else>
            Comienza agregando elementos a tu inventario.
          </p>
          
          <div class="empty-actions">
            <button class="btn-outline" @click="clearFiltersAndSearch" v-if="hasFilters || searchQuery">
              Limpiar filtros y búsqueda
            </button>
            
            <button class="btn-primary" @click="openCreateDialog">
              <i class="icon-plus"></i> Agregar elemento
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Vista de cuadrícula -->
    <div class="inventory-grid" v-else-if="viewMode === 'grid' && !loading && items.length > 0">
      <div 
        v-for="item in items" 
        :key="item.id" 
        class="item-card"
        :class="{ selected: selectedItems.includes(item.id) }"
      >
        <div class="card-selection">
          <input 
            type="checkbox" 
            :checked="selectedItems.includes(item.id)"
            @change="toggleItemSelection(item.id)"
          />
        </div>
        
        <div class="card-content" @click="viewItemDetails(item.id)">
          <div class="item-icon">
            <i :class="getCategoryIcon(item.category)"></i>
          </div>
          
          <div class="item-info">
            <h3 class="item-name">{{ item.name }}</h3>
            <div class="item-details">
              <span class="item-serial">{{ item.serialNumber || 'Sin número de serie' }}</span>
              
              <span 
                class="status-badge small"
                :class="getStatusClass(item.status)"
              >
                {{ getStatusName(item.status) }}
              </span>
            </div>
            
            <div class="item-meta">
              <span v-if="item.brand || item.model">
                {{ item.brand }} {{ item.model ? `/ ${item.model}` : '' }}
              </span>
              <span v-if="item.location">
                <i class="icon-map-pin"></i> {{ getLocationName(item.location) }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="btn-icon" @click.stop="viewItemDetails(item.id)" title="Ver detalles">
            <i class="icon-eye"></i>
          </button>
          
          <button class="btn-icon" @click.stop="editItem(item.id)" title="Editar">
            <i class="icon-edit"></i>
          </button>
          
          <button class="btn-icon danger" @click.stop="confirmDelete(item.id)" title="Eliminar">
            <i class="icon-trash"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Estado vacío para la vista de cuadrícula -->
    <div class="empty-state" v-else-if="viewMode === 'grid' && !loading && items.length === 0">
      <div class="empty-state-content">
        <i class="icon-box"></i>
        <h3>No hay elementos en el inventario</h3>
        <p v-if="hasFilters || searchQuery">
          No se encontraron elementos con los filtros o búsqueda actuales.
        </p>
        <p v-else>
          Comienza agregando elementos a tu inventario.
        </p>
        
        <div class="empty-actions">
          <button class="btn-outline" @click="clearFiltersAndSearch" v-if="hasFilters || searchQuery">
            Limpiar filtros y búsqueda
          </button>
          
          <button class="btn-primary" @click="openCreateDialog">
            <i class="icon-plus"></i> Agregar elemento
          </button>
        </div>
      </div>
    </div>
    
    <!-- Indicador de carga -->
    <div class="loading-indicator" v-if="loading">
      <div class="spinner"></div>
      <span>Cargando inventario...</span>
    </div>
    
    <!-- Paginación -->
    <div class="pagination-container" v-if="totalPages > 1 && !loading">
      <div class="pagination">
        <button 
          class="btn-page"
          :disabled="currentPage === 1"
          @click="goToPage(1)"
        >
          <i class="icon-chevrons-left"></i>
        </button>
        
        <button 
          class="btn-page"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <i class="icon-chevron-left"></i>
        </button>
        
        <div class="page-info">
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
        </div>
        
        <button 
          class="btn-page"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <i class="icon-chevron-right"></i>
        </button>
        
        <button 
          class="btn-page"
          :disabled="currentPage === totalPages"
          @click="goToPage(totalPages)"
        >
          <i class="icon-chevrons-right"></i>
        </button>
      </div>
      
      <div class="page-size-selector">
        <span>Mostrar</span>
        <select v-model.number="pageSize" @change="updatePageSize">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span>por página</span>
      </div>
    </div>
    
    <!-- Modal para crear/editar elemento -->
    <Modal
      v-if="showEditModal"
      :show="showEditModal"
      :title="editingItemId ? 'Editar elemento' : 'Crear nuevo elemento'"
      @close="closeEditModal"
      @confirm="saveItem"
      :loading="savingItem"
      confirmText="Guardar"
    >
      <div class="editor-form">
        <!-- Contenido del formulario de edición -->
        <p>Formulario de edición (a implementar)</p>
      </div>
    </Modal>
    
    <!-- Modal para confirmar eliminación -->
    <Modal
      v-if="showDeleteModal"
      :show="showDeleteModal"
      title="Confirmar eliminación"
      @close="closeDeleteModal"
      @confirm="deleteItem"
      :loading="deletingItem"
      confirmText="Eliminar"
    >
      <div class="confirm-delete">
        <p>¿Estás seguro de que deseas eliminar este elemento del inventario?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
      </div>
    </Modal>
    
    <!-- Modal para importar elementos -->
    <Modal
      v-if="showImportModal"
      :show="showImportModal"
      title="Importar elementos"
      @close="closeImportModal"
      hideFooter
      size="large"
    >
      <BulkImportForm
        @import-start="handleImportStart"
        @import-cancel="closeImportModal"
        @import-success="handleImportSuccess"
      />
    </Modal>
    
    <!-- Modal para exportar elementos -->
    <Modal
      v-if="showExportModal"
      :show="showExportModal"
      title="Exportar inventario"
      @close="closeExportModal"
      hideFooter
      size="medium"
    >
      <ExportForm
        :selectedItems="selectedItems"
        :totalItems="totalItems"
        :filteredCount="filteredCount"
        :hasFilters="hasFilters"
        @export-start="handleExportStart"
        @export-cancel="closeExportModal"
        @export-close="closeExportModal"
        @export-success="handleExportSuccess"
      />
    </Modal>
    
    <!-- Modal para generar códigos QR -->
    <Modal
      v-if="showQRModal"
      :show="showQRModal"
      title="Generar códigos QR"
      @close="closeQRModal"
      hideFooter
      size="large"
    >
      <QRCodeGenerator
        :items="selectedItemsData"
        :defaultBaseUrl="qrBaseUrl"
        @qr-generate="handleQRGenerate"
        @qr-cancel="closeQRModal"
        @qr-success="handleQRSuccess"
        @qr-error="handleQRError"
      />
    </Modal>
  </div>
</template>

<script>
import Modal from '@/components/common/Modal.vue';
import BulkImportForm from '@/components/inventory/BulkImportForm.vue';
import ExportForm from '@/components/inventory/ExportForm.vue';
import QRCodeGenerator from '@/components/inventory/QRCodeGenerator.vue';
import inventoryService from '@/services/inventory';

export default {
  name: 'InventoryList',
  components: {
    Modal,
    BulkImportForm,
    ExportForm,
    QRCodeGenerator
  },
  data() {
    return {
      // Estado de carga y elementos
      loading: false,
      items: [],
      totalItems: 0,
      
      // Selección
      selectedItems: [],
      
      // Paginación
      currentPage: 1,
      pageSize: 25,
      totalPages: 1,
      
      // Búsqueda y filtros
      searchQuery: '',
      showFilters: false,
      filters: {
        category: '',
        status: '',
        location: '',
        purchaseDateFrom: '',
        purchaseDateTo: ''
      },
      appliedFilters: {},
      
      // Ordenamiento
      sortBy: 'updatedAt',
      sortDirection: 'desc',
      
      // Configuración de vista
      viewMode: 'list',
      
      // Modales
      showEditModal: false,
      showDeleteModal: false,
      showImportModal: false,
      showExportModal: false,
      showQRModal: false,
      
      // Estado de edición
      editingItemId: null,
      savingItem: false,
      deletingItem: false,
      deletingItemId: null,
      
      // QR Code
      qrBaseUrl: window.location.origin + '/inventario/',
      
      // Metadatos (normalmente se cargarían desde la API)
      categories: [],
      statuses: [],
      locations: []
    };
  },
  computed: {
    /**
     * Columnas visibles en la vista de tabla
     */
    visibleColumns() {
      return [
        { id: 'name', label: 'Nombre', sortable: true },
        { id: 'serialNumber', label: 'Número de serie', sortable: true },
        { id: 'brand', label: 'Marca', sortable: true },
        { id: 'model', label: 'Modelo', sortable: true },
        { id: 'status', label: 'Estado', sortable: true },
        { id: 'category', label: 'Categoría', sortable: true },
        { id: 'location', label: 'Ubicación', sortable: true },
        { id: 'updatedAt', label: 'Últ. actualización', sortable: true }
      ];
    },
    
    /**
     * Verificar si todos los elementos están seleccionados
     */
    allSelected() {
      return this.items.length > 0 && this.selectedItems.length === this.items.length;
    },
    
    /**
     * Verificar si algunos elementos están seleccionados
     */
    someSelected() {
      return this.selectedItems.length > 0 && this.selectedItems.length < this.items.length;
    },
    
    /**
     * Número de filtros activos
     */
    activeFiltersCount() {
      return Object.values(this.appliedFilters).filter(Boolean).length;
    },
    
    /**
     * Verificar si hay filtros aplicados
     */
    hasFilters() {
      return this.activeFiltersCount > 0;
    },
    
    /**
     * Número de elementos después de aplicar filtros
     */
    filteredCount() {
      // En una implementación real, este valor vendría de la API
      return this.hasFilters ? this.totalItems : 0;
    },
    
    /**
     * Obtener datos completos de elementos seleccionados
     * Usado para la generación de QR
     */
    selectedItemsData() {
      return this.items.filter(item => this.selectedItems.includes(item.id));
    }
  },
  created() {
    this.loadInventory();
    this.loadMetadata();
  },
  methods: {
    /**
     * Cargar elementos del inventario desde la API
     */
    async loadInventory() {
      this.loading = true;
      
      try {
        // Preparar parámetros para la API
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
          sortBy: this.sortBy,
          sortDirection: this.sortDirection,
          search: this.searchQuery,
          ...this.appliedFilters
        };
        
        // Llamar al servicio de inventario
        const response = await inventoryService.getItems(params);
        
        // Actualizar estado con la respuesta
        this.items = response.data;
        this.totalItems = response.meta.total;
        this.totalPages = response.meta.totalPages;
        
      } catch (error) {
        console.error('Error al cargar inventario:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al cargar el inventario. Por favor, inténtalo de nuevo.'
        });
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Cargar metadatos (categorías, estados, ubicaciones)
     */
    async loadMetadata() {
      try {
        const [categories, statuses, locations] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getStatuses(),
          inventoryService.getLocations()
        ]);
        
        this.categories = categories;
        this.statuses = statuses;
        this.locations = locations;
      } catch (error) {
        console.error('Error al cargar metadatos:', error);
      }
    },
    
    /**
     * Manejar búsqueda
     */
    handleSearchInput() {
      // Utilizar debounce para no hacer muchas peticiones
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this.currentPage = 1;
        this.loadInventory();
      }, 500);
    },
    
    /**
     * Limpiar búsqueda
     */
    clearSearch() {
      this.searchQuery = '';
      this.loadInventory();
    },
    
    /**
     * Mostrar/ocultar panel de filtros
     */
    toggleFilters() {
      this.showFilters = !this.showFilters;
    },
    
    /**
     * Aplicar filtros
     */
    applyFilters() {
      this.appliedFilters = { ...this.filters };
      this.showFilters = false;
      this.currentPage = 1;
      this.loadInventory();
    },
    
    /**
     * Limpiar filtros
     */
    clearFilters() {
      this.filters = {
        category: '',
        status: '',
        location: '',
        purchaseDateFrom: '',
        purchaseDateTo: ''
      };
    },
    
    /**
     * Limpiar filtros y búsqueda
     */
    clearFiltersAndSearch() {
      this.clearFilters();
      this.searchQuery = '';
      this.appliedFilters = {};
      this.loadInventory();
    },
    
    /**
     * Actualizar orden de la lista
     */
    updateSort(columnId) {
      if (this.sortBy === columnId) {
        // Cambiar dirección si ya está ordenado por esta columna
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        // Nueva columna para ordenar
        this.sortBy = columnId;
        this.sortDirection = 'asc';
      }
      
      this.loadInventory();
    },
    
    /**
     * Cambiar de página
     */
    goToPage(page) {
      this.currentPage = page;
      this.loadInventory();
    },
    
    /**
     * Actualizar tamaño de página
     */
    updatePageSize() {
      this.currentPage = 1;
      this.loadInventory();
    },
    
    /**
     * Alternar selección de todos los elementos
     */
    toggleSelectAll() {
      if (this.allSelected) {
        this.selectedItems = [];
      } else {
        this.selectedItems = this.items.map(item => item.id);
      }
    },
    
    /**
     * Alternar selección de un elemento
     */
    toggleItemSelection(itemId) {
      const index = this.selectedItems.indexOf(itemId);
      if (index === -1) {
        this.selectedItems.push(itemId);
      } else {
        this.selectedItems.splice(index, 1);
      }
    },
    
    /**
     * Limpiar selección
     */
    clearSelection() {
      this.selectedItems = [];
    },
    
    /**
     * Ver detalles de un elemento
     */
    viewItemDetails(itemId) {
      // Navegar a la vista de detalles o mostrar modal
      this.$router.push(`/inventario/${itemId}`);
    },
    
    /**
     * Abrir modal para editar elemento
     */
    editItem(itemId) {
      this.editingItemId = itemId;
      this.showEditModal = true;
    },
    
    /**
     * Abrir modal para confirmar eliminación
     */
    confirmDelete(itemId) {
      this.deletingItemId = itemId;
      this.showDeleteModal = true;
    },
    
    /**
     * Abrir modal para crear elemento
     */
    openCreateDialog() {
      this.editingItemId = null;
      this.showEditModal = true;
    },
    
    /**
     * Cerrar modal de edición
     */
    closeEditModal() {
      this.showEditModal = false;
      this.editingItemId = null;
    },
    
    /**
     * Guardar elemento (crear o actualizar)
     */
    async saveItem(itemData) {
      this.savingItem = true;
      
      try {
        if (this.editingItemId) {
          // Actualizar elemento existente
          await inventoryService.updateItem(this.editingItemId, itemData);
          this.$emit('show-notification', {
            type: 'success',
            message: 'Elemento actualizado correctamente'
          });
        } else {
          // Crear nuevo elemento
          await inventoryService.createItem(itemData);
          this.$emit('show-notification', {
            type: 'success',
            message: 'Elemento creado correctamente'
          });
        }
        
        // Cerrar modal y recargar lista
        this.closeEditModal();
        this.loadInventory();
        
      } catch (error) {
        console.error('Error al guardar elemento:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al guardar elemento. Por favor, inténtalo de nuevo.'
        });
      } finally {
        this.savingItem = false;
      }
    },
    
    /**
     * Cerrar modal de confirmación de eliminación
     */
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.deletingItemId = null;
    },
    
    /**
     * Eliminar elemento
     */
    async deleteItem() {
      if (!this.deletingItemId) return;
      
      this.deletingItem = true;
      
      try {
        await inventoryService.deleteItem(this.deletingItemId);
        
        this.$emit('show-notification', {
          type: 'success',
          message: 'Elemento eliminado correctamente'
        });
        
        // Quitar de seleccionados si estaba seleccionado
        const index = this.selectedItems.indexOf(this.deletingItemId);
        if (index !== -1) {
          this.selectedItems.splice(index, 1);
        }
        
        // Cerrar modal y recargar lista
        this.closeDeleteModal();
        this.loadInventory();
        
      } catch (error) {
        console.error('Error al eliminar elemento:', error);
        this.$emit('show-notification', {
          type: 'error',
          message: 'Error al eliminar elemento. Por favor, inténtalo de nuevo.'
        });
      } finally {
        this.deletingItem = false;
      }
    },
    
    /**
     * Confirmar eliminación masiva
     */
    confirmBatchDelete() {
      if (this.selectedItems.length === 0) return;
      
      // Implementar lógica para eliminación masiva
      // Esto normalmente mostraría otro modal de confirmación
    },
    
    /**
     * Abrir modal para edición masiva
     */
    openBatchEditDialog() {
      if (this.selectedItems.length === 0) return;
      
      // Implementar lógica para edición masiva
    },
    
    /**
     * Imprimir elementos seleccionados
     */
    printSelected() {
      if (this.selectedItems.length === 0) return;
      
      // Implementar lógica para impresión
    },
    
    /**
     * Abrir modal de importación
     */
    openImportDialog() {
      this.showImportModal = true;
    },
    
    /**
     * Cerrar modal de importación
     */
    closeImportModal() {
      this.showImportModal = false;
    },
    
    /**
     * Manejar inicio de importación
     */
    handleImportStart(importData) {
      // Aquí se enviaría la solicitud de importación al backend
      // importData contiene el archivo y la configuración
    },
    
    /**
     * Manejar finalización de importación
     */
    handleImportSuccess(result) {
      this.closeImportModal();
      
      this.$emit('show-notification', {
        type: 'success',
        message: `Importación completada: ${result.imported} elementos importados, ${result.updated} actualizados, ${result.errors} errores.`
      });
      
      // Recargar lista
      this.loadInventory();
    },
    
    /**
     * Abrir modal de exportación
     */
    openExportDialog() {
      this.showExportModal = true;
    },
    
    /**
     * Cerrar modal de exportación
     */
    closeExportModal() {
      this.showExportModal = false;
    },
    
    /**
     * Manejar inicio de exportación
     */
    handleExportStart(exportConfig) {
      // Aquí se enviaría la solicitud de exportación al backend
      // exportConfig contiene la configuración
    },
    
    /**
     * Manejar finalización de exportación
     */
    handleExportSuccess(result) {
      // En una implementación real, aquí se procesaría la respuesta
      // y se descargaría el archivo exportado
      
      this.closeExportModal();
      
      this.$emit('show-notification', {
        type: 'success',
        message: 'Exportación completada correctamente'
      });
    },
    
    /**
     * Abrir modal de generación de códigos QR
     */
    openQRDialog() {
      if (this.selectedItems.length === 0) return;
      this.showQRModal = true;
    },
    
    /**
     * Cerrar modal de generación de códigos QR
     */
    closeQRModal() {
      this.showQRModal = false;
    },
    
    /**
     * Manejar solicitud de generación de códigos QR
     */
    handleQRGenerate(qrConfig) {
      // Aquí se enviaría la solicitud de generación al backend
      // qrConfig contiene la configuración
    },
    
    /**
     * Manejar finalización de generación de códigos QR
     */
    handleQRSuccess(result) {
      this.closeQRModal();
      
      this.$emit('show-notification', {
        type: 'success',
        message: 'Códigos QR generados correctamente'
      });
    },
    
    /**
     * Manejar error de generación de códigos QR
     */
    handleQRError(error) {
      this.$emit('show-notification', {
        type: 'error',
        message: 'Error al generar códigos QR: ' + error.message
      });
    },
    
    /**
     * Dar formato a un valor de celda
     */
    formatCellValue(value, columnId) {
      if (value === undefined || value === null) return '—';
      
      switch (columnId) {
        case 'purchaseDate':
        case 'warrantyExpiration':
        case 'createdAt':
        case 'updatedAt':
          return this.formatDate(value);
          
        case 'cost':
          return this.formatCurrency(value);
          
        case 'category':
          return this.getCategoryName(value);
          
        case 'location':
          return this.getLocationName(value);
          
        default:
          return value;
      }
    },
    
    /**
     * Dar formato a una fecha
     */
    formatDate(dateString) {
      if (!dateString) return '—';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    
    /**
     * Dar formato a un valor monetario
     */
    formatCurrency(value) {
      if (value === undefined || value === null) return '—';
      
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    },
    
    /**
     * Obtener nombre de categoría
     */
    getCategoryName(categoryId) {
      if (!categoryId) return '—';
      
      const category = this.categories.find(c => c.id === categoryId);
      return category ? category.name : categoryId;
    },
    
    /**
     * Obtener nombre de estado
     */
    getStatusName(statusId) {
      if (!statusId) return '—';
      
      const status = this.statuses.find(s => s.id === statusId);
      return status ? status.name : statusId;
    },
    
    /**
     * Obtener nombre de ubicación
     */
    getLocationName(locationId) {
      if (!locationId) return '—';
      
      const location = this.locations.find(l => l.id === locationId);
      return location ? location.name : locationId;
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
     * Obtener ícono para categoría
     */
    getCategoryIcon(categoryId) {
      if (!categoryId) return 'icon-box';
      
      const category = this.categories.find(c => c.id === categoryId);
      if (!category) return 'icon-box';
      
      // En una implementación real, cada categoría tendría su propio ícono
      const iconMap = {
        router: 'icon-wifi',
        antenna: 'icon-radio',
        cable: 'icon-cable',
        switch: 'icon-layers',
        server: 'icon-server',
        tool: 'icon-tool',
        misc: 'icon-box'
      };
      
      return iconMap[category.id.toLowerCase()] || 'icon-box';
    }
  }
};
</script>

<style scoped>
/* Contenedor principal */
.inventory-list-container {
  padding: 24px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Cabecera */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.item-count {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Barra de búsqueda y filtros */
.search-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
  max-width: 500px;
  position: relative;
}

.search-box input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  font-size: 14px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: var(--bg-primary, white);
}

.search-box i.icon-search {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary, #666);
}

.search-box .clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-filter:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-filter.active {
  background-color: var(--primary-lightest, #e3f2fd);
  border-color: var(--primary-color, #1976d2);
  color: var(--primary-color, #1976d2);
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: var(--primary-color, #1976d2);
  color: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.view-options {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  overflow: hidden;
}

.btn-view {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: var(--bg-primary, white);
  color: var(--text-secondary, #666);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view:not(:last-child) {
  border-right: 1px solid var(--border-color, #e0e0e0);
}

.btn-view:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-view.active {
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
}

/* Panel de filtros */
.filters-panel {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 13px;
  color: var(--text-primary, #333);
  font-weight: 500;
}

.filter-group select,
.filter-group input[type="date"] {
  padding: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range input {
  flex: 1;
  min-width: 0;
}

.date-separator {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Barra de acciones para selección */
.selection-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: var(--primary-lightest, #e3f2fd);
  border-radius: 8px;
  border: 1px solid var(--primary-lighter, #bbdefb);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selection-info span {
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-dark, #1565c0);
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color, #1976d2);
  font-size: 14px;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Tabla de inventario */
.inventory-table-container {
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  margin-bottom: 20px;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.inventory-table th,
.inventory-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.inventory-table th {
  background-color: var(--bg-secondary, #f5f5f5);
  font-weight: 600;
  color: var(--text-primary, #333);
  position: sticky;
  top: 0;
  z-index: 1;
}

.inventory-table tbody tr:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.inventory-table tr.selected {
  background-color: var(--primary-lightest, #e3f2fd);
}

.checkbox-column {
  width: 40px;
  text-align: center;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  margin-left: auto;
}

th.sortable {
  cursor: pointer;
}

th.sortable:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.actions-column {
  width: 120px;
  text-align: right;
}

.actions-menu {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, #e0e0e0);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-icon.danger {
  color: var(--error-color, #f44336);
}

.btn-icon.danger:hover {
  background-color: var(--error-light, #ffebee);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
}

.status-badge.small {
  padding: 2px 6px;
  font-size: 11px;
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

/* Vista de cuadrícula */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.item-card {
  position: relative;
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.item-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.item-card.selected {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.card-selection {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.card-content {
  display: flex;
  padding: 16px;
  gap: 16px;
  cursor: pointer;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  color: var(--text-primary, #333);
  font-size: 24px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.item-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-serial {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.item-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.item-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-actions {
  display: flex;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.card-actions .btn-icon {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 0;
  background-color: transparent;
}

.card-actions .btn-icon:not(:last-child) {
  border-right: 1px solid var(--border-color, #e0e0e0);
}

/* Estado vacío */
.empty-state {
  padding: 40px 0;
  text-align: center;
}

.empty-state-content {
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-state-content i {
  font-size: 48px;
  color: var(--text-secondary, #666);
}

.empty-state-content h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.empty-state-content p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.empty-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Indicador de carga */
.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--primary-lighter, #bbdefb);
  border-top: 3px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-indicator span {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Paginación */
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background-color: var(--bg-primary, white);
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-page:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.page-size-selector select {
  padding: 6px 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

/* Modal de confirmación */
.confirm-delete {
  text-align: center;
  padding: 20px 0;
}

.confirm-delete p {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary, #333);
}

.confirm-delete .warning {
  color: var(--error-color, #f44336);
  font-weight: 500;
}

/* Editor de elementos */
.editor-form {
  padding: 16px;
}

/* Botones */
.btn-primary,
.btn-outline,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-dark, #1565c0);
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-outline.danger {
  color: var(--error-color, #f44336);
  border-color: var(--error-color, #f44336);
}

.btn-outline.danger:hover:not(:disabled) {
  background-color: var(--error-light, #ffebee);
}

.btn-secondary {
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-primary, #333);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-primary:disabled,
.btn-outline:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .inventory-list-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-filter-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .search-box {
    width: 100%;
    max-width: none;
  }
  
  .filter-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .selection-actions {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .batch-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .pagination-container {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .pagination {
    width: 100%;
    justify-content: space-between;
  }
  
  .page-size-selector {
    width: 100%;
    justify-content: center;
  }
}
</style>
