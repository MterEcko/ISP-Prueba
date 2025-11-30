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
        <!-- Sección Principal -->
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
          <router-link to="/tickets">
            <span class="icon">🎫</span>
            <span class="text" v-if="!isCollapsed">Tickets</span>
          </router-link>
        </li>

        <!-- Sección de Infraestructura -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">INFRAESTRUCTURA</span>
        </li>
        <li>
          <router-link to="/network">
            <span class="icon">📡</span>
            <span class="text" v-if="!isCollapsed">Red</span>
          </router-link>
        </li>
        <li>
          <router-link to="/mikrotik">
            <span class="icon">🔧</span>
            <span class="text" v-if="!isCollapsed">Mikrotik</span>
          </router-link>
        </li>
        <li>
          <router-link to="/devices">
            <span class="icon">🖥️</span>
            <span class="text" v-if="!isCollapsed">Dispositivos</span>
          </router-link>
        </li>
        <li>
          <router-link to="/device-families">
            <span class="icon">📋</span>
            <span class="text" v-if="!isCollapsed">Familias</span>
          </router-link>
        </li>
        <li>
          <router-link to="/device-brands">
            <span class="icon">🏷️</span>
            <span class="text" v-if="!isCollapsed">Marcas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/inventory">
            <span class="icon">📦</span>
            <span class="text" v-if="!isCollapsed">Inventario</span>
          </router-link>
        </li>

        <!-- Sección de Facturación -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">FACTURACIÓN</span>
        </li>
        <li>
          <router-link to="/billing">
            <span class="icon">💰</span>
            <span class="text" v-if="!isCollapsed">Facturación</span>
          </router-link>
        </li>
        <li>
          <router-link to="/billing/invoices">
            <span class="icon">🧾</span>
            <span class="text" v-if="!isCollapsed">Facturas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/billing/payments">
            <span class="icon">💳</span>
            <span class="text" v-if="!isCollapsed">Pagos</span>
          </router-link>
        </li>
        <li>
          <router-link to="/billing/overdue">
            <span class="icon">⏰</span>
            <span class="text" v-if="!isCollapsed">Vencidos</span>
          </router-link>
        </li>
        <li>
          <router-link to="/accounting/payroll">
            <span class="icon">💼</span>
            <span class="text" v-if="!isCollapsed">Nóminas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/service-packages">
            <span class="icon">📦</span>
            <span class="text" v-if="!isCollapsed">Paquetes</span>
          </router-link>
        </li>

        <!-- Sección de Comunicaciones -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">COMUNICACIONES</span>
        </li>
        <li>
          <router-link to="/communications">
            <span class="icon">📨</span>
            <span class="text" v-if="!isCollapsed">Comunicaciones</span>
          </router-link>
        </li>
        <li>
          <router-link to="/jellyfin">
            <span class="icon">📺</span>
            <span class="text" v-if="!isCollapsed">Jellyfin</span>
          </router-link>
        </li>
        <li>
          <router-link to="/chat">
            <span class="icon">💬</span>
            <span class="text" v-if="!isCollapsed">Chat</span>
          </router-link>
        </li>

        <!-- Sección de Herramientas -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">HERRAMIENTAS</span>
        </li>
        <li>
          <router-link to="/calendar">
            <span class="icon">📅</span>
            <span class="text" v-if="!isCollapsed">Calendario</span>
          </router-link>
        </li>
        <li>
          <router-link to="/reports">
            <span class="icon">📈</span>
            <span class="text" v-if="!isCollapsed">Reportes</span>
          </router-link>
        </li>
        <li>
          <router-link to="/metrics-dashboard">
            <span class="icon">📊</span>
            <span class="text" v-if="!isCollapsed">Métricas</span>
          </router-link>
        </li>
        <li>
          <router-link to="/coverage-map">
            <span class="icon">🗺️</span>
            <span class="text" v-if="!isCollapsed">Cobertura</span>
          </router-link>
        </li>

        <!-- Sección de Marketplace -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">MARKETPLACE</span>
        </li>
        <li>
          <router-link to="/store/dashboard">
            <span class="icon">🏪</span>
            <span class="text" v-if="!isCollapsed">Tienda</span>
          </router-link>
        </li>
        <li>
          <router-link to="/plugins/upload">
            <span class="icon">🔌</span>
            <span class="text" v-if="!isCollapsed">Plugins</span>
          </router-link>
        </li>

        <!-- Sección de Administración -->
        <li class="menu-separator" v-if="!isCollapsed">
          <span class="text">ADMINISTRACIÓN</span>
        </li>
        <li>
          <router-link to="/users">
            <span class="icon">👤</span>
            <span class="text" v-if="!isCollapsed">Usuarios</span>
          </router-link>
        </li>
        <li>
          <router-link to="/roles">
            <span class="icon">🔐</span>
            <span class="text" v-if="!isCollapsed">Roles</span>
          </router-link>
        </li>
        <li>
          <router-link to="/license/management">
            <span class="icon">🔑</span>
            <span class="text" v-if="!isCollapsed">Licencias</span>
          </router-link>
        </li>
        <li>
          <router-link to="/settings/backups">
            <span class="icon">💾</span>
            <span class="text" v-if="!isCollapsed">Respaldos</span>
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
export default {
  name: 'SidebarComponent',
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

.menu-separator {
  padding: 16px 16px 8px 16px;
  margin-top: 12px;
  border-top: 1px solid #37474F;
}

.menu-separator .text {
  font-size: 0.75em;
  font-weight: bold;
  color: #78909C;
  letter-spacing: 1px;
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
