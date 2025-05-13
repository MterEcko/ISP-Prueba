<template>
  <div class="mikrotik-client-control">
    <div class="page-header">
      <h1 class="page-title">Control de Clientes PPPoE</h1>
      <button class="btn btn-outline" @click="goBack">
        ← Volver
      </button>
    </div>
    
    <div v-if="device">
      <div class="device-info-bar">
        <h2>{{ device.name }}</h2>
        <div class="device-status">
          <span class="status-badge" :class="getStatusClass(device.status)">
            {{ device.status === 'online' ? 'Conectado' : 'Desconectado' }}
          </span>
          <span class="device-ip">{{ device.ipAddress }}</span>
        </div>
      </div>
      
      <!-- Estadísticas rápidas -->
      <div class="quick-stats">
        <div class="stat-item">
          <div class="stat-value">{{ pppoeSummary.totalUsers }}</div>
          <div class="stat-label">Usuarios totales</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pppoeSummary.activeSessions }}</div>
          <div class="stat-label">Sesiones activas</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ pppoeSummary.totalProfiles }}</div>
          <div class="stat-label">Perfiles disponibles</div>
        </div>
      </div>
      
      <!-- Tabs de navegación -->
      <div class="tabs">
        <button 
          class="tab" 
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          Usuarios PPPoE
        </button>
        <button 
          class="tab" 
          :class="{ active: activeTab === 'sessions' }"
          @click="activeTab = 'sessions'"
        >
          Sesiones Activas
        </button>
        <button 
          class="tab" 
          :class="{ active: activeTab === 'profiles' }"
          @click="activeTab = 'profiles'"
        >
          Perfiles
        </button>
      </div>
      
      <!-- Contenido de tabs -->
      <div class="tab-content">
        <!-- Tab: Usuarios PPPoE -->
        <div v-if="activeTab === 'users'" class="tab-panel">
          <div class="panel-header">
            <h3>Gestión de Usuarios PPPoE</h3>
            <button class="btn btn-primary" @click="showCreateUserModal = true">
              + Nuevo Usuario
            </button>
          </div>
          
          <div class="search-bar">
            <input 
              type="text" 
              v-model="userSearch" 
              placeholder="Buscar usuarios..."
              @input="filterUsers"
            />
          </div>
          
          <div v-if="loadingUsers" class="loading-state">
            Cargando usuarios...
          </div>
          
          <div v-else-if="filteredUsers.length === 0" class="empty-state">
            <p>No hay usuarios PPPoE registrados.</p>
          </div>
          
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Perfil</th>
                <th>Estado</th>
                <th>Comentario</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>{{ user.name }}</td>
                <td>{{ user.profile || '-' }}</td>
                <td>
                  <span class="status-badge" :class="user.disabled ? 'status-disabled' : 'status-enabled'">
                    {{ user.disabled ? 'Deshabilitado' : 'Habilitado' }}
                  </span>
                </td>
                <td>{{ user.comment || '-' }}</td>
                <td class="actions">
                  <button 
                    class="btn btn-small" 
                    @click="editUser(user)"
                    title="Editar usuario"
                  >
                    ✏️
                  </button>
                  <button 
                    class="btn btn-small btn-outline" 
                    @click="toggleUserStatus(user)"
                    :title="user.disabled ? 'Habilitar' : 'Deshabilitar'"
                  >
                    {{ user.disabled ? '✅' : '❌' }}
                  </button>
                  <button 
                    class="btn btn-small btn-danger" 
                    @click="confirmDeleteUser(user)"
                    title="Eliminar usuario"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Tab: Sesiones Activas -->
        <div v-if="activeTab === 'sessions'" class="tab-panel">
          <div class="panel-header">
            <h3>Sesiones PPPoE Activas</h3>
            <button class="btn btn-outline" @click="loadActiveSessions">
              🔄 Actualizar
            </button>
          </div>
          
          <div v-if="loadingSessions" class="loading-state">
            Cargando sesiones...
          </div>
          
          <div v-else-if="activeSessions.length === 0" class="empty-state">
            <p>No hay sesiones PPPoE activas.</p>
          </div>
          
          <table v-else class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Dirección IP</th>
                <th>Tiempo de sesión</th>
                <th>Velocidad</th>
                <th>Tráfico</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in activeSessions" :key="session.id">
                <td>{{ session.name }}</td>
                <td>{{ session.address || '-' }}</td>
                <td>{{ formatUptime(session.uptime) }}</td>
                <td>
                  <div class="speed-info">
                    <div>↓ {{ formatBandwidth(session.rxRate) }}</div>
                    <div>↑ {{ formatBandwidth(session.txRate) }}</div>
                  </div>
                </td>
                <td>
                  <div class="traffic-info">
                    <div>↓ {{ formatBytes(session.rxBytes) }}</div>
                    <div>↑ {{ formatBytes(session.txBytes) }}</div>
                  </div>
                </td>
                <td class="actions">
                  <button 
                    class="btn btn-small btn-warning" 
                    @click="restartSession(session)"
                    title="Reiniciar sesión"
                  >
                    🔄
                  </button>
                  <button 
                    class="btn btn-small btn-danger" 
                    @click="disconnectSession(session)"
                    title="Desconectar sesión"
                  >
                    🔌
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Tab: Perfiles -->
        <div v-if="activeTab === 'profiles'" class="tab-panel">
          <div class="panel-header">
            <h3>Perfiles PPPoE</h3>
          </div>
          
          <div v-if="loadingProfiles" class="loading-state">
            Cargando perfiles...
          </div>
          
          <div v-else-if="profiles.length === 0" class="empty-state">
            <p>No hay perfiles PPPoE configurados.</p>
          </div>
          
          <div v-else class="profiles-grid">
            <div v-for="profile in profiles" :key="profile.id" class="profile-card">
              <h4>{{ profile.name }}</h4>
              <div class="profile-details">
                <div class="profile-item">
                  <span class="label">Límite de velocidad:</span>
                  <span class="value">{{ profile.rateLimit || 'Sin límite' }}</span>
                </div>
                <div class="profile-item">
                  <span class="label">Pool de IPs:</span>
                  <span class="value">{{ profile.localAddress || 'No especificado' }}</span>
                </div>
                <div class="profile-item">
                  <span class="label">DNS:</span>
                  <span class="value">{{ profile.dns || 'No especificado' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal para crear/editar usuario -->
    <div v-if="showCreateUserModal" class="modal">
      <div class="modal-content">
        <h3>{{ editingUser ? 'Editar Usuario' : 'Nuevo Usuario PPPoE' }}</h3>
        <form @submit.prevent="saveUser">
          <div class="form-group">
            <label for="userName">Nombre de usuario *</label>
            <input 
              type="text" 
              id="userName" 
              v-model="userForm.name" 
              required
              placeholder="Nombre de usuario para PPPoE"
            />
          </div>
          
          <div class="form-group">
            <label for="userPassword">Contraseña *</label>
            <input 
              type="password" 
              id="userPassword" 
              v-model="userForm.password" 
              required
              placeholder="Contraseña del usuario"
            />
          </div>
          
          <div class="form-group">
            <label for="userProfile">Perfil *</label>
            <select id="userProfile" v-model="userForm.profile" required>
              <option value="">Seleccionar perfil</option>
              <option v-for="profile in profiles" :key="profile.id" :value="profile.name">
                {{ profile.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="userComment">Comentario</label>
            <input 
              type="text" 
              id="userComment" 
              v-model="userForm.comment" 
              placeholder="Comentario opcional"
            />
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn" @click="closeUserModal">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" :disabled="savingUser">
              {{ savingUser ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal">
      <div class="modal-content">
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        <div class="modal-actions">
          <button class="btn" @click="showConfirmModal = false">
            Cancelar
          </button>
          <button 
            class="btn btn-danger" 
            @click="confirmModal.action"
            :disabled="confirmModal.loading"
          >
            {{ confirmModal.loading ? 'Ejecutando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import MikrotikService from '../services/mikrotik.service';
import DeviceService from '../services/device.service';

export default {
  name: 'MikrotikClientControl',
  data() {
    return {
      device: null,
      activeTab: 'users',
      loadingUsers: false,
      loadingSessions: false,
      loadingProfiles: false,
      users: [],
      activeSessions: [],
      profiles: [],
      userSearch: '',
      filteredUsers: [],
      pppoeSummary: {
        totalUsers: 0,
        activeSessions: 0,
        totalProfiles: 0
      },
      showCreateUserModal: false,
      editingUser: false,
      userForm: {
        name: '',
        password: '',
        profile: '',
        comment: ''
      },
      savingUser: false,
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        action: null,
        loading: false
      }
    };
  },
  created() {
    this.deviceId = this.$route.params.deviceId;
    this.loadDevice();
    this.loadUsers();
    this.loadActiveSessions();
    this.loadProfiles();
  },
  methods: {
    async loadDevice() {
      try {
        const response = await DeviceService.getDevice(this.deviceId);
        this.device = response.data;
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.$router.push('/mikrotik');
      }
    },
    
    async loadUsers() {
      this.loadingUsers = true;
      try {
        const response = await MikrotikService.getPPPoEUsers(this.deviceId);
        this.users = response.data.data || [];
        this.pppoeSummary.totalUsers = this.users.length;
        this.filterUsers();
      } catch (error) {
        console.error('Error cargando usuarios PPPoE:', error);
      } finally {
        this.loadingUsers = false;
      }
    },
    
    async loadActiveSessions() {
      this.loadingSessions = true;
      try {
        const response = await MikrotikService.getActivePPPoESessions(this.deviceId);
        this.activeSessions = response.data.data || [];
        this.pppoeSummary.activeSessions = this.activeSessions.length;
      } catch (error) {
        console.error('Error cargando sesiones activas:', error);
      } finally {
        this.loadingSessions = false;
      }
    },
    
    async loadProfiles() {
      this.loadingProfiles = true;
      try {
        const response = await MikrotikService.getPPPoEProfiles(this.deviceId);
        this.profiles = response.data.data || [];
        this.pppoeSummary.totalProfiles = this.profiles.length;
      } catch (error) {
        console.error('Error cargando perfiles PPPoE:', error);
      } finally {
        this.loadingProfiles = false;
      }
    },
    
    filterUsers() {
      if (!this.userSearch.trim()) {
        this.filteredUsers = this.users;
      } else {
        const search = this.userSearch.toLowerCase();
        this.filteredUsers = this.users.filter(user => 
          user.name.toLowerCase().includes(search) ||
          (user.comment && user.comment.toLowerCase().includes(search))
        );
      }
    },
    
    editUser(user) {
      this.editingUser = true;
      this.userForm = {
        id: user.id,
        name: user.name,
        password: '', // Por seguridad, no cargar la contraseña existente
        profile: user.profile || '',
        comment: user.comment || ''
      };
      this.showCreateUserModal = true;
    },
    
    async saveUser() {
      this.savingUser = true;
      try {
        if (this.editingUser) {
          await MikrotikService.updatePPPoEUser(this.deviceId, this.userForm.id, this.userForm);
        } else {
          await MikrotikService.createPPPoEUser(this.deviceId, this.userForm);
        }
        
        this.closeUserModal();
        this.loadUsers();
      } catch (error) {
        console.error('Error guardando usuario:', error);
        alert('Error al guardar el usuario: ' + (error.response?.data?.message || error.message));
      } finally {
        this.savingUser = false;
      }
    },
    
    closeUserModal() {
      this.showCreateUserModal = false;
      this.editingUser = false;
      this.userForm = {
        name: '',
        password: '',
        profile: '',
        comment: ''
      };
    },
    
    toggleUserStatus(user) {
      const action = user.disabled ? 'habilitar' : 'deshabilitar';
      this.confirmModal = {
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
        message: `¿Está seguro que desea ${action} al usuario ${user.name}?`,
        action: () => this.executeToggleUserStatus(user),
        loading: false
      };
      this.showConfirmModal = true;
    },
    
    async executeToggleUserStatus(user) {
      this.confirmModal.loading = true;
      try {
        await MikrotikService.updatePPPoEUser(this.deviceId, user.id, {
          disabled: !user.disabled
        });
        this.showConfirmModal = false;
        this.loadUsers();
      } catch (error) {
        console.error('Error cambiando estado del usuario:', error);
        alert('Error al cambiar el estado del usuario');
      } finally {
        this.confirmModal.loading = false;
      }
    },
    
    confirmDeleteUser(user) {
      this.confirmModal = {
        title: 'Eliminar Usuario',
        message: `¿Está seguro que desea eliminar al usuario ${user.name}? Esta acción no se puede deshacer.`,
        action: () => this.executeDeleteUser(user),
        loading: false
      };
      this.showConfirmModal = true;
    },
    
    async executeDeleteUser(user) {
      this.confirmModal.loading = true;
      try {
        await MikrotikService.deletePPPoEUser(this.deviceId, user.id);
        this.showConfirmModal = false;
        this.loadUsers();
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar el usuario');
      } finally {
        this.confirmModal.loading = false;
      }
    },
    
    restartSession(session) {
      this.confirmModal = {
        title: 'Reiniciar Sesión',
        message: `¿Está seguro que desea reiniciar la sesión de ${session.name}?`,
        action: () => this.executeRestartSession(session),
        loading: false
      };
      this.showConfirmModal = true;
    },
    
    async executeRestartSession(session) {
      this.confirmModal.loading = true;
      try {
        await MikrotikService.restartPPPoESession(this.deviceId, session.id);
        this.showConfirmModal = false;
        this.loadActiveSessions();
      } catch (error) {
        console.error('Error reiniciando sesión:', error);
        alert('Error al reiniciar la sesión');
      } finally {
        this.confirmModal.loading = false;
      }
    },
    
    disconnectSession(session) {
      this.confirmModal = {
        title: 'Desconectar Sesión',
        message: `¿Está seguro que desea desconectar la sesión de ${session.name}?`,
        action: () => this.executeDisconnectSession(session),
        loading: false
      };
      this.showConfirmModal = true;
    },
    
    async executeDisconnectSession(session) {
      this.confirmModal.loading = true;
      try {
        await MikrotikService.restartPPPoESession(this.deviceId, session.id);
        this.showConfirmModal = false;
        this.loadActiveSessions();
      } catch (error) {
        console.error('Error desconectando sesión:', error);
        alert('Error al desconectar la sesión');
      } finally {
        this.confirmModal.loading = false;
      }
    },
    
    getStatusClass(status) {
      return {
        'status-online': status === 'online',
        'status-offline': status === 'offline',
        'status-unknown': status === 'unknown'
      };
    },
    
    formatUptime(uptime) {
      return MikrotikService.formatUptime(uptime);
    },
    
    formatBytes(bytes) {
      return MikrotikService.formatBytes(bytes);
    },
    
    formatBandwidth(bps) {
      if (!bps) return 'N/A';
      return this.formatBytes(bps) + '/s';
    },
    
    goBack() {
      this.$router.push('/mikrotik');
    }
  }
};
</script>

<style scoped>
.mikrotik-client-control {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0;
}

.device-info-bar {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.device-info-bar h2 {
  margin: 0;
  color: #2c3e50;
}

.device-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-ip {
  color: #666;
  font-family: monospace;
}

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  margin-top: 5px;
  color: #666;
  font-size: 0.9rem;
}

.tabs {
  display: flex;
  background-color: white;
  border-radius: 8px 8px 0 0;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tab {
  flex: 1;
  padding: 15px;
  border: none;
  background-color: #f8f9fa;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.tab:hover {
  background-color: #e9ecef;
}

.tab.active {
  background-color: white;
  border-bottom: 3px solid #3498db;
}

.tab-content {
  background-color: white;
  border-radius: 0 0 8px 8px;
  padding: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.tab-panel {
  padding: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
  color: #2c3e50;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar input {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
}

.data-table tr:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-enabled {
  background-color: #d4edda;
  color: #155724;
}

.status-disabled {
  background-color: #f8d7da;
  color: #721c24;
}

.status-online {
  background-color: #d4edda;
  color: #155724;
}

.status-offline {
  background-color: #f8d7da;
  color: #721c24;
}

.status-unknown {
  background-color: #fff3cd;
  color: #856404;
}

.actions {
  display: flex;
  gap: 5px;
}

.speed-info, .traffic-info {
  font-size: 0.8rem;
  line-height: 1.2;
}

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.profile-card {
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 15px;
  background-color: #f8f9fa;
}

.profile-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-item {
  display: flex;
  justify-content: space-between;
}

.profile-item .label {
  font-weight: 600;
  color: #555;
}

.profile-item .value {
  color: #333;
  font-family: monospace;
  font-size: 0.9rem;
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
  border-radius: 8px;
  padding: 30px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-outline {
  background-color: transparent;
  color: #3498db;
  border: 1px solid #3498db;
}

.btn-outline:hover {
  background-color: #3498db;
  color: white;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c0392b;
}

.btn-warning {
  background-color: #f39c12;
  color: white;
}

.btn-warning:hover {
  background-color: #d35400;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .device-info-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .tabs {
    display: block;
  }
  
  .tab {
    display: block;
    border-radius: 0;
  }
  
  .actions {
    flex-wrap: wrap;
  }
  
  .data-table {
    font-size: 0.8rem;
  }
}
</style>