<template>
  <div class="estadisticas-tab">
    <div class="estadisticas-grid">
      
      <!-- Resumen General -->
      <div class="card resumen-general">
        <div class="card-header">
          <h3>Resumen General</h3>
          <select v-model="periodFilter" @change="loadStats" class="filter-select">
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
                <div class="stat-value">${{ generalStats.totalRevenue || '0.00' }}</div>
                <div class="stat-label">Ingresos Totales</div>
                <div class="stat-change positive">+{{ generalStats.revenueGrowth || 0 }}%</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">📅</div>
              <div class="stat-info">
                <div class="stat-value">{{ generalStats.daysSinceStart || 0 }}</div>
                <div class="stat-label">Días como Cliente</div>
                <div class="stat-subtitle">Desde {{ formatDate(generalStats.startDate) }}</div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">⚡</div>
              <div class="stat-info">
                <div class="stat-value">{{ generalStats.serviceUptime || 0 }}%</div>
                <div class="stat-label">Uptime del Servicio</div>
                <div :class="['stat-change', generalStats.serviceUptime >= 99 ? 'positive' : 'negative']">
                  {{ generalStats.serviceUptime >= 99 ? 'Excelente' : 'Mejorable' }}
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-info">
                <div class="stat-value">{{ generalStats.satisfactionScore || 0 }}/10</div>
                <div class="stat-label">Puntuación de Satisfacción</div>
                <div class="stat-subtitle">Basado en {{ generalStats.totalSurveys || 0 }} encuestas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estadísticas de Uso -->
      <div class="card estadisticas-uso">
        <div class="card-header">
          <h3>Uso del Servicio</h3>
          <div class="header-actions">
            <button @click="refreshUsageStats" class="refresh-btn">🔄</button>
          </div>
        </div>
        
        <div class="card-content">
          <div class="usage-metrics">
            <div class="metric-item">
              <span class="metric-label">Datos Consumidos (Este Mes):</span>
              <span class="metric-value">{{ usageStats.monthlyData || '0 GB' }}</span>
              <div class="metric-bar">
                <div 
                  class="metric-fill" 
                  :style="{ width: getUsagePercentage(usageStats.monthlyDataGB, usageStats.planLimitGB) + '%' }"
                ></div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">Velocidad Promedio Descarga:</span>
              <span class="metric-value">{{ usageStats.avgDownloadSpeed || '0 Mbps' }}</span>
              <div class="speed-indicator">
                <div :class="['speed-bar', getSpeedClass(usageStats.avgDownloadSpeedNum)]"></div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">Velocidad Promedio Subida:</span>
              <span class="metric-value">{{ usageStats.avgUploadSpeed || '0 Mbps' }}</span>
              <div class="speed-indicator">
                <div :class="['speed-bar', getSpeedClass(usageStats.avgUploadSpeedNum)]"></div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">Latencia Promedio:</span>
              <span class="metric-value">{{ usageStats.avgLatency || '0 ms' }}</span>
              <div :class="['latency-badge', getLatencyClass(usageStats.avgLatencyNum)]">
                {{ getLatencyLabel(usageStats.avgLatencyNum) }}
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">Horas de Uso Diario:</span>
              <span class="metric-value">{{ usageStats.dailyUsageHours || '0 hrs' }}</span>
              <div class="usage-time-chart">
                <div class="time-bar morning" :style="{ height: usageStats.morningUsage + '%' }"></div>
                <div class="time-bar afternoon" :style="{ height: usageStats.afternoonUsage + '%' }"></div>
                <div class="time-bar evening" :style="{ height: usageStats.eveningUsage + '%' }"></div>
                <div class="time-bar night" :style="{ height: usageStats.nightUsage + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Gráfico de uso semanal -->
          <div class="weekly-usage-chart">
            <h4>Uso Semanal (GB)</h4>
            <div class="chart-container">
              <div class="weekly-bars">
                <div v-for="(usage, day) in weeklyUsage" :key="day" class="week-bar">
                  <div class="bar-container">
                    <div 
                      class="usage-bar" 
                      :style="{ height: getWeeklyBarHeight(usage) + '%' }"
                    ></div>
                  </div>
                  <div class="bar-label">{{ getDayLabel(day) }}</div>
                  <div class="bar-value">{{ usage }}GB</div>
                </div>
              </div>
            </div>
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
                <div class="support-value">{{ supportStats.totalTickets || 0 }}</div>
                <div class="support-label">Tickets Totales</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">⏱️</div>
              <div class="support-info">
                <div class="support-value">{{ supportStats.avgResponseTime || '0h' }}</div>
                <div class="support-label">Tiempo Promedio de Respuesta</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">✅</div>
              <div class="support-info">
                <div class="support-value">{{ supportStats.resolutionRate || 0 }}%</div>
                <div class="support-label">Tasa de Resolución</div>
              </div>
            </div>

            <div class="support-stat">
              <div class="support-icon">⭐</div>
              <div class="support-info">
                <div class="support-value">{{ supportStats.satisfactionRating || 0 }}/5</div>
                <div class="support-label">Calificación de Satisfacción</div>
              </div>
            </div>
          </div>

          <!-- Distribución de tickets por categoría -->
          <div class="ticket-categories">
            <h4>Tickets por Categoría</h4>
            <div class="categories-chart">
              <div v-for="(count, category) in ticketCategories" :key="category" class="category-item">
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
              <span class="billing-value">${{ billingStats.monthlyAverage || '0.00' }}</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Total Pagado:</span>
              <span class="billing-value">${{ billingStats.totalPaid || '0.00' }}</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Pagos Puntuales:</span>
              <span class="billing-value">{{ billingStats.onTimePayments || 0 }}%</span>
            </div>

            <div class="billing-metric">
              <span class="billing-label">Días Promedio de Retraso:</span>
              <span class="billing-value">{{ billingStats.avgDelayDays || 0 }} días</span>
            </div>
          </div>

          <!-- Gráfico de pagos de los últimos 6 meses -->
          <div class="payment-history-chart">
            <h4>Historial de Pagos (6 meses)</h4>
            <div class="payment-bars">
              <div v-for="(payment, month) in paymentHistory" :key="month" class="payment-bar">
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
            <div class="score-circle">
              <div class="score-value">{{ clientScore.overall || 0 }}</div>
              <div class="score-max">/100</div>
            </div>
            <div class="score-label">Puntuación General</div>
            <div :class="['score-rating', getScoreClass(clientScore.overall)]">
              {{ getScoreRating(clientScore.overall) }}
            </div>
          </div>

          <div v-if="showScoreDetails" class="score-breakdown">
            <div class="score-factor">
              <span class="factor-label">Puntualidad de Pagos:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: clientScore.paymentScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ clientScore.paymentScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Longevidad:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: clientScore.loyaltyScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ clientScore.loyaltyScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Soporte:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: clientScore.supportScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ clientScore.supportScore }}/100</span>
            </div>

            <div class="score-factor">
              <span class="factor-label">Uso del Servicio:</span>
              <div class="factor-bar">
                <div class="factor-fill" :style="{ width: clientScore.usageScore + '%' }"></div>
              </div>
              <span class="factor-value">{{ clientScore.usageScore }}/100</span>
            </div>
          </div>

          <div class="score-actions">
            <button @click="generateScoreReport" class="generate-report-btn">
              Generar Reporte
            </button>
          </div>
        </div>
      </div>

      <!-- Comparativas -->
      <div class="card comparativas">
        <div class="card-header">
          <h3>Comparativas</h3>
        </div>
        
        <div class="card-content">
          <div class="comparison-metrics">
            <div class="comparison-item">
              <span class="comparison-label">Vs. Promedio de Clientes:</span>
              <div class="comparison-bar">
                <div class="comparison-fill client" :style="{ width: '75%' }"></div>
                <div class="comparison-fill average" :style="{ width: '60%' }"></div>
              </div>
              <div class="comparison-legend">
                <span class="legend-item client">Este Cliente: 75%</span>
                <span class="legend-item average">Promedio: 60%</span>
              </div>
            </div>

            <div class="comparison-item">
              <span class="comparison-label">Vs. Plan Contratado:</span>
              <div class="plan-comparison">
                <div class="plan-metric">
                  <span class="plan-label">Velocidad Real:</span>
                  <span class="plan-value">{{ comparisons.actualSpeed }}% del plan</span>
                </div>
                <div class="plan-metric">
                  <span class="plan-label">Uso de Datos:</span>
                  <span class="plan-value">{{ comparisons.dataUsage }}% del límite</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
export default {
  name: 'EstadisticasTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    },
    subscriptions: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      periodFilter: 'monthly',
      showScoreDetails: false,
      
      generalStats: {
        totalRevenue: '3500.00',
        revenueGrowth: 12,
        daysSinceStart: 245,
        startDate: '2024-01-15',
        serviceUptime: 99.2,
        satisfactionScore: 8.5,
        totalSurveys: 4
      },

      usageStats: {
        monthlyData: '85 GB',
        monthlyDataGB: 85,
        planLimitGB: 100,
        avgDownloadSpeed: '18.5 Mbps',
        avgDownloadSpeedNum: 18.5,
        avgUploadSpeed: '2.8 Mbps', 
        avgUploadSpeedNum: 2.8,
        avgLatency: '25 ms',
        avgLatencyNum: 25,
        dailyUsageHours: '8.5 hrs',
        morningUsage: 20,
        afternoonUsage: 45,
        eveningUsage: 80,
        nightUsage: 15
      },

      weeklyUsage: {
        monday: 12,
        tuesday: 15,
        wednesday: 18,
        thursday: 14,
        friday: 22,
        saturday: 25,
        sunday: 20
      },

      supportStats: {
        totalTickets: 8,
        avgResponseTime: '2h',
        resolutionRate: 95,
        satisfactionRating: 4.2
      },

      ticketCategories: {
        technical: 5,
        billing: 2,
        installation: 1,
        general: 0
      },

      billingStats: {
        monthlyAverage: '500.00',
        totalPaid: '3500.00',
        onTimePayments: 85,
        avgDelayDays: 2
      },

      paymentHistory: {
        'Ene': { amount: 500, late: false },
        'Feb': { amount: 500, late: true },
        'Mar': { amount: 500, late: false },
        'Abr': { amount: 500, late: false },
        'May': { amount: 500, late: false },
        'Jun': { amount: 500, late: false }
      },

      clientScore: {
        overall: 82,
        paymentScore: 85,
        loyaltyScore: 95,
        supportScore: 75,
        usageScore: 88
      },

      comparisons: {
        actualSpeed: 92,
        dataUsage: 85
      }
    };
  },
  methods: {
    loadStats() {
      console.log('Cargando estadísticas para período:', this.periodFilter);
      // Aquí cargarías las estadísticas reales según el período
    },

    refreshUsageStats() {
      console.log('Actualizando estadísticas de uso');
      // Recargar estadísticas de uso
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX');
    },

    getUsagePercentage(used, limit) {
      return limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    },

    getSpeedClass(speed) {
      if (speed >= 15) return 'excellent';
      if (speed >= 10) return 'good';
      if (speed >= 5) return 'fair';
      return 'poor';
    },

    getLatencyClass(latency) {
      if (latency <= 20) return 'excellent';
      if (latency <= 50) return 'good';
      if (latency <= 100) return 'fair';
      return 'poor';
    },

    getLatencyLabel(latency) {
      if (latency <= 20) return 'Excelente';
      if (latency <= 50) return 'Buena';
      if (latency <= 100) return 'Regular';
      return 'Pobre';
    },

    getWeeklyBarHeight(usage) {
      const max = Math.max(...Object.values(this.weeklyUsage));
      return max > 0 ? (usage / max) * 100 : 0;
    },

    getDayLabel(day) {
      const labels = {
        monday: 'L',
        tuesday: 'M',
        wednesday: 'X',
        thursday: 'J',
        friday: 'V',
        saturday: 'S',
        sunday: 'D'
      };
      return labels[day] || day;
    },

    getCategoryPercentage(count) {
      const total = Object.values(this.ticketCategories).reduce((a, b) => a + b, 0);
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
      const max = Math.max(...Object.values(this.paymentHistory).map(p => p.amount));
      return max > 0 ? (amount / max) * 100 : 0;
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

    generateScoreReport() {
      console.log('Generando reporte de puntuación del cliente');
    }
  },

  created() {
    this.loadStats();
  }
};
</script>

<style scoped>
.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.speed-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.speed-bar {
  width: 100px;
  height: 6px;
  border-radius: 3px;
}

.speed-bar.excellent {
  background: #4CAF50;
}

.speed-bar.good {
  background: #8BC34A;
}

.speed-bar.fair {
  background: #FF9800;
}

.speed-bar.poor {
  background: #f44336;
}

.latency-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.latency-badge.excellent {
  background: #e8f5e9;
  color: #2e7d32;
}

.latency-badge.good {
  background: #f3e5f5;
  color: #7b1fa2;
}

.latency-badge.fair {
  background: #fff3e0;
  color: #f57c00;
}

.latency-badge.poor {
  background: #ffebee;
  color: #c62828;
}

.usage-time-chart {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 40px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.time-bar {
  width: 20px;
  border-radius: 2px 2px 0 0;
  transition: height 0.3s ease;
}

.time-bar.morning {
  background: #ffeb3b;
}

.time-bar.afternoon {
  background: #ff9800;
}

.time-bar.evening {
  background: #f44336;
}

.time-bar.night {
  background: #3f51b5;
}

/* Gráfico de uso semanal */
.weekly-usage-chart {
  margin-top: 24px;
}

.weekly-usage-chart h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.weekly-bars {
  display: flex;
  justify-content: space-between;
  align-items: end;
  height: 120px;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.week-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-container {
  height: 80px;
  width: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  display: flex;
  align-items: end;
  overflow: hidden;
}

.usage-bar {
  width: 100%;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 12px;
  transition: height 0.3s ease;
  min-height: 4px;
}

.bar-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

.bar-value {
  font-size: 0.7rem;
  color: #888;
}

/* Estadísticas de soporte */
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
}

.support-icon {
  font-size: 1.5rem;
}

.support-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.support-label {
  font-size: 0.9rem;
  color: #666;
}

/* Categorías de tickets */
.ticket-categories h4 {
  margin: 0 0 16px 0;
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
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.category-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.category-info {
  display: flex;
  justify-content: space-between;
  min-width: 120px;
}

.category-name {
  font-size: 0.9rem;
  color: #666;
}

.category-count {
  font-weight: 600;
  color: #333;
}

/* Estadísticas de facturación */
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
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.billing-label {
  font-weight: 500;
  color: #666;
}

.billing-value {
  font-weight: 600;
  color: #333;
}

/* Historial de pagos */
.payment-history-chart h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.payment-bars {
  display: flex;
  justify-content: space-between;
  align-items: end;
  height: 120px;
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.payment-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.payment-container {
  height: 80px;
  width: 28px;
  background: #e0e0e0;
  border-radius: 4px;
  display: flex;
  align-items: end;
  overflow: hidden;
}

.payment-fill {
  width: 100%;
  background: #4CAF50;
  border-radius: 4px;
  transition: height 0.3s ease;
  min-height: 4px;
}

.payment-fill.late-payment {
  background: #ff9800;
}

.payment-month {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

.payment-amount {
  font-size: 0.7rem;
  color: #888;
}

.late-indicator {
  position: absolute;
  top: -20px;
  font-size: 0.8rem;
}

/* Puntuación del cliente */
.score-display {
  text-align: center;
  margin-bottom: 24px;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: conic-gradient(#4CAF50 0% 82%, #e0e0e0 82% 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  position: relative;
}

.score-circle::before {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
}

.score-value {
  font-size: 2rem;
  font-weight: 600;
  color: #333;
  z-index: 1;
}

.score-max {
  font-size: 0.9rem;
  color: #666;
  z-index: 1;
}

.score-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.score-rating {
  font-size: 0.9rem;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 12px;
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

/* Desglose de puntuación */
.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.score-factor {
  display: flex;
  align-items: center;
  gap: 12px;
}

.factor-label {
  min-width: 120px;
  font-size: 0.9rem;
  color: #666;
}

.factor-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
}

.factor-value {
  min-width: 60px;
  text-align: right;
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.score-actions {
  text-align: center;
}

.generate-report-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.generate-report-btn:hover {
  background: #5a67d8;
}

/* Comparativas */
.comparison-metrics {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comparison-label {
  font-weight: 600;
  color: #555;
}

.comparison-bar {
  position: relative;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
}

.comparison-fill {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.comparison-fill.client {
  background: #4CAF50;
  z-index: 2;
}

.comparison-fill.average {
  background: #ff9800;
  z-index: 1;
}

.comparison-legend {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-item::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-item.client::before {
  background: #4CAF50;
}

.legend-item.average::before {
  background: #ff9800;
}

.plan-comparison {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.plan-label {
  font-weight: 500;
  color: #666;
}

.plan-value {
  font-weight: 600;
  color: #333;
}

/* Controles y botones */
.filter-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
}

.refresh-btn, .info-btn {
  background: #f0f0f0;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-btn:hover, .info-btn:hover {
  background: #e0e0e0;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .estadisticas-tab {
    padding: 15px;
  }
  
  .estadisticas-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header, .card-content {
    padding: 16px 20px;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .support-metrics {
    grid-template-columns: 1fr;
  }
  
  .billing-summary {
    grid-template-columns: 1fr;
  }
  
  .weekly-bars, .payment-bars {
    padding: 12px;
  }
  
  .comparison-legend {
    flex-direction: column;
    gap: 8px;
  }
  
  .score-circle {
    width: 100px;
    height: 100px;
  }
  
  .score-circle::before {
    width: 70px;
    height: 70px;
  }
  
  .score-value {
    font-size: 1.6rem;
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
  
  .metric-item {
    gap: 6px;
  }
  
  .usage-time-chart {
    padding: 6px;
    height: 30px;
  }
  
  .time-bar {
    width: 16px;
  }
  
  .weekly-bars {
    height: 100px;
  }
  
  .bar-container {
    height: 60px;
    width: 20px;
  }
  
  .payment-bars {
    height: 100px;
  }
  
  .payment-container {
    height: 60px;
    width: 24px;
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
  animation: slideUp 0.3s ease-out;
}

.metric-fill, .usage-bar, .payment-fill, .category-fill, .factor-fill, .comparison-fill {
  animation: fillAnimation 1s ease-out;
}

@keyframes fillAnimation {
  from {
    width: 0%;
  }
}

.usage-bar {
  animation: heightAnimation 1s ease-out;
}

@keyframes heightAnimation {
  from {
    height: 0%;
  }
}

/* Estados de hover para interactividad */
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.week-bar:hover .usage-bar,
.payment-bar:hover .payment-fill {
  opacity: 0.8;
}

.category-item:hover .category-fill {
  opacity: 0.8;
}

.score-factor:hover .factor-fill {
  opacity: 0.8;
}

</style>