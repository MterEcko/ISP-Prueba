<template>
  <div class="connection-history">
    <div class="header">
      <h2>Historial de Conexiones - {{ device.name }}</h2>
      <div class="actions">
        <button @click="refreshHistory" class="refresh-button" :disabled="loading">
          🔄 Actualizar
        </button>
        <button @click="exportHistory" class="export-button">
          📊 Exportar
        </button>
        <button @click="goBack" class="back-button">
          ← Volver
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      Cargando historial de conexiones...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="history-content">
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
            <div class="status-info">
              <div class="current-status">{{ getStatusText(device.status) }}</div>
              <div class="last-seen">Última conexión: {{ formatDate(device.lastSeen) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Estadísticas de Conexión -->
      <div class="connection-stats">
        <div class="stat-card uptime">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ connectionStats.uptimePercentage }}%</div>
            <div class="stat-label">Disponibilidad (30d)</div>
          </div>
        </div>
        
        <div class="stat-card disconnections">
          <div class="stat-icon">🔌</div>
          <div class="stat-content">
            <div class="stat-value">{{ connectionStats.totalDisconnections }}</div>
            <div class="stat-label">Desconexiones (30d)</div>
          </div>
        </div>
        
        <div class="stat-card avg-uptime">
          <div class="stat-icon">📈</div>
          <div class="stat-content">
            <div class="stat-value">{{ connectionStats.averageUptime }}</div>
            <div class="stat-label">Uptime Promedio</div>
          </div>
        </div>
        
        <div class="stat-card longest-uptime">
          <div class="stat-icon">🏆</div>
          <div class="stat-content">
            <div class="stat-value">{{ connectionStats.longestUptime }}</div>
            <div class="stat-label">Mayor Uptime</div>
          </div>
        </div>
      </div>
      
      <!-- Filtros y Controles -->
      <div class="history-controls">
        <div class="filters">
          <div class="filter-group">
            <label>Período:</label>
            <select v-model="selectedPeriod" @change="loadHistory">
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          
          <div class="filter-group" v-if="selectedPeriod === 'custom'">
            <label>Desde:</label>
            <input type="datetime-local" v-model="customStartDate" @change="loadHistory" />
          </div>
          
          <div class="filter-group" v-if="selectedPeriod === 'custom'">
            <label>Hasta:</label>
            <input type="datetime-local" v-model="customEndDate" @change="loadHistory" />
          </div>
          
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="selectedStatus" @change="filterHistory">
              <option value="">Todos los estados</option>
              <option value="online">Conectado</option>
              <option value="offline">Desconectado</option>
              <option value="warning">Con alertas</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Búsqueda:</label>
            <input 
              type="text" 
              v-model="searchQuery" 
              @input="filterHistory"
              placeholder="Buscar eventos..."
            />
          </div>
        </div>
        
        <div class="view-options">
          <button 
            @click="viewMode = 'timeline'" 
            :class="{ active: viewMode === 'timeline' }"
            class="view-btn"
          >
            📅 Línea de Tiempo
          </button>
          <button 
            @click="viewMode = 'table'" 
            :class="{ active: viewMode === 'table' }"
            class="view-btn"
          >
            📋 Tabla
          </button>
          <button 
            @click="viewMode = 'chart'" 
            :class="{ active: viewMode === 'chart' }"
            class="view-btn"
          >
            📈 Gráfico
          </button>
        </div>
      </div>
      
      <!-- Vista de Línea de Tiempo -->
      <div v-if="viewMode === 'timeline'" class="timeline-view">
        <div class="timeline-container">
          <div 
            class="timeline-item" 
            v-for="event in filteredHistory" 
            :key="event.id"
          >
            <div class="timeline-marker">
              <div :class="['timeline-dot', event.status]"></div>
            </div>
            
            <div class="timeline-content">
              <div class="event-header">
                <div class="event-status">
                  <span :class="['status-badge', event.status]">
                    {{ getStatusIcon(event.status) }} {{ getStatusText(event.status) }}
                  </span>
                </div>
                <div class="event-time">
                  {{ formatDate(event.timestamp) }}
                </div>
              </div>
              
              <div class="event-details">
                <div v-if="event.duration" class="event-duration">
                  <strong>Duración:</strong> {{ formatDuration(event.duration) }}
                </div>
                
                <div v-if="event.reason" class="event-reason">
                  <strong>Motivo:</strong> {{ event.reason }}
                </div>
                
                <div v-if="event.description" class="event-description">
                  {{ event.description }}
                </div>
                
                <div v-if="event.metrics" class="event-metrics">
                  <div class="metric-chip" v-if="event.metrics.latency">
                    📶 {{ event.metrics.latency }}ms
                  </div>
                  <div class="metric-chip" v-if="event.metrics.packetLoss">
                    📉 {{ event.metrics.packetLoss }}% pérdida
                  </div>
                  <div class="metric-chip" v-if="event.metrics.signalStrength">
                    📡 {{ event.metrics.signalStrength }}dBm
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="filteredHistory.length === 0" class="no-events">
          No se encontraron eventos para los filtros seleccionados.
        </div>
      </div>
      
      <!-- Vista de Tabla -->
      <div v-if="viewMode === 'table'" class="table-view">
        <div class="table-wrapper">
          <table class="history-table">
            <thead>
              <tr>
                <th @click="sortBy('timestamp')" class="sortable">
                  Fecha/Hora
                  <span v-if="sortField === 'timestamp'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th @click="sortBy('status')" class="sortable">
                  Estado
                  <span v-if="sortField === 'status'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th @click="sortBy('duration')" class="sortable">
                  Duración
                  <span v-if="sortField === 'duration'">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th>Motivo</th>
                <th>Métricas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in paginatedHistory" :key="event.id">
                <td>{{ formatDate(event.timestamp) }}</td>
                <td>
                  <span :class="['status-badge', event.status]">
                    {{ getStatusIcon(event.status) }} {{ getStatusText(event.status) }}
                  </span>
                </td>
                <td>{{ formatDuration(event.duration) }}</td>
                <td>{{ event.reason || '-' }}</td>
                <td>
                  <div class="table-metrics">
                    <span v-if="event.metrics?.latency" class="metric-tag">
                      📶 {{ event.metrics.latency }}ms
                    </span>
                    <span v-if="event.metrics?.signalStrength" class="metric-tag">
                      📡 {{ event.metrics.signalStrength }}dBm
                    </span>
                  </div>
                </td>
                <td>
                  <button @click="showEventDetails(event)" class="detail-btn">
                    👁️ Ver
                  </button>
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
      
      <!-- Vista de Gráfico -->
      <div v-if="viewMode === 'chart'" class="chart-view">
        <div class="chart-container">
          <canvas ref="uptimeChart" class="uptime-chart"></canvas>
        </div>
        
        <div class="chart-legend">
          <div class="legend-item">
            <div class="legend-color online"></div>
            <span>Conectado</span>
          </div>
          <div class="legend-item">
            <div class="legend-color offline"></div>
            <span>Desconectado</span>
          </div>
          <div class="legend-item">
            <div class="legend-color warning"></div>
            <span>Con alertas</span>
          </div>
          <div class="legend-item">
            <div class="legend-color maintenance"></div>
            <span>Mantenimiento</span>
          </div>
        </div>
      </div>
      
      <!-- Análisis de Patrones -->
      <div class="pattern-analysis">
        <h3>Análisis de Patrones de Conexión</h3>
        
        <div class="pattern-cards">
          <div class="pattern-card">
            <h4>📊 Por Hora del Día</h4>
            <div class="hourly-pattern">
              <div 
                v-for="hour in hourlyPattern" 
                :key="hour.hour"
                class="hour-bar"
                :style="{ height: hour.percentage + '%' }"
                :title="`${hour.hour}:00 - ${hour.disconnections} desconexiones`"
              >
                <span class="hour-label">{{ hour.hour }}</span>
              </div>
            </div>
          </div>
          
          <div class="pattern-card">
            <h4>📅 Por Día de la Semana</h4>
            <div class="daily-pattern">
              <div 
                v-for="day in dailyPattern" 
                :key="day.day"
                class="day-item"
              >
                <div class="day-name">{{ day.name }}</div>
                <div class="day-bar">
                  <div 
                    class="day-fill" 
                    :style="{ width: day.percentage + '%' }"
                  ></div>
                </div>
                <div class="day-value">{{ day.disconnections }}</div>
              </div>
            </div>
          </div>
          
          <div class="pattern-card">
            <h4>🔍 Motivos Principales</h4>
            <div class="reasons-list">
              <div 
                v-for="reason in topReasons" 
                :key="reason.reason"
                class="reason-item"
              >
                <div class="reason-text">{{ reason.reason }}</div>
                <div class="reason-count">{{ reason.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal de Detalles del Evento -->
    <div v-if="showDetailsModal" class="modal" @click="closeDetailsModal">
      <div class="modal-content" @click.stop>
        <h3>Detalles del Evento</h3>
        
        <div v-if="selectedEvent" class="event-details-modal">
          <div class="detail-row">
            <span class="detail-label">Estado:</span>
            <span :class="['status-badge', selectedEvent.status]">
              {{ getStatusIcon(selectedEvent.status) }} {{ getStatusText(selectedEvent.status) }}
            </span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Fecha/Hora:</span>
            <span>{{ formatDate(selectedEvent.timestamp) }}</span>
          </div>
          
          <div class="detail-row" v-if="selectedEvent.duration">
            <span class="detail-label">Duración:</span>
            <span>{{ formatDuration(selectedEvent.duration) }}</span>
          </div>
          
          <div class="detail-row" v-if="selectedEvent.reason">
            <span class="detail-label">Motivo:</span>
            <span>{{ selectedEvent.reason }}</span>
          </div>
          
          <div class="detail-row" v-if="selectedEvent.description">
            <span class="detail-label">Descripción:</span>
            <span>{{ selectedEvent.description }}</span>
          </div>
          
          <div v-if="selectedEvent.metrics" class="metrics-section">
            <h4>Métricas del Evento</h4>
            <div class="metrics-grid">
              <div v-if="selectedEvent.metrics.latency" class="metric-item">
                <span class="metric-label">Latencia:</span>
                <span class="metric-value">{{ selectedEvent.metrics.latency }}ms</span>
              </div>
              
              <div v-if="selectedEvent.metrics.packetLoss" class="metric-item">
                <span class="metric-label">Pérdida de Paquetes:</span>
                <span class="metric-value">{{ selectedEvent.metrics.packetLoss }}%</span>
              </div>
              
              <div v-if="selectedEvent.metrics.signalStrength" class="metric-item">
                <span class="metric-label">Nivel de Señal:</span>
                <span class="metric-value">{{ selectedEvent.metrics.signalStrength }}dBm</span>
              </div>
              
              <div v-if="selectedEvent.metrics.throughput" class="metric-item">
                <span class="metric-label">Throughput:</span>
                <span class="metric-value">{{ selectedEvent.metrics.throughput }}Mbps</span>
              </div>
            </div>
          </div>
          
          <div v-if="selectedEvent.relatedEvents" class="related-events">
            <h4>Eventos Relacionados</h4>
            <div class="related-list">
              <div v-for="related in selectedEvent.relatedEvents" :key="related.id" class="related-item">
                <span :class="['status-badge', 'small', related.status]">
                  {{ getStatusIcon(related.status) }}
                </span>
                <span>{{ formatDate(related.timestamp) }}</span>
                <span>{{ related.reason || 'Sin motivo especificado' }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="closeDetailsModal">Cerrar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal de Exportación -->
    <div v-if="showExportModal" class="modal" @click="closeExportModal">
      <div class="modal-content" @click.stop>
        <h3>Exportar Historial de Conexiones</h3>
        
        <div class="export-options">
          <div class="option-group">
            <label>Formato:</label>
            <select v-model="exportFormat">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          
          <div class="option-group">
            <label>Contenido:</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="exportOptions.includeMetrics" />
                <span>Incluir métricas</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="exportOptions.includePatterns" />
                <span>Incluir análisis de patrones</span>
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="exportOptions.includeStats" />
                <span>Incluir estadísticas</span>
              </label>
            </div>
          </div>
          
          <div class="option-group">
            <label>Período:</label>
            <select v-model="exportPeriod">
              <option value="current">Período Actual</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="all">Todos los registros</option>
            </select>
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
  name: 'DeviceConnectionHistory',
  data() {
    return {
      device: {},
      connectionHistory: [],
      filteredHistory: [],
      connectionStats: {},
      hourlyPattern: [],
      dailyPattern: [],
      topReasons: [],
      loading: true,
      error: null,
      viewMode: 'timeline',
      selectedPeriod: '7d',
      customStartDate: '',
      customEndDate: '',
      selectedStatus: '',
      searchQuery: '',
      sortField: 'timestamp',
      sortDirection: 'desc',
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      showDetailsModal: false,
      showExportModal: false,
      selectedEvent: null,
      uptimeChart: null,
      exportFormat: 'csv',
      exportPeriod: 'current',
      exportOptions: {
        includeMetrics: true,
        includePatterns: false,
        includeStats: true
      },
      exporting: false
    };
  },
  computed: {
    paginatedHistory() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredHistory.slice(start, end);
    }
  },
  created() {
    this.loadDevice();
  },
  beforeUnmount() {
    if (this.uptimeChart) {
      this.uptimeChart.destroy();
    }
  },
  methods: {
    async loadDevice() {
      this.loading = true;
      try {
        const deviceId = this.$route.params.deviceId;
        const response = await DeviceService.getDevice(deviceId);
        this.device = response.data;
        
        await this.loadHistory();
      } catch (error) {
        console.error('Error cargando dispositivo:', error);
        this.error = 'Error cargando información del dispositivo.';
      } finally {
        this.loading = false;
      }
    },
    
    async loadHistory() {
      try {
        const params = {
          period: this.selectedPeriod,
          deviceId: this.device.id
        };
        
        if (this.selectedPeriod === 'custom') {
          params.startDate = this.customStartDate;
          params.endDate = this.customEndDate;
        }
        
        // Simular datos de historial de conexión (reemplazar con llamada real a la API)
        this.connectionHistory = this.generateMockHistory();
        
        this.calculateStats();
        this.analyzePatterns();
        this.filterHistory();
        
        if (this.viewMode === 'chart') {
          this.$nextTick(() => {
            this.createUptimeChart();
          });
        }
      } catch (error) {
        console.error('Error cargando historial:', error);
        this.error = 'Error cargando historial de conexiones.';
      }
    },
    
    generateMockHistory() {
      // Generar datos de ejemplo para demostración
      const history = [];
      const now = new Date();
      const days = this.selectedPeriod === '24h' ? 1 : this.selectedPeriod === '7d' ? 7 : 30;
      
      for (let i = 0; i < days * 24; i++) {
        const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
        const status = Math.random() > 0.1 ? 'online' : Math.random() > 0.5 ? 'offline' : 'warning';
        
        history.push({
          id: i,
          timestamp,
          status,
          duration: Math.floor(Math.random() * 3600),
          reason: status === 'offline' ? this.getRandomReason() : null,
          description: status === 'offline' ? 'Pérdida de conectividad detectada' : 'Funcionamiento normal',
          metrics: {
            latency: Math.floor(Math.random() * 100) + 10,
            packetLoss: Math.random() * 5,
            signalStrength: -Math.floor(Math.random() * 50) - 30
          }
        });
      }
      
      return history.sort((a, b) => b.timestamp - a.timestamp);
    },
    
    getRandomReason() {
      const reasons = [
        'Falla de energía',
        'Pérdida de señal',
        'Reinicio del dispositivo',
        'Mantenimiento programado',
        'Configuración incorrecta',
        'Interferencia',
        'Problema de hardware',
        'Actualización de firmware'
      ];
      return reasons[Math.floor(Math.random() * reasons.length)];
    },
    
    calculateStats() {
      const totalEvents = this.connectionHistory.length;
      if (totalEvents === 0) {
        this.connectionStats = {};
        return;
      }
      
      const onlineEvents = this.connectionHistory.filter(e => e.status === 'online');
      const offlineEvents = this.connectionHistory.filter(e => e.status === 'offline');
      
      const uptimePercentage = Math.round((onlineEvents.length / totalEvents) * 100);
      const totalDisconnections = offlineEvents.length;
      
      const durations = onlineEvents.map(e => e.duration).filter(d => d > 0);
      const averageUptime = durations.length > 0 
        ? this.formatDuration(durations.reduce((a, b) => a + b, 0) / durations.length)
        : '0m';
      
      const longestUptime = durations.length > 0 
        ? this.formatDuration(Math.max(...durations))
        : '0m';
      
      this.connectionStats = {
        uptimePercentage,
        totalDisconnections,
        averageUptime,
        longestUptime
      };
    },
    
    analyzePatterns() {
      // Análisis por hora del día
      const hourlyStats = new Array(24).fill(0);
      this.connectionHistory.forEach(event => {
        if (event.status === 'offline') {
          const hour = event.timestamp.getHours();
          hourlyStats[hour]++;
        }
      });
      
      const maxHourly = Math.max(...hourlyStats);
      this.hourlyPattern = hourlyStats.map((count, hour) => ({
        hour,
        disconnections: count,
        percentage: maxHourly > 0 ? (count / maxHourly) * 100 : 0
      }));
      
      // Análisis por día de la semana
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dailyStats = new Array(7).fill(0);
      this.connectionHistory.forEach(event => {
        if (event.status === 'offline') {
          const day = event.timestamp.getDay();
          dailyStats[day]++;
        }
      });
      
      const maxDaily = Math.max(...dailyStats);
      this.dailyPattern = dailyStats.map((count, day) => ({
        day,
        name: dayNames[day],
        disconnections: count,
        percentage: maxDaily > 0 ? (count / maxDaily) * 100 : 0
      }));
      
      // Top motivos de desconexión
      const reasonCounts = {};
      this.connectionHistory.forEach(event => {
        if (event.reason) {
          reasonCounts[event.reason] = (reasonCounts[event.reason] || 0) + 1;
        }
      });
      
      this.topReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    
    filterHistory() {
      let filtered = [...this.connectionHistory];
      
      // Filtrar por estado
      if (this.selectedStatus) {
        filtered = filtered.filter(event => event.status === this.selectedStatus);
      }
      
      // Filtrar por búsqueda
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(event => 
          (event.reason && event.reason.toLowerCase().includes(query)) ||
          (event.description && event.description.toLowerCase().includes(query)) ||
          this.getStatusText(event.status).toLowerCase().includes(query)
        );
      }
      
      this.filteredHistory = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
      this.currentPage = 1;
    },
    
    sortBy(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortField = field;
        this.sortDirection = 'desc';
      }
      
      this.filteredHistory.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];
        
        if (field === 'timestamp') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        if (this.sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    },
    
    changePage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    },
    
    createUptimeChart() {
      const ctx = this.$refs.uptimeChart;
      if (!ctx) return;
      
      if (this.uptimeChart) {
        this.uptimeChart.destroy();
      }
      
      const data = this.connectionHistory.slice(-48).reverse();
      
      this.uptimeChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => this.formatTime(d.timestamp)),
          datasets: [{
            label: 'Estado de Conexión',
            data: data.map(d => d.status === 'online' ? 1 : d.status === 'warning' ? 0.5 : 0),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.1,
            pointBackgroundColor: data.map(d => 
              d.status === 'online' ? '#28a745' : 
              d.status === 'warning' ? '#ffc107' : '#dc3545'
            ),
            pointBorderColor: '#fff',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 1,
              ticks: {
                callback: function(value) {
                  return value === 1 ? 'Conectado' : value === 0.5 ? 'Alerta' : 'Desconectado';
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const event = data[context.dataIndex];
                  return `${event.status === 'online' ? 'Conectado' : 
                          event.status === 'warning' ? 'Con alertas' : 'Desconectado'}`;
                }
              }
            }
          }
        }
      });
    },
    
    showEventDetails(event) {
      this.selectedEvent = event;
      this.showDetailsModal = true;
    },
    
    closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedEvent = null;
    },
    
    exportHistory() {
      this.showExportModal = true;
    },
    
    closeExportModal() {
      this.showExportModal = false;
    },
    
    async performExport() {
      this.exporting = true;
      try {
      // eslint-disable-next-line no-unused-vars
        const params = {
          deviceId: this.device.id,
          format: this.exportFormat,
          period: this.exportPeriod,
          ...this.exportOptions
        };
        
        // Simular exportación (reemplazar con llamada real a la API)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Crear archivo de ejemplo
        const filename = `connection-history-${this.device.name}-${Date.now()}.${this.exportFormat}`;
        const content = this.generateExportContent();
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        this.closeExportModal();
      } catch (error) {
        console.error('Error exportando historial:', error);
        alert('Error al exportar historial');
      } finally {
        this.exporting = false;
      }
    },
    
    generateExportContent() {
      if (this.exportFormat === 'csv') {
        let csv = 'Fecha/Hora,Estado,Duración,Motivo,Latencia,Pérdida de Paquetes,Señal\n';
        this.filteredHistory.forEach(event => {
          csv += `${this.formatDate(event.timestamp)},${this.getStatusText(event.status)},${this.formatDuration(event.duration)},${event.reason || ''},${event.metrics?.latency || ''}ms,${event.metrics?.packetLoss || ''}%,${event.metrics?.signalStrength || ''}dBm\n`;
        });
        return csv;
      }
      
      if (this.exportFormat === 'json') {
        return JSON.stringify({
          device: {
            name: this.device.name,
            brand: this.device.brand,
            type: this.device.type,
            ip: this.device.ipAddress
          },
          stats: this.connectionStats,
          history: this.filteredHistory,
          ...(this.exportOptions.includePatterns && {
            patterns: {
              hourly: this.hourlyPattern,
              daily: this.dailyPattern,
              topReasons: this.topReasons
            }
          })
        }, null, 2);
      }
      
      return 'Exportación generada exitosamente';
    },
    
    async refreshHistory() {
      await this.loadHistory();
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
        online: 'Conectado',
        offline: 'Desconectado',
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
    
    formatDuration(seconds) {
      if (!seconds || seconds === 0) return '-';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    },
    
    goBack() {
      this.$router.push(`/devices/${this.device.id}`);
    }
  }
};
</script>

<style scoped>
.connection-history {
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

.history-content {
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
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  font-size: 1.5em;
}

.status-info {
  text-align: right;
}

.current-status {
  font-weight: 500;
  color: #333;
}

.last-seen {
  font-size: 0.8em;
  color: #666;
}

.connection-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  font-size: 2rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 0.9em;
  color: #666;
}

.history-controls {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.filters {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: #666;
}

.filter-group select,
.filter-group input {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 120px;
}

.view-options {
  display: flex;
  gap: 5px;
}

.view-btn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.view-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* Timeline View */
.timeline-view {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline-container {
  position: relative;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e0e0e0;
}

.timeline-item {
  display: flex;
  margin-bottom: 20px;
  position: relative;
}

.timeline-marker {
  position: relative;
  margin-right: 20px;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  position: relative;
  z-index: 1;
}

.timeline-dot.online {
  background: #28a745;
}

.timeline-dot.offline {
  background: #dc3545;
}

.timeline-dot.warning {
  background: #ffc107;
}

.timeline-dot.maintenance {
  background: #6c757d;
}

.timeline-content {
  flex: 1;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
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

.status-badge.maintenance {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.small {
  padding: 2px 6px;
  font-size: 0.7em;
}

.event-time {
  font-size: 0.9em;
  color: #666;
}

.event-details {
  font-size: 0.9em;
  color: #666;
}

.event-duration,
.event-reason,
.event-description {
  margin-bottom: 5px;
}

.event-metrics {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.metric-chip {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
}

.no-events {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

/* Table View */
.table-view {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-wrapper {
  overflow-x: auto;
  margin-bottom: 20px;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.history-table th {
  background-color: #f8f9fa;
  font-weight: 500;
}

.history-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.history-table th.sortable:hover {
  background-color: #e9ecef;
}

.history-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.table-metrics {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.metric-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 1px 4px;
  border-radius: 2px;
  font-size: 0.7em;
}

.detail-btn {
  padding: 4px 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
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

/* Chart View */
.chart-view {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container {
  position: relative;
  height: 400px;
  margin-bottom: 20px;
}

.uptime-chart {
  width: 100% !important;
  height: 100% !important;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-color.online {
  background: #28a745;
}

.legend-color.offline {
  background: #dc3545;
}

.legend-color.warning {
  background: #ffc107;
}

.legend-color.maintenance {
  background: #6c757d;
}

/* Pattern Analysis */
.pattern-analysis {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pattern-analysis h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.pattern-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.pattern-card {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
}

.pattern-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.hourly-pattern {
  display: flex;
  align-items: end;
  gap: 2px;
  height: 100px;
  margin-bottom: 10px;
}

.hour-bar {
  flex: 1;
  background: #007bff;
  min-height: 2px;
  position: relative;
  cursor: pointer;
}

.hour-label {
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7em;
  color: #666;
}

.daily-pattern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.day-name {
  width: 80px;
  font-size: 0.9em;
  color: #666;
}

.day-bar {
  flex: 1;
  height: 20px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.day-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}

.day-value {
  width: 30px;
  text-align: right;
  font-size: 0.9em;
  color: #333;
}

.reasons-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reason-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.reason-text {
  flex: 1;
  font-size: 0.9em;
  color: #333;
}

.reason-count {
  background: #007bff;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.8em;
}

/* Modales */
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
  width: 600px;
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

.event-details-modal {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-label {
  font-weight: 500;
  color: #666;
}

.metrics-section,
.related-events {
  margin-top: 20px;
}

.metrics-section h4,
.related-events h4 {
  margin-bottom: 10px;
  color: #333;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.metric-label {
  font-size: 0.9em;
  color: #666;
}

.metric-value {
  font-weight: 500;
  color: #333;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9em;
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

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
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
  .connection-history {
    padding: 10px;
  }
  
  .history-controls {
    flex-direction: column;
  }
  
  .filters {
    flex-direction: column;
    gap: 10px;
  }
  
  .connection-stats {
    grid-template-columns: 1fr 1fr;
  }
  
  .pattern-cards {
    grid-template-columns: 1fr;
  }
  
  .timeline-container::before {
    left: 10px;
  }
  
  .device-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .modal-content {
    width: 95%;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .connection-stats {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .timeline-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .timeline-marker {
    margin-bottom: 10px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .hourly-pattern {
    height: 60px;
  }
}
</style>