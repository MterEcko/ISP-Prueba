<template>
  <div 
    class="client-badge" 
    :class="badgeClass"
    @click="showInfo && hasClientInfo && toggleDetails()"
    :title="getTooltip()"
  >
    <div class="client-avatar" v-if="showAvatar">
      <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
      <div v-else class="avatar-placeholder">
        <span>{{ initials }}</span>
      </div>
    </div>
    <span class="client-name">
      {{ displayName }}
      <span v-if="assignmentInfo" class="assignment-info">{{ assignmentInfo }}</span>
    </span>
    <span v-if="showInfo && hasClientInfo" class="info-icon">
      <i class="icon-info"></i>
    </span>
    
    <!-- Panel de detalles del cliente -->
    <div v-if="showDetails" class="client-details" @click.stop>
      <div class="details-header">
        <h4>Información del cliente</h4>
        <button @click="showDetails = false" class="btn-close">
          <i class="icon-close"></i>
        </button>
      </div>
      
      <div class="details-body">
        <!-- Encabezado con avatar y nombre -->
        <div class="client-header">
          <div class="client-avatar large">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder">
              <span>{{ initials }}</span>
            </div>
          </div>
          <div class="client-header-info">
            <h3 class="client-full-name">
              {{ clientFullName }}
              <span v-if="client.status" :class="['status-dot', `status-${client.status}`]" :title="getStatusLabel(client.status)"></span>
            </h3>
            <p v-if="client.code" class="client-code">
              ID: {{ client.code }}
            </p>
          </div>
        </div>
        
        <!-- Información de contacto -->
        <div class="contact-info">
          <div v-if="client.email" class="info-row">
            <span class="info-icon"><i class="icon-mail"></i></span>
            <a :href="`mailto:${client.email}`" class="info-value">{{ client.email }}</a>
          </div>
          <div v-if="client.phone" class="info-row">
            <span class="info-icon"><i class="icon-phone"></i></span>
            <a :href="`tel:${client.phone}`" class="info-value">{{ client.phone }}</a>
          </div>
          <div v-if="client.address" class="info-row">
            <span class="info-icon"><i class="icon-map-pin"></i></span>
            <span class="info-value">{{ client.address }}</span>
          </div>
        </div>
        
        <!-- Plan y detalles del servicio -->
        <div v-if="hasPlanInfo" class="plan-info">
          <h5>Plan de servicio</h5>
          <div class="plan-details">
            <div v-if="client.plan" class="info-row">
              <span class="label">Plan:</span>
              <span class="value plan-name">{{ client.plan }}</span>
            </div>
            <div v-if="client.planSpeed" class="info-row">
              <span class="label">Velocidad:</span>
              <span class="value">{{ client.planSpeed }}</span>
            </div>
            <div v-if="client.sector" class="info-row">
              <span class="label">Sector:</span>
              <span class="value">{{ client.sector }}</span>
            </div>
            <div v-if="client.node" class="info-row">
              <span class="label">Nodo:</span>
              <span class="value">{{ client.node }}</span>
            </div>
          </div>
        </div>
        
        <!-- Información de asignación -->
        <div v-if="hasAssignmentInfo" class="assignment-details">
          <h5>Detalles de asignación</h5>
          <div class="info-row">
            <span class="label">Asignado desde:</span>
            <span class="value">{{ formattedAssignmentDate }}</span>
          </div>
          <div v-if="assignmentType" class="info-row">
            <span class="label">Tipo:</span>
            <span class="value">{{ getAssignmentTypeLabel(assignmentType) }}</span>
          </div>
          <div v-if="assignmentNotes" class="info-row notes">
            <span class="label">Notas:</span>
            <span class="value">{{ assignmentNotes }}</span>
          </div>
          <div v-if="isTemporary" class="info-row">
            <span class="label">Devolución:</span>
            <span class="value" :class="returnDateClass">{{ formattedReturnDate }}</span>
          </div>
        </div>
        
        <!-- Equipos asignados -->
        <div v-if="hasAssignedEquipment" class="assigned-equipment">
          <h5>Otros equipos asignados ({{ otherEquipment.length }})</h5>
          <ul class="equipment-list">
            <li v-for="(equipment, index) in equipmentToShow" :key="index">
              <div class="equipment-info">
                <span class="equipment-icon"><i :class="getEquipmentIcon(equipment.type)"></i></span>
                <span class="equipment-name">{{ equipment.name }}</span>
              </div>
              <span :class="['equipment-status', `status-${equipment.status}`]">
                {{ getStatusLabel(equipment.status) }}
              </span>
            </li>
          </ul>
          <div v-if="hasMoreEquipment" class="more-equipment">
            <button class="btn-link" @click="showAllEquipment = !showAllEquipment">
              {{ showAllEquipment ? 'Mostrar menos' : `Ver ${otherEquipment.length - equipmentLimit} más...` }}
            </button>
          </div>
        </div>
      </div>
      
      <div class="details-footer">
        <button 
          v-if="allowTicketCreation" 
          class="btn-secondary"
          @click="$emit('create-ticket', client)"
        >
          <i class="icon-ticket"></i> Crear ticket
        </button>
        <button 
          class="btn-primary"
          @click="$emit('view-client', client)"
        >
          Ver perfil completo
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ClientBadge',
  props: {
    /**
     * Objeto con información del cliente (requerido)
     */
    client: {
      type: Object,
      required: true,
      default: () => ({})
    },
    /**
     * Fecha de asignación del equipo
     */
    assignmentDate: {
      type: [String, Date],
      default: null
    },
    /**
     * Tipo de asignación: 'installation', 'replacement', 'temporary', 'loaner'
     */
    assignmentType: {
      type: String,
      default: ''
    },
    /**
     * Notas de la asignación
     */
    assignmentNotes: {
      type: String,
      default: ''
    },
    /**
     * Fecha de devolución (para asignaciones temporales)
     */
    returnDate: {
      type: [String, Date],
      default: null
    },
    /**
     * URL del avatar del cliente
     */
    avatarUrl: {
      type: String,
      default: ''
    },
    /**
     * Si es true, muestra el avatar del cliente
     */
    showAvatar: {
      type: Boolean,
      default: true
    },
    /**
     * Si es true, muestra el ícono de información
     */
    showInfo: {
      type: Boolean,
      default: true
    },
    /**
     * Si es true, permite la creación de tickets
     */
    allowTicketCreation: {
      type: Boolean,
      default: true
    },
    /**
     * Otros equipos asignados al cliente
     */
    otherEquipment: {
      type: Array,
      default: () => []
    },
    /**
     * Límite de equipos a mostrar en la lista
     */
    equipmentLimit: {
      type: Number,
      default: 3
    },
    /**
     * Tamaño del badge: 'small', 'medium' (default), 'large'
     */
    size: {
      type: String,
      default: 'medium',
      validator: value => ['small', 'medium', 'large'].includes(value)
    },
    /**
     * Si es true, muestra información resumida de la asignación
     */
    showAssignmentInfo: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      showDetails: false,
      showAllEquipment: false
    };
  },
  computed: {
    /**
     * Clases CSS para el badge
     */
    badgeClass() {
      return [
        `size-${this.size}`,
        { 'clickable': this.showInfo && this.hasClientInfo }
      ];
    },
    
    /**
     * Verificar si hay información del cliente para mostrar
     */
    hasClientInfo() {
      return this.client && 
        (this.client.email || 
         this.client.phone || 
         this.client.address ||
         this.hasPlanInfo ||
         this.hasAssignmentInfo ||
         this.hasAssignedEquipment);
    },
    
    /**
     * Verificar si hay información del plan
     */
    hasPlanInfo() {
      return this.client &&
        (this.client.plan || 
         this.client.planSpeed || 
         this.client.sector || 
         this.client.node);
    },
    
    /**
     * Verificar si hay información de asignación
     */
    hasAssignmentInfo() {
      return this.assignmentDate || 
        this.assignmentType || 
        this.assignmentNotes || 
        this.returnDate;
    },
    
    /**
     * Verificar si hay otros equipos asignados
     */
    hasAssignedEquipment() {
      return this.otherEquipment && this.otherEquipment.length > 0;
    },
    
    /**
     * Nombre completo del cliente
     */
    clientFullName() {
      if (!this.client) return '';
      
      const firstName = this.client.firstName || '';
      const lastName = this.client.lastName || '';
      
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      } else if (firstName) {
        return firstName;
      } else if (lastName) {
        return lastName;
      } else {
        return this.client.name || 'Sin nombre';
      }
    },
    
    /**
     * Nombre para mostrar en el badge
     */
    displayName() {
      if (this.size === 'small') {
        // Para tamaño pequeño, mostrar solo el primer nombre o iniciales
        return this.client.firstName || this.initials;
      }
      
      return this.clientFullName;
    },
    
    /**
     * Iniciales del cliente
     */
    initials() {
      if (!this.client) return '?';
      
      const firstName = this.client.firstName || '';
      const lastName = this.client.lastName || '';
      
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
      } else if (firstName) {
        return firstName.charAt(0).toUpperCase();
      } else if (lastName) {
        return lastName.charAt(0).toUpperCase();
      } else if (this.client.name) {
        return this.client.name.charAt(0).toUpperCase();
      } else {
        return '?';
      }
    },
    
    /**
     * Información resumida de la asignación
     */
    assignmentInfo() {
      if (!this.showAssignmentInfo) return '';
      
      if (this.isTemporary && this.formattedReturnDate) {
        return `(Temp. hasta ${this.formattedReturnDate})`;
      } else if (this.formattedAssignmentDate) {
        return `(Desde ${this.formattedAssignmentDate})`;
      }
      
      return '';
    },
    
    /**
     * Fecha de asignación formateada
     */
    formattedAssignmentDate() {
      return this.formatDate(this.assignmentDate);
    },
    
    /**
     * Fecha de devolución formateada
     */
    formattedReturnDate() {
      return this.formatDate(this.returnDate);
    },
    
    /**
     * Verificar si es una asignación temporal
     */
    isTemporary() {
      return this.assignmentType === 'temporary' || this.assignmentType === 'loaner' || this.returnDate;
    },
    
    /**
     * Clase CSS para la fecha de devolución
     */
    returnDateClass() {
      if (!this.returnDate) return '';
      
      try {
        const today = new Date();
        const returnDate = new Date(this.returnDate);
        
        if (isNaN(returnDate.getTime())) return '';
        
        // Si la fecha ya pasó
        if (returnDate < today) {
          return 'text-danger';
        }
        
        // Si la fecha está cerca (próximos 3 días)
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);
        
        if (returnDate <= threeDaysFromNow) {
          return 'text-warning';
        }
        
        return 'text-success';
      } catch (error) {
        console.error('Error al calcular clase para fecha de devolución:', error);
        return '';
      }
    },
    
    /**
     * Equipos a mostrar en la lista
     */
    equipmentToShow() {
      if (!this.otherEquipment || this.otherEquipment.length === 0) {
        return [];
      }
      
      if (this.showAllEquipment) {
        return this.otherEquipment;
      }
      
      return this.otherEquipment.slice(0, this.equipmentLimit);
    },
    
    /**
     * Verificar si hay más equipos que el límite
     */
    hasMoreEquipment() {
      return this.otherEquipment && this.otherEquipment.length > this.equipmentLimit;
    }
  },
  methods: {
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
     * Obtener tooltip con información resumida
     */
    getTooltip() {
      let tooltip = this.clientFullName;
      
      if (this.client.email) {
        tooltip += ` | ${this.client.email}`;
      }
      
      if (this.client.phone) {
        tooltip += ` | ${this.client.phone}`;
      }
      
      if (this.client.plan) {
        tooltip += ` | Plan: ${this.client.plan}`;
      }
      
      return tooltip;
    },
    
    /**
     * Obtener etiqueta para un estado específico
     */
    getStatusLabel(status) {
      const statusMap = {
        active: 'Activo',
        inactive: 'Inactivo',
        suspended: 'Suspendido',
        pending: 'Pendiente',
        available: 'Disponible',
        inUse: 'En uso',
        defective: 'Defectuoso',
        inRepair: 'En reparación',
        retired: 'Retirado'
      };
      
      return statusMap[status] || status;
    },
    
    /**
     * Obtener etiqueta para un tipo de asignación
     */
    getAssignmentTypeLabel(type) {
      const typeMap = {
        installation: 'Instalación',
        replacement: 'Reemplazo',
        temporary: 'Temporal',
        loaner: 'Préstamo'
      };
      
      return typeMap[type] || type;
    },
    
    /**
     * Obtener ícono para un tipo de equipo
     */
    getEquipmentIcon(type) {
      const iconMap = {
        router: 'icon-router',
        antenna: 'icon-antenna',
        switch: 'icon-switch',
        cable: 'icon-cable',
        accessory: 'icon-accessory'
      };
      
      return iconMap[type] || 'icon-device';
    }
  }
};
</script>

<style scoped>
.client-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  position: relative;
  white-space: nowrap;
}

/* Tamaños */
.client-badge.size-small {
  padding: 2px 6px;
  font-size: 11px;
}

.client-badge.size-large {
  padding: 6px 10px;
  font-size: 14px;
}

/* Estilo cuando es clickable */
.client-badge.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.client-badge.clickable:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: var(--hover-bg, #f0f0f0);
}

/* Avatar del cliente */
.client-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.size-small .client-avatar {
  width: 16px;
  height: 16px;
}

.size-large .client-avatar {
  width: 24px;
  height: 24px;
}

.client-avatar.large {
  width: 48px;
  height: 48px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background-color: var(--primary-light, #e3f2fd);
  color: var(--primary-color, #1976d2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.size-small .avatar-placeholder {
  font-size: 8px;
}

.size-large .avatar-placeholder {
  font-size: 12px;
}

.client-avatar.large .avatar-placeholder {
  font-size: 18px;
}

/* Nombre del cliente */
.client-name {
  font-weight: 500;
}

/* Información de asignación */
.assignment-info {
  font-weight: normal;
  opacity: 0.8;
  font-size: 0.9em;
  margin-left: 4px;
}

/* Icono de información */
.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-size: 10px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.info-icon:hover {
  opacity: 1;
}

/* Panel de detalles */
.client-details {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  width: 320px;
  background-color: var(--bg-primary, white);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-weight: normal;
  text-align: left;
  white-space: normal;
}

.client-details::before {
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

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.details-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.btn-close {
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

.btn-close:hover {
  background-color: var(--hover-bg, #f0f0f0);
}

.details-body {
  padding: 16px;
  font-size: 13px;
  color: var(--text-primary, #333);
}

/* Encabezado del cliente */
.client-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.client-header-info {
  flex: 1;
}

.client-full-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
  display: flex;
  align-items: center;
  gap: 8px;
}

.client-code {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, #666);
}

/* Indicador de estado */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.status-active {
  background-color: var(--success-color, #4caf50);
}

.status-dot.status-inactive {
  background-color: var(--text-secondary, #9e9e9e);
}

.status-dot.status-suspended {
  background-color: var(--warning-color, #ff9800);
}

.status-dot.status-pending {
  background-color: var(--info-color, #2196f3);
}

/* Información de contacto */
.contact-info {
  margin-bottom: 16px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--text-secondary, #666);
  margin-right: 8px;
}

.info-value {
  flex: 1;
}

/* Información del plan */
.plan-info, .assignment-details, .assigned-equipment {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.plan-info h5, .assignment-details h5, .assigned-equipment h5 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.plan-details .info-row {
  display: flex;
  margin-bottom: 6px;
}

.info-row .label {
  width: 85px;
  color: var(--text-secondary, #666);
  font-weight: 500;
}

.info-row .value {
  flex: 1;
}

.plan-name {
  font-weight: 500;
}

/* Notas */
.info-row.notes {
  flex-direction: column;
}

.info-row.notes .label {
  width: 100%;
  margin-bottom: 4px;
}

.info-row.notes .value {
  padding: 8px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  white-space: pre-line;
}

/* Colores para fechas */
.text-danger {
  color: var(--error-color, #f44336);
}

.text-warning {
  color: var(--warning-color, #ff9800);
}

.text-success {
  color: var(--success-color, #4caf50);
}

/* Lista de equipos */
.equipment-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.equipment-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light, #f0f0f0);
}

.equipment-list li:last-child {
  border-bottom: none;
}

.equipment-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.equipment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  color: var(--text-secondary, #666);
}

.equipment-name {
  font-size: 12px;
}

.equipment-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 12px;
  background-color: var(--bg-secondary, #f5f5f5);
}

.equipment-status.status-available {
  background-color: var(--success-light, #e8f5e9);
  color: var(--success-color, #2e7d32);
}

.equipment-status.status-inUse {
  background-color: var(--warning-light, #fff3e0);
  color: var(--warning-color, #ef6c00);
}

.equipment-status.status-defective {
  background-color: var(--error-light, #ffebee);
  color: var(--error-color, #c62828);
}

.equipment-status.status-inRepair {
  background-color: var(--info-light, #e3f2fd);
  color: var(--info-color, #1565c0);
}

.equipment-status.status-retired {
  background-color: var(--neutral-light, #f5f5f5);
  color: var(--text-secondary, #757575);
}

.more-equipment {
  margin-top: 8px;
  text-align: center;
}

.btn-link {
  background: transparent;
  border: none;
  color: var(--primary-color, #1976d2);
  padding: 0;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.btn-link:hover {
  color: var(--primary-dark, #1565c0);
}

/* Pie del panel */
.details-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Botones estándar */
.btn-primary, .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--primary-color, #1976d2);
  color: white;
  border: none;
}

.btn-primary:hover {
  background-color: var(--primary-dark, #1565c0);
}

.btn-secondary {
  background-color: transparent;
  color: var(--primary-color, #1976d2);
  border: 1px solid var(--primary-color, #1976d2);
}

.btn-secondary:hover {
  background-color: var(--primary-lightest, #e3f2fd);
}
</style>