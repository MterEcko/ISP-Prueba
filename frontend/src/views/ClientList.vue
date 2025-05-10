<template>
  <div class="client-list">
    <h2>Gestión de Clientes</h2>
    
    <div class="filters">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchName" 
          placeholder="Buscar por nombre"
          @keyup.enter="loadClients"
        />
        <button @click="loadClients">Buscar</button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedSector" @change="loadClients">
          <option value="">Todos los sectores</option>
          <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
            {{ sector.name }}
          </option>
        </select>
        
        <select v-model="selectedStatus" @change="loadClients">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
      
      <button class="add-button" @click="openNewClientForm">+ Nuevo Cliente</button>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando clientes...
    </div>
    
    <div v-else-if="clients.length === 0" class="no-data">
      No se encontraron clientes.
    </div>
    
    <table v-else class="client-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Sector</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in clients" :key="client.id">
          <td>{{ client.id }}</td>
          <td>{{ client.firstName }} {{ client.lastName }}</td>
          <td>{{ client.email || '-' }}</td>
          <td>{{ client.phone || '-' }}</td>
          <td>{{ client.Sector ? client.Sector.name : '-' }}</td>
          <td>
            <span :class="['status', client.active ? 'active' : 'inactive']">
              {{ client.active ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td class="actions">
            <button @click="viewClient(client.id)" title="Ver detalles">
              Ver
            </button>
            <button @click="editClient(client.id)" title="Editar">
              Editar
            </button>
            <button 
              @click="toggleClientStatus(client)" 
              :title="client.active ? 'Desactivar' : 'Activar'"
            >
              {{ client.active ? 'Desactivar' : 'Activar' }}
            </button>
            <button @click="confirmDelete(client)" title="Eliminar" class="delete">
              Eliminar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
      >
        Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
      >
        Siguiente
      </button>
    </div>
    
    <!-- Modal para confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro que desea eliminar al cliente <strong>{{ clientToDelete.firstName }} {{ clientToDelete.lastName }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false">Cancelar</button>
          <button @click="deleteClient" class="delete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClientService from '../services/client.service';
import NetworkService from '../services/network.service';

export default {
  name: 'ClientList',
  data() {
    return {
      clients: [],
      sectors: [],
      loading: false,
      searchName: '',
      selectedSector: '',
      selectedStatus: '',
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      showDeleteModal: false,
      clientToDelete: null
    };
  },
  created() {
    this.loadSectors();
    this.loadClients();
  },
  methods: {
    async loadSectors() {
      try {
        const response = await NetworkService.getAllSectors({ active: true });
        this.sectors = response.data;
      } catch (error) {
        console.error('Error cargando sectores:', error);
      }
    },
    async loadClients() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          name: this.searchName || undefined,
          sectorId: this.selectedSector || undefined,
          active: this.selectedStatus || undefined
        };
        
        const response = await ClientService.getAllClients(params);
        this.clients = response.data.clients;
        this.totalItems = response.data.totalItems;
        this.totalPages = response.data.totalPages;
      } catch (error) {
        console.error('Error cargando clientes:', error);
      } finally {
        this.loading = false;
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadClients();
      }
    },
    openNewClientForm() {
      this.$router.push('/clients/new');
    },
    viewClient(id) {
      this.$router.push(`/clients/${id}`);
    },
    editClient(id) {
      this.$router.push(`/clients/${id}/edit`);
    },
    async toggleClientStatus(client) {
      try {
        await ClientService.changeClientStatus(client.id, !client.active);
        // Actualizar cliente en la lista
        client.active = !client.active;
      } catch (error) {
        console.error('Error cambiando estado del cliente:', error);
      }
    },
    confirmDelete(client) {
      this.clientToDelete = client;
      this.showDeleteModal = true;
    },
    async deleteClient() {
      try {
        await ClientService.deleteClient(this.clientToDelete.id);
        this.showDeleteModal = false;
        // Recargar lista de clientes
        this.loadClients();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
      }
    }
  }
};
</script>

<style scoped>
.client-list {
  padding: 20px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-box {
  display: flex;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  width: 250px;
}

.search-box button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading, .no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.client-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.client-table th,
.client-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.client-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.client-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.client-table tr:hover {
  background-color: #f5f5f5;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
}

.status.active {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status.inactive {
  background-color: #ffebee;
  color: #c62828;
}

.actions {
  display: flex;
  gap: 5px;
}

.actions button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #e0e0e0;
}

.actions button:hover {
  background-color: #bdbdbd;
}

.actions button.delete {
  background-color: #ffcdd2;
  color: #c62828;
}

.actions button.delete:hover {
  background-color: #ef9a9a;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9em;
  color: #666;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal h3 {
  margin-top: 0;
  color: #333;
}

.modal .warning {
  color: #c62828;
  font-size: 0.9em;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-actions button.delete {
  background-color: #f44336;
  color: white;
}
</style>