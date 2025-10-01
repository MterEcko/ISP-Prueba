<template>
  <div class="scheduled-messages">
    <div class="header">
      <div class="header-left">
        <h3>Mensajes Programados</h3>
        <p class="header-description">
          Administra los mensajes que están programados para envío automático
        </p>
      </div>
      <div class="header-actions">
        <button @click="processScheduledMessages" class="process-button" :disabled="processing">
          {{ processing ? 'Procesando...' : '? Procesar Ahora' }}
        </button>
        <button @click="refreshMessages" class="refresh-button">
          ?? Actualizar
        </button>
      </div>
    </div>

    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="processing">Procesando</option>
            <option value="sent">Enviados</option>
            <option value="failed">Fallidos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Canal:</label>
          <select v-model="filters.channelId" @change="applyFilters">
            <option value="">Todos los canales</option>
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">
              {{ getChannelIcon(channel.channelType) }} {{ channel.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Programado para:</label>
          <select v-model="filters.timeFilter" @change="applyFilters">
            <option value="">Cualquier fecha</option>
            <option value="overdue">Vencidos</option>
            <option value="today">Hoy</option>
            <option value="tomorrow">Mañana</option>
            <option value="this_week">Esta semana</option>
            <option value="next_week">Próxima semana</option>
          </select>
        </div>

        <div class="filter-group">
          <input 
            type="text" 
            v-model="searchTerm" 
            @input="debouncedSearch"
            placeholder="Buscar por cliente o contenido..."
            class="search-input"
          />
        </div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card pending">
        <div class="stat-number">{{ stats.pending }}</div>
        <div class="stat-label">Pendientes</div>
      </div>
      <div class="stat-card overdue">
        <div class="stat-number">{{ stats.overdue }}</div>
        <div class="stat-label">Vencidos</div>
      </div>
      <div class="stat-card today">
        <div class="stat-number">{{ stats.today }}</div>
        <div class="stat-label">Para Hoy</div>
      </div>
      <div class="stat-card failed">
        <div class="stat-number">{{ stats.failed }}</div>
        <div class="stat-label">Fallidos</div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando mensajes programados...
    </div>

    <div v-else-if="filteredMessages.length === 0" class="no-messages">
      <div class="empty-state">
        <div class="empty-icon">??</div>
        <h4>No hay mensajes programados</h4>
        <p>Los mensajes programados aparecerán aquí cuando se creen</p>
      </div>
    </div>

    <div v-else class="messages-list">
      <div 
        v-for="message in filteredMessages" 
        :key="message.id"
        class="message-card"
        :class="[message.status, { 'overdue': isOverdue(message) }]"
      >
        <div class="card-header">
          <div class="message-info">
            <div class="recipient-info">
              <span class="recipient">{{ message.recipient }}</span>
              <span v-if="message.clientName" class="client-name">({{ message.clientName }})</span>
            </div>
            
            <div class="channel-info">
              <span class="channel-badge" :class="message.channelType">
                {{ getChannelIcon(message.channelType) }} {{ message.channelName }}
              </span>
              <span v-if="message.templateName" class="template-name">
                ?? {{ message.templateName }}
              </span>
            </div>
          </div>
          
          <div class="message-status">
            <span class="status-badge" :class="message.status">
              {{ getStatusText(message.status) }}
            </span>
            <div class="scheduled-time">
              <span class="time-label">Programado:</span>
              <span class="time-value" :class="{ 'overdue': isOverdue(message) }">
                {{ formatScheduledTime(message.scheduledFor) }}
              </span>
            </div>
          </div>
        </div>

        <div class="card-content">
          <div v-if="message.subject" class="message-subject">
            <strong>Asunto:</strong> {{ truncateText(message.subject, 80) }}
          </div>
          
          <div class="message-preview">
            {{ truncateText(message.messageData, 150) }}
          </div>

          <div v-if="message.attempts > 0" class="attempts-info">
            <span class="attempts-text">
              Intentos de envío: {{ message.attempts }}/{{ message.maxAttempts }}
            </span>
            <div v-if="message.result && message.status === 'failed'" class="error-result">
              <strong>Error:</strong> {{ message.result }}
            </div>
          </div>
        </div>

        <div class="card-footer">
          <div class="message-meta">
            <span class="created-at">
              Creado {{ formatRelativeTime(message.createdAt) }}
            </span>
            <span v-if="message.processedAt" class="processed-at">
              • Procesado {{ formatRelativeTime(message.processedAt) }}
            </span>
          </div>
          
          <div class="message-actions">
            <button 
              v-if="message.status === 'pending'"
              @click="editSchedule(message)" 
              class="action-btn edit"
              title="Editar programación"
            >
              ?? Editar
            </button>
            
            <button 
              v-if="message.status === 'failed'"
              @click="retryMessage(message)" 
              class="action-btn retry"
              title="Reintentar envío"
            >
              ?? Reintentar
            </button>
            
            <button 
              v-if="['pending', 'failed'].includes(message.status)"
              @click="cancelMessage(message)" 
              class="action-btn cancel"
              title="Cancelar mensaje"
            >
              ? Cancelar
            </button>
            
            <button 
              @click="viewDetails(message)" 
              class="action-btn view"
              title="Ver detalles"
            >
              ??? Ver
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="page-btn"
      >
        Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        Siguiente
      </button>
    </div>

    <!-- Modal para editar programación -->
    <EditScheduleModal 
      v-if="showEditModal"
      :message="editingMessage"
      @close="showEditModal = false"
      @save="updateSchedule"
    />

    <!-- Modal para ver detalles -->
    <MessageDetailsModal 
      v-if="showDetailsModal"
      :message="selectedMessage"
      @close="showDetailsModal = false"
      @retry="retryMessage"
      @cancel="cancelMessage"
    />
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';

export default {
  name: 'ScheduledMessages',
  props: {
    messages: {
      type: Array,
      default: () => []
    },
    channels: {
      type: Array,
      default: () => []
    }
  },
  emits: ['cancel', 'reschedule', 'refresh'],
  data() {
    return {
      loading: false,
      processing: false,
      searchTerm: '',
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      showEditModal: false,
      showDetailsModal: false,
      editingMessage: null,
      selectedMessage: null,
      searchTimeout: null,
      filters: {
        status: 'pending',
        channelId: '',
        timeFilter: ''
      },
      stats: {
        pending: 0,
        overdue: 0,
        today: 0,
        failed: 0
      }
    };
  },
  computed: {
    filteredMessages() {
      let filtered = [...this.messages];

      // Filtro por búsqueda
      if (this.searchTerm.trim()) {
        const term = this.searchTerm.toLowerCase();
        filtered = filtered.filter(message => 
          message.recipient.toLowerCase().includes(term) ||
          (message.clientName && message.clientName.toLowerCase().includes(term)) ||
          message.messageData.toLowerCase().includes(term) ||
          (message.subject && message.subject.toLowerCase().includes(term))
        );
      }

      // Filtros adicionales
      if (this.filters.status) {
        filtered = filtered.filter(m => m.status === this.filters.status);
      }
      
      if (this.filters.channelId) {
        filtered = filtered.filter(m => m.channelId == this.filters.channelId);
      }
      
      if (this.filters.timeFilter) {
        filtered = this.filterByTime(filtered, this.filters.timeFilter);
      }

      // Ordenar por fecha programada (más próximos primero)
      return filtered.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    },

    debouncedSearch() {
      return this.debounce(() => {
        // La búsqueda se hace en tiempo real a través del computed
      }, 300);
    }
  },
  watch: {
    messages: {
      handler() {
        this.updateStats();
      },
      immediate: true
    }
  },
  methods: {
    applyFilters() {
      this.currentPage = 1;
      // Los filtros se aplican automáticamente a través del computed
    },

    filterByTime(messages, timeFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      switch (timeFilter) {
        case 'overdue':
          return messages.filter(m => new Date(m.scheduledFor) < now && m.status === 'pending');
        case 'today':
          return messages.filter(m => {
            const scheduledDate = new Date(m.scheduledFor);
            return scheduledDate >= today && scheduledDate < tomorrow;
          });
        case 'tomorrow': {
          const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          return messages.filter(m => {
            const scheduledDate = new Date(m.scheduledFor);
            return scheduledDate >= tomorrow && scheduledDate < dayAfterTomorrow;
          });
        }
        case 'this_week':
          return messages.filter(m => {
            const scheduledDate = new Date(m.scheduledFor);
            return scheduledDate >= today && scheduledDate < nextWeek;
          });
        case 'next_week': {
          const weekAfter = new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
          return messages.filter(m => {
            const scheduledDate = new Date(m.scheduledFor);
            return scheduledDate >= nextWeek && scheduledDate < weekAfter;
          });
        }
        default:
          return messages;
      }
    },

    updateStats() {
      const now = new Date();
      this.stats = {
        pending: this.messages.filter(m => m.status === 'pending').length,
        overdue: this.messages.filter(m => 
          m.status === 'pending' && new Date(m.scheduledFor) < now
        ).length,
        today: this.messages.filter(m => {
          const scheduled = new Date(m.scheduledFor);
          const today = new Date();
          return scheduled.toDateString() === today.toDateString();
        }).length,
        failed: this.messages.filter(m => m.status === 'failed').length
      };
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },

    refreshMessages() {
      this.$emit('refresh');
    },

    async processScheduledMessages() {
      this.processing = true;
      try {
        await CommunicationService.processScheduledMessages();
        this.$toast?.success('Mensajes procesados exitosamente');
        this.refreshMessages();
      } catch (error) {
        console.error('Error procesando mensajes:', error);
        this.$toast?.error('Error procesando mensajes programados');
      } finally {
        this.processing = false;
      }
    },

    editSchedule(message) {
      this.editingMessage = message;
      this.showEditModal = true;
    },

    async updateSchedule(messageId, newSchedule) {
      try {
        await CommunicationService.updateScheduledMessage(messageId, newSchedule);
        this.showEditModal = false;
        this.$emit('reschedule', messageId, newSchedule);
        this.$toast?.success('Programación actualizada');
      } catch (error) {
        console.error('Error actualizando programación:', error);
        this.$toast?.error('Error actualizando programación');
      }
    },

    async retryMessage(message) {
      try {
        await CommunicationService.retryScheduledMessage(message.id);
        this.$toast?.success('Mensaje reprogramado para reintento');
        this.refreshMessages();
      } catch (error) {
        console.error('Error reintentando mensaje:', error);
        this.$toast?.error('Error reintentando mensaje');
      }
    },

    async cancelMessage(message) {
      if (!confirm(`¿Está seguro de cancelar este mensaje programado?`)) {
        return;
      }

      try {
        await CommunicationService.cancelScheduledMessage(message.id);
        this.$emit('cancel', message.id);
        this.$toast?.success('Mensaje cancelado');
      } catch (error) {
        console.error('Error cancelando mensaje:', error);
        this.$toast?.error('Error cancelando mensaje');
      }
    },

    viewDetails(message) {
      this.selectedMessage = message;
      this.showDetailsModal = true;
    },

    isOverdue(message) {
      return message.status === 'pending' && new Date(message.scheduledFor) < new Date();
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

    getStatusText(status) {
      const statusTexts = {
        'pending': 'Pendiente',
        'processing': 'Procesando',
        'sent': 'Enviado',
        'failed': 'Fallido',
        'cancelled': 'Cancelado'
      };
      return statusTexts[status] || status;
    },

    formatScheduledTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      
      // Si es hoy, mostrar solo la hora
      if (date.toDateString() === now.toDateString()) {
        return `Hoy a las ${date.toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }
      
      // Si es mañana
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (date.toDateString() === tomorrow.toDateString()) {
        return `Mañana a las ${date.toLocaleTimeString('es-MX', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      }
      
      // Fecha completa
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatRelativeTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'hace menos de 1 minuto';
      if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
      if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
      
      const diffInDays = Math.floor(diffInSeconds / 86400);
      if (diffInDays < 30) return `hace ${diffInDays} días`;
      
      return date.toLocaleDateString('es-MX');
    },

    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },

    debounce(func, wait) {
      return (...args) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
  }
};
</script>

<style scoped>
.scheduled-messages {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.header-left h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.header-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.process-button {
  background: #28a745;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.process-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.refresh-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.filters {
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.filter-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.filter-group label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  font-weight: 500;
}

.filter-group select,
.search-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-input {
  min-width: 250px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
  border-left: 4px solid #dee2e6;
}

.stat-card.pending {
  border-left-color: #ffc107;
}

.stat-card.overdue {
  border-left-color: #dc3545;
}

.stat-card.today {
  border-left-color: #007bff;
}

.stat-card.failed {
  border-left-color: #6c757d;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 500;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-messages {
  padding: 60px 20px;
}

.empty-state {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.empty-state p {
  margin: 0;
  color: #666;
}

.messages-list {
  padding: 20px;
}

.message-card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  margin-bottom: 15px;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.message-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.1);
}

.message-card.overdue {
  border-left: 4px solid #dc3545;
  background: #fff5f5;
}

.message-card.failed {
  border-left: 4px solid #dc3545;
}

.message-card.sent {
  border-left: 4px solid #28a745;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.message-info {
  flex: 1;
}

.recipient-info {
  margin-bottom: 8px;
}

.recipient {
  font-weight: 600;
  color: #333;
}

.client-name {
  color: #666;
  font-size: 14px;
  margin-left: 5px;
}

.channel-info {
  display: flex;
  gap: 10px;
  align-items: center;
}

.channel-badge {
  background: #e9ecef;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
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

.template-name {
  font-size: 11px;
  color: #666;
}

.message-status {
  text-align: right;
}

.status-badge {
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  margin-bottom: 5px;
  display: inline-block;
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

.status-badge.failed {
  background: #f8d7da;
  color: #dc3545;
}

.status-badge.cancelled {
  background: #e2e3e5;
  color: #495057;
}

.scheduled-time {
  font-size: 12px;
}

.time-label {
  color: #666;
}

.time-value {
  font-weight: 500;
  color: #333;
}

.time-value.overdue {
  color: #dc3545;
  font-weight: 600;
}

.card-content {
  padding: 15px;
}

.message-subject {
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.message-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.attempts-info {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.attempts-text {
  color: #666;
  font-weight: 500;
}

.error-result {
  margin-top: 5px;
  color: #dc3545;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-top: 1px solid #f0f0f0;
}

.message-meta {
  font-size: 11px;
  color: #666;
}

.message-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  color: #666;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.edit {
  border-color: #ffc107;
  color: #856404;
}

.action-btn.retry {
  border-color: #007bff;
  color: #0056b3;
}

.action-btn.cancel {
  border-color: #dc3545;
  color: #721c24;
}

.action-btn.view {
  border-color: #6c757d;
  color: #495057;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  gap: 20px;
  border-top: 1px solid #e9ecef;
}

.page-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-header,
  .card-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .message-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>