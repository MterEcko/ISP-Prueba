<template>
  <div id="app">
    <!-- Solo mostrar sidebar y header para usuarios autenticados -->
    <template v-if="isLoggedIn">
      <header class="app-header">
        <div class="header-brand">
          <button class="menu-toggle" @click="toggleSidebar">
            <span>☰</span>
          </button>
          <h1>Sistema Integral ISP</h1>
        </div>
        
        <div class="header-actions">
          <div class="search-bar">
            <input type="text" placeholder="Buscar..." />
            <button>🔍</button>
          </div>
          
          <div class="user-menu">
            <span class="user-name">{{ currentUser?.fullName }}</span>
            <div class="avatar">{{ getUserInitials() }}</div>
          </div>
        </div>
      </header>
      
      <div class="app-container">
        <aside class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
          <nav>
            <ul>
              <li>
                <router-link to="/dashboard">
                  <span class="icon">📊</span>
                  <span class="text" v-if="!sidebarCollapsed">Dashboard</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/clients">
                  <span class="icon">👥</span>
                  <span class="text" v-if="!sidebarCollapsed">Clientes</span>
                </router-link>
              </li>
              
              <!-- Gestión de Red con submenu -->
              <li class="menu-group">
                <router-link to="/network" class="main-menu-item">
                  <span class="icon">🏢</span>
                  <span class="text" v-if="!sidebarCollapsed">Gestión de Red</span>
                  <span v-if="!sidebarCollapsed && isNetworkSectionActive" class="expand-icon">▼</span>
                  <span v-else-if="!sidebarCollapsed" class="expand-icon">▶</span>
                </router-link>
                
                <!-- Submenu para Gestión de Red -->
                <ul v-if="!sidebarCollapsed && isNetworkSectionActive" class="submenu">
                  <li>
                    <router-link to="/network" class="submenu-item">
                      <span class="submenu-icon">📋</span>
                      <span class="submenu-text">Vista General</span>
                    </router-link>
                  </li>
                  <li>
                    <router-link to="/zones/new" class="submenu-item">
                      <span class="submenu-icon">➕</span>
                      <span class="submenu-text">Nueva Zona</span>
                    </router-link>
                  </li>
                </ul>
              </li>
              
              <!-- Mikrotik con submenu -->
              <li class="menu-group">
                <router-link to="/mikrotik" class="main-menu-item">
                  <span class="icon">🔧</span>
                  <span class="text" v-if="!sidebarCollapsed">Mikrotik</span>
                  <span v-if="!sidebarCollapsed && isMikrotikSectionActive" class="expand-icon">▼</span>
                  <span v-else-if="!sidebarCollapsed" class="expand-icon">▶</span>
                </router-link>
                
                <!-- Submenu para Mikrotik -->
                <ul v-if="!sidebarCollapsed && isMikrotikSectionActive" class="submenu">
                  <li>
                    <router-link to="/mikrotik" class="submenu-item">
                      <span class="submenu-icon">🔧</span>
                      <span class="submenu-text">Routers</span>
                    </router-link>
                  </li>
                  <li>
                    <router-link to="/mikrotik/pools" class="submenu-item">
                      <span class="submenu-icon">🌐</span>
                      <span class="submenu-text">Pools IP</span>
                    </router-link>
                  </li>
                  <li>
                    <router-link to="/mikrotik/profiles" class="submenu-item">
                      <span class="submenu-icon">⚙️</span>
                      <span class="submenu-text">Perfiles</span>
                    </router-link>
                  </li>
                </ul>
              </li>
              
              <li>
                <router-link to="/tickets">
                  <span class="icon">🎫</span>
                  <span class="text" v-if="!sidebarCollapsed">Tickets</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/devices">
                  <span class="icon">💻</span>
                  <span class="text" v-if="!sidebarCollapsed">Dispositivos</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/inventory">
                  <span class="icon">📦</span>
                  <span class="text" v-if="!sidebarCollapsed">Inventario</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/service-packages">
                  <span class="icon">📋</span>
                  <span class="text" v-if="!sidebarCollapsed">Paquetes</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/billing" v-if="false">
                  <span class="icon">💰</span>
                  <span class="text" v-if="!sidebarCollapsed">Facturación</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/jellyfin" v-if="false">
                  <span class="icon">📺</span>
                  <span class="text" v-if="!sidebarCollapsed">Jellyfin</span>
                </router-link>
              </li>
              
              <li>
                <router-link to="/settings">
                  <span class="icon">⚙️</span>
                  <span class="text" v-if="!sidebarCollapsed">Configuración</span>
                </router-link>
              </li>
              
              <li>
                <a href="#" @click.prevent="logout">
                  <span class="icon">🚪</span>
                  <span class="text" v-if="!sidebarCollapsed">Cerrar Sesión</span>
                </a>
              </li>
            </ul>
          </nav>
        </aside>
        
        <main class="app-content">
          <router-view />
        </main>
      </div>
    </template>
    
    <!-- Solo mostrar el router-view sin layout para páginas públicas -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sidebarCollapsed: false
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth.user;
    },
    isLoggedIn() {
      return this.$store.state.auth.status.loggedIn;
    },
    isNetworkSectionActive() {
      const networkPaths = ['/network', '/zones', '/nodes', '/sectors'];
      return networkPaths.some(path => this.$route.path.includes(path));
    },
    isMikrotikSectionActive() {
      return this.$route.path.includes('/mikrotik');
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
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

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 16px;
  color: #333;
  background-color: #f5f5f5;
  line-height: 1.5;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2c3e50;
  color: white;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-brand h1 {
  font-size: 1.3rem;
  margin: 0;
}

.menu-toggle {
  background: none;
  border: none;
  color: white;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-bar {
  display: flex;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.search-bar input {
  background: transparent;
  border: none;
  padding: 8px 12px;
  color: white;
  width: 200px;
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-bar button {
  background: none;
  border: none;
  color: white;
  padding: 0 10px;
  cursor: pointer;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.avatar {
  width: 35px;
  height: 35px;
  background-color: #3498db;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.app-container {
  display: flex;
  flex: 1;
}

.app-sidebar {
  width: 250px;
  background-color: #34495e;
  color: white;
  transition: width 0.3s;
  overflow-y: auto;
  height: calc(100vh - 60px);
}

.app-sidebar.collapsed {
  width: 60px;
}

.app-sidebar nav ul {
  list-style: none;
  padding: 0;
}

.app-sidebar nav li {
  position: relative;
}

.app-sidebar nav li a {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 12px 20px;
  color: white;
  text-decoration: none;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.app-sidebar nav li a:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.app-sidebar nav li a.router-link-active {
  background-color: rgba(255, 255, 255, 0.2);
  border-left: 3px solid #3498db;
}

.app-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 60px);
}

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    z-index: 100;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    transform: translateX(0);
    transition: transform 0.3s, width 0.3s;
  }

  .app-sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .user-name {
    display: none;
  }
  
  .search-bar {
    display: none;
  }
}
</style>