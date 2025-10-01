<template>
  <div class="payment-detail">
    <div class="header">
      <div class="header-info">
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
        <div class="payment-title">
          <h2>Pago {{ payment.paymentReference || payment.id }}</h2>
          <span :class="['status-badge', getStatusInfo(payment.status).class]">
            {{ getStatusInfo(payment.status).label }}
          </span>
        </div>
      </div>
      
      <div class="header-actions">
        <button 
          v-if="payment.receiptPath"
          @click="downloadReceipt" 
          class="action-btn download"
        >
          📄 Descargar Comprobante
        </button>
        <button 
          v-if="payment.status === 'pending'"
          @click="approvePayment" 
          class="action-btn approve"
        >
          ✅ Aprobar
        </button>
        <button 
          v-if="payment.status === 'pending'"
          @click="rejectPayment" 
          class="action-btn reject"
        >
          ❌ Rechazar
        </button>
        <button 
          v-if="payment.status === 'completed' && canRefund"
          @click="refundPayment" 
          class="action-btn refund"
        >
          ↩️ Reembolsar
        </button>
        <button 
          v-if="payment.invoiceId"
          @click="viewInvoice" 
          class="action-btn view-invoice"
        >
          📋 Ver Factura
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando detalles del pago...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="payment-content">
      <!-- Información principal del pago -->
      <div class="main-info">
        <div class="payment-details">
          <div class="detail-section">
            <h3>Información del Pago</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">ID de Pago:</span>
                <span class="value payment-id">{{ payment.id }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Referencia:</span>
                <span class="value payment-reference">{{ payment.paymentReference || 'No asignada' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Monto:</span>
                <span class="value amount">${{ formatNumber(payment.amount) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Método de Pago:</span>
                <span class="value">{{ formatPaymentMethod(payment.paymentMethod) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Pago:</span>
                <span class="value">{{ formatDateTime(payment.paymentDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Registro:</span>
                <span class="value">{{ formatDateTime(payment.createdAt) }}</span>
              </div>
              <div class="detail-item" v-if="payment.processedAt">
                <span class="label">Fecha de Procesamiento:</span>
                <span class="value">{{ formatDateTime(payment.processedAt) }}</span>
              </div>
              <div class="detail-item" v-if="payment.gatewayName">
                <span class="label">Pasarela de Pago:</span>
                <span class="value gateway-name">{{ payment.gatewayName }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Información del Cliente</h3>
            <div class="client-info">
              <div class="client-main">
                <h4>{{ payment.clientName }}</h4>
                <p v-if="payment.clientEmail">📧 {{ payment.clientEmail }}</p>
                <p v-if="payment.clientPhone">📞 {{ payment.clientPhone }}</p>
                <p v-if="payment.clientAddress">📍 {{ payment.clientAddress }}</p>
              </div>
              <div class="client-actions">
                <button @click="viewClient" class="link-btn">
                  Ver Cliente
                </button>
                <button @click="viewClientPayments" class="link-btn">
                  Historial de Pagos
                </button>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="payment.invoiceId">
            <h3>Factura Asociada</h3>
            <div class="invoice-info">
              <div class="invoice-main">
                <h4>{{ payment.invoiceNumber }}</h4>
                <p>
                  <span class="label">Monto Total:</span>
                  <span class="value">${{ formatNumber(payment.invoiceAmount) }}</span>
                </p>
                <p>
                  <span class="label">Estado:</span>
                  <span :class="['invoice-status', getInvoiceStatusInfo(payment.invoiceStatus).class]">
                    {{ getInvoiceStatusInfo(payment.invoiceStatus).label }}
                  </span>
                </p>
                <p v-if="payment.invoiceDueDate">
                  <span class="label">Vencimiento:</span>
                  <span class="value" :class="{ overdue: isOverdue(payment.invoiceDueDate) }">
                    {{ formatDate(payment.invoiceDueDate) }}
                  </span>
                </p>
              </div>
              <div class="invoice-actions">
                <button @click="viewInvoice" class="link-btn">
                  Ver Factura
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel de estado y progreso -->
        <div class="status-panel">
          <div class="status-card">
            <h3>Estado del Pago</h3>
            <div class="status-timeline">
              <div v-for="(step, index) in paymentTimeline" :key="index" class="timeline-step" :class="{ active: step.completed, current: step.current }">
                <div class="step-icon">
                  <span v-if="step.completed">✓</span>
                  <span v-else-if="step.current">⏳</span>
                  <span v-else>○</span>
                </div>
                <div class="step-content">
                  <div class="step-title">{{ step.title }}</div>
                  <div class="step-date" v-if="step.date">{{ formatDateTime(step.date) }}</div>
                  <div class="step-description" v-if="step.description">{{ step.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="payment-summary">
            <h3>Resumen</h3>
            <div class="summary-items">
              <div class="summary-item">
                <span class="label">Tipo de Pago:</span>
                <span class="value">{{ payment.gatewayName ? 'Automático' : 'Manual' }}</span>
              </div>
              <div class="summary-item" v-if="payment.bankName">
                <span class="label">Banco:</span>
                <span class="value">{{ payment.bankName }}</span>
              </div>
              <div class="summary-item" v-if="payment.transactionId">
                <span class="label">ID de Transacción:</span>
                <span class="value transaction-id">{{ payment.transactionId }}</span>
              </div>
              <div class="summary-item" v-if="payment.externalReference">
                <span class="label">Referencia Externa:</span>
                <span class="value">{{ payment.externalReference }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detalles técnicos para pagos automáticos -->
      <div v-if="payment.gatewayResponse || payment.paymentData" class="technical-details">
        <h3>Detalles Técnicos</h3>
        
        <div class="technical-grid">
          <div class="technical-section" v-if="payment.gatewayResponse">
            <h4>Respuesta de la Pasarela</h4>
            <div class="code-block">
              <pre>{{ formatJSON(payment.gatewayResponse) }}</pre>
            </div>
          </div>

          <div class="technical-section" v-if="payment.paymentData">
            <h4>Datos del Pago</h4>
            <div class="code-block">
              <pre>{{ formatJSON(payment.paymentData) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Comprobante de pago -->
      <div v-if="payment.receiptPath || payment.receiptData" class="receipt-section">
        <h3>Comprobante de Pago</h3>
        
        <div class="receipt-container">
          <div class="receipt-info">
            <p>
              <span class="label">Archivo:</span>
              <span class="value">{{ getReceiptFileName() }}</span>
            </p>
            <p v-if="payment.receiptSize">
              <span class="label">Tamaño:</span>
              <span class="value">{{ formatFileSize(payment.receiptSize) }}</span>
            </p>
            <p v-if="payment.receiptUploadedAt">
              <span class="label">Subido:</span>
              <span class="value">{{ formatDateTime(payment.receiptUploadedAt) }}</span>
            </p>
          </div>
          
          <div class="receipt-actions">
            <button @click="downloadReceipt" class="download-btn">
              📄 Descargar Comprobante
            </button>
            <button v-if="canViewReceipt()" @click="viewReceipt" class="view-btn">
              👁️ Ver Comprobante
            </button>
          </div>
        </div>

        <!-- Visor de comprobante (para imágenes) -->
        <div v-if="showReceiptViewer" class="receipt-viewer">
          <img v-if="receiptImageUrl" :src="receiptImageUrl" alt="Comprobante de pago" />
        </div>
      </div>

      <!-- Notas y comentarios -->
      <div class="notes-section">
        <h3>Notas y Comentarios</h3>
        
        <div v-if="payment.notes" class="payment-notes">
          <h4>Notas del Pago:</h4>
          <p>{{ payment.notes }}</p>
        </div>

        <div v-if="payment.rejectionReason" class="rejection-reason">
          <h4>Motivo de Rechazo:</h4>
          <p class="rejection-text">{{ payment.rejectionReason }}</p>
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

      <!-- Actividad y auditoría -->
      <div class="activity-section">
        <h3>Registro de Actividad</h3>
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
        <div v-if="confirmModal.showReason" class="form-group">
          <label for="reason">Motivo:</label>
          <textarea
            id="reason"
            v-model="actionReason"
            rows="3"
            placeholder="Escriba el motivo..."
            required
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

    <!-- Modal de visor de comprobante -->
    <div v-if="showReceiptModal" class="modal-overlay" @click="closeReceiptModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>Comprobante de Pago</h3>
          <button @click="closeReceiptModal" class="close-btn">×</button>
        </div>
        <div class="receipt-content">
          <img v-if="receiptImageUrl" :src="receiptImageUrl" alt="Comprobante de pago" />
          <div v-else class="receipt-placeholder">
            <p>No se puede mostrar el comprobante</p>
            <button @click="downloadReceipt" class="download-btn">
              Descargar Archivo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PaymentService from '../services/payment.service';
import InvoiceService from '../services/invoice.service';

export default {
  name: 'PaymentDetail',
  data() {
    return {
      payment: {},
      comments: [],
      activityLog: [],
      loading: true,
      error: null,
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
      showReceiptModal: false,
      showReceiptViewer: false,
      receiptImageUrl: null
    };
  },
  computed: {
    canRefund() {
      return this.payment.paymentMethod !== 'online' && 
             this.payment.gatewayName !== 'MercadoPago' &&
             this.payment.gatewayName !== 'PayPal';
    },
    paymentTimeline() {
      const timeline = [
        {
          title: 'Pago Registrado',
          completed: true,
          current: false,
          date: this.payment.createdAt,
          description: 'El pago fue registrado en el sistema'
        }
      ];

      if (this.payment.status === 'pending') {
        timeline.push({
          title: 'Pendiente de Aprobación',
          completed: false,
          current: true,
          date: null,
          description: 'Esperando revisión y aprobación'
        });
      } else if (this.payment.status === 'completed') {
        timeline.push({
          title: 'Aprobado',
          completed: true,
          current: false,
          date: this.payment.processedAt,
          description: 'Pago aprobado y procesado'
        });
        timeline.push({
          title: 'Completado',
          completed: true,
          current: true,
          date: this.payment.processedAt,
          description: 'Pago aplicado a la factura'
        });
      } else if (this.payment.status === 'failed' || this.payment.status === 'cancelled') {
        timeline.push({
          title: 'Rechazado',
          completed: true,
          current: true,
          date: this.payment.processedAt,
          description: this.payment.rejectionReason || 'Pago rechazado'
        });
      }

      return timeline;
    }
  },
  created() {
    this.loadPaymentDetail();
  },
  methods: {
    async loadPaymentDetail() {
      this.loading = true;
      try {
        const paymentId = this.$route.params.id;
        
        let response;
        // Intentar cargar como pago manual primero
        try {
          response = await PaymentService.getManualPaymentDetails(paymentId);
        } catch (error) {
          // Si falla, intentar como pago regular
          response = await PaymentService.getPaymentById(paymentId);
        }

        this.payment = response.data;
        
        // Simular comentarios y actividad (normalmente vendrían de la API)
        this.activityLog = [
          {
            id: 1,
            type: 'created',
            description: 'Pago registrado en el sistema',
            userName: this.payment.createdBy || 'Sistema',
            createdAt: this.payment.createdAt
          }
        ];

        if (this.payment.status === 'completed') {
          this.activityLog.push({
            id: 2,
            type: 'approved',
            description: 'Pago aprobado y procesado',
            userName: this.payment.approvedBy || 'Admin',
            createdAt: this.payment.processedAt
          });
        } else if (this.payment.status === 'failed' || this.payment.status === 'cancelled') {
          this.activityLog.push({
            id: 2,
            type: 'rejected',
            description: 'Pago rechazado',
            userName: this.payment.rejectedBy || 'Admin',
            createdAt: this.payment.processedAt
          });
        }

      } catch (error) {
        console.error('Error cargando detalles del pago:', error);
        this.error = 'Error cargando los detalles del pago. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    goBack() {
      this.$router.go(-1);
    },

    viewClient() {
      this.$router.push(`/clients/${this.payment.clientId}`);
    },

    viewClientPayments() {
      this.$router.push(`/billing/payments?clientId=${this.payment.clientId}`);
    },

    viewInvoice() {
      if (this.payment.invoiceId) {
        this.$router.push(`/billing/invoices/${this.payment.invoiceId}`);
      }
    },

    async downloadReceipt() {
      try {
        const response = await PaymentService.downloadManualPaymentReceipt(this.payment.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', this.getReceiptFileName());
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error descargando comprobante:', error);
        alert('Error al descargar el comprobante');
      }
    },

    canViewReceipt() {
      const fileName = this.getReceiptFileName().toLowerCase();
      return fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png');
    },

    async viewReceipt() {
      if (this.canViewReceipt()) {
        this.showReceiptModal = true;
        // Aquí cargarías la imagen del comprobante
        // this.receiptImageUrl = URL_DEL_COMPROBANTE;
      }
    },

    closeReceiptModal() {
      this.showReceiptModal = false;
      this.receiptImageUrl = null;
    },

    getReceiptFileName() {
      return this.payment.receiptFileName || 
             `comprobante-pago-${this.payment.paymentReference || this.payment.id}.pdf`;
    },

    approvePayment() {
      this.showConfirmation(
        'Aprobar Pago',
        `¿Está seguro que desea aprobar este pago de $${this.formatNumber(this.payment.amount)}?`,
        'Aprobar',
        'approvePayment'
      );
    },

    rejectPayment() {
      this.showConfirmation(
        'Rechazar Pago',
        `¿Está seguro que desea rechazar este pago de $${this.formatNumber(this.payment.amount)}?`,
        'Rechazar',
        'rejectPayment',
        true
      );
    },

    refundPayment() {
      this.showConfirmation(
        'Reembolsar Pago',
        `¿Está seguro que desea reembolsar este pago de $${this.formatNumber(this.payment.amount)}? Esta acción no se puede deshacer.`,
        'Reembolsar',
        'refundPayment',
        true
      );
    },

    async addComment() {
      if (!this.newComment.trim()) return;

      try {
        // Implementar agregar comentario
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
    },

    async confirmAction() {
      try {
        const { action } = this.confirmModal;

        switch (action) {
          case 'approvePayment':
            await PaymentService.approveManualPayment(this.payment.id);
            break;
          case 'rejectPayment':
            if (!this.actionReason.trim()) {
              alert('El motivo del rechazo es requerido');
              return;
            }
            await PaymentService.rejectManualPayment(this.payment.id, {
              reason: this.actionReason
            });
            break;
          case 'refundPayment':
            // Implementar lógica de reembolso
            console.log('Reembolsar pago:', this.payment.id, 'Razón:', this.actionReason);
            break;
        }

        this.closeConfirmModal();
        this.loadPaymentDetail();
        
      } catch (error) {
        console.error('Error ejecutando acción:', error);
        alert('Error ejecutando la acción');
      }
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

    formatFileSize(bytes) {
      if (!bytes) return '-';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatJSON(obj) {
      if (!obj) return '';
      return JSON.stringify(obj, null, 2);
    },

    isOverdue(dueDate) {
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    },

    formatPaymentMethod(method) {
      return PaymentService.formatPaymentMethod(method);
    },

    getStatusInfo(status) {
      return PaymentService.formatPaymentStatus(status);
    },

    getInvoiceStatusInfo(status) {
      return InvoiceService.formatInvoiceStatus(status);
    },

    getActivityIcon(type) {
      const icons = {
        'created': '📝',
        'approved': '✅',
        'rejected': '❌',
        'refunded': '↩️',
        'updated': '✏️',
        'comment': '💬'
      };
      return icons[type] || '📋';
    }
  }
};
</script>

<style scoped>
.payment-detail {
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

.payment-title {
  display: flex;
  align-items: center;
  gap: 15px;
}

.payment-title h2 {
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

.action-btn.approve {
  background-color: #4CAF50;
  color: white;
}

.action-btn.reject {
  background-color: #F44336;
  color: white;
}

.action-btn.refund {
  background-color: #FF9800;
  color: white;
}

.action-btn.view-invoice {
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

.payment-content {
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

.payment-id, .payment-reference {
  font-family: monospace;
  font-weight: bold;
  color: #1976d2;
}

.amount {
  font-weight: bold;
  color: #2e7d32;
  font-size: 18px;
}

.gateway-name {
  background-color: #e3f2fd;
  padding: 2px 8px;
  border-radius: 12px;
  color: #1976d2;
  font-size: 12px;
  font-weight: 500;
}

.client-info, .invoice-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.client-main h4, .invoice-main h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 18px;
}

.client-main p, .invoice-main p {
  margin: 5px 0;
  color: #666;
}

.client-actions, .invoice-actions {
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

.invoice-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.overdue {
  color: #f44336;
  font-weight: bold;
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-card, .payment-summary {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 25px;
}

.status-card h3, .payment-summary h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timeline-step {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  position: relative;
}

.timeline-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 40px;
  width: 2px;
  height: 20px;
  background-color: #e0e0e0;
}

.timeline-step.active::after {
  background-color: #4CAF50;
}

.step-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  background-color: #e0e0e0;
  color: #666;
}

.timeline-step.active .step-icon {
  background-color: #4CAF50;
  color: white;
}

.timeline-step.current .step-icon {
  background-color: #2196F3;
  color: white;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 5px;
}

.step-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
}

.step-description {
  font-size: 14px;
  color: #666;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.summary-item .label {
  color: #666;
  font-size: 14px;
}

.summary-item .value {
  color: #333;
  font-weight: 500;
}

.transaction-id {
  font-family: monospace;
  color: #1976d2;
}

.technical-details, .receipt-section, .notes-section, .activity-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.technical-details h3, .receipt-section h3, .notes-section h3, .activity-section h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.technical-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.technical-section h4 {
  margin: 0 0 15px 0;
  color: #555;
  font-size: 16px;
}

.code-block {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #333;
  white-space: pre-wrap;
}

.receipt-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.receipt-info p {
  margin: 5px 0;
  display: flex;
  gap: 10px;
}

.receipt-info .label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.receipt-info .value {
  color: #333;
}

.receipt-actions {
  display: flex;
  gap: 10px;
}

.download-btn, .view-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.download-btn {
  background-color: #9C27B0;
  color: white;
}

.view-btn {
  background-color: #2196F3;
  color: white;
}

.receipt-viewer {
  margin-top: 20px;
  text-align: center;
}

.receipt-viewer img {
  max-width: 100%;
  max-height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.payment-notes, .rejection-reason {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.rejection-reason {
  background-color: #ffebee;
  border-left: 4px solid #f44336;
}

.payment-notes h4, .rejection-reason h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.rejection-text {
  color: #c62828;
  font-weight: 500;
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

.activity-icon.approved {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.activity-icon.rejected {
  background-color: #ffebee;
  color: #c62828;
}

.activity-icon.refunded {
  background-color: #fff3e0;
  color: #ef6c00;
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

.status-completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-failed {
  background-color: #ffebee;
  color: #c62828;
}

.status-cancelled {
  background-color: #f5f5f5;
  color: #757575;
}

.status-refunded {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-processing {
  background-color: #f3e5f5;
  color: #7b1fa2;
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

.modal-content.large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.receipt-content {
  text-align: center;
}

.receipt-content img {
  max-width: 100%;
  max-height: 600px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.receipt-placeholder {
  padding: 40px;
  color: #666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
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
  background-color: #f44336;
  color: white;
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

  .client-info, .invoice-info {
    flex-direction: column;
    gap: 15px;
  }

  .client-actions, .invoice-actions {
    flex-direction: row;
  }

  .technical-grid {
    grid-template-columns: 1fr;
  }

  .receipt-container {
    flex-direction: column;
    gap: 15px;
  }

  .payment-title {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .payment-detail {
    padding: 15px;
  }

  .detail-section, .status-card, .payment-summary, .technical-details, .receipt-section, .notes-section, .activity-section {
    padding: 15px;
  }

  .header-actions {
    flex-direction: column;
  }

  .modal-content {
    padding: 20px;
  }
}
</style>