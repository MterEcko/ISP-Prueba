<template>
  <div class="movement-history">
    <div class="history-header">
      <div class="header-title">
        <h3>Historial de Movimientos</h3>
        <p v-if="assetName">{{ assetName }} - {{ assetSerial }}</p>
      </div>
      
      <div class="header-actions">
        <button class="btn-icon" @click="refreshHistory" :disabled="loading" title="Actualizar">
          <i class="icon-refresh"></i>
        </button>
        <button class="btn-icon" @click="exportHistory" :disabled="loading || !hasMovements" title="Exportar historial">
          <i class="icon-download"></i>
        </button>
      </div>
    </div>
    
    <!-- Filtros de historial -->
    <div class="history-filters">
      <div class="filter-group">
        <label>Periodo:</label>
        <select v-model="filters.period" @change="applyFilters">
          <option value="all">Todo el historial</option>
          <option value="year">Último año</option>
          <option value="month">Último mes</option>
          <option value="week">Última semana</option>
          <option value="custom">Periodo personalizado</option>
        </select>
      </div>
      
      <div v-if="filters.period === 'custom'" class="filter-group date-range">
        <div class="date-input">
          <label>Desde:</label>
          <input type="date" v-model="filters.dateFrom" @change="applyFilters" />
        </div>
        <div class="date-input">
          <label>Hasta:</label>
          <input type="date" v-model="filters.dateTo" @change="applyFilters" />
        </div>
      </div>
      
      <div class="filter-group">
        <label>Tipo:</label>
        <select v-model="filters.type" @change="applyFilters">
          <option value="all">Todos los movimientos</option>
          <option value="location">Cambios de ubicación</option>
          <option value="status">Cambios de estado</option>
          <option value="assignment">Asignaciones</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
      </div>
      
      <button v-if="isFiltered" class="btn-clear-filters" @click="clearFilters">
        <i class="icon-x"></i> Limpiar filtros
      </button>
    </div>
    
    <!-- Timeline de movimientos -->
    <div class="history-timeline" v-if="!loading && hasMovements">
      <div class="timeline-container">
        <div v-for="(movement, index) in filteredMovements" :key="index" 
            class="timeline-item" :class="[getMovementTypeClass(movement.type), { 'first-item': index === 0 }]">
          <div class="timeline-marker"></div>
          
          <div class="timeline-content">
            <div class="movement-header">
              <span class="movement-type">{{ getMovementTypeLabel(movement.type) }}</span>
              <span class="movement-date">{{ formatDate(movement.date) }}</span>
            </div>
            
            <div class="movement-details">
              <p class="movement-description">{{ movement.description }}</p>
              
              <div class="movement-changes" v-if="hasChanges(movement)">
                <div v-if="movement.fromValue && movement.toValue" class="change-values">
                  <div class="from-value">
                    <span class="label">Anterior:</span>
                    <span class="value">{{ movement.fromValue }}</span>
                  </div>
                  <div class="change-arrow">
                    <i class="icon-arrow-right"></i>
                  </div>
                  <div class="to-value">
                    <span class="label">Nuevo:</span>
                    <span class="value">{{ movement.toValue }}</span>
                  </div>
                </div>
                
                <div v-if="movement.notes" class="movement-notes">
                  <i class="icon-info"></i>
                  <span>{{ movement.notes }}</span>
                </div>
              </div>
              
              <div class="movement-meta">
                <div class="user-info" v-if="movement.user">
                  <i class="icon-user"></i>
                  <span>{{ movement.user }}</span>
                </div>
                <div class="reference-info" v-if="movement.reference">
                  <i class="icon-hash"></i>
                  <span>{{ movement.reference }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Estado de carga -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando historial...</p>
    </div>
    
    <!-- Estado vacío -->
    <div v-if="!loading && !hasMovements" class="empty-state">
      <div class="empty-icon">
        <i class="icon-clock"></i>
      </div>
      <p class="empty-message">No hay registros de movimientos{{ isFiltered ? ' con los filtros actuales' : '' }}</p>
      <button v-if="isFiltered" class="btn-secondary" @click="clearFilters">
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<script>
import { formatDate } from '@/utils/formatters';
import * as XLSX from 'xlsx';

export default {
  name: 'MovementHistory',
  props: {
    /**
     * ID del elemento del inventario
     */
    assetId: {
      type: [String, Number],
      required: true
    },
    /**
     * Nombre del elemento (opcional)
     */
    assetName: {
      type: String,
      default: ''
    },
    /**
     * Número de serie del elemento (opcional)
     */
    assetSerial: {
      type: String,
      default: ''
    },
    /**
     * Limitar número máximo de movimientos a mostrar
     */
    limit: {
      type: Number,
      default: 0
    },
    /**
     * Filtrar por tipo de movimiento específico
     */
    initialType: {
      type: String,
      default: 'all'
    }
  },
  data() {
    return {
      loading: false,
      movements: [],
      filters: {
        period: 'all',
        type: this.initialType,
        dateFrom: this.getDefaultDateFrom(),
        dateTo: this.getDefaultDateTo()
      }
    };
  },
  computed: {
    /**
     * Verificar si hay movimientos disponibles
     */
    hasMovements() {
      return this.movements.length > 0;
    },
    
    /**
     * Determinar si hay filtros aplicados
     */
    isFiltered() {
      return this.filters.period !== 'all' || this.filters.type !== 'all';
    },
    
    /**
     * Obtener movimientos filtrados
     */
    filteredMovements() {
      if (!this.hasMovements) return [];
      
      let result = [...this.movements];
      
      // Filtrar por tipo
      if (this.filters.type !== 'all') {
        result = result.filter(movement => movement.type === this.filters.type);
      }
      
      // Filtrar por fecha
      if (this.filters.period !== 'all') {
        const now = new Date();
        let dateFrom;
        
        if (this.filters.period === 'custom') {
          // Usar periodo personalizado
          dateFrom = this.filters.dateFrom ? new Date(this.filters.dateFrom) : null;
          const dateTo = this.filters.dateTo ? new Date(this.filters.dateTo) : new Date();
          
          if (dateFrom) {
            result = result.filter(movement => {
              const movementDate = new Date(movement.date);
              return movementDate >= dateFrom && movementDate <= dateTo;
            });
          }
        } else {
          // Usar periodos predefinidos
          switch (this.filters.period) {
            case 'week':
              dateFrom = new Date(now);
              dateFrom.setDate(now.getDate() - 7);
              break;
            case 'month':
              dateFrom = new Date(now);
              dateFrom.setMonth(now.getMonth() - 1);
              break;
            case 'year':
              dateFrom = new Date(now);
              dateFrom.setFullYear(now.getFullYear() - 1);
              break;
          }
          
          result = result.filter(movement => {
            const movementDate = new Date(movement.date);
            return movementDate >= dateFrom;
          });
        }
      }
      
      // Limitar cantidad si es necesario
      if (this.limit > 0 && result.length > this.limit) {
        result = result.slice(0, this.limit);
      }
      
      return result;
    }
  },
  created() {
    this.fetchMovementHistory();
  },
  methods: {
    /**
     * Obtener fecha por defecto para el filtro "desde" (1 mes atrás)
     */
    getDefaultDateFrom() {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return this.formatDateForInput(date);
    },
    
    /**
     * Obtener fecha por defecto para el filtro "hasta" (hoy)
     */
    getDefaultDateTo() {
      return this.formatDateForInput(new Date());
    },
    
    /**
     * Formatear fecha para inputs de tipo date
     */
    formatDateForInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    
    /**
     * Formatear fecha para mostrar
     */
    formatDate(dateString) {
      return formatDate(dateString);
    },
    
    /**
     * Obtener clase CSS según el tipo de movimiento
     */
    getMovementTypeClass(type) {
      const classes = {
        'location': 'type-location',
        'status': 'type-status',
        'assignment': 'type-assignment',
        'maintenance': 'type-maintenance',
        'creation': 'type-creation',
        'modification': 'type-modification',
        'deletion': 'type-deletion'
      };
      
      return classes[type] || 'type-default';
    },
    
    /**
     * Obtener etiqueta descriptiva según el tipo de movimiento
     */
    getMovementTypeLabel(type) {
      const labels = {
        'location': 'Cambio de Ubicación',
        'status': 'Cambio de Estado',
        'assignment': 'Asignación',
        'maintenance': 'Mantenimiento',
        'creation': 'Creación',
        'modification': 'Modificación',
        'deletion': 'Eliminación'
      };
      
      return labels[type] || 'Movimiento';
    },
    
    /**
     * Verificar si un movimiento tiene cambios para mostrar
     */
    hasChanges(movement) {
      return movement.fromValue || movement.toValue || movement.notes;
    },
    
    /**
     * Cargar historial de movimientos
     */
    async fetchMovementHistory() {
      if (!this.assetId) return;
      
      this.loading = true;
      
      try {
        // Aquí se implementaría la llamada real al servicio
        // En este ejemplo, usamos datos simulados
        
        // Simular retraso de red
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo
        this.movements = this.getMockMovements();
        
      } catch (error) {
        console.error('Error al cargar historial de movimientos:', error);
        this.$emit('error', {
          message: 'No se pudo cargar el historial de movimientos',
          error
        });
      } finally {
        this.loading = false;
      }
    },
    
    /**
     * Refrescar historial
     */
    refreshHistory() {
      this.fetchMovementHistory();
    },
    
    /**
     * Aplicar filtros
     */
    applyFilters() {
      // No es necesario hacer nada adicional ya que usamos computed properties
      this.$emit('filters-changed', this.filters);
    },
    
    /**
     * Limpiar filtros
     */
    clearFilters() {
      this.filters = {
        period: 'all',
        type: 'all',
        dateFrom: this.getDefaultDateFrom(),
        dateTo: this.getDefaultDateTo()
      };
      
      this.$emit('filters-changed', this.filters);
    },
    
    /**
     * Exportar historial a Excel
     */
    exportHistory() {
      if (!this.hasMovements) return;
      
      // Preparar datos para exportar
      const dataToExport = this.filteredMovements.map(movement => ({
        'Fecha': formatDate(movement.date),
        'Tipo': this.getMovementTypeLabel(movement.type),
        'Descripción': movement.description,
        'Valor Anterior': movement.fromValue || '',
        'Valor Nuevo': movement.toValue || '',
        'Notas': movement.notes || '',
        'Usuario': movement.user || '',
        'Referencia': movement.reference || ''
      }));
      
      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial');
      
      // Generar nombre de archivo
      let fileName = 'Historial_Movimientos';
      if (this.assetName) {
        fileName += `_${this.assetName.replace(/[^a-z0-9]/gi, '_')}`;
      }
      if (this.assetSerial) {
        fileName += `_${this.assetSerial}`;
      }
      fileName += '.xlsx';
      
      // Guardar archivo
      XLSX.writeFile(wb, fileName);
    },
    
    /**
     * Generar datos de ejemplo para propósitos de desarrollo
     * NOTA: Esto sería reemplazado por datos reales del API en producción
     */
    getMockMovements() {
      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;
      
      return [
        {
          id: 1,
          date: new Date(now.getTime() - (1 * oneDay)).toISOString(),
          type: 'status',
          description: 'Cambio de estado del equipo',
          fromValue: 'Activo',
          toValue: 'En mantenimiento',
          notes: 'Equipo enviado a mantenimiento preventivo',
          user: 'Carlos Mendez',
          reference: 'MANT-2025-0127'
        },
        {
          id: 2,
          date: new Date(now.getTime() - (5 * oneDay)).toISOString(),
          type: 'location',
          description: 'Cambio de ubicación física',
          fromValue: 'Almacén Central',
          toValue: 'Torre Norte - Sector 3',
          notes: 'Traslado para instalación en cliente',
          user: 'Luis Ramírez',
          reference: 'TRASL-2025-0058'
        },
        {
          id: 3,
          date: new Date(now.getTime() - (12 * oneDay)).toISOString(),
          type: 'assignment',
          description: 'Asignación a técnico',
          fromValue: 'Sin asignar',
          toValue: 'Luis Ramírez',
          user: 'María López',
          reference: 'ASIG-2025-0035'
        },
        {
          id: 4,
          date: new Date(now.getTime() - (30 * oneDay)).toISOString(),
          type: 'maintenance',
          description: 'Mantenimiento correctivo',
          fromValue: 'Defectuoso',
          toValue: 'Reparado',
          notes: 'Se reemplazó el módulo de potencia',
          user: 'Jorge Suárez',
          reference: 'REP-2025-0019'
        },
        {
          id: 5,
          date: new Date(now.getTime() - (60 * oneDay)).toISOString(),
          type: 'status',
          description: 'Cambio de estado del equipo',
          fromValue: 'Nuevo',
          toValue: 'Defectuoso',
          notes: 'Falla detectada durante pruebas iniciales',
          user: 'Ana Castro',
          reference: 'FALL-2025-0008'
        },
        {
          id: 6,
          date: new Date(now.getTime() - (90 * oneDay)).toISOString(),
          type: 'creation',
          description: 'Registro inicial en inventario',
          toValue: 'Ingresado al sistema',
          user: 'Roberto Díaz',
          reference: 'INV-2025-0127'
        }
      ];
    }
  }
};
</script>

<style scoped>
.movement-history {
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* Encabezado */
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.header-title h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.header-title p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-secondary, #f5f5f5);
  border: none;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover:not(:disabled) {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Filtros */
.history-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-size: 14px;
  color: var(--text-secondary, #666);
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--bg-primary, white);
}

.date-range {
  display: flex;
  gap: 12px;
}

.date-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: auto;
}

.btn-clear-filters:hover {
  background-color: var(--hover-bg, #f0f0f0);
  color: var(--text-primary, #333);
}

/* Timeline */
.history-timeline {
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.timeline-container {
  position: relative;
  padding-left: 30px;
}

.timeline-container:before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 12px;
  width: 2px;
  background-color: var(--border-color, #e0e0e0);
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-marker {
  position: absolute;
  left: -30px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--bg-primary, white);
  border: 2px solid var(--primary-color, #1976d2);
  z-index: 1;
}

/* Estilos para diferentes tipos de movimientos */
.timeline-item.type-location .timeline-marker {
  border-color: var(--info-color, #2196f3);
}

.timeline-item.type-status .timeline-marker {
  border-color: var(--warning-color, #ff9800);
}

.timeline-item.type-assignment .timeline-marker {
  border-color: var(--success-color, #4caf50);
}

.timeline-item.type-maintenance .timeline-marker {
  border-color: var(--error-color, #f44336);
}

.timeline-item.type-creation .timeline-marker {
  border-color: var(--primary-color, #1976d2);
}

.timeline-content {
  background-color: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  padding: 16px;
}

.movement-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.movement-type {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary, #333);
}

.movement-date {
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.movement-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.movement-changes {
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.change-values {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.from-value, .to-value {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.change-arrow {
  color: var(--text-secondary, #666);
}

.label {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
  padding: 4px 8px;
  background-color: var(--bg-primary, white);
  border-radius: 4px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.movement-notes {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  font-style: italic;
}

.movement-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary, #666);
}

.user-info, .reference-info {
  display: flex;
  align-items: center;
  gap: 6px;
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
  margin: 0 0 16px 0;
  font-size: 15px;
  color: var(--text-secondary, #666);
}

.empty-icon {
  font-size: 48px;
  color: var(--text-secondary, #666);
  opacity: 0.5;
  margin-bottom: 16px;
}

.btn-secondary {
  padding: 8px 16px;
  background-color: var(--bg-secondary, #f5f5f5);
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 6px;
  font-size: 14px;
  color: var(--text-primary, #333);
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

/* Responsive */
@media (max-width: 768px) {
  .history-filters {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group select,
  .filter-group input {
    flex: 1;
  }
  
  .date-range {
    flex-direction: column;
    width: 100%;
  }
  
  .date-input {
    width: 100%;
  }
  
  .btn-clear-filters {
    margin-left: 0;
  }
  
  .movement-header {
    flex-direction: column;
    gap: 4px;
  }
  
  .change-values {
    flex-direction: column;
    gap: 8px;
  }
  
  .change-arrow {
    transform: rotate(90deg);
  }
  
  .movement-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
