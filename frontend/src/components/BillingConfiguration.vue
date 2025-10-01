<template>
  <div class="billing-configuration">
    <div class="billing-grid">
      <!-- Día de facturación -->
      <div class="form-group">
        <label for="billingDay">Día de Facturación *</label>
        <select 
          id="billingDay" 
          :value="billingDay" 
          @change="updateBillingDay($event.target.value)"
          class="form-select"
        >
          <option v-for="day in 31" :key="day" :value="day">
            Día {{ day }}
          </option>
        </select>
        <small class="form-help">
          Día del mes en que se generará la factura
        </small>
      </div>

      <!-- Método de pago preferido -->
      <div class="form-group">
        <label for="paymentMethod">Método de Pago Preferido</label>
        <select 
          id="paymentMethod" 
          :value="paymentMethod" 
          @change="updatePaymentMethod($event.target.value)"
          class="form-select"
        >
          <option value="">Seleccionar método</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="mercadopago">MercadoPago</option>
          <option value="paypal">PayPal</option>
        </select>
        <small class="form-help">
          Método preferido para el pago (opcional)
        </small>
      </div>

      <!-- Días de gracia -->
      <div class="form-group">
        <label for="graceDays">Días de Gracia</label>
        <input 
          type="number" 
          id="graceDays" 
          :value="graceDays"
          @input="updateGraceDays($event.target.value)"
          min="0" 
          max="30"
          class="form-input"
        />
        <small class="form-help">
          Días adicionales antes de suspender por falta de pago
        </small>
      </div>

      <!-- Penalidad por atraso -->
      <div class="form-group">
        <label for="penaltyFee">Penalidad por Atraso</label>
        <div class="input-group">
          <span class="input-prefix">$</span>
          <input 
            type="number" 
            id="penaltyFee" 
            :value="penaltyFee"
            @input="updatePenaltyFee($event.target.value)"
            min="0" 
            step="0.01"
            class="form-input"
            placeholder="0.00"
          />
        </div>
        <small class="form-help">
          Monto adicional por pago tardío
        </small>
      </div>
    </div>

    <!-- Opciones avanzadas -->
    <div class="advanced-options">
      <h4>🔧 Opciones Avanzadas</h4>
      
      <div class="checkbox-grid">
        <!-- Auto crear facturación -->
        <div class="checkbox-group">
          <input 
            type="checkbox" 
            id="autoCreateBilling" 
            :checked="autoCreateBilling"
            @change="updateAutoCreateBilling($event.target.checked)"
          />
          <label for="autoCreateBilling">
            <strong>Facturación Automática</strong>
            <span class="checkbox-description">
              Generar facturas automáticamente cada mes
            </span>
          </label>
        </div>

        <!-- Auto enviar recordatorios -->
        <div class="checkbox-group">
          <input 
            type="checkbox" 
            id="autoSendReminders" 
            :checked="autoSendReminders"
            @change="updateAutoSendReminders($event.target.checked)"
          />
          <label for="autoSendReminders">
            <strong>Recordatorios Automáticos</strong>
            <span class="checkbox-description">
              Enviar recordatorios de pago por email/WhatsApp
            </span>
          </label>
        </div>

        <!-- Auto suspender por falta de pago -->
        <div class="checkbox-group">
          <input 
            type="checkbox" 
            id="autoSuspendOnOverdue" 
            :checked="autoSuspendOnOverdue"
            @change="updateAutoSuspendOnOverdue($event.target.checked)"
          />
          <label for="autoSuspendOnOverdue">
            <strong>Suspensión Automática</strong>
            <span class="checkbox-description">
              Suspender servicio automáticamente si no paga
            </span>
          </label>
        </div>

        <!-- Prorrateado en cambios -->
        <div class="checkbox-group" v-if="showProrationOption">
          <input 
            type="checkbox" 
            id="enableProration" 
            :checked="enableProration"
            @change="updateEnableProration($event.target.checked)"
          />
          <label for="enableProration">
            <strong>Prorrateado</strong>
            <span class="checkbox-description">
              Calcular precio proporcional en cambios de plan
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Preview de configuración -->
    <div class="billing-preview" v-if="showPreview">
      <h4>📋 Resumen de Configuración</h4>
      <div class="preview-grid">
        <div class="preview-item">
          <span class="preview-label">Facturación:</span>
          <span class="preview-value">Día {{ billingDay }} de cada mes</span>
        </div>
        
        <div class="preview-item" v-if="paymentMethod">
          <span class="preview-label">Método preferido:</span>
          <span class="preview-value">{{ getPaymentMethodLabel(paymentMethod) }}</span>
        </div>
        
        <div class="preview-item" v-if="graceDays > 0">
          <span class="preview-label">Días de gracia:</span>
          <span class="preview-value">{{ graceDays }} días</span>
        </div>
        
        <div class="preview-item" v-if="penaltyFee > 0">
          <span class="preview-label">Penalidad:</span>
          <span class="preview-value">${{ penaltyFee }}</span>
        </div>
        
        <div class="preview-item">
          <span class="preview-label">Facturación automática:</span>
          <span class="preview-value" :class="{ 'enabled': autoCreateBilling, 'disabled': !autoCreateBilling }">
            {{ autoCreateBilling ? 'Habilitada' : 'Deshabilitada' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Información contextual según operación -->
    <div class="operation-info" v-if="operationType !== 'CREATE_NEW'">
      <div class="info-box" :class="operationType.toLowerCase()">
        <div class="info-content">
          <h5>{{ getOperationInfoTitle() }}</h5>
          <p>{{ getOperationInfoMessage() }}</p>
          
          <!-- Información específica según operación -->
          <div class="operation-details" v-if="operationType === 'CHANGE_PLAN'">
            <div class="detail-item">
              <span class="detail-label">Próxima factura:</span>
              <span class="detail-value">{{ getNextBillingDate() }}</span>
            </div>
            <div class="detail-item" v-if="enableProration">
              <span class="detail-label">Ajuste prorrateado:</span>
              <span class="detail-value">{{ getProrationAmount() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BillingConfiguration',
  props: {
    billingDay: {
      type: Number,
      default: 1
    },
    paymentMethod: {
      type: String,
      default: ''
    },
    graceDays: {
      type: Number,
      default: 5
    },
    penaltyFee: {
      type: Number,
      default: 0
    },
    autoCreateBilling: {
      type: Boolean,
      default: true
    },
    autoSendReminders: {
      type: Boolean,
      default: true
    },
    autoSuspendOnOverdue: {
      type: Boolean,
      default: false
    },
    enableProration: {
      type: Boolean,
      default: false
    },
    operationType: {
      type: String,
      default: 'CREATE_NEW'
    },
    currentSubscription: {
      type: Object,
      default: null
    },
    showPreview: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'update:billingDay',
    'update:paymentMethod', 
    'update:graceDays',
    'update:penaltyFee',
    'update:autoCreateBilling',
    'update:autoSendReminders',
    'update:autoSuspendOnOverdue',
    'update:enableProration'
  ],
  computed: {
    showProrationOption() {
      return ['CHANGE_PLAN'].includes(this.operationType)
    }
  },
  methods: {
    updateBillingDay(value) {
      this.$emit('update:billingDay', parseInt(value))
    },
    updatePaymentMethod(value) {
      this.$emit('update:paymentMethod', value)
    },
    updateGraceDays(value) {
      this.$emit('update:graceDays', parseInt(value) || 0)
    },
    updatePenaltyFee(value) {
      this.$emit('update:penaltyFee', parseFloat(value) || 0)
    },
    updateAutoCreateBilling(value) {
      this.$emit('update:autoCreateBilling', value)
    },
    updateAutoSendReminders(value) {
      this.$emit('update:autoSendReminders', value)
    },
    updateAutoSuspendOnOverdue(value) {
      this.$emit('update:autoSuspendOnOverdue', value)
    },
    updateEnableProration(value) {
      this.$emit('update:enableProration', value)
    },
    
    getPaymentMethodLabel(method) {
      const labels = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'mercadopago': 'MercadoPago',
        'paypal': 'PayPal'
      }
      return labels[method] || method
    },
    
    getOperationInfoTitle() {
      const titles = {
        'CHANGE_PLAN': '💡 Cambio de Plan',
        'CHANGE_NODE': '🗼 Cambio de Nodo',
        'CHANGE_ZONE': '🌍 Cambio de Zona',
        'CHANGE_ADDRESS': '🏠 Cambio de Domicilio'
      }
      return titles[this.operationType] || 'Información'
    },
    
    getOperationInfoMessage() {
      const messages = {
        'CHANGE_PLAN': 'Los cambios de facturación se aplicarán a partir de la próxima factura.',
        'CHANGE_NODE': 'La configuración de facturación se mantendrá igual tras el cambio de nodo.',
        'CHANGE_ZONE': 'Verifique que los métodos de pago sean compatibles con la nueva zona.',
        'CHANGE_ADDRESS': 'Solo es un cambio de domicilio, la facturación no se ve afectada.'
      }
      return messages[this.operationType] || ''
    },
    
    getNextBillingDate() {
      if (!this.currentSubscription?.nextDueDate) return 'No definida'
      
      const date = new Date(this.currentSubscription.nextDueDate)
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    },
    
    getProrationAmount() {
      // Lógica para calcular prorrateado
      if (!this.enableProration || !this.currentSubscription) return '$0.00'
      
      // Aquí iría la lógica real de cálculo
      return 'Calculando...'
    }
  }
}
</script>

<style scoped>
.billing-configuration {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.billing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 6px;
  color: #333;
  font-size: 0.9em;
}

.form-select, .form-input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
  transition: border-color 0.2s;
}

.form-select:focus, .form-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 10px;
  color: #666;
  z-index: 1;
  font-weight: bold;
}

.input-group .form-input {
  padding-left: 25px;
}

.form-help {
  margin-top: 4px;
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

.advanced-options {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
}

.advanced-options h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 1.1em;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.checkbox-group input[type="checkbox"] {
  margin-top: 2px;
  width: 18px;
  height: 18px;
  accent-color: #4CAF50;
}

.checkbox-group label {
  display: flex;
  flex-direction: column;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group label strong {
  color: #333;
  margin-bottom: 2px;
}

.checkbox-description {
  font-size: 0.85em;
  color: #666;
  line-height: 1.3;
}

.billing-preview {
  background: #e8f5e9;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.billing-preview h4 {
  margin: 0 0 12px 0;
  color: #2e7d32;
  font-size: 1em;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.9em;
}

.preview-label {
  color: #555;
  font-weight: 500;
}

.preview-value {
  color: #2e7d32;
  font-weight: bold;
}

.preview-value.enabled {
  color: #2e7d32;
}

.preview-value.disabled {
  color: #757575;
}

.operation-info {
  margin-top: 20px;
}

.info-box {
  border-radius: 6px;
  padding: 16px;
  border-left: 4px solid;
}

.info-box.change_plan {
  background: #f3e5f5;
  border-left-color: #7b1fa2;
}

.info-box.change_node {
  background: #ffebee;
  border-left-color: #c62828;
}

.info-box.change_zone {
  background: #ffebee;
  border-left-color: #c62828;
}

.info-box.change_address {
  background: #fff3e0;
  border-left-color: #ef6c00;
}

.info-content h5 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 1em;
}

.info-content p {
  margin: 0 0 12px 0;
  color: #555;
  font-size: 0.9em;
  line-height: 1.4;
}

.operation-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
}

.detail-label {
  color: #666;
  font-weight: 500;
}

.detail-value {
  color: #333;
  font-weight: bold;
}

/* Responsive */
@media (max-width: 768px) {
  .billing-grid {
    grid-template-columns: 1fr;
  }
  
  .checkbox-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-grid {
    grid-template-columns: 1fr;
  }
  
  .operation-details {
    grid-template-columns: 1fr;
  }
}
</style>