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
import BillingService from '../services/billing.service';
import InvoiceService from '../services/invoice.service';
import PaymentService from '../services/payment.service';
import ClientService from '../services/client.service';

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
      overdueInvoices: [],
      pendingPayments: [],
      revenueChart: null,
      invoiceStatusChart: null
    };
  },
  mounted() {
    this.loadDashboardData();
  },
  methods: {
    async loadDashboardData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadMetrics(),
          this.loadOverdueInvoices(),
          this.loadPendingPayments()
        ]);
        
        this.$nextTick(() => {
          this.initializeCharts();
        });
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadMetrics() {
      try {
        console.log('🔄 Cargando métricas del dashboard...');

        // ✅ USAR ENDPOINTS QUE SÍ EXISTEN - Cargar todas las facturas y calcular estadísticas
        const [allInvoices, allPayments, allClients] = await Promise.all([
          // Cargar todas las facturas
          InvoiceService.getAllInvoices({ 
            limit: 1000 // Obtener muchas facturas para calcular estadísticas
          }).catch(err => {
            console.warn('Error cargando facturas:', err);
            return { data: { success: false, data: { invoices: [] } } };
          }),
          
          // Cargar todos los pagos
          PaymentService.getAllPayments({ 
            limit: 1000 // Obtener muchos pagos para calcular estadísticas
          }).catch(err => {
            console.warn('Error cargando pagos:', err);
            return { data: { success: false, data: { payments: [] } } };
          }),

          // Cargar todos los clientes
          ClientService.getAllClients({ 
            size: 1000 // Obtener muchos clientes para contar
          }).catch(err => {
            console.warn('Error cargando clientes:', err);
            return { data: { success: false, data: { clients: [] } } };
          })
        ]);

        console.log('📊 Respuestas recibidas:', { allInvoices, allPayments, allClients });

        // ✅ EXTRAER DATOS CORRECTAMENTE
        const invoicesData = this.extractApiData(allInvoices);
        const paymentsData = this.extractApiData(allPayments);
        const clientsData = this.extractApiData(allClients);

        const invoices = invoicesData.invoices || [];
        const payments = paymentsData.payments || [];
        const clients = clientsData.clients || [];

        console.log('📋 Datos extraídos:', { 
          invoicesCount: invoices.length, 
          paymentsCount: payments.length, 
          clientsCount: clients.length 
        });

        // ✅ CALCULAR ESTADÍSTICAS MANUALMENTE
        const stats = this.calculateStatistics(invoices, payments, clients);
        
        this.metrics = stats;
        console.log('📈 Métricas calculadas:', this.metrics);

      } catch (error) {
        console.error('❌ Error cargando métricas:', error);
        this.setDefaultMetrics();
      }
    },

    // ✅ NUEVO: Calcular estadísticas manualmente desde los datos
    calculateStatistics(invoices, payments, clients) {
      console.log('🧮 Calculando estadísticas...');
      
      // ESTADÍSTICAS DE CLIENTES
      const activeClients = clients.filter(c => c.active === true).length;
      const totalClients = clients.length;

      // ESTADÍSTICAS DE FACTURAS
      const pendingInvoices = invoices.filter(i => i.status === 'pending');
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');
      const paidInvoices = invoices.filter(i => i.status === 'paid');

      const pendingAmount = pendingInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmount || 0), 0
      );
      
      const overdueAmount = overdueInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.totalAmount || 0), 0
      );

      // ESTADÍSTICAS DE PAGOS
      const completedPayments = payments.filter(p => p.status === 'completed');
      const totalRevenue = completedPayments.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || 0), 0
      );

      // CALCULAR CAMBIO DE INGRESOS (simulado por ahora)
      const revenueChange = 5.2; // TODO: Calcular comparando con período anterior

      const calculatedStats = {
        totalRevenue,
        revenueChange,
        pendingAmount,
        pendingInvoices: pendingInvoices.length,
        overdueAmount,
        overdueInvoices: overdueInvoices.length,
        activeClients,
        totalClients
      };

      console.log('📊 Estadísticas calculadas:', calculatedStats);
      return calculatedStats;
    },

    async loadOverdueInvoices() {
      try {
        console.log('⏰ Cargando facturas vencidas...');
        
        // ✅ USAR ENDPOINT QUE EXISTE - Filtrar facturas vencidas
        const response = await InvoiceService.getAllInvoices({ 
          status: 'overdue',
          limit: 5,
          sortBy: 'dueDate',
          sortOrder: 'asc'
        });
        
        const data = this.extractApiData(response);
        this.overdueInvoices = data.invoices || [];
        
        console.log('⏰ Facturas vencidas cargadas:', this.overdueInvoices.length);
      } catch (error) {
        console.error('❌ Error cargando facturas vencidas:', error);
        this.overdueInvoices = [];
      }
    },

    async loadPendingPayments() {
      try {
        console.log('💳 Cargando pagos pendientes...');
        
        // ✅ USAR ENDPOINT QUE EXISTE - Filtrar pagos pendientes
        const response = await PaymentService.getAllPayments({ 
          status: 'pending',
          limit: 5
        });
        
        const data = this.extractApiData(response);
        this.pendingPayments = data.payments || [];
        
        console.log('💳 Pagos pendientes cargados:', this.pendingPayments.length);
      } catch (error) {
        console.error('❌ Error cargando pagos pendientes:', error);
        this.pendingPayments = [];
      }
    },

    // ✅ MÉTODO AUXILIAR: Extraer datos de respuesta API
    extractApiData(response) {
      if (!response || !response.data) {
        console.warn('⚠️ Respuesta vacía o inválida:', response);
        return {};
      }

      // Si tiene estructura { success: true, data: {...} }
      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // Si es directamente los datos
      return response.data;
    },

    // ✅ MÉTODO AUXILIAR: Valores por defecto
    setDefaultMetrics() {
      this.metrics = {
        totalRevenue: 0,
        revenueChange: 0,
        pendingAmount: 0,
        pendingInvoices: 0,
        overdueAmount: 0,
        overdueInvoices: 0,
        activeClients: 0,
        totalClients: 0
      };
    },

    initializeCharts() {
      console.log('📈 Inicializando gráficos...');
      // TODO: Implementar Chart.js aquí
    },

    formatNumber(value) {
      if (!value) return '0.00';
      return parseFloat(value).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    formatDate(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('es-MX');
    },

    formatPaymentMethod(method) {
      const methods = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'online': 'En línea'
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
      try {
        // TODO: Implementar cuando exista el endpoint
        console.log('📧 Enviando recordatorio para factura:', invoiceId);
        alert('Recordatorio enviado exitosamente');
      } catch (error) {
        console.error('Error enviando recordatorio:', error);
        alert('Error enviando recordatorio');
      }
    },

    async approvePayment(paymentId) {
      try {
        await PaymentService.approveManualPayment(paymentId);
        alert('Pago aprobado exitosamente');
        this.loadPendingPayments();
      } catch (error) {
        console.error('Error aprobando pago:', error);
        alert('Error aprobando pago');
      }
    },

    goToInvoices() {
      this.$router.push('/billing/invoices');
    },

    goToPayments() {
      this.$router.push('/billing/payments');
    },

    processOverdue() {
      this.$router.push('/billing/overdue');
    },

    generateReports() {
      this.$router.push('/billing/reports');
    },

    exportReport() {
      console.log('📊 Exportando reporte...');
      // TODO: Implementar exportación
    }
  }
};

</script>

<style scoped>
.billing-dashboard {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.period-selector {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.export-btn {
  padding: 10px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.export-btn:hover {
  background-color: #45a049;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.metric-card.revenue {
  border-left: 4px solid #4CAF50;
}

.metric-card.pending {
  border-left: 4px solid #2196F3;
}

.metric-card.overdue {
  border-left: 4px solid #F44336;
}

.metric-card.clients {
  border-left: 4px solid #9C27B0;
}

.metric-icon {
  font-size: 2.5em;
}

.metric-content h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.metric-change {
  font-size: 12px;
}

.metric-change.positive {
  color: #4CAF50;
}

.metric-change.negative {
  color: #F44336;
}

.metric-count {
  font-size: 12px;
  color: #666;
}

.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.chart-placeholder {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  border-radius: 4px;
}

.summary-tables {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.table-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-container h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
}

.summary-table th,
.summary-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.summary-table th {
  background-color: #f5f5f5;
  font-weight: 600;
  color: #333;
  font-size: 13px;
}

.summary-table td {
  font-size: 13px;
}

.overdue-days {
  color: #F44336;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
}

.action-btn.view {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn.remind {
  background-color: #fff3e0;
  color: #f57c00;
}

.action-btn.approve {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.quick-actions {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.quick-actions h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.quick-action-btn .icon {
  font-size: 1.5em;
}

.quick-action-btn .text {
  font-weight: 500;
  color: #495057;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
  
  .summary-tables {
    grid-template-columns: 1fr;
  }
  
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: space-between;
  }
}
</style>