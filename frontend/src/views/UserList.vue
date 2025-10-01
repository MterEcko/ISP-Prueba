<template>
  <div class="user-list">
    <h2>Gestión de Usuarios</h2>
    
    <div class="filters-row">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchUsername" 
          placeholder="Buscar por nombre"
          @keyup.enter="loadUsers"
        />
        <button class="search-button" @click="loadUsers">Buscar</button>
      </div>
      
      <div class="filter-controls">
        <select v-model="selectedRole" @change="loadUsers">
          <option value="">Todos los roles</option>
          <option v-for="role in roles" :key="role.id" :value="role.id">
            {{ role.name }}
          </option>
        </select>
        
        <select v-model="selectedStatus" @change="loadUsers">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
      
      <button class="new-button" @click="openNewUserForm">+ Nuevo Usuario</button>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando usuarios...
    </div>
    
    <div v-else-if="users.length === 0" class="no-data">
      No se encontraron usuarios.
    </div>
    
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Usuario</th>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.fullName }}</td>
          <td>{{ user.email }}</td>
          <td>
            <div class="role-selector" v-if="user.username !== 'admin'">
              <select 
                v-model="user.roleId" 
                @change="changeUserRole(user)"
                :disabled="changing[user.id]"
              >
                <option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.name }}
                </option>
              </select>
              <div v-if="changing[user.id]" class="loading-spinner"></div>
            </div>
            <span v-else>
              {{ user.Role ? user.Role.name : 'Sin rol' }}
            </span>
          </td>
          <td>
            <span :class="['status', user.active ? 'active' : 'inactive']">
              {{ user.active ? 'Activo' : 'Inactivo' }}
            </span>
          </td>
          <td class="actions">
            <button @click="editUser(user.id)" class="edit-button">
              Editar
            </button>
            <button 
              @click="toggleUserStatus(user)" 
              :class="user.active ? 'deactivate-button' : 'activate-button'"
              :disabled="user.username === 'admin'"
            >
              {{ user.active ? 'Desactivar' : 'Activar' }}
            </button>
            <button 
              @click="confirmDelete(user)" 
              class="delete-button"
              :disabled="user.username === 'admin'"
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
        <p>¿Está seguro que desea eliminar al usuario <strong>{{ userToDelete.username }}</strong>?</p>
        <p class="warning">Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="cancel-button">Cancelar</button>
          <button @click="deleteUser" class="delete-button">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserService from '../services/user.service';
import RoleService from '../services/role.service';

export default {
  name: 'UserList',
  data() {
    return {
      users: [],
      roles: [],
      loading: false,
      searchUsername: '',
      selectedRole: '',
      selectedStatus: '',
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0,
      showDeleteModal: false,
      userToDelete: null,
      changing: {} // Para controlar el estado de carga al cambiar rol
    };
  },
  created() {
    this.loadRoles();
    this.loadUsers();
  },
  methods: {
    async loadRoles() {
      try {
        const response = await RoleService.getAllRoles();
        this.roles = response.data;
      } catch (error) {
        console.error('Error cargando roles:', error);
      }
    },
    async loadUsers() {
      this.loading = true;
      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          username: this.searchUsername || undefined,
          roleId: this.selectedRole || undefined,
          active: this.selectedStatus || undefined
        };
        
        const response = await UserService.getAllUsers(params);
        this.users = response.data.users;
        this.totalItems = response.data.totalItems;
        this.totalPages = response.data.totalPages;
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      } finally {
        this.loading = false;
      }
    },
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadUsers();
      }
    },
    openNewUserForm() {
      this.$router.push('/users/new');
    },
    editUser(id) {
      this.$router.push(`/users/${id}/edit`);
    },
    async toggleUserStatus(user) {
      if (user.username === 'admin') {
        return; // No permitir cambiar estado del usuario admin
      }
      
      try {
        await UserService.changeUserStatus(user.id, !user.active);
        // Actualizar usuario en la lista
        user.active = !user.active;
      } catch (error) {
        console.error('Error cambiando estado del usuario:', error);
      }
    },
    async changeUserRole(user) {
      if (user.username === 'admin') {
        return; // No permitir cambiar rol del usuario admin
      }
      
      // Marcar como cargando
      this.$set(this.changing, user.id, true);
      
      try {
        await UserService.changeUserRole(user.id, user.roleId);
        // Actualizar nombre del rol en la interfaz (recargar el usuario)
        const updatedUser = await UserService.getUser(user.id);
        Object.assign(user, updatedUser.data);
      } catch (error) {
        console.error('Error cambiando rol del usuario:', error);
        // Revertir el cambio en caso de error
        user.roleId = user.Role.id;
      } finally {
        // Quitar estado de carga
        this.$set(this.changing, user.id, false);
      }
    },
    confirmDelete(user) {
      if (user.username === 'admin') {
        return; // No permitir eliminar al usuario admin
      }
      
      this.userToDelete = user;
      this.showDeleteModal = true;
    },
    async deleteUser() {
      try {
        await UserService.deleteUser(this.userToDelete.id);
        this.showDeleteModal = false;
        // Recargar lista de usuarios
        this.loadUsers();
      } catch (error) {
        console.error('Error eliminando usuario:', error);
      }
    }
  }
};
</script>

<style scoped>
.user-list {
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
  white-space: nowrap;
}

.edit-button {
  padding: 6px 10px;
  background-color: #90CAF9;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.activate-button {
  padding: 6px 10px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.deactivate-button {
  padding: 6px 10px;
  background-color: #e0e0e0;
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

.role-selector {
  position: relative;
  display: flex;
  align-items: center;
}

.role-selector select {
  width: 100%;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.cancel-button {
  padding: 8px 16px;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>