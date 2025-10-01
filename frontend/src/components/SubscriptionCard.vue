<template>
  <div class="subscription-card" :class="statusClass">
    <div class="card-header">
      <div class="subscription-info">
        <h4 class="package-name">{{ subscription.ServicePackage?.name || 'Paquete no especificado' }}</h4>
        <div class="subscription-status" :class="statusFormatted.class">
          {{ statusFormatted.label }}
        </div>
      </div>
      <div class="subscription-actions" v-if="showActions">
        <button class="action-btn" @click="$emit('edit', subscription)" title="Editar">
          ✏️
        </button>
        <button class="action-btn" @click="toggleActionsMenu" title="Más acciones">
          ⚙️
        </button>
      </div>
    </div>

    <!-- Información principal del paquete -->
    <div class="package-details">
      <div class="speed-info">
        <div class="speed-item">
          <span class="speed-label">Descarga:</span>
          <span class="speed-value">{{ subscription.ServicePackage?.downloadSpeedMbps || 0 }} Mbps</span>
        </div>
        <div class="speed-item">
          <span class="speed-label">Subida:</span>
          <span class="speed-value">{{ subscription.ServicePackage?.uploadSpeedMbps || 0 }} Mbps</span>
        </div>
      </div>
      
      <div class="pricing-info">
        <div class="price-item">
          <span class="price-label">Precio:</span>
          <span class="price-value">${{ displayPrice }}/mes</span>
        </div>
        <div class="billing-day" v-if="subscription.billingDay">
          <span class="billing-label">Facturación día:</span>
          <span class="billing-value">{{ subscription.billingDay }}</span>
        </div>
      </div>
    </div>

    <!-- Información de conexión -->
    <div class="connection-details" v-if="showConnectionDetails">
      <div class="connection-item" v-if="subscription.pppoeUsername">
        <span class="connection-label">Usuario PPPoE:</span>
        <span class="connection-value">{{ subscription.pppoeUsername }}</span>
      </div>
      <div class="connection-item" v-if="subscription.assignedIpAddress">
        <span class="connection-label">IP Asignada:</span>
        <span class="connection-value">{{ subscription.assignedIpAddress }}</span>
      </div>
      <div class="connection-item" v-if="subscription.currentPool">
        <span class="connection-label">Pool IP:</span>
        <span class="connection-value">{{ subscription.currentPool.poolName }}</span>
      </div>
    </div>

    <!-- Fechas importantes -->
    <div class="subscription-dates">
      <div class="date-item">
        <span class="date-label">Inicio:</span>
        <span class="date-value">{{ formatDate(subscription.startDate) }}</span>
      </div>
      <div class="date-item" v-if="subscription.nextDueDate">
        <span class="date-label">Próximo pago:</span>
        <span class="date-value" :class="{ 'overdue': isOverdue }">
          {{ formatDate(subscription.nextDueDate) }}
        </span>
      </div>
      <div class="date-item" v-if="subscription.lastPaymentDate">
        <span class="date-label">Último pago:</span>
        <span class="date-value">{{ formatDate(subscription.lastPaymentDate) }}</span>
      </div>
    </div>

    <!-- Notas si existen -->
    <div class="subscription-notes" v-if="subscription.notes">
      <div class="notes-label">Notas:</div>
      <div class="notes-content">{{ subscription.notes }}</div>
    </div>

    <!-- Menú de acciones expandido -->
    <div class="actions-menu" v-if="showActionsMenu">
      <div class="menu-overlay" @click="closeActionsMenu"></div>
      <div class="menu-content">
        <button 
          class="menu-item" 
          @click="handleAction('change-plan')"
          :disabled="subscription.status === 'cancelled'"
        >
          🔄 Cambiar Plan
        </button>
        
        <button 
          class="menu-item" 
          @click="handleAction('suspend')"
          v-if="subscription.status === 'active'"
        >
          ⏸️ Suspender
        </button>
        
        <button 
          class="menu-item" 
          @click="handleAction('reactivate')"
          v-if="subscription.status === 'suspended' || subscription.status === 'cutService'"
        >
          ▶️ Reactivar
        </button>
        
        <button 
          class="menu-item danger" 
          @click="handleAction('cancel')"
          v-if="subscription.status !== 'cancelled'"
        >
          ❌ Cancelar
        </button>
        
        <button 
          class="menu-item" 
          @click="handleAction('view-details')"
        >
          👁️ Ver Detalles
        </button>
        
        <button 
          class="menu-item" 
          @click="handleAction('payment-history')"
        >
          💰 Historial de Pagos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import SubscriptionService from '../services/subscription.service';

export default {
  name: 'SubscriptionCard',
  props: {
    subscription: {
      type: Object,
      required: true
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showConnectionDetails: {
      type: Boolean,
      default: false
    },
    compact: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showActionsMenu: false
    };
  },
computed: {
  statusFormatted() {
    return SubscriptionService.formatSubscriptionStatus(this.subscription.status);
  },
  statusClass() {
    return `subscription-${this.subscription.status}`;
  },
  displayPrice() {
    // Obtener el precio, manejando que puede venir como string
    let price = 0;
    
    // Priorizar precio personalizado (monthlyFee) si existe y es diferente al del paquete
    if (this.subscription.monthlyFee) {
      const monthlyFee = parseFloat(this.subscription.monthlyFee);
      const packagePrice = parseFloat(this.subscription.ServicePackage?.price || 0);
      
      // Si el monthlyFee es diferente al precio del paquete, usar el personalizado
      if (!isNaN(monthlyFee) && monthlyFee !== packagePrice) {
        price = monthlyFee;
      } else {
        // Si son iguales, usar el del paquete
        price = packagePrice;
      }
    } else {
      // Si no hay monthlyFee, usar el precio del paquete
      price = parseFloat(this.subscription.ServicePackage?.price || 0);
    }
    
    // Asegurar que es un número válido antes de usar toFixed
    return !isNaN(price) ? price.toFixed(2) : '0.00';
  },
  isOverdue() {
    if (!this.subscription.nextDueDate) return false;
    return new Date(this.subscription.nextDueDate) < new Date();
  }
},

  methods: {
    formatDate(dateString) {
      if (!dateString) return 'No especificada';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    toggleActionsMenu() {
      this.showActionsMenu = !this.showActionsMenu;
    },
    closeActionsMenu() {
      this.showActionsMenu = false;
    },
    handleAction(action) {
      this.closeActionsMenu();
      
      switch (action) {
        case 'change-plan':
          this.$emit('change-plan', this.subscription);
          break;
        case 'suspend':
          this.$emit('suspend', this.subscription);
          break;
        case 'reactivate':
          this.$emit('reactivate', this.subscription);
          break;
        case 'cancel':
          this.$emit('cancel', this.subscription);
          break;
        case 'view-details':
          this.$emit('view-details', this.subscription);
          break;
        case 'payment-history':
          this.$emit('payment-history', this.subscription);
          break;
        default:
          console.warn('Acción no reconocida:', action);
      }
    }
  }
};
</script>

<style scoped>
.subscription-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid #e0e0e0;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.subscription-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Estados de suscripción */
.subscription-active {
  border-left-color: #4CAF50;
}

.subscription-suspended {
  border-left-color: #FF9800;
  background-color: #fff8e1;
}

.subscription-cancelled {
  border-left-color: #F44336;
  background-color: #ffebee;
  opacity: 0.8;
}

.subscription-cutService {
  border-left-color: #9C27B0;
  background-color: #f3e5f5;
}

/* Header de la tarjeta */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.subscription-info h4 {
  margin: 0 0 4px 0;
  font-size: 1.1em;
  color: #333;
}

.subscription-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
}

.status-active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-suspended {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.status-cut {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.status-pending {
  background-color: #e3f2fd;
  color: #1565c0;
}

/* Acciones */
.subscription-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #f5f5f5;
}

/* Detalles del paquete */
.package-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.speed-info, .pricing-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.speed-item, .price-item, .billing-day {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.speed-label, .price-label, .billing-label {
  font-size: 0.9em;
  color: #666;
}

.speed-value, .price-value, .billing-value {
  font-weight: bold;
  color: #333;
}

.price-value {
  color: #4CAF50;
  font-size: 1.1em;
}

/* Detalles de conexión */
.connection-details {
  margin-bottom: 12px;
  padding: 8px;
  background-color: #f0f4f8;
  border-radius: 4px;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 0.9em;
}

.connection-label {
  color: #666;
}

.connection-value {
  font-family: monospace;
  font-weight: bold;
}

/* Fechas */
.subscription-dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.date-item {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.date-label {
  font-size: 0.8em;
  color: #666;
  margin-bottom: 2px;
}

.date-value {
  font-size: 0.9em;
  font-weight: bold;
}

.date-value.overdue {
  color: #F44336;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

/* Notas */
.subscription-notes {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.notes-label {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 4px;
}

.notes-content {
  font-size: 0.9em;
  color: #333;
  font-style: italic;
}

/* Menú de acciones */
.actions-menu {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}

.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.menu-content {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  padding: 8px;
  min-width: 180px;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.danger {
  color: #F44336;
}

.menu-item.danger:hover {
  background-color: #ffebee;
}

/* Responsive */
@media (max-width: 768px) {
  .package-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .subscription-dates {
    grid-template-columns: 1fr 1fr;
  }
  
  .menu-content {
    right: 8px;
    min-width: 160px;
  }
}
</style>