<template>
  <div class="estadisticas-tab">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando estadísticas...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="error-state">
      <div class="error-icon">⚠️</div>
      <h4>Error al cargar estadísticas</h4>
      <p>{{ errorMessage }}</p>
      <button @click="loadStatistics" class="btn btn-primary">Reintentar</button>
    </div>

    <!-- Contenido Principal -->
    <div v-else class="estadisticas-grid">
      
      <!-- Resumen General -->
      <div class="card resumen-general">
        <div class="card-header">
          <h3>Resumen General</h3>
          <select v-model="periodFilter" @change="loadStatistics" class="filter-select">
            <option value="monthly">Este Mes</option>
            <option value="quarterly">Trimestre</option>
            <option value="yearly">Este Año</option>
            <option value="all">Todo el Tiempo</option>
          </select>
        </div>
        
        <div class="card-content">
          <div class="summary-stats">
            <div class="stat-card">
              <div class="stat-icon">💰</div>
              <div class="stat-info">
                <div class="stat-value">${{ stats.general.totalRevenue }}</div>
                <div class="stat-label">Ingresos Totales</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.general.daysSinceStart }}</div>
                <div class="stat-label">Días como Cliente</div>
                <div class="stat-subtitle">Desde {{ formatDate(stats.general.startDate) }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">⚡</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.general.serviceUptime }}%</div>
                <div class="stat-label">Uptime del Servicio</div>
                <div :class="['stat-change', stats.general.serviceUptime >= 99 ? 'positive' : 'negative']">
                  {{ stats.general.serviceUptime >= 99 ? 'Excelente' : 'Mejorable' }}
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.general.satisfactionScore }}/10</div>
                <div class="stat-label">Puntuación de Satisfacción</div>
                <div class="stat-subtitle">{{ stats.general.totalSurveys > 0 ? `Basado en ${stats.general.totalSurveys} encuestas` : 'Sin encuestas' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Uso del Servicio - PENDIENTE -->
      <div class="card estadisticas-uso">
        <div class="card-header">
          <h3>Uso del Servicio</h3>
        </div>
        
        <div class="card-content">
          <div class="pending-section">
            <div class="pending-icon">🚧</div>
            <h4>Sección en Desarrollo</h4>
            <p>Las métricas de uso del servicio estarán disponibles próximamente.</p>
          </div>
        </div>
      </div>

      <!-- Estadísticas de Soporte -->
      <div class="card estadisticas-soporte">
        <div class="card-header">
          <h3>Soporte Técnico</h3>
        </div>
        
        <div class="card-content">
          <div class="support-metrics">
            <div class="support-stat">
              <div class="support-icon">🎫</div>
              <div class="support-info">
                <div class="support-value">{{ stats.support.totalTickets }}</div>
                <div class="support-label">Tickets Totales</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">⏱️</div>
              <div class="support-info">
                <div class="support-value">{{ stats.support.avgResponseTime }}</div>
                <div class="support-label">Tiempo Promedio de Respuesta</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">✅</div>
              <div class="support-info">
                <div class="support-value">{{ stats.support.resolutionRate }}%</div>
                <div class="support-label">Tasa de Resolución</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">⭐</div>
              <div class="support-info">
                <div class="support-value">{{ stats.support.satisfactionRating }}/5</div>
                <div class="support-label">Calificación de Satisfacción</div>
              </div>
            </div>
          </div>

          <!-- Distribución de tickets por categoría -->
          <div v-if="hasTicketCategories" class="ticket-categories">
            <h4>Tickets por Categoría</h4>
            <div class="categories-chart">
              <div v-for="(count, category) in stats.support.ticketCategories" :key="category" class="category-item">
                <div class="category-bar">
                  <div 
                    class="category-fill" 
                    :style="{ 
                      width: getCategoryPercentage(count) + '%',
                      backgroundColor: getCategoryColor(category)
                    }"
                  ></div>
                </div>
                <div class="category-info">
                  <span class="category-name">{{ formatCategoryName(category) }}</span>
                  <span class="category-count">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-data">
            <p>No hay tickets registrados.</p>
          </div>
        </div>
      </div>

      <!-- Estadísticas de Facturación -->
      <div class="card estadisticas-facturacion">
        <div class="card-header">
          <h3>Historial de Facturación</h3>
        </div>
        
        <div class="card-content">
          <div class="billing-summary">
            <div class="billing-metric">
              <span class="billing-label">Promedio Mensual:</span>
              <span class="billing-value">${{ stats.billing.monthlyAverage }}</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Total Pagado:</span>
              <span class="billing-value">${{ stats.billing.totalPaid }}</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Pagos Puntuales:</span>
              <span class="billing-value">{{ stats.billing.onTimePayments }}%</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Días Promedio de Retraso:</span>
              <span class="billing-value">{{ stats.billing.avgDelayDays }} días</span>
            </div>
          </div>

          <!-- Gráfico de pagos -->
          <div v-if="hasPaymentHistory" class="payment-history-chart">
            <h4>Historial de Pagos (últimos meses)</h4>
            <div class="payment-bars">
              <div v-for="(payment, month) in stats.billing.paymentHistory" :key="month" class="payment-bar">
                <div class="payment-container">
                  <div 
                    class="payment-fill" 
                    :style="{ height: getPaymentBarHeight(payment.amount) + '%' }"
                    :class="{ 'late-payment': payment.late }"
                  ></div>
                </div>
                <div class="payment-month">{{ month }}</div>
                <div class="payment-amount">${{ payment.amount }}</div>
                <div v-if="payment.late" class="late-indicator">⚠️</div>
              </div>
            </div>
          </div>

          <div v-else class="no-data">
            <p>No hay historial de pagos disponible.</p>
          </div>
        </div>
      </div>

      <!-- Puntuación de Cliente -->
      <div class="card puntuacion-cliente">
        <div class="card-header">
          <h3>Puntuación del Cliente</h3>
          <button @click="showScoreDetails = !showScoreDetails" class="info-btn">ℹ️</button>
        </div>
        
        <div class="card-content">
          <div class="score-display">
            <div class="score-circle" :style="{ background: getScoreGradient(stats.score.overall) }">
              <div class="score-inner">
                <div class="score-value">{{ stats.score.overall }}</div>
                <div class="score-max">/100</div>
              </div>
            </div>
            <div class="score-label">Puntuación General</div>
            <div :class="['score-rating', getScoreClass(stats.score.overall)]">
              {{ getScoreRating(stats.score.overall) }}
            </div>
          </div>

          <div v-if="showScoreDetails" class="score-breakdown">
            <div class="score-factor">
              <span class="factor-label">Puntualidad de Pagos:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: stats.score.paymentScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ stats.score.paymentScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Longevidad:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: stats.score.loyaltyScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ stats.score.loyaltyScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Soporte:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: stats.score.supportScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ stats.score.supportScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Uso del Servicio:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: stats.score.usageScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ stats.score.usageScore }}/100</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import ReportsService from '../../services/reports.service';

export default {
  name: 'EstadisticasTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    }
  },
  data() {
    return {
      loading: true,
      errorMessage: '',
      periodFilter: 'all',
      showScoreDetails: false,
      
      stats: {
        general: {
          totalRevenue: '0.00',
          revenueGrowth: 0,
          daysSinceStart: 0,
          startDate: null,
          serviceUptime: 0,
          satisfactionScore: 0,
          totalSurveys: 0
        },
        support: {
          totalTickets: 0,
          avgResponseTime: '0h',
          resolutionRate: 0,
          satisfactionRating: 0,
          ticketCategories: {}
        },
        billing: {
          monthlyAverage: '0.00',
          totalPaid: '0.00',
          onTimePayments: 0,
          avgDelayDays: 0,
          paymentHistory: {}
        },
        score: {
          overall: 0,
          paymentScore: 0,
          loyaltyScore: 0,
          supportScore: 0,
          usageScore: 0
        },
        comparisons: {
          actualSpeed: 0,
          dataUsage: 0
        }
      }
    };
  },

  computed: {
    hasTicketCategories() {
      return Object.keys(this.stats.support.ticketCategories).length > 0;
    },

    hasPaymentHistory() {
      return Object.keys(this.stats.billing.paymentHistory).length > 0;
    }
  },

  methods: {
    async loadStatistics() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const params = {
          period: this.periodFilter
        };

        const response = await ReportsService.getClientStatistics(this.clientId, params);

        if (response.data && response.data.success) {
          this.stats = response.data.data;
        } else {
          this.errorMessage = response.data?.message || 'Error al cargar estadísticas';
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        if (error.response) {
          this.errorMessage = `Error ${error.response.status}: ${error.response.data?.message || 'Error del servidor'}`;
        } else if (error.request) {
          this.errorMessage = 'No se pudo conectar con el servidor.';
        } else {
          this.errorMessage = error.message;
        }
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX');
    },

    getCategoryPercentage(count) {
      const total = Object.values(this.stats.support.ticketCategories).reduce((a, b) => a + b, 0);
      return total > 0 ? (count / total) * 100 : 0;
    },

    getCategoryColor(category) {
      const colors = {
        technical: '#f44336',
        billing: '#ff9800',
        installation: '#4CAF50',
        general: '#2196F3'
      };
      return colors[category] || '#666';
    },

    formatCategoryName(category) {
      const names = {
        technical: 'Técnico',
        billing: 'Facturación',
        installation: 'Instalación',
        general: 'General'
      };
      return names[category] || category;
    },

    getPaymentBarHeight(amount) {
      const amounts = Object.values(this.stats.billing.paymentHistory).map(p => p.amount);
      const max = Math.max(...amounts, 1);
      return (amount / max) * 100;
    },

    getScoreClass(score) {
      if (score >= 90) return 'excellent';
      if (score >= 75) return 'good';
      if (score >= 60) return 'fair';
      return 'poor';
    },

    getScoreRating(score) {
      if (score >= 90) return 'Excelente';
      if (score >= 75) return 'Bueno';
      if (score >= 60) return 'Regular';
      return 'Necesita Mejora';
    },

    getScoreGradient(score) {
      const percentage = score;
      return `conic-gradient(#4CAF50 0% ${percentage}%, #e0e0e0 ${percentage}% 100%)`;
    }
  },

  created() {
    this.loadStatistics();
  }
};
</script>

<style scoped>
/* Mantén TODOS los estilos originales que ya tenías */
/* Solo agrego los nuevos estados */

.loading-state,
.error-state {
  text-align: center;
  padding: 80px 20px;
  color: #666;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.error-state h4 {
  margin: 16px 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.error-state p {
  margin: 0 0 24px;
  color: #666;
}

.btn-primary {
  padding: 10px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

.pending-section {
  text-align: center;
  padding: 60px 20px;
}

.pending-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.pending-section h4 {
  margin: 16px 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: #666;
}

.pending-section p {
  margin: 0;
  color: #999;
  font-size: 14px;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-style: italic;
}

.no-data p {
  margin: 0;
}

/* Estilos base ya existentes */
.estadisticas-tab {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.estadisticas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.card-content {
  padding: 24px;
}

/* Resumen General */
.resumen-general {
  grid-column: 1 / -1;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-card:nth-child(1) { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
.stat-card:nth-child(2) { background: linear-gradient(135deg, #17a2b8 0%, #007bff 100%); }
.stat-card:nth-child(3) { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); }
.stat-card:nth-child(4) { background: linear-gradient(135deg, #e83e8c 0%, #dc3545 100%); }

.stat-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 4px;
}

.stat-subtitle {
  font-size: 12px;
  opacity: 0.8;
}

.stat-change {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.stat-change.positive {
  background: rgba(255,255,255,0.2);
}

.stat-change.negative {
  background: rgba(0,0,0,0.2);
}

/* Soporte */
.support-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.support-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s;
}

.support-stat:hover {
  background: #e9ecef;
}

.support-icon {
  font-size: 24px;
}

.support-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.support-label {
  font-size: 13px;
  color: #666;
}

.ticket-categories {
  margin-top: 24px;
}

.ticket-categories h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.categories-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-bar {
  flex: 1;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.category-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.category-info {
  display: flex;
  justify-content: space-between;
  min-width: 140px;
  gap: 12px;
}

.category-name {
  font-size: 14px;
  color: #666;
}

.category-count {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

/* Facturación */
.billing-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.billing-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.billing-label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.billing-value {
  font-weight: 700;
  color: #333;
  font-size: 16px;
}

.payment-history-chart {
  margin-top: 24px;
}

.payment-history-chart h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.payment-bars {
  display: flex;
  justify-content: space-between;
  align-items: end;
  height: 140px;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  gap: 8px;
}

.payment-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
  flex: 1;
}

.payment-container {
  height: 100px;
  width: 100%;
  max-width: 40px;
  background: #e0e0e0;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: end;
  overflow: hidden;
}

.payment-fill {
  width: 100%;
  background: linear-gradient(to top, #28a745, #20c997);
  border-radius: 6px 6px 0 0;
  transition: height 0.5s ease;
  min-height: 4px;
}

.payment-fill.late-payment {
  background: linear-gradient(to top, #ffc107, #ff9800);
}

.payment-month {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-align: center;
}

.payment-amount {
  font-size: 11px;
  color: #888;
  text-align: center;
}

.late-indicator {
  position: absolute;
  top: -24px;
  font-size: 14px;
}

/* Puntuación del Cliente */
.puntuacion-cliente {
  grid-column: 1 / -1;
}

.score-display {
  text-align: center;
  margin-bottom: 24px;
}

.score-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  position: relative;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.score-inner {
  width: 100px;
  height: 100px;
  background: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.score-value {
  font-size: 36px;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.score-max {
  font-size: 14px;
  color: #666;
  margin-top: 2px;
}

.score-label {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.score-rating {
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 20px;
}

.score-rating.excellent {
  background: #e8f5e9;
  color: #2e7d32;
}

.score-rating.good {
  background: #e3f2fd;
  color: #1565c0;
}

.score-rating.fair {
  background: #fff3e0;
  color: #f57c00;
}

.score-rating.poor {
  background: #ffebee;
  color: #c62828;
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.score-factor {
  display: flex;
  align-items: center;
  gap: 12px;
}

.factor-label {
  min-width: 160px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.factor-bar {
  flex: 1;
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.5s ease;
  border-radius: 5px;
}

.factor-value {
  min-width: 70px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* Controles */
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:hover {
  border-color: #667eea;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.info-btn {
  background: #f0f0f0;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.info-btn:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

/* Animaciones */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: slideUp 0.4s ease-out;
}

.category-fill,
.payment-fill,
.factor-fill {
  animation: fillAnimation 0.8s ease-out;
}

@keyframes fillAnimation {
  from {
    width: 0%;
  }
}

.payment-fill {
  animation: heightAnimation 0.8s ease-out;
}

@keyframes heightAnimation {
  from {
    height: 0%;
  }
}

/* Responsive */
@media (max-width: 1200px) {
  .estadisticas-grid {
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  }
}

@media (max-width: 768px) {
  .estadisticas-tab {
    padding: 12px;
  }

  .estadisticas-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .resumen-general {
    grid-column: 1;
  }

  .puntuacion-cliente {
    grid-column: 1;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-icon {
    font-size: 28px;
  }

  .stat-value {
    font-size: 24px;
  }

  .support-metrics {
    grid-template-columns: 1fr;
  }

  .billing-summary {
    grid-template-columns: 1fr;
  }

  .payment-bars {
    padding: 12px;
    height: 120px;
  }

  .payment-container {
    height: 80px;
    max-width: 32px;
  }

  .score-circle {
    width: 120px;
    height: 120px;
  }

  .score-inner {
    width: 85px;
    height: 85px;
  }

  .score-value {
    font-size: 30px;
  }

  .score-factor {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .factor-label {
    min-width: unset;
  }

  .factor-value {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .category-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .category-info {
    min-width: unset;
  }

  .payment-month,
  .payment-amount {
    font-size: 10px;
  }

  .payment-container {
    max-width: 28px;
  }
}

/* Estados hover para mejor interactividad */
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}

.support-stat:hover {
  transform: translateX(4px);
}

.category-item:hover .category-fill {
  opacity: 0.85;
}

.payment-bar:hover .payment-fill {
  opacity: 0.85;
}

.score-factor:hover .factor-fill {
  opacity: 0.85;
}

/* Transiciones suaves */
* {
  transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}
</style>