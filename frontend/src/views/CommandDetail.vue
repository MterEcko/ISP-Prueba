<template>
  <div class="command-detail">
    <div class="page-header">
      <div class="header-left">
        <button @click="goBack" class="btn-back">
          ← Volver
        </button>
        <div class="title-section">
          <h1>{{ command.displayName || command.name }}</h1>
          <div class="command-meta">
            <span :class="['status-badge', command.active ? 'active' : 'inactive']">
              {{ command.active ? 'Activo' : 'Inactivo' }}
            </span>
            <span class="category-badge">{{ getCategoryDisplayName(command.category) }}</span>
            <span class="permission-badge">{{ getPermissionLevelName(command.permissionLevel) }}</span>
          </div>
        </div>
      </div>
      
      <div class="header-actions">
        <router-link :to="`/commands/${command.id}/edit`" class="btn-primary">
          ✏️ Editar
        </router-link>
        <button @click="toggleCommandStatus" class="btn-secondary" :disabled="toggling">
          {{ toggling ? '⏳' : (command.active ? '⏸️ Desactivar' : '▶️ Activar') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando información del comando...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>Error al cargar el comando</h3>
      <p>{{ error }}</p>
      <button @click="reload" class="btn-primary">Reintentar</button>
    </div>

    <div v-else class="content-grid">
      <!-- Información Principal -->
      <div class="info-card">
        <h3>📋 Información General</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>Nombre Técnico:</label>
            <code>{{ command.name }}</code>
          </div>
          <div class="info-item">
            <label>Descripción:</label>
            <p>{{ command.description }}</p>
          </div>
          <div class="info-item">
            <label>Categoría:</label>
            <span class="category-tag">{{ getCategoryDisplayName(command.category) }}</span>
          </div>
          <div class="info-item">
            <label>Nivel de Permiso:</label>
            <span class="permission-tag">{{ getPermissionLevelName(command.permissionLevel) }}</span>
          </div>
        </div>
      </div>

      <!-- Configuración de Seguridad -->
      <div class="security-card">
        <h3>🔒 Configuración de Seguridad</h3>
        <div class="security-options">
          <div class="security-item">
            <div class="security-icon">
              {{ command.requiresConfirmation ? '✅' : '❌' }}
            </div>
            <div class="security-info">
              <strong>Requiere Confirmación</strong>
              <p>{{ command.requiresConfirmation ? 'Sí, el usuario debe confirmar antes de ejecutar' : 'No requiere confirmación' }}</p>
            </div>
          </div>
          
          <div class="security-item">
            <div class="security-icon">
              {{ command.affectsService ? '⚠️' : '✅' }}
            </div>
            <div class="security-info">
              <strong>Afecta el Servicio</strong>
              <p>{{ command.affectsService ? 'Sí, puede interrumpir el servicio del cliente' : 'No afecta el servicio normal' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Implementaciones -->
      <div class="implementations-card">
        <div class="card-header">
          <h3>🔧 Implementaciones ({{ implementations.length }})</h3>
          <router-link 
            :to="`/command-implementations/new?commandId=${command.id}`"
            class="btn-primary btn-small"
          >
            + Nueva Implementación
          </router-link>
        </div>

        <div v-if="implementations.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <h4>Sin implementaciones</h4>
          <p>Este comando aún no tiene implementaciones específicas para ninguna marca de dispositivo.</p>
          <router-link 
            :to="`/command-implementations/new?commandId=${command.id}`"
            class="btn-primary"
          >
            Crear Primera Implementación
          </router-link>
        </div>

        <div v-else class="implementations-grid">
          <div 
            v-for="impl in implementations" 
            :key="impl.id"
            class="implementation-card"
            :class="{ inactive: !impl.active }"
          >
            <div class="impl-header">
              <div class="brand-info">
                <span :class="['brand-badge', impl.DeviceBrand?.name?.toLowerCase()]">
                  {{ impl.DeviceBrand?.displayName || impl.DeviceBrand?.name }}
                </span>
                <span v-if="impl.DeviceFamily" class="family-badge">
                  {{ impl.DeviceFamily?.displayName || impl.DeviceFamily?.name }}
                </span>
              </div>
              <span :class="['status-dot', impl.active ? 'active' : 'inactive']"></span>
            </div>

            <div class="impl-details">
              <div class="detail-row">
                <span class="label">Conexión:</span>
                <span class="value">{{ getConnectionTypeDisplayName(impl.connectionType) }}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Implementación:</span>
                <code class="implementation-code">{{ truncateImplementation(impl.implementation) }}</code>
              </div>
              
              <div v-if="impl.successRate !== null" class="detail-row">
                <span class="label">Tasa de Éxito:</span>
                <span :class="['success-rate', getSuccessRateClass(impl.successRate)]">
                  {{ (impl.successRate * 100).toFixed(1) }}%
                </span>
              </div>

              <div v-if="impl.lastTested" class="detail-row">
                <span class="label">Última Prueba:</span>
                <span class="value">{{ formatDate(impl.lastTested) }}</span>
              </div>
            </div>

            <div class="impl-actions">
              <button 
                @click="testImplementation(impl.id)"
                class="btn-test"
                :disabled="testingImplementations[impl.id]"
              >
                {{ testingImplementations[impl.id] ? '⏳' : '🧪' }} Probar
              </button>
              <router-link 
                :to="`/command-implementations/${impl.id}/edit`"
                class="btn-edit"
              >
                ✏️ Editar
              </router-link>
              <button 
                @click="toggleImplementation(impl.id)"
                class="btn-toggle"
                :disabled="togglingImplementations[impl.id]"
              >
                {{ togglingImplementations[impl.id] ? '⏳' : (impl.active ? '⏸️' : '▶️') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="stats-card">
        <h3>📊 Estadísticas</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ implementations.length }}</div>
            <div class="stat-label">Implementaciones</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ activeImplementations }}</div>
            <div class="stat-label">Activas</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ supportedBrands }}</div>
            <div class="stat-label">Marcas Soportadas</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ averageSuccessRate }}%</div>
            <div class="stat-label">Éxito Promedio</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensajes -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import CommandService from '../services/command.service';

export default {
  name: 'CommandDetail',
  data() {
    return {
      command: {},
      implementations: [],
      loading: true,
      error: null,
      toggling: false,
      testingImplementations: {},
      togglingImplementations: {},
      successMessage: '',
      errorMessage: ''
    };
  },
  computed: {
    activeImplementations() {
      return this.implementations.filter(impl => impl.active).length;
    },
    supportedBrands() {
      const brands = new Set(this.implementations.map(impl => impl.DeviceBrand?.name).filter(Boolean));
      return brands.size;
    },
    averageSuccessRate() {
      const ratesWithData = this.implementations
        .map(impl => impl.successRate)
        .filter(rate => rate !== null && rate !== undefined);
      
      if (ratesWithData.length === 0) return 0;
      
      const average = ratesWithData.reduce((sum, rate) => sum + rate, 0) / ratesWithData.length;
      return Math.round(average * 100);
    }
  },
  created() {
    this.loadCommand();
  },
  methods: {
    async loadCommand() {
      this.loading = true;
      this.error = null;
      
      try {
        const commandId = this.$route.params.id;
        
        // Cargar comando e implementaciones en paralelo
        const [commandResponse, implementationsResponse] = await Promise.all([
          CommandService.getCommand(commandId),
          CommandService.getCommandImplementations(commandId)
        ]);
        
        this.command = commandResponse.data.command || commandResponse.data;
        this.implementations = implementationsResponse.data.implementations || implementationsResponse.data || [];
        
      } catch (error) {
        console.error('Error cargando comando:', error);
        this.error = error.response?.data?.message || 'Error al cargar el comando';
      } finally {
        this.loading = false;
      }
    },

    async toggleCommandStatus() {
      this.toggling = true;
      this.errorMessage = '';
      
      try {
        await CommandService.toggleCommand(this.command.id);
        this.command.active = !this.command.active;
        this.successMessage = `Comando ${this.command.active ? 'activado' : 'desactivado'} correctamente`;
        this.clearMessages();
      } catch (error) {
        console.error('Error cambiando estado:', error);
        this.errorMessage = 'Error al cambiar el estado del comando';
      } finally {
        this.toggling = false;
      }
    },

    async testImplementation(implementationId) {
      this.$set(this.testingImplementations, implementationId, true);
      this.errorMessage = '';
      
      try {
        const response = await CommandService.testImplementation(implementationId);
        
        if (response.data.success) {
          this.successMessage = 'Implementación probada exitosamente';
          // Actualizar la implementación con los nuevos datos
          await this.loadCommand();
        } else {
          this.errorMessage = `Error en la prueba: ${response.data.message}`;
        }
        
        this.clearMessages();
      } catch (error) {
        console.error('Error probando implementación:', error);
        this.errorMessage = 'Error al probar la implementación';
      } finally {
        this.$set(this.testingImplementations, implementationId, false);
      }
    },

    async toggleImplementation(implementationId) {
      this.$set(this.togglingImplementations, implementationId, true);
      this.errorMessage = '';
      
      try {
        await CommandService.toggleImplementation(implementationId);
        
        // Actualizar el estado localmente
        const impl = this.implementations.find(i => i.id === implementationId);
        if (impl) {
          impl.active = !impl.active;
          this.successMessage = `Implementación ${impl.active ? 'activada' : 'desactivada'} correctamente`;
          this.clearMessages();
        }
      } catch (error) {
        console.error('Error cambiando estado de implementación:', error);
        this.errorMessage = 'Error al cambiar el estado de la implementación';
      } finally {
        this.$set(this.togglingImplementations, implementationId, false);
      }
    },

    getCategoryDisplayName(category) {
      return CommandService.getCategoryDisplayName(category);
    },

    getPermissionLevelName(level) {
      return CommandService.getPermissionLevelName(level);
    },

    getConnectionTypeDisplayName(type) {
      return CommandService.getConnectionTypeDisplayName(type);
    },

    truncateImplementation(implementation) {
      if (!implementation) return '';
      return implementation.length > 50 ? implementation.substring(0, 50) + '...' : implementation;
    },

    getSuccessRateClass(rate) {
      if (rate >= 0.8) return 'high';
      if (rate >= 0.5) return 'medium';
      return 'low';
    },

    formatDate(dateString) {
      if (!dateString) return 'Nunca';
      
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    clearMessages() {
      setTimeout(() => {
        this.successMessage = '';
        this.errorMessage = '';
      }, 3000);
    },

    reload() {
      this.loadCommand();
    },

    goBack() {
      this.$router.push('/commands');
    }
  }
};
</script>

<style scoped>
.command-detail {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.btn-back {
  padding: 10px 15px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-back:hover {
  background: #545b62;
}

.title-section h1 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 2em;
}

.command-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.status-badge, .category-badge, .permission-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #d5f4e6;
  color: #27ae60;
}

.status-badge.inactive {
  background: #fadbd8;
  color: #e74c3c;
}

.category-badge {
  background: #dae8fc;
  color: #1f4e79;
}

.permission-badge {
  background: #fff2cc;
  color: #bf9000;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Estados de carga y error */
.loading-state, .error-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state .error-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

/* Grid de contenido */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

.info-card, .security-card {
  grid-column: span 1;
}

.implementations-card {
  grid-column: span 2;
}

.stats-card {
  grid-column: span 2;
}

/* Cards */
.info-card, .security-card, .implementations-card, .stats-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 25px;
}

.info-card h3, .security-card h3, .implementations-card h3, .stats-card h3 {
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 1.3em;
  font-weight: 600;
}

/* Info Card */
.info-grid {
  display: grid;
  gap: 15px;
}

.info-item {
  display: grid;
  gap: 5px;
}

.info-item label {
  font-weight: 600;
  color: #7f8c8d;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item code {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: #e74c3c;
  border: 1px solid #e9ecef;
}

.info-item p {
  margin: 0;
  color: #2c3e50;
  line-height: 1.5;
}

.category-tag, .permission-tag {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.category-tag {
  background: #e8f4f8;
  color: #2980b9;
}

.permission-tag {
  background: #fef9e7;
  color: #f39c12;
}

/* Security Card */
.security-options {
  display: grid;
  gap: 20px;
}

.security-item {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.security-icon {
  font-size: 1.5em;
  min-width: 30px;
}

.security-info strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 5px;
}

.security-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
  line-height: 1.4;
}

/* Implementations Card */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

.empty-state h4 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.implementations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.implementation-card {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
}

.implementation-card:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.implementation-card.inactive {
  opacity: 0.6;
  border-style: dashed;
}

.impl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.brand-info {
  display: flex;
  gap: 8px;
}

.brand-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-transform: uppercase;
}

.brand-badge.mikrotik { background: #e74c3c; }
.brand-badge.ubiquiti { background: #2ecc71; }
.brand-badge.tplink { background: #f39c12; }
.brand-badge.cambium { background: #9b59b6; }
.brand-badge.mimosa { background: #1abc9c; }

.family-badge {
  background: #95a5a6;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.active {
  background: #27ae60;
}

.status-dot.inactive {
  background: #e74c3c;
}

.impl-details {
  display: grid;
  gap: 10px;
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-row .label {
  font-weight: 500;
  color: #7f8c8d;
  font-size: 13px;
}

.detail-row .value {
  color: #2c3e50;
  font-size: 13px;
}

.implementation-code {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  color: #e74c3c;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.success-rate {
  font-weight: 600;
  font-size: 13px;
}

.success-rate.high { color: #27ae60; }
.success-rate.medium { color: #f39c12; }
.success-rate.low { color: #e74c3c; }

.impl-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-test, .btn-edit, .btn-toggle {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
}

.btn-test {
  background: #3498db;
  color: white;
}

.btn-test:hover:not(:disabled) {
  background: #2980b9;
}

.btn-edit {
  background: #f39c12;
  color: white;
}

.btn-edit:hover {
  background: #d68910;
}

.btn-toggle {
  background: #95a5a6;
  color: white;
}

.btn-toggle:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-test:disabled, .btn-toggle:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stats Card */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.stat-value {
  font-size: 2.5em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Mensajes */
.success-message, .error-message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 6px;
  font-weight: 500;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

.success-message {
  background: #d5f4e6;
  color: #27ae60;
  border: 1px solid #82e5aa;
}

.error-message {
  background: #fadbd8;
  color: #c0392b;
  border: 1px solid #f1948a;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .info-card, .security-card, .implementations-card, .stats-card {
    grid-column: span 1;
  }
  
  .implementations-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .command-detail {
    padding: 15px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .header-left {
    flex-direction: column;
    gap: 15px;
    width: 100%;
  }
  
  .command-meta {
    justify-content: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .impl-actions {
    justify-content: center;
  }
}
</style>