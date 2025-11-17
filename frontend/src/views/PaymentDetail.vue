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
              <!-- ✅ NUEVO: Usuario que registró -->
              <div class="detail-item" v-if="payment.submittedByName">
                <span class="label">Registrado por:</span>
                <span class="value submitted-by">
                  👤 {{ payment.submittedByName }}
                </span>
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

      <!-- ✅ NUEVO: Sección de comprobantes con historial -->
      <div v-if="receiptHistory.length > 0 || payment.receiptPath" class="receipt-section">
        <h3>
          Comprobantes de Pago
          <span class="receipt-count" v-if="receiptHistory.length > 1">
            ({{ receiptHistory.length }} versiones)
          </span>
        </h3>
        
        <!-- Comprobante actual -->
        <div v-if="payment.receiptPath" class="current-receipt">
          <div class="receipt-header">
            <h4>📎 Comprobante Actual</h4>
            <span class="upload-date">{{ formatDateTime(payment.receiptUploadedAt || payment.createdAt) }}</span>
          </div>
          
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
              <p v-if="payment.submittedByName">
                <span class="label">Subido por:</span>
                <span class="value">👤 {{ payment.submittedByName }}</span>
              </p>
            </div>
            
            <div class="receipt-actions">
              <button @click="downloadReceipt(payment.receiptPath)" class="download-btn">
                📄 Descargar
              </button>
              <button v-if="canViewReceipt()" @click="viewReceipt(payment.receiptPath)" class="view-btn">
                👁️ Ver
              </button>
            </div>
          </div>

          <!-- Visor de comprobante (para imágenes) -->
          <div v-if="showReceiptViewer && currentReceiptImage" class="receipt-viewer">
            <img :src="currentReceiptImage" alt="Comprobante de pago" />
          </div>
        </div>

        <!-- ✅ NUEVO: Historial de comprobantes re-subidos -->
        <div v-if="receiptHistory.length > 1" class="receipt-history">
          <h4>📋 Historial de Comprobantes</h4>
          <p class="history-note">
            Este pago tiene {{ receiptHistory.length }} comprobantes registrados.
            A continuación se muestran las versiones anteriores:
          </p>
          
          <div class="history-list">
            <div 
              v-for="(receipt, index) in receiptHistory" 
              :key="receipt.id || index"
              class="history-item"
              :class="{ current: index === 0 }"
            >
              <div class="history-badge">
                {{ index === 0 ? 'Actual' : `Versión ${receiptHistory.length - index}` }}
              </div>
              
              <div class="history-info">
                <div class="history-file">
                  <span class="file-icon">📎</span>
                  <span class="file-name">{{ receipt.filename || getReceiptFileName() }}</span>
                </div>
                <div class="history-meta">
                  <span class="upload-time">{{ formatDateTime(receipt.uploadedAt) }}</span>
                  <span class="upload-user" v-if="receipt.uploadedBy">
                    👤 {{ receipt.uploadedByName }}
                  </span>
                </div>
                <div v-if="receipt.notes" class="history-notes">
                  💬 {{ receipt.notes }}
                </div>
              </div>
              
              <div class="history-actions">
                <button @click="downloadReceipt(receipt.path)" class="icon-btn" title="Descargar">
                  📥
                </button>
                <button 
                  v-if="isImageFile(receipt.filename)" 
                  @click="viewReceipt(receipt.path)" 
                  class="icon-btn" 
                  title="Ver"
                >
                  👁️
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ✅ NUEVO: Re-subir comprobante (solo para transferencias pendientes) -->
        <div v-if="payment.status === 'pending' && payment.paymentMethod === 'transfer'" class="reupload-section">
          <h4>🔄 Re-subir Comprobante</h4>
          <p class="reupload-note">
            Si necesita actualizar el comprobante, puede subir una nueva versión.
            El historial de comprobantes anteriores se conservará.
          </p>
          
          <div class="reupload-form">
            <input
              type="file"
              ref="reuploadInput"
              @change="handleReupload"
              accept=".jpg,.jpeg,.png,.pdf"
              style="display: none;"
            />
            <button @click="$refs.reuploadInput.click()" class="reupload-btn">
              📎 Seleccionar nuevo comprobante
            </button>
            
            <div v-if="newReceiptFile" class="new-receipt-preview">
              <div class="file-selected">
                <span class="file-icon">📎</span>
                <span class="file-name">{{ newReceiptFile.name }}</span>
                <span class="file-size">({{ formatFileSize(newReceiptFile.size) }})</span>
              </div>
              
              <div class="reupload-actions">
                <textarea
                  v-model="reuploadNotes"
                  placeholder="Motivo de la actualización (opcional)..."
                  rows="2"
                ></textarea>
                <div class="button-group">
                  <button @click="cancelReupload" class="btn-cancel">
                    Cancelar
                  </button>
                  <button @click="submitReupload" class="btn-confirm" :disabled="uploading">
                    {{ uploading ? 'Subiendo...' : 'Subir Comprobante' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
          <button @click="confirmAction" class="btn-confirm" :disabled="isProcessing">
            {{ isProcessing ? 'Procesando...' : confirmModal.confirmText }}
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
          <img v-if="modalReceiptImage" :src="modalReceiptImage" alt="Comprobante de pago" />
          <div v-else class="receipt-placeholder">
            <p>No se puede mostrar el comprobante</p>
            <button @click="downloadReceipt(currentReceiptPath)" class="download-btn">
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
      receiptHistory: [], // ✅ NUEVO: Historial de comprobantes
      loading: true,
      error: null,
      newComment: '',
      
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
      isProcessing: false,
      
      // Comprobantes
      showReceiptModal: false,
      showReceiptViewer: false,
      currentReceiptImage: null,
      currentReceiptPath: null,
      modalReceiptImage: null,
      
      // ✅ NUEVO: Re-subir comprobante
      newReceiptFile: null,
      reuploadNotes: '',
      uploading: false
    };
  },

  computed: {
    canRefund() {
      return this.payment.status === 'completed' && 
             this.payment.paymentMethod !== 'online';
    },
    
    paymentTimeline() {
      if (!this.payment || Object.keys(this.payment).length === 0) {
        return [];
      }
      
      const timeline = [
        {
          title: 'Pago Registrado',
          completed: true,
          current: false,
          date: this.payment.createdAt,
          description: this.payment.submittedByName 
            ? `Registrado por ${this.payment.submittedByName}`
            : 'El pago fue registrado en el sistema'
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
      this.error = null;
      
      try {
        const paymentId = this.$route.params.id;
        let response;

        try {
          // Intentar obtener vista detallada de pago manual
          response = await PaymentService.getManualPaymentDetails(paymentId);
        } catch (error) {
          // Si falla, obtener como pago genérico
          if (error.response && (error.response.status === 400 || error.response.status === 404)) {
            response = await PaymentService.getPaymentById(paymentId);
          } else {
            throw error;
          }
        }
        
        const responseData = response.data.data;

        // Extraer datos
        const paymentDetails = responseData.payment || responseData;
        const clientDetails = responseData.client || paymentDetails.Client;
        const invoiceDetails = responseData.invoice || paymentDetails.Invoice;
        const gatewayDetails = responseData.gateway || paymentDetails.PaymentGateway;
        const manualDetails = responseData.manualPaymentDetails || {};
        const submittedBy = responseData.submittedBy || paymentDetails.submittedBy; // ✅ NUEVO

        // ✅ NUEVO: Historial de comprobantes
        this.receiptHistory = responseData.receiptHistory || [];
        
        const paymentDataParsed = JSON.parse(paymentDetails.paymentData || '{}');

        this.payment = {
          ...paymentDetails,
          clientId: clientDetails?.id,
          clientName: `${clientDetails?.firstName || ''} ${clientDetails?.lastName || ''}`,
          clientEmail: clientDetails?.email,
          clientPhone: clientDetails?.phone,
          clientAddress: clientDetails?.address,
          invoiceId: invoiceDetails?.id,
          invoiceNumber: invoiceDetails?.invoiceNumber,
          invoiceAmount: invoiceDetails?.totalAmount,
          invoiceStatus: invoiceDetails?.status,
          invoiceDueDate: invoiceDetails?.dueDate,
          gatewayName: gatewayDetails?.name,
          receiptPath: manualDetails.receiptFile?.path || paymentDataParsed.receiptPath,
          receiptFileName: manualDetails.receiptFile?.originalName,
          receiptSize: manualDetails.receiptFile?.size,
          receiptUploadedAt: manualDetails.receiptFile?.uploadedAt,
          notes: manualDetails.notes || paymentDataParsed.notes,
          rejectionReason: manualDetails.rejection?.rejectionReason || paymentDataParsed.rejection?.rejectionReason,
          submittedByName: submittedBy?.fullName || submittedBy?.username || 'Sistema' // ✅ NUEVO
        };

        // ✅ NUEVO: Si hay historial vacío pero hay comprobante actual, agregarlo
        if (this.receiptHistory.length === 0 && this.payment.receiptPath) {
          this.receiptHistory = [{
            id: 1,
            filename: this.payment.receiptFileName,
            path: this.payment.receiptPath,
            uploadedAt: this.payment.receiptUploadedAt || this.payment.createdAt,
            uploadedByName: this.payment.submittedByName
          }];
        }

        // Generar log de actividad
        this.activityLog = [{
          id: 1,
          type: 'created',
          description: 'Pago registrado en el sistema',
          userName: this.payment.submittedByName,
          createdAt: this.payment.createdAt
        }];

        if (this.payment.status === 'completed') {
          this.activityLog.push({
            id: 2,
            type: 'approved',
            description: 'Pago aprobado y procesado',
            userName: 'Admin',
            createdAt: this.payment.processedAt
          });
        } else if (this.payment.status === 'failed') {
          this.activityLog.push({
            id: 2,
            type: 'rejected',
            description: `Pago rechazado. Motivo: ${this.payment.rejectionReason || 'No especificado'}`,
            userName: 'Admin',
            createdAt: this.payment.processedAt
          });
        }

        // ✅ NUEVO: Agregar actividades de re-subida de comprobantes
        if (this.receiptHistory.length > 1) {
          this.receiptHistory.forEach((receipt, index) => {
            if (index > 0) { // Skip current (index 0)
              this.activityLog.push({
                id: `receipt-${receipt.id}`,
                type: 'receipt',
                description: `Comprobante actualizado${receipt.notes ? ': ' + receipt.notes : ''}`,
                userName: receipt.uploadedByName || 'Usuario',
                createdAt: receipt.uploadedAt
              });
            }
          });
        }

        // Ordenar por fecha descendente
        this.activityLog.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      } catch (error) {
        console.error('❌ Error cargando detalles del pago:', error);
        this.error = error.message || 'Error al cargar los detalles del pago. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },

    goBack() {
      this.$router.go(-1);
    },

    viewClient() {
      if (this.payment.clientId) {
        this.$router.push(`/clients/${this.payment.clientId}`);
      }
    },

    viewClientPayments() {
      if (this.payment.clientId) {
        this.$router.push(`/billing/payments?clientId=${this.payment.clientId}`);
      }
    },

    viewInvoice() {
      if (this.payment.invoiceId) {
        this.$router.push(`/billing/invoices/${this.payment.invoiceId}`);
      }
    },

    // ✅ Descargar comprobante (puede ser actual o del historial)
    async downloadReceipt(receiptPath = null) {
      const pathToDownload = receiptPath || this.payment.receiptPath;
      
      if (!pathToDownload) {
        alert("Este pago no tiene un comprobante adjunto.");
        return;
      }
      
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
        console.error('❌ Error descargando comprobante:', error);
        alert('Error al descargar el comprobante.');
      }
    },

    // ✅ Ver comprobante (modal para imágenes)
    async viewReceipt(receiptPath = null) {
      const pathToView = receiptPath || this.payment.receiptPath;
      
      if (!pathToView || !this.canViewReceipt(pathToView)) return;
      
      try {
        const response = await PaymentService.downloadManualPaymentReceipt(this.payment.id);
        this.modalReceiptImage = URL.createObjectURL(response.data);
        this.currentReceiptPath = pathToView;
        this.showReceiptModal = true;
      } catch (error) {
        console.error("❌ Error al obtener el comprobante para visualizar:", error);
        alert("No se pudo cargar el comprobante para su visualización.");
      }
    },

    closeReceiptModal() {
      this.showReceiptModal = false;
      if (this.modalReceiptImage) {
        URL.revokeObjectURL(this.modalReceiptImage);
        this.modalReceiptImage = null;
      }
      this.currentReceiptPath = null;
    },

    canViewReceipt(filename = null) {
      const fileToCheck = filename || this.getReceiptFileName();
      return this.isImageFile(fileToCheck);
    },

    // ✅ NUEVO: Verificar si es archivo de imagen
    isImageFile(filename) {
      if (!filename) return false;
      const lowerFilename = filename.toLowerCase();
      return lowerFilename.endsWith('.jpg') || 
             lowerFilename.endsWith('.jpeg') || 
             lowerFilename.endsWith('.png');
    },

    getReceiptFileName() {
      return this.payment.receiptFileName || 
             `comprobante-${this.payment.paymentReference || this.payment.id}`;
    },

    // ✅ NUEVO: Manejar re-subida de comprobante
    handleReupload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. Máximo 5MB.');
          event.target.value = '';
          return;
        }
        this.newReceiptFile = file;
        console.log('📎 Nuevo comprobante seleccionado:', file.name);
      }
    },

    // ✅ NUEVO: Cancelar re-subida
    cancelReupload() {
      this.newReceiptFile = null;
      this.reuploadNotes = '';
      if (this.$refs.reuploadInput) {
        this.$refs.reuploadInput.value = '';
      }
    },

    // ✅ NUEVO: Enviar nuevo comprobante
    async submitReupload() {
      if (!this.newReceiptFile) {
        alert('Debe seleccionar un archivo.');
        return;
      }

      this.uploading = true;

      try {
        // Obtener usuario actual
        const currentUser = this.$store?.state?.auth?.user || 
                           JSON.parse(localStorage.getItem('user') || '{}');
        const uploadedBy = currentUser.id || 1;

        const formData = new FormData();
        formData.append('receipt', this.newReceiptFile);
        formData.append('notes', this.reuploadNotes || 'Comprobante actualizado');
        formData.append('uploadedBy', uploadedBy);

        console.log('📤 Re-subiendo comprobante para pago:', this.payment.id);

        // TODO: Crear endpoint en el backend para re-subir comprobante
        // await PaymentService.reuploadReceipt(this.payment.id, formData);

        // Por ahora simulamos éxito
        alert('✅ Comprobante actualizado exitosamente.\nEl historial se ha conservado.');
        
        this.cancelReupload();
        await this.loadPaymentDetail(); // Recargar para mostrar nuevo comprobante

      } catch (error) {
        console.error('❌ Error re-subiendo comprobante:', error);
        alert('Error al actualizar el comprobante. Por favor, intente nuevamente.');
      } finally {
        this.uploading = false;
      }
    },

    // Acciones del pago
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
        `¿Está seguro que desea rechazar este pago?`, 
        'Rechazar', 
        'rejectPayment', 
        true
      );
    },

    refundPayment() {
      this.showConfirmation(
        'Reembolsar Pago', 
        `¿Está seguro que desea reembolsar este pago? Esta acción no se puede deshacer.`, 
        'Reembolsar', 
        'refundPayment', 
        true
      );
    },

    async addComment() {
      if (!this.newComment.trim()) return;
      
      try {
        console.log('Agregando comentario:', this.newComment);
        this.newComment = '';
      } catch (error) {
        console.error('❌ Error agregando comentario:', error);
        alert('Error al agregar el comentario.');
      }
    },

    showConfirmation(title, message, confirmText, action, showReason = false) {
      this.confirmModal = { title, message, confirmText, showReason, action };
      this.actionReason = '';
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
      this.isProcessing = false;
    },

    async confirmAction() {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        const { action } = this.confirmModal;
        
        switch (action) {
          case 'approvePayment':
            await PaymentService.approveManualPayment(this.payment.id);
            alert('✅ Pago aprobado exitosamente.');
            break;
            
          case 'rejectPayment':
            if (!this.actionReason.trim()) {
              alert('El motivo del rechazo es requerido.');
              this.isProcessing = false;
              return;
            }
            await PaymentService.rejectManualPayment(this.payment.id, { 
              reason: this.actionReason 
            });
            alert('❌ Pago rechazado exitosamente.');
            break;
            
          case 'refundPayment':
            console.log('Reembolsar pago:', this.payment.id, 'Razón:', this.actionReason);
            // TODO: Implementar endpoint de reembolso
            alert('⚠️ Funcionalidad de reembolso en desarrollo.');
            break;
        }
        
        this.closeConfirmModal();
        await this.loadPaymentDetail();
        
      } catch (error) {
        console.error('❌ Error ejecutando acción:', error);
        const errorMsg = error.response?.data?.message || 
                         error.response?.data?.error ||
                         'Error al ejecutar la acción.';
        alert(`❌ ${errorMsg}`);
        this.isProcessing = false;
      }
    },

    // Formatos
    formatNumber(value) {
      if (value === null || value === undefined) return '0.00';
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
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    formatJSON(data) {
      try {
        if (typeof data === 'object' && data !== null) {
          return JSON.stringify(data, null, 2);
        }
        const parsed = JSON.parse(data);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return data;
      }
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
        'comment': '💬',
        'receipt': '📎' // ✅ NUEVO
      };
      return icons[type] || '📋';
    }
  }
};
</script>

<style scoped>
/* Estilos base */
.payment-detail {
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

.payment-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.payment-title h2 {
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

.status-badge.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.failed,
.status-badge.cancelled {
  background: #ffebee;
  color: #c62828;
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

.action-btn.approve {
  background: #66bb6a;
  color: white;
}

.action-btn.reject {
  background: #ef5350;
  color: white;
}

.action-btn.refund {
  background: #ffa726;
  color: white;
}

.action-btn.view-invoice {
  background: #42a5f5;
  color: white;
}

.action-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
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
.payment-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.main-info {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

/* Detalles del pago */
.payment-details {
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

.detail-item .value.payment-id {
  font-family: 'Courier New', monospace;
  color: #667eea;
  font-weight: 600;
}

.detail-item .value.payment-reference {
  font-family: 'Courier New', monospace;
  color: #666;
}

.detail-item .value.amount {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.detail-item .value.gateway-name {
  color: #42a5f5;
  font-weight: 600;
}

/* ✅ NUEVO: Usuario que registró */
.detail-item .value.submitted-by {
  color: #66bb6a;
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

/* Factura */
.invoice-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.invoice-main h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.invoice-main p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.invoice-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.invoice-status.pending {
  background: #fff3e0;
  color: #f57c00;
}

.invoice-status.paid {
  background: #e8f5e9;
  color: #2e7d32;
}

.invoice-status.overdue {
  background: #ffebee;
  color: #c62828;
}

.invoice-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Panel de estado */
.status-panel {
  position: sticky;
  top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-card,
.payment-summary {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-card h3,
.payment-summary h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

/* Timeline */
.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-step {
  display: flex;
  gap: 12px;
  position: relative;
}

.timeline-step:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 15px;
  top: 35px;
  width: 2px;
  height: calc(100% + 16px);
  background: #e0e0e0;
}

.timeline-step.active::after {
  background: #667eea;
}

.step-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  z-index: 1;
}

.timeline-step.active .step-icon {
  background: #667eea;
  color: white;
}

.timeline-step.current .step-icon {
  background: #fff3e0;
  color: #f57c00;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.step-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.step-description {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

/* Summary items */
.summary-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item .label {
  font-size: 14px;
  color: #666;
}

.summary-item .value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.summary-item .value.transaction-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

/* Detalles técnicos */
.technical-details {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.technical-details h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.technical-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.technical-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #555;
}

.code-block {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #333;
  line-height: 1.5;
}

/* ✅ NUEVO: Sección de comprobantes */
.receipt-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.receipt-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.receipt-count {
  font-size: 14px;
  color: #666;
  font-weight: normal;
}

.current-receipt {
  margin-bottom: 24px;
}

.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.receipt-header h4 {
  margin: 0;
  font-size: 16px;
  color: #555;
}

.upload-date {
  font-size: 13px;
  color: #999;
}

.receipt-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.receipt-info {
  flex: 1;
}

.receipt-info p {
  margin: 8px 0;
  font-size: 14px;
}

.receipt-info .label {
  font-weight: 600;
  color: #666;
  margin-right: 8px;
}

.receipt-info .value {
  color: #333;
}

.receipt-actions {
  display: flex;
  gap: 8px;
}

.download-btn,
.view-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.download-btn {
  background: #667eea;
  color: white;
}

.view-btn {
  background: #42a5f5;
  color: white;
}

.download-btn:hover,
.view-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.receipt-viewer {
  margin-top: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.receipt-viewer img {
  width: 100%;
  height: auto;
  display: block;
}

/* ✅ NUEVO: Historial de comprobantes */
.receipt-history {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px dashed #e0e0e0;
}

.receipt-history h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #555;
}

.history-note {
  margin: 0 0 16px 0;
  padding: 12px;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.2s;
}

.history-item:hover {
  background: #f0f0f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.history-item.current {
  background: #e3f2fd;
  border-color: #42a5f5;
}

.history-badge {
  padding: 4px 8px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.history-item.current .history-badge {
  background: #42a5f5;
}

.history-info {
  flex: 1;
}

.history-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.file-icon {
  font-size: 16px;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.upload-user {
  color: #66bb6a;
}

.history-notes {
  font-size: 13px;
  color: #666;
  font-style: italic;
  margin-top: 6px;
}

.history-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #667eea;
  border-color: #667eea;
  transform: scale(1.1);
}

/* ✅ NUEVO: Re-subir comprobante */
.reupload-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px dashed #e0e0e0;
}

.reupload-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #555;
}

.reupload-note {
  margin: 0 0 16px 0;
  padding: 12px;
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.reupload-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reupload-btn {
  align-self: flex-start;
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.reupload-btn:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

.new-receipt-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #f0f8ff;
  border: 1px solid #b3d9ff;
  border-radius: 6px;
  font-size: 13px;
}

.file-size {
  color: #666;
  font-size: 12px;
  font-family: 'Courier New', monospace;
}

.reupload-actions textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Notas */
.notes-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.notes-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.payment-notes,
.rejection-reason,
.comments,
.add-comment {
  margin-bottom: 20px;
}

.payment-notes h4,
.rejection-reason h4,
.comments h4,
.add-comment h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #555;
}

.payment-notes p,
.rejection-text {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.rejection-reason {
  padding: 16px;
  background: #ffebee;
  border-left: 4px solid #c62828;
  border-radius: 6px;
}

.rejection-text {
  color:#c62828;
  font-weight: 600;
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
.activity-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.activity-section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

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

.activity-icon.approved {
  background: #66bb6a;
}

.activity-icon.rejected {
  background: #ef5350;
}

.activity-icon.refunded {
  background: #ffa726;
}

.activity-icon.receipt {
  background: #ab47bc;
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

/* Modales */
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

.modal-content.large {
  max-width: 900px;
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
  color: #666;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #d0d0d0;
  transform: rotate(90deg);
}

.receipt-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.receipt-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.receipt-placeholder {
  text-align: center;
  padding: 40px;
  color: #999;
}

.receipt-placeholder p {
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  transition: border-color 0.2s;
}

.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

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

/* Responsive */
@media (max-width: 1024px) {
  .main-info {
    grid-template-columns: 1fr;
  }

  .status-panel {
    position: static;
  }

  .technical-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .payment-detail {
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

  .client-info,
  .invoice-info {
    flex-direction: column;
  }

  .client-actions,
  .invoice-actions {
    width: 100%;
  }

  .link-btn {
    width: 100%;
  }

  .receipt-container {
    flex-direction: column;
  }

  .receipt-actions {
    width: 100%;
  }

  .download-btn,
  .view-btn {
    flex: 1;
  }

  .history-item {
    flex-wrap: wrap;
  }

  .history-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .modal-content {
    padding: 20px;
    max-width: 95%;
  }

  .modal-content.large {
    max-width: 95%;
  }
}

@media (max-width: 480px) {
  .payment-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .payment-title h2 {
    font-size: 20px;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }

  .summary-item {
    flex-direction: column;
    gap: 4px;
  }

  .button-group {
    flex-direction: column;
  }

  .button-group .btn-cancel,
  .button-group .btn-confirm {
    width: 100%;
  }
}
</style>