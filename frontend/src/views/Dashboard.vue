<template>
  <div class="dashboard">
    <!-- Welcome Header -->
    <div class="welcome-header">
      <h1>Bienvenido <span class="user-role">{{ currentUser?.fullName || 'Administrador principal' }}</span></h1>
    </div>

    <!-- Stats Cards Grid -->
    <div class="stats-grid">
      <!-- Clientes Online -->
      <div class="stat-card clients-online">
        <div class="card-header">
          <span class="card-title">CLIENTES ONLINE</span>
        </div>
        <div class="card-content">
          <div class="main-number">{{ stats.clientsOnline }}</div>
          <div class="sub-info">Total Registrados {{ stats.totalClients }}</div>
          <button class="action-btn" @click="$router.push('/clients')">Ver clientes →</button>
        </div>
      </div>

      <!-- Transacciones Hoy -->
      <div class="stat-card transactions">
        <div class="card-header">
          <span class="card-title">TRANSACCIONES HOY</span>
        </div>
        <div class="card-content">
          <div class="main-number">{{ formatCurrency(stats.todayTransactions) }}</div>
          <div class="sub-info">Cobrado este mes {{ formatCurrency(stats.monthlyCollected) }}</div>
          <button class="action-btn" @click="$router.push('/billing')">Ver transacciones →</button>
        </div>
      </div>

      <!-- Facturas No Pagadas -->
      <div class="stat-card unpaid-invoices">
        <div class="card-header">
          <span class="card-title">FACTURAS NO PAGADAS</span>
        </div>
        <div class="card-content">
          <div class="main-number">{{ stats.unpaidInvoices }}</div>
          <div class="sub-info">Total vencidas {{ stats.overdueInvoices }}</div>
          <button class="action-btn" @click="$router.push('/billing')">Ver Facturas →</button>
        </div>
      </div>

      <!-- Tickets Soporte -->
      <div class="stat-card support-tickets">
        <div class="card-header">
          <span class="card-title">TICKET SOPORTE</span>
        </div>
        <div class="card-content">
          <div class="main-number">{{ stats.supportTickets }}</div>
          <div class="sub-info">Total Abiertos {{ stats.openTickets }}</div>
          <button class="action-btn" @click="$router.push('/tickets')">Ver Tickets →</button>
        </div>
      </div>
    </div>

    <!-- Lower Section Grid -->
    <div class="lower-grid">
      <!-- Traffic Chart -->
      <div class="chart-section traffic-chart">
        <div class="section-header">
          <h3>Tráfico Clientes</h3>
          <span class="period">Últimos 7 días</span>
        </div>
        <div class="chart-container">
          <div class="traffic-summary">
            <div class="total-traffic">
              <span class="traffic-amount">{{ stats.totalTraffic }} GB</span>
              <span class="traffic-label">Total tráfico</span>
            </div>
            <div class="traffic-chart-visual">
              <canvas ref="trafficChart" width="300" height="200"></canvas>
            </div>
            <div class="usage-indicator">
              <div class="usage-circle">
                <span class="usage-percentage">{{ stats.usagePercentage }}%</span>
                <span class="usage-label">DESCARGA</span>
              </div>
            </div>
          </div>
          <div class="traffic-legend">
            <div class="legend-item download">
              <span class="legend-dot"></span>
              <span>{{ stats.downloadTraffic }} GB Descarga</span>
            </div>
            <div class="legend-item upload">
              <span class="legend-dot"></span>
              <span>{{ stats.uploadTraffic }} GB Subida</span>
            </div>
          </div>
        </div>
      </div>

      <!-- System Summary -->
      <div class="system-summary">
        <div class="section-header">
          <h3>Resumen del sistema</h3>
        </div>
        <div class="summary-items">
          <div class="summary-item">
            <span class="summary-number active">{{ stats.routersActive }}</span>
            <span class="summary-label">Routers Activos</span>
            <span class="summary-badge active">{{ stats.routersActive }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number disconnected">{{ stats.routersDisconnected }}</span>
            <span class="summary-label">Routers desconectados</span>
            <span class="summary-badge disconnected">{{ stats.routersDisconnected }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number active">{{ stats.activeClients }}</span>
            <span class="summary-label">Clientes Activos</span>
            <span class="summary-badge active">{{ stats.activeClients }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number suspended">{{ stats.suspendedClients }}</span>
            <span class="summary-label">Clientes suspendidos</span>
            <span class="summary-badge suspended">{{ stats.suspendedClients }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number active">{{ stats.activeServices }}</span>
            <span class="summary-label">Servicios Activos</span>
            <span class="summary-badge active">{{ stats.activeServices }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number active">{{ stats.activeMonitoring }}</span>
            <span class="summary-label">Monitoreo Activos</span>
            <span class="summary-badge active">{{ stats.activeMonitoring }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-number down">{{ stats.downMonitoring }}</span>
            <span class="summary-label">Monitoreo Caídos</span>
            <span class="summary-badge down">{{ stats.downMonitoring }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Section Grid -->
    <div class="bottom-grid">
      <!-- Recent Payments -->
      <div class="recent-payments">
        <div class="section-header">
          <h3>Últimos pagos registrados</h3>
        </div>
        <div class="payments-table" v-if="!loadingPayments">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Cobrado</th>
                <th>Operador</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in recentPayments.slice(0, 10)" :key="payment.id">
                <td>{{ payment.clientName || payment.client?.firstName + ' ' + payment.client?.lastName }}</td>
                <td>{{ formatCurrency(payment.monthly_fee || payment.amount || 0) }}</td>
                <td>{{ payment.operator || 'sistema' }}</td>
                <td>{{ getRelativeTime(payment.last_payment_date || payment.updated_at) }}</td>
              </tr>
              <tr v-if="recentPayments.length === 0">
                <td colspan="4" class="no-data">No hay pagos recientes</td>
              </tr>
            </tbody>
          </table>
          <div class="table-footer">
            <button class="see-all-btn" @click="$router.push('/billing')">Ver todos →</button>
          </div>
        </div>
        <div v-else class="loading-content">
          <p>Cargando pagos...</p>
        </div>
      </div>

      <!-- Connected Clients -->
      <div class="connected-clients">
        <div class="section-header">
          <h3>Últimos conectados</h3>
        </div>
        <div class="connected-content">
          <div class="connected-list" v-if="!loadingClients">
            <div v-for="client in connectedClients.slice(0, 5)" :key="client.id" class="connected-item">
              <div class="client-info">
                <span class="client-name">{{ client.firstName }} {{ client.lastName }}</span>
                <span class="client-time">{{ getRelativeTime(client.updated_at) }}</span>
              </div>
              <span class="status-indicator online"></span>
            </div>
            <div v-if="connectedClients.length === 0" class="no-data">
              No hay clientes conectados recientemente
            </div>
          </div>
          <div v-else class="loading-content">
            <p>Cargando clientes...</p>
          </div>
          <div class="see-all-section">
            <button class="see-all-btn" @click="$router.push('/clients')">Ver todos →</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Server Data Section -->
    <div class="server-section">
      <div class="server-data">
        <div class="section-header">
          <h3>DATOS DEL SERVIDOR</h3>
        </div>
        <div class="server-stats">
          <div class="server-stat">
            <div class="stat-icon cpu">💻</div>
            <span class="stat-label">CPU Cores</span>
            <span class="stat-value">{{ serverData.cpu?.cores || 1 }}</span>
          </div>
          <div class="server-usage">
            <div class="usage-item">
              <span class="usage-label">Uso de CPU</span>
              <div class="usage-bar">
                <div class="usage-fill cpu-usage" :style="{ width: (serverData.cpu?.usage || 37.5) + '%' }"></div>
              </div>
              <span class="usage-text">{{ (serverData.cpu?.usage || 37.5).toFixed(1) }}%</span>
            </div>
            <div class="usage-item">
              <span class="usage-label">Mem.: {{ Math.round((serverData.memory?.total || 1024)/1024) }} GB (Libre {{ ((serverData.memory?.free || 525)/(serverData.memory?.total || 1024)*100).toFixed(1) }}%)</span>
              <div class="usage-bar">
                <div class="usage-fill memory-used" :style="{ width: ((serverData.memory?.used || 499)/(serverData.memory?.total || 1024)*100) + '%' }"></div>
                <div class="usage-fill memory-free" :style="{ width: ((serverData.memory?.free || 525)/(serverData.memory?.total || 1024)*100) + '%' }"></div>
              </div>
            </div>
            <div class="usage-item">
              <span class="usage-label">Disco: {{ Math.round((serverData.disk?.total || 32768)/1024) }} GB (Libre {{ ((serverData.disk?.free || 22668)/(serverData.disk?.total || 32768)*100).toFixed(1) }}%)</span>
              <div class="usage-bar">
                <div class="usage-fill disk-used" :style="{ width: ((serverData.disk?.used || 10100)/(serverData.disk?.total || 32768)*100) + '%' }"></div>
                <div class="usage-fill disk-free" :style="{ width: ((serverData.disk?.free || 22668)/(serverData.disk?.total || 32768)*100) + '%' }"></div>
              </div>
            </div>
            <div class="usage-item backup">
              <span class="backup-icon">💾</span>
              <span class="backup-label">Última copia de seguridad</span>
              <span class="backup-time">{{ getRelativeTime(serverData.lastBackup) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Billing Summary -->
      <div class="billing-summary">
        <div class="section-header">
          <h3>Resumen Facturación</h3>
        </div>
        <div class="billing-content">
          <div class="billing-tab active">
            <span>Mes actual</span>
          </div>
          <div class="billing-stats">
            <div class="billing-row">
              <span>Pagos</span>
              <span>{{ billingSummary.payments }} ({{ formatCurrency(billingSummary.paymentsAmount) }})</span>
            </div>
            <div class="billing-row">
              <span>Facturas pagadas</span>
              <span>{{ billingSummary.paidInvoices }} ({{ formatCurrency(billingSummary.paidAmount) }})</span>
            </div>
            <div class="billing-row">
              <span>Facturas sin Pagar</span>
              <span>{{ billingSummary.unpaidInvoices }} ({{ formatCurrency(billingSummary.unpaidAmount) }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Devices Section -->
    <div class="devices-section">
      <div class="section-header">
        <h3>Emisores</h3>
      </div>
      <div class="devices-table-container" v-if="!loadingDevices">
        <div class="devices-controls">
          <select class="devices-per-page" v-model="devicesPerPage" @change="loadDevices">
            <option value="15">15</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <input type="search" placeholder="Buscar..." class="devices-search" v-model="deviceSearch" @input="filterDevices">
        </div>
        <table class="devices-table">
          <thead>
            <tr>
              <th>NOMBRE</th>
              <th>EQUIPO</th>
              <th>IP</th>
              <th>ESTADO</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="device in filteredDevices" :key="device.id">
              <td>{{ device.name || 'Sin nombre' }}</td>
              <td>{{ device.model || device.brand || 'Sin especificar' }}</td>
              <td>{{ device.ipAddress || 'N/A' }}</td>
              <td>
                <span class="status-badge" :class="getDeviceStatusClass(device.status)">
                  {{ getDeviceStatusText(device.status) }}
                </span>
              </td>
              <td>
                <div class="signal-bars" :class="'signal-' + getSignalLevel(device)">
                  <span class="signal-icon">📶</span>
                </div>
              </td>
            </tr>
            <tr v-if="filteredDevices.length === 0">
              <td colspan="5" class="no-data">No hay dispositivos disponibles</td>
            </tr>
          </tbody>
        </table>
        <div class="table-pagination">
          <span>Mostrando {{ Math.min(filteredDevices.length, devicesPerPage) }} de {{ devices.length }} dispositivos</span>
          <div class="pagination-controls">
            <button class="page-btn" :disabled="currentDevicePage === 1" @click="prevDevicePage">←</button>
            <button class="page-btn active">{{ currentDevicePage }}</button>
            <button class="page-btn" :disabled="filteredDevices.length <= devicesPerPage" @click="nextDevicePage">→</button>
          </div>
        </div>
      </div>
      <div v-else class="loading-content">
        <p>Cargando dispositivos...</p>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Cargando datos del dashboard...</p>
      </div>
    </div>
  </div>
</template>

<script>
import DashboardService from '../services/dashboard.service.js';

export default {
  name: 'Dashboard',
  data() {
    return {
      loading: true,
      loadingPayments: true,
      loadingClients: true,
      loadingDevices: true,
      stats: {
        clientsOnline: 0,
        totalClients: 0,
        todayTransactions: 0,
        monthlyCollected: 0,
        unpaidInvoices: 0,
        overdueInvoices: 0,
        supportTickets: 0,
        openTickets: 0,
        totalTraffic: '0',
        usagePercentage: 0,
        downloadTraffic: '0',
        uploadTraffic: '0',
        routersActive: 0,
        routersDisconnected: 0,
        activeClients: 0,
        suspendedClients: 0,
        activeServices: 0,
        activeMonitoring: 0,
        downMonitoring: 0
      },
      serverData: {
        cpu: { cores: 1, usage: 0 },
        memory: { total: 1024, used: 0, free: 1024 },
        disk: { total: 32768, used: 0, free: 32768 },
        lastBackup: new Date().toISOString()
      },
      billingSummary: {
        payments: 0,
        paymentsAmount: 0,
        paidInvoices: 0,
        paidAmount: 0,
        unpaidInvoices: 0,
        unpaidAmount: 0
      },
      recentPayments: [],
      connectedClients: [],
      devices: [],
      filteredDevices: [],
      deviceSearch: '',
      devicesPerPage: 15,
      currentDevicePage: 1
    };
  },
  computed: {
    currentUser() {
      return this.$store.state.auth?.user;
    }
  },
  async mounted() {
    await this.loadDashboardData();
    this.initializeTrafficChart();
    
    // Refrescar datos cada 5 minutos
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 5 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async loadDashboardData() {
      try {
        this.loading = true;
        
        // Cargar estadísticas principales
        const stats = await DashboardService.getDashboardStats();
        this.stats = stats;
        
        // Cargar datos específicos
        await Promise.all([
          this.loadRecentPayments(),
          this.loadConnectedClients(),
          this.loadDevices(),
          this.loadServerData()
        ]);
        
        this.calculateBillingSummary();
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        this.$store.dispatch('notifications/show', {
          type: 'error',
          message: 'Error cargando datos del dashboard'
        });
      } finally {
        this.loading = false;
      }
    },

    async loadRecentPayments() {
      try {
        this.loadingPayments = true;
        const response = await DashboardService.getRecentPayments();
        this.recentPayments = response.data || [];
      } catch (error) {
        console.error('Error loading recent payments:', error);
        this.recentPayments = [];
      } finally {
        this.loadingPayments = false;
      }
    },

    async loadConnectedClients() {
      try {
        this.loadingClients = true;
        const response = await DashboardService.getConnectedClients();
        this.connectedClients = response.clients || response.data || [];
      } catch (error) {
        console.error('Error loading connected clients:', error);
        this.connectedClients = [];
      } finally {
        this.loadingClients = false;
      }
    },

    async loadDevices() {
      try {
        this.loadingDevices = true;
        const response = await DashboardService.getNetworkDevices();
        this.devices = response.devices || response.data || [];
        this.filterDevices();
      } catch (error) {
        console.error('Error loading devices:', error);
        this.devices = [];
      } finally {
        this.loadingDevices = false;
      }
    },

    async loadServerData() {
      try {
        const data = await DashboardService.getServerMetrics();
        if (data) {
          this.serverData = data;
        }
      } catch (error) {
        console.error('Error loading server data:', error);
      }
    },

    calculateBillingSummary() {
      // Calcular resumen de facturación basado en datos reales
      const activeBilling = this.recentPayments.filter(p => p.client_status === 'active');
      const suspendedBilling = this.recentPayments.filter(p => p.client_status === 'suspended');
      
      this.billingSummary = {
        payments: activeBilling.length,
        paymentsAmount: activeBilling.reduce((sum, p) => sum + (parseFloat(p.monthly_fee) || 0), 0),
        paidInvoices: activeBilling.length,
        paidAmount: activeBilling.reduce((sum, p) => sum + (parseFloat(p.monthly_fee) || 0), 0),
        unpaidInvoices: suspendedBilling.length,
        unpaidAmount: suspendedBilling.reduce((sum, p) => sum + (parseFloat(p.monthly_fee) || 0), 0)
      };
    },

    filterDevices() {
      if (!this.deviceSearch.trim()) {
        this.filteredDevices = this.devices.slice(0, this.devicesPerPage);
      } else {
        const search = this.deviceSearch.toLowerCase();
        const filtered = this.devices.filter(device => 
          (device.name || '').toLowerCase().includes(search) ||
          (device.model || '').toLowerCase().includes(search) ||
          (device.brand || '').toLowerCase().includes(search) ||
          (device.ipAddress || '').toLowerCase().includes(search)
        );
        this.filteredDevices = filtered.slice(0, this.devicesPerPage);
      }
    },

    getDeviceStatusClass(status) {
      const statusMap = {
        'online': 'online',
        'offline': 'offline',
        'maintenance': 'maintenance',
        'unknown': 'unknown'
      };
      return statusMap[status?.toLowerCase()] || 'unknown';
    },

    getDeviceStatusText(status) {
      const statusMap = {
        'online': 'EN LÍNEA',
        'offline': 'DESCONECTADO',
        'maintenance': 'MANTENIMIENTO',
        'unknown': 'DESCONOCIDO'
      };
      return statusMap[status?.toLowerCase()] || 'DESCONOCIDO';
    },

    getSignalLevel(device) {
      // Simular nivel de señal basado en estado y métricas
      if (device.status === 'online') {
        return Math.floor(Math.random() * 3) + 1; // 1-3
      }
      return 0;
    },

    prevDevicePage() {
      if (this.currentDevicePage > 1) {
        this.currentDevicePage--;
        this.filterDevices();
      }
    },

    nextDevicePage() {
      const totalPages = Math.ceil(this.devices.length / this.devicesPerPage);
      if (this.currentDevicePage < totalPages) {
        this.currentDevicePage++;
        this.filterDevices();
      }
    },

    formatCurrency(amount) {
      return DashboardService.formatCurrency(amount);
    },

    formatNumber(number, options = {}) {
      return DashboardService.formatNumber(number, options);
    },

    getRelativeTime(date) {
      return DashboardService.getRelativeTime(date);
    },

    initializeTrafficChart() {
      // Inicializar gráfico de tráfico
      const canvas = this.$refs.trafficChart;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // Datos de ejemplo para el gráfico de líneas (últimos 7 días)
      const downloadData = [180, 160, 220, 190, 240, 200, 190];
      const uploadData = [120, 110, 150, 130, 160, 140, 130];
      const dates = ['24/05', '26/05', '28/05', '29/05', '30/05'];
      
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const margin = 40;
      const chartWidth = canvas.width - (margin * 2);
      const chartHeight = canvas.height - (margin * 2);
      const maxValue = Math.max(...downloadData, ...uploadData);
      const stepX = chartWidth / (downloadData.length - 1);
      
      // Dibujar grid de fondo
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      
      // Líneas horizontales
      for (let i = 0; i <= 4; i++) {
        const y = margin + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(canvas.width - margin, y);
        ctx.stroke();
      }
      
      // Líneas verticales
      for (let i = 0; i < downloadData.length; i++) {
        const x = margin + stepX * i;
        ctx.beginPath();
        ctx.moveTo(x, margin);
        ctx.lineTo(x, canvas.height - margin);
        ctx.stroke();
      }
      
      // Dibujar línea de descarga
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      downloadData.forEach((value, index) => {
        const x = margin + stepX * index;
        const y = margin + chartHeight - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Dibujar punto
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.stroke();
      
      // Dibujar línea de subida
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      uploadData.forEach((value, index) => {
        const x = margin + stepX * index;
        const y = margin + chartHeight - (value / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Dibujar punto
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.stroke();
      
      // Etiquetas de valores en Y
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      
      for (let i = 0; i <= 4; i++) {
        const value = (maxValue / 4) * (4 - i);
        const y = margin + (chartHeight / 4) * i + 4;
        ctx.fillText(`${Math.round(value)} GB`, margin - 10, y);
      }
      
      // Etiquetas de fechas en X
      ctx.textAlign = 'center';
      dates.forEach((date, index) => {
        const x = margin + stepX * index;
        ctx.fillText(date, x, canvas.height - 10);
      });
    }
  }
};
</script>

<style scoped>
.dashboard {
  padding: 0;
  background-color: #f5f7fa;
  min-height: 100vh;
}

/* Welcome Header */
.welcome-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  margin-bottom: 25px;
}

.welcome-header h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 300;
}

.user-role {
  font-size: 0.9rem;
  opacity: 0.8;
  font-weight: 400;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  padding: 0 30px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.card-header {
  padding: 15px 20px 0;
  border-bottom: none;
}

.card-title {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #64748b;
}

.card-content {
  padding: 10px 20px 20px;
}

.main-number {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 10px 0 5px;
  color: #1e293b;
}

.sub-info {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 15px;
}

.action-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 5px 0;
  text-decoration: none;
  transition: color 0.2s;
}

.action-btn:hover {
  color: #2563eb;
  text-decoration: underline;
}

/* Specific card colors */
.clients-online {
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
}

.clients-online .card-title,
.clients-online .main-number,
.clients-online .sub-info,
.clients-online .action-btn {
  color: white !important;
}

.transactions {
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
}

.transactions .card-title,
.transactions .main-number,
.transactions .sub-info,
.transactions .action-btn {
  color: white !important;
}

.unpaid-invoices {
  background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
}

.unpaid-invoices .card-title,
.unpaid-invoices .main-number,
.unpaid-invoices .sub-info,
.unpaid-invoices .action-btn {
  color: white !important;
}

.support-tickets {
  background: linear-gradient(135deg, #374151 0%, #6b7280 100%);
}

.support-tickets .card-title,
.support-tickets .main-number,
.support-tickets .sub-info,
.support-tickets .action-btn {
  color: white !important;
}

/* Lower Grid */
.lower-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  padding: 0 30px;
  margin-bottom: 30px;
}

.chart-section, .system-summary {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
  font-weight: 600;
}

.period {
  font-size: 0.8rem;
  color: #64748b;
}

/* Traffic Chart */
.traffic-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.total-traffic {
  display: flex;
  flex-direction: column;
  min-width: 120px;
}

.traffic-amount {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.traffic-label {
  font-size: 0.85rem;
  color: #64748b;
}

.traffic-chart-visual {
  flex: 1;
}

.usage-indicator {
  display: flex;
  align-items: center;
}

.usage-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: conic-gradient(#3b82f6 0deg, #3b82f6 309deg, #e2e8f0 309deg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.usage-circle::before {
  content: '';
  position: absolute;
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 50%;
}

.usage-percentage {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  z-index: 1;
}

.usage-label {
  font-size: 0.7rem;
  color: #64748b;
  z-index: 1;
}

.traffic-legend {
  display: flex;
  gap: 20px;
  margin-top: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-item.download .legend-dot {
  background-color: #3b82f6;
}

.legend-item.upload .legend-dot {
  background-color: #10b981;
}

/* System Summary */
.summary-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-number {
  font-size: 1rem;
  font-weight: 600;
  min-width: 20px;
}

.summary-label {
  font-size: 0.9rem;
  color: #64748b;
  flex: 1;
  margin-left: 10px;
}

.summary-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 24px;
  text-align: center;
}

.summary-badge.active {
  background-color: #dcfce7;
  color: #16a34a;
}

.summary-badge.disconnected {
  background-color: #fee2e2;
  color: #dc2626;
}

.summary-badge.suspended {
  background-color: #fef3c7;
  color: #d97706;
}

.summary-badge.down {
  background-color: #e0e7ff;
  color: #6366f1;
}

/* Bottom Grid */
.bottom-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  padding: 0 30px;
  margin-bottom: 30px;
}

.recent-payments, .connected-clients {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

/* Payments Table */
.payments-table table {
  width: 100%;
  border-collapse: collapse;
}

.payments-table th {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.payments-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.payments-table tr:hover td {
  background-color: #f8fafc;
}

.table-footer {
  text-align: right;
  margin-top: 15px;
}

.see-all-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 5px 0;
  transition: color 0.2s;
}

.see-all-btn:hover {
  color: #2563eb;
  text-decoration: underline;
}

/* Connected Clients */
.connected-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 15px;
}

.connected-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.connected-item:last-child {
  border-bottom: none;
}

.client-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.client-name {
  font-weight: 500;
  color: #1e293b;
}

.client-time {
  font-size: 0.8rem;
  color: #64748b;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.online {
  background-color: #22c55e;
}

.see-all-section {
  text-align: right;
  margin-top: 15px;
}

/* Server Section */
.server-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 0 30px;
  margin-bottom: 30px;
}

.server-data, .billing-summary {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.server-stats {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.server-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 80px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
}

.server-usage {
  flex: 1;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.usage-item.backup {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.usage-label {
  font-size: 0.85rem;
  min-width: 200px;
  color: #64748b;
}

.usage-bar {
  flex: 1;
  height: 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}

.usage-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.cpu-usage {
  background-color: #f59e0b;
}

.memory-used {
  background-color: #ef4444;
}

.memory-free {
  background-color: #22c55e;
}

.disk-used {
  background-color: #8b5cf6;
}

.disk-free {
  background-color: #06b6d4;
}

.usage-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  min-width: 50px;
  text-align: right;
}

.backup-icon {
  font-size: 1.2rem;
}

.backup-label {
  font-size: 0.85rem;
  color: #64748b;
  flex: 1;
}

.backup-time {
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
}

/* Billing Summary */
.billing-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.billing-tab {
  background-color: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
}

.billing-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.billing-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.billing-row:last-child {
  border-bottom: none;
}

/* Devices Section */
.devices-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin: 0 30px 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.devices-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 15px;
}

.devices-per-page, .devices-search {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.devices-search {
  flex: 1;
  max-width: 300px;
}

.devices-table {
  width: 100%;
  border-collapse: collapse;
}

.devices-table th {
  text-align: left;
  padding: 12px;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.devices-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}

.devices-table tr:hover td {
  background-color: #f8fafc;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.online {
  background-color: #dcfce7;
  color: #16a34a;
}

.status-badge.offline {
  background-color: #fee2e2;
  color: #dc2626;
}

.status-badge.maintenance {
  background-color: #fef3c7;
  color: #d97706;
}

.status-badge.unknown {
  background-color: #f1f5f9;
  color: #6b7280;
}

.signal-bars {
  display: flex;
  align-items: center;
  justify-content: center;
}

.signal-icon {
  font-size: 1.2rem;
  opacity: 0.3;
}

.signal-1 .signal-icon {
  opacity: 0.4;
}

.signal-2 .signal-icon {
  opacity: 0.7;
}

.signal-3 .signal-icon {
  opacity: 1;
}

.table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e2e8f0;
  font-size: 0.9rem;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  gap: 5px;
}

.page-btn {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* Loading States */
.loading-content {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: #64748b;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 15px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-data {
  text-align: center;
  color: #64748b;
  font-style: italic;
  padding: 20px;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .lower-grid,
  .bottom-grid,
  .server-section {
    grid-template-columns: 1fr;
  }
  
  .traffic-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .usage-indicator {
    align-self: center;
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 0;
  }
  
  .welcome-header {
    padding: 15px 20px;
  }
  
  .welcome-header h1 {
    font-size: 1.5rem;
  }
  
  .stats-grid,
  .lower-grid,
  .bottom-grid,
  .server-section {
    padding: 0 20px;
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .devices-section {
    margin: 0 20px 20px;
    padding: 15px;
  }
  
  .devices-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .devices-search {
    max-width: none;
  }
  
  .devices-table {
    font-size: 0.8rem;
  }
  
  .devices-table th,
  .devices-table td {
    padding: 8px 4px;
  }
  
  .server-stats {
    flex-direction: column;
    gap: 15px;
  }
  
  .server-stat {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .usage-item {
    flex-direction: column;
    align-items: stretch;
    gap: 5px;
  }
  
  .usage-label {
    min-width: auto;
  }
  
  .table-pagination {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .welcome-header {
    padding: 10px 15px;
  }
  
  .stats-grid,
  .lower-grid,
  .bottom-grid,
  .server-section {
    padding: 0 15px;
  }
  
  .devices-section {
    margin: 0 15px 15px;
    padding: 10px;
  }
  
  .stat-card {
    margin-bottom: 10px;
  }
  
  .main-number {
    font-size: 2rem;
  }
  
  .traffic-amount {
    font-size: 1.5rem;
  }
  
  .devices-table th,
  .devices-table td {
    padding: 6px 2px;
    font-size: 0.75rem;
  }
  
  .payments-table th,
  .payments-table td {
    padding: 8px 4px;
    font-size: 0.8rem;
  }
}
</style>