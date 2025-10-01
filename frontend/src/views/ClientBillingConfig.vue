<template>
  <div class="client-billing-config">
    <div class="header">
      <div class="header-info">
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
        <div class="client-title">
          <h2>Configuración de Facturación</h2>
          <div class="client-info" v-if="client.id">
            <span class="client-name">{{ client.firstName }} {{ client.lastName }}</span>
            <span class="client-id">#{{ client.id }}</span>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <button @click="viewClient" class="action-btn view-client">
          👤 Ver Cliente
        </button>
        <button @click="viewInvoices" class="action-btn view-invoices">
          📄 Ver Facturas
        </button>
        <button @click="generateInvoice" class="action-btn generate">
          ⚡ Generar Factura
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando configuración de facturación...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="config-content">
      <!-- Estado actual del cliente -->
      <div class="status-overview">
        <div class="status-card">
          <div class="status-header">
            <h3>Estado Actual</h3>
            <span :class="['status-badge', getStatusInfo(billingConfig.clientStatus).class]">
              {{ getStatusInfo(billingConfig.clientStatus).label }}
            </span>
          </div>
          
          <div class="status-details">
            <div class="detail-item">
              <span class="label">Último Pago:</span>
              <span class="value">{{ formatDate(billingConfig.lastPaymentDate) || 'Sin registros' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Próximo Vencimiento:</span>
              <span class="value" :class="{ overdue: isOverdue(billingConfig.nextDueDate) }">
                {{ formatDate(billingConfig.nextDueDate) || 'No programado' }}
              </span>
            </div>
            <div class="detail-item" v-if="billingConfig.nextDueDate">
              <span class="label">Días para Vencimiento:</span>
              <span class="value" :class="getDaysClass(daysUntilDue)">
                {{ daysUntilDue }} días
              </span>
            </div>
          </div>
        </div>

        <div class="payment-summary">
          <h3>Resumen de Pagos</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Tarifa Mensual:</span>
              <span class="value">${{ formatNumber(billingConfig.monthlyFee) }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Deuda Actual:</span>
              <span class="value debt" v-if="currentDebt > 0">${{ formatNumber(currentDebt) }}</span>
              <span class="value no-debt" v-else>Sin deuda</span>
            </div>
            <div class="summary-item">
              <span class="label">Días de Gracia:</span>
              <span class="value">{{ billingConfig.graceDays || 0 }} días</span>
            </div>
            <div class="summary-item" v-if="billingConfig.penaltyFee > 0">
              <span class="label">Recargo por Mora:</span>
              <span class="value">${{ formatNumber(billingConfig.penaltyFee) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuración principal -->
      <form @submit.prevent="saveConfiguration" class="config-form">
        <div class="config-sections">
          <!-- Configuración de servicio -->
          <div class="config-section">
            <h3>Configuración de Servicio</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="servicePackage">Paquete de Servicio *</label>
                <select 
                  id="servicePackage" 
                  v-model="billingConfig.servicePackageId" 
                  required
                  @change="updateServicePackage"
                >
                  <option value="">Seleccionar paquete</option>
                  <option 
                    v-for="servicePackage in servicePackages" 
                    :key="servicePackage.id" 
                    :value="servicePackage.id"
                  >
                    {{ servicePackage.name }} - ${{ formatNumber(servicePackage.price) }}/mes
                    ({{ servicePackage.downloadSpeedMbps }}Mbps ↓ / {{ servicePackage.uploadSpeedMbps }}Mbps ↑)
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="ipPool">Pool de IPs *</label>
                <select 
                  id="ipPool" 
                  v-model="billingConfig.currentIpPoolId" 
                  required
                >
                  <option value="">Seleccionar pool</option>
                  <option 
                    v-for="pool in ipPools" 
                    :key="pool.id" 
                    :value="pool.id"
                  >
                    {{ pool.poolName }} ({{ pool.networkAddress }})
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="monthlyFee">Tarifa Mensual Personalizada</label>
                <div class="input-with-currency">
                  <span class="currency">$</span>
                  <input 
                    type="number" 
                    id="monthlyFee"
                    v-model="billingConfig.monthlyFee"
                    step="0.01"
                    min="0"
                    placeholder="Usar precio del paquete"
                  />
                </div>
                <small>Dejar vacío para usar el precio estándar del paquete</small>
              </div>

              <div class="form-group">
                <label for="clientStatus">Estado del Cliente *</label>
                <select id="clientStatus" v-model="billingConfig.clientStatus" required>
                  <option value="active">Activo</option>
                  <option value="suspended">Suspendido</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="pending">Pendiente</option>
                  <option value="grace_period">Período de Gracia</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Configuración de facturación -->
          <div class="config-section">
            <h3>Configuración de Facturación</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label for="billingDay">Día de Facturación *</label>
                <select id="billingDay" v-model="billingConfig.billingDay" required>
                  <option v-for="day in 31" :key="day" :value="day">
                    Día {{ day }} de cada mes
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="paymentMethod">Método de Pago Preferido</label>
                <select id="paymentMethod" v-model="billingConfig.paymentMethod">
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="online">Pago en Línea</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="paypal">PayPal</option>
                  <option value="spei">SPEI</option>
                  <option value="oxxo">OXXO</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="graceDays">Días de Gracia</label>
                <input 
                  type="number" 
                  id="graceDays"
                  v-model="billingConfig.graceDays"
                  min="0"
                  max="30"
                />
                <small>Días adicionales después del vencimiento antes de aplicar recargos</small>
              </div>

              <div class="form-group">
                <label for="penaltyFee">Recargo por Mora</label>
                <div class="input-with-currency">
                  <span class="currency">$</span>
                  <input 
                    type="number" 
                    id="penaltyFee"
                    v-model="billingConfig.penaltyFee"
                    step="0.01"
                    min="0"
                  />
                </div>
                <small>Monto fijo por atraso en el pago</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="lastPaymentDate">Fecha del Último Pago</label>
                <input 
                  type="date" 
                  id="lastPaymentDate"
                  v-model="billingConfig.lastPaymentDate"
                />
              </div>

              <div class="form-group">
                <label for="nextDueDate">Próxima Fecha de Vencimiento</label>
                <input 
                  type="date" 
                  id="nextDueDate"
                  v-model="billingConfig.nextDueDate"
                />
              </div>
            </div>
          </div>

          <!-- Configuración avanzada -->
          <div class="config-section advanced">
            <div class="section-header" @click="toggleAdvanced">
              <h3>Configuración Avanzada</h3>
              <span class="toggle-icon" :class="{ expanded: showAdvanced }">▼</span>
            </div>
            
            <div v-show="showAdvanced" class="advanced-content">
              <div class="form-row">
                <div class="form-group">
                  <label for="promoDiscount">Descuento Promocional (%)</label>
                  <input 
                    type="number" 
                    id="promoDiscount"
                    v-model="billingConfig.promoDiscount"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <small>Porcentaje de descuento sobre la tarifa mensual</small>
                </div>

                <div class="form-group">
                  <label for="promoEndDate">Fin de Promoción</label>
                  <input 
                    type="date" 
                    id="promoEndDate"
                    v-model="billingConfig.promoEndDate"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="customBillingCycle">Ciclo de Facturación Personalizado</label>
                  <select id="customBillingCycle" v-model="billingConfig.customBillingCycle">
                    <option value="">Mensual (estándar)</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="semiannual">Semestral</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      v-model="billingConfig.autoSuspend"
                    />
                    Suspensión Automática por Falta de Pago
                  </label>
                  <small>Suspender servicios automáticamente después del período de gracia</small>
                </div>
              </div>

              <div class="form-group">
                <label for="billingNotes">Notas de Facturación</label>
                <textarea 
                  id="billingNotes"
                  v-model="billingConfig.billingNotes"
                  rows="3"
                  placeholder="Notas especiales para la facturación de este cliente..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="form-actions">
          <button type="button" @click="resetForm" class="btn-reset">
            Resetear
          </button>
          <button type="button" @click="previewInvoice" class="btn-preview">
            Vista Previa de Factura
          </button>
          <button type="submit" class="btn-save" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
          </button>
        </div>
      </form>

      <!-- Historial de cambios -->
      <div class="change-history">
        <h3>Historial de Cambios</h3>
        <div v-if="changeHistory.length === 0" class="no-history">
          No hay cambios registrados en la configuración.
        </div>
        <div v-else class="history-timeline">
          <div v-for="change in changeHistory" :key="change.id" class="history-item">
            <div class="history-icon">
              {{ getChangeIcon(change.changeType) }}
            </div>
            <div class="history-content">
              <div class="history-description">{{ change.description }}</div>
              <div class="history-details" v-if="change.oldValue || change.newValue">
                <span class="old-value">{{ change.oldValue }}</span>
                →
                <span class="new-value">{{ change.newValue }}</span>
              </div>
              <div class="history-meta">
                <span class="history-user">{{ change.userName }}</span>
                <span class="history-date">{{ formatDateTime(change.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de vista previa de factura -->
    <div v-if="showPreviewModal" class="modal-overlay" @click="closePreviewModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>Vista Previa de Factura</h3>
          <button @click="closePreviewModal" class="close-btn">×</button>
        </div>
        <div class="preview-content">
          <div class="invoice-preview">
            <div class="preview-header">
              <h4>Factura Proyectada</h4>
              <p>Basada en la configuración actual</p>
            </div>
            
            <div class="preview-details">
              <div class="preview-row">
                <span class="label">Cliente:</span>
                <span class="value">{{ client.firstName }} {{ client.lastName }}</span>
              </div>
              <div class="preview-row">
                <span class="label">Período de Facturación:</span>
                <span class="value">{{ getNextBillingPeriod() }}</span>
              </div>
              <div class="preview-row">
                <span class="label">Servicio:</span>
                <span class="value">{{ getSelectedServicePackage()?.name }}</span>
              </div>
              <div class="preview-row">
                <span class="label">Subtotal:</span>
                <span class="value">${{ formatNumber(calculateSubtotal()) }}</span>
              </div>
              <div class="preview-row" v-if="billingConfig.promoDiscount > 0">
                <span class="label">Descuento ({{ billingConfig.promoDiscount }}%):</span>
                <span class="value discount">-${{ formatNumber(calculateDiscount()) }}</span>
              </div>
              <div class="preview-row total">
                <span class="label">Total:</span>
                <span class="value">${{ formatNumber(calculateTotal()) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BillingService from '../services/billing.service';
import ClientService from '../services/client.service';

export default {
  name: 'ClientBillingConfig',
  data() {
    return {
      client: {},
      billingConfig: {
        clientId: '',
        servicePackageId: '',
        currentIpPoolId: '',
        clientStatus: 'active',
        billingDay: 1,
        lastPaymentDate: '',
        nextDueDate: '',
        monthlyFee: '',
        paymentMethod: 'cash',
        graceDays: 3,
        penaltyFee: 0,
        promoDiscount: 0,
        promoEndDate: '',
        customBillingCycle: '',
        autoSuspend: true,
        billingNotes: ''
      },
      servicePackages: [],
      ipPools: [],
      changeHistory: [],
      loading: true,
      saving: false,
      error: null,
      showAdvanced: false,
      showPreviewModal: false,
      originalConfig: {}
    };
  },
  computed: {
    daysUntilDue() {
      if (!this.billingConfig.nextDueDate) return null;
      const today = new Date();
      const dueDate = new Date(this.billingConfig.nextDueDate);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    },
    currentDebt() {
      // Calcular deuda actual basada en facturas pendientes
      // Esto normalmente vendría del backend
      return 0;
    }
  },
  created() {
    this.loadClientBillingConfig();
    this.loadServicePackages();
    this.loadIpPools();
  },
  methods: {
    async loadClientBillingConfig() {
      this.loading = true;
      try {
        const clientId = this.$route.params.id;
        
        // Cargar información del cliente
        const clientResponse = await ClientService.getClient(clientId);
        this.client = clientResponse.data;
        
        // Cargar configuración de facturación
        try {
          const billingResponse = await BillingService.getClientBillingByClientId(clientId);
          this.billingConfig = {
            ...this.billingConfig,
            ...billingResponse.data
          };
        } catch (error) {
          // Si no existe configuración, crear una nueva
          this.billingConfig.clientId = clientId;
        }
        
        // Guardar configuración original para comparar cambios
        this.originalConfig = { ...this.billingConfig };
        
        // Simular historial de cambios
        this.changeHistory = [
          {
            id: 1,
            changeType: 'created',
            description: 'Configuración de facturación creada',
            oldValue: null,
            newValue: null,
            userName: 'Admin',
            createdAt: this.client.createdAt
          }
        ];

      } catch (error) {
        console.error('Error cargando configuración:', error);
        this.error = 'Error cargando la configuración de facturación.';
      } finally {
        this.loading = false;
      }
    },

    async loadServicePackages() {
      try {
        const response = await ClientService.getServicePackages();
        this.servicePackages = response.data;
      } catch (error) {
        console.error('Error cargando paquetes de servicio:', error);
      }
    },

    async loadIpPools() {
      try {
        // Implementar carga de pools de IP
        this.ipPools = [
          { id: 1, poolName: 'Pool Principal', networkAddress: '192.168.1.0/24' },
          { id: 2, poolName: 'Pool Empresarial', networkAddress: '10.0.0.0/24' }
        ];
      } catch (error) {
        console.error('Error cargando pools de IP:', error);
      }
    },

    updateServicePackage() {
      const selectedPackage = this.getSelectedServicePackage();
      if (selectedPackage && !this.billingConfig.monthlyFee) {
        this.billingConfig.monthlyFee = selectedPackage.price;
      }
    },

    getSelectedServicePackage() {
      return this.servicePackages.find(pkg => pkg.id == this.billingConfig.servicePackageId);
    },

    async saveConfiguration() {
      this.saving = true;
      try {
        // Validar configuración
        const errors = BillingService.validateBillingData(this.billingConfig);
        if (errors.length > 0) {
          alert('Errores en la configuración:\n' + errors.join('\n'));
          return;
        }

        // Guardar configuración
        if (this.billingConfig.id) {
          await BillingService.updateClientBilling(this.billingConfig.id, this.billingConfig);
        } else {
          await BillingService.createClientBilling(this.billingConfig);
        }

        alert('Configuración guardada exitosamente');
        this.originalConfig = { ...this.billingConfig };
        
        // Recargar configuración
        this.loadClientBillingConfig();

      } catch (error) {
        console.error('Error guardando configuración:', error);
        alert('Error guardando la configuración');
      } finally {
        this.saving = false;
      }
    },

    resetForm() {
      if (confirm('¿Está seguro que desea resetear todos los cambios?')) {
        this.billingConfig = { ...this.originalConfig };
      }
    },

    previewInvoice() {
      this.showPreviewModal = true;
    },

    closePreviewModal() {
      this.showPreviewModal = false;
    },

    async generateInvoice() {
      try {
        if (confirm('¿Está seguro que desea generar una nueva factura para este cliente?')) {
          const invoiceData = {
            clientId: this.client.id,
            servicePackageId: this.billingConfig.servicePackageId,
            amount: this.calculateTotal(),
            dueDate: this.calculateNextDueDate()
          };
          
          await BillingService.generateInvoice(this.client.id, invoiceData);
          alert('Factura generada exitosamente');
        }
      } catch (error) {
        console.error('Error generando factura:', error);
        alert('Error generando la factura');
      }
    },

    calculateSubtotal() {
      return parseFloat(this.billingConfig.monthlyFee || 0);
    },

    calculateDiscount() {
      const subtotal = this.calculateSubtotal();
      const discount = parseFloat(this.billingConfig.promoDiscount || 0);
      return (subtotal * discount) / 100;
    },

    calculateTotal() {
      return this.calculateSubtotal() - this.calculateDiscount();
    },

    calculateNextDueDate() {
      const today = new Date();
      const billingDay = parseInt(this.billingConfig.billingDay);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
      return nextMonth.toISOString().split('T')[0];
    },

    getNextBillingPeriod() {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const endOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
      
      return `${this.formatDate(nextMonth.toISOString())} - ${this.formatDate(endOfMonth.toISOString())}`;
    },

    toggleAdvanced() {
      this.showAdvanced = !this.showAdvanced;
    },

    viewClient() {
      this.$router.push(`/clients/${this.client.id}`);
    },

    viewInvoices() {
      this.$router.push(`/billing/invoices?clientId=${this.client.id}`);
    },

    goBack() {
      this.$router.go(-1);
    },

    formatNumber(value) {
      if (!value) return '0.00';
      return parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('es-MX');
    },

    formatDateTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('es-MX');
    },

    isOverdue(dueDate) {
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    },

    getDaysClass(days) {
      if (days === null) return '';
      if (days < 0) return 'overdue';
      if (days <= 3) return 'warning';
      return 'normal';
    },

    getStatusInfo(status) {
      return BillingService.formatBillingStatus(status);
    },

    getChangeIcon(changeType) {
      const icons = {
        'created': '📝',
        'updated': '✏️',
        'suspended': '⏸️',
        'activated': '▶️',
        'payment': '💰',
        'plan_change': '📦'
      };
      return icons[changeType] || '📋';
    }
  }
};
</script>

<style scoped>
.client-billing-config {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.back-button {
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 14px;
  align-self: flex-start;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.client-title h2 {
  margin: 0 0 8px 0;
  color: #333;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.client-name {
  font-weight: 500;
  color: #1976d2;
  font-size: 16px;
}

.client-id {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.action-btn.view-client {
  background-color: #2196F3;
  color: white;
}

.action-btn.view-invoices {
  background-color: #9C27B0;
  color: white;
}

.action-btn.generate {
  background-color: #4CAF50;
  color: white;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.status-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 10px;
}

.status-card, .payment-summary {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-header h3, .payment-summary h3 {
  margin: 0;
  color: #333;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
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

.status-pending {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-grace {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.status-overdue {
  background-color: #ffebee;
  color: #c62828;
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.detail-item .value {
  color: #333;
  font-weight: 500;
}

.overdue {
  color: #f44336;
  font-weight: bold;
}

.warning {
  color: #ff9800;
  font-weight: bold;
}

.normal {
  color: #4caf50;
  font-weight: bold;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-item .value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.summary-item .value.debt {
  color: #f44336;
}

.summary-item .value.no-debt {
  color: #4caf50;
}

.config-form {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.config-sections {
  padding: 0;
}

.config-section {
  padding: 30px;
  border-bottom: 1px solid #eee;
}

.config-section:last-child {
  border-bottom: none;
}

.config-section h3 {
  margin: 0 0 25px 0;
  color: #333;
  font-size: 18px;
}

.config-section.advanced {
  background-color: #f8f9fa;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 0;
}

.section-header:hover h3 {
  color: #1976d2;
}

.toggle-icon {
  font-size: 14px;
  color: #666;
  transition: transform 0.2s;
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

.advanced-content {
  margin-top: 25px;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.form-group textarea {
  resize: vertical;
  font-family: inherit;
}

.form-group small {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}

.input-with-currency {
  position: relative;
  display: flex;
  align-items: center;
}

.currency {
  position: absolute;
  left: 12px;
  color: #666;
  font-weight: 500;
  z-index: 1;
}

.input-with-currency input {
  padding-left: 30px;
}

.form-group label input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  margin-bottom: 0;
}

.form-actions {
  padding: 25px 30px;
  background-color: #f8f9fa;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  border-top: 1px solid #eee;
}

.btn-reset, .btn-preview, .btn-save {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-reset {
  background-color: #f5f5f5;
  color: #666;
}

.btn-preview {
  background-color: #2196F3;
  color: white;
}

.btn-save {
  background-color: #4CAF50;
  color: white;
}

.btn-save:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.btn-reset:hover {
  background-color: #e0e0e0;
}

.btn-preview:hover {
  background-color: #1976d2;
}

.btn-save:hover:not(:disabled) {
  background-color: #45a049;
}

.change-history {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.change-history h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.no-history {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #e0e0e0;
}

.history-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #e3f2fd;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.history-content {
  flex: 1;
}

.history-description {
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.history-details {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.old-value {
  text-decoration: line-through;
  color: #f44336;
}

.new-value {
  color: #4caf50;
  font-weight: 500;
}

.history-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content.large {
  max-width: 700px;
}

.modal-header {
  padding: 25px 25px 0 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #f5f5f5;
}

.preview-content {
  padding: 25px;
}

.invoice-preview {
  border: 1px solid #ddd;
  border-radius: 6px;
  overflow: hidden;
}

.preview-header {
  background-color: #f8f9fa;
  padding: 20px;
  border-bottom: 1px solid #ddd;
}

.preview-header h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.preview-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.preview-details {
  padding: 20px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 0;
}

.preview-row.total {
  border-top: 2px solid #eee;
  margin-top: 15px;
  padding-top: 15px;
  font-weight: bold;
  font-size: 18px;
}

.preview-row .label {
  color: #666;
  font-weight: 500;
}

.preview-row .value {
  color: #333;
  font-weight: 500;
}

.preview-row .value.discount {
  color: #4caf50;
}

@media (max-width: 768px) {
  .client-billing-config {
    padding: 15px;
  }

  .header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .status-overview {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .config-section {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
    align-items: stretch;
    padding: 20px;
  }

  .client-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    text-align: center;
  }

  .config-section {
    padding: 15px;
  }

  .modal-content {
    margin: 20px;
    width: calc(100% - 40px);
  }
}

</style>