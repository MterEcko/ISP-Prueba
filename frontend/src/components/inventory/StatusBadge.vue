<template>
  <div 
    class="status-badge" 
    :class="badgeClass"
    :title="getTooltip()"
  >
    <span class="status-icon">
      <i :class="getIcon()"></i>
    </span>
    <span class="status-text">{{ getLabel() }}</span>
    <span 
      v-if="showInfo && hasAdditionalInfo" 
      class="status-info"
      @click.stop="toggleDetails"
    >
      <i class="icon-info"></i>
    </span>
    
    <!-- Detalles adicionales -->
    <div v-if="showDetails" class="status-details" @click.stop>
      <div class="status-details-header">
        <h4>Información de Estado</h4>
        <button @click="showDetails = false">
          <i class="icon-close"></i>
        </button>
      </div>
      <div class="status-details-body">
        <!-- Estado actual -->
        <div class="status-info-row">
          <span class="label">Estado:</span>
          <span class="value" :class="badgeClass">{{ getLabel() }}</span>
        </div>
        
        <!-- Fecha de cambio -->
        <div v-if="statusDate" class="status-info-row">
          <span class="label">Desde:</span>
          <span class="value">{{ formatDate(statusDate) }}</span>
        </div>
        
        <!-- Motivo -->
        <div v-if="reason" class="status-info-row">
          <span class="label">Motivo:</span>
          <span class="value">{{ reason }}</span>
        </div>
        
        <!-- Comentarios -->
        <div v-if="notes" class="status-info-row">
          <span class="label">Notas:</span>
          <span class="value notes">{{ notes }}</span>
        </div>
        
        <!-- Información específica por estado -->
        <div v-if="status === 'inRepair'" class="status-info-row">
          <span class="label">Fecha estimada:</span>
          <span class="value" :class="getEstimatedRepairClass()">
            {{ estimatedRepairDate ? formatDate(estimatedRepairDate) : 'No especificada' }}
          </span>
        </div>
        
        <div v-if="status === 'inUse'" class="status-info-row">
          <span class="label">Asignado a:</span>
          <span class="value">{{ assignedToName || 'Sin asignar' }}</span>
        </div>
        
        <!-- Historial de estados -->
        <div v-if="showHistory && statusHistory && statusHistory.length > 0" class="status-history">
          <h5>Historial de estados</h5>
          <div v-for="(history, index) in statusHistory" :key="index" class="history-item">
            <div class="history-status">
              <span class="status-dot" :class="getStatusClass(history.status)"></span>
              <span class="status-name">{{ getStatusLabel(history.status) }}</span>
            </div>
            <div class="history-date">{{ formatDate(history.date) }}</div>
          </div>
        </div>
      </div>
      <div v-if="allowEdit" class="status-details-footer">
        <button class="btn-primary" @click="$emit('change-status')">
          Cambiar estado
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusBadge',
  props: {
    /**
     * Estado del elemento (required)
     * Valores posibles: available, inUse, defective, inRepair, retired
     */
    status: {
      type: String,
      required: true,
      validator: value => ['available', 'inUse', 'defective', 'inRepair', 'retired'].includes(value)
    },
    /**
     * Fecha del cambio de estado
     */
    statusDate: {
      type: [String, Date],
      default: null
    },
    /**
     * Motivo del cambio de estado
     */
    reason: {
      type: String,
      default: ''
    },
    /**
     * Notas adicionales
     */
    notes: {
      type: String,
      default: ''
    },
    /**
     * Fecha estimada de reparación (solo para estado inRepair)
     */
    estimatedRepairDate: {
      type: [String, Date],
      default: null
    },
    /**
     * Nombre de la persona/cliente a quien está asignado (solo para estado inUse)
     */
    assignedToName: {
      type: String,
      default: ''
    },
    /**
     * Historial de estados
     * Array de objetos con formato: { status: 'available', date: '2023-01-01' }
     */
    statusHistory: {
      type: Array,
      default: () => []
    },
    /**
     * Si es true, muestra el icono de información
     */
    showInfo: {
      type: Boolean,
      default: true
    },
    /**
     * Si es true, muestra el historial de estados
     */
    showHistory: {
      type: Boolean,
      default: true
    },
    /**
     * Si es true, muestra el botón de editar estado
     */
    allowEdit: {
      type: Boolean,
      default: true
    },
    /**
     * Tamaño del badge: 'small', 'medium' (default), 'large'
     */
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    }
  },
  data() {
    return {
      showDetails: false
    };
  },
  computed: {
    /**
     * Clase CSS para el badge basado en el estado y tamaño
     */
    badgeClass() {
      return [
        `status-${this.status}`,
        `size-${this.size}`
      ];
    },
    /**
     * Verifica si hay información adicional disponible
     */
    hasAdditionalInfo() {
      return this.reason || 
        this.notes || 
        this.statusDate || 
        (this.status === 'inRepair' && this.estimatedRepairDate) ||
        (this.status === 'inUse' && this.assignedToName) ||
        (this.showHistory && this.statusHistory && this.statusHistory.length > 0);
    }
  },
  methods: {
    /**
     * Obtener etiqueta según el estado
     */
    getLabel() {
      const labels = {
        available: 'Disponible',
        inUse: 'En uso',
        defective: 'Defectuoso',
        inRepair: 'En reparación',
        retired: 'Retirado'
      };
      
      return labels[this.status] || this.status;
    },
    
    /**
     * Obtener etiqueta para un estado específico
     */
    getStatusLabel(status) {
      const labels = {
        available: 'Disponible',
        inUse: 'En uso',
        defective: 'Defectuoso',
        inRepair: 'En reparación',
        retired: 'Retirado'
      };
      
      return labels[status] || status;
    },
    
    /**
     * Obtener icono según el estado
     */
    getIcon() {
      const icons = {
        available: 'icon-check-circle',
        inUse: 'icon-user',
        defective: 'icon-alert-triangle',
        inRepair: 'icon-tool',
        retired: 'icon-archive'
      };
      
      return icons[this.status] || 'icon-circle';
    },
    
    /**
     * Obtener tooltip con información resumida
     */
    getTooltip() {
      let tooltip = this.getLabel();
      
      if (this.statusDate) {
        tooltip += ` desde ${this.formatDate(this.statusDate)}`;
      }
      
      if (this.status === 'inRepair' && this.estimatedRepairDate) {
        tooltip += `, reparación estimada: ${this.formatDate(this.estimatedRepairDate)}`;
      }
      
      if (this.status === 'inUse' && this.assignedToName) {
        tooltip += `, asignado a: ${this.assignedToName}`;
      }
      
      return tooltip;
    },
    
    /**
     * Formatear fecha para mostrar
     */
    formatDate(dateString) {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        return dateString;
      }
    },
    
    /**
     * Alternar visualización de detalles
     */
    toggleDetails() {
      this.showDetails = !this.showDetails;
    },
    
    /**
     * Obtener clase CSS para una fecha estimada de reparación
     */
    getEstimatedRepairClass() {
      if (!this.estimatedRepairDate) return '';
      
      try {
        const today = new Date();
        const estimatedDate = new Date(this.estimatedRepairDate);
        
        if (isNaN(estimatedDate.getTime())) return '';
        
        // Si la fecha ya pasó
        if (estimatedDate < today) {
          return 'text-danger';
        }
        
        // Si la fecha está cerca (próximos 3 días)
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);
        
        if (estimatedDate <= threeDaysFromNow) {
          return 'text-warning';
        }
        
        return 'text-success';
      } catch (error) {
        console.error('Error al calcular clase para fecha estimada:', error);
        return '';
      }
    },
    
    /**
     * Obtener clase CSS para un estado específico
     */
    getStatusClass(status) {
      return `status-${status}`;
    }
  }
};
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  position: relative;
}

/* Tamaños */
.status-badge.size-small {
  padding: 2px 6px;
  font-size: 11px;
}

.status-badge.size-large {
  padding: 6px 10px;
  font-size: 14px;
}

/* Estados */
.status-badge.status-available {
  background-color: var(--success-light, #e8f5e9);
  color: var(--success-color, #2e7d32);
}

.status-badge.status-inUse {
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ef6c00);
}

.status-badge.status-defective {
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #c62828);
}

.status-badge.status-inRepair {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #1565c0);
}

.status-badge.status-retired {
  background-color: var(--neutral-light, #f5f5f5);
  color: var(--text-secondary, #757575);
}

/* Ícono */
.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.size-small .status-icon {
  font-size: 10px;
}

.size-large .status-icon {
  font-size: 12px;
}

/* Ícono de información */
.status-info {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.status-info:hover {
  opacity: 1;
}

/* Panel de detalles */
.status-details {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  width: 300px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0;
  font-weight: normal;
  text-align: left;
}

.status-details::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 20px;
  width: 12px;
  height: 12px;
  background-color: var(--bg-primary, white);
  transform: rotate(45deg);
  border-left: 1px solid var(--border-color, #e0e0e0);
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.status-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.status-details-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.status-details-header button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #666);
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-details-header button:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.status-details-body {
  padding: 16px;
  font-size: 13px;
  color: var(--text-primary, #333);
}

.status-info-row {
  display: flex;
  margin-bottom: 8px;
}

.status-info-row .label {
  width: 100px;
  font-weight: 500;
  color: var(--text-secondary, #666);
}

.status-info-row .value {
  flex: 1;
}

.status-info-row .value.notes {
  white-space: pre-line;
}

.text-danger {
  color: var(--error-color, #f44336);
}

.text-warning {
  color: var(--warning-color, #ff9800);
}

.text-success {
  color: var(--success-color, #4caf50);
}

/* Historial de estados */
.status-history {
  margin-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  padding-top: 12px;
}

.status-history h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.history-item:last-child {
  border-bottom: none;
}

.history-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.status-available {
  background-color: var(--success-color, #4caf50);
}

.status-dot.status-inUse {
  background-color: var(--warning-color, #ff9800);
}

.status-dot.status-defective {
  background-color: var(--error-color, #f44336);
}

.status-dot.status-inRepair {
  background-color: var(--info-color, #2196f3);
}

.status-dot.status-retired {
  background-color: var(--text-secondary, #9e9e9e);
}

.status-details-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}
</style>