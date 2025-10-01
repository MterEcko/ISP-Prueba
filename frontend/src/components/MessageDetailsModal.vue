<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Detalles del Mensaje</h3>
        <button @click="closeModal" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Información del destinatario -->
        <div class="detail-section">
          <h4>Destinatario</h4>
          <div class="recipient-info">
            <div class="recipient-main">
              <span class="recipient-contact">{{ message.recipient }}</span>
              <span v-if="message.clientName" class="client-name">
                ({{ message.clientName }})
              </span>
            </div>
            <div v-if="message.clientId" class="client-actions">
              <button @click="viewClient" class="link-button">
                ?? Ver perfil del cliente
              </button>
            </div>
          </div>
        </div>

        <!-- Información del canal -->
        <div class="detail-section">
          <h4>Canal de Comunicación</h4>
          <div class="channel-info">
            <div class="channel-badge" :class="message.channelType">
              {{ getChannelIcon(message.channelType) }} {{ message.channelName || message.channelType }}
            </div>
            <div class="channel-details">
              <span class="channel-type">{{ getChannelTypeLabel(message.channelType) }}</span>
            </div>
          </div>
        </div>

        <!-- Plantilla utilizada -->
        <div v-if="message.templateId || message.templateName" class="detail-section">
          <h4>Plantilla</h4>
          <div class="template-info">
            <span class="template-name">?? {{ message.templateName || 'Plantilla sin nombre' }}</span>
            <button v-if="message.templateId" @click="viewTemplate" class="link-button">
              ??? Ver plantilla
            </button>
          </div>
        </div>

        <!-- Contenido del mensaje -->
        <div class="detail-section">
          <h4>Contenido</h4>
          
          <div v-if="message.subject" class="message-subject">
            <label>Asunto:</label>
            <div class="subject-content">{{ message.subject }}</div>
          </div>
          
          <div class="message-content">
            <label>Mensaje:</label>
            <div class="content-text" v-html="formattedMessage"></div>
          </div>
        </div>

        <!-- Estado y cronología -->
        <div class="detail-section">
          <h4>Estado del Envío</h4>
          
          <div class="status-info">
            <div class="current-status">
              <span class="status-badge" :class="message.status">
                {{ getStatusText(message.status) }}
              </span>
              <span class="status-description">
                {{ getStatusDescription(message.status) }}
              </span>
            </div>
            
            <!-- Cronología del mensaje -->
            <div class="timeline">
              <div class="timeline-item">
                <div class="timeline-dot created"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Mensaje creado</div>
                  <div class="timeline-time">{{ formatDateTime(message.createdAt) }}</div>
                </div>
              </div>
              
              <div v-if="message.scheduledFor" class="timeline-item">
                <div class="timeline-dot scheduled" :class="{ overdue: isOverdue() }"></div>
                <div class="timeline-content">
                  <div class="timeline-title">
                    {{ isOverdue() ? 'Programado para (Vencido)' : 'Programado para' }}
                  </div>
                  <div class="timeline-time">{{ formatDateTime(message.scheduledFor) }}</div>
                </div>
              </div>
              
              <div v-if="message.sentAt" class="timeline-item">
                <div class="timeline-dot sent"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Enviado</div>
                  <div class="timeline-time">{{ formatDateTime(message.sentAt) }}</div>
                </div>
              </div>
              
              <div v-if="message.deliveredAt" class="timeline-item">
                <div class="timeline-dot delivered"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Entregado</div>
                  <div class="timeline-time">{{ formatDateTime(message.deliveredAt) }}</div>
                </div>
              </div>
              
              <div v-if="message.status === 'failed'" class="timeline-item">
                <div class="timeline-dot failed"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Falló el envío</div>
                  <div class="timeline-time">{{ formatDateTime(message.processedAt || message.updatedAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Información técnica -->
        <div v-if="hasErrorInfo || hasGatewayInfo" class="detail-section">
          <h4>Información Técnica</h4>
          
          <div v-if="message.errorMessage" class="error-info">
            <label>Error:</label>
            <div class="error-content">{{ message.errorMessage }}</div>
          </div>
          
          <div v-if="message.gatewayResponse" class="gateway-info">
            <label>Respuesta del proveedor:</label>
            <div class="gateway-content">
              <pre>{{ formatGatewayResponse(message.gatewayResponse) }}</pre>
            </div>
          </div>
          
          <div v-if="message.attempts" class="attempts-info">
            <label>Intentos de envío:</label>
            <div class="attempts-content">
              {{ message.attempts }} de {{ message.maxAttempts || 3 }} intentos
            </div>
          </div>
        </div>

        <!-- Metadatos -->
        <div class="detail-section metadata">
          <h4>Metadatos</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <label>ID del mensaje:</label>
              <span class="metadata-value">{{ message.id }}</span>
            </div>
            
            <div v-if="message.priority" class="metadata-item">
              <label>Prioridad:</label>
              <span class="metadata-value priority" :class="message.priority">
                {{ getPriorityLabel(message.priority) }}
              </span>
            </div>
            
            <div v-if="message.ruleId" class="metadata-item">
              <label>Regla automática:</label>
              <span class="metadata-value">{{ message.ruleName || message.ruleId }}</span>
            </div>
            
            <div class="metadata-item">
              <label>Última actualización:</label>
              <span class="metadata-value">{{ formatDateTime(message.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <button v-if="canRetry" @click="retryMessage" class="retry-button">
            ?? Reintentar
          </button>
          <button v-if="canCancel" @click="cancelMessage" class="cancel-message-button">
            ? Cancelar
          </button>
          <button v-if="canResend" @click="resendMessage" class="resend-button">
            ?? Reenviar
          </button>
        </div>
        
        <div class="footer-right">
          <button @click="exportDetails" class="export-button">
            ?? Exportar
          </button>
          <button @click="closeModal" class="close-modal-button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MessageDetailsModal',
  props: {
    message: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'retry', 'cancel', 'resend', 'view-client', 'view-template'],
  computed: {
    formattedMessage() {
      if (!this.message.messageSent && !this.message.messageData) return '';
      
      const content = this.message.messageSent || this.message.messageData;
      
      return content
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\{[^}]+\}/g, '<span class="variable-highlight">$&</span>');
    },

    hasErrorInfo() {
      return this.message.errorMessage || this.message.status === 'failed';
    },

    hasGatewayInfo() {
      return this.message.gatewayResponse || this.message.attempts;
    },

    canRetry() {
      return ['failed', 'cancelled'].includes(this.message.status) && 
             (this.message.attempts || 0) < (this.message.maxAttempts || 3);
    },

    canCancel() {
      return ['pending', 'processing'].includes(this.message.status);
    },

    canResend() {
      return ['sent', 'delivered', 'failed'].includes(this.message.status);
    }
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },

    retryMessage() {
      this.$emit('retry', this.message);
    },

    cancelMessage() {
      if (confirm('¿Está seguro de cancelar este mensaje?')) {
        this.$emit('cancel', this.message);
      }
    },

    resendMessage() {
      if (confirm('¿Está seguro de reenviar este mensaje?')) {
        this.$emit('resend', this.message);
      }
    },

    viewClient() {
      this.$emit('view-client', this.message.clientId);
    },

    viewTemplate() {
      this.$emit('view-template', this.message.templateId);
    },

    exportDetails() {
      const details = {
        id: this.message.id,
        destinatario: this.message.recipient,
        cliente: this.message.clientName,
        canal: this.message.channelName,
        asunto: this.message.subject,
        mensaje: this.message.messageSent || this.message.messageData,
        estado: this.getStatusText(this.message.status),
        enviado_el: this.message.sentAt,
        entregado_el: this.message.deliveredAt,
        error: this.message.errorMessage,
        intentos: this.message.attempts,
        creado_el: this.message.createdAt
      };

      const dataStr = JSON.stringify(details, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `mensaje_${this.message.id}_detalles.json`;
      link.click();
    },

    isOverdue() {
      return this.message.scheduledFor && 
             new Date(this.message.scheduledFor) < new Date() && 
             this.message.status === 'pending';
    },

    getChannelIcon(channelType) {
      const icons = {
        'email': '??',
        'whatsapp': '??',
        'telegram': '??',
        'sms': '??'
      };
      return icons[channelType] || '??';
    },

    getChannelTypeLabel(channelType) {
      const labels = {
        'email': 'Correo Electrónico',
        'whatsapp': 'WhatsApp',
        'telegram': 'Telegram',
        'sms': 'Mensaje de Texto (SMS)'
      };
      return labels[channelType] || channelType;
    },

    getStatusText(status) {
      const statusTexts = {
        'pending': 'Pendiente',
        'processing': 'Procesando',
        'sent': 'Enviado',
        'delivered': 'Entregado',
        'failed': 'Fallido',
        'cancelled': 'Cancelado'
      };
      return statusTexts[status] || status;
    },

    getStatusDescription(status) {
      const descriptions = {
        'pending': 'El mensaje está en cola esperando ser enviado',
        'processing': 'El mensaje está siendo procesado por el proveedor',
        'sent': 'El mensaje fue enviado correctamente',
        'delivered': 'El mensaje fue entregado al destinatario',
        'failed': 'Hubo un error al enviar el mensaje',
        'cancelled': 'El mensaje fue cancelado antes del envío'
      };
      return descriptions[status] || 'Estado desconocido';
    },

    getPriorityLabel(priority) {
      const labels = {
        'low': 'Baja',
        'normal': 'Normal',
        'high': 'Alta',
        'urgent': 'Urgente'
      };
      return labels[priority] || priority;
    },

    formatDateTime(dateString) {
      if (!dateString) return 'N/A';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    },

    formatGatewayResponse(response) {
      if (typeof response === 'string') {
        try {
          return JSON.stringify(JSON.parse(response), null, 2);
        } catch {
          return response;
        }
      }
      return JSON.stringify(response, null, 2);
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
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
  border-radius: 4px;
}

.close-button:hover {
  background: #e9ecef;
}

.modal-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  border-left: 3px solid #007bff;
  padding-left: 10px;
}

.recipient-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recipient-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.recipient-contact {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.client-name {
  color: #666;
  font-size: 14px;
}

.link-button {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 12px;
  text-decoration: underline;
  padding: 0;
}

.link-button:hover {
  color: #0056b3;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.channel-badge {
  background: #e9ecef;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: 500;
}

.channel-badge.email {
  background: #cfe2ff;
  color: #0d6efd;
}

.channel-badge.whatsapp {
  background: #d1e7dd;
  color: #198754;
}

.channel-badge.telegram {
  background: #cff4fc;
  color: #0dcaf0;
}

.channel-badge.sms {
  background: #f8d7da;
  color: #dc3545;
}

.channel-details {
  color: #666;
  font-size: 14px;
}

.template-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.template-name {
  font-weight: 500;
  color: #333;
}

.message-subject,
.message-content {
  margin-bottom: 15px;
}

.message-subject:last-child,
.message-content:last-child {
  margin-bottom: 0;
}

.message-subject label,
.message-content label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.subject-content,
.content-text {
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1.5;
}

.subject-content {
  font-weight: 500;
  color: #333;
}

.content-text {
  color: #333;
  white-space: pre-wrap;
}

.content-text :deep(.variable-highlight) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-weight: 600;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.current-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fff3cd;
  color: #664d03;
}

.status-badge.processing {
  background: #cfe2ff;
  color: #0d6efd;
}

.status-badge.sent {
  background: #d1e7dd;
  color: #198754;
}

.status-badge.delivered {
  background: #d1e7dd;
  color: #198754;
}

.status-badge.failed {
  background: #f8d7da;
  color: #dc3545;
}

.status-badge.cancelled {
  background: #e2e3e5;
  color: #495057;
}

.status-description {
  color: #666;
  font-size: 14px;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e9ecef;
}

.timeline-item {
  position: relative;
  margin-bottom: 15px;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -26px;
  top: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 1;
}

.timeline-dot.created {
  background: #6c757d;
}

.timeline-dot.scheduled {
  background: #ffc107;
}

.timeline-dot.scheduled.overdue {
  background: #dc3545;
}

.timeline-dot.sent {
  background: #007bff;
}

.timeline-dot.delivered {
  background: #28a745;
}

.timeline-dot.failed {
  background: #dc3545;
}

.timeline-content {
  margin-left: 10px;
}

.timeline-title {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.timeline-time {
  color: #666;
  font-size: 12px;
}

.error-info,
.gateway-info,
.attempts-info {
  margin-bottom: 15px;
}

.error-info:last-child,
.gateway-info:last-child,
.attempts-info:last-child {
  margin-bottom: 0;
}

.error-info label,
.gateway-info label,
.attempts-info label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.error-content {
  padding: 10px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  font-size: 14px;
}

.gateway-content {
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.gateway-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.attempts-content {
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  color: #664d03;
  font-size: 14px;
  font-weight: 500;
}

.metadata {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #e9ecef;
}

.metadata h4 {
  border-left-color: #6c757d;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.metadata-item label {
  font-weight: 500;
  color: #666;
  font-size: 12px;
  margin: 0;
}

.metadata-value {
  font-size: 12px;
  color: #333;
  font-family: monospace;
}

.metadata-value.priority {
  padding: 2px 6px;
  border-radius: 8px;
  font-family: inherit;
}

.metadata-value.priority.low {
  background: #e2e3e5;
  color: #495057;
}

.metadata-value.priority.normal {
  background: #cfe2ff;
  color: #0d6efd;
}

.metadata-value.priority.high {
  background: #fff3cd;
  color: #664d03;
}

.metadata-value.priority.urgent {
  background: #f8d7da;
  color: #dc3545;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  position: sticky;
  bottom: 0;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 10px;
}

.retry-button,
.cancel-message-button,
.resend-button,
.export-button,
.close-modal-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.retry-button {
  background: #007bff;
  color: white;
}

.retry-button:hover {
  background: #0056b3;
}

.cancel-message-button {
  background: #dc3545;
  color: white;
}

.cancel-message-button:hover {
  background: #c82333;
}

.resend-button {
  background: #28a745;
  color: white;
}

.resend-button:hover {
  background: #218838;
}

.export-button {
  background: #6c757d;
  color: white;
}

.export-button:hover {
  background: #545b62;
}

.close-modal-button {
  background: #e9ecef;
  color: #333;
}

.close-modal-button:hover {
  background: #dee2e6;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .recipient-info,
  .channel-info,
  .template-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .metadata-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 15px;
  }
  
  .footer-left,
  .footer-right {
    width: 100%;
    justify-content: center;
  }
}
</style>