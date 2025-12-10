<template>
  <div class="billing-automation">
    <div class="page-header">
      <h1>🤖 Automatización de Facturación</h1>
      <p class="subtitle">Configuración de suspensión automática de clientes morosos</p>
    </div>

    <!-- Stats Card -->
    <div class="stats-card" v-if="stats">
      <div class="stat-item">
        <div class="stat-label">Clientes Activos</div>
        <div class="stat-value">{{ stats.activeClients || 0 }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Facturas Vencidas</div>
        <div class="stat-value danger">{{ stats.overdueInvoices || 0 }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Eficiencia de Cobranza</div>
        <div class="stat-value">{{ stats.collectionEfficiency || 'N/A' }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Última Actualización</div>
        <div class="stat-value small">{{ formatDate(stats.generatedAt) }}</div>
      </div>
    </div>

    <!-- Configuration Card -->
    <div class="config-card">
      <h2>⚙️ Configuración de Suspensión Automática</h2>

      <div class="config-section">
        <div class="config-info">
          <h3>🚫 Suspensión de Servicios Vencidos</h3>
          <p>
            Los clientes que no hayan pagado después de la fecha de vencimiento serán
            suspendidos automáticamente. El sistema:
          </p>
          <ul>
            <li>✅ Deshabilita el usuario PPPoE en MikroTik</li>
            <li>✅ Actualiza el estado del cliente a "Suspendido"</li>
            <li>✅ Envía notificación al cliente</li>
            <li>✅ Registra el evento en el historial</li>
          </ul>
        </div>

        <div class="config-status">
          <div class="status-badge" :class="systemHealth === 'healthy' ? 'success' : 'error'">
            {{ systemHealth === 'healthy' ? '✅ Sistema Operativo' : '⚠️ Verificar Sistema' }}
          </div>
          <div class="schedule-info">
            <strong>Horario Programado:</strong> Todos los días a las 19:26 (Hora México)
          </div>
        </div>
      </div>
    </div>

    <!-- Manual Execution Card -->
    <div class="action-card">
      <h2>🎯 Acciones Manuales</h2>

      <div class="action-buttons">
        <button
          @click="runSuspension"
          :disabled="loading"
          class="btn btn-danger"
        >
          <span v-if="!loading">🚫 Ejecutar Suspensión Ahora</span>
          <span v-else>⏳ Ejecutando...</span>
        </button>

        <button
          @click="loadStats"
          :disabled="loading"
          class="btn btn-secondary"
        >
          <span v-if="!loading">📊 Actualizar Estadísticas</span>
          <span v-else>⏳ Cargando...</span>
        </button>

        <button
          @click="checkHealth"
          :disabled="loading"
          class="btn btn-info"
        >
          <span v-if="!loading">🏥 Verificar Salud del Sistema</span>
          <span v-else>⏳ Verificando...</span>
        </button>
      </div>

      <!-- Result Messages -->
      <div v-if="lastResult" class="result-message" :class="lastResult.success ? 'success' : 'error'">
        <h4>{{ lastResult.success ? '✅ Operación Exitosa' : '❌ Error' }}</h4>
        <p>{{ lastResult.message }}</p>
        <div v-if="lastResult.data" class="result-details">
          <pre>{{ JSON.stringify(lastResult.data, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div class="info-card">
      <h3>ℹ️ Información Importante</h3>
      <div class="info-content">
        <p><strong>¿Cuándo se suspende un cliente?</strong></p>
        <p>
          Un cliente se suspende automáticamente cuando su fecha de vencimiento (nextDueDate)
          es anterior a la fecha actual y su estado es "activo".
        </p>

        <p><strong>¿Cómo reactivar un cliente?</strong></p>
        <p>
          Cuando el cliente paga, el sistema automáticamente lo reactiva:
        </p>
        <ul>
          <li>Habilita el usuario PPPoE en MikroTik</li>
          <li>Cambia el estado a "Activo"</li>
          <li>Envía notificación de reactivación</li>
        </ul>

        <p><strong>Días de Gracia Configurados:</strong></p>
        <ul>
          <li>Por defecto: 5 días</li>
          <li>Máximo permitido: 15 días</li>
          <li>Mínimo permitido: 0 días</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '@/services/frontend_apiConfig';
import authHeader from '@/services/auth-header';

export default {
  name: 'BillingAutomation',

  data() {
    return {
      loading: false,
      stats: null,
      systemHealth: 'unknown',
      lastResult: null
    };
  },

  mounted() {
    this.loadStats();
    this.checkHealth();
  },

  methods: {
    async loadStats() {
      this.loading = true;
      this.lastResult = null;

      try {
        const response = await axios.get(`${API_URL}billing/jobs/stats`, {
          headers: authHeader()
        });

        this.stats = response.data.data;

        this.$toast?.success('Estadísticas actualizadas');
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        this.$toast?.error('Error al cargar estadísticas');
      } finally {
        this.loading = false;
      }
    },

    async checkHealth() {
      this.loading = true;

      try {
        const response = await axios.get(`${API_URL}billing/jobs/health`, {
          headers: authHeader()
        });

        const health = response.data.data;
        this.systemHealth = health.status;

        if (health.status === 'healthy') {
          this.$toast?.success('Sistema operando correctamente');
        } else {
          this.$toast?.warning(`Sistema con problemas: ${health.issues.join(', ')}`);
        }
      } catch (error) {
        console.error('Error verificando salud:', error);
        this.systemHealth = 'error';
        this.$toast?.error('Error al verificar salud del sistema');
      } finally {
        this.loading = false;
      }
    },

    async runSuspension() {
      if (!confirm('¿Estás seguro de ejecutar la suspensión de servicios vencidos ahora?')) {
        return;
      }

      this.loading = true;
      this.lastResult = null;

      try {
        const response = await axios.post(
          `${API_URL}billing/jobs/suspend-overdue`,
          {},
          { headers: authHeader() }
        );

        this.lastResult = {
          success: true,
          message: response.data.message,
          data: response.data.data
        };

        this.$toast?.success('Suspensión ejecutada correctamente');

        // Recargar stats después de ejecutar
        await this.loadStats();
      } catch (error) {
        console.error('Error ejecutando suspensión:', error);

        this.lastResult = {
          success: false,
          message: error.response?.data?.message || error.message,
          data: null
        };

        this.$toast?.error('Error al ejecutar suspensión');
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.billing-automation {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-item {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #2c3e50;
}

.stat-value.danger {
  color: #e74c3c;
}

.stat-value.small {
  font-size: 0.9rem;
  font-weight: normal;
}

.config-card,
.action-card,
.info-card {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.config-card h2,
.action-card h2,
.info-card h3 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.config-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.config-info ul {
  margin: 15px 0;
  padding-left: 20px;
}

.config-info li {
  margin: 8px 0;
}

.config-status {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.status-badge {
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  font-weight: bold;
}

.status-badge.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.schedule-info {
  padding: 15px;
  background: #e7f3ff;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-info {
  background: #3498db;
  color: white;
}

.result-message {
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.result-message.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.result-message.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.result-message h4 {
  margin-bottom: 10px;
}

.result-details {
  margin-top: 15px;
  padding: 15px;
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
  overflow: auto;
}

.result-details pre {
  margin: 0;
  font-size: 0.9rem;
}

.info-content p {
  margin: 15px 0;
}

.info-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.info-content li {
  margin: 5px 0;
}

@media (max-width: 768px) {
  .config-section {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
