<template>
  <div class="client-portal-tickets">
    <div class="header">
      <h1>Mis Tickets de Soporte</h1>
      <div class="header-actions">
        <button @click="showCreateModal = true" class="btn-new-ticket">
          + Nuevo Ticket
        </button>
        <button @click="goBack" class="btn-back">← Volver</button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Estado:</label>
        <select v-model="filters.status" @change="loadTickets">
          <option value="">Todos</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En Progreso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Prioridad:</label>
        <select v-model="filters.priority" @change="loadTickets">
          <option value="">Todas</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando tickets...</p>
    </div>

    <div v-else-if="tickets.length > 0" class="tickets-container">
      <!-- Resumen -->
      <div class="summary-cards">
        <div class="summary-card open">
          <span class="icon">📩</span>
          <div class="info">
            <span class="label">Abiertos</span>
            <span class="value">{{ countByStatus('open') }}</span>
          </div>
        </div>
        <div class="summary-card progress">
          <span class="icon">⚙️</span>
          <div class="info">
            <span class="label">En Progreso</span>
            <span class="value">{{ countByStatus('in_progress') }}</span>
          </div>
        </div>
        <div class="summary-card resolved">
          <span class="icon">✅</span>
          <div class="info">
            <span class="label">Resueltos</span>
            <span class="value">{{ countByStatus('resolved') }}</span>
          </div>
        </div>
      </div>

      <!-- Lista de tickets -->
      <div class="tickets-list">
        <div
          v-for="ticket in tickets"
          :key="ticket.id"
          class="ticket-card"
          :class="'priority-' + ticket.priority"
          @click="viewTicketDetail(ticket)"
        >
          <div class="ticket-header">
            <div class="ticket-id">
              <span class="label">Ticket</span>
              <span class="number">#{{ ticket.id }}</span>
            </div>
            <div class="ticket-badges">
              <span class="status-badge" :class="'status-' + ticket.status">
                {{ getStatusText(ticket.status) }}
              </span>
              <span class="priority-badge" :class="'priority-' + ticket.priority">
                {{ getPriorityText(ticket.priority) }}
              </span>
            </div>
          </div>

          <div class="ticket-body">
            <h3 class="ticket-subject">{{ ticket.subject }}</h3>
            <p class="ticket-description">{{ truncateText(ticket.description, 150) }}</p>
          </div>

          <div class="ticket-footer">
            <div class="ticket-meta">
              <span class="meta-item">
                <span class="icon">📅</span>
                <span>{{ formatDate(ticket.createdAt) }}</span>
              </span>
              <span class="meta-item" v-if="ticket.commentsCount > 0">
                <span class="icon">💬</span>
                <span>{{ ticket.commentsCount }} comentarios</span>
              </span>
            </div>
            <button @click.stop="viewTicketDetail(ticket)" class="btn-view">
              Ver Detalle
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-tickets">
      <p>📭 No tienes tickets en este momento</p>
      <button @click="showCreateModal = true" class="btn-create-first">
        Crear mi primer ticket
      </button>
    </div>

    <!-- Modal de creación -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Crear Nuevo Ticket</h2>
          <button @click="closeCreateModal" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <form @submit.prevent="createTicket">
            <div class="form-group">
              <label>Asunto *</label>
              <input
                type="text"
                v-model="newTicket.subject"
                placeholder="Ej: Problema con conexión a internet"
                required
              />
            </div>

            <div class="form-group">
              <label>Descripción *</label>
              <textarea
                v-model="newTicket.description"
                placeholder="Describe tu problema con detalle..."
                rows="5"
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label>Prioridad</label>
              <select v-model="newTicket.priority">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div class="form-actions">
              <button type="button" @click="closeCreateModal" class="btn-cancel">
                Cancelar
              </button>
              <button type="submit" class="btn-submit">
                Crear Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal de detalle -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <div class="header-info">
            <h2>Ticket #{{ selectedTicket.id }}</h2>
            <span class="status-badge" :class="'status-' + selectedTicket.status">
              {{ getStatusText(selectedTicket.status) }}
            </span>
          </div>
          <button @click="closeDetailModal" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="detail-section">
            <h3>{{ selectedTicket.subject }}</h3>
            <div class="ticket-metadata">
              <span class="meta-badge priority" :class="'priority-' + selectedTicket.priority">
                {{ getPriorityText(selectedTicket.priority) }}
              </span>
              <span class="meta-badge">
                📅 Creado: {{ formatDate(selectedTicket.createdAt) }}
              </span>
              <span class="meta-badge" v-if="selectedTicket.updatedAt">
                🔄 Actualizado: {{ formatDate(selectedTicket.updatedAt) }}
              </span>
            </div>
            <p class="ticket-description-full">{{ selectedTicket.description }}</p>
          </div>

          <!-- Comentarios -->
          <div class="comments-section">
            <h3>Comentarios ({{ selectedTicket.comments ? selectedTicket.comments.length : 0 }})</h3>

            <div v-if="selectedTicket.comments && selectedTicket.comments.length > 0" class="comments-list">
              <div
                v-for="comment in selectedTicket.comments"
                :key="comment.id"
                class="comment-item"
                :class="{ 'comment-staff': comment.isStaff }"
              >
                <div class="comment-header">
                  <span class="comment-author">
                    {{ comment.isStaff ? '🎧 Soporte' : '👤 Tú' }}
                  </span>
                  <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                </div>
                <p class="comment-text">{{ comment.message }}</p>
              </div>
            </div>

            <div v-else class="no-comments">
              <p>No hay comentarios aún</p>
            </div>

            <!-- Agregar comentario -->
            <div v-if="selectedTicket.status !== 'closed'" class="add-comment">
              <textarea
                v-model="newComment"
                placeholder="Escribe tu comentario..."
                rows="3"
              ></textarea>
              <button @click="addComment" class="btn-add-comment">
                Agregar Comentario
              </button>
            </div>

            <div v-else class="closed-notice">
              <p>⚠️ Este ticket está cerrado y no se pueden agregar más comentarios</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ClientPortalTickets',
  data() {
    return {
      loading: false,
      tickets: [],
      filters: {
        status: '',
        priority: ''
      },
      showCreateModal: false,
      showDetailModal: false,
      selectedTicket: null,
      newTicket: {
        subject: '',
        description: '',
        priority: 'medium'
      },
      newComment: ''
    };
  },
  mounted() {
    this.loadTickets();
  },
  methods: {
    async loadTickets() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_URL}client-portal/tickets`, {
          params: this.filters,
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.tickets = response.data.tickets;
      } catch (error) {
        console.error('Error al cargar tickets:', error);
        this.$toast?.error('Error al cargar los tickets');
      } finally {
        this.loading = false;
      }
    },
    async createTicket() {
      try {
        await axios.post(
          `${API_URL}client-portal/tickets`,
          this.newTicket,
          {
            headers: {
              'x-access-token': localStorage.getItem('token')
            }
          }
        );
        this.$toast?.success('Ticket creado exitosamente');
        this.closeCreateModal();
        this.loadTickets();
      } catch (error) {
        console.error('Error al crear ticket:', error);
        this.$toast?.error('Error al crear el ticket');
      }
    },
    async viewTicketDetail(ticket) {
      this.selectedTicket = ticket;
      this.showDetailModal = true;

      // Cargar comentarios si no están cargados
      if (!ticket.comments) {
        try {
          const response = await axios.get(
            `${API_URL}client-portal/tickets/${ticket.id}`,
            {
              headers: {
                'x-access-token': localStorage.getItem('token')
              }
            }
          );
          this.selectedTicket = response.data.ticket;
        } catch (error) {
          console.error('Error al cargar detalles:', error);
        }
      }
    },
    async addComment() {
      if (!this.newComment.trim()) {
        this.$toast?.warning('Por favor escribe un comentario');
        return;
      }

      try {
        await axios.post(
          `${API_URL}client-portal/tickets/${this.selectedTicket.id}/comments`,
          { message: this.newComment },
          {
            headers: {
              'x-access-token': localStorage.getItem('token')
            }
          }
        );
        this.$toast?.success('Comentario agregado');
        this.newComment = '';
        // Recargar el ticket
        this.viewTicketDetail(this.selectedTicket);
        this.loadTickets();
      } catch (error) {
        console.error('Error al agregar comentario:', error);
        this.$toast?.error('Error al agregar el comentario');
      }
    },
    closeCreateModal() {
      this.showCreateModal = false;
      this.newTicket = {
        subject: '',
        description: '',
        priority: 'medium'
      };
    },
    closeDetailModal() {
      this.showDetailModal = false;
      this.selectedTicket = null;
      this.newComment = '';
    },
    countByStatus(status) {
      return this.tickets.filter(t => t.status === status).length;
    },
    getStatusText(status) {
      const statusMap = {
        open: 'Abierto',
        in_progress: 'En Progreso',
        resolved: 'Resuelto',
        closed: 'Cerrado'
      };
      return statusMap[status] || status;
    },
    getPriorityText(priority) {
      const priorityMap = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
        urgent: 'Urgente'
      };
      return priorityMap[priority] || priority;
    },
    truncateText(text, length) {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + '...' : text;
    },
    formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    goBack() {
      this.$router.push('/client-portal/dashboard');
    }
  }
};
</script>

<style scoped>
.client-portal-tickets {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-new-ticket {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-new-ticket:hover {
  background: #229954;
}

.btn-back {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: #bdc3c7;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 14px;
  color: #666;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid;
}

.summary-card.open {
  border-left-color: #f39c12;
}

.summary-card.progress {
  border-left-color: #3498db;
}

.summary-card.resolved {
  border-left-color: #27ae60;
}

.summary-card .icon {
  font-size: 32px;
}

.summary-card .info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-card .label {
  font-size: 14px;
  color: #666;
}

.summary-card .value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.ticket-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.ticket-card.priority-low {
  border-left-color: #95a5a6;
}

.ticket-card.priority-medium {
  border-left-color: #3498db;
}

.ticket-card.priority-high {
  border-left-color: #f39c12;
}

.ticket-card.priority-urgent {
  border-left-color: #e74c3c;
}

.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.ticket-id {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ticket-id .label {
  font-size: 12px;
  color: #666;
}

.ticket-id .number {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.ticket-badges {
  display: flex;
  gap: 10px;
}

.status-badge,
.priority-badge {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.status-open {
  background: #fff3cd;
  color: #856404;
}

.status-badge.status-in_progress {
  background: #cce5ff;
  color: #004085;
}

.status-badge.status-resolved {
  background: #d4edda;
  color: #155724;
}

.status-badge.status-closed {
  background: #e2e3e5;
  color: #383d41;
}

.priority-badge.priority-low {
  background: #e2e3e5;
  color: #383d41;
}

.priority-badge.priority-medium {
  background: #cce5ff;
  color: #004085;
}

.priority-badge.priority-high {
  background: #fff3cd;
  color: #856404;
}

.priority-badge.priority-urgent {
  background: #f8d7da;
  color: #721c24;
}

.ticket-body {
  margin-bottom: 15px;
}

.ticket-subject {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 10px 0;
}

.ticket-description {
  color: #666;
  line-height: 1.5;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #666;
}

.meta-item .icon {
  font-size: 16px;
}

.btn-view {
  padding: 8px 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-view:hover {
  background: #2980b9;
}

.no-tickets {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-tickets p {
  font-size: 18px;
  color: #666;
  margin-bottom: 20px;
}

.btn-create-first {
  padding: 12px 24px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.btn-create-first:hover {
  background: #229954;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.modal-content.large {
  max-width: 900px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header .header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #2c3e50;
}

.btn-close {
  width: 30px;
  height: 30px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}

.btn-close:hover {
  background: #c0392b;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel:hover {
  background: #bdc3c7;
}

.btn-submit {
  padding: 10px 20px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-submit:hover {
  background: #229954;
}

.detail-section {
  margin-bottom: 30px;
}

.detail-section h3 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.ticket-metadata {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.meta-badge {
  padding: 5px 10px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.meta-badge.priority {
  font-weight: 500;
}

.ticket-description-full {
  color: #2c3e50;
  line-height: 1.6;
  white-space: pre-wrap;
}

.comments-section {
  border-top: 2px solid #ecf0f1;
  padding-top: 20px;
}

.comments-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.comment-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #3498db;
}

.comment-item.comment-staff {
  background: #e8f4f8;
  border-left-color: #27ae60;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.comment-author {
  font-weight: 500;
  color: #2c3e50;
}

.comment-date {
  font-size: 12px;
  color: #666;
}

.comment-text {
  color: #2c3e50;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.no-comments {
  text-align: center;
  padding: 20px;
  color: #666;
}

.add-comment {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.add-comment textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}

.btn-add-comment {
  align-self: flex-end;
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-add-comment:hover {
  background: #2980b9;
}

.closed-notice {
  padding: 15px;
  background: #fff3cd;
  border-radius: 6px;
  text-align: center;
}

.closed-notice p {
  margin: 0;
  color: #856404;
}
</style>
