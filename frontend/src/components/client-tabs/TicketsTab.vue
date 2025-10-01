<template>
  <div class="tickets-tab">
    <div class="tickets-header">
      <div class="header-info">
        <h3>Tickets de Soporte</h3>
        <p class="subtitle">Historial de solicitudes de soporte técnico</p>
      </div>
      <button @click="createTicket" class="create-ticket-btn">
        + Nuevo Ticket
      </button>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filter-group">
        <select v-model="filters.status" @change="loadTickets" class="filter-select">
          <option value="">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="in_progress">En Progreso</option>
          <option value="resolved">Resueltos</option>
          <option value="closed">Cerrados</option>
        </select>

        <select v-model="filters.priority" @change="loadTickets" class="filter-select">
          <option value="">Todas las prioridades</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="critical">Urgente</option>
        </select>

        <input 
          v-model="filters.search" 
          @input="debounceSearch"
          placeholder="Buscar en tickets..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Resumen de tickets -->
    <div class="tickets-summary">
      <div class="summary-card">
        <div class="summary-number">{{ ticketStats.total }}</div>
        <div class="summary-label">Total</div>
      </div>
      <div class="summary-card open">
        <div class="summary-number">{{ ticketStats.open }}</div>
        <div class="summary-label">Abiertos</div>
      </div>
      <div class="summary-card in-progress">
        <div class="summary-number">{{ ticketStats.inProgress }}</div>
        <div class="summary-label">En Progreso</div>
      </div>
      <div class="summary-card resolved">
        <div class="summary-number">{{ ticketStats.resolved }}</div>
        <div class="summary-label">Resueltos</div>
      </div>
    </div>

    <!-- Lista de tickets -->
    <div class="tickets-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Cargando tickets...</p>
      </div>

      <div v-else-if="tickets.length === 0" class="empty-state">
        <div class="empty-icon">🎫</div>
        <h4>Sin tickets registrados</h4>
        <p>Este cliente no tiene tickets de soporte</p>
        <button @click="createTicket" class="create-first-ticket">
          Crear Primer Ticket
        </button>
      </div>

      <div v-else class="tickets-list">
        <div 
          v-for="ticket in tickets" 
          :key="ticket.id"
          class="ticket-card"
          @click="viewTicket(ticket)"
        >
          <div class="ticket-header">
            <div class="ticket-info">
              <div class="ticket-title">{{ ticket.title }}</div>
              <div class="ticket-meta">
                <span class="ticket-id">#{{ ticket.id }}</span>
                <span class="ticket-date">{{ formatDate(ticket.createdAt) }}</span>
              </div>
            </div>
            <div class="ticket-badges">
              <span :class="['priority-badge', ticket.priority]">
                {{ formatPriority(ticket.priority) }}
              </span>
              <span :class="['status-badge', ticket.status]">
                {{ formatStatus(ticket.status) }}
              </span>
            </div>
          </div>

          <div class="ticket-description">
            {{ truncateText(ticket.description, 150) }}
          </div>

          <div class="ticket-footer">
            <div class="ticket-assignee">
              <span v-if="ticket.assignedTo" class="assignee-info">
                👤 {{ ticket.assignedTo.fullName }}
              </span>
              <span v-else class="unassigned">Sin asignar</span>
            </div>
            
            <div class="ticket-category">
              📂 {{ ticket.category || 'General' }}
            </div>

            <div v-if="ticket.scheduledDate" class="scheduled-info">
              📅 {{ formatDate(ticket.scheduledDate) }}
              <span v-if="ticket.scheduledTime">{{ ticket.scheduledTime }}</span>
            </div>
          </div>

          <!-- Progress bar for tickets in progress -->
          <div v-if="ticket.status === 'in_progress'" class="progress-indicator">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getProgressPercentage(ticket) + '%' }"></div>
            </div>
            <span class="progress-text">En progreso</span>
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
          ← Anterior
        </button>
        
        <div class="page-numbers">
          <button 
            v-for="page in getVisiblePages()" 
            :key="page"
            @click="changePage(page)"
            :class="['page-number', { active: page === currentPage }]"
          >
            {{ page }}
          </button>
        </div>
        
        <button 
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          Siguiente →
        </button>
      </div>
    </div>

    <!-- Modal para crear ticket rápido -->
    <div v-if="showQuickTicketModal" class="modal-overlay" @click="closeQuickTicketModal">
      <div class="modal-content quick-ticket-modal" @click.stop>
        <div class="modal-header">
          <h3>Crear Ticket Rápido</h3>
          <button @click="closeQuickTicketModal" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="submitQuickTicket">
            <div class="form-group">
              <label for="quickTitle">Título: *</label>
              <input 
                id="quickTitle"
                v-model="quickTicket.title" 
                type="text" 
                class="form-control"
                placeholder="Título del ticket"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="quickPriority">Prioridad:</label>
                <select id="quickPriority" v-model="quickTicket.priority" class="form-control">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Urgente</option>
                </select>
              </div>

              <div class="form-group">
                <label for="quickCategory">Categoría:</label>
                <select id="quickCategory" v-model="quickTicket.category" class="form-control">
                  <option value="technical">Técnico</option>
                  <option value="billing">Facturación</option>
                  <option value="installation">Instalación</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="quickDescription">Descripción: *</label>
              <textarea 
                id="quickDescription"
                v-model="quickTicket.description" 
                class="form-control"
                rows="4"
                placeholder="Describe el problema o solicitud"
                required
              ></textarea>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeQuickTicketModal" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-create" :disabled="creatingTicket">
                {{ creatingTicket ? 'Creando...' : 'Crear Ticket' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TicketService from '../../services/ticket.service';

export default {
  name: 'TicketsTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      tickets: [],
      loading: false,
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      searchTimeout: null,
      showQuickTicketModal: false,
      creatingTicket: false,
      
      filters: {
        status: '',
        priority: '',
        search: ''
      },

      ticketStats: {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0
      },

      quickTicket: {
        title: '',
        description: '',
        priority: 'medium',
        category: 'technical'
      }
    };
  },
  created() {
    this.loadTickets();
    this.loadTicketStats();
  },
  methods: {
    async loadTickets() {
      this.loading = true;
      
      try {
        const params = {
          clientId: this.clientId,
          page: this.currentPage,
          size: this.pageSize,
          ...this.filters
        };

        const response = await TicketService.getTickets(params);
        const data = response.data;

        this.tickets = data.tickets || data || [];
        this.totalItems = data.totalItems || this.tickets.length;
        this.totalPages = data.totalPages || Math.ceil(this.totalItems / this.pageSize);

        console.log('✅ Tickets cargados:', this.tickets.length);
      } catch (error) {
        console.error('❌ Error cargando tickets:', error);
        this.tickets = [];
      } finally {
        this.loading = false;
      }
    },

    async loadTicketStats() {
      try {
        // Si hay método específico para estadísticas
        const allTickets = await TicketService.getTickets({ 
          clientId: this.clientId, 
          size: 1000 
        });
        
        const tickets = allTickets.data.tickets || allTickets.data || [];
        
        this.ticketStats = {
          total: tickets.length,
          open: tickets.filter(t => t.status === 'open').length,
          inProgress: tickets.filter(t => t.status === 'in_progress').length,
          resolved: tickets.filter(t => t.status === 'resolved').length
        };
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    },

    debounceSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.currentPage = 1;
        this.loadTickets();
      }, 500);
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadTickets();
      }
    },

    getVisiblePages() {
      const pages = [];
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      return pages;
    },

    createTicket() {
      // Opción 1: Modal rápido
      this.showQuickTicketModal = true;
      
      // Opción 2: Navegar a formulario completo
      // this.$emit('create-ticket');
    },

    closeQuickTicketModal() {
      this.showQuickTicketModal = false;
      this.quickTicket = {
        title: '',
        description: '',
        priority: 'medium',
        category: 'technical'
      };
    },

    async submitQuickTicket() {
      this.creatingTicket = true;
      
      try {
        const ticketData = {
          ...this.quickTicket,
          clientId: this.clientId,
          status: 'open'
        };

        await TicketService.createTicket(ticketData);
        
        this.closeQuickTicketModal();
        this.loadTickets();
        this.loadTicketStats();
        
        this.$emit('ticket-created', ticketData);
      } catch (error) {
        console.error('Error creando ticket:', error);
        alert('Error creando ticket');
      } finally {
        this.creatingTicket = false;
      }
    },

    viewTicket(ticket) {
      this.$emit('view-ticket', ticket);
    },

    formatDate(dateString) {
      if (!dateString) return 'Sin fecha';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Hoy';
      } else if (diffDays === 1) {
        return 'Ayer';
      } else if (diffDays < 7) {
        return `Hace ${diffDays} días`;
      } else {
        return date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    },

    formatStatus(status) {
      const statusMap = {
        'open': 'Abierto',
        'in_progress': 'En Progreso',
        'resolved': 'Resuelto',
        'closed': 'Cerrado'
      };
      return statusMap[status] || status;
    },

    formatPriority(priority) {
      const priorityMap = {
        'low': 'Baja',
        'medium': 'Media',
        'high': 'Alta',
        'critical': 'Urgente'
      };
      return priorityMap[priority] || priority;
    },

    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },

    getProgressPercentage(ticket) {
      // Lógica simple para calcular progreso
      if (ticket.status === 'resolved') return 100;
      if (ticket.status === 'in_progress') return 60;
      if (ticket.status === 'open') return 20;
      return 0;
    }
  }
};
</script>

<style scoped>
.tickets-tab {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

/* ===============================
   HEADER
   =============================== */

.tickets-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-info h3 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 0.95rem;
}

.create-ticket-btn,
.create-first-ticket {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.create-ticket-btn:hover,
.create-first-ticket:hover {
  background: linear-gradient(135deg, #45a049, #3d8b40);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* ===============================
   FILTROS
   =============================== */

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 24px;
}

.filter-group {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select,
.search-input {
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
}

.filter-select {
  min-width: 150px;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select:focus,
.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ===============================
   RESUMEN DE TICKETS
   =============================== */

.tickets-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border-left: 4px solid #e0e0e0;
  transition: transform 0.2s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-card.open {
  border-left-color: #2196F3;
}

.summary-card.in-progress {
  border-left-color: #FF9800;
}

.summary-card.resolved {
  border-left-color: #4CAF50;
}

.summary-number {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.summary-label {
  color: #666;
  font-size: 0.9rem;
  font-weight: 500;
}

/* ===============================
   CONTENIDO DE TICKETS
   =============================== */

.tickets-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
}

/* ===============================
   LISTA DE TICKETS
   =============================== */

.tickets-list {
  display: flex;
  flex-direction: column;
}

.ticket-card {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.ticket-card:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.ticket-card:last-child {
  border-bottom: none;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.ticket-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.ticket-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #666;
}

.ticket-id {
  font-family: 'Courier New', monospace;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.ticket-badges {
  display: flex;
  gap: 8px;
}

.priority-badge,
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Priority badges */
.priority-badge.low {
  background: #e8f5e9;
  color: #2e7d32;
}

.priority-badge.medium {
  background: #fff8e1;
  color: #f57f17;
}

.priority-badge.high {
  background: #ffebee;
  color: #c62828;
}

.priority-badge.urgent {
  background: #fce4ec;
  color: #ad1457;
  animation: pulse 2s infinite;
}

/* Status badges */
.status-badge.open {
  background: #e3f2fd;
  color: #1565c0;
}

.status-badge.in_progress {
  background: #fff8e1;
  color: #f57f17;
}

.status-badge.resolved {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.closed {
  background: #f5f5f5;
  color: #757575;
}

.ticket-description {
  color: #555;
  line-height: 1.5;
  margin-bottom: 16px;
  font-size: 0.95rem;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #666;
  flex-wrap: wrap;
  gap: 12px;
}

.assignee-info {
  font-weight: 500;
}

.unassigned {
  color: #999;
  font-style: italic;
}

.scheduled-info {
  color: #2196F3;
  font-weight: 500;
}

/* ===============================
   INDICADOR DE PROGRESO
   =============================== */

.progress-indicator {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FF9800, #F57C00);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #FF9800;
  font-weight: 500;
}

/* ===============================
   ESTADOS
   =============================== */

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 1.3rem;
}

.empty-state p {
  margin: 0 0 20px 0;
  color: #999;
}

/* ===============================
   PAGINACIÓN
   =============================== */

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  gap: 16px;
}

.page-btn {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  padding: 8px 12px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-number:hover {
  background: #f5f5f5;
}

.page-number.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* ===============================
   MODAL
   =============================== */

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
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.quick-ticket-modal {
  max-width: 600px;
  width: 90vw;
}

.modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255,255,255,0.3);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.btn-cancel,
.btn-create {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e9ecef;
}

.btn-create {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
}

.btn-create:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a049, #3d8b40);
  transform: translateY(-1px);
}

.btn-create:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
}

/* ===============================
   ANIMACIONES
   =============================== */

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* ===============================
   RESPONSIVE
   =============================== */

@media (max-width: 768px) {
  .tickets-tab {
    padding: 16px;
  }

  .tickets-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
    gap: 12px;
  }

  .filter-select,
  .search-input {
    width: 100%;
  }

  .tickets-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .ticket-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .ticket-badges {
    flex-wrap: wrap;
  }

  .ticket-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .page-numbers {
    justify-content: center;
  }

  .form-row {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-create {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .tickets-summary {
    grid-template-columns: 1fr;
  }

  .summary-number {
    font-size: 1.5rem;
  }

  .ticket-card {
    padding: 16px;
  }

  .ticket-title {
    font-size: 1rem;
  }

  .modal-header,
  .modal-body {
    padding: 16px 20px;
  }
}
</style>