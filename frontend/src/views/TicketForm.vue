<template>
  <div class="ticket-form">
    <h1 class="page-title">{{ isEdit ? 'Editar Ticket' : 'Nuevo Ticket' }}</h1>
    
    <div class="card">
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="title">Asunto *</label>
          <input 
            type="text" 
            id="title" 
            v-model="ticket.title" 
            required
            placeholder="Ingrese un título descriptivo"
          />
        </div>
        
        <div class="form-group">
          <label for="clientId">Cliente *</label>
          <select 
            id="clientId" 
            v-model="ticket.clientId" 
            required
          >
            <option value="">Seleccione un cliente</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.firstName }} {{ client.lastName }}
            </option>
          </select>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="priority">Prioridad</label>
            <select id="priority" v-model="ticket.priority">
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="category">Categoría</label>
            <select id="category" v-model="ticket.category">
              <option value="">Sin categoría</option>
              <option value="hardware">Hardware</option>
              <option value="connectivity">Conectividad</option>
              <option value="software">Software</option>
              <option value="billing">Facturación</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="assignedToId">Asignar a</label>
          <select id="assignedToId" v-model="ticket.assignedToId">
            <option value="">Sin asignar</option>
            <option v-for="user in technicians" :key="user.id" :value="user.id">
              {{ user.fullName }} ({{ user.username }})
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="description">Descripción *</label>
          <textarea 
            id="description" 
            v-model="ticket.description" 
            rows="6" 
            required
            placeholder="Describa el problema o solicitud en detalle"
          ></textarea>
        </div>
        
        <div v-if="isEdit" class="form-group">
          <label for="status">Estado</label>
          <select id="status" v-model="ticket.status">
            <option value="open">Abierto</option>
            <option value="in_progress">En Progreso</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
        
        <div class="error-message" v-if="errorMessage">
          {{ errorMessage }}
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn" @click="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import TicketService from '../services/ticket.service';
import ClientService from '../services/client.service';
import UserService from '../services/user.service';

export default {
  name: 'TicketForm',
  data() {
    return {
      ticket: {
        title: '',
        clientId: '',
        description: '',
        priority: 'medium',
        category: '',
        assignedToId: '',
        status: 'open'
      },
      clients: [],
      technicians: [],
      loading: false,
      loadingClients: false,
      loadingTechnicians: false,
      errorMessage: '',
      isEdit: false
    };
  },
  created() {
    // Verificar si estamos en modo edición
    const ticketId = this.$route.params.id;
    this.isEdit = ticketId && ticketId !== 'new';
    
    // Cargar datos para el formulario
    this.loadClients();
    this.loadTechnicians();
    
    if (this.isEdit) {
      this.loadTicket(ticketId);
    }
  },
  methods: {
    async loadTicket(id) {
      this.loading = true;
      try {
        const response = await TicketService.getTicket(id);
        const ticket = response.data;
        
        // Asignar datos al formulario
        this.ticket = {
          title: ticket.title,
          clientId: ticket.clientId,
          description: ticket.description,
          priority: ticket.priority,
          category: ticket.category || '',
          assignedToId: ticket.assignedToId || '',
          status: ticket.status
        };
      } catch (error) {
        console.error('Error cargando ticket:', error);
        this.errorMessage = 'Error al cargar los datos del ticket.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadClients() {
      this.loadingClients = true;
      try {
        // En una aplicación real, aquí cargarías los clientes desde el servidor
        // Para simplificar, usaremos datos simulados
        const response = await ClientService.getAllClients();
        this.clients = response.data.clients || [];
      } catch (error) {
        console.error('Error cargando clientes:', error);
      } finally {
        this.loadingClients = false;
      }
    },
    
    async loadTechnicians() {
      this.loadingTechnicians = true;
      try {
        // En una aplicación real, aquí cargarías los técnicos desde el servidor
        // Para simplificar, usaremos datos simulados
        const response = await UserService.getTechnicians();
        this.technicians = response.data || [];
      } catch (error) {
        console.error('Error cargando técnicos:', error);
        // Datos de prueba si falla la carga
        this.technicians = [
          { id: 1, username: 'tech1', fullName: 'Técnico Uno' },
          { id: 2, username: 'tech2', fullName: 'Técnico Dos' }
        ];
      } finally {
        this.loadingTechnicians = false;
      }
    },
    
    async submitForm() {
      // Validación básica
      if (!this.ticket.title || !this.ticket.clientId || !this.ticket.description) {
        this.errorMessage = 'Por favor complete todos los campos obligatorios.';
        return;
      }
      
      this.loading = true;
      this.errorMessage = '';
      
      try {
        if (this.isEdit) {
          // Actualizar ticket existente
          await TicketService.updateTicket(this.$route.params.id, this.ticket);
          this.$router.push(`/tickets/${this.$route.params.id}`);
        } else {
          // Crear nuevo ticket
          const response = await TicketService.createTicket(this.ticket);
          this.$router.push(`/tickets/${response.data.ticket.id}`);
        }
      } catch (error) {
        console.error('Error guardando ticket:', error);
        this.errorMessage = 'Error al guardar el ticket. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    
    cancel() {
      if (this.isEdit) {
        this.$router.push(`/tickets/${this.$route.params.id}`);
      } else {
        this.$router.push('/tickets');
      }
    }
  }
};
</script>

<style scoped>
.ticket-form {
  max-width: 800px;
  margin: 0 auto;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-row .form-group {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.error-message {
  color: var(--danger);
  margin: 15px 0;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>