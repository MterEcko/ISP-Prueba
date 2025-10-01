<template>
  <div class="communication-history">
    <div class="filters">
      <div class="filter-row">
        <div class="filter-group">
          <label>Canal:</label>
          <select v-model="filters.channelId" @change="applyFilters">
            <option value="">Todos los canales</option>
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">
              {{ channel.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="failed">Fallido</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Fecha desde:</label>
          <input 
            type="date" 
            v-model="filters.dateFrom" 
            @change="applyFilters"
          />
        </div>

        <div class="filter-group">
          <label>Fecha hasta:</label>
          <input 
            type="date" 
            v-model="filters.dateTo" 
            @change="applyFilters"
          />
        </div>

        <div class="filter-group">
          <button @click="clearFilters" class="clear-button">
            Limpiar
          </button>
          <button @click="exportHistory" class="export-button">
            Exportar
          </button>
        </div>
      </div>

      <div class="search-row">
        <input 
          type="text" 
          v-model="searchTerm" 
          @input="debouncedSearch"
          placeholder="Buscar por cliente, asunto o contenido..."
          class="search-input"
        />
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando historial...
    </div>

    <div v-else-if="history.length === 0" class="no-data">
      No se encontraron comunicaciones.
    </div>

    <div v-else class="history-list">
      <div 
        v-for="item in history" 
        :key="item.id" 
        class="history-item"
        :class="{ 'failed': item.status === 'failed' }"
      >
        <div class="item-header">
          <div class="item-info">
            <span class="channel-badge" :class="item.channelType">
              {{ getChannelIcon(item.channelType) }} {{ item.channelName }}
            </span>
            <span class="recipient">{{ item.recipient }}</span>
            <span class="client-name" v-if="item.clientName">
              ({{ item.clientName }})
            </span>
          </div>
          
          <div class="item-meta">
            <span class="timestamp">{{ formatDate(item.sentAt) }}</span>
            <span class="status" :class="item.status">
              {{ getStatusText(item.status) }}
            </span>
          </div>
        </div>

        <div class="item-content">
          <div class="subject" v-if="item.subject">
            <strong>{{ item.subject }}</strong>
          </div>
          <div class="message-preview">
            {{ truncateMessage(item.messageSent) }}
          </div>
          
          <div class="item-actions">
            <button @click="viewDetails(item)" class="action-btn">
              Ver detalles
            </button>
            <button 
              v-if="item.status === 'failed'" 
              @click="retryMessage(item)" 
              class="action-btn retry"
            >
              Reintentar
            </button>
            <button 
              v-if="canResend(item)" 
              @click="resendMessage(item)" 
              class="action-btn"
            >
              Reenviar
            </button>
          </div>
        </div>

        <div v-if="item.errorMessage" class="error-message">
          <strong>Error:</strong> {{ item.errorMessage }}
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
        P¨¢gina {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        Siguiente
      </button>
    </div>

    <!-- Modal de detalles -->
    <MessageDetailsModal 
      v-if="showDetailsModal"
      :message="selectedMessage"
      @close="showDetailsModal = false"
      @retry="retryMessage"
      @resend="resendMessage"
    />
  </div>
</template>

<script>
import CommunicationService from '../services/communication.service';
import MessageDetailsModal from './MessageDetailsModal.vue';

export default {
  name: 'CommunicationHistory',
  components: {
    MessageDetailsModal
  },
  props: {
    history: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    channels: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      filters: {
        channelId: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        clientId: ''
      },
      searchTerm: '',
      currentPage: 1,
      pageSize: 20,
      totalPages: 1,
      showDetailsModal: false,
      selectedMessage: null,
      searchTimeout: null
    };
  },
  computed: {
    debouncedSearch() {
      return this.debounce(this.applyFilters, 500);
    }
  },
  methods: {
    applyFilters() {
      const filterData = {
        ...this.filters,
        searchTerm: this.searchTerm,
        page: this.currentPage,
        size: this.pageSize
      };
      
      this.$emit('filter', filterData);
    },

    clearFilters() {
      this.filters = {
        channelId: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        clientId: ''
      };
      this.searchTerm = '';
      this.currentPage = 1;
      this.applyFilters();
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.applyFilters();
      }
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
        'sent': 'Enviado',
        'delivered': 'Entregado',
        'failed': 'Fallido',
        'pending': 'Pendiente',
        'processing': 'Procesando'
      };
      return statusTexts[status] || status;
    },

    truncateMessage(message) {
      if (!message) return '';
      return message.length > 150 ? message.substring(0, 150) + '...' : message;
    },

    viewDetails(item) {
      this.selectedMessage = item;
      this.showDetailsModal = true;
    },

    async retryMessage(item) {
      try {
        await CommunicationService.retryMessage(item.id);
        this.$emit('refresh');
        this.$toast.success('Mensaje reenviado');
      } catch (error) {
        console.error('Error reintentando mensaje:', error);
        this.$toast.error('Error reintentando mensaje');
      }
    },

    async resendMessage(item) {
      if (!confirm('?Est¨¢ seguro de reenviar este mensaje?')) return;
      
      try {
        const messageData = {
          channelId: item.channelId,
          recipient: item.recipient,
          subject: item.subject,
          message: item.messageSent,
          clientId: item.clientId
        };
        
        await CommunicationService.sendMessage(messageData);
        this.$emit('refresh');
        this.$toast.success('Mensaje reenviado');
      } catch (error) {
        console.error('Error reenviando mensaje:', error);
        this.$toast.error('Error reenviando mensaje');
      }
    },

    canResend(item) {
      return ['sent', 'delivered', 'failed'].includes(item.status);
    },

    async exportHistory() {
      try {
        const response = await CommunicationService.exportCommunicationHistory(this.filters);
        
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `historial_comunicaciones_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        this.$toast.success('Historial exportado');
      } catch (error) {
        console.error('Error exportando historial:', error);
        this.$toast.error('Error exportando historial');
      }
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
.communication-history {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.filters {
  background: #f8f9fa;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.filter-row {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: end;
  margin-bottom: 15px;
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
.filter-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-row {
  margin-top: 15px;
}

.search-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.clear-button,
.export-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  margin-right: 8px;
}

.export-button {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.loading,
.no-data {
  text-align: center;
  padding: 40px;
  color: #666;
}

.history-list {
  max-height: 600px;
  overflow-y: auto;
}

.history-item {
  border-bottom: 1px solid #e9ecef;
  padding: 15px 20px;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: #f8f9fa;
}

.history-item.failed {
  border-left: 4px solid #dc3545;
  background: #fff5f5;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.channel-badge {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
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

.recipient {
  font-weight: 500;
}

.client-name {
  color: #666;
  font-size: 14px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.timestamp {
  color: #666;
  font-size: 12px;
}

.status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status.sent {
  background: #cfe2ff;
  color: #0d6efd;
}

.status.delivered {
  background: #d1e7dd;
  color: #198754;
}

.status.failed {
  background: #f8d7da;
  color: #dc3545;
}

.status.pending {
  background: #fff3cd;
  color: #664d03;
}

.item-content {
  margin-left: 10px;
}

.subject {
  margin-bottom: 5px;
  color: #333;
}

.message-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.action-btn:hover {
  background: #f8f9fa;
}

.action-btn.retry {
  border-color: #ffc107;
  color: #856404;
}

.error-message {
  margin-top: 10px;
  padding: 8px 12px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
  font-size: 12px;
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
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    min-width: auto;
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-meta {
    align-self: flex-end;
  }

  .item-actions {
    flex-wrap: wrap;
  }
}
</style>