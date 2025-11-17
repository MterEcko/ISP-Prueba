<template>
  <div class="export-form">
    <div class="export-header">
      <div class="export-icon">
        <i class="icon-download"></i>
      </div>
      <div class="export-title">
        <h3>Exportar Inventario</h3>
        <p v-if="hasSelectedItems && selectedItems.length > 0">
          {{ selectedItems.length }} elementos seleccionados para exportación
        </p>
        <p v-else>
          Configura los parámetros de exportación
        </p>
      </div>
    </div>
    
    <div class="export-options">
      <!-- Selección de elementos a exportar -->
      <div class="option-section">
        <h4>Elementos a exportar</h4>
        <div class="radio-group">
          <label class="radio-label">
            <input 
              type="radio" 
              name="exportScope" 
              value="all" 
              v-model="exportConfig.scope"
              :disabled="exportInProgress"
            />
            <span>Exportar todo el inventario ({{ totalItems }} elementos)</span>
          </label>
          
          <label class="radio-label">
            <input 
              type="radio" 
              name="exportScope" 
              value="filtered" 
              v-model="exportConfig.scope"
              :disabled="!hasFilters || exportInProgress"
            />
            <span>Exportar resultados filtrados actuales ({{ filteredCount }} elementos)</span>
          </label>
          
          <label class="radio-label">
            <input 
              type="radio" 
              name="exportScope" 
              value="selected" 
              v-model="exportConfig.scope"
              :disabled="!hasSelectedItems || exportInProgress"
            />
            <span>Exportar solo elementos seleccionados ({{ selectedItemCount }} elementos)</span>
          </label>
        </div>
      </div>
      
      <!-- Formato de archivo -->
      <div class="option-section">
        <h4>Formato de archivo</h4>
        <div class="format-options">
          <button 
            v-for="format in availableFormats" 
            :key="format.value"
            :class="['format-button', { active: exportConfig.format === format.value }]"
            @click="exportConfig.format = format.value"
            :disabled="exportInProgress"
          >
            <i :class="format.icon"></i>
            <span>{{ format.label }}</span>
          </button>
        </div>
      </div>
      
      <!-- Campos a incluir -->
      <div class="option-section">
        <div class="section-header">
          <h4>Campos a incluir</h4>
          <div class="field-actions">
            <button 
              class="btn-link" 
              @click="selectAllFields"
              :disabled="exportInProgress"
            >
              Seleccionar todos
            </button>
            <button 
              class="btn-link" 
              @click="deselectAllFields"
              :disabled="exportInProgress"
            >
              Deseleccionar todos
            </button>
          </div>
        </div>
        
        <div class="fields-grid">
          <label 
            v-for="field in availableFields" 
            :key="field.id"
            class="checkbox-label"
          >
            <input 
              type="checkbox" 
              v-model="exportConfig.fields" 
              :value="field.id"
              :disabled="exportInProgress || field.required"
            />
            <span>
              {{ field.label }}
              <span v-if="field.required" class="required-badge">Requerido</span>
            </span>
          </label>
        </div>
      </div>
      
      <!-- Opciones adicionales -->
      <div class="option-section">
        <h4>Opciones adicionales</h4>
        <div class="additional-options">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="exportConfig.includeHeaders"
              :disabled="exportInProgress"
            />
            <span>Incluir encabezados de columna</span>
          </label>
          
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="exportConfig.formatDates"
              :disabled="exportInProgress"
            />
            <span>Formatear fechas (DD/MM/YYYY)</span>
          </label>
          
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="exportConfig.translateLabels"
              :disabled="exportInProgress"
            />
            <span>Traducir etiquetas a español</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Notificación de progreso -->
    <div v-if="exportInProgress" class="export-progress">
      <div class="progress-indicator">
        <div class="spinner"></div>
        <span>Preparando exportación...</span>
      </div>
    </div>
    
    <!-- Botones de acción -->
    <div class="export-actions">
      <button 
        class="btn-outline" 
        @click="cancelExport"
        :disabled="exportInProgress"
      >
        Cancelar
      </button>
      
      <button 
        class="btn-primary" 
        @click="startExport"
        :disabled="!canExport || exportInProgress"
      >
        <i class="icon-download"></i> Exportar
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExportForm',
  props: {
    /**
     * Array de IDs de elementos seleccionados para exportar
     */
    selectedItems: {
      type: Array,
      default: () => []
    },
    /**
     * Número total de elementos en el inventario
     */
    totalItems: {
      type: Number,
      default: 0
    },
    /**
     * Número de elementos después de aplicar filtros
     */
    filteredCount: {
      type: Number,
      default: 0
    },
    /**
     * Si hay filtros aplicados actualmente
     */
    hasFilters: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      // Configuración de exportación
      exportConfig: {
        scope: 'all', // 'all', 'filtered', 'selected'
        format: 'xlsx', // 'xlsx', 'csv', 'pdf'
        fields: [
          'id', 'name', 'serialNumber', 'brand', 'model', 'status', 
          'category', 'location', 'assignedTo'
        ],
        includeHeaders: true,
        formatDates: true,
        translateLabels: true
      },
      
      // Estado de exportación
      exportInProgress: false,
      
      // Formatos disponibles
      availableFormats: [
        { value: 'xlsx', label: 'Excel', icon: 'icon-file-spreadsheet' },
        { value: 'csv', label: 'CSV', icon: 'icon-file-text' },
        { value: 'pdf', label: 'PDF', icon: 'icon-file-pdf' }
      ],
      
      // Campos disponibles para exportar
      availableFields: [
        { id: 'id', label: 'ID', required: true },
        { id: 'name', label: 'Nombre', required: true },
        { id: 'serialNumber', label: 'Número de Serie', required: true },
        { id: 'brand', label: 'Marca', required: false },
        { id: 'model', label: 'Modelo', required: false },
        { id: 'status', label: 'Estado', required: false },
        { id: 'category', label: 'Categoría', required: false },
        { id: 'location', label: 'Ubicación', required: false },
        { id: 'assignedTo', label: 'Asignado a', required: false },
        { id: 'macAddress', label: 'Dirección MAC', required: false },
        { id: 'purchaseDate', label: 'Fecha de Compra', required: false },
        { id: 'warrantyExpiration', label: 'Fecha Fin Garantía', required: false },
        { id: 'cost', label: 'Costo', required: false },
        { id: 'supplier', label: 'Proveedor', required: false },
        { id: 'notes', label: 'Notas', required: false },
        { id: 'createdAt', label: 'Fecha Creación', required: false },
        { id: 'updatedAt', label: 'Última Actualización', required: false }
      ]
    };
  },
  computed: {
    /**
     * Verificar si hay elementos seleccionados
     */
    hasSelectedItems() {
      return this.selectedItems && this.selectedItems.length > 0;
    },
    
    /**
     * Número de elementos seleccionados
     */
    selectedItemCount() {
      return this.hasSelectedItems ? this.selectedItems.length : 0;
    },
    
    /**
     * Verificar si se puede iniciar la exportación
     */
    canExport() {
      // Validar que haya al menos un campo seleccionado
      if (this.exportConfig.fields.length === 0) {
        return false;
      }
      
      // Validar que haya elementos para exportar según el scope
      if (this.exportConfig.scope === 'all' && this.totalItems === 0) {
        return false;
      }
      
      if (this.exportConfig.scope === 'filtered' && this.filteredCount === 0) {
        return false;
      }
      
      if (this.exportConfig.scope === 'selected' && this.selectedItemCount === 0) {
        return false;
      }
      
      return true;
    }
  },
  created() {
    // Establecer scope inicial basado en props
    if (this.hasSelectedItems) {
      this.exportConfig.scope = 'selected';
    } else if (this.hasFilters) {
      this.exportConfig.scope = 'filtered';
    } else {
      this.exportConfig.scope = 'all';
    }
    
    // Seleccionar todos los campos por defecto
    this.selectAllFields();
  },
  methods: {
    /**
     * Seleccionar todos los campos
     */
    selectAllFields() {
      this.exportConfig.fields = this.availableFields.map(field => field.id);
    },
    
    /**
     * Deseleccionar todos los campos (excepto los requeridos)
     */
    deselectAllFields() {
      this.exportConfig.fields = this.availableFields
        .filter(field => field.required)
        .map(field => field.id);
    },
    
    /**
     * Iniciar exportación
     */
    startExport() {
      // Validar configuración
      if (!this.canExport) {
        return;
      }
      
      this.exportInProgress = true;
      
      // Preparar parámetros de exportación
      const exportParams = {
        scope: this.exportConfig.scope,
        format: this.exportConfig.format,
        fields: [...this.exportConfig.fields],
        options: {
          includeHeaders: this.exportConfig.includeHeaders,
          formatDates: this.exportConfig.formatDates,
          translateLabels: this.exportConfig.translateLabels
        },
        filters: this.hasFilters && this.exportConfig.scope === 'filtered' ? true : null,
        selectedItems: this.exportConfig.scope === 'selected' ? this.selectedItems : null
      };
      
      // Emitir evento para que el componente padre maneje la exportación
      this.$emit('export-start', exportParams);
    },
    
    /**
     * Recibir evento de finalización de exportación
     * Esta función sería llamada por el componente padre cuando la exportación esté lista
     */
    exportCompleted(result) {
      this.exportInProgress = false;
      this.$emit('export-success', result);
    },
    
    /**
     * Cancelar exportación
     */
    cancelExport() {
      if (this.exportInProgress) {
        // Emitir evento para que el componente padre cancele la exportación
        this.$emit('export-cancel');
      } else {
        this.$emit('export-close');
      }
      
      this.exportInProgress = false;
    }
  }
};
</script>

<style scoped>
.export-form {
  padding: 20px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  max-width: 800px;
  margin: 0 auto;
}

/* Encabezado */
.export-header {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.export-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: var(--primary-lightest, #e3f2fd);
  color: var(--primary-color, #1976d2);
  border-radius: 50%;
  font-size: 24px;
}

.export-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.export-title p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

/* Opciones de exportación */
.export-options {
  margin-bottom: 24px;
}

.option-section {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.option-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  color: var(--text-primary, #333);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
}

.field-actions {
  display: flex;
  gap: 12px;
}

/* Radio buttons */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-label input[type="radio"] {
  width: 16px;
  height: 16px;
}

.radio-label input[type="radio"]:disabled + span {
  color: var(--disabled-text, #aaa);
  cursor: not-allowed;
}

/* Formatos de archivo */
.format-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.format-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--bg-primary, white);
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100px;
}

.format-button i {
  font-size: 24px;
  color: var(--text-secondary, #666);
}

.format-button span {
  font-size: 13px;
  font-weight: 500;
}

.format-button:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.format-button.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.format-button.active i {
  color: var(--primary-color, #1976d2);
}

.format-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Grid de campos */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.checkbox-label input[type="checkbox"]:disabled + span {
  color: var(--disabled-text, #aaa);
  cursor: not-allowed;
}

.required-badge {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #1976d2);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  margin-left: 6px;
}

/* Opciones adicionales */
.additional-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Enlaces */
.btn-link {
  background: transparent;
  border: none;
  color: var(--primary-color, #1976d2);
  padding: 0;
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
}

.btn-link:hover:not(:disabled) {
  color: var(--primary-dark, #1565c0);
}

.btn-link:disabled {
  color: var(--disabled-text, #aaa);
  cursor: not-allowed;
}

/* Progreso de exportación */
.export-progress {
  margin-bottom: 24px;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--primary-lightest, #e3f2fd);
  border-radius: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--primary-lighter, #bbdefb);
  border-top: 2px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  to {
    transform: rotate(360deg);
  }
}

/* Botones de acción */
.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Botones estándar */
.btn-primary,
.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
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
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-primary:disabled,
.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .export-form {
    padding: 16px;
  }
  
  .fields-grid {
    grid-template-columns: 1fr;
  }
  
  .format-options {
    justify-content: center;
  }
  
  .export-actions {
    flex-direction: column-reverse;
    gap: 8px;
  }
  
  .btn-primary,
  .btn-outline {
    width: 100%;
    justify-content: center;
  }
}
</style>