<template>
  <div class="device-metrics">
    <div class="header">
      <h2>Métricas - {{ device.name }}</h2>
      <div class="actions">
        <button @click="refreshMetrics" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="exportMetrics" class="export-button">
          📊 Exportar
        </button>
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando métricas...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="metrics-content">
      <!-- Información del Dispositivo -->
      <div class="device-info-card">
        <div class="device-header">
          <div class="device-icon">{{ getBrandIcon(device.brand) }}</div>
          <div class="device-details">
            <h3>{{ device.name }}</h3>
            <div class="device-meta">
              <span class="brand">{{ device.brand?.toUpperCase() }}</span>
              <span class="type">{{ device.type?.toUpperCase() }}</span>
              <span class="ip">{{ device.ipAddress }}</span>
            </div>
          </div>
          <div class="device-status">
            <span :class="['status-indicator', device.status]">
              {{ getStatusIcon(device.status) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Filtros de Tiempo -->
      <div class="time-filters">
        <div class="filter-group">
          <label>Período:</label>
          <select v-model="selectedPeriod" @change="loadMetrics">
            <option value="1h">Última hora</option>
            <option value="6h">Últimas 6 horas</option>
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Intervalo:</label>
          <select v-model="selectedInterval" @change="loadMetrics">
            <option value="1m">1 minuto</option>
            <option value="5m">5 minutos</option>
            <option value="15m">15 minutos</option>
            <option value="1h">1 hora</option>
            <option value="1d">1 día</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Actualización:</label>
          <select v-model="autoRefresh" @change="toggleAutoRefresh">
            <option value="off">Manual</option>
            <option value="30s">30 segundos</option>
            <option value="1m">1 minuto</option>
            <option value="5m">5 minutos</option>
          </select>
        </div>
      </div>
      
      <!-- Métricas Actuales (Cards) -->
      <div class="current-metrics">
        <div class="metric-card" v-for="metric in currentMetrics" :key="metric.type">
          <div class="metric-header">
            <span class="metric-icon">{{ metric.icon }}</span>
            <span class="metric-title">{{ metric.title }}</span>
          </div>
          <div class="metric-value">{{ metric.value }}{{ metric.unit }}</div>
          <div class="metric-bar" v-if="metric.percentage !== undefined">
            <div 
              class="metric-fill" 
              :class="getMetricClass(metric.percentage)"
              :style="{ width: metric.percentage + '%' }"
            ></div>
          </div>
          <div class="metric-status">{{ getMetricStatus(metric.percentage) }}</div>
        </div>
      </div>
      
      <!-- Gráficos de Métricas -->
      <div class="charts-container">
        <!-- Gráfico de CPU -->
        <div class="chart-card">
          <h4>💻 Uso de CPU</h4>
          <div class="chart-wrapper">
            <canvas ref="cpuChart" class="metric-chart"></canvas>
          </div>
        </div>
        
        <!-- Gráfico de Memoria -->
        <div class="chart-card">
          <h4>💾 Uso de Memoria</h4>
          <div class="chart-wrapper">
            <canvas ref="memoryChart" class="metric-chart"></canvas>
          </div>
        </div>
        
        <!-- Gráfico de Red -->
        <div class="chart-card">
          <h4>🌐 Tráfico de Red</h4>
          <div class="chart-wrapper">
            <canvas ref="networkChart" class="metric-chart"></canvas>
          </div>
        </div>
        
        <!-- Gráfico de Señal (para CPEs) -->
        <div class="chart-card" v-if="device.type === 'cpe'">
          <h4>📶 Nivel de Señal</h4>
          <div class="chart-wrapper">
            <canvas ref="signalChart" class="metric-chart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Tabla de Métricas Históricas -->
      <div class="metrics-table-section">
        <h3>Historial de Métricas</h3>
        
        <div class="table-controls">
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Buscar en métricas..."
            />
          </div>
          
          <div class="table-actions">
            <button @click="exportTableData" class="export-btn">
              📋 Exportar Tabla
            </button>
          </div>
        </div>
        
        <div class="metrics-table-wrapper">
          <table class="metrics-table">
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>CPU (%)</th>
                <th>RAM (%)</th>
                <th>Disco (%)</th>
                <th>Uptime</th>
                <th>Estado</th>
                <th v-if="device.type === 'cpe'">Señal (dBm)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="metric in filteredHistoricalMetrics" :key="metric.id">
                <td>{{ formatDate(metric.timestamp) }}</td>
                <td>
                  <span :class="getValueClass(metric.cpuUsage)">
                    {{ metric.cpuUsage || '-' }}%
                  </span>
                </td>
                <td>
                  <span :class="getValueClass(metric.memoryUsage)">
                    {{ metric.memoryUsage || '-' }}%
                  </span>
                </td>
                <td>
                  <span :class="getValueClass(metric.diskUsage)">
                    {{ metric.diskUsage || '-' }}%
                  </span>
                </td>
                <td>{{ formatUptime(metric.uptime) }}</td>
                <td>
                  <span :class="['status-badge', metric.status]">
                    {{ getStatusText(metric.status) }}
                  </span>
                </td>
                <td v-if="device.type === 'cpe'">
                  <span :class="getSignalClass(metric.signalStrength)">
                    {{ metric.signalStrength || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Paginación -->
        <div class="pagination" v-if="totalPages > 1">
          <button 
            @click="changePage(currentPage - 1)" 
            :disabled="currentPage === 1"
          >
            Anterior
          </button>
          
          <span class="page-info">
            Página {{ currentPage }} de {{ totalPages }}
          </span>
          
          <button 
            @click="changePage(currentPage + 1)" 
            :disabled="currentPage === totalPages"
          >
            Siguiente
          </button>
        </div>
      </div>
      
      <!-- Estadísticas Resumidas -->
      <div class="summary-stats">
        <h3>Estadísticas del Período</h3>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">CPU Promedio</div>
            <div class="stat-value">{{ statistics.avgCpu }}%</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">CPU Máximo</div>
            <div class="stat-value">{{ statistics.maxCpu }}%</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">RAM Promedio</div>
            <div class="stat-value">{{ statistics.avgMemory }}%</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">RAM Máximo</div>
            <div class="stat-value">{{ statistics.maxMemory }}%</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Disponibilidad</div>
            <div class="stat-value">{{ statistics.uptime }}%</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Total Registros</div>
            <div class="stat-value">{{ statistics.totalRecords }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de Exportación -->
    <div v-if="showExportModal" class="modal" @click="closeExportModal">
      <div class="modal-content" @click.stop>
        <h3>Exportar Métricas</h3>
        
        <div class="export-options">
          <div class="option-group">
            <label>Formato:</label>
            <select v-model="exportFormat">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel</option>
            </select>
          </div>
          
          <div class="option-group">
            <label>Período de Exportación:</label>
            <select v-model="exportPeriod">
              <option value="current">Período Actual</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          
          <div v-if="exportPeriod === 'custom'" class="date-range">
            <div class="date-input">
              <label>Desde:</label>
              <input type="datetime-local" v-model="exportStartDate" />
            </div>
            <div class="date-input">
              <label>Hasta:</label>
              <input type="datetime-local" v-model="exportEndDate" />
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeExportModal" class="cancel-btn">Cancelar</button>
          <button @click="performExport" class="export-btn" :disabled="exporting">
            {{ exporting ? '⏳ Exportando...' : '📊 Exportar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DeviceService from '../services/device.service';
import Chart from 'chart.js/auto';

export default {
  name: 'DeviceMetrics',
  data() {
    return {
      device: {},
      historicalMetrics: [],
      currentMetrics: [],
      statistics: {},
      charts: {},
      loading: true,
      error: null,
      selectedPeriod: '24h',
      selectedInterval: '15m',
      autoRefresh: 'off',
      refreshInterval: null,
      searchQuery: '',
      currentPage: 1,
      pageSize: 50,
      totalItems: 0,
      totalPages: 0,
      showExportModal: false,
      exportFormat: 'csv',
      exportPeriod: 'current',
      exportStartDate: '',
      exportEndDate: '',
      exporting: false
    };
  },
  computed: {
    filteredHistoricalMetrics() {
      if (!this.searchQuery) {
        return this.historicalMetrics;
      }
      
      const query = this.searchQuery.toLowerCase();
      return this.historicalMetrics.filter(metric => 
        this.formatDate(metric.timestamp).toLowerCase().includes(query) ||
        metric.status.toLowerCase().includes(query)
      );
    }
  },
  created() {
    this.loadDevice();
  },
  beforeUnmount() {
    this.clearAutoRefresh();
    this.destroyCharts();
  },
  methods: {
    async loadDevice() {
      this.loading = true;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
        
        await this.loadMetrics();
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error = 'Error cargando información del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadMetrics() {
      try {
        const params = {
          period: this.selectedPeriod,
          interval: this.selectedInterval,
          page: this.currentPage,
          size: this.pageSize
        };
        
        const response = await DeviceService.getDeviceMetrics(this.device.id, params);
        this.historicalMetrics = response.data.metrics || response.data;
        this.totalItems = response.data.totalItems || this.historicalMetrics.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        this.updateCurrentMetrics();
        this.calculateStatistics();
        this.updateCharts();
      } catch (error) {
        console.error('Error cargando métricas:', error);
        this.error = 'Error cargando métricas del dispositivo.';
      }
    },
    
    updateCurrentMetrics() {
      const latest = this.historicalMetrics[0];
      if (!latest) return;
      
      this.currentMetrics = [
        {
          type: 'cpu',
          title: 'CPU',
          icon: '🖥️',
          value: latest.cpuUsage || 0,
          unit: '%',
          percentage: latest.cpuUsage || 0
        },
        {
          type: 'memory',
          title: 'Memoria',
          icon: '💾',
          value: latest.memoryUsage || 0,
          unit: '%',
          percentage: latest.memoryUsage || 0
        },
        {
          type: 'disk',
          title: 'Disco',
          icon: '💿',
          value: latest.diskUsage || 0,
          unit: '%',
          percentage: latest.diskUsage || 0
        },
        {
          type: 'uptime',
          title: 'Uptime',
          icon: '⏱️',
          value: this.formatUptime(latest.uptime),
          unit: ''
        }
      ];
      
      if (this.device.type === 'cpe' && latest.signalStrength) {
        this.currentMetrics.push({
          type: 'signal',
          title: 'Señal',
          icon: '📶',
          value: latest.signalStrength,
          unit: ' dBm'
        });
      }
    },
    
    calculateStatistics() {
      if (this.historicalMetrics.length === 0) {
        this.statistics = {};
        return;
      }
      
      const metrics = this.historicalMetrics;
      const cpuValues = metrics.map(m => m.cpuUsage).filter(v => v !== null);
      const memoryValues = metrics.map(m => m.memoryUsage).filter(v => v !== null);
      const onlineCount = metrics.filter(m => m.status === 'online').length;
      
      this.statistics = {
        avgCpu: cpuValues.length > 0 ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) : 0,
        maxCpu: cpuValues.length > 0 ? Math.max(...cpuValues) : 0,
        avgMemory: memoryValues.length > 0 ? Math.round(memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length) : 0,
        maxMemory: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
        uptime: Math.round((onlineCount / metrics.length) * 100),
        totalRecords: metrics.length
      };
    },
    
    updateCharts() {
      this.$nextTick(() => {
        this.createCpuChart();
        this.createMemoryChart();
        this.createNetworkChart();
        if (this.device.type === 'cpe') {
          this.createSignalChart();
        }
      });
    },
    
    createCpuChart() {
      const ctx = this.$refs.cpuChart;
      if (!ctx) return;
      
      if (this.charts.cpu) {
        this.charts.cpu.destroy();
      }
      
      const data = this.historicalMetrics.slice(-24).reverse();
      
      this.charts.cpu = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(m => this.formatTime(m.timestamp)),
          datasets: [{
            label: 'CPU %',
            data: data.map(m => m.cpuUsage || 0),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    },
    
    createMemoryChart() {
      const ctx = this.$refs.memoryChart;
      if (!ctx) return;
      
      if (this.charts.memory) {
        this.charts.memory.destroy();
      }
      
      const data = this.historicalMetrics.slice(-24).reverse();
      
      this.charts.memory = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(m => this.formatTime(m.timestamp)),
          datasets: [{
            label: 'Memoria %',
            data: data.map(m => m.memoryUsage || 0),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      });
    },
    
    createNetworkChart() {
      const ctx = this.$refs.networkChart;
      if (!ctx) return;
      
      if (this.charts.network) {
        this.charts.network.destroy();
      }
      
      const data = this.historicalMetrics.slice(-24).reverse();
      
      this.charts.network = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(m => this.formatTime(m.timestamp)),
          datasets: [
            {
              label: 'RX (Mbps)',
              data: data.map(m => (m.rxBytes || 0) / 1024 / 1024),
              borderColor: '#ffc107',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              tension: 0.4
            },
            {
              label: 'TX (Mbps)',
              data: data.map(m => (m.txBytes || 0) / 1024 / 1024),
              borderColor: '#dc3545',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    },
    
    createSignalChart() {
      const ctx = this.$refs.signalChart;
      if (!ctx || this.device.type !== 'cpe') return;
      
      if (this.charts.signal) {
        this.charts.signal.destroy();
      }
      
      const data = this.historicalMetrics.slice(-24).reverse();
      
      this.charts.signal = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(m => this.formatTime(m.timestamp)),
          datasets: [{
            label: 'Señal (dBm)',
            data: data.map(m => m.signalStrength || 0),
            borderColor: '#6f42c1',
            backgroundColor: 'rgba(111, 66, 193, 0.1)',
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: -100,
              max: 0
            }
          }
        }
      });
    },
    
    destroyCharts() {
      Object.values(this.charts).forEach(chart => {
        if (chart) chart.destroy();
      });
      this.charts = {};
    },
    
    toggleAutoRefresh() {
      this.clearAutoRefresh();
      
      if (this.autoRefresh !== 'off') {
        const intervals = {
          '30s': 30000,
          '1m': 60000,
          '5m': 300000
        };
        
        this.refreshInterval = setInterval(() => {
          this.loadMetrics();
        }, intervals[this.autoRefresh]);
      }
    },
    
    clearAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    },
    
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.loadMetrics();
      }
    },
    
    async refreshMetrics() {
      await this.loadMetrics();
    },
    
    exportMetrics() {
      this.showExportModal = true;
    },
    
    closeExportModal() {
      this.showExportModal = false;
    },
    
    async performExport() {
      this.exporting = true;
      try {
        const params = {
          deviceId: this.device.id,
          format: this.exportFormat,
          period: this.exportPeriod
        };
        
        if (this.exportPeriod === 'custom') {
          params.startDate = this.exportStartDate;
          params.endDate = this.exportEndDate;
        }
        
        const response = await DeviceService.exportMetrics(params);
        
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `metrics-${this.device.name}-${Date.now()}.${this.exportFormat}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        this.closeExportModal();
      } catch (error) {
        console.error('Error exportando métricas:', error);
        alert('Error al exportar métricas');
      } finally {
        this.exporting = false;
      }
    },
    
    exportTableData() {
      // Exportación rápida de la tabla actual
      this.exportFormat = 'csv';
      this.exportPeriod = 'current';
      this.performExport();
    },
    
    getMetricClass(percentage) {
      if (percentage >= 80) return 'critical';
      if (percentage >= 60) return 'warning';
      return 'normal';
    },
    
    getMetricStatus(percentage) {
      if (percentage >= 80) return 'Crítico';
      if (percentage >= 60) return 'Alerta';
      return 'Normal';
    },
    
    getValueClass(value) {
      if (value >= 80) return 'value-critical';
      if (value >= 60) return 'value-warning';
      return 'value-normal';
    },
    
    getSignalClass(signal) {
      if (signal >= -50) return 'signal-excellent';
      if (signal >= -70) return 'signal-good';
      if (signal >= -85) return 'signal-fair';
      return 'signal-poor';
    },
    
    getBrandIcon(brand) {
      const icons = {
        mikrotik: '🔧',
        ubiquiti: '📡',
        tplink: '🌐',
        cambium: '📶',
        mimosa: '🎯'
      };
      return icons[brand] || '🔌';
    },
    
    getStatusIcon(status) {
      const icons = {
        online: '🟢',
        offline: '🔴',
        warning: '🟡',
        maintenance: '🔧'
      };
      return icons[status] || '⚪';
    },
    
    getStatusText(status) {
      const texts = {
        online: 'En línea',
        offline: 'Fuera de línea',
        warning: 'Con alertas',
        maintenance: 'Mantenimiento'
      };
      return texts[status] || 'Desconocido';
    },
    
    formatDate(dateString) {
      if (!dateString) return 'No disponible';
      
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    formatTime(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    formatUptime(seconds) {
      if (!seconds) return 'No disponible';
      
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      return `${days}d ${hours}h ${minutes}m`;
    },
    
    goBack() {
      this.$router.push(`/devices/${this.device.id}`);
    }
  }
};
</script>

<style scoped>
.device-metrics {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-button {
  background-color: #28a745;
  color: white;
}

.export-button {
  background-color: #007bff;
  color: white;
}

.back-button {
  background-color: #e0e0e0;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error {
  color: #f44336;
}

.metrics-content {
  display: grid;
  gap: 20px;
}

.device-info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.device-header {
  display: flex;
  align-items: center;
  gap: 15px;
}

.device-icon {
  font-size: 2rem;
}

.device-details h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.device-meta {
  display: flex;
  gap: 10px;
}

.brand, .type, .ip {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f8f9fa;
  color: #495057;
}

.device-status {
  margin-left: auto;
  font-size: 1.5em;
}

.time-filters {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  font-weight: 500;
  color: #666;
}

.filter-group select {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 120px;
}

.current-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.metric-icon {
  font-size: 1.5em;
}

.metric-title {
  font-weight: 500;
  color: #666;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.metric-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.metric-fill {
  height: 100%;
  transition: width 0.3s;
}

.metric-fill.normal {
  background: #28a745;
}

.metric-fill.warning {
  background: #ffc107;
}

.metric-fill.critical {
  background: #dc3545;
}

.metric-status {
  font-size: 0.9em;
  color: #666;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.chart-wrapper {
  position: relative;
  height: 300px;
}

.metric-chart {
  width: 100% !important;
  height: 100% !important;
}

.metrics-table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metrics-table-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.search-box input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 250px;
}

.table-actions button {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.metrics-table-wrapper {
  overflow-x: auto;
  margin-bottom: 15px;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
}

.metrics-table th,
.metrics-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.metrics-table th {
  background-color: #f8f9fa;
  font-weight: 500;
  position: sticky;
  top: 0;
}

.metrics-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.value-normal {
  color: #28a745;
}

.value-warning {
  color: #ffc107;
}

.value-critical {
  color: #dc3545;
}

.signal-excellent {
  color: #28a745;
}

.signal-good {
  color: #6f42c1;
}

.signal-fair {
  color: #ffc107;
}

.signal-poor {
  color: #dc3545;
}

.status-badge {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
  font-weight: 500;
}

.status-badge.online {
  background: #d4edda;
  color: #155724;
}

.status-badge.offline {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.warning {
  background: #fff3cd;
  color: #856404;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 20px;
}

.pagination button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.9em;
  color: #666;
}

.summary-stats {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-stats h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.3em;
  font-weight: bold;
  color: #333;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.export-options {
  margin-bottom: 20px;
}

.option-group {
  margin-bottom: 15px;
}

.option-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #666;
}

.option-group select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}

.date-input label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #666;
}

.date-input input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.export-btn {
  background: #007bff;
  color: white;
}

.export-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .device-metrics {
    padding: 10px;
  }
  
  .time-filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .current-metrics {
    grid-template-columns: 1fr 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .table-controls {
    flex-direction: column;
    gap: 10px;
  }
  
  .search-box input {
    width: 100%;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .date-range {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .current-metrics {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .device-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .chart-wrapper {
    height: 250px;
  }
  
  .metrics-table th,
  .metrics-table td {
    padding: 6px 8px;
    font-size: 0.9em;
  }
}
</style>