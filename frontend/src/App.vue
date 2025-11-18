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

          <!-- Indicador de Licencia -->
          <LicenseStatusIndicator />

          <div class="user-menu">
            <span class="user-name">{{ currentUser?.fullName }}</span>
            <div class="avatar">{{ getUserInitials() }}</div>
          </div>
        </div>
      </header>
      
      <div class="app-container">
        <Sidebar @toggle="handleSidebarToggle" />

        <main class="app-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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
import Sidebar from '@/components/Sidebar.vue';
import LicenseStatusIndicator from '@/components/license/LicenseStatusIndicator.vue';
import telemetryService from '@/services/telemetry.service';

export default {
  components: {
    Sidebar,
    LicenseStatusIndicator
  },
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
    }
  },
  mounted() {
    // Iniciar telemetría cuando el componente se monta
    if (this.isLoggedIn) {
      this.$store.dispatch('license/loadLicenseFromStorage');
      this.$store.dispatch('license/checkLicenseStatus');
      telemetryService.startAutomaticTelemetry();

      // Verificar si el sistema está bloqueado
      if (telemetryService.isSystemBlocked()) {
        alert(`⚠️ SISTEMA BLOQUEADO\n\n${telemetryService.getBlockReason()}\n\nContacte al administrador.`);
      }
    }
  },
  beforeUnmount() {
    // Detener telemetría al desmontar
    telemetryService.stopAutomaticTelemetry();
  },
  watch: {
    isLoggedIn(newVal) {
      if (newVal) {
        this.$store.dispatch('license/loadLicenseFromStorage');
        telemetryService.startAutomaticTelemetry();
      } else {
        telemetryService.stopAutomaticTelemetry();
      }
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
    handleSidebarToggle(isCollapsed) {
      this.sidebarCollapsed = isCollapsed;
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

.app-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - 60px);
  background-color: #f5f5f5;
}

@media (max-width: 768px) {
  .user-name {
    display: none;
  }

  .search-bar {
    display: none;
  }
}
</style>