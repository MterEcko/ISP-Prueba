<template>
  <div class="inventory-reports">
    <div class="reports-header">
      <h2 class="reports-title">Reportes de Inventario</h2>
      <div class="reports-description">
        Genera reportes personalizados con información detallada del inventario
      </div>
    </div>
    
    <div class="reports-container">
      <!-- Panel de configuración de reportes -->
      <div class="report-config-panel">
        <div class="panel-header">
          <h3>Configuración del Reporte</h3>
        </div>
        
        <div class="panel-body">
          <!-- Tipo de reporte -->
          <div class="config-section">
            <h4>Tipo de Reporte</h4>
            <div class="report-types">
              <div 
                v-for="type in reportTypes" 
                :key="type.id"
                class="report-type-card"
                :class="{ active: reportConfig.type === type.id }"
                @click="selectReportType(type.id)"
              >
                <div class="card-icon">
                  <i :class="type.icon"></i>
                </div>
                <div class="card-content">
                  <div class="card-title">{{ type.name }}</div>
                  <div class="card-description">{{ type.description }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Filtros del reporte -->
          <div class="config-section">
            <h4>Filtros</h4>
            
            <div class="filter-grid">
              <!-- Categoría -->
              <div class="filter-item">
                <label>Categoría:</label>
                <select v-model="reportConfig.filters.category">
                  <option value="">Todas las categorías</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
              
              <!-- Estado -->
              <div class="filter-item">
                <label>Estado:</label>
                <select v-model="reportConfig.filters.status">
                  <option value="">Todos los estados</option>
                  <option v-for="status in statuses" :key="status.id" :value="status.id">
                    {{ status.name }}
                  </option>
                </select>
              </div>
              
              <!-- Ubicación -->
              <div class="filter-item">
                <label>Ubicación:</label>
                <select v-model="reportConfig.filters.location">
                  <option value="">Todas las ubicaciones</option>
                  <option v-for="location in locations" :key="location.id" :value="location.id">
                    {{ location.name }}
                  </option>
                </select>
              </div>
              
              <!-- Asignado a -->
              <div class="filter-item">
                <label>Asignado a:</label>
                <select v-model="reportConfig.filters.assignedTo">
                  <option value="">Cualquier asignación</option>
                  <option value="unassigned">Sin asignar</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.name }}
                  </option>
                </select>
              </div>
              
              <!-- Fecha de compra -->
              <div class="filter-item date-filter" v-if="showPurchaseFilter">
                <label>Fecha de compra:</label>
                <div class="date-range">
                  <div class="date-input">
                    <label>Desde:</label>
                    <input type="date" v-model="reportConfig.filters.purchaseDateFrom" />
                  </div>
                  <div class="date-input">
                    <label>Hasta:</label>
                    <input type="date" v-model="reportConfig.filters.purchaseDateTo" />
                  </div>
                </div>
              </div>
              
              <!-- Valor/Costo -->
              <div class="filter-item" v-if="showValueFilter">
                <label>Valor:</label>
                <div class="range-input">
                  <div class="range-field">
                    <label>Mínimo:</label>
                    <input 
                      type="number" 
                      v-model="reportConfig.filters.valueMin" 
                      placeholder="0.00" 
                      min="0"
                      step="100"
                    />
                  </div>
                  <div class="range-field">
                    <label>Máximo:</label>
                    <input 
                      type="number" 
                      v-model="reportConfig.filters.valueMax" 
                      placeholder="Máximo" 
                      min="0"
                      step="100"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Filtro para reportes de movimientos -->
              <div class="filter-item" v-if="reportConfig.type === 'movements'">
                <label>Tipo de movimiento:</label>
                <select v-model="reportConfig.filters.movementType">
                  <option value="">Todos los movimientos</option>
                  <option value="location">Cambio de ubicación</option>
                  <option value="status">Cambio de estado</option>
                  <option value="assignment">Asignación</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>
              </div>
              
              <!-- Filtro para alertas -->
              <div class="filter-item" v-if="reportConfig.type === 'alerts'">
                <label>Nivel de alerta:</label>
                <select v-model="reportConfig.filters.alertLevel">
                  <option value="">Todos los niveles</option>
                  <option value="critical">Crítico</option>
                  <option value="warning">Advertencia</option>
                  <option value="info">Información</option>
                </select>
              </div>
              
              <!-- Limpiar filtros -->
              <div class="filter-actions">
                <button class="btn-link" @click="clearFilters">
                  <i class="icon-x"></i> Limpiar filtros
                </button>
              </div>
            </div>
          </div>
          
          <!-- Campos a incluir -->
          <div class="config-section">
            <h4>Campos a incluir</h4>
            
            <div class="fields-grid">
              <label 
                v-for="field in availableFields" 
                :key="field.id"
                class="checkbox-label"
                :class="{ 'disabled': isFieldRequired(field.id) }"
              >
                <input 
                  type="checkbox" 
                  v-model="reportConfig.fields" 
                  :value="field.id"
                  :disabled="isFieldRequired(field.id)"
                />
                <span>
                  {{ field.label }}
                  <span v-if="isFieldRequired(field.id)" class="required-badge">Obligatorio</span>
                </span>
              </label>
            </div>
            
            <div class="fields-actions">
              <button class="btn-link" @click="selectAllFields">Seleccionar todos</button>
              <button class="btn-link" @click="deselectOptionalFields">Deseleccionar opcionales</button>
            </div>
          </div>
          
          <!-- Opciones de salida -->
          <div class="config-section">
            <h4>Opciones de salida</h4>
            
            <div class="output-options">
              <!-- Formato de salida -->
              <div class="option-group">
                <label>Formato:</label>
                <div class="format-buttons">
                  <button 
                    v-for="format in outputFormats" 
                    :key="format.id"
                    :class="['format-button', { active: reportConfig.outputFormat === format.id }]"
                    @click="reportConfig.outputFormat = format.id"
                  >
                    <i :class="format.icon"></i>
                    <span>{{ format.name }}</span>
                  </button>
                </div>
              </div>
              
              <!-- Opciones de agrupación -->
              <div class="option-group" v-if="showGroupingOption">
                <label>Agrupar por:</label>
                <select v-model="reportConfig.groupBy">
                  <option value="">Sin agrupación</option>
                  <option value="category">Categoría</option>
                  <option value="status">Estado</option>
                  <option value="location">Ubicación</option>
                  <option value="assignedTo">Asignado a</option>
                </select>
              </div>
              
              <!-- Opciones de ordenamiento -->
              <div class="option-group">
                <label>Ordenar por:</label>
                <div class="sort-config">
                  <select v-model="reportConfig.sortField">
                    <option v-for="field in sortableFields" :key="field.id" :value="field.id">
                      {{ field.label }}
                    </option>
                  </select>
                  <button 
                    class="btn-sort-direction" 
                    @click="toggleSortDirection"
                    :title="reportConfig.sortDirection === 'asc' ? 'Ascendente' : 'Descendente'"
                  >
                    <i :class="reportConfig.sortDirection === 'asc' ? 'icon-arrow-up' : 'icon-arrow-down'"></i>
                  </button>
                </div>
              </div>
              
              <!-- Opciones adicionales -->
              <div class="option-group checkboxes">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="reportConfig.includeCharts" />
                  <span>Incluir gráficos</span>
                </label>
                
                <label class="checkbox-label">
                  <input type="checkbox" v-model="reportConfig.includeTotals" />
                  <span>Incluir totales y subtotales</span>
                </label>
                
                <label class="checkbox-label" v-if="reportConfig.outputFormat === 'pdf'">
                  <input type="checkbox" v-model="reportConfig.landscapeMode" />
                  <span>Orientación horizontal</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Panel de vista previa del reporte -->
      <div class="report-preview-panel">
        <div class="panel-header">
          <h3>Vista Previa</h3>
        </div>
        
        <div class="panel-body">
          <!-- Estado de carga -->
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Generando vista previa...</p>
          </div>
          
          <!-- Vista previa -->
          <div v-else-if="hasPreviewData" class="preview-container">
            <div class="preview-header">
              <h3 class="preview-title">{{ getReportTitle() }}</h3>
              <div class="preview-meta">
                <div class="preview-date">Generado: {{ getCurrentDate() }}</div>
                <div class="preview-filter" v-if="hasActiveFilters">
                  <i class="icon-filter"></i> Filtros activos
                </div>
              </div>
            </div>
            
            <!-- Vista previa de tabla -->
            <div class="preview-table-container">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th v-for="field in selectedPreviewFields" :key="field.id">
                      {{ field.label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in previewData" :key="index">
                    <td v-for="field in selectedPreviewFields" :key="`${index}-${field.id}`">
                      {{ getFieldValue(item, field.id) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Vista previa de gráficos -->
            <div v-if="reportConfig.includeCharts" class="preview-charts">
              <div class="chart-placeholder">
                <i class="icon-bar-chart"></i>
                <span>Vista previa de gráficos</span>
              </div>
            </div>
            
            <!-- Información de paginación -->
            <div class="preview-footer">
              <div class="preview-pagination">
                Mostrando {{ Math.min(5, previewData.length) }} de {{ totalItems }} elementos
              </div>
            </div>
          </div>
          
          <!-- Estado vacío -->
          <div v-else class="empty-state">
            <div class="empty-icon">
              <i class="icon-file-text"></i>
            </div>
            <p class="empty-title">Vista previa no disponible</p>
            <p class="empty-description">
              Configura el reporte y haz clic en "Generar vista previa" para visualizar el resultado.
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Acciones de reporte -->
    <div class="reports-actions">
      <button 
        class="btn-secondary"
        @click="generatePreview"
        :disabled="loading"
      >
        <i class="icon-eye"></i> Generar vista previa
      </button>
      
      <button 
        class="btn-primary"
        @click="generateReport"
        :disabled="loading || !hasPreviewData"
      >
        <span v-if="loading" class="loading-spinner"></span>
        <i v-else class="icon-file-text"></i> Generar Reporte
      </button>
    </div>
    
    <!-- Historial de reportes generados recientemente -->
    <div v-if="recentReports.length > 0" class="recent-reports">
      <h3>Reportes generados recientemente</h3>
      
      <div class="recent-reports-list">
        <div 
          v-for="(report, index) in recentReports" 
          :key="index"
          class="recent-report-card"
        >
          <div class="report-card-icon">
            <i :class="getReportFormatIcon(report.format)"></i>
          </div>
          <div class="report-card-content">
            <div class="report-card-title">{{ report.title }}</div>
            <div class="report-card-meta">
              {{ formatDate(report.date) }} · {{ report.format.toUpperCase() }}
            </div>
          </div>
          <div class="report-card-actions">
            <button class="btn-icon" @click="downloadReport(report)" title="Descargar reporte">
              <i class="icon-download"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted } from 'vue';
import { formatDate } from '@/utils/formatters';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default {
  name: 'InventoryReports',
  setup() {
    // Estado del componente
    const loading = ref(false);
    const previewData = ref([]);
    const totalItems = ref(0);
    
    // Configuración del reporte
    const reportConfig = reactive({
      type: 'inventory',
      filters: {
        category: '',
        status: '',
        location: '',
        assignedTo: '',
        purchaseDateFrom: '',
        purchaseDateTo: '',
        valueMin: '',
        valueMax: '',
        movementType: '',
        alertLevel: ''
      },
      fields: [
        'id', 'name', 'serialNumber', 'category', 'status', 
        'location', 'brand', 'model', 'purchaseDate', 'value'
      ],
      outputFormat: 'xlsx',
      groupBy: '',
      sortField: 'name',
      sortDirection: 'asc',
      includeCharts: true,
      includeTotals: true,
      landscapeMode: false
    });
    
    // Reportes recientes
    const recentReports = ref([
      {
        id: 1,
        title: 'Inventario general - Septiembre 2025',
        date: '2025-09-15T10:30:00',
        format: 'xlsx',
        url: '#'
      },
      {
        id: 2,
        title: 'Movimientos de equipos - Agosto 2025',
        date: '2025-08-28T14:15:00',
        format: 'pdf',
        url: '#'
      },
      {
        id: 3,
        title: 'Reporte de valor por categoría',
        date: '2025-08-10T09:45:00',
        format: 'pdf',
        url: '#'
      }
    ]);
    
    // Datos de ejemplo para selects
    const categories = ref([
      { id: 'network', name: 'Equipos de Red' },
      { id: 'computer', name: 'Computadoras' },
      { id: 'telecom', name: 'Telecomunicaciones' },
      { id: 'office', name: 'Equipos de Oficina' },
      { id: 'tools', name: 'Herramientas' }
    ]);
    
    const statuses = ref([
      { id: 'active', name: 'Activo' },
      { id: 'maintenance', name: 'En Mantenimiento' },
      { id: 'broken', name: 'Defectuoso' },
      { id: 'storage', name: 'En Almacén' },
      { id: 'retired', name: 'Retirado' }
    ]);
    
    const locations = ref([
      { id: 'headquarters', name: 'Oficina Central' },
      { id: 'warehouse', name: 'Almacén Principal' },
      { id: 'north-tower', name: 'Torre Norte' },
      { id: 'south-tower', name: 'Torre Sur' },
      { id: 'client-site', name: 'Sitio Cliente' }
    ]);
    
    const users = ref([
      { id: 'user1', name: 'Carlos Mendez' },
      { id: 'user2', name: 'María López' },
      { id: 'user3', name: 'Jorge Suárez' },
      { id: 'user4', name: 'Ana Castro' },
      { id: 'user5', name: 'Roberto Díaz' }
    ]);
    
    // Tipos de reportes disponibles
    const reportTypes = [
      {
        id: 'inventory',
        name: 'Inventario General',
        description: 'Lista completa del inventario con información detallada de cada elemento',
        icon: 'icon-list'
      },
      {
        id: 'value',
        name: 'Valor del Inventario',
        description: 'Reporte financiero con valoración actual de los activos y depreciación',
        icon: 'icon-dollar-sign'
      },
      {
        id: 'movements',
        name: 'Movimientos',
        description: 'Historial de cambios de ubicación, estado y asignaciones',
        icon: 'icon-activity'
      },
      {
        id: 'alerts',
        name: 'Alertas',
        description: 'Equipos con alertas de stock bajo, garantía próxima a vencer o mantenimiento pendiente',
        icon: 'icon-alert-triangle'
      }
    ];
    
    // Formatos de salida disponibles
    const outputFormats = [
      {
        id: 'xlsx',
        name: 'Excel',
        icon: 'icon-file-spreadsheet'
      },
      {
        id: 'pdf',
        name: 'PDF',
        icon: 'icon-file-pdf'
      },
      {
        id: 'csv',
        name: 'CSV',
        icon: 'icon-file-text'
      }
    ];
    
    // Campos disponibles para el reporte
    const availableFields = [
      { id: 'id', label: 'ID', required: ['inventory', 'value', 'movements', 'alerts'] },
      { id: 'name', label: 'Nombre', required: ['inventory', 'value', 'movements', 'alerts'] },
      { id: 'serialNumber', label: 'Número de Serie', required: ['inventory', 'value'] },
      { id: 'category', label: 'Categoría', required: [] },
      { id: 'status', label: 'Estado', required: [] },
      { id: 'location', label: 'Ubicación', required: [] },
      { id: 'brand', label: 'Marca', required: [] },
      { id: 'model', label: 'Modelo', required: [] },
      { id: 'purchaseDate', label: 'Fecha de Compra', required: ['value'] },
      { id: 'value', label: 'Valor', required: ['value'] },
      { id: 'currentValue', label: 'Valor Actual', required: [] },
      { id: 'depreciation', label: 'Depreciación', required: [] },
      { id: 'assignedTo', label: 'Asignado a', required: [] },
      { id: 'supplier', label: 'Proveedor', required: [] },
      { id: 'warrantyExpiration', label: 'Fin de Garantía', required: [] },
      { id: 'lastMaintenance', label: 'Último Mantenimiento', required: [] },
      { id: 'nextMaintenance', label: 'Próximo Mantenimiento', required: [] },
      { id: 'movementType', label: 'Tipo de Movimiento', required: ['movements'] },
      { id: 'movementDate', label: 'Fecha de Movimiento', required: ['movements'] },
      { id: 'movementUser', label: 'Usuario', required: [] },
      { id: 'movementNotes', label: 'Notas', required: [] },
      { id: 'alertType', label: 'Tipo de Alerta', required: ['alerts'] },
      { id: 'alertLevel', label: 'Nivel de Alerta', required: ['alerts'] },
      { id: 'alertDate', label: 'Fecha de Alerta', required: ['alerts'] },
      { id: 'createdAt', label: 'Fecha de Creación', required: [] },
      { id: 'updatedAt', label: 'Última Actualización', required: [] }
    ];
    
    // Campos ordenables
    const sortableFields = computed(() => {
      return availableFields.filter(field => {
        // Filtrar campos según el tipo de reporte
        if (reportConfig.type === 'inventory') {
          return ['id', 'name', 'serialNumber', 'category', 'status', 'location', 'brand', 'model', 'purchaseDate', 'value'].includes(field.id);
        } else if (reportConfig.type === 'value') {
          return ['id', 'name', 'category', 'purchaseDate', 'value', 'currentValue', 'depreciation'].includes(field.id);
        } else if (reportConfig.type === 'movements') {
          return ['id', 'name', 'movementDate', 'movementType'].includes(field.id);
        } else if (reportConfig.type === 'alerts') {
          return ['id', 'name', 'alertDate', 'alertType', 'alertLevel'].includes(field.id);
        }
        return false;
      });
    });
    
    // Campos seleccionados para la vista previa
    const selectedPreviewFields = computed(() => {
      return availableFields.filter(field => 
        reportConfig.fields.includes(field.id) && 
        isFieldRelevantForReportType(field.id, reportConfig.type)
      ).slice(0, 6); // Limitar a 6 campos para la vista previa
    });
    
    // Computed properties
    const hasPreviewData = computed(() => previewData.value.length > 0);
    
    const hasActiveFilters = computed(() => {
      const filters = reportConfig.filters;
      return filters.category !== '' || 
             filters.status !== '' || 
             filters.location !== '' || 
             filters.assignedTo !== '' || 
             filters.purchaseDateFrom !== '' || 
             filters.purchaseDateTo !== '' || 
             filters.valueMin !== '' || 
             filters.valueMax !== '' || 
             filters.movementType !== '' || 
             filters.alertLevel !== '';
    });
    
    const showPurchaseFilter = computed(() => 
      reportConfig.type === 'inventory' || reportConfig.type === 'value'
    );
    
    const showValueFilter = computed(() => 
      reportConfig.type === 'inventory' || reportConfig.type === 'value'
    );
    
    const showGroupingOption = computed(() => 
      reportConfig.type === 'inventory' || reportConfig.type === 'value'
    );
    
    // Métodos
    function selectReportType(type) {
      reportConfig.type = type;
      
      // Restablecer campos seleccionados según el tipo
      reportConfig.fields = availableFields
        .filter(field => isFieldRequired(field.id) || isFieldRelevantForReportType(field.id, type))
        .map(field => field.id);
      
      // Ajustar campo de ordenamiento
      if (!isFieldRelevantForReportType(reportConfig.sortField, type)) {
        reportConfig.sortField = getDefaultSortField(type);
      }
      
      // Limpiar filtros específicos
      if (type !== 'movements') {
        reportConfig.filters.movementType = '';
      }
      if (type !== 'alerts') {
        reportConfig.filters.alertLevel = '';
      }
      
      // Limpiar vista previa
      previewData.value = [];
    }
    
    function getDefaultSortField(type) {
      const defaults = {
        'inventory': 'name',
        'value': 'value',
        'movements': 'movementDate',
        'alerts': 'alertDate'
      };
      return defaults[type] || 'name';
    }
    
    function isFieldRelevantForReportType(fieldId, type) {
      if (type === 'inventory') {
        return !['movementType', 'movementDate', 'movementUser', 'movementNotes', 
                'alertType', 'alertLevel', 'alertDate', 'currentValue', 'depreciation'].includes(fieldId);
      } else if (type === 'value') {
        return !['movementType', 'movementDate', 'movementUser', 'movementNotes',
                'alertType', 'alertLevel', 'alertDate'].includes(fieldId);
      } else if (type === 'movements') {
        return ['id', 'name', 'serialNumber', 'category', 'status', 'location',
                'movementType', 'movementDate', 'movementUser', 'movementNotes'].includes(fieldId);
      } else if (type === 'alerts') {
        return ['id', 'name', 'serialNumber', 'category', 'status', 'location',
                'alertType', 'alertLevel', 'alertDate', 'warrantyExpiration', 'nextMaintenance'].includes(fieldId);
      }
      return true;
    }
    
    function isFieldRequired(fieldId) {
      const field = availableFields.find(f => f.id === fieldId);
      return field && field.required.includes(reportConfig.type);
    }
    
    function selectAllFields() {
      reportConfig.fields = availableFields
        .filter(field => isFieldRelevantForReportType(field.id, reportConfig.type))
        .map(field => field.id);
    }
    
    function deselectOptionalFields() {
      reportConfig.fields = availableFields
        .filter(field => field.required.includes(reportConfig.type))
        .map(field => field.id);
    }
    
    function clearFilters() {
      reportConfig.filters = {
        category: '',
        status: '',
        location: '',
        assignedTo: '',
        purchaseDateFrom: '',
        purchaseDateTo: '',
        valueMin: '',
        valueMax: '',
        movementType: '',
        alertLevel: ''
      };
    }
    
    function toggleSortDirection() {
      reportConfig.sortDirection = reportConfig.sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    function getReportTitle() {
      const types = {
        'inventory': 'Inventario General',
        'value': 'Valor del Inventario',
        'movements': 'Reporte de Movimientos',
        'alerts': 'Reporte de Alertas'
      };
      return types[reportConfig.type] || 'Reporte de Inventario';
    }
    
    function getCurrentDate() {
      return formatDate(new Date(), 'DD/MM/YYYY HH:mm');
    }
    
    function getFieldValue(item, fieldId) {
      if (fieldId.includes('.')) {
        const parts = fieldId.split('.');
        let value = item;
        for (const part of parts) {
          value = value[part];
          if (value === undefined) return '—';
        }
        return value;
      }
      
      if (item[fieldId] === undefined || item[fieldId] === null) {
        return '—';
      }
      
      // Formatear según el tipo de campo
      if (['purchaseDate', 'movementDate', 'alertDate', 'warrantyExpiration', 
           'lastMaintenance', 'nextMaintenance', 'createdAt', 'updatedAt'].includes(fieldId)) {
        return formatDate(item[fieldId], 'DD/MM/YYYY');
      } else if (['value', 'currentValue', 'depreciation'].includes(fieldId)) {
        return formatCurrency(item[fieldId]);
      }
      
      return item[fieldId];
    }
    
    function formatCurrency(value) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    }
    
    function getReportFormatIcon(format) {
      const icons = {
        'xlsx': 'icon-file-spreadsheet',
        'pdf': 'icon-file-pdf',
        'csv': 'icon-file-text'
      };
      return icons[format] || 'icon-file';
    }
    
    // Generación de reportes
    async function generatePreview() {
      loading.value = true;
      
      try {
        // Simular retraso de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Obtener datos según el tipo de reporte
        let data;
        
        switch (reportConfig.type) {
          case 'inventory':
            data = getMockInventoryData();
            break;
          case 'value':
            data = getMockValueData();
            break;
          case 'movements':
            data = getMockMovementsData();
            break;
          case 'alerts':
            data = getMockAlertsData();
            break;
          default:
            data = [];
        }
        
        // Aplicar filtros
        data = filterData(data);
        
        // Aplicar ordenamiento
        data = sortData(data);
        
        // Actualizar datos de vista previa
        totalItems.value = data.length;
        previewData.value = data.slice(0, 5); // Limitar a 5 elementos para la vista previa
        
      } catch (error) {
        console.error('Error al generar vista previa:', error);
        previewData.value = [];
      } finally {
        loading.value = false;
      }
    }
    
    function filterData(data) {
      const filters = reportConfig.filters;
      
      return data.filter(item => {
        // Filtros generales
        if (filters.category && item.category !== filters.category) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.location && item.location !== filters.location) return false;
        if (filters.assignedTo === 'unassigned' && item.assignedTo) return false;
        if (filters.assignedTo && filters.assignedTo !== 'unassigned' && item.assignedTo !== filters.assignedTo) return false;
        
        // Filtros de fecha de compra
        if (filters.purchaseDateFrom && new Date(item.purchaseDate) < new Date(filters.purchaseDateFrom)) return false;
        if (filters.purchaseDateTo && new Date(item.purchaseDate) > new Date(filters.purchaseDateTo)) return false;
        
        // Filtros de valor
        if (filters.valueMin !== '' && parseFloat(item.value) < parseFloat(filters.valueMin)) return false;
        if (filters.valueMax !== '' && parseFloat(item.value) > parseFloat(filters.valueMax)) return false;
        
        // Filtros específicos por tipo
        if (reportConfig.type === 'movements' && filters.movementType && item.movementType !== filters.movementType) return false;
        if (reportConfig.type === 'alerts' && filters.alertLevel && item.alertLevel !== filters.alertLevel) return false;
        
        return true;
      });
    }
    
    function sortData(data) {
      const field = reportConfig.sortField;
      const direction = reportConfig.sortDirection;
      
      return [...data].sort((a, b) => {
        const valueA = a[field];
        const valueB = b[field];
        
        if (valueA === undefined || valueA === null) return direction === 'asc' ? -1 : 1;
        if (valueB === undefined || valueB === null) return direction === 'asc' ? 1 : -1;
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return direction === 'asc' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }
        
        if (isDateField(field)) {
          const dateA = new Date(valueA);
          const dateB = new Date(valueB);
          return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      });
    }
    
    function isDateField(field) {
      return ['purchaseDate', 'movementDate', 'alertDate', 'warrantyExpiration', 
              'lastMaintenance', 'nextMaintenance', 'createdAt', 'updatedAt'].includes(field);
    }
    
    async function generateReport() {
      loading.value = true;
      
      try {
        // Simular retraso de red
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Obtener todos los datos (no solo la vista previa)
        let data;
        
        switch (reportConfig.type) {
          case 'inventory':
            data = getMockInventoryData();
            break;
          case 'value':
            data = getMockValueData();
            break;
          case 'movements':
            data = getMockMovementsData();
            break;
          case 'alerts':
            data = getMockAlertsData();
            break;
          default:
            data = [];
        }
        
        // Aplicar filtros
        data = filterData(data);
        
        // Aplicar ordenamiento
        data = sortData(data);
        
        // Generar según formato
        switch (reportConfig.outputFormat) {
          case 'xlsx':
            generateExcelReport(data);
            break;
          case 'pdf':
            generatePdfReport(data);
            break;
          case 'csv':
            generateCsvReport(data);
            break;
        }
        
        // Simular que se agrega al historial de reportes
        const newReport = {
          id: recentReports.value.length + 1,
          title: getReportTitle() + (hasActiveFilters.value ? ' (Filtrado)' : ''),
          date: new Date().toISOString(),
          format: reportConfig.outputFormat,
          url: '#'
        };
        
        recentReports.value = [newReport, ...recentReports.value].slice(0, 5);
        
      } catch (error) {
        console.error('Error al generar reporte:', error);
        // Mostrar mensaje de error
      } finally {
        loading.value = false;
      }
    }
    
    function generateExcelReport(data) {
      // Preparar datos para exportar
      const exportFields = availableFields.filter(field => 
        reportConfig.fields.includes(field.id) && 
        isFieldRelevantForReportType(field.id, reportConfig.type)
      );
      
      const headers = exportFields.map(field => field.label);
      
      const exportData = data.map(item => {
        const row = {};
        exportFields.forEach(field => {
          row[field.label] = getFieldValue(item, field.id);
        });
        return row;
      });
      
      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, getReportTitle().substring(0, 31));
      
      // Generar nombre de archivo
      const fileName = `${getReportTitle().replace(/\s+/g, '_')}_${formatDateForFileName(new Date())}.xlsx`;
      
      // Guardar archivo
      XLSX.writeFile(wb, fileName);
    }
    
    function generatePdfReport(data) {
      // Configurar documento
      const orientation = reportConfig.landscapeMode ? 'landscape' : 'portrait';
      const doc = new jsPDF({ orientation });
      
      // Título
      doc.setFontSize(18);
      doc.text(getReportTitle(), 14, 20);
      
      // Subtítulo con fecha
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${getCurrentDate()}`, 14, 28);
      
      // Filtros aplicados
      if (hasActiveFilters.value) {
        doc.setFontSize(10);
        doc.text('Filtros aplicados:', 14, 36);
        
        let yPos = 42;
        const filters = reportConfig.filters;
        
        if (filters.category) {
          const category = categories.value.find(c => c.id === filters.category)?.name || filters.category;
          doc.text(`Categoría: ${category}`, 18, yPos);
          yPos += 5;
        }
        if (filters.status) {
          const status = statuses.value.find(s => s.id === filters.status)?.name || filters.status;
          doc.text(`Estado: ${status}`, 18, yPos);
          yPos += 5;
        }
        // Otros filtros...
      }
      
      // Preparar datos para la tabla
      const exportFields = availableFields.filter(field => 
        reportConfig.fields.includes(field.id) && 
        isFieldRelevantForReportType(field.id, reportConfig.type)
      );
      
      const headers = exportFields.map(field => field.label);
      
      const tableData = data.map(item => {
        return exportFields.map(field => getFieldValue(item, field.id));
      });
      
      // Calcular posición Y de la tabla
      const tableY = hasActiveFilters.value ? 50 : 35;
      
      // Generar tabla
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: tableY,
        styles: {
          fontSize: 8
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
      
      // Generar nombre de archivo
      const fileName = `${getReportTitle().replace(/\s+/g, '_')}_${formatDateForFileName(new Date())}.pdf`;
      
      // Guardar archivo
      doc.save(fileName);
    }
    
    function generateCsvReport(data) {
      // Preparar datos para exportar
      const exportFields = availableFields.filter(field => 
        reportConfig.fields.includes(field.id) && 
        isFieldRelevantForReportType(field.id, reportConfig.type)
      );
      
      const headers = exportFields.map(field => field.label);
      
      // Crear contenido CSV
      let csvContent = headers.join(',') + '\n';
      
      data.forEach(item => {
        const row = exportFields.map(field => {
          // Escapar comas y comillas
          const value = getFieldValue(item, field.id);
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csvContent += row.join(',') + '\n';
      });
      
      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `${getReportTitle().replace(/\s+/g, '_')}_${formatDateForFileName(new Date())}.csv`;
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    function formatDateForFileName(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    function downloadReport(report) {
      // En una aplicación real, esto descargaría el archivo existente
      // Para este ejemplo, solo simulamos la descarga generando un nuevo reporte
      if (report.format === 'xlsx') {
        generateExcelReport(previewData.value);
      } else if (report.format === 'pdf') {
        generatePdfReport(previewData.value);
      } else if (report.format === 'csv') {
        generateCsvReport(previewData.value);
      }
    }
    
    // Datos de ejemplo para los diferentes tipos de reportes
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
          supplier: 'TechStore',
          warrantyExpiration: '2026-06-15',
          lastMaintenance: '2025-02-10',
          nextMaintenance: '2025-08-10',
          createdAt: '2024-06-20',
          updatedAt: '2025-02-15'
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
          supplier: 'NetworkSolutions',
          warrantyExpiration: '2025-11-20',
          lastMaintenance: '2025-01-05',
          nextMaintenance: '2025-07-05',
          createdAt: '2023-11-25',
          updatedAt: '2025-01-10'
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
          supplier: 'TechStore',
          warrantyExpiration: '2026-03-10',
          lastMaintenance: '2025-08-15',
          nextMaintenance: '2026-02-15',
          createdAt: '2024-03-15',
          updatedAt: '2025-08-20'
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
          supplier: 'DellMexico',
          warrantyExpiration: '2027-01-20',
          lastMaintenance: null,
          nextMaintenance: '2025-12-20',
          createdAt: '2024-01-25',
          updatedAt: '2024-01-25'
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
          supplier: 'TechStore',
          warrantyExpiration: '2025-08-05',
          lastMaintenance: '2024-08-10',
          nextMaintenance: '2025-08-10',
          createdAt: '2023-08-10',
          updatedAt: '2024-08-15'
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
          supplier: 'OfficeSupplies',
          warrantyExpiration: '2026-04-15',
          lastMaintenance: null,
          nextMaintenance: '2025-10-15',
          createdAt: '2024-04-20',
          updatedAt: '2024-04-20'
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
          supplier: 'ToolsPlus',
          warrantyExpiration: null,
          lastMaintenance: null,
          nextMaintenance: null,
          createdAt: '2023-10-05',
          updatedAt: '2023-10-05'
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
          supplier: 'TechStore',
          warrantyExpiration: '2026-02-10',
          lastMaintenance: '2025-06-20',
          nextMaintenance: null,
          createdAt: '2024-02-15',
          updatedAt: '2025-06-25'
        }
      ];
    }
    
    function getMockValueData() {
      const inventoryData = getMockInventoryData();
      return inventoryData.map(item => {
        // Calcular depreciación (20% anual simple)
        const purchaseDate = new Date(item.purchaseDate);
        const currentDate = new Date();
        const yearsPassed = (currentDate - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000);
        const depreciation = Math.min(item.value * 0.2 * yearsPassed, item.value * 0.8);
        const currentValue = item.value - depreciation;
        
        return {
          ...item,
          depreciation: Math.round(depreciation),
          currentValue: Math.round(currentValue)
        };
      });
    }
    
    function getMockMovementsData() {
      return [
        {
          id: 'INV-001',
          name: 'Router Mikrotik hAP ac³',
          serialNumber: 'MTK-83726554',
          category: 'network',
          status: 'active',
          location: 'north-tower',
          movementType: 'location',
          movementDate: '2025-08-15',
          movementUser: 'user3',
          movementNotes: 'Traslado para instalación en nueva torre'
        },
        {
          id: 'INV-001',
          name: 'Router Mikrotik hAP ac³',
          serialNumber: 'MTK-83726554',
          category: 'network',
          status: 'active',
          location: 'north-tower',
          movementType: 'maintenance',
          movementDate: '2025-02-10',
          movementUser: 'user2',
          movementNotes: 'Mantenimiento preventivo'
        },
        {
          id: 'INV-003',
          name: 'Antena Ubiquiti LiteBeam 5AC',
          serialNumber: 'UBQ-12345678',
          category: 'network',
          status: 'maintenance',
          location: 'warehouse',
          movementType: 'status',
          movementDate: '2025-08-15',
          movementUser: 'user2',
          movementNotes: 'Cambio a mantenimiento por problemas de conexión'
        },
        {
          id: 'INV-004',
          name: 'Laptop Dell Latitude 5420',
          serialNumber: 'DLL-56473829',
          category: 'computer',
          status: 'active',
          location: 'headquarters',
          movementType: 'assignment',
          movementDate: '2024-01-25',
          movementUser: 'user1',
          movementNotes: 'Asignado a Roberto Díaz'
        },
        {
          id: 'INV-008',
          name: 'Teléfono IP Yealink T54W',
          serialNumber: 'YLK-45678912',
          category: 'telecom',
          status: 'broken',
          location: 'warehouse',
          movementType: 'status',
          movementDate: '2025-06-20',
          movementUser: 'user4',
          movementNotes: 'Marcado como defectuoso, problema con el auricular'
        },
        {
          id: 'INV-002',
          name: 'Switch Cisco SG350-28',
          serialNumber: 'CSC-92837465',
          category: 'network',
          status: 'active',
          location: 'headquarters',
          movementType: 'maintenance',
          movementDate: '2025-01-05',
          movementUser: 'user3',
          movementNotes: 'Actualización de firmware'
        }
      ];
    }
    
    function getMockAlertsData() {
      return [
        {
          id: 'INV-005',
          name: 'Router Mikrotik RB2011UiAS-2HnD',
          serialNumber: 'MTK-65748392',
          category: 'network',
          status: 'active',
          location: 'south-tower',
          warrantyExpiration: '2025-08-05',
          alertType: 'warranty',
          alertLevel: 'warning',
          alertDate: '2025-07-05'
        },
        {
          id: 'INV-002',
          name: 'Switch Cisco SG350-28',
          serialNumber: 'CSC-92837465',
          category: 'network',
          status: 'active',
          location: 'headquarters',
          nextMaintenance: '2025-07-05',
          alertType: 'maintenance',
          alertLevel: 'info',
          alertDate: '2025-06-05'
        },
        {
          id: 'INV-008',
          name: 'Teléfono IP Yealink T54W',
          serialNumber: 'YLK-45678912',
          category: 'telecom',
          status: 'broken',
          location: 'warehouse',
          warrantyExpiration: '2026-02-10',
          alertType: 'repair',
          alertLevel: 'critical',
          alertDate: '2025-06-20'
        },
        {
          id: 'INV-001',
          name: 'Router Mikrotik hAP ac³',
          serialNumber: 'MTK-83726554',
          category: 'network',
          status: 'active',
          location: 'north-tower',
          nextMaintenance: '2025-08-10',
          alertType: 'maintenance',
          alertLevel: 'info',
          alertDate: '2025-07-10'
        }
      ];
    }
    
    // Inicialización
    onMounted(() => {
      // Cargar datos iniciales
    });
    
    return {
      loading,
      previewData,
      totalItems,
      reportConfig,
      recentReports,
      categories,
      statuses,
      locations,
      users,
      reportTypes,
      outputFormats,
      availableFields,
      sortableFields,
      selectedPreviewFields,
      hasPreviewData,
      hasActiveFilters,
      showPurchaseFilter,
      showValueFilter,
      showGroupingOption,
      
      selectReportType,
      isFieldRequired,
      selectAllFields,
      deselectOptionalFields,
      clearFilters,
      toggleSortDirection,
      getReportTitle,
      getCurrentDate,
      getFieldValue,
      getReportFormatIcon,
      generatePreview,
      generateReport,
      downloadReport,
      formatDate
    };
  }
};
</script>

<style scoped>
.inventory-reports {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

/* Header */
.reports-header {
  margin-bottom: 24px;
}

.reports-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.reports-description {
  font-size: 16px;
  color: var(--text-secondary, #666);
}

/* Container layout */
.reports-container {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}

/* Panels */
.report-config-panel,
.report-preview-panel {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  background-color: var(--primary-color, #1976d2);
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.panel-body {
  padding: 16px;
  max-height: 600px;
  overflow-y: auto;
}

/* Configuration section */
.config-section {
  margin-bottom: 24px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 8px;
}

/* Report types */
.report-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.report-type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.report-type-card:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.report-type-card.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  color: var(--primary-color, #1976d2);
  font-size: 20px;
}

.card-content {
  flex: 1;
}

.card-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary, #333);
}

.card-description {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Filters */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-item label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.filter-item select,
.filter-item input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 13px;
  background-color: var(--bg-primary, white);
}

.date-filter {
  grid-column: span 2;
}

.date-range {
  display: flex;
  gap: 12px;
}

.date-input {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.range-input {
  display: flex;
  gap: 12px;
}

.range-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-actions {
  grid-column: span 2;
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* Fields */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.checkbox-label.disabled {
  opacity: 0.7;
  cursor: default;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.required-badge {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #2196f3);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
  margin-left: 6px;
}

.fields-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.btn-link {
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 13px;
  color: var(--primary-color, #1976d2);
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: var(--primary-dark, #1565c0);
}

/* Output options */
.output-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group label {
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.format-buttons {
  display: flex;
  gap: 12px;
}

.format-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border: 2px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  background-color: var(--bg-primary, white);
  cursor: pointer;
  transition: all 0.2s ease;
}

.format-button:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.format-button.active {
  border-color: var(--primary-color, #1976d2);
  background-color: var(--primary-lightest, #e3f2fd);
}

.format-button i {
  font-size: 24px;
  margin-bottom: 8px;
  color: var(--primary-color, #1976d2);
}

.format-button span {
  font-size: 12px;
  color: var(--text-primary, #333);
  font-weight: 500;
}

.sort-config {
  display: flex;
  gap: 8px;
}

.sort-config select {
  flex: 1;
}

.btn-sort-direction {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  background-color: var(--bg-primary, white);
  cursor: pointer;
}

.option-group.checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Preview */
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header {
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.preview-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.preview-filter {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--warning-color, #ff9800);
}

.preview-table-container {
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border-color, #e0e0e0);
  font-size: 13px;
}

.preview-table th,
.preview-table td {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  text-align: left;
}

.preview-table th {
  background-color: var(--bg-secondary, #f5f5f5);
  font-weight: 600;
  color: var(--text-primary, #333);
}

.preview-table tr:nth-child(even) {
  background-color: var(--bg-tertiary, #fafafa);
}

.preview-charts {
  margin-top: 16px;
  border: 1px dashed var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 20px;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--text-secondary, #666);
  font-size: 13px;
}

.chart-placeholder i {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.preview-footer {
  display: flex;
  justify-content: flex-end;
  font-size: 12px;
  color: var(--text-secondary, #666);
  margin-top: 12px;
}

/* Estados de carga y vacío */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top: 3px solid var(--primary-color, #1976d2);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.empty-state p {
  margin: 0;
  font-size: 15px;
  color: var(--text-secondary, #666);
}

.empty-icon {
  font-size: 48px;
  color: var(--text-secondary, #666);
  opacity: 0.5;
  margin-bottom: 16px;
}

.empty-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 16px;
}

.empty-description {
  font-size: 14px;
}

/* Report actions */
.reports-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.btn-primary,
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

.btn-secondary {
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border: 1px solid var(--border-color, #e0e0e0);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Recent reports */
.recent-reports {
  margin-top: 32px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  padding-top: 24px;
}

.recent-reports h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary, #333);
}

.recent-reports-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.recent-report-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.report-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  color: var(--primary-color, #1976d2);
  font-size: 20px;
}

.report-card-content {
  flex: 1;
}

.report-card-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.report-card-meta {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.report-card-actions .btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-primary, white);
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.report-card-actions .btn-icon:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* Responsive */
@media (max-width: 992px) {
  .reports-container {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .report-type-card {
    padding: 8px;
  }
  
  .filter-grid,
  .fields-grid {
    grid-template-columns: 1fr;
  }
  
  .date-filter {
    grid-column: span 1;
  }
  
  .date-range {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .reports-title {
    font-size: 20px;
  }
  
  .reports-description {
    font-size: 14px;
  }
  
  .report-types {
    grid-template-columns: 1fr;
  }
  
  .format-buttons {
    flex-wrap: wrap;
    justify-content: space-between;
  }
  
  .format-button {
    width: 70px;
    height: 70px;
  }
  
  .recent-reports-list {
    grid-template-columns: 1fr;
  }
  
  .reports-actions {
    flex-direction: column;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
