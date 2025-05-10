<template>
  <div class="ticket-list">
    <h1 class="page-title">Sistema de Tickets</h1>
    
    <div class="card">
      <div class="card-header d-flex justify-between align-center">
        <h2>Tickets de Soporte</h2>
        <button class="btn btn-primary" @click="openNewTicketForm">
          Nuevo Ticket
        </button>
      </div>
      
      <div class="filters mb-4">
        <div class="d-flex align-center flex-wrap">
          <div class="search-box mr-3 mb-2">
            <input 
              type="text" 
              v-model="filters.search" 
              placeholder="Buscar en tickets..." 
              @keyup.enter="loadTickets"
            />
          </div>
          
          <div class="filter-select mr-3 mb-2">
            <select v-model="filters.status" @change="loadTickets">
              <option value="">Todos los estados</option>
              <option value="open">Abiertos</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resueltos</option>
              <option value="closed">Cerrados</option>
            </select>
          </div>
          
          <div class="filter-select mr-3 mb-2">
            <select v-model="filters.priority" @change="loadTickets">
              <option value="">Todas las prioridades</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          
          <button class="btn mb-2" @click="resetFilters">
            Limpiar Filtros
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading-spinner">
        Cargando tickets...
      </div>
      
      <div v-else-if="tickets.length === 0" class="empty-state">
        <p>No se encontraron tickets con los filtros seleccionados.</p>
        <button class="btn" @click="resetFilters">Limpiar Filtros</button>
      </div>
      
      <table v-else class="ticket-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Asunto</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Asignado a</th>
            <th>Creado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in tickets" :key="ticket.id">
            <td>{{ ticket.id }}</td>
            <td>{{ ticket.title }}</td>
            <td>{{ getClientName(ticket) }}</td>
            <td>
              <span class="status" :class="getStatusClass(ticket.status)">
                {{ getStatusText(ticket.status) }}
              </span>
            </td>
            <td>
              <span class="priority" :class="getPriorityClass(ticket.priority)">
                {{ getPriorityText(ticket.priority) }}
              </span>
            </td>
            <td>{{ getAssignedName(ticket) }}</td>
            <td>{{ formatDate(ticket.createdAt) }}</td>
            <td class="actions">
              <button class="btn-icon" @click="viewTicket(ticket.id)" title="Ver detalles">
                👁️
              </button>
              <button class="btn-icon" @click="editTicket(ticket.id)" title="Editar">
                ✏️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="tickets.length > 0" class="pagination mt-3">
        <button 
          class="btn" 
          @click="prevPage" 
          :disabled="pagination.currentPage === 1"
        >
          Anterior
        </button>
        
        <span class="page-info">
          Página {{ pagination.currentPage }} de {{ pagination.totalPages }}
        </span>
        
        <button 
          class="btn" 
          @click="nextPage" 
          :disabled="pagination.currentPage === pagination.totalPages"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import TicketService from '../services/ticket.service';

export default {
  name: 'TicketList',
  data() {
    return {
      tickets: [],
      loading: false,
      filters: {
        search: '',
        status: '',
        priority: '',
        category: '',
        assignedToId: '',
        clientId: ''
      },
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        pageSize: 10
      }
    };
  },
  created() {
    this.loadTickets();
  },
  methods: {
    async loadTickets() {
      this.loading = true;
      
      try {
        const params = {
          page: this.pagination.currentPage,
          size: this.pagination.pageSize,
          ...this.filters
        };
        
        const response = await TicketService.getTickets(params);
        
        this.tickets = response.data.tickets;
        this.pagination.totalItems = response.data.totalItems;
        this.pagination.totalPages = response.data.totalPages;
        
      } catch (error) {
        console.error('Error cargando tickets:', error);
      } finally {
        this.loading = false;
      }
    },
    
    resetFilters() {
      this.filters = {
        search: '',
        status: '',
        priority: '',
        category: '',
        assignedToId: '',
        clientId: ''
      };
      this.pagination.currentPage = 1;
      this.loadTickets();
    },
    
    prevPage() {
      if (this.pagination.currentPage > 1) {
        this.pagination.currentPage--;
        this.loadTickets();
      }
    },
    
    nextPage() {
      if (this.pagination.currentPage < this.pagination.totalPages) {
        this.pagination.currentPage++;
        this.loadTickets();
      }
    },
    
    openNewTicketForm() {
      this.$router.push('/tickets/new');
    },
    
    viewTicket(id) {
      this.$router.push(`/tickets/${id}`);
    },
    
    editTicket(id) {
      this.$router.push(`/tickets/${id}/edit`);
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
    
    getStatusClass(status) {
      switch (status) {
        case 'open': return 'status-danger';
        case 'in_progress': return 'status-warning';
        case 'resolved': return 'status-success';
        case 'closed': return 'status-inactive';
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
        year: 'numeric'
      });
    }
  }
};
</script>

<style scoped>
.ticket-list {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
}

.search-box input {
  width: 300px;
}

.filter-select select {
  min-width: 150px;
}

.loading-spinner, .empty-state {
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
}

.ticket-table {
  width: 100%;
}

.status, .priority {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.status-danger {
  background-color: #ffebee;
  color: #c62828;
}

.status-warning {
  background-color: #fff3e0;
  color: #e65100;
}

.status-success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-inactive {
  background-color: #f5f5f5;
  color: #616161;
}

.priority-low {
  background-color: #e0f7fa;
  color: #006064;
}

.priority-medium {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.priority-high {
  background-color: #fff3e0;
  color: #e65100;
}

.priority-critical {
  background-color: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  border-radius: 4px;
}

.btn-icon:hover {
  background-color: #f5f5f5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.page-info {
  color: var(--text-secondary);
}
</style>