<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-header">
      <div class="logo">
        <img src="@/assets/logo.png" alt="Logo ISP" />
        <span v-if="!isCollapsed">Sistema ISP</span>
      </div>
      <button class="toggle-button" @click="toggleSidebar">
        {{ isCollapsed ? '→' : '←' }}
      </button>
    </div>
    
    <div class="user-profile" v-if="currentUser">
      <div class="user-avatar">
        {{ getUserInitials() }}
      </div>
      <div class="user-info" v-if="!isCollapsed">
        <div class="user-name">{{ currentUser.fullName }}</div>
        <div class="user-role">{{ currentUser.role?.name || 'Usuario' }}</div>
      </div>
    </div>
    
    <nav class="sidebar-nav">
      <ul>
        <li>
          <router-link to="/dashboard">
            <span class="icon">📊</span>
            <span class="text" v-if="!isCollapsed">Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link to="/clients">
            <span class="icon">👥</span>
            <span class="text" v-if="!isCollapsed">Clientes</span>
          </router-link>
        </li>
        <li>
          <router-link to="/network">
            <span class="icon">📡</span>
            <span class="text" v-if="!isCollapsed">Red</span>
          </router-link>
        </li>
        <li>
          <router-link to="/tickets">
            <span class="icon">🎫</span>
            <span class="text" v-if="!isCollapsed">Tickets</span>
          </router-link>
        </li>
        <li>
          <router-link to="/inventory">
            <span class="icon">📦</span>
            <span class="text" v-if="!isCollapsed">Inventario</span>
          </router-link>
        </li>
        <li>
          <router-link to="/billing">
            <span class="icon">💰</span>
            <span class="text" v-if="!isCollapsed">Facturación</span>
          </router-link>
        </li>
        <li>
          <router-link to="/jellyfin">
            <span class="icon">📺</span>
            <span class="text" v-if="!isCollapsed">Jellyfin</span>
          </router-link>
        </li>
        <li>
          <router-link to="/communications">
            <span class="icon">📨</span>
            <span class="text" v-if="!isCollapsed">Comunicaciones</span>
          </router-link>
        </li>
        <li>
          <router-link to="/reports">
            <span class="icon">📊</span>
            <span class="text" v-if="!isCollapsed">Reportes</span>
          </router-link>
        </li>
        <li>
          <router-link to="/settings">
            <span class="icon">⚙️</span>
            <span class="text" v-if="!isCollapsed">Configuración</span>
          </router-link>
        </li>
      </ul>
    </nav>
    
    <div class="sidebar-footer">
      <button class="logout-button" @click="logout">
        <span class="icon">🚪</span>
        <span class="text" v-if="!isCollapsed">Cerrar Sesión</span>
      </button>
    </div>
  </div>
</template>

<script>
import AuthService from '../services/auth.service';

export default {
  name: 'Sidebar',
  data() {
    return {
      isCollapsed: false
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    }
  },
  methods: {
    toggleSidebar() {
      this.isCollapsed = !this.isCollapsed;
      // Emitir evento para que el layout principal se ajuste
      this.$emit('toggle', this.isCollapsed);
    },
    getUserInitials() {
      if (!this.currentUser || !this.currentUser.fullName) return '??';
      
      const names = this.currentUser.fullName.split(' ');
      if (names.length > 1) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    },
    logout() {
      this.$store.dispatch('auth/logout');
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
.sidebar {
  width: 250px;
  height: 100vh;
  background-color: #263238;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #37474F;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: bold;
  font-size: 1.2em;
}

.logo img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.toggle-button {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2em;
}

.user-profile {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #37474F;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background-color: #455A64;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.user-info {
  overflow: hidden;
}

.user-name {
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.8em;
  color: #B0BEC5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
}

.sidebar-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-nav li {
  margin-bottom: 4px;
}

.sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  text-decoration: none;
  color: white;
  transition: background-color 0.3s ease;
  border-radius: 4px;
  margin: 0 8px;
}

.sidebar-nav a:hover {
  background-color: #37474F;
}

.sidebar-nav a.router-link-active {
  background-color: #2196F3;
}

.icon {
  font-size: 1.2em;
  min-width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #37474F;
}

.logout-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: #455A64;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #546E7A;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
}
</style>