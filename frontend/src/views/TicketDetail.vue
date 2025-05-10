<template>
  <div class="ticket-detail">
    <h1 class="page-title">Detalles del Ticket</h1>
    
    <div v-if="loading" class="loading-spinner">
      Cargando información del ticket...
    </div>
    
    <div v-else-if="error" class="error-message">
      {{ error }}
    </div>
    
    <div v-else class="ticket-content">
      <div class="card mb-4">
        <div class="ticket-header d-flex justify-between">
          <div>
            <h2>{{ ticket.title }}</h2>
            <div class="ticket-meta">
              <span class="ticket-id">Ticket #{{ ticket.id }}</span>
              <span class="ticket-date">Creado: {{ formatDate(ticket.createdAt) }}</span>
            </div>
          </div>
          
          <div class="ticket-actions">
            <button class="btn mr-2" @click="goBack">Volver</button>
            <button class="btn btn-primary" @click="editTicket">Editar</button>
          </div>
        </div>
        
        <div class="ticket-info-grid mt-4">
          <div class="ticket-info-item">
            <div class="info-label">Estado</div>
            <div class="info-value">
              <span class="status" :class="getStatusClass(ticket.status)">
                {{ getStatusText(ticket.status) }}
              </span>
            </div>
          </div>
          
          <div class="ticket-info-item">
            <div class="info-label">Prioridad</div>
            <div class="info-value">
              <span class="priority" :class="getPriorityClass(ticket.priority)">
                {{ getPriorityText(ticket.priority) }}
              </span>
            </div>
          </div>
          
          <div class="ticket-info-item">
            <div class="info-label">Categoría</div>
            <div class="info-value">{{ ticket.category || 'No especificada' }}</div>
          </div>
          
          <div class="ticket-info-item">
            <div class="info-label">Asignado a</div>
            <div class="info-value">{{ getAssignedName(ticket) }}</div>
          </div>
          
          <div class="ticket-info-item">
            <div class="info-label">Cliente</div>
            <div class="info-value">
              <router-link 
                v-if="ticket.Client"
                :to="`/clients/${ticket.Client.id}`"
              >
                {{ getClientName(ticket) }}
              </router-link>
              <span v-else>Sin cliente</span>
            </div>
          </div>
          
          <div class="ticket-info-item">
            <div class="info-label">Creado por</div>
            <div class="info-value">{{ getCreatedByName(ticket) }}</div>
          </div>
        </div>
        
        <div class="ticket-description mt-4">
          <h3>Descripción</h3>
          <div class="description-content">
            {{ ticket.description }}
          </div>
        </div>
      </div>
      
      <div class="card mb-4">
        <h3>Comentarios</h3>
        
        <div v-if="loadingComments" class="loading-spinner">
          Cargando comentarios...
        </div>
        
        <div v-else-if="comments.length === 0" class="empty-state">
          No hay comentarios en este ticket.
        </div>
        
        <div v-else class="comments-list">
          <div 
            v-for="comment in comments" 
            :key="comment.id" 
            class="comment-item"
            :class="{ 'internal-comment': comment.isInternal }"
          >
            <div class="comment-header d-flex justify-between">
              <div>
                <span class="comment-author">{{ comment.User ? comment.User.fullName : 'Usuario' }}</span>
                <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                <span v-if="comment.isInternal" class="internal-badge">Interno</span>
              </div>
              
              <div class="comment-actions" v-if="canEditComment(comment)">
                <button class="btn-icon" @click="editComment(comment)" title="Editar">
                  ✏️
                </button>
                <button class="btn-icon" @click="deleteComment(comment.id)" title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>
            
            <div class="comment-content">
              {{ comment.content }}
            </div>
          </div>
        </div>
        
        <div class="add-comment mt-4">
          <h4>Agregar Comentario</h4>
          
          <div class="form-group">
            <textarea 
              v-model="newComment.content" 
              rows="4" 
              placeholder="Escribe tu comentario aquí..."
            ></textarea>
          </div>
          
          <div class="form-check mb-3">
            <input 
              type="checkbox" 
              id="isInternal" 
              v-model="newComment.isInternal"
            />
            <label for="isInternal">Comentario interno (solo visible para el equipo)</label>
          </div>
          
          <button 
            class="btn btn-primary" 
            @click="addComment" 
            :disabled="!newComment.content || submittingComment"
          >
            {{ submittingComment ? 'Enviando...' : 'Agregar Comentario' }}
          </button>
        </div>
      </div>
      
      <!-- Sección para cambiar estado -->
      <div class="card mb-4">
        <h3>Cambiar Estado</h3>
        
        <div class="d-flex flex-wrap gap-2 mt-3">
          <button 
            v-for="status in availableStatuses" 
            :key="status.value"
            class="btn"
            :class="[
              ticket.status === status.value ? 'btn-disabled' : '',
              getStatusBtnClass(status.value)
            ]"
            :disabled="ticket.status === status.value || updatingStatus"
            @click="updateTicketStatus(status.value)"
          >
            {{ status.text }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import TicketService from '../services/ticket.service';

export default {
  name: 'TicketDetail',
  data() {
    return {
      ticket: {},
      comments: [],
      loading: true,
      loadingComments: true,
      error: null,
      submittingComment: false,
      updatingStatus: false,
      newComment: {
        content: '',
        isInternal: false
      },
      availableStatuses: [
        { value: 'open', text: 'Abierto' },
        { value: 'in_progress', text: 'En Progreso' },
        { value: 'resolved', text: 'Resuelto' },
        { value: 'closed', text: 'Cerrado' }
      ]
    };
  },
  created() {
    this.loadTicket();
  },
  methods: {
    async loadTicket() {
      this.loading = true;
      this.error = null;
      
      try {
        const ticketId = this.$route.params.id;
        const response = await TicketService.getTicket(ticketId);
        this.ticket = response.data;
        
        // Cargar comentarios
        this.loadComments();
        
      } catch (error) {
        console.error('Error cargando ticket:', error);
        this.error = 'Error al cargar la información del ticket.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadComments() {
      this.loadingComments = true;
      
      try {
        const ticketId = this.$route.params.id;
        const response = await TicketService.getTicketComments(ticketId);
        this.comments = response.data;
      } catch (error) {
        console.error('Error cargando comentarios:', error);
      } finally {
        this.loadingComments = false;
      }
    },
    
    async addComment() {
      if (!this.newComment.content) return;
      
      this.submittingComment = true;
      
      try {
        const ticketId = this.$route.params.id;
        await TicketService.addComment(ticketId, this.newComment);
        
        // Limpiar formulario y recargar comentarios
        this.newComment = {
          content: '',
          isInternal: false
        };
        
        this.loadComments();
      } catch (error) {
        console.error('Error agregando comentario:', error);
      } finally {
        this.submittingComment = false;
      }
    },
    
    editComment(comment) {
      // Implementación simplificada - en una aplicación real, abriría un modal
      const newContent = prompt('Editar comentario:', comment.content);
      if (newContent !== null && newContent !== comment.content) {
        this.updateComment(comment.id, { 
          content: newContent,
          isInternal: comment.isInternal
        });
      }
    },
    
    async updateComment(commentId, updatedComment) {
      try {
        await TicketService.updateComment(commentId, updatedComment);
        this.loadComments();
      } catch (error) {
        console.error('Error actualizando comentario:', error);
      }
    },
    
    async deleteComment(commentId) {
      if (!confirm('¿Está seguro que desea eliminar este comentario?')) {
        return;
      }
      
      try {
        await TicketService.deleteComment(commentId);
        this.loadComments();
      } catch (error) {
        console.error('Error eliminando comentario:', error);
      }
    },
    
    async updateTicketStatus(newStatus) {
      this.updatingStatus = true;
      
      try {
        const ticketId = this.$route.params.id;
        await TicketService.updateTicket(ticketId, { status: newStatus });
        
        // Recargar ticket
        this.loadTicket();
      } catch (error) {
        console.error('Error actualizando estado del ticket:', error);
      } finally {
        this.updatingStatus = false;
      }
    },
    
    canEditComment(comment) {
      // En una aplicación real, verificaría si el usuario actual es el autor
      // o tiene permisos adecuados
      return true;
    },
    
    getClientName(ticket) {
      if (ticket.Client) {
        return `${ticket.Client.firstName} ${ticket.Client.lastName}`;
      }
      return 'Sin cliente';
    },
    
    getAssignedName(ticket) {
      if (ticket.assignedTo) {
        return ticket.assignedTo.fullName;
      }
      return 'Sin asignar';
    },
    
    getCreatedByName(ticket) {
      if (ticket.createdBy) {
        return ticket.createdBy.fullName;
      }
      return 'Sistema';
    },
    
    getStatusClass(status) {
      switch (status) {
        case 'open': return 'status-danger';
        case 'in_progress': return 'status-warning';
        case 'resolved': return 'status-success';
        case 'closed': return 'status-inactive';
        default: return '';
      }
    },
    
    getStatusBtnClass(status) {
      switch (status) {
        case 'open': return 'btn-outline-danger';
        case 'in_progress': return 'btn-outline-warning';
        case 'resolved': return 'btn-outline-success';
        case 'closed': return 'btn-outline-secondary';
        default: return '';
      }
    },
    
    getStatusText(status) {
      switch (status) {
        case 'open': return 'Abierto';
        case 'in_progress': return 'En Progreso';
        case 'resolved': return 'Resuelto';
        case 'closed': return 'Cerrado';
        default: return status;
      }
    },
    
    getPriorityClass(priority) {
      switch (priority) {
        case 'low': return 'priority-low';
        case 'medium': return 'priority-medium';
        case 'high': return 'priority-high';
        case 'critical': return 'priority-critical';
        default: return '';
      }
    },
    
    getPriorityText(priority) {
      switch (priority) {
        case 'low': return 'Baja';
        case 'medium': return 'Media';
        case 'high': return 'Alta';
        case 'critical': return 'Crítica';
        default: return priority;
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    goBack() {
      this.$router.push('/tickets');
    },
    
    editTicket() {
      this.$router.push(`/tickets/${this.ticket.id}/edit`);
    }
  }
};
</script>

<style scoped>
.ticket-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.loading-spinner, .error-message, .empty-state {
  padding: 30px;
  text-align: center;
}

.error-message {
  color: var(--danger);
}

.ticket-header {
  margin-bottom: 20px;
}

.ticket-meta {
  color: var(--text-secondary);
  margin-top: 8px;
}

.ticket-id, .ticket-date {
  margin-right: 15px;
}

.ticket-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.ticket-info-item {
  margin-bottom: 10px;
}

.info-label {
  font-weight: bold;
  color: var(--text-secondary);
  margin-bottom: 5px;
}

.ticket-description {
  margin-top: 20px;
}

.description-content {
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  white-space: pre-line;
}

.comments-list {
  margin-top: 20px;
}

.comment-item {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.internal-comment {
  background-color: #f8f9fa;
  border-left: 3px solid #607d8b;
}

.comment-header {
  margin-bottom: 10px;
}

.comment-author {
  font-weight: bold;
  margin-right: 10px;
}

.comment-date {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.internal-badge {
  background-color: #eceff1;
  color: #607d8b;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 10px;
}

.comment-content {
  white-space: pre-line;
}

.comment-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background-color: #f5f5f5;
}

.add-comment {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.status, .priority {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.btn-outline-danger {
  color: #c62828;
  border-color: #c62828;
}

.btn-outline-warning {
  color: #e65100;
  border-color: #e65100;
}

.btn-outline-success {
  color: #2e7d32;
  border-color: #2e7d32;
}

.btn-outline-secondary {
  color: #616161;
  border-color: #616161;
}

.gap-2 {
  gap: 10px;
}
</style>