<template>
  <div class="role-list">
    <h2>Gestión de Roles</h2>
    
    <div class="filters-row">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Buscar por nombre"
          @keyup.enter="loadRoles"
        />
        <button class="search-button" @click="loadRoles">Buscar</button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedCategory" @change="loadRoles">
          <option value="">Todas las categorías</option>
          <option value="admin">Administración</option>
          <option value="tecnico">Técnico</option>
          <option value="cliente">Cliente</option>
          <option value="soporte">Soporte</option>
        </select>
      </div>
      
      <button class="new-button" @click="openNewRoleForm">+ Nuevo Rol</button>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando roles...
    </div>
    
    <div v-else-if="roles.length === 0" class="no-data">
      No se encontraron roles.
    </div>
    
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Nivel</th>
          <th>Categoría</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="role in roles" :key="role.id">
          <td>{{ role.id }}</td>
          <td>{{ role.name }}</td>
          <td>{{ role.description }}</td>
          <td>{{ role.level }}</td>
          <td>{{ role.category }}</td>
          <td class="actions">
            <button @click="viewRole(role.id)" class="view-button">
              Permisos
            </button>
            <button @click="editRole(role.id)" class="edit-button">
              Editar
            </button>
            <button 
              @click="confirmDelete(role)" 
              class="delete-button"
              :disabled="role.name === 'admin'"
            >
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
        class="pagination-button"
      >
        Anterior
      </button>
      
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      
      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages" 
        class="pagination-button"
      >
        Siguiente
      </button>
    </div>
    
    <!-- Modal para confirmación de eliminación -->
    <div v-if="showDeleteModal" class="modal">
      <div class="modal-content">
        <h3>Confirmar Eliminación</h3>
        <p>¿Está seguro que desea eliminar el rol <strong>{{ roleToDelete.name }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer y afectará a todos los usuarios que tengan este rol.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="cancel-button">Cancelar</button>
          <button @click="deleteRole" class="delete-button">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RoleService from '../services/role.service';

export default {
  name: 'RoleList',
  data() {
    return {
      roles: [],
      loading: false,
      error: null,
      showDeleteModal: false,
      roleToDelete: null,
      searchQuery: '',
      selectedCategory: '',
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1
    };
  },
  created() {
    this.loadRoles();
  },
  methods: {
    async loadRoles() {
      this.loading = true;
      try {
        // Aquí añadimos la lógica para filtrar por búsqueda y categoría
        // Esta es una simulación ya que probablemente necesitarás actualizar también el backend
        let response = await RoleService.getAllRoles();
        let roles = response.data;
        
        // Filtrar roles por nombre (búsqueda)
        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase();
          roles = roles.filter(role => 
            role.name.toLowerCase().includes(query) || 
            role.description.toLowerCase().includes(query)
          );
        }
        
        // Filtrar por categoría
        if (this.selectedCategory) {
          roles = roles.filter(role => role.category === this.selectedCategory);
        }
        
        // Calcular paginación
        this.totalItems = roles.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        
        // Limitar a la página actual
        const startIndex = (this.currentPage - 1) * this.pageSize;
        this.roles = roles.slice(startIndex, startIndex + this.pageSize);
        
        // Asegurarse de que la página actual es válida
        if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
          this.loadRoles();
        }
      } catch (error) {
        console.error('Error cargando roles:', error);
        this.error = 'Error cargando roles. Por favor, intente nuevamente.';
      } finally {
        this.loading = false;
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadRoles();
      }
    },
    openNewRoleForm() {
      this.$router.push('/roles/new');
    },
    viewRole(id) {
      this.$router.push(`/roles/${id}/permissions`);
    },
    editRole(id) {
      this.$router.push(`/roles/${id}/edit`);
    },
    confirmDelete(role) {
      if (role.name === 'admin') {
        return; // No permitir eliminar el rol de administrador
      }
      this.roleToDelete = role;
      this.showDeleteModal = true;
    },
    async deleteRole() {
      try {
        await RoleService.deleteRole(this.roleToDelete.id);
        this.showDeleteModal = false;
        // Recargar lista de roles
        this.loadRoles();
      } catch (error) {
        console.error('Error eliminando rol:', error);
        this.error = 'Error eliminando rol. Por favor, intente nuevamente.';
      }
    }
  }
};
</script>

<style scoped>
.role-list {
  padding: 20px;
}

h2 {
  margin-bottom: 24px;
  color: #333;
}

.filters-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  flex: 1;
  max-width: 400px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
  width: 100%;
  font-size: 14px;
}

.search-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  font-size: 14px;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.filter-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.new-button {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.loading, .no-data {
  text-align: center;
  padding: 20px;
  color: #666;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.data-table th,
.data-table td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

.data-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.data-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.data-table tr:hover {
  background-color: #f5f5f5;
}

.actions {
  display: flex;
  gap: 5px;
}

.view-button {
  padding: 6px 10px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.edit-button {
  padding: 6px 10px;
  background-color: #90CAF9;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.delete-button {
  padding: 6px 10px;
  background-color: #FFCDD2;
  color: #C62828;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-button {
  padding: 6px 10px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.pagination-button {
  padding: 8px 16px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-button:disabled {
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
</style>