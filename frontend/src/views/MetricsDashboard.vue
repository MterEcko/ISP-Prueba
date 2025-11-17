<template>
  <div class="metrics-dashboard">
    <div class="dashboard-header">
      <h1>
        <i class="fas fa-chart-line"></i>
        Dashboard de Métricas en Tiempo Real
      </h1>
      <div class="connection-status">
        <span
          :class="['status-indicator', websocketConnected ? 'connected' : 'disconnected']"
        ></span>
        <span>{{ websocketConnected ? 'Conectado' : 'Desconectado' }}</span>
        <small class="last-update" v-if="lastUpdate">
          Última actualización: {{ formatTime(lastUpdate) }}
        </small>
      </div>
    </div>

    <!-- Indicador de carga -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Cargando métricas...</p>
    </div>

    <!-- Contenido principal -->
    <div v-else class="dashboard-content">
      <!-- Tarjetas de resumen -->
      <div class="metrics-cards">
        <!-- Clientes -->
        <div class="metric-card clients">
          <div class="card-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="card-content">
            <h3>Clientes</h3>
            <div class="metric-value">{{ metrics.clients?.total || 0 }}</div>
            <div class="metric-details">
              <span class="active">
                <i class="fas fa-check-circle"></i>
                {{ metrics.clients?.active || 0 }} Activos
              </span>
              <span class="new">
                <i class="fas fa-user-plus"></i>
                +{{ metrics.clients?.new_today || 0 }} Hoy
              </span>
            </div>
          </div>
        </div>

        <!-- Ingresos -->
        <div class="metric-card revenue">
          <div class="card-icon">
            <i class="fas fa-dollar-sign"></i>
          </div>
          <div class="card-content">
            <h3>Ingresos del Mes</h3>
            <div class="metric-value">
              ${{ formatCurrency(metrics.payments?.month_revenue || 0) }}
            </div>
            <div class="metric-details">
              <span class="today">
                Hoy: ${{ formatCurrency(metrics.payments?.today_revenue || 0) }}
              </span>
              <span class="total">
                Total: ${{ formatCurrency(metrics.payments?.total_revenue || 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Servicios -->
        <div class="metric-card services">
          <div class="card-icon">
            <i class="fas fa-network-wired"></i>
          </div>
          <div class="card-content">
            <h3>Servicios</h3>
            <div class="metric-value">{{ metrics.services?.total_services || 0 }}</div>
            <div class="metric-details">
              <span class="active">
                <i class="fas fa-play-circle"></i>
                {{ metrics.services?.active_services || 0 }} Activos
              </span>
              <span class="suspended">
                <i class="fas fa-pause-circle"></i>
                {{ metrics.services?.suspended_services || 0 }} Suspendidos
              </span>
            </div>
          </div>
        </div>

        <!-- Sistema (solo para admin/manager) -->
        <div v-if="metrics.system" class="metric-card system">
          <div class="card-icon">
            <i class="fas fa-server"></i>
          </div>
          <div class="card-content">
            <h3>Sistema</h3>
            <div class="metric-value">
              {{ metrics.system?.memory?.usage_percent || 0 }}%
            </div>
            <div class="metric-details">
              <span class="uptime">
                <i class="fas fa-clock"></i>
                {{ metrics.system?.process_uptime_formatted || '0s' }}
              </span>
              <span class="cpu">
                <i class="fas fa-microchip"></i>
                CPU: {{ metrics.system?.cpu?.load_average?.['1min'] || '0.00' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="charts-section">
        <div class="chart-container">
          <h3>Ingresos Diarios (Últimos 7 días)</h3>
          <canvas ref="revenueChart"></canvas>
        </div>

        <div class="chart-container">
          <h3>Nuevos Clientes (Últimos 7 días)</h3>
          <canvas ref="clientsChart"></canvas>
        </div>
      </div>

      <!-- Distribuciones -->
      <div class="distribution-section">
        <div class="distribution-card">
          <h3>Clientes por Estado</h3>
          <div class="distribution-bars">
            <div
              v-for="item in metrics.clients?.by_status || []"
              :key="item.status"
              class="distribution-bar"
            >
              <div class="bar-label">
                {{ formatStatus(item.status) }}
                <span class="bar-count">{{ item.count }}</span>
              </div>
              <div class="bar-progress">
                <div
                  class="bar-fill"
                  :style="{ width: calculatePercentage(item.count, metrics.clients?.total) + '%' }"
                  :class="getStatusClass(item.status)"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="distribution-card">
          <h3>Pagos por Método</h3>
          <div class="distribution-bars">
            <div
              v-for="item in metrics.payments?.by_method || []"
              :key="item.method"
              class="distribution-bar"
            >
              <div class="bar-label">
                {{ formatPaymentMethod(item.method) }}
                <span class="bar-count">${{ formatCurrency(item.total) }}</span>
              </div>
              <div class="bar-progress">
                <div
                  class="bar-fill payment-method"
                  :style="{ width: calculatePercentage(item.total, metrics.payments?.total_revenue) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actividad Reciente (solo admin/manager) -->
      <div v-if="metrics.recentActivity" class="activity-section">
        <h3>Actividad Reciente del Sistema</h3>
        <div class="activity-list">
          <div
            v-for="activity in metrics.recentActivity?.recent_audit || []"
            :key="activity.id"
            class="activity-item"
            :class="'severity-' + (activity.severity || 'info').toLowerCase()"
          >
            <div class="activity-icon">
              <i :class="getActivityIcon(activity.action)"></i>
            </div>
            <div class="activity-content">
              <div class="activity-header">
                <strong>{{ activity.plugin }}</strong>
                <span class="activity-action">{{ formatAction(activity.action) }}</span>
              </div>
              <div class="activity-description">{{ activity.description }}</div>
              <div class="activity-meta">
                <span class="activity-user">
                  <i class="fas fa-user"></i>
                  {{ activity.user || 'Sistema' }}
                </span>
                <span class="activity-time">
                  <i class="fas fa-clock"></i>
                  {{ formatDateTime(activity.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { io } from 'socket.io-client';
import { Chart, registerables } from 'chart.js';

// Registrar componentes de Chart.js
Chart.register(...registerables);

export default {
  name: 'MetricsDashboard',
  data() {
    return {
      loading: true,
      websocketConnected: false,
      socket: null,
      metrics: {},
      historicalData: null,
      lastUpdate: null,
      revenueChart: null,
      clientsChart: null
    };
  },
  mounted() {
    this.connectWebSocket();
    this.loadHistoricalData();
  },
  beforeDestroy() {
    this.disconnectWebSocket();
    if (this.revenueChart) this.revenueChart.destroy();
    if (this.clientsChart) this.clientsChart.destroy();
  },
  methods: {
    /**
     * Conecta al WebSocket para recibir métricas en tiempo real
     */
    connectWebSocket() {
      const token = this.$store.getters['auth/token'];
      const wsUrl = process.env.VUE_APP_API_URL?.replace(/^http/, 'ws') || 'ws://localhost:3000';

      this.socket = io(wsUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket conectado');
        this.websocketConnected = true;
        this.socket.emit('request:metrics');
      });

      this.socket.on('disconnect', () => {
        console.log('❌ WebSocket desconectado');
        this.websocketConnected = false;
      });

      this.socket.on('metrics:dashboard', (response) => {
        if (response.success) {
          this.metrics = response.data;
          this.lastUpdate = new Date();
          this.loading = false;
        }
      });

      this.socket.on('metrics:historical', (response) => {
        if (response.success) {
          this.historicalData = response.data;
          this.updateCharts();
        }
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.$swal({
          icon: 'error',
          title: 'Error de Conexión',
          text: 'No se pudo conectar al servidor de métricas'
        });
      });
    },

    /**
     * Desconecta el WebSocket
     */
    disconnectWebSocket() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    },

    /**
     * Carga datos históricos para los gráficos
     */
    loadHistoricalData() {
      if (this.socket && this.socket.connected) {
        this.socket.emit('request:historical', { days: 7 });
      } else {
        // Usar API REST como fallback
        this.axios.get('/api/metrics/historical?days=7')
          .then(response => {
            if (response.data.success) {
              this.historicalData = response.data.data;
              this.updateCharts();
            }
          })
          .catch(error => {
            console.error('Error cargando datos históricos:', error);
          });
      }
    },

    /**
     * Actualiza los gráficos con datos históricos
     */
    updateCharts() {
      if (!this.historicalData) return;

      this.$nextTick(() => {
        this.createRevenueChart();
        this.createClientsChart();
      });
    },

    /**
     * Crea gráfico de ingresos
     */
    createRevenueChart() {
      const ctx = this.$refs.revenueChart;
      if (!ctx) return;

      if (this.revenueChart) {
        this.revenueChart.destroy();
      }

      const data = this.historicalData.daily_revenue || [];
      const labels = data.map(item => this.formatDate(item.date));
      const values = data.map(item => item.total);

      this.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Ingresos ($)',
            data: values,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `$${this.formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `$${this.formatCurrency(value)}`
              }
            }
          }
        }
      });
    },

    /**
     * Crea gráfico de nuevos clientes
     */
    createClientsChart() {
      const ctx = this.$refs.clientsChart;
      if (!ctx) return;

      if (this.clientsChart) {
        this.clientsChart.destroy();
      }

      const data = this.historicalData.daily_new_clients || [];
      const labels = data.map(item => this.formatDate(item.date));
      const values = data.map(item => item.count);

      this.clientsChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Nuevos Clientes',
            data: values,
            backgroundColor: '#2196F3',
            borderColor: '#1976D2',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    },

    /**
     * Formatea moneda
     */
    formatCurrency(value) {
      return parseFloat(value || 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    /**
     * Formatea fecha
     */
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    },

    /**
     * Formatea hora
     */
    formatTime(date) {
      return date.toLocaleTimeString('es-MX');
    },

    /**
     * Formatea fecha y hora
     */
    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    /**
     * Formatea estado de cliente
     */
    formatStatus(status) {
      const statusMap = {
        'activo': 'Activo',
        'suspendido': 'Suspendido',
        'por_corte': 'Por Corte',
        'pendiente': 'Pendiente',
        'cancelado': 'Cancelado'
      };
      return statusMap[status] || status;
    },

    /**
     * Formatea método de pago
     */
    formatPaymentMethod(method) {
      const methodMap = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'paypal': 'PayPal',
        'stripe': 'Stripe',
        'mercadopago': 'MercadoPago'
      };
      return methodMap[method] || method;
    },

    /**
     * Formatea acción de auditoría
     */
    formatAction(action) {
      return action.replace(/_/g, ' ').toLowerCase();
    },

    /**
     * Calcula porcentaje
     */
    calculatePercentage(value, total) {
      if (!total || total === 0) return 0;
      return Math.round((value / total) * 100);
    },

    /**
     * Obtiene clase CSS para estado
     */
    getStatusClass(status) {
      const classMap = {
        'activo': 'status-active',
        'suspendido': 'status-suspended',
        'por_corte': 'status-pending',
        'pendiente': 'status-pending',
        'cancelado': 'status-cancelled'
      };
      return classMap[status] || '';
    },

    /**
     * Obtiene ícono para acción
     */
    getActivityIcon(action) {
      const iconMap = {
        'PLUGIN_CREATED': 'fas fa-plus-circle',
        'PLUGIN_UPDATED': 'fas fa-edit',
        'PLUGIN_DELETED': 'fas fa-trash',
        'PLUGIN_ACTIVATED': 'fas fa-power-off',
        'PLUGIN_DEACTIVATED': 'fas fa-stop-circle',
        'CONFIG_UPDATED': 'fas fa-cog',
        'SECURITY_ALERT': 'fas fa-exclamation-triangle',
        'ERROR': 'fas fa-times-circle'
      };
      return iconMap[action] || 'fas fa-info-circle';
    }
  }
};
</script>

<style scoped>
.metrics-dashboard {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dashboard-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.dashboard-header h1 i {
  margin-right: 10px;
  color: #2196F3;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background-color: #4CAF50;
}

.status-indicator.disconnected {
  background-color: #f44336;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.last-update {
  color: #666;
  font-size: 12px;
  margin-left: 10px;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2196F3;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.metric-card.clients .card-icon { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.metric-card.revenue .card-icon { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.metric-card.services .card-icon { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.metric-card.system .card-icon { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.card-content {
  flex: 1;
}

.card-content h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.metric-details {
  display: flex;
  gap: 15px;
  font-size: 13px;
}

.metric-details span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
}

.metric-details i {
  font-size: 12px;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.chart-container h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.chart-container canvas {
  max-height: 300px;
}

.distribution-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.distribution-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.distribution-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.distribution-bars {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.distribution-bar {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.bar-count {
  font-weight: bold;
  color: #333;
}

.bar-progress {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-fill.status-active { background: #4CAF50; }
.bar-fill.status-suspended { background: #FF9800; }
.bar-fill.status-pending { background: #FFC107; }
.bar-fill.status-cancelled { background: #f44336; }
.bar-fill.payment-method { background: linear-gradient(90deg, #2196F3, #1976D2); }

.activity-section {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.activity-section h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.activity-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid #2196F3;
}

.activity-item.severity-warning {
  border-left-color: #FF9800;
}

.activity-item.severity-error,
.activity-item.severity-critical {
  border-left-color: #f44336;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #2196F3;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
}

.activity-header {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 14px;
}

.activity-action {
  color: #666;
  text-transform: capitalize;
}

.activity-description {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.activity-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
}

.activity-meta i {
  margin-right: 5px;
}

@media (max-width: 768px) {
  .metrics-cards,
  .charts-section,
  .distribution-section {
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .connection-status {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
