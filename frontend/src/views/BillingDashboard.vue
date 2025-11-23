<template>
  <div class="billing-dashboard">
    <div class="header">
      <h2>Dashboard Financiero</h2>
      <div class="header-actions">
        <select v-model="selectedPeriod" @change="loadDashboardData" class="period-selector">
          <option value="30">Últimos 30 días</option>
          <option value="60">Últimos 60 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
        </select>
        <button @click="exportReport" class="export-btn">
          📊 Exportar Reporte
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando datos financieros...
    </div>

    <div v-else class="dashboard-content">
      <!-- Métricas principales -->
      <div class="metrics-grid">
        <div class="metric-card revenue">
          <div class="metric-icon">💰</div>
          <div class="metric-content">
            <h3>Ingresos del Período</h3>
            <div class="metric-value">${{ formatNumber(metrics.totalRevenue) }}</div>
            <div class="metric-change" :class="{ positive: metrics.revenueChange >= 0, negative: metrics.revenueChange < 0 }">
              {{ metrics.revenueChange >= 0 ? '+' : '' }}{{ metrics.revenueChange.toFixed(1) }}% vs período anterior
            </div>
          </div>
        </div>

        <div class="metric-card pending">
          <div class="metric-icon">⏳</div>
          <div class="metric-content">
            <h3>Facturas Pendientes</h3>
            <div class="metric-value">${{ formatNumber(metrics.pendingAmount) }}</div>
            <div class="metric-count">{{ metrics.pendingInvoices }} facturas</div>
          </div>
        </div>

        <div class="metric-card overdue">
          <div class="metric-icon">⚠️</div>
          <div class="metric-content">
            <h3>Facturas Vencidas</h3>
            <div class="metric-value">${{ formatNumber(metrics.overdueAmount) }}</div>
            <div class="metric-count">{{ metrics.overdueInvoices }} facturas</div>
          </div>
        </div>

        <div class="metric-card clients">
          <div class="metric-icon">👥</div>
          <div class="metric-content">
            <h3>Clientes Activos</h3>
            <div class="metric-value">{{ metrics.activeClients }}</div>
            <div class="metric-count">{{ metrics.totalClients }} total</div>
          </div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="charts-section">
        <div class="chart-container">
          <h3>Ingresos por Mes</h3>
          <div class="chart-placeholder" ref="revenueChart">
            <canvas id="revenueChart" width="400" height="200"></canvas>
          </div>
        </div>

        <div class="chart-container">
          <h3>Estados de Facturas</h3>
          <div class="chart-placeholder" ref="invoiceStatusChart">
            <canvas id="invoiceStatusChart" width="400" height="200"></canvas>
          </div>
        </div>
      </div>

      <!-- Tablas de resumen -->
      <div class="summary-tables">
        <div class="table-container">
          <h3>Facturas Vencidas Recientes</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Factura</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Días</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invoice in overdueInvoices" :key="invoice.id">
                <td>{{ invoice.clientName }}</td>
                <td>{{ invoice.invoiceNumber }}</td>
                <td>${{ formatNumber(invoice.totalAmount) }}</td>
                <td>{{ formatDate(invoice.dueDate) }}</td>
                <td class="overdue-days">{{ calculateOverdueDays(invoice.dueDate) }}</td>
                <td class="actions">
                  <button @click="viewInvoice(invoice.id)" class="action-btn view">Ver</button>
                  <button @click="sendReminder(invoice.id)" class="action-btn remind">Recordar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-container">
          <h3>Pagos Pendientes de Aprobación</h3>
          <table class="summary-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in pendingPayments" :key="payment.id">
                <td>{{ payment.clientName }}</td>
                <td>${{ formatNumber(payment.amount) }}</td>
                <td>{{ formatPaymentMethod(payment.paymentMethod) }}</td>
                <td>{{ formatDate(payment.paymentDate) }}</td>
                <td class="actions">
                  <button @click="viewPayment(payment.id)" class="action-btn view">Ver</button>
                  <button @click="approvePayment(payment.id)" class="action-btn approve">Aprobar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div class="actions-grid">
          <button @click="goToInvoices" class="quick-action-btn">
            <span class="icon">📄</span>
            <span class="text">Gestionar Facturas</span>
          </button>
          <button @click="goToPayments" class="quick-action-btn">
            <span class="icon">💳</span>
            <span class="text">Gestionar Pagos</span>
          </button>
          <button @click="processOverdue" class="quick-action-btn">
            <span class="icon">⚡</span>
            <span class="text">Procesar Vencidas</span>
          </button>
          <button @click="generateReports" class="quick-action-btn">
            <span class="icon">📊</span>
            <span class="text">Generar Reportes</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceService from '../services/invoice.service';
import PaymentService from '../services/payment.service';
import ClientService from '../services/client.service';
import Chart from 'chart.js/auto';

export default {
  name: 'BillingDashboard',
  data() {
    return {
      loading: true,
      selectedPeriod: '30',
      metrics: {
        totalRevenue: 0,
        revenueChange: 0,
        pendingAmount: 0,
        pendingInvoices: 0,
        overdueAmount: 0,
        overdueInvoices: 0,
        activeClients: 0,
        totalClients: 0
      },
      // Datos crudos para gráficos
      rawInvoices: [],
      rawPayments: [],
      
      overdueInvoices: [],
      pendingPayments: [],
      
      // Referencias a gráficos
      revenueChartInstance: null,
      statusChartInstance: null
    };
  },
  mounted() {
    this.loadDashboardData();
  },
  methods: {
  
    async loadDashboardData() {
      this.loading = true;
      try {
        // 1. Cargar todos los datos primero
        await this.loadMetrics();
        
        await Promise.all([
          this.loadOverdueInvoices(),
          this.loadPendingPayments()
        ]);
        
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        // 2. PRIMERO mostramos el HTML (quitamos el loading)
        this.loading = false;
        
        // 3. AHORA que el HTML existe, dibujamos los gráficos
        this.$nextTick(() => {
          this.initializeCharts();
        });
      }
    },


    async loadMetrics() {
      try {
        console.log('🔄 Cargando métricas del dashboard...');

        // 1. Usamos nombres distintos para la respuesta (Res) vs los datos procesados
        const [invoicesRes, paymentsRes, clientsRes] = await Promise.all([
          InvoiceService.getAllInvoices({ limit: 1000 }),
          PaymentService.getAllPayments({ limit: 1000 }),
          ClientService.getAllClients({ size: 1000 })
        ]);

        // 2. Extraer datos de la respuesta
        const invoicesData = this.extractApiData(invoicesRes);
        const paymentsData = this.extractApiData(paymentsRes);
        const clientsData = this.extractApiData(clientsRes);

        // 3. Asegurar que sean arrays (búsqueda profunda)
        const invoices = invoicesData.invoices || invoicesData.data || (Array.isArray(invoicesData) ? invoicesData : []);
        const payments = paymentsData.payments || paymentsData.data || (Array.isArray(paymentsData) ? paymentsData : []);
        const clients = clientsData.clients || clientsData.data || (Array.isArray(clientsData) ? clientsData : []);

        // 4. Guardar datos crudos para los gráficos
        this.rawInvoices = invoices;
        this.rawPayments = payments;

        console.log('📋 Datos procesados:', { 
          invoicesCount: invoices.length, 
          paymentsCount: payments.length, 
          clientsCount: clients.length 
        });

        // 5. Calcular estadísticas
        this.metrics = this.calculateStatistics(invoices, payments, clients);

      } catch (error) {
        console.error('❌ Error cargando métricas:', error);
        this.setDefaultMetrics();
      }
    },

    calculateStatistics(invoices, payments, clients) {
      const activeClients = clients.filter(c => c.active === true).length;
      const totalClients = clients.length;

      const pendingInvoices = invoices.filter(i => i.status === 'pending');
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');

      const pendingAmount = pendingInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmount || inv.amount || 0), 0
      );
      
      const overdueAmount = overdueInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmount || inv.amount || 0), 0
      );

      const completedPayments = payments.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || 0), 0
      );

      return {
        totalRevenue,
        revenueChange: 0, // TODO: Calcular real
        pendingAmount,
        pendingInvoices: pendingInvoices.length,
        overdueAmount,
        overdueInvoices: overdueInvoices.length,
        activeClients,
        totalClients
      };
    },

    async loadOverdueInvoices() {
      try {
        // Nota: Si quieres ver datos de prueba aunque no tengas vencidas, quita "status: overdue"
        const response = await InvoiceService.getAllInvoices({ 
          status: 'overdue',
          limit: 5,
          sortBy: 'dueDate',
          sortOrder: 'asc'
        });
        
        const data = this.extractApiData(response);
        this.overdueInvoices = data.invoices || data.data || (Array.isArray(data) ? data : []);
        
      } catch (error) {
        console.error('❌ Error cargando facturas vencidas:', error);
        this.overdueInvoices = [];
      }
    },

    async loadPendingPayments() {
      try {
        const response = await PaymentService.getAllPayments({ 
          status: 'pending',
          limit: 5
        });
        
        const data = this.extractApiData(response);
        this.pendingPayments = data.payments || data.data || (Array.isArray(data) ? data : []);
        
      } catch (error) {
        console.error('❌ Error cargando pagos pendientes:', error);
        this.pendingPayments = [];
      }
    },

    extractApiData(response) {
      if (!response || !response.data) return {};
      if (response.data.success && response.data.data) return response.data.data;
      return response.data;
    },

    setDefaultMetrics() {
      this.metrics = {
        totalRevenue: 0, revenueChange: 0,
        pendingAmount: 0, pendingInvoices: 0,
        overdueAmount: 0, overdueInvoices: 0,
        activeClients: 0, totalClients: 0
      };
    },

    initializeCharts() {
      if (!this.rawInvoices.length && !this.rawPayments.length) return;

      // Destruir instancias previas
      if (this.revenueChartInstance) this.revenueChartInstance.destroy();
      if (this.statusChartInstance) this.statusChartInstance.destroy();

      // --- GRÁFICO 1: Ingresos por Mes ---
      const revenueByMonth = {};
      this.rawPayments.forEach(p => {
        if (p.status === 'completed') {
          const d = new Date(p.paymentDate || p.createdAt);
          // Clave ej: "11/2025"
          const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
          revenueByMonth[key] = (revenueByMonth[key] || 0) + parseFloat(p.amount || 0);
        }
      });
      
      const revenueLabels = Object.keys(revenueByMonth);
      const revenueData = Object.values(revenueByMonth);

      const ctxRevenue = document.getElementById('revenueChart');
      if (ctxRevenue) {
        this.revenueChartInstance = new Chart(ctxRevenue, {
          type: 'bar',
          data: {
            labels: revenueLabels.length ? revenueLabels : ['Sin datos'],
            datasets: [{
              label: 'Ingresos ($)',
              data: revenueData.length ? revenueData : [0],
              backgroundColor: '#4CAF50',
              borderRadius: 4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      // --- GRÁFICO 2: Estado de Facturas ---
      const statusCounts = { paid: 0, pending: 0, overdue: 0, cancelled: 0 };
      this.rawInvoices.forEach(inv => {
        const s = inv.status || 'unknown';
        if (statusCounts[s] !== undefined) statusCounts[s]++;
      });

      const ctxStatus = document.getElementById('invoiceStatusChart');
      if (ctxStatus) {
        this.statusChartInstance = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: ['Pagadas', 'Pendientes', 'Vencidas', 'Canceladas'],
            datasets: [{
              data: [
                statusCounts.paid, 
                statusCounts.pending, 
                statusCounts.overdue, 
                statusCounts.cancelled
              ],
              backgroundColor: ['#4CAF50', '#2196F3', '#F44336', '#9E9E9E']
            }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    },

    formatNumber(value) {
      if (!value) return '0.00';
      return parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('es-MX');
    },

    formatPaymentMethod(method) {
      const methods = {
        'cash': 'Efectivo', 'transfer': 'Transferencia',
        'card': 'Tarjeta', 'online': 'En línea'
      };
      return methods[method] || method;
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },

    viewInvoice(invoiceId) {
      this.$router.push(`/billing/invoices/${invoiceId}`);
    },

    viewPayment(paymentId) {
      this.$router.push(`/billing/payments/${paymentId}`);
    },

    async sendReminder(invoiceId) {
      console.log('📧 Recordatorio:', invoiceId);
      alert('Recordatorio enviado (simulado)');
    },

    async approvePayment(paymentId) {
      try {
        await PaymentService.approveManualPayment(paymentId);
        alert('Pago aprobado');
        this.loadPendingPayments();
      } catch (error) {
        console.error('Error aprobando:', error);
        alert('Error aprobando pago');
      }
    },

    goToInvoices() { this.$router.push('/billing/invoices'); },
    goToPayments() { this.$router.push('/billing/payments'); },
    processOverdue() { this.$router.push('/billing/overdue'); },
    generateReports() { this.$router.push('/billing/reports'); },
    exportReport() { console.log('📊 Exportar reporte...'); }
  }
};
</script>


<style scoped>
.billing-dashboard {
  padding: 24px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

/* --- HEADER --- */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.header h2 {
  margin: 0;
  color: #1a1a1a;
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.period-selector {
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  outline: none;
}

.export-btn {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.export-btn:hover {
  background-color: #1976D2;
}

/* --- LOADING --- */
.loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 1.1rem;
}

/* --- TARJETAS DE MÉTRICAS --- */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 5px solid transparent;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.08);
}

/* Colores específicos por tipo de tarjeta */
.metric-card.revenue { border-color: #4CAF50; }
.metric-card.pending { border-color: #2196F3; }
.metric-card.overdue { border-color: #F44336; }
.metric-card.clients { border-color: #9C27B0; }

.metric-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
}

.metric-card.revenue .metric-icon { background: #e8f5e9; color: #4CAF50; }
.metric-card.pending .metric-icon { background: #e3f2fd; color: #2196F3; }
.metric-card.overdue .metric-icon { background: #ffebee; color: #F44336; }
.metric-card.clients .metric-icon { background: #f3e5f5; color: #9C27B0; }

.metric-content {
  flex: 1;
}

.metric-content h3 {
  margin: 0 0 5px 0;
  font-size: 0.9rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.metric-change, .metric-count {
  font-size: 0.85rem;
  font-weight: 500;
}

.metric-change.positive { color: #4CAF50; }
.metric-change.negative { color: #F44336; }
.metric-count { color: #888; }

/* --- SECCIÓN DE GRÁFICOS (CRÍTICO) --- */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 400px; /* Altura mínima del contenedor */
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.1rem;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

/* 👇 CLASE IMPORTANTE PARA QUE SE VEAN LOS GRÁFICOS 👇 */
.chart-placeholder {
  position: relative;
  height: 300px; /* Altura fija obligatoria para Chart.js */
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* --- TABLAS DE RESUMEN --- */
.summary-tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

.table-container h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 1.1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.summary-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.summary-table th {
  background-color: #f9fafb;
  padding: 12px 15px;
  text-align: left;
  font-weight: 600;
  color: #555;
  font-size: 0.85rem;
  text-transform: uppercase;
  border-bottom: 2px solid #eee;
}

.summary-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
  font-size: 0.9rem;
  vertical-align: middle;
}

.overdue-days {
  color: #F44336;
  font-weight: bold;
  background: #ffebee;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  display: inline-block;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: background 0.2s;
}

.action-btn.view { background-color: #e3f2fd; color: #1976d2; }
.action-btn.view:hover { background-color: #bbdefb; }

.action-btn.remind { background-color: #fff3e0; color: #f57c00; }
.action-btn.remind:hover { background-color: #ffe0b2; }

.action-btn.approve { background-color: #e8f5e9; color: #2e7d32; }
.action-btn.approve:hover { background-color: #c8e6c9; }

/* --- ACCIONES RÁPIDAS --- */
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

.quick-actions h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.quick-action-btn:hover {
  background: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border-color: #2196F3;
}

.quick-action-btn .icon {
  font-size: 1.8rem;
}

.quick-action-btn .text {
  font-weight: 600;
  color: #444;
  font-size: 1rem;
}

/* --- RESPONSIVE --- */
@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr; /* Gráficos en columna */
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .header-actions {
    flex-direction: column;
  }
  
  .export-btn, .period-selector {
    width: 100%;
    justify-content: center;
  }

  .metrics-grid, .summary-tables {
    grid-template-columns: 1fr;
  }
}
</style>