<template>
  <div class="invoice-detail">
    <div class="header">
      <div class="header-info">
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
        <div class="invoice-title">
          <h2>Factura {{ invoice.invoiceNumber }}</h2>
          <span :class="['status-badge', getStatusInfo(invoice.status).class]">
            {{ getStatusInfo(invoice.status).label }}
          </span>
        </div>
      </div>
      
      <div class="header-actions">
        <button @click="downloadPDF" class="action-btn download">
          📄 Descargar PDF
        </button>
        <button 
          v-if="canEdit"
          @click="editInvoice" 
          class="action-btn edit"
        >
          ✏️ Editar
        </button>
        <button 
          v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
          @click="markAsPaid" 
          class="action-btn paid"
        >
          ✅ Marcar como Pagada
        </button>
        <button 
          v-if="invoice.status !== 'cancelled'"
          @click="cancelInvoice" 
          class="action-btn cancel"
        >
          ❌ Cancelar
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando detalles de la factura...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="invoice-content">
      <!-- Información principal -->
      <div class="main-info">
        <div class="invoice-details">
          <div class="detail-section">
            <h3>Información de la Factura</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Número de Factura:</span>
                <span class="value invoice-number">{{ invoice.invoiceNumber }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Emisión:</span>
                <span class="value">{{ formatDate(invoice.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Vencimiento:</span>
                <span class="value" :class="{ overdue: isOverdue(invoice.dueDate) }">
                  {{ formatDate(invoice.dueDate) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Período de Facturación:</span>
                <span class="value">
                  {{ formatDate(invoice.billingPeriodStart) }} - {{ formatDate(invoice.billingPeriodEnd) }}
                </span>
              </div>
              <div class="detail-item" v-if="invoice.status === 'overdue'">
                <span class="label">Días Vencidos:</span>
                <span class="value overdue-days">{{ calculateOverdueDays(invoice.dueDate) }} días</span>
              </div>
              <div class="detail-item" v-if="invoice.paidAt">
                <span class="label">Fecha de Pago:</span>
                <span class="value">{{ formatDate(invoice.paidAt) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Información del Cliente</h3>
            <div class="client-info">
              <div class="client-main">
                <h4>{{ invoice.clientName }}</h4>
                <p v-if="invoice.clientEmail">📧 {{ invoice.clientEmail }}</p>
                <p v-if="invoice.clientPhone">📞 {{ invoice.clientPhone }}</p>
                <p v-if="invoice.clientAddress">📍 {{ invoice.clientAddress }}</p>
              </div>
              <div class="client-actions">
                <button @click="viewClient" class="link-btn">
                  Ver Cliente
                </button>
                <button @click="sendReminder" class="link-btn">
                  Enviar Recordatorio
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen financiero -->
        <div class="financial-summary">
          <div class="summary-card">
            <h3>Resumen Financiero</h3>
            <div class="amount-breakdown">
              <div class="amount-row">
                <span class="label">Subtotal:</span>
                <span class="value">${{ formatNumber(invoice.amount) }}</span>
              </div>
              <div class="amount-row" v-if="invoice.taxAmount > 0">
                <span class="label">Impuestos:</span>
                <span class="value">${{ formatNumber(invoice.taxAmount) }}</span>
              </div>
              <div class="amount-row" v-if="invoice.discountAmount > 0">
                <span class="label">Descuento:</span>
                <span class="value discount">-${{ formatNumber(invoice.discountAmount) }}</span>
              </div>
              <div class="amount-row total">
                <span class="label">Total:</span>
                <span class="value">${{ formatNumber(invoice.totalAmount) }}</span>
              </div>
            </div>

            <div class="payment-status">
              <div class="payment-row">
                <span class="label">Pagado:</span>
                <span class="value">${{ formatNumber(paidAmount) }}</span>
              </div>
              <div class="payment-row">
                <span class="label">Pendiente:</span>
                <span class="value pending">${{ formatNumber(pendingAmount) }}</span>
              </div>
            </div>

            <div v-if="invoice.status === 'overdue'" class="penalty-info">
              <div class="penalty-row">
                <span class="label">Recargo por Mora:</span>
                <span class="value penalty">${{ formatNumber(penaltyAmount) }}</span>
              </div>
              <div class="penalty-row total-with-penalty">
                <span class="label">Total con Recargo:</span>
                <span class="value">${{ formatNumber(totalWithPenalty) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalles de servicios -->
      <div class="services-section">
        <h3>Servicios Facturados</h3>
        <div class="services-table">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Descripción</th>
                <th>Período</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoiceItems" :key="item.id">
                <td class="service-name">{{ item.serviceName }}</td>
                <td class="service-description">{{ item.description }}</td>
                <td>{{ formatPeriod(item.periodStart, item.periodEnd) }}</td>
                <td class="quantity">{{ item.quantity || 1 }}</td>
                <td class="unit-price">${{ formatNumber(item.unitPrice) }}</td>
                <td class="item-total">${{ formatNumber(item.totalPrice) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historial de pagos -->
      <div class="payments-section">
        <div class="section-header">
          <h3>Historial de Pagos</h3>
          <button 
            v-if="invoice.status !== 'paid' && invoice.status !== 'cancelled'"
            @click="registerPayment" 
            class="add-payment-btn"
          >
            + Registrar Pago
          </button>
        </div>

        <div v-if="payments.length === 0" class="no-payments">
          No hay pagos registrados para esta factura.
        </div>

        <div v-else class="payments-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.id">
                <td>{{ formatDateTime(payment.paymentDate) }}</td>
                <td class="amount">${{ formatNumber(payment.amount) }}</td>
                <td>{{ formatPaymentMethod(payment.paymentMethod) }}</td>
                <td class="reference">{{ payment.paymentReference || '-' }}</td>
                <td>
                  <span :class="['status-badge', getPaymentStatusInfo(payment.status).class]">
                    {{ getPaymentStatusInfo(payment.status).label }}
                  </span>
                </td>
                <td class="actions">
                  <button @click="viewPayment(payment)" class="action-btn view">
                    👁️
                  </button>
                  <button 
                    v-if="payment.receiptPath"
                    @click="downloadPaymentReceipt(payment)" 
                    class="action-btn download"
                  >
                    📄
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Notas y comentarios -->
      <div class="notes-section" v-if="invoice.notes || comments.length > 0">
        <h3>Notas y Comentarios</h3>
        
        <div v-if="invoice.notes" class="invoice-notes">
          <h4>Notas de la Factura:</h4>
          <p>{{ invoice.notes }}</p>
        </div>

        <div v-if="comments.length > 0" class="comments">
          <h4>Comentarios:</h4>
          <div v-for="comment in comments" :key="comment.id" class="comment">
            <div class="comment-header">
              <span class="comment-author">{{ comment.userName }}</span>
              <span class="comment-date">{{ formatDateTime(comment.createdAt) }}</span>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
        </div>

        <div class="add-comment">
          <h4>Agregar Comentario:</h4>
          <div class="comment-form">
            <textarea
              v-model="newComment"
              placeholder="Escriba su comentario..."
              rows="3"
            ></textarea>
            <button @click="addComment" class="submit-comment-btn">
              Agregar Comentario
            </button>
          </div>
        </div>
      </div>

      <!-- Actividad reciente -->
      <div class="activity-section">
        <h3>Actividad Reciente</h3>
        <div class="activity-timeline">
          <div v-for="activity in activityLog" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              {{ getActivityIcon(activity.type) }}
            </div>
            <div class="activity-content">
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-meta">
                <span class="activity-user">{{ activity.userName }}</span>
                <span class="activity-date">{{ formatDateTime(activity.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ✅ Modal de confirmación MEJORADO -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        
        <!-- ✅ Opciones de pago para markAsPaid -->
        <div v-if="confirmModal.action === 'markAsPaid'" class="payment-options">
          <div class="form-group">
            <label for="selectedGateway">Método de Pago *</label>
            <select id="selectedGateway" v-model="selectedGatewayId" @change="onGatewayChange" required>
              <option v-for="gateway in paymentGateways" :key="gateway.id" :value="gateway.id">
                {{ gateway.name }} ({{ formatGatewayType(gateway.gatewayType) }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="paymentAmount">Monto *</label>
            <input
              type="number"
              id="paymentAmount"
              v-model="paymentAmount"
              :max="pendingAmount"
              step="0.01"
              required
            />
            <small>Máximo: ${{ formatNumber(pendingAmount) }}</small>
          </div>

          <div class="form-group">
            <label for="paymentRef">Referencia de Pago</label>
            <input
              type="text"
              id="paymentRef"
              v-model="paymentReference"
              placeholder="Ej: TRANSFER-123456, OXXO-789"
            />
          </div>

          <!-- ✅ NUEVO: Campo de comprobante (solo para transferencias) -->
          <div v-if="selectedGatewayType === 'transfer'" class="form-group full-width">
            <label for="receiptFile">
              Comprobante de Transferencia 
              <span class="optional">(Recomendado)</span>
            </label>
            <input
              type="file"
              id="receiptFile"
              @change="handleReceiptUpload"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <small>Formatos: JPG, PNG, PDF (máx. 5MB)</small>
            
            <!-- ✅ Mostrar archivo seleccionado -->
            <div v-if="receiptFile" class="file-selected">
              <span class="file-icon">📎</span>
              <span class="file-name">{{ receiptFile.name }}</span>
              <span class="file-size">({{ formatFileSize(receiptFile.size) }})</span>
            </div>
          </div>
          
          <!-- ✅ Info boxes según tipo de gateway -->
          <div class="gateway-info">
            <div v-if="selectedGatewayType === 'cash'" class="info-box info-success">
              <strong>💵 Pago en Efectivo</strong>
              <p>El pago será aprobado automáticamente al registrarse.</p>
            </div>
            
            <div v-else-if="selectedGatewayType === 'transfer'" class="info-box info-warning">
              <strong>🏦 Transferencia Bancaria</strong>
              <p>El pago entrará en estado PENDIENTE y requerirá aprobación manual por un administrador.</p>
              <p>Se recomienda adjuntar el comprobante para agilizar la revisión.</p>
            </div>
            
            <div v-else-if="selectedGatewayType === 'mercadopago' || selectedGatewayType === 'paypal'" class="info-box info-primary">
              <strong>💳 Pasarela de Pago</strong>
              <p>El pago será confirmado automáticamente cuando la pasarela notifique el resultado.</p>
            </div>
          </div>
        </div>
        
        <!-- Campo de notas -->
        <div v-if="confirmModal.showReason" class="form-group">
          <label for="reason">Notas:</label>
          <textarea
            id="reason"
            v-model="actionReason"
            rows="3"
            placeholder="Notas sobre el pago..."
          ></textarea>
        </div>

        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="confirmAction" class="btn-confirm" :disabled="isProcessing">
            {{ isProcessing ? 'Procesando...' : confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de registro de pago -->
    <div v-if="showPaymentModal" class="modal-overlay" @click="closePaymentModal">
      <div class="modal-content" @click.stop>
        <h3>Registrar Pago</h3>
        <form @submit.prevent="submitPayment">
          <div class="form-row">
            <div class="form-group">
              <label for="paymentAmount">Monto *</label>
              <input
                type="number"
                id="paymentAmount"
                v-model="paymentForm.amount"
                :max="pendingAmount"
                step="0.01"
                required
              />
              <small>Máximo: ${{ formatNumber(pendingAmount) }}</small>
            </div>
            <div class="form-group">
              <label for="paymentMethod">Método de Pago *</label>
              <select id="paymentMethod" v-model="paymentForm.paymentMethod" required>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="online">Pago en Línea</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="paymentDate">Fecha de Pago *</label>
              <input
                type="date"
                id="paymentDate"
                v-model="paymentForm.paymentDate"
                required
              />
            </div>
            <div class="form-group">
              <label for="paymentReference">Referencia</label>
              <input
                type="text"
                id="paymentReference"
                v-model="paymentForm.reference"
                placeholder="Número de referencia"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="paymentNotes">Notas</label>
            <textarea
              id="paymentNotes"
              v-model="paymentForm.notes"
              rows="3"
              placeholder="Notas sobre el pago..."
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closePaymentModal" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-confirm">
              Registrar Pago
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceService from '../services/invoice.service';
import PaymentService from '../services/payment.service';

export default {
  name: 'InvoiceDetail',
  data() {
    return {
      invoice: {},
      invoiceItems: [],
      payments: [],
      comments: [],
      activityLog: [],
      loading: true,
      error: null,
      
      // Pasarelas de pago
      paymentGateways: [],
      defaultGateway: null,
      selectedGatewayId: null,
      selectedGatewayType: null, // ✅ NUEVO
      
      // Datos del pago
      paymentAmount: null,
      paymentReference: '',
      receiptFile: null, // ✅ NUEVO
      
      // UI
      newComment: '',
      isProcessing: false, // ✅ NUEVO
      
      // Modales
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        showReason: false,
        action: null
      },
      actionReason: '',
      showPaymentModal: false,
      paymentForm: {
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      }
    };
  },

  computed: {
    canEdit() {
      return this.invoice.status === 'pending' || this.invoice.status === 'overdue';
    },
    
    paidAmount() {
      if (!Array.isArray(this.payments)) {
        return 0;
      }
      return this.payments
        .filter(p => p.status === 'completed')
        .reduce((total, p) => total + parseFloat(p.amount || 0), 0);
    },
    
    pendingAmount() {
      return Math.max(0, parseFloat(this.invoice.totalAmount || 0) - this.paidAmount);
    },
    
    penaltyAmount() {
      if (this.invoice.status !== 'overdue') return 0;
      const overdueDays = this.calculateOverdueDays(this.invoice.dueDate);
      const baseAmount = parseFloat(this.invoice.totalAmount || 0);
      const monthsOverdue = Math.ceil(overdueDays / 30);
      return baseAmount * (0.05 * monthsOverdue);
    },
    
    totalWithPenalty() {
      return parseFloat(this.invoice.totalAmount || 0) + this.penaltyAmount;
    }
  },

  async mounted() {
    await this.loadPaymentGateways();
    this.loadInvoiceDetail();
  },

  methods: {
    // ✅ Cargar pasarelas de pago
    async loadPaymentGateways() {
      try {
        console.log('📡 Cargando pasarelas de pago...');
        const response = await PaymentService.getAllPaymentGateways({ active: true });
        console.log('✅ Respuesta de gateways:', response);
        
        this.paymentGateways = response.data.data || response.data || [];
        
        // Si no hay gateways en BD, usar valores por defecto
        if (!this.paymentGateways || this.paymentGateways.length === 0) {
          console.log('⚠️ No hay gateways en BD, usando valores por defecto');
          this.paymentGateways = [
            { id: 1, name: 'Efectivo', gatewayType: 'cash' },
            { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' },
            { id: 3, name: 'Mercado Pago', gatewayType: 'mercadopago' },
            { id: 4, name: 'PayPal', gatewayType: 'paypal' }
          ];
        }
        
        // Seleccionar gateway por defecto (efectivo)
        this.defaultGateway = this.paymentGateways.find(g => 
          g.gatewayType === 'cash'
        ) || this.paymentGateways[0];
        
        console.log('✅ Gateways cargados:', this.paymentGateways);
        console.log('✅ Gateway por defecto:', this.defaultGateway);
      } catch (error) {
        console.error('❌ Error cargando gateways:', error);
        // Gateways por defecto en caso de error
        this.paymentGateways = [
          { id: 1, name: 'Efectivo', gatewayType: 'cash' },
          { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' }
        ];
        this.defaultGateway = this.paymentGateways[0];
      }
    },
    
    // Cargar detalles de la factura
    async loadInvoiceDetail() {
      this.loading = true;
      try {
        const invoiceId = this.$route.params.id;
        
        const [invoiceResponse, paymentsResponse] = await Promise.all([
          InvoiceService.getInvoiceById(invoiceId),
          PaymentService.getAllPayments({ invoiceId })
        ]);

        if (invoiceResponse.data.success && invoiceResponse.data.data) {
          this.invoice = invoiceResponse.data.data.invoice || invoiceResponse.data.data;
        } else {
          this.invoice = invoiceResponse.data;
        }
        
        if (paymentsResponse.data.success && paymentsResponse.data.data && Array.isArray(paymentsResponse.data.data.payments)) {
          this.payments = paymentsResponse.data.data.payments;
        } else {
          const paymentsData = paymentsResponse.data;
          if (Array.isArray(paymentsData)) {
            this.payments = paymentsData;
          } else if (paymentsData && Array.isArray(paymentsData.payments)) {
            this.payments = paymentsData.payments;
          } else {
            this.payments = [];
            console.warn('⚠️ No se pudieron cargar los pagos. Estructura inesperada:', paymentsResponse.data);
          }
        }
        
        this.invoiceItems = this.invoice.items || [
          {
            id: 1,
            serviceName: 'Internet Residencial',
            description: `Plan ${this.invoice.servicePackage || '20 Mbps'}`,
            periodStart: this.invoice.billingPeriodStart,
            periodEnd: this.invoice.billingPeriodEnd,
            quantity: 1,
            unitPrice: this.invoice.amount,
            totalPrice: this.invoice.amount
          }
        ];

        this.activityLog = [
          {
            id: 1,
            type: 'created',
            description: 'Factura creada',
            userName: 'Sistema',
            createdAt: this.invoice.createdAt
          }
        ];

        if (this.invoice.paidAt) {
          this.activityLog.push({
            id: 2,
            type: 'payment',
            description: 'Factura marcada como pagada',
            userName: 'Admin',
            createdAt: this.invoice.paidAt
          });
        }

        if (this.payments.length > 0) {
          this.payments.forEach(payment => {
            this.activityLog.push({
              id: `payment-${payment.id}`,
              type: 'payment',
              description: `Pago registrado: $${this.formatNumber(payment.amount)} (${this.formatPaymentMethod(payment.paymentMethod)})`,
              userName: payment.Client ? `${payment.Client.firstName} ${payment.Client.lastName}` : 'Cliente',
              createdAt: payment.paymentDate || payment.createdAt
            });
          });
        }

        this.activityLog.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (this.invoice.Client) {
          this.invoice.clientName = `${this.invoice.Client.firstName} ${this.invoice.Client.lastName}`;
          this.invoice.clientEmail = this.invoice.Client.email;
          this.invoice.clientPhone = this.invoice.Client.phone;
          this.invoice.clientAddress = this.invoice.Client.address;
        }

        console.log('✅ Factura cargada:', this.invoice);
        console.log('✅ Pagos cargados:', this.payments);

      } catch (error) {
        console.error('❌ Error cargando detalles de factura:', error);
        this.error = 'Error cargando los detalles de la factura. Por favor, intente nuevamente.';
        this.payments = [];
      } finally {
        this.loading = false;
      }
    },

    goBack() {
      this.$router.go(-1);
    },

    viewClient() {
      this.$router.push(`/clients/${this.invoice.clientId}`);
    },

    editInvoice() {
      this.$router.push(`/billing/invoices/${this.invoice.id}/edit`);
    },

    async downloadPDF() {
      try {
        const response = await InvoiceService.downloadInvoicePDF(this.invoice.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `factura-${this.invoice.invoiceNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('❌ Error descargando PDF:', error);
        alert('Error al descargar el PDF de la factura');
      }
    },

    // ✅ Marcar como pagada
    markAsPaid() {
      this.selectedGatewayId = this.defaultGateway?.id || 1;
      this.selectedGatewayType = this.defaultGateway?.gatewayType || 'cash';
      this.paymentAmount = this.pendingAmount;
      this.paymentReference = '';
      this.receiptFile = null; // ✅ Resetear comprobante
      
      this.showConfirmation(
        'Registrar Pago',
        `¿Desea registrar el pago de la factura ${this.invoice.invoiceNumber}?`,
        'Registrar Pago',
        'markAsPaid',
        true
      );
    },

    cancelInvoice() {
      this.showConfirmation(
        'Cancelar Factura',
        `¿Está seguro que desea cancelar la factura ${this.invoice.invoiceNumber}? Esta acción no se puede deshacer.`,
        'Cancelar Factura',
        'cancelInvoice',
        true
      );
    },

    async sendReminder() {
      try {
        alert('Recordatorio enviado exitosamente');
      } catch (error) {
        console.error('❌ Error enviando recordatorio:', error);
        alert('Error enviando recordatorio');
      }
    },

    registerPayment() {
      this.paymentForm.amount = this.pendingAmount;
      this.showPaymentModal = true;
    },

    closePaymentModal() {
      this.showPaymentModal = false;
      this.paymentForm = {
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      };
    },

    async submitPayment() {
      try {
        const paymentData = {
          invoiceId: this.invoice.id,
          clientId: this.invoice.clientId,
          amount: parseFloat(this.paymentForm.amount),
          paymentMethod: this.paymentForm.paymentMethod,
          paymentDate: this.paymentForm.paymentDate,
          reference: this.paymentForm.reference,
          notes: this.paymentForm.notes
        };

        await PaymentService.createPayment(paymentData);
        
        alert('Pago registrado exitosamente');
        this.closePaymentModal();
        this.loadInvoiceDetail();
      } catch (error) {
        console.error('❌ Error registrando pago:', error);
        alert('Error registrando el pago');
      }
    },

    viewPayment(payment) {
      this.$router.push(`/billing/payments/${payment.id}`);
    },

    async downloadPaymentReceipt(payment) {
      try {
        const response = await PaymentService.downloadManualPaymentReceipt(payment.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `comprobante-${payment.paymentReference || payment.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('❌ Error descargando comprobante:', error);
        alert('Error al descargar el comprobante');
      }
    },

    async addComment() {
      if (!this.newComment.trim()) return;

      try {
        console.log('Agregando comentario:', this.newComment);
        this.newComment = '';
      } catch (error) {
        console.error('❌ Error agregando comentario:', error);
        alert('Error agregando comentario');
      }
    },

    // ✅ Mostrar modal de confirmación
    showConfirmation(title, message, confirmText, action, showReason = false) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        showReason,
        action
      };
      this.actionReason = '';
      this.showConfirmModal = true;
    },

    // ✅ Cerrar modal de confirmación
    closeConfirmModal() {
      this.showConfirmModal = false;
      this.confirmModal = {
        title: '',
        message: '',
        confirmText: '',
        showReason: false,
        action: null
      };
      this.actionReason = '';
      this.selectedGatewayId = null;
      this.selectedGatewayType = null;
      this.paymentAmount = null;
      this.paymentReference = '';
      this.receiptFile = null; // ✅ Limpiar comprobante
      this.isProcessing = false;
    },

    // ✅ NUEVO: Cambio de gateway
    onGatewayChange() {
      const selectedGateway = this.paymentGateways.find(
        g => g.id === this.selectedGatewayId
      );
      this.selectedGatewayType = selectedGateway?.gatewayType || null;
      console.log('🔄 Gateway seleccionado:', selectedGateway?.name, '(' + this.selectedGatewayType + ')');
    },

    // ✅ NUEVO: Manejar subida de comprobante
    handleReceiptUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. Máximo 5MB.');
          event.target.value = '';
          this.receiptFile = null;
          return;
        }
        this.receiptFile = file;
        console.log('📎 Comprobante seleccionado:', file.name);
      }
    },

    // ✅ Ejecutar acción confirmada
    async confirmAction() {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        const { action } = this.confirmModal;

        switch (action) {
          case 'markAsPaid': {
            const selectedGateway = this.paymentGateways.find(
              g => g.id === this.selectedGatewayId
            );
            
            // ✅ Obtener usuario actual
            const currentUser = this.$store?.state?.auth?.user || 
                               JSON.parse(localStorage.getItem('user') || '{}');
            const submittedBy = currentUser.id || 1; // Default: usuario 1
            
            console.log('👤 Usuario actual:', currentUser);
            console.log('🆔 ID del usuario que registra:', submittedBy);
            
            const paymentData = {
              gatewayId: this.selectedGatewayId,
              paymentMethod: this.getPaymentMethodFromGateway(selectedGateway),
              amount: parseFloat(this.paymentAmount),
              notes: this.actionReason || 'Pago registrado desde detalle de factura',
              paymentDate: new Date().toISOString().split('T')[0],
              paymentReference: this.paymentReference || 
                               `${selectedGateway?.gatewayType?.toUpperCase()}-${Date.now()}`,
              submittedBy // ✅ Usuario que registra
            };
            
            console.log('📤 Datos de pago a enviar:', paymentData);
            console.log('📎 Comprobante adjunto:', this.receiptFile?.name || 'Ninguno');
            
            // ✅ Lógica diferenciada por tipo de gateway
            if (selectedGateway.gatewayType === 'cash') {
              // ✅ EFECTIVO: Auto-aprobado
              await InvoiceService.markAsPaid(this.invoice.id, paymentData);
              alert('✅ Pago en efectivo registrado y aprobado automáticamente.');
              
            } else if (selectedGateway.gatewayType === 'transfer') {
              // ✅ TRANSFERENCIA: Pendiente de aprobación
              
              // Validar si NO hay comprobante
              if (!this.receiptFile) {
                const confirmWithout = confirm(
                  '⚠️ No ha adjuntado comprobante de transferencia.\n' +
                  'Se recomienda adjuntar el comprobante para agilizar la aprobación.\n\n' +
                  '¿Desea continuar de todas formas?'
                );
                if (!confirmWithout) {
                  this.isProcessing = false;
                  return; // Cancelar el envío
                }
              }
              
              // Usar el servicio de pagos manuales con comprobante
              await PaymentService.submitManualPayment(paymentData, this.receiptFile);
              alert(
                '⏳ Pago por transferencia registrado exitosamente.\n' +
                'El pago está PENDIENTE de aprobación por el administrador.'
              );
              
            } else {
              // ✅ PASARELAS (MercadoPago, PayPal, etc.): Pendiente hasta webhook
              await InvoiceService.markAsPaid(this.invoice.id, paymentData);
              alert(
                '⏳ Pago registrado en la pasarela.\n' +
                'Esperando confirmación automática del proveedor de pago.'
              );
            }
            
            break;
          }
          
          case 'cancelInvoice': {
            await InvoiceService.cancelInvoice(this.invoice.id, this.actionReason);
            alert('❌ Factura cancelada exitosamente.');
            break;
          }
          
          default:
            console.warn('⚠️ Acción no reconocida:', action);
            break;
        }

        this.closeConfirmModal();
        await this.loadInvoiceDetail(); // Recargar datos
        
      } catch (error) {
        console.error('❌ Error ejecutando acción:', error);
        const errorMsg = error.response?.data?.message || 
                         error.response?.data?.error ||
                         'Error ejecutando la acción.';
        alert(`❌ ${errorMsg}`);
        this.isProcessing = false;
      }
    },

    // ✅ Obtener método de pago desde gateway
    getPaymentMethodFromGateway(gateway) {
      if (!gateway) return 'cash';
      
      const methodMap = {
        'cash': 'cash',
        'transfer': 'transfer',
        'card': 'card',
        'oxxo': 'oxxo',
        'spei': 'spei',
        'paypal': 'online',
        'mercadopago': 'online'
      };
      
      return methodMap[gateway.gatewayType] || 'cash';
    },

    // ✅ Formato de tipo de gateway
    formatGatewayType(gatewayType) {
      const types = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'oxxo': 'OXXO',
        'spei': 'SPEI',
        'paypal': 'PayPal',
        'mercadopago': 'Mercado Pago'
      };
      return types[gatewayType] || gatewayType;
    },

    // ✅ NUEVO: Formato de tamaño de archivo
    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Formatos de datos
    formatNumber(value) {
      if (!value && value !== 0) return '0.00';
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

    formatPeriod(startDate, endDate) {
      if (!startDate || !endDate) return '-';
      return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
    },

    isOverdue(dueDate) {
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },

    formatPaymentMethod(method) {
      return PaymentService.formatPaymentMethod(method);
    },

    getStatusInfo(status) {
      return InvoiceService.formatInvoiceStatus(status);
    },

    getPaymentStatusInfo(status) {
      return PaymentService.formatPaymentStatus(status);
    },

    getActivityIcon(type) {
      const icons = {
        'created': '📄',
        'payment': '💰',
        'reminder': '📧',
        'updated': '✏️',
        'cancelled': '❌'
      };
      return icons[type] || '📋';
    }
  }
};
</script>

<style scoped>
/* Estilos base */
.invoice-detail {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.back-button {
  padding: 8px 16px;
  background: #e0e0e0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.back-button:hover {
  background: #d0d0d0;
}

.invoice-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.invoice-title h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.pending {
  background: #fff3e0;
  color: #f57c00;
}

.status-badge.paid {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.overdue {
  background: #ffebee;
  color: #c62828;
}

.status-badge.cancelled {
  background: #f5f5f5;
  color: #666;
}

.status-badge.partial {
  background: #e3f2fd;
  color: #1565c0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn.download {
  background: #667eea;
  color: white;
}

.action-btn.download:hover {
  background: #5568d3;
}

.action-btn.edit {
  background: #ffa726;
  color: white;
}

.action-btn.edit:hover {
  background: #fb8c00;
}

.action-btn.paid {
  background: #66bb6a;
  color: white;
}

.action-btn.paid:hover {
  background: #4caf50;
}

.action-btn.cancel {
  background: #ef5350;
  color: white;
}

.action-btn.cancel:hover {
  background: #e53935;
}

/* Loading y Error */
.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error {
  color: #c62828;
}

/* Contenido principal */
.invoice-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main-info {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* Detalles de la factura */
.invoice-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .label {
  font-size: 13px;
  color: #666;
  font-weight: 600;
}

.detail-item .value {
  font-size: 15px;
  color: #333;
}

.detail-item .value.invoice-number {
  font-weight: 600;
  color: #667eea;
}

.detail-item .value.overdue {
  color: #c62828;
  font-weight: 600;
}

.detail-item .value.overdue-days {
  color: #c62828;
  font-weight: 600;
}

/* Cliente */
.client-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.client-main h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.client-main p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.client-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-btn {
  padding: 8px 16px;
  background: #e3f2fd;
  color: #1565c0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
}

.link-btn:hover {
  background: #bbdefb;
}

/* Resumen financiero */
.financial-summary {
  position: sticky;
  top: 20px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.amount-breakdown,
.payment-status {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.amount-row,
.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.amount-row .label,
.payment-row .label {
  font-size: 14px;
  color: #666;
}

.amount-row .value,
.payment-row .value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.amount-row.total {
  border-top: 2px solid #e0e0e0;
  padding-top: 12px;
  margin-top: 4px;
}

.amount-row.total .label,
.amount-row.total .value {
  font-size: 18px;
  color: #667eea;
}

.payment-row .value.pending {
  color: #f57c00;
}

.amount-row .value.discount {
  color: #4caf50;
}

.penalty-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid #ffebee;
}

.penalty-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.penalty-row .label {
  font-size: 14px;
  color: #c62828;
}

.penalty-row .value.penalty {
  font-size: 15px;
  font-weight: 600;
  color: #c62828;
}

.penalty-row.total-with-penalty {
  border-top: 2px solid #c62828;
  padding-top: 12px;
  margin-top: 4px;
}

.penalty-row.total-with-penalty .label,
.penalty-row.total-with-penalty .value {
  font-size: 18px;
  color: #c62828;
  font-weight: 700;
}

/* Servicios */
.services-section,
.payments-section,
.notes-section,
.activity-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.services-section h3,
.payments-section h3,
.notes-section h3,
.activity-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.add-payment-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.add-payment-btn:hover {
  background: #5568d3;
}

.services-table table,
.payments-table table {
  width: 100%;
  border-collapse: collapse;
}

.services-table th,
.services-table td,
.payments-table th,
.payments-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.services-table th,
.payments-table th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 13px;
  color: #666;
}

.services-table td,
.payments-table td {
  font-size: 14px;
  color: #333;
}

.service-name,
.service-description {
  font-size: 14px;
}

.quantity,
.unit-price,
.item-total,
.amount {
  text-align: right;
}

.item-total,
.amount {
  font-weight: 600;
  color: #667eea;
}

.reference {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #666;
}

.no-payments {
  padding: 40px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.payments-table .actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.payments-table .action-btn {
  padding: 6px 10px;
  font-size: 16px;
  background: #e0e0e0;
}

.payments-table .action-btn.view {
  background: #e3f2fd;
}

.payments-table .action-btn.download {
  background: #e1f5fe;
}

/* Notas */
.invoice-notes,
.comments {
  margin-bottom: 20px;
}

.invoice-notes h4,
.comments h4,
.add-comment h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #555;
}

.invoice-notes p {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.comment {
  background: #f9f9f9;
  border-left: 4px solid #667eea;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 4px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.comment-author {
  font-weight: 600;
  color: #333;
}

.comment-date {
  color: #999;
}

.comment-content {
  color: #666;
  line-height: 1.6;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-form textarea {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.submit-comment-btn {
  align-self: flex-start;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.submit-comment-btn:hover {
  background: #5568d3;
}

/* Actividad */
.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: white;
  border-radius: 50%;
  font-size: 18px;
  flex-shrink: 0;
}

.activity-icon.created {
  background: #42a5f5;
}

.activity-icon.payment {
  background: #66bb6a;
}

.activity-icon.reminder {
  background: #ffa726;
}

.activity-icon.cancelled {
  background: #ef5350;
}

.activity-content {
  flex: 1;
}

.activity-description {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

/* ✅ MODALES */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #333;
}

.modal-content p {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.6;
}

/* ✅ Opciones de pago en modal */
.payment-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
  margin-top: 12px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.form-group .optional {
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group small {
  font-size: 12px;
  color: #888;
}

/* ✅ Archivo seleccionado */
.file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f0f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 13px;
}

.file-icon {
  font-size: 18px;
}

.file-name {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.file-size {
  color: #666;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

/* ✅ Info boxes según tipo de gateway */
.gateway-info {
  margin-top: 16px;
}

.info-box {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.info-box strong {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
}

.info-box p {
  margin: 4px 0;
  color: #555;
}

.info-success {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
}

.info-warning {
  background: #fff3e0;
border-left: 4px solid #ff9800;
}

.info-primary {
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
}

/* Acciones del modal */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e0e0e0;
  color: #333;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.btn-confirm {
  background: #667eea;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-confirm:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Form rows en modal de registro */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

/* Responsive */
@media (max-width: 1024px) {
  .main-info {
    grid-template-columns: 1fr;
  }

  .financial-summary {
    position: static;
  }
}

@media (max-width: 768px) {
  .invoice-detail {
    padding: 12px;
  }

  .header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .client-info {
    flex-direction: column;
  }

  .client-actions {
    width: 100%;
  }

  .link-btn {
    width: 100%;
  }

  .services-table,
  .payments-table {
    overflow-x: auto;
  }

  .services-table table,
  .payments-table table {
    min-width: 600px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .modal-content {
    padding: 20px;
    max-width: 95%;
  }
}

@media (max-width: 480px) {
  .invoice-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .invoice-title h2 {
    font-size: 20px;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }
}
</style>