<template>
  <div class="contacto-tab">
    <div class="contacto-grid">
      
      <!-- Historial de Comunicaciones -->
      <div class="card historial-comunicaciones">
        <div class="card-header">
          <h3>Historial de Comunicaciones</h3>
          <div class="header-actions">
            <select v-model="channelFilter" @change="loadCommunications" class="filter-select">
              <option value="">Todos los canales</option>
              <option value="email">📧 Email</option>
              <option value="sms">📱 SMS</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="telegram">📢 Telegram</option>
            </select>
            <button @click="refreshCommunications" class="refresh-btn">🔄</button>
          </div>
        </div>
        
        <div class="card-content">
          <div v-if="loading" class="loading-communications">
            <div class="loading-spinner"></div>
            <p>Cargando historial de comunicaciones...</p>
          </div>
          
          <div v-else-if="communications.length > 0" class="communications-list">
            <div 
              v-for="communication in communications" 
              :key="communication.id"
              class="communication-item"
              @click="viewCommunication(communication)"
            >
              <div class="communication-header">
                <div class="channel-info">
                  <span class="channel-icon">{{ getChannelIcon(communication.channelType) }}</span>
                  <div class="channel-details">
                    <span class="channel-name">{{ getChannelName(communication.channelType) }}</span>
                    <span class="recipient">{{ communication.recipient }}</span>
                  </div>
                </div>
                <div class="communication-meta">
                  <span class="sent-date">{{ formatDateTime(communication.sentAt) }}</span>
                  <span :class="['status-badge', communication.status]">
                    {{ formatMessageStatus(communication.status) }}
                  </span>
                </div>
              </div>

              <div class="communication-content">
                <div v-if="communication.subject" class="message-subject">
                  <strong>{{ communication.subject }}</strong>
                </div>
                <div class="message-preview">
                  {{ truncateMessage(communication.messageSent) }}
                </div>
              </div>

              <div v-if="communication.deliveredAt || communication.errorMessage" class="communication-footer">
                <div v-if="communication.deliveredAt" class="delivery-info">
                  ✅ Entregado: {{ formatDateTime(communication.deliveredAt) }}
                </div>
                <div v-if="communication.errorMessage" class="error-info">
                  ❌ Error: {{ communication.errorMessage }}
                </div>
              </div>
            </div>

            <!-- Paginación -->
            <div v-if="totalPages > 1" class="pagination">
              <button 
                @click="changePage(currentPage - 1)" 
                :disabled="currentPage === 1"
                class="page-btn"
              >
                ‹ Anterior
              </button>
              
              <span class="page-info">
                Página {{ currentPage }} de {{ totalPages }}
              </span>
              
              <button 
                @click="changePage(currentPage + 1)" 
                :disabled="currentPage === totalPages"
                class="page-btn"
              >
                Siguiente ›
              </button>
            </div>
          </div>
          
          <div v-else class="no-communications">
            <div class="empty-state">
              <span class="empty-icon">📬</span>
              <h4>Sin comunicaciones</h4>
              <p>No hay mensajes enviados a este cliente</p>
              <button @click="sendNewMessage" class="send-first-message">
                Enviar Primer Mensaje
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas de Comunicación -->
      <div class="card estadisticas-comunicacion">
        <div class="card-header">
          <h3>Estadísticas de Comunicación</h3>
          <select v-model="statsFilter" @change="loadStats" class="filter-select">
            <option value="monthly">Este Mes</option>
            <option value="quarterly">Trimestre</option>
            <option value="yearly">Este Año</option>
          </select>
        </div>
        
        <div class="card-content">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">📧</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalEmails || 0 }}</div>
                <div class="stat-label">Emails Enviados</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">📱</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalSMS || 0 }}</div>
                <div class="stat-label">SMS Enviados</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">💬</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalWhatsApp || 0 }}</div>
                <div class="stat-label">WhatsApp</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">📊</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.deliveryRate || 0 }}%</div>
                <div class="stat-label">Tasa de Entrega</div>
              </div>
            </div>
          </div>

          <!-- Gráfico de comunicaciones por canal -->
          <div class="communication-chart">
            <h4>Distribución por Canal</h4>
            <div class="chart-container">
              <div class="chart-bars">
                <div v-for="(value, channel) in channelDistribution" :key="channel" class="chart-bar">
                  <div class="bar-label">{{ getChannelName(channel) }}</div>
                  <div class="bar-container">
                    <div 
                      class="bar-fill" 
                      :style="{ width: getBarWidth(value) + '%', backgroundColor: getChannelColor(channel) }"
                    ></div>
                  </div>
                  <div class="bar-value">{{ value }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones Rápidas -->
      <div class="card acciones-rapidas">
        <div class="card-header">
          <h3>Acciones Rápidas</h3>
        </div>
        
        <div class="card-content">
          <div class="quick-actions-grid">
            <button @click="sendQuickMessage('email')" class="quick-action-btn email">
              <span class="action-icon">📧</span>
              <span class="action-label">Enviar Email</span>
            </button>

            <button @click="sendQuickMessage('sms')" class="quick-action-btn sms">
              <span class="action-icon">📱</span>
              <span class="action-label">Enviar SMS</span>
            </button>

            <button @click="sendQuickMessage('whatsapp')" class="quick-action-btn whatsapp">
              <span class="action-icon">💬</span>
              <span class="action-label">WhatsApp</span>
            </button>

            <button @click="sendQuickMessage('telegram')" class="quick-action-btn telegram">
              <span class="action-icon">📢</span>
              <span class="action-label">Telegram</span>
            </button>

            <button @click="scheduleMessage" class="quick-action-btn schedule">
              <span class="action-icon">⏰</span>
              <span class="action-label">Programar</span>
            </button>

            <button @click="bulkMessage" class="quick-action-btn bulk">
              <span class="action-icon">📤</span>
              <span class="action-label">Envío Masivo</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Plantillas Frecuentes -->
      <div class="card plantillas-frecuentes">
        <div class="card-header">
          <h3>Plantillas Frecuentes</h3>
          <button @click="manageTemplates" class="manage-btn">Gestionar</button>
        </div>
        
        <div class="card-content">
          <div v-if="templates.length > 0" class="templates-list">
            <div 
              v-for="template in templates" 
              :key="template.id"
              class="template-item"
              @click="useTemplate(template)"
            >
              <div class="template-header">
                <span class="template-name">{{ template.name }}</span>
                <span class="template-channel">{{ getChannelName(template.channelType) }}</span>
              </div>
              <div class="template-preview">
                {{ template.subject || truncateMessage(template.messageBody) }}
              </div>
              <div class="template-actions">
                <button @click.stop="useTemplate(template)" class="use-btn">Usar</button>
                <button @click.stop="editTemplate(template)" class="edit-btn">✏️</button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-templates">
            <p>No hay plantillas configuradas</p>
            <button @click="createTemplate" class="create-template-btn">
              Crear Primera Plantilla
            </button>
          </div>
        </div>
      </div>

      <!-- Contactos de Comunicación -->
      <div class="card contactos-comunicacion">
        <div class="card-header">
          <h3>Información de Contacto</h3>
          <button @click="editContacts" class="edit-btn">✏️ Editar</button>
        </div>
        
        <div class="card-content">
          <div class="contacts-list">
            <div class="contact-item">
              <span class="contact-icon">📧</span>
              <div class="contact-info">
                <span class="contact-label">Email Principal:</span>
                <span class="contact-value">{{ clientContacts.primaryEmail || 'No configurado' }}</span>
                <span v-if="clientContacts.emailVerified" class="verified-badge">✅ Verificado</span>
              </div>
            </div>

            <div class="contact-item">
              <span class="contact-icon">📱</span>
              <div class="contact-info">
                <span class="contact-label">Teléfono SMS:</span>
                <span class="contact-value">{{ clientContacts.smsPhone || 'No configurado' }}</span>
                <span v-if="clientContacts.smsVerified" class="verified-badge">✅ Verificado</span>
              </div>
            </div>

            <div class="contact-item">
              <span class="contact-icon">💬</span>
              <div class="contact-info">
                <span class="contact-label">WhatsApp:</span>
                <span class="contact-value">{{ clientContacts.whatsappPhone || 'No configurado' }}</span>
                <span v-if="clientContacts.whatsappVerified" class="verified-badge">✅ Verificado</span>
              </div>
            </div>

            <div class="contact-item">
              <span class="contact-icon">📢</span>
              <div class="contact-info">
                <span class="contact-label">Telegram:</span>
                <span class="contact-value">{{ clientContacts.telegramUsername || 'No configurado' }}</span>
                <span v-if="clientContacts.telegramVerified" class="verified-badge">✅ Verificado</span>
              </div>
            </div>
          </div>

          <!-- Preferencias de comunicación -->
          <div class="communication-preferences">
            <h4>Preferencias</h4>
            <div class="preferences-list">
              <div class="preference-item">
                <span class="preference-label">Canal Preferido:</span>
                <span class="preference-value">{{ clientContacts.preferredChannel || 'No definido' }}</span>
              </div>
              <div class="preference-item">
                <span class="preference-label">Horario Preferido:</span>
                <span class="preference-value">{{ clientContacts.preferredTime || 'Cualquier momento' }}</span>
              </div>
              <div class="preference-item">
                <span class="preference-label">Frecuencia:</span>
                <span class="preference-value">{{ clientContacts.communicationFrequency || 'Normal' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Modal para ver comunicación completa -->
    <div v-if="showCommunicationModal" class="modal-overlay" @click="closeCommunicationModal">
      <div class="modal-content communication-modal" @click.stop>
        <CommunicationDetailModal 
          :communication="selectedCommunication"
          @close="closeCommunicationModal"
        />
      </div>
    </div>

  </div>
</template>

<script>
import CommunicationService from '../../services/communication.service';

export default {
  name: 'ContactTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      loading: false,
      communications: [],
      templates: [],
      stats: {},
      clientContacts: {},
      channelFilter: '',
      statsFilter: 'monthly',
      currentPage: 1,
      totalPages: 1,
      pageSize: 10,
      showCommunicationModal: false,
      selectedCommunication: null,
      
      channelDistribution: {
        email: 15,
        sms: 8,
        whatsapp: 12,
        telegram: 3
      }
    };
  },
  methods: {
    async loadCommunications() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          channelType: this.channelFilter || undefined
        };

        const response = await CommunicationService.getClientCommunications(this.clientId, params);
        this.communications = response.data.communications || [];
        this.totalPages = response.data.totalPages || 1;
      } catch (error) {
        console.error('Error cargando comunicaciones:', error);
        // Datos de ejemplo para desarrollo
        this.communications = [
          {
            id: 1,
            channelType: 'email',
            recipient: 'cliente@ejemplo.com',
            subject: 'Recordatorio de Pago - Julio 2024',
            messageSent: 'Estimado cliente, le recordamos que su pago mensual vence el día 15...',
            status: 'delivered',
            sentAt: '2024-07-10T14:30:00Z',
            deliveredAt: '2024-07-10T14:31:00Z'
          },
          {
            id: 2,
            channelType: 'whatsapp',
            recipient: '+52 123 456 7890',
            messageSent: 'Hola! Su servicio de internet ha sido restablecido. Cualquier duda estamos para ayudarle.',
            status: 'sent',
            sentAt: '2024-07-08T09:15:00Z'
          },
          {
            id: 3,
            channelType: 'sms',
            recipient: '+52 123 456 7890',
            messageSent: 'ISP: Su pago ha sido registrado exitosamente. Gracias por su preferencia.',
            status: 'failed',
            sentAt: '2024-07-05T16:45:00Z',
            errorMessage: 'Número no válido'
          }
        ];
        this.totalPages = 1;
      } finally {
        this.loading = false;
      }
    },

    async loadTemplates() {
      try {
        const response = await CommunicationService.getTemplates();
        this.templates = response.data || [];
      } catch (error) {
        console.error('Error cargando plantillas:', error);
        // Datos de ejemplo
        this.templates = [
          {
            id: 1,
            name: 'Recordatorio de Pago',
            channelType: 'email',
            subject: 'Recordatorio de Pago',
            messageBody: 'Estimado {nombre}, le recordamos que su pago vence el {vencimiento}...'
          },
          {
            id: 2,
            name: 'Bienvenida',
            channelType: 'whatsapp',
            messageBody: 'Bienvenido a nuestro servicio {nombre}! Su plan {plan} ya está activo.'
          }
        ];
      }
    },

    async loadStats() {
      try {
        const response = await CommunicationService.getClientCommunicationStats(this.clientId, this.statsFilter);
        this.stats = response.data || {};
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        // Datos de ejemplo
        this.stats = {
          totalEmails: 15,
          totalSMS: 8,
          totalWhatsApp: 12,
          deliveryRate: 95
        };
      }
    },

    async loadClientContacts() {
      try {
        // Cargar información de contacto del cliente
        const response = await CommunicationService.getClientContacts(this.clientId);
        this.clientContacts = response.data || {};
      } catch (error) {
        console.error('Error cargando contactos:', error);
        // Datos de ejemplo
        this.clientContacts = {
          primaryEmail: 'cliente@ejemplo.com',
          emailVerified: true,
          smsPhone: '+52 123 456 7890',
          smsVerified: true,
          whatsappPhone: '+52 123 456 7890',
          whatsappVerified: false,
          telegramUsername: '@cliente123',
          telegramVerified: false,
          preferredChannel: 'WhatsApp',
          preferredTime: '9:00 AM - 6:00 PM',
          communicationFrequency: 'Normal'
        };
      }
    },

    getChannelIcon(channel) {
      const icons = {
        email: '📧',
        sms: '📱',
        whatsapp: '💬',
        telegram: '📢'
      };
      return icons[channel] || '📝';
    },

    getChannelName(channel) {
      const names = {
        email: 'Email',
        sms: 'SMS',
        whatsapp: 'WhatsApp',
        telegram: 'Telegram'
      };
      return names[channel] || channel;
    },

    getChannelColor(channel) {
      const colors = {
        email: '#1976D2',
        sms: '#4CAF50',
        whatsapp: '#25D366',
        telegram: '#0088CC'
      };
      return colors[channel] || '#666';
    },

    formatDateTime(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatMessageStatus(status) {
      const statusMap = {
        sent: 'Enviado',
        delivered: 'Entregado',
        read: 'Leído',
        failed: 'Fallido',
        pending: 'Pendiente'
      };
      return statusMap[status] || status;
    },

    truncateMessage(message, length = 100) {
      if (!message) return '';
      return message.length > length ? message.substring(0, length) + '...' : message;
    },

    getBarWidth(value) {
      const max = Math.max(...Object.values(this.channelDistribution));
      return max > 0 ? (value / max) * 100 : 0;
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadCommunications();
      }
    },

    viewCommunication(communication) {
      this.selectedCommunication = communication;
      this.showCommunicationModal = true;
    },

    closeCommunicationModal() {
      this.showCommunicationModal = false;
      this.selectedCommunication = null;
    },

    sendQuickMessage(channel) {
      this.$emit('send-message', { clientId: this.clientId, channel });
    },

    sendNewMessage() {
      this.sendQuickMessage('email');
    },

    useTemplate(template) {
      console.log('Usar plantilla:', template.name);
      this.$emit('send-message', { 
        clientId: this.clientId, 
        channel: template.channelType,
        template: template
      });
    },

    editTemplate(template) {
      console.log('Editar plantilla:', template.id);
    },

    createTemplate() {
      console.log('Crear nueva plantilla');
    },

    manageTemplates() {
      console.log('Gestionar plantillas');
    },

    editContacts() {
      console.log('Editar información de contacto');
      this.$emit('edit-contacts', this.clientId);
    },

    scheduleMessage() {
      console.log('Programar mensaje');
      this.$emit('schedule-message', { clientId: this.clientId });
    },

    bulkMessage() {
      console.log('Envío masivo');
      this.$emit('bulk-message', { clientId: this.clientId });
    },

    async refreshCommunications() {
      await Promise.all([
        this.loadCommunications(),
        this.loadStats(),
        this.loadTemplates()
      ]);
    }
  },

  async created() {
    await Promise.all([
      this.loadCommunications(),
      this.loadTemplates(),
      this.loadStats(),
      this.loadClientContacts()
    ]);
  }
};
</script>

<style scoped>
.contacto-tab {
  padding: 20px;
  background: #f8f9fa;
  min-height: 100vh;
}

.contacto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  overflow: hidden;
}

.card-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
}

.card-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
  font-weight: 600;
}

.card-content {
  padding: 24px;
}

/* Historial de comunicaciones */
.communications-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.communication-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.communication-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.communication-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.channel-icon {
  font-size: 1.2rem;
}

.channel-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.channel-name {
  font-weight: 600;
  color: #333;
}

.recipient {
  font-size: 0.9rem;
  color: #666;
}

.communication-meta {
  text-align: right;
}

.sent-date {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 4px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.sent {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.delivered {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.failed {
  background: #ffebee;
  color: #c62828;
}

.status-badge.pending {
  background: #fff3e0;
  color: #f57c00;
}

.message-subject {
  margin-bottom: 8px;
  color: #333;
}

.message-preview {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.4;
}

.communication-footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.delivery-info, .error-info {
  font-size: 0.8rem;
}

.delivery-info {
  color: #4CAF50;
}

.error-info {
  color: #f44336;
}

/* Estadísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
}

/* Gráfico de barras */
.communication-chart {
  margin-top: 24px;
}

.communication-chart h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bar-label {
  width: 80px;
  font-size: 0.9rem;
  color: #666;
}

.bar-container {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.bar-value {
  width: 30px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

/* Acciones rápidas */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-action-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 1.5rem;
}

.action-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

/* Plantillas */
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-item:hover {
  border-color: #667eea;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-name {
  font-weight: 600;
  color: #333;
}

.template-channel {
  font-size: 0.8rem;
  color: #666;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 12px;
}

.template-preview {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.template-actions {
  display: flex;
  gap: 8px;
}

.use-btn, .edit-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.use-btn {
  background: #4CAF50;
  color: white;
}

.edit-btn {
  background: #f0f0f0;
  color: #666;
}

.no-templates {
  text-align: center;
  padding: 20px;
}

.create-template-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Contactos */
.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.contact-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.contact-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.contact-value {
  color: #333;
}

.verified-badge {
  font-size: 0.8rem;
  color: #4CAF50;
}

/* Preferencias */
.communication-preferences {
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.communication-preferences h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.preferences-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preference-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preference-label {
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
}

.preference-value {
  color: #333;
  font-size: 0.9rem;
}

/* Estados vacíos */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.6;
  display: block;
  margin-bottom: 16px;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: #666;
}

.empty-state p {
  margin: 0 0 16px 0;
  color: #888;
}

.send-first-message {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

/* Loading */
.loading-communications {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Botones */
.refresh-btn, .manage-btn, .edit-btn {
  background: #f0f0f0;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-btn:hover, .manage-btn:hover, .edit-btn:hover {
  background: #e0e0e0;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.page-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.page-btn:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9rem;
  color: #666;
}

/* Header actions */
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.communication-modal {
  max-width: 700px;
  width: 90vw;
}

/* Responsive */
@media (max-width: 768px) {
  .contacto-tab {
    padding: 15px;
  }
  
  .contacto-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header, .card-content {
    padding: 16px 20px;
  }
  
  .communication-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .communication-meta {
    text-align: left;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chart-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .bar-container {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 4px;
  }
}
</style>