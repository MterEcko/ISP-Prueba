<template>
  <div class="client-portal-usage">
    <div class="header">
      <h1>Mi Consumo de Internet</h1>
      <button @click="goBack" class="btn-back">← Volver</button>
    </div>

    <!-- Selector de período -->
    <div class="period-selector">
      <button
        v-for="period in periods"
        :key="period.value"
        @click="selectedPeriod = period.value; loadUsageStats()"
        :class="{ active: selectedPeriod === period.value }"
        class="period-btn"
      >
        {{ period.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando estadísticas de consumo...</p>
    </div>

    <div v-else-if="usage" class="usage-container">
      <!-- Resumen actual -->
      <div class="summary-card">
        <div class="summary-header">
          <h2>Resumen del Período</h2>
          <span class="period-label">{{ getPeriodLabel() }}</span>
        </div>

        <div class="usage-stats">
          <div class="stat-card total">
            <span class="icon">📊</span>
            <div class="stat-info">
              <span class="label">Consumo Total</span>
              <span class="value">{{ formatBytes(usage.totalUsage) }}</span>
            </div>
          </div>

          <div class="stat-card download">
            <span class="icon">⬇️</span>
            <div class="stat-info">
              <span class="label">Descarga</span>
              <span class="value">{{ formatBytes(usage.download) }}</span>
            </div>
          </div>

          <div class="stat-card upload">
            <span class="icon">⬆️</span>
            <div class="stat-info">
              <span class="label">Carga</span>
              <span class="value">{{ formatBytes(usage.upload) }}</span>
            </div>
          </div>

          <div class="stat-card avg">
            <span class="icon">📈</span>
            <div class="stat-info">
              <span class="label">Promedio Diario</span>
              <span class="value">{{ formatBytes(usage.avgDaily) }}</span>
            </div>
          </div>
        </div>

        <!-- Barra de progreso si hay límite -->
        <div v-if="usage.limit" class="usage-limit">
          <div class="limit-header">
            <span>Límite de Datos</span>
            <span>{{ formatBytes(usage.totalUsage) }} / {{ formatBytes(usage.limit) }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: getUsagePercentage() + '%' }"
              :class="{ warning: getUsagePercentage() > 80, danger: getUsagePercentage() > 95 }"
            ></div>
          </div>
          <div class="limit-footer">
            <span>{{ getUsagePercentage() }}% utilizado</span>
            <span>{{ formatBytes(usage.limit - usage.totalUsage) }} restante</span>
          </div>
        </div>

        <div v-else class="unlimited-notice">
          <p>✨ Tienes datos ilimitados</p>
        </div>
      </div>

      <!-- Gráfica de consumo diario -->
      <div class="chart-card">
        <h2>Consumo Diario</h2>
        <div class="daily-chart">
          <div
            v-for="(day, index) in usage.dailyUsage"
            :key="index"
            class="chart-bar-container"
          >
            <div class="chart-bar">
              <div
                class="bar-fill"
                :style="{ height: getBarHeight(day.total) + '%' }"
              ></div>
            </div>
            <div class="chart-label">
              <span class="day">{{ formatDay(day.date) }}</span>
              <span class="amount">{{ formatBytesShort(day.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Desglose por tipo -->
      <div class="breakdown-card">
        <h2>Desglose por Tipo de Tráfico</h2>
        <div class="breakdown-list">
          <div
            v-for="item in usage.breakdown"
            :key="item.type"
            class="breakdown-item"
          >
            <div class="breakdown-header">
              <span class="type-icon">{{ item.icon }}</span>
              <span class="type-name">{{ item.type }}</span>
              <span class="type-amount">{{ formatBytes(item.amount) }}</span>
            </div>
            <div class="breakdown-bar">
              <div
                class="breakdown-fill"
                :style="{ width: getBreakdownPercentage(item.amount) + '%' }"
              ></div>
            </div>
            <div class="breakdown-percentage">
              {{ getBreakdownPercentage(item.amount) }}% del total
            </div>
          </div>
        </div>
      </div>

      <!-- Horario de mayor consumo -->
      <div class="peak-hours-card">
        <h2>Horarios de Mayor Consumo</h2>
        <div class="peak-hours-list">
          <div
            v-for="(hour, index) in usage.peakHours"
            :key="index"
            class="peak-hour-item"
          >
            <div class="hour-time">
              <span class="icon">🕐</span>
              <span>{{ hour.time }}</span>
            </div>
            <div class="hour-bar">
              <div
                class="hour-fill"
                :style="{ width: getPeakHourPercentage(hour.usage) + '%' }"
              ></div>
            </div>
            <span class="hour-amount">{{ formatBytes(hour.usage) }}</span>
          </div>
        </div>
      </div>

      <!-- Comparación con período anterior -->
      <div class="comparison-card" v-if="usage.comparison">
        <h2>Comparación con Período Anterior</h2>
        <div class="comparison-stats">
          <div class="comparison-item">
            <span class="label">Período Anterior:</span>
            <span class="value">{{ formatBytes(usage.comparison.previous) }}</span>
          </div>
          <div class="comparison-item">
            <span class="label">Período Actual:</span>
            <span class="value">{{ formatBytes(usage.comparison.current) }}</span>
          </div>
          <div class="comparison-item">
            <span class="label">Diferencia:</span>
            <span
              class="value"
              :class="{
                positive: usage.comparison.difference > 0,
                negative: usage.comparison.difference < 0
              }"
            >
              {{ usage.comparison.difference > 0 ? '+' : '' }}{{ formatBytes(Math.abs(usage.comparison.difference)) }}
              ({{ usage.comparison.percentage > 0 ? '+' : '' }}{{ usage.comparison.percentage }}%)
            </span>
          </div>
        </div>
      </div>

      <!-- Consejos de uso -->
      <div class="tips-card">
        <h2>💡 Consejos para Optimizar tu Consumo</h2>
        <ul class="tips-list">
          <li>Configura la calidad de video en streaming según tu plan</li>
          <li>Programa descargas grandes en horarios de menor uso</li>
          <li>Desactiva actualizaciones automáticas cuando no sea necesario</li>
          <li>Cierra aplicaciones que consumen datos en segundo plano</li>
          <li>Usa Wi-Fi en lugar de datos móviles cuando sea posible</li>
        </ul>
      </div>
    </div>

    <div v-else class="error">
      <p>Error al cargar las estadísticas de consumo</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ClientPortalUsage',
  data() {
    return {
      loading: false,
      usage: null,
      selectedPeriod: 'week',
      periods: [
        { value: 'day', label: 'Hoy' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mes' },
        { value: 'year', label: 'Año' }
      ]
    };
  },
  mounted() {
    this.loadUsageStats();
  },
  methods: {
    async loadUsageStats() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_URL}client-portal/usage`, {
          params: { period: this.selectedPeriod },
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.usage = response.data;
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        this.$toast?.error('Error al cargar las estadísticas de consumo');
      } finally {
        this.loading = false;
      }
    },
    getPeriodLabel() {
      const labels = {
        day: 'Hoy',
        week: 'Esta Semana',
        month: 'Este Mes',
        year: 'Este Año'
      };
      return labels[this.selectedPeriod] || '';
    },
    formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },
    formatBytesShort(bytes) {
      if (!bytes || bytes === 0) return '0';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i)) + sizes[i];
    },
    formatDay(date) {
      return new Date(date).toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric'
      });
    },
    getUsagePercentage() {
      if (!this.usage || !this.usage.limit) return 0;
      return Math.min(100, Math.round((this.usage.totalUsage / this.usage.limit) * 100));
    },
    getBarHeight(value) {
      if (!this.usage || !this.usage.dailyUsage) return 0;
      const maxValue = Math.max(...this.usage.dailyUsage.map(d => d.total));
      return (value / maxValue) * 100;
    },
    getBreakdownPercentage(amount) {
      if (!this.usage) return 0;
      return Math.round((amount / this.usage.totalUsage) * 100);
    },
    getPeakHourPercentage(usage) {
      if (!this.usage || !this.usage.peakHours) return 0;
      const maxUsage = Math.max(...this.usage.peakHours.map(h => h.usage));
      return (usage / maxUsage) * 100;
    },
    goBack() {
      this.$router.push('/client-portal/dashboard');
    }
  }
};
</script>

<style scoped>
.client-portal-usage {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
}

.btn-back {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: #bdc3c7;
}

.period-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.period-btn {
  flex: 1;
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.period-btn:hover {
  background: #bdc3c7;
}

.period-btn.active {
  background: #3498db;
  color: white;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.usage-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-card,
.chart-card,
.breakdown-card,
.peak-hours-card,
.comparison-card,
.tips-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-header h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0;
}

.period-label {
  font-size: 14px;
  color: #666;
  background: #f8f9fa;
  padding: 5px 15px;
  border-radius: 20px;
}

.usage-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid;
}

.stat-card.total {
  border-left-color: #3498db;
}

.stat-card.download {
  border-left-color: #27ae60;
}

.stat-card.upload {
  border-left-color: #f39c12;
}

.stat-card.avg {
  border-left-color: #9b59b6;
}

.stat-card .icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-info .label {
  font-size: 12px;
  color: #666;
}

.stat-info .value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.usage-limit {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.limit-header,
.limit-footer {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}

.limit-header {
  margin-bottom: 10px;
  font-weight: 500;
}

.limit-footer {
  margin-top: 10px;
}

.progress-bar {
  height: 20px;
  background: #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(to right, #27ae60, #2ecc71);
  transition: width 0.3s ease;
}

.progress-fill.warning {
  background: linear-gradient(to right, #f39c12, #f1c40f);
}

.progress-fill.danger {
  background: linear-gradient(to right, #e74c3c, #c0392b);
}

.unlimited-notice {
  text-align: center;
  padding: 20px;
  background: #d4edda;
  border-radius: 8px;
}

.unlimited-notice p {
  margin: 0;
  font-size: 16px;
  color: #155724;
  font-weight: 500;
}

.chart-card h2,
.breakdown-card h2,
.peak-hours-card h2,
.comparison-card h2,
.tips-card h2 {
  font-size: 20px;
  color: #2c3e50;
  margin: 0 0 20px 0;
}

.daily-chart {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  height: 200px;
  padding: 10px 0;
}

.chart-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.chart-bar {
  width: 100%;
  height: 150px;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(to top, #3498db, #5dade2);
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.chart-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.chart-label .day {
  font-size: 12px;
  color: #666;
}

.chart-label .amount {
  font-size: 11px;
  color: #3498db;
  font-weight: 500;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.breakdown-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.breakdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.type-icon {
  font-size: 20px;
}

.type-name {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}

.type-amount {
  font-weight: bold;
  color: #3498db;
}

.breakdown-bar {
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.breakdown-fill {
  height: 100%;
  background: linear-gradient(to right, #3498db, #5dade2);
  transition: width 0.3s ease;
}

.breakdown-percentage {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.peak-hours-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.peak-hour-item {
  display: flex;
  align-items: center;
  gap: 15px;
}

.hour-time {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  font-weight: 500;
  color: #2c3e50;
}

.hour-bar {
  flex: 1;
  height: 30px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.hour-fill {
  height: 100%;
  background: linear-gradient(to right, #f39c12, #f1c40f);
  transition: width 0.3s ease;
}

.hour-amount {
  min-width: 80px;
  text-align: right;
  font-weight: 500;
  color: #f39c12;
}

.comparison-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.comparison-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #dee2e6;
}

.comparison-item:last-child {
  border-bottom: none;
  font-weight: bold;
}

.comparison-item .label {
  color: #666;
}

.comparison-item .value {
  color: #2c3e50;
  font-weight: 500;
}

.comparison-item .value.positive {
  color: #e74c3c;
}

.comparison-item .value.negative {
  color: #27ae60;
}

.tips-list {
  margin: 0;
  padding-left: 25px;
}

.tips-list li {
  margin-bottom: 10px;
  color: #666;
  line-height: 1.5;
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}
</style>
