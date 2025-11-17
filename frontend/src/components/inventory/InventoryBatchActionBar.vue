<template>
  <div class="batch-action-bar" :class="{ 'visible': isVisible }">
    <div class="action-bar-container">
      <!-- Resumen de selección -->
      <div class="selection-summary">
        <span class="selected-count">{{ selectedItems.length }} {{ selectedItems.length === 1 ? 'elemento' : 'elementos' }} seleccionado{{ selectedItems.length === 1 ? '' : 's' }}</span>
        <button type="button" class="btn-link" @click="clearSelection">Deseleccionar todo</button>
      </div>
      
      <!-- Acciones disponibles -->
      <div class="action-buttons">
        <!-- Cambio de estado -->
        <div class="action-dropdown">
          <button type="button" class="btn-action" @click="toggleDropdown('status')">
            <i class="icon-tag"></i>
            <span>Cambiar estado</span>
            <i class="icon-chevron-down"></i>
          </button>
          
          <div class="dropdown-menu" v-if="openDropdown === 'status'">
            <button 
              v-for="status in statuses" 
              :key="status.id"
              type="button" 
              class="dropdown-item" 
              @click="changeStatus(status.id)"
            >
              <span class="status-badge" :class="getStatusClass(status.id)">
                {{ status.name }}
              </span>
            </button>
          </div>
        </div>
        
        <!-- Mover a ubicación -->
        <div class="action-dropdown">
          <button type="button" class="btn-action" @click="toggleDropdown('location')">
            <i class="icon-map-pin"></i>
            <span>Mover a</span>
            <i class="icon-chevron-down"></i>
          </button>
          
          <div class="dropdown-menu" v-if="openDropdown === 'location'">
            <div class="dropdown-search">
              <input 
                type="text" 
                v-model="locationSearch" 
                placeholder="Buscar ubicación..." 
                class="form-control"
              >
            </div>
            <div class="dropdown-items-container">
              <button 
                v-for="location in filteredLocations" 
                :key="location.id"
                type="button" 
                class="dropdown-item" 
                @click="moveToLocation(location.id)"
              >
                <i class="icon-folder"></i>
                <span>{{ location.name }}</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Asignar a cliente -->
        <div class="action-dropdown">
          <button type="button" class="btn-action" @click="toggleDropdown('client')">
            <i class="icon-user"></i>
            <span>Asignar a</span>
            <i class="icon-chevron-down"></i>
          </button>
          
          <div class="dropdown-menu" v-if="openDropdown === 'client'">
            <div class="dropdown-search">
              <input 
                type="text" 
                v-model="clientSearch" 
                placeholder="Buscar cliente..." 
                class="form-control"
              >
            </div>
            <div class="dropdown-items-container">
              <button 
                v-for="client in filteredClients" 
                :key="client.id"
                type="button" 
                class="dropdown-item" 
                @click="assignToClient(client.id)"
              >
                <i class="icon-user"></i>
                <span>{{ client.name }}</span>
              </button>
              <button 
                type="button" 
                class="dropdown-item remove-assignment" 
                @click="removeAssignment()"
              >
                <i class="icon-user-x"></i>
                <span>Eliminar asignación</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Imprimir etiquetas/QR -->
        <button type="button" class="btn-action" @click="printLabels">
          <i class="icon-printer"></i>
          <span>Imprimir</span>
        </button>
        
        <!-- Exportar selección -->
        <button type="button" class="btn-action" @click="exportSelection">
          <i class="icon-download"></i>
          <span>Exportar</span>
        </button>
        
        <!-- Eliminar elementos -->
        <button 
          type="button" 
          class="btn-action danger" 
          @click="confirmDelete"
          v-if="hasDeletePermission"
        >
          <i class="icon-trash"></i>
          <span>Eliminar</span>
        </button>
      </div>
    </div>
    
    <!-- Modales para acciones -->
    
    <!-- Modal para confirmación de cambio de estado -->
    <Modal 
      v-if="showStatusModal"
      :show="showStatusModal" 
      title="Cambiar estado de elementos" 
      @close="closeStatusModal"
      @confirm="confirmStatusChange"
      confirmText="Cambiar estado"
      :loading="isProcessing"
    >
      <div class="confirm-status-change">
        <p>Está a punto de cambiar el estado de <strong>{{ selectedItems.length }}</strong> elemento(s) a:</p>
        
        <div class="status-selection">
          <div class="selected-status">
            <span class="status-badge" :class="getStatusClass(selectedStatus)">
              {{ getStatusName(selectedStatus) }}
            </span>
          </div>
        </div>
        
        <div class="warning-note" v-if="statusChangeWarning">
          <i class="icon-alert-triangle"></i>
          <span>{{ statusChangeWarning }}</span>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados:</p>
          <ul class="items-list">
            <li v-for="(item, index) in itemsPreview" :key="index">
              {{ item.name }}
              <span v-if="item.serialNumber">(S/N: {{ item.serialNumber }})</span>
            </li>
            <li v-if="selectedItems.length > 5" class="more-items">
              Y {{ selectedItems.length - 5 }} elemento(s) más...
            </li>
          </ul>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmación de movimiento -->
    <Modal 
      v-if="showLocationModal"
      :show="showLocationModal" 
      title="Mover elementos" 
      @close="closeLocationModal"
      @confirm="confirmLocationMove"
      confirmText="Mover"
      :loading="isProcessing"
    >
      <div class="confirm-location-move">
        <p>Está a punto de mover <strong>{{ selectedItems.length }}</strong> elemento(s) a la ubicación:</p>
        
        <div class="location-selection">
          <div class="selected-location">
            <i class="icon-folder"></i>
            <span>{{ getLocationName(selectedLocation) }}</span>
          </div>
        </div>
        
        <div class="additional-options">
          <div class="form-group">
            <label for="moveReason">Razón del movimiento:</label>
            <select id="moveReason" v-model="moveReason" class="form-control">
              <option value="">Seleccionar razón...</option>
              <option value="transfer">Transferencia</option>
              <option value="reorganization">Reorganización</option>
              <option value="inventory">Inventario</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="other">Otra</option>
            </select>
          </div>
          
          <div class="form-group" v-if="moveReason === 'other'">
            <label for="customMoveReason">Especificar razón:</label>
            <input type="text" id="customMoveReason" v-model="customMoveReason" class="form-control">
          </div>
          
          <div class="form-group">
            <label for="moveNotes">Notas adicionales:</label>
            <textarea id="moveNotes" v-model="moveNotes" class="form-control" rows="3"></textarea>
          </div>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados:</p>
          <ul class="items-list">
            <li v-for="(item, index) in itemsPreview" :key="index">
              {{ item.name }}
              <span v-if="item.currentLocation">(Ubicación actual: {{ getLocationName(item.currentLocation) }})</span>
            </li>
            <li v-if="selectedItems.length > 5" class="more-items">
              Y {{ selectedItems.length - 5 }} elemento(s) más...
            </li>
          </ul>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmación de asignación -->
    <Modal 
      v-if="showClientModal"
      :show="showClientModal" 
      title="Asignar elementos a cliente" 
      @close="closeClientModal"
      @confirm="confirmClientAssignment"
      confirmText="Asignar"
      :loading="isProcessing"
    >
      <div class="confirm-client-assignment">
        <p>Está a punto de asignar <strong>{{ selectedItems.length }}</strong> elemento(s) al cliente:</p>
        
        <div class="client-selection">
          <div class="selected-client">
            <i class="icon-user"></i>
            <span>{{ getClientName(selectedClient) }}</span>
          </div>
        </div>
        
        <div class="additional-options">
          <div class="form-group">
            <label for="installationDate">Fecha de instalación:</label>
            <input 
              type="date" 
              id="installationDate" 
              v-model="installationDate" 
              class="form-control"
            >
          </div>
          
          <div class="form-group">
            <label for="assignmentNotes">Notas de asignación:</label>
            <textarea 
              id="assignmentNotes" 
              v-model="assignmentNotes" 
              class="form-control"
              rows="3"
            ></textarea>
          </div>
          
          <div class="checkbox-option">
            <input type="checkbox" id="changeStatusOnAssignment" v-model="changeStatusOnAssignment">
            <label for="changeStatusOnAssignment">Cambiar estado a "Asignado" automáticamente</label>
          </div>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados:</p>
          <ul class="items-list">
            <li v-for="(item, index) in itemsPreview" :key="index">
              {{ item.name }}
              <span v-if="item.assignedClient">(Actualmente asignado a: {{ item.assignedClient.name }})</span>
            </li>
            <li v-if="selectedItems.length > 5" class="more-items">
              Y {{ selectedItems.length - 5 }} elemento(s) más...
            </li>
          </ul>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmación de eliminación de asignación -->
    <Modal 
      v-if="showRemoveAssignmentModal"
      :show="showRemoveAssignmentModal" 
      title="Eliminar asignación de elementos" 
      @close="closeRemoveAssignmentModal"
      @confirm="confirmRemoveAssignment"
      confirmText="Eliminar asignación"
      confirmClass="danger"
      :loading="isProcessing"
    >
      <div class="confirm-remove-assignment">
        <p>Está a punto de eliminar la asignación de cliente para <strong>{{ selectedItems.length }}</strong> elemento(s).</p>
        
        <div class="warning-note">
          <i class="icon-alert-triangle"></i>
          <span>Esta acción cambiará el estado de los elementos que estén asignados.</span>
        </div>
        
        <div class="additional-options">
          <div class="form-group">
            <label for="newStatus">Nuevo estado para los elementos:</label>
            <select id="newStatus" v-model="newStatusAfterRemoval" class="form-control">
              <option value="">Sin cambios</option>
              <option 
                v-for="status in nonAssignedStatuses" 
                :key="status.id"
                :value="status.id"
              >
                {{ status.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="removalNotes">Notas:</label>
            <textarea 
              id="removalNotes" 
              v-model="removalNotes" 
              class="form-control"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados:</p>
          <ul class="items-list">
            <li v-for="(item, index) in itemsPreview" :key="index">
              {{ item.name }}
              <span v-if="item.assignedClient">(Actualmente asignado a: {{ item.assignedClient.name }})</span>
            </li>
            <li v-if="selectedItems.length > 5" class="more-items">
              Y {{ selectedItems.length - 5 }} elemento(s) más...
            </li>
          </ul>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para opciones de impresión -->
    <Modal 
      v-if="showPrintModal"
      :show="showPrintModal" 
      title="Imprimir etiquetas" 
      @close="closePrintModal"
      @confirm="confirmPrint"
      confirmText="Imprimir"
      :loading="isProcessing"
    >
      <div class="print-options">
        <div class="form-group">
          <label for="printType">Tipo de impresión:</label>
          <div class="option-buttons">
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: printType === 'qr' }"
              @click="printType = 'qr'"
            >
              <i class="icon-qrcode"></i>
              <span>Códigos QR</span>
            </button>
            
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: printType === 'label' }"
              @click="printType = 'label'"
            >
              <i class="icon-tag"></i>
              <span>Etiquetas</span>
            </button>
            
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: printType === 'detailed' }"
              @click="printType = 'detailed'"
            >
              <i class="icon-file-text"></i>
              <span>Ficha detallada</span>
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label for="printFormat">Formato:</label>
          <select id="printFormat" v-model="printFormat" class="form-control">
            <option value="pdf">PDF</option>
            <option value="png">Imágenes PNG</option>
          </select>
        </div>
        
        <div class="form-group" v-if="printType === 'qr' || printType === 'label'">
          <label for="labelSize">Tamaño de etiqueta:</label>
          <select id="labelSize" v-model="labelSize" class="form-control">
            <option value="small">Pequeño (30x20mm)</option>
            <option value="medium">Mediano (50x30mm)</option>
            <option value="large">Grande (100x70mm)</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        
        <div class="form-group" v-if="labelSize === 'custom'">
          <label for="customWidth">Ancho (mm):</label>
          <input type="number" id="customWidth" v-model.number="customWidth" class="form-control" min="1">
        </div>
        
        <div class="form-group" v-if="labelSize === 'custom'">
          <label for="customHeight">Alto (mm):</label>
          <input type="number" id="customHeight" v-model.number="customHeight" class="form-control" min="1">
        </div>
        
        <div class="form-group" v-if="printType === 'qr'">
          <label>Información a incluir:</label>
          <div class="checkbox-option">
            <input type="checkbox" id="includeCode" v-model="includeCode">
            <label for="includeCode">Código</label>
          </div>
          
          <div class="checkbox-option">
            <input type="checkbox" id="includeSerialNumber" v-model="includeSerialNumber">
            <label for="includeSerialNumber">Número de serie</label>
          </div>
          
          <div class="checkbox-option">
            <input type="checkbox" id="includeName" v-model="includeName">
            <label for="includeName">Nombre del elemento</label>
          </div>
        </div>
        
        <div class="form-group" v-if="printType === 'label' || printType === 'detailed'">
          <label>Campos a incluir:</label>
          <div class="fields-grid">
            <div class="checkbox-option">
              <input type="checkbox" id="fieldCode" v-model="printFields.code">
              <label for="fieldCode">Código</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldName" v-model="printFields.name">
              <label for="fieldName">Nombre</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldType" v-model="printFields.type">
              <label for="fieldType">Tipo</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldSerialNumber" v-model="printFields.serialNumber">
              <label for="fieldSerialNumber">Número de serie</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldMacAddress" v-model="printFields.macAddress">
              <label for="fieldMacAddress">MAC Address</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldLocation" v-model="printFields.location">
              <label for="fieldLocation">Ubicación</label>
            </div>
            
            <div class="checkbox-option">
              <input type="checkbox" id="fieldStatus" v-model="printFields.status">
              <label for="fieldStatus">Estado</label>
            </div>
            
            <div class="checkbox-option" v-if="printType === 'detailed'">
              <input type="checkbox" id="fieldSpecifications" v-model="printFields.specifications">
              <label for="fieldSpecifications">Especificaciones</label>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="printOrder">Ordenar por:</label>
          <select id="printOrder" v-model="printOrder" class="form-control">
            <option value="name">Nombre</option>
            <option value="code">Código</option>
            <option value="type">Tipo</option>
            <option value="location">Ubicación</option>
          </select>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados: <strong>{{ selectedItems.length }}</strong></p>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para opciones de exportación -->
    <Modal 
      v-if="showExportModal"
      :show="showExportModal" 
      title="Exportar elementos" 
      @close="closeExportModal"
      @confirm="confirmExport"
      confirmText="Exportar"
      :loading="isProcessing"
    >
      <div class="export-options">
        <div class="form-group">
          <label for="exportFormat">Formato:</label>
          <div class="option-buttons">
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: exportFormat === 'excel' }"
              @click="exportFormat = 'excel'"
            >
              <i class="icon-file-spreadsheet"></i>
              <span>Excel</span>
            </button>
            
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: exportFormat === 'csv' }"
              @click="exportFormat = 'csv'"
            >
              <i class="icon-file-text"></i>
              <span>CSV</span>
            </button>
            
            <button 
              type="button" 
              class="option-button" 
              :class="{ active: exportFormat === 'pdf' }"
              @click="exportFormat = 'pdf'"
            >
              <i class="icon-file-pdf"></i>
              <span>PDF</span>
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label>Columnas a incluir:</label>
          <div class="select-all-option">
            <button type="button" class="btn-link" @click="selectAllColumns">Seleccionar todo</button>
            <button type="button" class="btn-link" @click="deselectAllColumns">Deseleccionar todo</button>
          </div>
          
          <div class="fields-grid">
            <div class="checkbox-option" v-for="(column, key) in exportColumns" :key="key">
              <input type="checkbox" :id="'export_' + key" v-model="exportColumns[key].selected">
              <label :for="'export_' + key">{{ column.label }}</label>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <div class="checkbox-option">
            <input type="checkbox" id="includeSpecifications" v-model="includeSpecifications">
            <label for="includeSpecifications">Incluir especificaciones técnicas</label>
          </div>
          
          <div class="checkbox-option">
            <input type="checkbox" id="includeMovementHistory" v-model="includeMovementHistory">
            <label for="includeMovementHistory">Incluir historial de movimientos</label>
          </div>
        </div>
        
        <div class="items-summary">
          <p>Elementos seleccionados: <strong>{{ selectedItems.length }}</strong></p>
        </div>
      </div>
    </Modal>
    
    <!-- Modal para confirmación de eliminación -->
    <Modal 
      v-if="showDeleteModal"
      :show="showDeleteModal" 
      title="Eliminar elementos" 
      @close="closeDeleteModal"
      @confirm="confirmDeleteItems"
      confirmText="Eliminar"
      confirmClass="danger"
      :loading="isProcessing"
    >
      <div class="confirm-delete">
        <div class="warning-icon">
          <i class="icon-alert-triangle"></i>
        </div>
        
        <p class="delete-warning">¡Atención! Está a punto de eliminar <strong>{{ selectedItems.length }}</strong> elemento(s) del inventario.</p>
        
        <div class="delete-note">
          <p>Esta acción no se puede deshacer. Los elementos eliminados no se podrán recuperar.</p>
        </div>
        
        <div class="confirmation-input">
          <label for="deleteConfirmation">Para confirmar, escriba "ELIMINAR":</label>
          <input 
            type="text" 
            id="deleteConfirmation" 
            v-model="deleteConfirmation" 
            class="form-control"
            :class="{ 'is-invalid': showDeleteConfirmationError }"
          >
          <div v-if="showDeleteConfirmationError" class="invalid-feedback">
            Debe escribir "ELIMINAR" para confirmar.
          </div>
        </div>
        
        <div class="items-summary">
          <p>Elementos a eliminar:</p>
          <ul class="items-list delete-list">
            <li v-for="(item, index) in itemsPreview" :key="index">
              {{ item.name }}
              <span v-if="item.serialNumber">(S/N: {{ item.serialNumber }})</span>
            </li>
            <li v-if="selectedItems.length > 5" class="more-items">
              Y {{ selectedItems.length - 5 }} elemento(s) más...
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import Modal from '@/components/common/Modal.vue';
import inventoryService from '@/services/inventory';
import clientService from '@/services/client';

export default {
  name: 'BatchActionBar',
  components: {
    Modal
  },
  props: {
    // Lista de elementos seleccionados
    selectedItems: {
      type: Array,
      required: true
    },
    
    // Si se debe mostrar la barra de acciones
    isVisible: {
      type: Boolean,
      default: false
    },
    
    // Si el usuario tiene permiso para eliminar
    hasDeletePermission: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      // Control de dropdowns
      openDropdown: null,
      
      // Búsqueda en dropdowns
      locationSearch: '',
      clientSearch: '',
      
      // Metadatos
      statuses: [],
      locations: [],
      clients: [],
      
      // Control de modales
      showStatusModal: false,
      showLocationModal: false,
      showClientModal: false,
      showRemoveAssignmentModal: false,
      showPrintModal: false,
      showExportModal: false,
      showDeleteModal: false,
      
      // Datos para acciones
      selectedStatus: '',
      selectedLocation: '',
      selectedClient: '',
      
      // Datos para movimiento
      moveReason: '',
      customMoveReason: '',
      moveNotes: '',
      
      // Datos para asignación
      installationDate: '',
      assignmentNotes: '',
      changeStatusOnAssignment: true,
      
      // Datos para remover asignación
      newStatusAfterRemoval: '',
      removalNotes: '',
      
      // Datos para impresión
      printType: 'qr',
      printFormat: 'pdf',
      labelSize: 'medium',
      customWidth: 50,
      customHeight: 30,
      includeCode: true,
      includeSerialNumber: true,
      includeName: true,
      printFields: {
        code: true,
        name: true,
        type: true,
        serialNumber: true,
        macAddress: false,
        location: true,
        status: true,
        specifications: false
      },
      printOrder: 'name',
      
      // Datos para exportación
      exportFormat: 'excel',
      exportColumns: {
        id: { label: 'ID', selected: true },
        code: { label: 'Código', selected: true },
        name: { label: 'Nombre', selected: true },
        category: { label: 'Categoría', selected: true },
        type: { label: 'Tipo', selected: true },
        brand: { label: 'Marca', selected: true },
        model: { label: 'Modelo', selected: true },
        serialNumber: { label: 'Número de serie', selected: true },
        macAddress: { label: 'MAC Address', selected: false },
        status: { label: 'Estado', selected: true },
        location: { label: 'Ubicación', selected: true },
        assignedClient: { label: 'Cliente asignado', selected: false },
        purchaseDate: { label: 'Fecha de compra', selected: false },
        cost: { label: 'Costo', selected: false },
        warrantyUntil: { label: 'Garantía hasta', selected: false },
        notes: { label: 'Notas', selected: false }
      },
      includeSpecifications: false,
      includeMovementHistory: false,
      
      // Datos para eliminación
      deleteConfirmation: '',
      showDeleteConfirmationError: false,
      
      // Estado de procesamiento
      isProcessing: false
    };
  },
  computed: {
    /**
     * Vista previa de los elementos seleccionados (máximo 5)
     */
    itemsPreview() {
      return this.selectedItems.slice(0, 5);
    },
    
    /**
     * Filtrar ubicaciones según búsqueda
     */
    filteredLocations() {
      if (!this.locationSearch) {
        return this.locations;
      }
      
      const search = this.locationSearch.toLowerCase();
      
      return this.locations.filter(location => 
        location.name.toLowerCase().includes(search)
      );
    },
    
    /**
     * Filtrar clientes según búsqueda
     */
    filteredClients() {
      if (!this.clientSearch) {
        return this.clients;
      }
      
      const search = this.clientSearch.toLowerCase();
      
      return this.clients.filter(client => 
        client.name.toLowerCase().includes(search) ||
        (client.code && client.code.toLowerCase().includes(search))
      );
    },
    
    /**
     * Estados que no son de asignación
     */
    nonAssignedStatuses() {
      return this.statuses.filter(status => 
        !status.id.toLowerCase().includes('assign') && 
        status.id !== 'assigned'
      );
    },
    
    /**
     * Advertencia para cambio de estado
     */
    statusChangeWarning() {
      // Aquí puedes agregar lógica para mostrar advertencias según el estado
      if (this.selectedStatus === 'damaged') {
        return 'El estado "Dañado" puede afectar a la disponibilidad de los elementos.';
      } else if (this.selectedStatus === 'maintenance') {
        return 'Los elementos en mantenimiento no estarán disponibles para asignación.';
      }
      
      return '';
    }
  },
  watch: {
    /**
     * Cerrar dropdown cuando cambia la visibilidad
     */
    isVisible(newValue) {
      if (!newValue) {
        this.openDropdown = null;
      }
    }
  },
  created() {
    // Cargar datos necesarios
    this.loadMetadata();
    
    // Inicializar fecha actual para instalación
    this.installationDate = this.formatDateForInput(new Date());
    
    // Escuchar clics fuera para cerrar dropdowns
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeDestroy() {
    // Limpiar event listener
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    /**
     * Cargar metadatos necesarios
     */
    async loadMetadata() {
      try {
        // Cargar estados, ubicaciones, clientes
        const [statuses, locations, clients] = await Promise.all([
          inventoryService.getStatuses(),
          inventoryService.getLocations(),
          clientService.getActiveClients()
        ]);
        
        this.statuses = statuses;
        this.locations = locations;
        this.clients = clients;
      } catch (error) {
        console.error('Error al cargar metadatos para acciones:', error);
        this.$emit('error', 'Error al cargar datos necesarios para acciones por lotes.');
      }
    },
    
    /**
     * Manejar clic fuera de los dropdowns
     */
    handleOutsideClick(event) {
      if (this.openDropdown) {
        // Verificar si el clic fue dentro del dropdown actual
        const dropdown = document.querySelector('.action-dropdown .dropdown-menu');
        
        if (dropdown && !dropdown.contains(event.target)) {
          // Verificar si el clic fue en el botón del dropdown
          const button = document.querySelector('.action-dropdown .btn-action');
          
          if (!button || !button.contains(event.target)) {
            this.openDropdown = null;
          }
        }
      }
    },
    
    /**
     * Alternar estado del dropdown
     */
    toggleDropdown(dropdown) {
      if (this.openDropdown === dropdown) {
        this.openDropdown = null;
      } else {
        this.openDropdown = dropdown;
      }
    },
    
    /**
     * Limpiar selección
     */
    clearSelection() {
      this.$emit('clear-selection');
    },
    
    /**
     * Iniciar cambio de estado
     */
    changeStatus(statusId) {
      this.selectedStatus = statusId;
      this.showStatusModal = true;
      this.openDropdown = null;
    },
    
    /**
     * Cerrar modal de cambio de estado
     */
    closeStatusModal() {
      this.showStatusModal = false;
      this.selectedStatus = '';
    },
    
    /**
     * Confirmar cambio de estado
     */
    async confirmStatusChange() {
      if (!this.selectedStatus) {
        return;
      }
      
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Realizar cambio de estado
        await inventoryService.updateItemsStatus(itemIds, this.selectedStatus);
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'status',
          message: `Se ha cambiado el estado de ${itemIds.length} elemento(s) a "${this.getStatusName(this.selectedStatus)}".`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeStatusModal();
      } catch (error) {
        console.error('Error al cambiar estado:', error);
        this.$emit('error', 'Error al cambiar el estado de los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Iniciar movimiento a ubicación
     */
    moveToLocation(locationId) {
      this.selectedLocation = locationId;
      this.showLocationModal = true;
      this.openDropdown = null;
    },
    
    /**
     * Cerrar modal de movimiento
     */
    closeLocationModal() {
      this.showLocationModal = false;
      this.selectedLocation = '';
      this.moveReason = '';
      this.customMoveReason = '';
      this.moveNotes = '';
    },
    
    /**
     * Confirmar movimiento
     */
    async confirmLocationMove() {
      if (!this.selectedLocation) {
        return;
      }
      
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Preparar datos para el movimiento
        const moveData = {
          toLocationId: this.selectedLocation,
          reason: this.moveReason === 'other' ? this.customMoveReason : this.moveReason,
          notes: this.moveNotes
        };
        
        // Realizar movimiento
        await inventoryService.moveItems(itemIds, moveData);
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'move',
          message: `Se ha movido ${itemIds.length} elemento(s) a "${this.getLocationName(this.selectedLocation)}".`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeLocationModal();
      } catch (error) {
        console.error('Error al mover elementos:', error);
        this.$emit('error', 'Error al mover los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Iniciar asignación a cliente
     */
    assignToClient(clientId) {
      this.selectedClient = clientId;
      this.showClientModal = true;
      this.openDropdown = null;
    },
    
    /**
     * Cerrar modal de asignación
     */
    closeClientModal() {
      this.showClientModal = false;
      this.selectedClient = '';
      this.installationDate = this.formatDateForInput(new Date());
      this.assignmentNotes = '';
      this.changeStatusOnAssignment = true;
    },
    
    /**
     * Confirmar asignación a cliente
     */
    async confirmClientAssignment() {
      if (!this.selectedClient) {
        return;
      }
      
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Preparar datos para la asignación
        const assignmentData = {
          clientId: this.selectedClient,
          installationDate: this.installationDate,
          notes: this.assignmentNotes,
          changeStatus: this.changeStatusOnAssignment
        };
        
        // Realizar asignación
        await inventoryService.assignItemsToClient(itemIds, assignmentData);
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'assign',
          message: `Se ha asignado ${itemIds.length} elemento(s) al cliente "${this.getClientName(this.selectedClient)}".`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeClientModal();
      } catch (error) {
        console.error('Error al asignar elementos:', error);
        this.$emit('error', 'Error al asignar los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Iniciar eliminación de asignación
     */
    removeAssignment() {
      this.showRemoveAssignmentModal = true;
      this.openDropdown = null;
    },
    
    /**
     * Cerrar modal de eliminación de asignación
     */
    closeRemoveAssignmentModal() {
      this.showRemoveAssignmentModal = false;
      this.newStatusAfterRemoval = '';
      this.removalNotes = '';
    },
    
    /**
     * Confirmar eliminación de asignación
     */
    async confirmRemoveAssignment() {
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Preparar datos para la eliminación de asignación
        const removalData = {
          newStatus: this.newStatusAfterRemoval || null,
          notes: this.removalNotes
        };
        
        // Realizar eliminación de asignación
        await inventoryService.removeItemsAssignment(itemIds, removalData);
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'unassign',
          message: `Se ha eliminado la asignación de ${itemIds.length} elemento(s).`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeRemoveAssignmentModal();
      } catch (error) {
        console.error('Error al eliminar asignación:', error);
        this.$emit('error', 'Error al eliminar la asignación de los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Iniciar impresión de etiquetas
     */
    printLabels() {
      this.showPrintModal = true;
    },
    
    /**
     * Cerrar modal de impresión
     */
    closePrintModal() {
      this.showPrintModal = false;
    },
    
    /**
     * Confirmar impresión
     */
    async confirmPrint() {
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Preparar opciones de impresión
        const printOptions = {
          type: this.printType,
          format: this.printFormat,
          labelSize: this.labelSize === 'custom' ? {
            width: this.customWidth,
            height: this.customHeight
          } : this.labelSize,
          includeCode: this.includeCode,
          includeSerialNumber: this.includeSerialNumber,
          includeName: this.includeName,
          fields: this.printFields,
          orderBy: this.printOrder
        };
        
        // Realizar impresión
        const printResult = await inventoryService.printLabels(itemIds, printOptions);
        
        // Descargar archivo generado
        if (printResult && printResult.fileUrl) {
          const link = document.createElement('a');
          link.href = printResult.fileUrl;
          link.download = printResult.fileName || `etiquetas-${new Date().toISOString().slice(0, 10)}.${this.printFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'print',
          message: `Se ha generado un archivo para imprimir ${itemIds.length} elemento(s).`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closePrintModal();
      } catch (error) {
        console.error('Error al generar impresión:', error);
        this.$emit('error', 'Error al generar la impresión. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Iniciar exportación de elementos
     */
    exportSelection() {
      this.showExportModal = true;
    },
    
    /**
     * Cerrar modal de exportación
     */
    closeExportModal() {
      this.showExportModal = false;
    },
    
    /**
     * Confirmar exportación
     */
    async confirmExport() {
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Obtener columnas seleccionadas
        const selectedColumns = Object.entries(this.exportColumns)
          .filter(([, column]) => column.selected)
          .map(([key]) => key);
        
        // Preparar opciones de exportación
        const exportOptions = {
          format: this.exportFormat,
          columns: selectedColumns,
          includeSpecifications: this.includeSpecifications,
          includeMovementHistory: this.includeMovementHistory
        };
        
        // Realizar exportación
        const exportResult = await inventoryService.exportItems(itemIds, exportOptions);
        
        // Descargar archivo generado
        if (exportResult && exportResult.fileUrl) {
          const link = document.createElement('a');
          link.href = exportResult.fileUrl;
          link.download = exportResult.fileName || `inventario-${new Date().toISOString().slice(0, 10)}.${this.exportFormat}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'export',
          message: `Se ha exportado ${itemIds.length} elemento(s) en formato ${this.exportFormat.toUpperCase()}.`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeExportModal();
      } catch (error) {
        console.error('Error al exportar elementos:', error);
        this.$emit('error', 'Error al exportar los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
    },
    
    /**
     * Seleccionar todas las columnas para exportación
     */
    selectAllColumns() {
      Object.keys(this.exportColumns).forEach(key => {
        this.exportColumns[key].selected = true;
      });
    },
    
    /**
     * Deseleccionar todas las columnas para exportación
     */
    deselectAllColumns() {
      Object.keys(this.exportColumns).forEach(key => {
        this.exportColumns[key].selected = false;
      });
    },
    
    /**
     * Iniciar confirmación de eliminación
     */
    confirmDelete() {
      this.showDeleteModal = true;
      this.deleteConfirmation = '';
      this.showDeleteConfirmationError = false;
    },
    
    /**
     * Cerrar modal de eliminación
     */
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.deleteConfirmation = '';
      this.showDeleteConfirmationError = false;
    },
    
    /**
     * Confirmar eliminación de elementos
     */
    async confirmDeleteItems() {
      // Verificar confirmación
      if (this.deleteConfirmation !== 'ELIMINAR') {
        this.showDeleteConfirmationError = true;
        return;
      }
      
      this.isProcessing = true;
      
      try {
        // Obtener IDs de elementos seleccionados
        const itemIds = this.selectedItems.map(item => item.id);
        
        // Realizar eliminación
        await inventoryService.deleteItems(itemIds);
        
        // Notificar éxito
        this.$emit('action-success', {
          type: 'delete',
          message: `Se ha eliminado ${itemIds.length} elemento(s) del inventario.`,
          affectedItems: itemIds
        });
        
        // Cerrar modal
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error al eliminar elementos:', error);
        this.$emit('error', 'Error al eliminar los elementos. Por favor, intente nuevamente.');
      } finally {
        this.isProcessing = false;
      }
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
    },
    
    /**
     * Formatear fecha para input type="date"
     */
    formatDateForInput(dateValue) {
      if (!dateValue) return '';
      
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Formato YYYY-MM-DD
      return date.toISOString().split('T')[0];
    }
  }
};
</script>

<style scoped>
.batch-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  z-index: 1000;
}

.batch-action-bar.visible {
  transform: translateY(0);
}

.action-bar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--primary-color, #1976d2);
  color: white;
  padding: 12px 20px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

/* Resumen de selección */
.selection-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selected-count {
  font-size: 15px;
  font-weight: 500;
}

.btn-link {
  background: none;
  border: none;
  color: white;
  text-decoration: underline;
  padding: 0;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.9;
}

.btn-link:hover {
  opacity: 1;
}

/* Botones de acciones */
.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-action:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.btn-action.danger {
  background-color: var(--error-color, #f44336);
}

.btn-action.danger:hover {
  background-color: var(--error-dark, #d32f2f);
}

/* Dropdowns */
.action-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  bottom: 40px;
  right: 0;
  min-width: 200px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  animation: dropdownFadeIn 0.2s ease;
}

.dropdown-search {
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.dropdown-items-container {
  overflow-y: auto;
  max-height: 300px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  width: 100%;
  cursor: pointer;
  color: var(--text-primary, #333);
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background-color: var(--bg-secondary, #f5f5f5);
}

.dropdown-item .status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
}

.dropdown-item .remove-assignment {
  color: var(--error-color, #f44336);
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

/* Estilos para modales */
.confirm-status-change,
.confirm-location-move,
.confirm-client-assignment,
.confirm-remove-assignment,
.print-options,
.export-options,
.confirm-delete {
  padding: 16px 0;
}

.status-selection,
.location-selection,
.client-selection {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

.selected-status,
.selected-location,
.selected-client {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
}

.warning-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin: 16px 0;
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ff9800);
  border-radius: 6px;
  font-size: 14px;
}

.warning-note i {
  font-size: 18px;
}

.additional-options {
  margin: 16px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  background-color: var(--bg-primary, white);
}

.form-control:focus {
  border-color: var(--primary-color, #1976d2);
  outline: none;
}

.form-control.is-invalid {
  border-color: var(--error-color, #f44336);
}

.invalid-feedback {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--error-color, #f44336);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.checkbox-option input[type="checkbox"] {
  margin: 0;
}

/* Estilos para lista de elementos */
.items-summary {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.items-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 0 0 0 20px;
  margin: 8px 0;
  font-size: 14px;
}

.items-list li {
  margin-bottom: 8px;
}

.items-list li span {
  color: var(--text-secondary, #666);
  font-size: 13px;
}

.more-items {
  font-style: italic;
  color: var(--text-secondary, #666);
}

.delete-list li {
  color: var(--error-color, #f44336);
}

/* Estilos para opciones de impresión */
.option-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.option-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  cursor: pointer;
  flex: 1;
  transition: all 0.2s ease;
}

.option-button:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.option-button.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.option-button i {
  font-size: 24px;
  color: var(--text-primary, #333);
}

.option-button.active i {
  color: var(--primary-color, #1976d2);
}

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

/* Estilos para confirmación de eliminación */
.warning-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.warning-icon i {
  font-size: 48px;
  color: var(--error-color, #f44336);
}

.delete-warning {
  text-align: center;
  font-size: 16px;
  margin-bottom: 16px;
}

.delete-note {
  text-align: center;
  background-color: var(--error-light, #ffebee);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 24px;
  color: var(--error-color, #f44336);
}

.confirmation-input {
  margin-bottom: 24px;
}

.select-all-option {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.select-all-option .btn-link {
  color: var(--primary-color, #1976d2);
}

/* Animaciones */
@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .action-bar-container {
    flex-direction: column;
    gap: 16px;
    padding: 12px;
  }
  
  .selection-summary {
    width: 100%;
    justify-content: space-between;
  }
  
  .action-buttons {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  
  .btn-action {
    white-space: nowrap;
  }
  
  .dropdown-menu {
    left: 0;
    right: auto;
  }
}
</style>
