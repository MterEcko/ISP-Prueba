<template>
  <div class="command-list">
    <div class="page-header">
      <h1>Gestión de Comandos</h1>
      <div class="header-actions">
        <button @click="refreshCommands" class="btn-refresh" :disabled="loading">
          🔄 Actualizar
        </button>
        <router-link to="/commands/new" class="btn-primary">
          + Nuevo Comando
        </router-link>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters-section">
      <div class="filters">
        <div class="filter-group">
          <label>Categoría:</label>
          <select v-model="selectedCategory" @change="loadCommands">
            <option value="">Todas las categorías</option>
            <option value="system">Sistema</option>
            <option value="network">Red</option>
            <option value="wireless">Inalámbrico</option>
            <option value="interface">Interfaces</option>
            <option value="monitoring">Monitoreo</option>
            <option value="backup">Respaldo</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Nivel de Permiso:</label>
          <select v-model="selectedPermissionLevel" @change="loadCommands">
            <option value="">Todos los niveles</option>
            <option value="1">Básico (1)</option>
            <option value="2">Intermedio (2)</option>
            <option value="3">Avanzado (3)</option>
            <option value="4">Crítico (4)</option>
            <option value="5">Administrador (5)</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Estado:</label>
          <select v-model="selectedStatus" @change="loadCommands">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div class="filter-group search-group">
          <label>Buscar:</label>
          <input 
            type="text" 
            v-model="searchTerm" 
            @keyup.enter="loadCommands"
            placeholder="Nombre o descripción del comando"
          />
          <button @click="loadCommands" class="search-btn">🔍</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando comandos...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-content">
        <div class="error-icon">❌</div>
        <h3>Error al cargar comandos</h3>
        <p>{{ error }}</p>
        <button @click="loadCommands" class="btn-primary">Reintentar</button>
      </div>
    </div>

    <!-- Lista de Comandos -->
    <div v-else-if="commands.length > 0" class="commands-container">
      <div class="commands-grid">
        <div 
          v-for="command in commands" 
          :key="command.id" 
          class="command-card"
          :class="{ 'inactive': !command.active }"
        >
          <!-- Header del comando -->
          <div class="command-header">
            <div class="command-title">
              <h3>{{ command.displayName || command.name }}</h3>
              <div class="command-badges">
                <span :class="['badge', 'category', command.category]">
                  {{ getCategoryName(command.category) }}
                </span>
                <span :class="['badge', 'permission-level', getPermissionClass(command.permissionLevel)]">
                  Nivel {{ command.permissionLevel }}
                </span>
                <span v-if="command.requiresConfirmation" class="badge warning">
                  ⚠️ Confirmación
                </span>
                <span v-if="command.affectsService" class="badge danger">
                  🚨 Afecta Servicio
                </span>
              </div>
            </div>

            <div class="command-status">
              <span :class="['status-indicator', command.active ? 'active' : 'inactive']">
                {{ command.active ? '✅' : '❌' }}
              </span>
            </div>
          </div>

          <!-- Descripción -->
          <div class="command-description">
            <p>{{ command.description }}</p>
          </div>

          <!-- Estadísticas de implementación -->
          <div class="implementation-stats">
            <div class="stat-item">
              <span class="stat-label">Implementaciones:</span>
              <span class="stat-value">{{ getImplementationCount(command) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Marcas soportadas:</span>
              <span class="stat-value">{{ getSupportedBrandsCount(command) }}</span>
            </div>
          </div>

          <!-- Marcas soportadas -->
          <div class="supported-brands" v-if="command.CommandImplementations && command.CommandImplementations.length > 0">
            <div class="brands-list">
              <span 
                v-for="impl in getUniqueBrands(command.CommandImplementations)" 
                :key="impl.brandId"
                :class="['brand-tag', impl.brandName?.toLowerCase()]"
              >
                {{ impl.displayName || impl.brandName }}
              </span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="command-actions">
            <button 
              @click="viewImplementations(command)"
              class="btn-small btn-info"
              :title="'Ver implementaciones de ' + command.name"
            >
              📋 Implementaciones
            </button>

            <router-link 
              :to="`/commands/${command.id}/edit`"
              class="btn-small btn-secondary"
              :title="'Editar ' + command.name"
            >
              ✏️ Editar
            </router-link>

            <button 
              @click="toggleCommandStatus(command)"
              :class="['btn-small', command.active ? 'btn-warning' : 'btn-success']"
              :title="command.active ? 'Desactivar comando' : 'Activar comando'"
              :disabled="updatingStatus"
            >
              {{ command.active ? '⏸️ Desactivar' : '▶️ Activar' }}
            </button>

            <button 
              @click="confirmDeleteCommand(command)"
              class="btn-small btn-danger"
              :title="'Eliminar ' + command.name"
              :disabled="deletingCommand"
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>

      <!-- Paginación -->
      <div class="pagination" v-if="totalPages > 1">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage === 1"
          class="btn-page"
        >
          ← Anterior
        </button>

        <div class="page-numbers">
          <button 
            v-for="page in visiblePages" 
            :key="page"
            @click="changePage(page)"
            :class="['btn-page', { active: page === currentPage }]"
          >
            {{ page }}
          </button>
        </div>

        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage === totalPages"
          class="btn-page"
        >
          Siguiente →
        </button>

        <div class="page-info">
          <span>{{ totalItems }} comandos en total</span>
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">📋</div>
        <h3>No hay comandos disponibles</h3>
        <p>No se encontraron comandos con los filtros aplicados.</p>
        <div class="empty-actions">
          <button @click="clearFilters" class="btn-secondary">Limpiar Filtros</button>
          <router-link to="/commands/new" class="btn-primary">
            Crear Primer Comando
          </router-link>
        </div>
      </div>
    </div>

    <!-- Modal de Implementaciones -->
    <div v-if="showImplementationsModal" class="modal" @click="closeImplementationsModal">
      <div class="modal-content large-modal" @click.stop>
        <div class="modal-header">
          <h3>Implementaciones: {{ selectedCommand?.displayName || selectedCommand?.name }}</h3>
          <button @click="closeImplementationsModal" class="close-btn">❌</button>
        </div>

        <div class="modal-body">
          <div v-if="loadingImplementations" class="loading-implementations">
            <div class="spinner"></div>
            <p>Cargando implementaciones...</p>
          </div>

          <div v-else-if="commandImplementations.length > 0" class="implementations-list">
            <div 
              v-for="impl in commandImplementations" 
              :key="impl.id"
              class="implementation-item"
            >
              <div class="impl-header">
                <div class="impl-brand">
                  <span :class="['brand-tag', impl.DeviceBrand?.name?.toLowerCase()]">
                    {{ impl.DeviceBrand?.displayName || impl.DeviceBrand?.name }}
                  </span>
                  <span v-if="impl.DeviceFamily" class="family-tag">
                    {{ impl.DeviceFamily?.displayName || impl.DeviceFamily?.name }}
                  </span>
                </div>
                <div class="impl-status">
                  <span :class="['status-badge', impl.active ? 'active' : 'inactive']">
                    {{ impl.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </div>
              </div>

              <div class="impl-details">
                <div class="detail-row">
                  <span class="label">Tipo de Conexión:</span>
                  <span class="value">{{ impl.connectionType?.toUpperCase() }}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Implementación:</span>
                  <code class="implementation-code">{{ impl.implementation }}</code>
                </div>
                <div class="detail-row" v-if="impl.successRate !== null">
                  <span class="label">Tasa de Éxito:</span>
                  <span class="value success-rate">{{ (impl.successRate * 100).toFixed(1) }}%</span>
                </div>
                <div class="detail-row" v-if="impl.lastTested">
                  <span class="label">Última Prueba:</span>
                  <span class="value">{{ formatDate(impl.lastTested) }}</span>
                </div>
              </div>

              <div class="impl-actions">
                <router-link 
                  :to="`/command-implementations/${impl.id}/edit`"
                  class="btn-small btn-secondary"
                >
                  Editar
                </router-link>
                <button 
                  @click="testImplementation(impl)"
                  class="btn-small btn-info"
                  :disabled="testingImplementation"
                >
                  {{ testingImplementation ? 'Probando...' : 'Probar' }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="no-implementations">
            <p>No hay implementaciones para este comando.</p>
          </div>

          <div class="modal-footer">
            <router-link 
              :to="`/command-implementations/new?commandId=${selectedCommand?.id}`"
              class="btn-primary"
            >
              + Nueva Implementación
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Confirmación de Eliminación -->
    <div v-if="showDeleteModal" class="modal" @click="closeDeleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Eliminación</h3>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar el comando <strong>"{{ commandToDelete?.displayName || commandToDelete?.name }}"</strong>?</p>
          <p class="warning-text">Esta acción eliminará también todas las implementaciones asociadas y no se puede deshacer.</p>
        </div>
        <div class="modal-footer">
          <button @click="closeDeleteModal" class="btn-secondary">Cancelar</button>
          <button @click="deleteCommand" class="btn-danger" :disabled="deletingCommand">
            {{ deletingCommand ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CommandService from '../services/command.service';

export default {
  name: 'CommandList',
  data() {
    return {
      commands: [],
      loading: false,
      error: null,
      selectedCategory: '',
      selectedPermissionLevel: '',
      selectedStatus: '',
      searchTerm: '',
      currentPage: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 0,

      // Estados de operaciones
      updatingStatus: false,
      deletingCommand: false,

      // Modal de implementaciones
      showImplementationsModal: false,
      selectedCommand: null,
      commandImplementations: [],
      loadingImplementations: false,
      testingImplementation: false,

      // Modal de eliminación
      showDeleteModal: false,
      commandToDelete: null
    };
  },
  computed: {
    visiblePages() {
      const pages = [];
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    }
  },
  created() {
    this.loadCommands();
  },
  methods: {
    async loadCommands() {
      this.loading = true;
      this.error = null;

      try {
        const params = {
          page: this.currentPage,
          size: this.pageSize,
          category: this.selectedCategory || undefined,
          permissionLevel: this.selectedPermissionLevel || undefined,
          active: this.selectedStatus === 'true' ? true : this.selectedStatus === 'false' ? false : undefined,
          search: this.searchTerm || undefined
        };

        const response = await CommandService.getAllCommands(params);

        this.commands = response.data.commands || response.data.items || response.data || [];
        this.totalItems = response.data.totalItems || this.commands.length;
        this.totalPages = response.data.totalPages || Math.ceil(this.totalItems / this.pageSize);

      } catch (error) {
        console.error('Error cargando comandos:', error);
        this.error = error.response?.data?.message || 'Error al cargar los comandos';
        this.commands = [];
      } finally {
        this.loading = false;
      }
    },

    refreshCommands() {
      this.loadCommands();
    },

    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadCommands();
      }
    },

    clearFilters() {
      this.selectedCategory = '';
      this.selectedPermissionLevel = '';
      this.selectedStatus = '';
      this.searchTerm = '';
      this.currentPage = 1;
      this.loadCommands();
    },

    async viewImplementations(command) {
      this.selectedCommand = command;
      this.showImplementationsModal = true;
      this.loadingImplementations = true;

      try {
        const response = await CommandService.getCommandImplementations(command.id);
        this.commandImplementations = response.data.implementations || response.data || [];
      } catch (error) {
        console.error('Error cargando implementaciones:', error);
        this.commandImplementations = [];
      } finally {
        this.loadingImplementations = false;
      }
    },

    closeImplementationsModal() {
      this.showImplementationsModal = false;
      this.selectedCommand = null;
      this.commandImplementations = [];
    },

    async toggleCommandStatus(command) {
      this.updatingStatus = true;

      try {
        await CommandService.toggleCommand(command.id);
        command.active = !command.active;
      } catch (error) {
        console.error('Error cambiando estado del comando:', error);
        alert('Error al cambiar el estado del comando: ' + (error.response?.data?.message || error.message));
      } finally {
        this.updatingStatus = false;
      }
    },

    confirmDeleteCommand(command) {
      this.commandToDelete = command;
      this.showDeleteModal = true;
    },

    closeDeleteModal() {
      this.showDeleteModal = false;
      this.commandToDelete = null;
    },

    async deleteCommand() {
      if (!this.commandToDelete) return;

      this.deletingCommand = true;

      try {
        await CommandService.deleteCommand(this.commandToDelete.id);
        this.commands = this.commands.filter(c => c.id !== this.commandToDelete.id);
        this.closeDeleteModal();
      } catch (error) {
        console.error('Error eliminando comando:', error);
        alert('Error al eliminar el comando: ' + (error.response?.data?.message || error.message));
      } finally {
        this.deletingCommand = false;
      }
    },

    async testImplementation(implementation) {
      this.testingImplementation = true;

      try {
        const response = await CommandService.testImplementation(implementation.id);
        if (response.data.success) {
          alert('Implementación probada exitosamente');
        } else {
          alert('Error en la prueba: ' + response.data.message);
        }
      } catch (error) {
        console.error('Error probando implementación:', error);
        alert('Error al probar la implementación: ' + (error.response?.data?.message || error.message));
      } finally {
        this.testingImplementation = false;
      }
    },

    getImplementationCount(command) {
      return command.CommandImplementations?.length || 0;
    },

    getSupportedBrandsCount(command) {
      if (!command.CommandImplementations) return 0;
      const uniqueBrands = new Set(command.CommandImplementations.map(impl => impl.brandId));
      return uniqueBrands.size;
    },

    getUniqueBrands(implementations) {
      const brandMap = new Map();
      implementations.forEach(impl => {
        if (impl.DeviceBrand && !brandMap.has(impl.DeviceBrand.id)) {
          brandMap.set(impl.DeviceBrand.id, {
            brandId: impl.DeviceBrand.id,
            brandName: impl.DeviceBrand.name,
            displayName: impl.DeviceBrand.displayName
          });
        }
      });
      return Array.from(brandMap.values());
    },

    getCategoryName(category) {
      const names = {
        system: 'Sistema',
        network: 'Red',
        wireless: 'Inalámbrico',
        interface: 'Interfaces',
        monitoring: 'Monitoreo',
        backup: 'Respaldo',
        maintenance: 'Mantenimiento'
      };
      return names[category] || category;
    },

    getPermissionClass(level) {
      if (level <= 1) return 'basic';
      if (level <= 2) return 'intermediate';
      if (level <= 3) return 'advanced';
      if (level <= 4) return 'critical';
      return 'admin';
    },

    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      return new Date(dateString).toLocaleString('es-MX');
    }
  }
};
</script>

<style>
.command-list {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: 
#2c3e50;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-refresh {
  padding: 10px 16px;
  background: 
#6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: 
#545b62;
}

.btn-primary {
  padding: 10px 16px;
  background: 
#007bff;
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: 
#0056b3;
}

.btn-secondary {
  padding: 10px 16px;
  background: 
#6c757d;
  color: white;
  text-decoration: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background: 
#545b62;
}

.btn-danger {
  padding: 10px 16px;
  background: 
#dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-danger:hover:not(:disabled) {
  background: 
#c82333;
}

.filters-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.search-group {
  flex-direction: row;
  align-items: end;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #555;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-btn {
  padding: 8px 12px;
  background: 
#28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.error-state {
  color: 
#dc3545;
}

.error-content .error-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid 
#f3f3f3;
  border-top: 4px solid 
#007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.command-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 4px solid 
#007bff;
}

.command-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.command-card.inactive {
  opacity: 0.6;
  border-left-color: 
#dc3545;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.command-title h3 {
  margin: 0 0 8px 0;
  color: 
#2c3e50;
  font-size: 1.2em;
}

.command-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75em;
  font-weight: 500;
}

.badge.category {
  background: 
#e3f2fd;
  color: 
#1976d2;
}

.badge.permission-level.basic {
  background: 
#e8f5e8;
  color: 
#2e7d32;
}

.badge.permission-level.intermediate {
  background: 
#fff3e0;
  color: 
#f57c00;
}

.badge.permission-level.advanced {
  background: 
#fce4ec;
  color: 
#c2185b;
}

.badge.permission-level.critical {
  background: 
#ffebee;
  color: 
#d32f2f;
}

.badge.permission-level.admin {
  background: 
#f3e5f5;
  color: 
#7b1fa2;
}

.badge.warning {
  background: 
#fff8e1;
  color: 
#f57f17;
}

.badge.danger {
  background: 
#ffebee;
  color: 
#c62828;
}

.status-indicator.active {
  color: 
#28a745;
}

.status-indicator.inactive {
  color: 
#dc3545;
}

.command-description {
  margin-bottom: 15px;
  color: #666;
  line-height: 1.4;
}

.implementation-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px;
  background: 
#f8f9fa;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.8em;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-weight: bold;
  color: 
#007bff;
}

.supported-brands {
  margin-bottom: 15px;
}

.brands-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.brand-tag {
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.75em;
  font-weight: 500;
  background: 
#f8f9fa;
  color: 
#495057;
}

.brand-tag.mikrotik {
  background: 
#e3f2fd;
  color: 
#1976d2;
}

.brand-tag.ubiquiti {
  background: 
#e8f5e8;
  color: 
#2e7d32;
}

.brand-tag.tplink {
  background: 
#fff3e0;
  color: 
#f57c00;
}

.command-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-small {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
  text-decoration: none;
  transition: background-color 0.2s;
}

.btn-small.btn-info {
  background: 
#17a2b8;
  color: white;
}

.btn-small.btn-secondary {
  background: 
#6c757d;
  color: white;
}

.btn-small.btn-warning {
  background: 
#ffc107;
  color: 
#212529;
}

.btn-small.btn-success {
  background: 
#28a745;
  color: white;
}

.btn-small.btn-danger {
  background: 
#dc3545;
  color: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
}

.btn-page {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-page:hover:not(:disabled) {
  background: 
#007bff;
  color: white;
  border-color: 
#007bff;
}

.btn-page.active {
 background: #007bff;
 color: white;
 border-color: #007bff;
}

.btn-page:disabled {
 opacity: 0.5;
 cursor: not-allowed;
}

.page-numbers {
 display: flex;
 gap: 5px;
}

.page-info {
 margin-left: 20px;
 color: #666;
 font-size: 0.9em;
}

.empty-state {
 display: flex;
 justify-content: center;
 align-items: center;
 padding: 80px 20px;
}

.empty-content {
 text-align: center;
 max-width: 400px;
}

.empty-icon {
 font-size: 4rem;
 margin-bottom: 20px;
 opacity: 0.3;
}

.empty-content h3 {
 color: #666;
 margin-bottom: 10px;
}

.empty-content p {
 color: #999;
 margin-bottom: 30px;
}

.empty-actions {
 display: flex;
 gap: 15px;
 justify-content: center;
}

.modal {
 position: fixed;
 top: 0;
 left: 0;
 width: 100%;
 height: 100%;
 background: rgba(0, 0, 0, 0.5);
 display: flex;
 justify-content: center;
 align-items: center;
 z-index: 1000;
}

.modal-content {
 background: white;
 border-radius: 12px;
 width: 90%;
 max-width: 600px;
 max-height: 90vh;
 overflow-y: auto;
 box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-content.large-modal {
 max-width: 900px;
}

.modal-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding: 20px;
 border-bottom: 1px solid #eee;
}

.modal-header h3 {
 margin: 0;
 color: #2c3e50;
}

.close-btn {
 background: none;
 border: none;
 font-size: 1.2em;
 cursor: pointer;
 padding: 5px;
 border-radius: 4px;
 transition: background-color 0.2s;
}

.close-btn:hover {
 background: #f8f9fa;
}

.modal-body {
 padding: 20px;
}

.modal-footer {
 padding: 20px;
 border-top: 1px solid #eee;
 display: flex;
 justify-content: flex-end;
 gap: 10px;
}

.loading-implementations {
 display: flex;
 flex-direction: column;
 align-items: center;
 padding: 40px;
 color: #666;
}

.implementations-list {
 display: flex;
 flex-direction: column;
 gap: 15px;
}

.implementation-item {
 background: #f8f9fa;
 border-radius: 8px;
 padding: 15px;
 border: 1px solid #e9ecef;
}

.impl-header {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 10px;
}

.impl-brand {
 display: flex;
 align-items: center;
 gap: 10px;
}

.family-tag {
 padding: 2px 6px;
 background: #e9ecef;
 color: #495057;
 border-radius: 4px;
 font-size: 0.75em;
}

.status-badge {
 padding: 4px 8px;
 border-radius: 12px;
 font-size: 0.75em;
 font-weight: 500;
}

.status-badge.active {
 background: #d4edda;
 color: #155724;
}

.status-badge.inactive {
 background: #f8d7da;
 color: #721c24;
}

.impl-details {
 margin-bottom: 15px;
}

.detail-row {
 display: flex;
 justify-content: space-between;
 align-items: center;
 margin-bottom: 8px;
 padding: 5px 0;
}

.detail-row .label {
 color: #666;
 font-weight: 500;
 min-width: 120px;
}

.detail-row .value {
 color: #333;
 text-align: right;
}

.implementation-code {
 background: #f1f3f4;
 padding: 4px 8px;
 border-radius: 4px;
 font-family: 'Courier New', monospace;
 font-size: 0.85em;
 max-width: 200px;
 overflow: hidden;
 text-overflow: ellipsis;
 white-space: nowrap;
}

.success-rate {
 font-weight: bold;
 color: #28a745;
}

.impl-actions {
 display: flex;
 gap: 8px;
}

.no-implementations {
 text-align: center;
 padding: 40px;
 color: #666;
 font-style: italic;
}

.warning-text {
 color: #dc3545;
 font-weight: 500;
 margin-top: 10px;
}

@media (max-width: 768px) {
 .command-list {
   padding: 15px;
 }
 
 .page-header {
   flex-direction: column;
   gap: 15px;
   align-items: stretch;
 }
 
 .header-actions {
   justify-content: space-between;
 }
 
 .filters {
   grid-template-columns: 1fr;
 }
 
 .search-group {
   flex-direction: column;
   align-items: stretch;
 }
 
 .commands-grid {
   grid-template-columns: 1fr;
 }
 
 .command-actions {
   justify-content: center;
 }
 
 .implementation-stats {
   flex-direction: column;
   gap: 10px;
 }
 
 .stat-item {
   flex-direction: row;
   justify-content: space-between;
 }
 
 .detail-row {
   flex-direction: column;
   align-items: flex-start;
   gap: 5px;
 }
 
 .detail-row .value {
   text-align: left;
 }
 
 .pagination {
   flex-wrap: wrap;
   gap: 5px;
 }
 
 .page-info {
   margin: 10px 0 0 0;
   width: 100%;
   text-align: center;
 }
 
 .modal-content {
   width: 95%;
   margin: 20px auto;
 }
 
 .impl-header {
   flex-direction: column;
   align-items: flex-start;
   gap: 10px;
 }
 
 .impl-actions {
   justify-content: center;
 }
}

@media (max-width: 480px) {
 .command-badges {
   flex-direction: column;
   align-items: flex-start;
 }
 
 .brands-list {
   justify-content: center;
 }
 
 .empty-actions {
   flex-direction: column;
 }
 
 .modal-header {
   padding: 15px;
 }
 
 .modal-body,
 .modal-footer {
   padding: 15px;
 }
}
</style>