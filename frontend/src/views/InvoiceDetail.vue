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

    <!-- Modal de confirmación -->
<div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
  <div class="modal-content" @click.stop>
    <h3>{{ confirmModal.title }}</h3>
    <p>{{ confirmModal.message }}</p>
    
    <!-- NUEVO: Selector de gateway para markAsPaid -->
    <div v-if="confirmModal.action === 'markAsPaid'" class="payment-options">
      <div class="form-group">
        <label for="selectedGateway">Método de Pago *</label>
        <select id="selectedGateway" v-model="selectedGatewayId" required>
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
    </div>
    
    <!-- Campo de razón existente -->
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
      <button @click="confirmAction" class="btn-confirm">
        {{ confirmModal.confirmText }}
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
     paymentGateways: [],
     defaultGateway: null,
     selectedGatewayId: null,
     paymentAmount: null,
     paymentReference: '',
     newComment: '',
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
async loadPaymentGateways() {
  try {
    console.log('Llamando a getAllPaymentGateways...');
    const response = await PaymentService.getAllPaymentGateways({ active: true });
    console.log('Respuesta de gateways:', response);
    
    this.paymentGateways = response.data.data || response.data;
    
    // Si no hay gateways en BD, usar valores por defecto
    if (!this.paymentGateways || this.paymentGateways.length === 0) {
      console.log('No hay gateways en BD, usando valores por defecto');
      this.paymentGateways = [
        { id: 1, name: 'Efectivo', gatewayType: 'cash' },
        { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' },
        { id: 3, name: 'Mercado Pago', gatewayType: 'mercadopago' },
        { id: 4, name: 'PayPal', gatewayType: 'paypal' }
      ];
    }
    
    this.defaultGateway = this.paymentGateways.find(g => 
      g.gatewayType === 'cash'
    ) || this.paymentGateways[0];
    
    console.log('Gateways finales:', this.paymentGateways);
    console.log('Gateway por defecto:', this.defaultGateway);
  } catch (error) {
    console.error('Error cargando gateways:', error);
    // Gateways por defecto en caso de error
    this.paymentGateways = [
      { id: 1, name: 'Efectivo', gatewayType: 'cash' },
      { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' }
    ];
    this.defaultGateway = this.paymentGateways[0];
  }
},
   
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
           console.warn('No se pudieron cargar los pagos. Estructura inesperada:', paymentsResponse.data);
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

       console.log('Factura cargada:', this.invoice);
       console.log('Pagos cargados:', this.payments);

     } catch (error) {
       console.error('Error cargando detalles de factura:', error);
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
       console.error('Error descargando PDF:', error);
       alert('Error al descargar el PDF de la factura');
     }
   },

   markAsPaid() {
     this.selectedGatewayId = this.defaultGateway?.id || 1;
     this.paymentAmount = this.pendingAmount;
     this.paymentReference = '';
     
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
       console.error('Error enviando recordatorio:', error);
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
       console.error('Error registrando pago:', error);
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
       console.error('Error descargando comprobante:', error);
       alert('Error al descargar el comprobante');
     }
   },

   async addComment() {
     if (!this.newComment.trim()) return;

     try {
       console.log('Agregando comentario:', this.newComment);
       this.newComment = '';
     } catch (error) {
       console.error('Error agregando comentario:', error);
       alert('Error agregando comentario');
     }
   },

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
     this.paymentAmount = null;
     this.paymentReference = '';
   },

   async confirmAction() {
     try {
       const { action } = this.confirmModal;

       switch (action) {
         case 'markAsPaid': {
           const selectedGateway = this.paymentGateways.find(g => g.id === this.selectedGatewayId);
           
           const paymentData = {
             gatewayId: this.selectedGatewayId,
             paymentMethod: this.getPaymentMethodFromGateway(selectedGateway),
             amount: parseFloat(this.paymentAmount),
             notes: this.actionReason || 'Pago registrado manualmente',
             paymentDate: new Date().toISOString().split('T')[0],
             paymentReference: this.paymentReference || `${selectedGateway?.gatewayType?.toUpperCase()}-${Date.now()}`
           };
           
           console.log('Enviando datos de pago:', paymentData);
           await InvoiceService.markAsPaid(this.invoice.id, paymentData);
           break;
         }
         case 'cancelInvoice': {
           await InvoiceService.cancelInvoice(this.invoice.id, this.actionReason);
           break;
         }
         default:
           break;
       }

       this.closeConfirmModal();
       this.loadInvoiceDetail();
       
     } catch (error) {
       console.error('Error ejecutando acción:', error);
       alert('Error ejecutando la acción');
     }
   },

   formatGatewayType(gatewayType) {
     const types = {
       'cash': 'Manual/Efectivo',
       'transfer': 'Transferencia',
       'card': 'Tarjeta',
       'oxxo': 'OXXO',
       'spei': 'SPEI',
       'paypal': 'PayPal',
       'mercadopago': 'Mercado Pago'
     };
     return types[gatewayType] || gatewayType;
   },

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
.invoice-detail {
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
}

.back-button:hover {
  background-color: #e0e0e0;
}

.invoice-title {
  display: flex;
  align-items: center;
  gap: 15px;
}

.invoice-title h2 {
  margin: 0;
  color: #333;
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
}

.action-btn.download {
  background-color: #9C27B0;
  color: white;
}

.action-btn.edit {
  background-color: #FF9800;
  color: white;
}

.action-btn.paid {
  background-color: #4CAF50;
  color: white;
}

.action-btn.cancel {
  background-color: #F44336;
  color: white;
}

.action-btn.view {
  background-color: #2196F3;
  color: white;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.invoice-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.main-info {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.detail-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.detail-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.detail-item .value {
  color: #333;
  font-size: 16px;
}

.invoice-number {
  font-family: monospace;
  font-weight: bold;
  color: #1976d2;
}

.overdue {
  color: #f44336;
  font-weight: bold;
}

.overdue-days {
  color: #f44336;
  font-weight: bold;
}

.client-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.client-main h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.client-main p {
  margin: 5px 0;
  color: #666;
}

.client-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-btn {
  padding: 6px 12px;
  background-color: #e3f2fd;
  color: #1976d2;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.link-btn:hover {
  background-color: #bbdefb;
}

.financial-summary {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.summary-card {
  padding: 25px;
}

.summary-card h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.amount-breakdown, .payment-status {
  margin-bottom: 20px;
}

.amount-row, .payment-row, .penalty-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 5px 0;
}

.amount-row.total, .penalty-row.total-with-penalty {
  border-top: 2px solid #eee;
  margin-top: 15px;
  padding-top: 15px;
  font-weight: bold;
  font-size: 18px;
}

.amount-row .value.discount {
  color: #4CAF50;
}

.payment-row .value.pending {
  color: #f44336;
  font-weight: bold;
}

.penalty-info {
  background-color: #fff3e0;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #ff9800;
}

.penalty-row .value.penalty {
  color: #e65100;
  font-weight: bold;
}

.services-section, .payments-section, .notes-section, .activity-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.services-section h3, .payments-section h3, .notes-section h3, .activity-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  border: none;
  padding: 0;
}

.add-payment-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.services-table table, .payments-table table {
  width: 100%;
  border-collapse: collapse;
}

.services-table th, .services-table td,
.payments-table th, .payments-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.services-table th, .payments-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.service-name {
  font-weight: 500;
  color: #333;
}

.service-description {
  color: #666;
  font-size: 14px;
}

.quantity, .unit-price, .item-total, .amount {
  text-align: right;
  font-weight: 500;
}

.reference {
  font-family: monospace;
  color: #666;
}

.no-payments {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-pending {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-paid {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-overdue {
  background-color: #ffebee;
  color: #c62828;
}

.status-cancelled {
  background-color: #f5f5f5;
  color: #757575;
}

.status-partial {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-failed {
  background-color: #ffebee;
  color: #c62828;
}

.status-refunded {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-processing {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.invoice-notes {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.invoice-notes h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.comments {
  margin-bottom: 20px;
}

.comments h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.comment {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  color: #333;
}

.comment-date {
  color: #666;
  font-size: 12px;
}

.comment-content {
  color: #666;
  line-height: 1.5;
}

.add-comment h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.comment-form textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.submit-comment-btn {
  padding: 10px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background-color: #e3f2fd;
  color: #1976d2;
}

.activity-icon.payment {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.activity-icon.reminder {
  background-color: #fff3e0;
  color: #ef6c00;
}

.activity-icon.cancelled {
  background-color: #ffebee;
  color: #c62828;
}

.activity-content {
  flex: 1;
}

.activity-description {
  color: #333;
  margin-bottom: 5px;
}

.activity-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #666;
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
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group small {
  color: #666;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background-color: #2196F3;
  color: white;
}

.actions {
  display: flex;
  gap: 5px;
}

.actions .action-btn {
  padding: 6px 8px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .main-info {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .client-info {
    flex-direction: column;
    gap: 15px;
  }

  .client-actions {
    flex-direction: row;
  }

  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .services-table, .payments-table {
    overflow-x: auto;
  }

  .invoice-title {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .invoice-detail {
    padding: 15px;
  }

  .detail-section, .financial-summary, .services-section, .payments-section, .notes-section, .activity-section {
    padding: 15px;
  }

  .header-actions {
    flex-direction: column;
  }
}
</style>