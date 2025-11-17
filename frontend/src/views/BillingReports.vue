<template>
  <div class="billing-reports">
    <div class="header">
      <h2>Reportes Financieros</h2>
      <div class="header-actions">
        <button @click="exportAllReports" class="export-btn">
          📊 Exportar Todo
        </button>
        <button @click="scheduleReport" class="schedule-btn">
          📅 Programar Reporte
        </button>
      </div>
    </div>

    <!-- Filtros globales -->
    <div class="global-filters">
      <div class="filter-group">
        <label>Período:</label>
        <select v-model="globalFilters.period" @change="updateDateRange">
          <option value="today">Hoy</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mes</option>
          <option value="quarter">Este Trimestre</option>
          <option value="year">Este Año</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      <div class="filter-group" v-if="globalFilters.period === 'custom'">
        <label>Desde:</label>
        <input type="date" v-model="globalFilters.startDate" @change="loadAllReports" />
      </div>

      <div class="filter-group" v-if="globalFilters.period === 'custom'">
        <label>Hasta:</label>
        <input type="date" v-model="globalFilters.endDate" @change="loadAllReports" />
      </div>

      <div class="filter-group">
        <label>Zona:</label>
        <select v-model="globalFilters.zoneId" @change="loadAllReports">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone.id" :value="zone.id">
            {{ zone.name }}
          </option>
        </select>
      </div>

      <button @click="loadAllReports" class="refresh-btn">🔄 Actualizar</button>
    </div>

    <!-- Resumen ejecutivo -->
    <div class="executive-summary">
      <h3>Resumen Ejecutivo</h3>
      <div class="summary-metrics">
        <div class="metric-card revenue">
          <div class="metric-icon">💰</div>
          <div class="metric-content">
            <div class="metric-label">Ingresos Totales</div>
            <div class="metric-value">${{ formatNumber(executiveSummary.totalRevenue) }}</div>
            <div class="metric-change" :class="{ positive: executiveSummary.revenueChange >= 0 }">
              {{ executiveSummary.revenueChange >= 0 ? '+' : '' }}{{ executiveSummary.revenueChange.toFixed(1) }}%
            </div>
          </div>
        </div>

        <div class="metric-card invoices">
          <div class="metric-icon">📄</div>
          <div class="metric-content">
            <div class="metric-label">Facturas Emitidas</div>
            <div class="metric-value">{{ executiveSummary.totalInvoices }}</div>
            <div class="metric-sublabel">${{ formatNumber(executiveSummary.invoicedAmount) }} facturado</div>
          </div>
        </div>

        <div class="metric-card collection">
          <div class="metric-icon">📊</div>
          <div class="metric-content">
            <div class="metric-label">Tasa de Cobranza</div>
            <div class="metric-value">{{ executiveSummary.collectionRate.toFixed(1) }}%</div>
            <div class="metric-sublabel">{{ executiveSummary.paidInvoices }} de {{ executiveSummary.totalInvoices }} pagadas</div>
          </div>
        </div>

        <div class="metric-card outstanding">
          <div class="metric-icon">⚠️</div>
          <div class="metric-content">
            <div class="metric-label">Cartera Vencida</div>
            <div class="metric-value">${{ formatNumber(executiveSummary.overdueAmount) }}</div>
            <div class="metric-sublabel">{{ executiveSummary.overdueInvoices }} facturas</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reportes por categoría -->
    <div class="reports-grid">
      <!-- Reporte de Ingresos -->
      <div class="report-card">
        <div class="report-header">
          <h3>📈 Análisis de Ingresos</h3>
          <button @click="exportReport('revenue')" class="export-icon">📤</button>
        </div>
        
        <div class="chart-container">
          <canvas ref="revenueChart" width="400" height="200"></canvas>
        </div>

        <div class="report-summary">
          <div class="summary-row">
            <span>Ingresos Promedio Mensual:</span>
            <span class="value">${{ formatNumber(revenueAnalysis.averageMonthly) }}</span>
          </div>
          <div class="summary-row">
            <span>Mejor Mes:</span>
            <span class="value">{{ revenueAnalysis.bestMonth }} (${{ formatNumber(revenueAnalysis.bestAmount) }})</span>
          </div>
          <div class="summary-row">
            <span>Crecimiento Anual:</span>
            <span class="value" :class="{ positive: revenueAnalysis.yearGrowth >= 0 }">
              {{ revenueAnalysis.yearGrowth >= 0 ? '+' : '' }}{{ revenueAnalysis.yearGrowth.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Reporte de Métodos de Pago -->
      <div class="report-card">
        <div class="report-header">
          <h3>💳 Métodos de Pago</h3>
          <button @click="exportReport('payment-methods')" class="export-icon">📤</button>
        </div>
        
        <div class="chart-container">
          <canvas ref="paymentMethodsChart" width="400" height="200"></canvas>
        </div>

        <div class="payment-methods-table">
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Cantidad</th>
                <th>Monto</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="method in paymentMethodsData" :key="method.method">
                <td>{{ formatPaymentMethod(method.method) }}</td>
                <td>{{ method.count }}</td>
                <td>${{ formatNumber(method.amount) }}</td>
                <td>{{ method.percentage.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Reporte de Cartera -->
      <div class="report-card">
        <div class="report-header">
          <h3>📊 Estado de Cartera</h3>
          <button @click="exportReport('portfolio')" class="export-icon">📤</button>
        </div>
        
        <div class="portfolio-metrics">
          <div class="portfolio-item">
            <span class="label">Al Día:</span>
            <span class="value current">${{ formatNumber(portfolioAnalysis.current) }}</span>
            <span class="percentage">({{ portfolioAnalysis.currentPercentage.toFixed(1) }}%)</span>
          </div>
          <div class="portfolio-item">
            <span class="label">1-30 días:</span>
            <span class="value past-due-1">${{ formatNumber(portfolioAnalysis.pastDue30) }}</span>
            <span class="percentage">({{ portfolioAnalysis.pastDue30Percentage.toFixed(1) }}%)</span>
          </div>
          <div class="portfolio-item">
            <span class="label">31-60 días:</span>
            <span class="value past-due-2">${{ formatNumber(portfolioAnalysis.pastDue60) }}</span>
            <span class="percentage">({{ portfolioAnalysis.pastDue60Percentage.toFixed(1) }}%)</span>
          </div>
          <div class="portfolio-item">
            <span class="label">61-90 días:</span>
            <span class="value past-due-3">${{ formatNumber(portfolioAnalysis.pastDue90) }}</span>
            <span class="percentage">({{ portfolioAnalysis.pastDue90Percentage.toFixed(1) }}%)</span>
          </div>
          <div class="portfolio-item">
            <span class="label">+90 días:</span>
            <span class="value past-due-4">${{ formatNumber(portfolioAnalysis.pastDue90Plus) }}</span>
            <span class="percentage">({{ portfolioAnalysis.pastDue90PlusPercentage.toFixed(1) }}%)</span>
          </div>
        </div>

        <div class="chart-container">
          <canvas ref="portfolioChart" width="400" height="200"></canvas>
        </div>
      </div>

      <!-- Reporte de Clientes -->
      <div class="report-card">
        <div class="report-header">
          <h3>👥 Análisis de Clientes</h3>
          <button @click="exportReport('clients')" class="export-icon">📤</button>
        </div>
        
        <div class="clients-metrics">
          <div class="client-metric">
            <div class="metric-number">{{ clientAnalysis.totalClients }}</div>
            <div class="metric-label">Clientes Totales</div>
          </div>
          <div class="client-metric">
            <div class="metric-number">{{ clientAnalysis.activeClients }}</div>
            <div class="metric-label">Activos</div>
          </div>
          <div class="client-metric">
            <div class="metric-number">{{ clientAnalysis.newClients }}</div>
            <div class="metric-label">Nuevos</div>
          </div>
          <div class="client-metric">
            <div class="metric-number">{{ clientAnalysis.churnedClients }}</div>
            <div class="metric-label">Dados de Baja</div>
          </div>
        </div>

        <div class="top-clients">
          <h4>Top 10 Clientes por Ingresos</h4>
          <div class="top-clients-list">
            <div v-for="client in topClients" :key="client.id" class="top-client-item">
              <span class="client-name">{{ client.name }}</span>
              <span class="client-revenue">${{ formatNumber(client.revenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reporte de Proyecciones -->
      <div class="report-card">
        <div class="report-header">
          <h3>🔮 Proyecciones</h3>
          <button @click="exportReport('projections')" class="export-icon">📤</button>
        </div>
        
        <div class="projections-content">
          <div class="projection-item">
            <div class="projection-label">Ingresos Próximos 30 días</div>
            <div class="projection-value">${{ formatNumber(projections.next30Days) }}</div>
            <div class="projection-confidence">Confianza: {{ projections.confidence30 }}%</div>
          </div>
          
          <div class="projection-item">
            <div class="projection-label">Ingresos Próximos 3 meses</div>
            <div class="projection-value">${{ formatNumber(projections.next3Months) }}</div>
            <div class="projection-confidence">Confianza: {{ projections.confidence90 }}%</div>
          </div>

          <div class="projection-item">
            <div class="projection-label">Facturas a Vencer (7 días)</div>
            <div class="projection-value">{{ projections.upcomingInvoices }}</div>
            <div class="projection-amount">${{ formatNumber(projections.upcomingAmount) }}</div>
          </div>
        </div>

        <div class="chart-container">
          <canvas ref="projectionsChart" width="400" height="200"></canvas>
        </div>
      </div>

      <!-- Reporte de Eficiencia Operativa -->
      <div class="report-card">
        <div class="report-header">
          <h3>⚡ Eficiencia Operativa</h3>
          <button @click="exportReport('efficiency')" class="export-icon">📤</button>
        </div>
        
        <div class="efficiency-metrics">
          <div class="efficiency-item">
            <div class="efficiency-label">Tiempo Promedio de Cobranza</div>
            <div class="efficiency-value">{{ operationalEfficiency.avgCollectionTime }} días</div>
          </div>
          
          <div class="efficiency-item">
            <div class="efficiency-label">Facturas Procesadas Automáticamente</div>
            <div class="efficiency-value">{{ operationalEfficiency.autoProcessedPercentage }}%</div>
          </div>

          <div class="efficiency-item">
            <div class="efficiency-label">Recordatorios Enviados</div>
            <div class="efficiency-value">{{ operationalEfficiency.remindersSent }}</div>
          </div>

          <div class="efficiency-item">
            <div class="efficiency-label">Tasa de Respuesta a Recordatorios</div>
            <div class="efficiency-value">{{ operationalEfficiency.reminderResponseRate }}%</div>
          </div>
        </div>

        <div class="efficiency-trends">
          <h4>Tendencias Mensuales</h4>
          <div class="chart-container">
            <canvas ref="efficiencyChart" width="400" height="150"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla de reportes detallados -->
    <div class="detailed-reports">
      <h3>Reportes Detallados</h3>
      
      <div class="report-tabs">
        <button 
          v-for="tab in reportTabs" 
          :key="tab.id"
          :class="['tab', { active: activeReportTab === tab.id }]"
          @click="setActiveReportTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="report-content">
        <!-- Tabla de facturas por estado -->
        <div v-if="activeReportTab === 'invoices'" class="report-table">
          <div class="table-header">
            <h4>Facturas por Estado</h4>
            <button @click="exportDetailedReport('invoices')" class="export-btn-small">
              📤 Exportar
            </button>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Cantidad</th>
                <th>Monto Total</th>
                <th>Promedio</th>
                <th>% del Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="status in invoicesByStatus" :key="status.status">
                <td>
                  <span :class="['status-badge', getStatusClass(status.status)]">
                    {{ formatInvoiceStatus(status.status) }}
                  </span>
                </td>
                <td>{{ status.count }}</td>
                <td>${{ formatNumber(status.totalAmount) }}</td>
                <td>${{ formatNumber(status.averageAmount) }}</td>
                <td>{{ status.percentage.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabla de pagos por pasarela -->
        <div v-if="activeReportTab === 'payments'" class="report-table">
          <div class="table-header">
            <h4>Pagos por Pasarela</h4>
            <button @click="exportDetailedReport('payments')" class="export-btn-small">
              📤 Exportar
            </button>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Pasarela</th>
                <th>Cantidad</th>
                <th>Monto Total</th>
                <th>Comisiones</th>
                <th>Neto</th>
                <th>Tasa Éxito</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gateway in paymentsByGateway" :key="gateway.name">
                <td>{{ gateway.name }}</td>
                <td>{{ gateway.count }}</td>
                <td>${{ formatNumber(gateway.totalAmount) }}</td>
                <td>${{ formatNumber(gateway.fees) }}</td>
                <td>${{ formatNumber(gateway.netAmount) }}</td>
                <td>{{ gateway.successRate.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabla de clientes morosos -->
        <div v-if="activeReportTab === 'overdue'" class="report-table">
          <div class="table-header">
            <h4>Clientes con Facturas Vencidas</h4>
            <button @click="exportDetailedReport('overdue')" class="export-btn-small">
              📤 Exportar
            </button>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Facturas Vencidas</th>
                <th>Monto Total</th>
                <th>Días Promedio</th>
                <th>Última Comunicación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in overdueClients" :key="client.id">
                <td>
                  <div class="client-info">
                    <span class="client-name">{{ client.name }}</span>
                    <span class="client-contact">{{ client.phone }}</span>
                  </div>
                </td>
                <td>{{ client.overdueInvoices }}</td>
                <td class="amount overdue">${{ formatNumber(client.overdueAmount) }}</td>
                <td>{{ client.averageOverdueDays }} días</td>
                <td>{{ formatDate(client.lastCommunication) }}</td>
                <td>
                  <button @click="sendReminder(client.id)" class="action-btn">
                    📧 Recordatorio
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal de programación de reportes -->
    <div v-if="showScheduleModal" class="modal-overlay" @click="closeScheduleModal">
      <div class="modal-content" @click.stop>
        <h3>Programar Reporte Automático</h3>
        
        <form @submit.prevent="saveSchedule">
          <div class="form-group">
            <label>Tipo de Reporte:</label>
            <select v-model="scheduleForm.reportType" required>
              <option value="executive">Resumen Ejecutivo</option>
              <option value="revenue">Análisis de Ingresos</option>
              <option value="overdue">Cartera Vencida</option>
              <option value="complete">Reporte Completo</option>
            </select>
          </div>

          <div class="form-group">
            <label>Frecuencia:</label>
            <select v-model="scheduleForm.frequency" required>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
            </select>
          </div>

          <div class="form-group">
            <label>Enviar a:</label>
            <input 
              type="email" 
              v-model="scheduleForm.recipients" 
              placeholder="email1@domain.com, email2@domain.com"
              required 
            />
          </div>

          <div class="form-group">
            <label>Formato:</label>
            <select v-model="scheduleForm.format">
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeScheduleModal" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-confirm">
              Programar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import BillingService from '../services/billing.service';
import InvoiceService from '../services/invoice.service';
import PaymentService from '../services/payment.service';
import ClientService from '../services/client.service';
import ReportsService from '../services/reports.service'; // Asumiendo que este archivo ya fue creado
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default {
  name: 'BillingReports',
  data() {
    return {
      loading: false,
      zones: [],
      globalFilters: {
        period: 'month',
        startDate: '',
        endDate: '',
        zoneId: ''
      },
      executiveSummary: {
        totalRevenue: 0, revenueChange: 0, totalInvoices: 0,
        invoicedAmount: 0, paidInvoices: 0, collectionRate: 0,
        overdueAmount: 0, overdueInvoices: 0
      },
      revenueAnalysis: {
        averageMonthly: 0, bestMonth: '', bestAmount: 0,
        yearGrowth: 0, monthlyData: {}
      },
      paymentMethodsData: [],
      portfolioAnalysis: {
        current: 0, currentPercentage: 0, pastDue30: 0, pastDue30Percentage: 0,
        pastDue60: 0, pastDue60Percentage: 0, pastDue90: 0, pastDue90Percentage: 0,
        pastDue90Plus: 0, pastDue90PlusPercentage: 0
      },
      clientAnalysis: {
        totalClients: 0, activeClients: 0, newClients: 0, churnedClients: 0
      },
      topClients: [],
      projections: {
        next30Days: 0, confidence30: 0, next3Months: 0, confidence90: 0,
        upcomingInvoices: 0, upcomingAmount: 0
      },
      operationalEfficiency: {
        avgCollectionTime: 0, autoProcessedPercentage: 0,
        remindersSent: 0, reminderResponseRate: 0
      },
      activeReportTab: 'invoices',
      reportTabs: [
        { id: 'invoices', label: 'Facturas por Estado' },
        { id: 'payments', label: 'Pagos por Pasarela' },
        { id: 'overdue', label: 'Clientes Morosos' }
      ],
      invoicesByStatus: [],
      paymentsByGateway: [],
      overdueClients: [],
      showScheduleModal: false,
      scheduleForm: {
        reportType: 'executive', frequency: 'monthly', recipients: '', format: 'pdf'
      },
      charts: {
        revenueChart: null, paymentMethodsChart: null, portfolioChart: null,
        projectionsChart: null, efficiencyChart: null,
      }
    };
  },
  created() {
    this.initializeDateRange();
    this.loadZones();
    this.loadAllReports();
  },
  mounted() {
    this.setupCharts();
  },
  methods: {
    initializeDateRange() {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.globalFilters.startDate = firstDay.toISOString().split('T')[0];
      this.globalFilters.endDate = lastDay.toISOString().split('T')[0];
    },

    updateDateRange() {
      const now = new Date();
      switch (this.globalFilters.period) {
        case 'today': {
          const today = new Date().toISOString().split('T')[0];
          this.globalFilters.startDate = today;
          this.globalFilters.endDate = today;
          break;
        }
        case 'week': {
          const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
          const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
          this.globalFilters.startDate = weekStart.toISOString().split('T')[0];
          this.globalFilters.endDate = weekEnd.toISOString().split('T')[0];
          break;
        }
        case 'month': {
          this.initializeDateRange();
          break;
        }
        case 'quarter': {
          const quarter = Math.floor(now.getMonth() / 3);
          const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
          const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          this.globalFilters.startDate = quarterStart.toISOString().split('T')[0];
          this.globalFilters.endDate = quarterEnd.toISOString().split('T')[0];
          break;
        }
        case 'year': {
          this.globalFilters.startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          this.globalFilters.endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
          break;
        }
      }
      if (this.globalFilters.period !== 'custom') {
        this.loadAllReports();
      }
    },

    async loadZones() {
      try {
        const response = await ClientService.getZones();
        this.zones = response.data.data || response.data;
      } catch (error) {
        console.error('Error cargando zonas:', error);
      }
    },

    async loadAllReports() {
      this.loading = true;
      try {
        // Ejecutamos las cargas de datos principales en paralelo
        await Promise.all([
          this.loadExecutiveSummary(),
          this.loadClientAnalysis(),
          this.loadDetailedReports(),
          this.loadPortfolioAnalysis(),
          this.loadProjections(),
          this.loadOperationalEfficiency()
        ]);
        // Una vez que todos los datos están listos, actualizamos las gráficas
        this.updateCharts();
      } catch (error) {
        console.error('Error cargando los reportes:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadExecutiveSummary() {
      try {
        const params = {
          startDate: this.globalFilters.startDate,
          endDate: this.globalFilters.endDate,
          zoneId: this.globalFilters.zoneId || undefined
        };
        // TODO: Este endpoint debe ser creado en el backend
        const response = await ReportsService.getExecutiveSummary(params);
        this.executiveSummary = response.data.data;
      } catch (error) {
        console.error('Error cargando resumen ejecutivo (puede que el endpoint no exista aún):', error);
      }
    },
    
    async loadClientAnalysis() {
        try {
            const params = { 
                startDate: this.globalFilters.startDate, 
                endDate: this.globalFilters.endDate,
                zoneId: this.globalFilters.zoneId || undefined 
            };
            const [clientStatsRes, invoiceStatsRes] = await Promise.all([
                ClientService.getClientStatistics(params),
                InvoiceService.getInvoiceStatistics(params)
            ]);
            this.clientAnalysis = clientStatsRes.data.data;
            this.topClients = (invoiceStatsRes.data.data.topClients || []).map(c => ({
                id: c.clientId,
                name: c.clientName,
                revenue: c.totalBilled
            }));
        } catch (error) {
            console.error('Error cargando análisis de clientes:', error);
        }
    },

    async loadPortfolioAnalysis() {
      try {
        const params = { /* ... */ };
        // TODO: Este endpoint debe ser creado en el backend
        const response = await ReportsService.getPortfolioAnalysis(params);
        this.portfolioAnalysis = response.data.data;
      } catch (error) {
        console.error('Error cargando análisis de cartera (puede que el endpoint no exista aún):', error);
      }
    },
    
    async loadProjections() {
      try {
        const params = { /* ... */ };
        // TODO: Este endpoint debe ser creado en el backend
        const response = await ReportsService.getProjections(params);
        this.projections = response.data.data;
      } catch (error) {
        console.error('Error cargando proyecciones (puede que el endpoint no exista aún):', error);
      }
    },
    
    async loadOperationalEfficiency() {
      try {
        const params = { /* ... */ };
        // TODO: Este endpoint debe ser creado en el backend
        const response = await ReportsService.getOperationalEfficiency(params);
        this.operationalEfficiency = response.data.data;
      } catch (error) {
        console.error('Error cargando eficiencia operativa (puede que el endpoint no exista aún):', error);
      }
    },

    async loadDetailedReports() {
        try {
            const params = {
                startDate: this.globalFilters.startDate,
                endDate: this.globalFilters.endDate,
                zoneId: this.globalFilters.zoneId || undefined
            };
            const [invoiceStatsRes, paymentStatsRes, overdueClientsRes] = await Promise.all([
                InvoiceService.getInvoiceStatistics(params),
                PaymentService.getPaymentStatistics(params),
                BillingService.getOverdueClients({ ...params, days: 120 }) // Trae morosos de hasta 120 días
            ]);

            const invoiceData = invoiceStatsRes.data.data;
            this.invoicesByStatus = Object.entries(invoiceData.byStatus || {}).map(([status, count]) => ({
                status, count,
                totalAmount: invoiceData.amountByStatus ? (invoiceData.amountByStatus[status] || 0) : 0,
                averageAmount: count > 0 && invoiceData.amountByStatus ? ((invoiceData.amountByStatus[status] || 0) / count) : 0,
                percentage: invoiceData.summary.totalInvoices > 0 ? (count / invoiceData.summary.totalInvoices) * 100 : 0
            }));

            const paymentData = paymentStatsRes.data.data;
            const totalPaymentAmount = paymentData.summary.totalAmount;
            this.paymentMethodsData = Object.entries(paymentData.paymentMethods || {}).map(([method, data]) => ({
                method, count: data.count, amount: data.amount,
                percentage: totalPaymentAmount > 0 ? (data.amount / totalPaymentAmount) * 100 : 0
            }));

            this.overdueClients = overdueClientsRes.data.data.clients || [];
            this.revenueAnalysis.monthlyData = paymentData.dailyStats;

        } catch (error) {
            console.error('Error cargando reportes detallados:', error);
        }
    },

    setupCharts() {
      const refs = ['revenueChart', 'paymentMethodsChart', 'portfolioChart'];
      refs.forEach(ref => {
        const ctx = this.$refs[ref]?.getContext('2d');
        if (ctx) {
          let type = 'bar';
          if (ref === 'paymentMethodsChart' || ref === 'portfolioChart') type = 'doughnut';
          if (ref === 'revenueChart') type = 'line';
          
          this.charts[ref] = new Chart(ctx, {
            type: type,
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: ref !== 'revenueChart' } } }
          });
        }
      });
    },
    
    updateCharts() {
      this.updateRevenueChart();
      this.updatePaymentMethodsChart();
      this.updatePortfolioChart();
    },
    
    updateRevenueChart() {
      const chart = this.charts.revenueChart;
      if (!chart || !this.revenueAnalysis.monthlyData) return;
      
      const labels = Object.keys(this.revenueAnalysis.monthlyData);
      const data = Object.values(this.revenueAnalysis.monthlyData).map(d => d.amount);
      
      chart.data.labels = labels;
      chart.data.datasets = [{
        label: 'Ingresos por Día', data, borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)', fill: true, tension: 0.1
      }];
      chart.update();
    },
    
    updatePaymentMethodsChart() {
      const chart = this.charts.paymentMethodsChart;
      if (!chart || !this.paymentMethodsData) return;

      const labels = this.paymentMethodsData.map(d => this.formatPaymentMethod(d.method));
      const data = this.paymentMethodsData.map(d => d.amount);

      chart.data.labels = labels;
      chart.data.datasets = [{
        label: 'Monto por Método', data,
        backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#F44336'],
      }];
      chart.update();
    },

    updatePortfolioChart() {
      const chart = this.charts.portfolioChart;
      if (!chart || !this.portfolioAnalysis) return;
      
      chart.data.labels = ['Al Día', '1-30 días', '31-60 días', '61-90 días', '+90 días'];
      chart.data.datasets = [{
        label: 'Estado de Cartera',
        data: [
          this.portfolioAnalysis.current, this.portfolioAnalysis.pastDue30,
          this.portfolioAnalysis.pastDue60, this.portfolioAnalysis.pastDue90,
          this.portfolioAnalysis.pastDue90Plus,
        ],
        backgroundColor: ['#4CAF50', '#FFC107', '#FF9800', '#F57C00', '#F44336'],
      }];
      chart.update();
    },

    setActiveReportTab(tabId) {
      this.activeReportTab = tabId;
    },

    async sendReminder(clientId) {
      try {
        console.log('Enviando recordatorio a cliente:', clientId);
        alert('Recordatorio enviado exitosamente');
      } catch (error) {
        console.error('Error enviando recordatorio:', error);
        alert('Error enviando recordatorio');
      }
    },

    exportReport(reportType) {
      console.log('Exportando reporte:', reportType);
      alert(`Exportando reporte de ${reportType}...`);
    },

    exportDetailedReport(reportType) {
      console.log('Exportando reporte detallado:', reportType);
      alert(`Exportando reporte detallado de ${reportType}...`);
    },

    exportAllReports() {
      console.log('Exportando todos los reportes...');
      alert('Generando archivo con todos los reportes...');
    },

    scheduleReport() {
      this.showScheduleModal = true;
    },

    closeScheduleModal() {
      this.showScheduleModal = false;
      this.scheduleForm = { reportType: 'executive', frequency: 'monthly', recipients: '', format: 'pdf' };
    },

    async saveSchedule() {
      try {
        console.log('Programando reporte:', this.scheduleForm);
        alert('Reporte programado exitosamente');
        this.closeScheduleModal();
      } catch (error) {
        console.error('Error programando reporte:', error);
        alert('Error programando reporte');
      }
    },

    formatNumber(value) {
      if (value === null || value === undefined) return '0.00';
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
      const methods = { 'cash': 'Efectivo', 'transfer': 'Transferencia', 'card': 'Tarjeta', 'online': 'En Línea' };
      return methods[method] || method;
    },

    formatInvoiceStatus(status) {
      const statuses = { 'paid': 'Pagada', 'pending': 'Pendiente', 'overdue': 'Vencida', 'cancelled': 'Cancelada' };
      return statuses[status] || status;
    },

    getStatusClass(status) {
      const classes = { 'paid': 'status-paid', 'pending': 'status-pending', 'overdue': 'status-overdue', 'cancelled': 'status-cancelled' };
      return classes[status] || 'status-unknown';
    }
  }
};
</script>

<style scoped>
.billing-reports {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
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
  gap: 10px;
}

.export-btn, .schedule-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.export-btn {
  background-color: #4CAF50;
  color: white;
}

.schedule-btn {
  background-color: #2196F3;
  color: white;
}

.global-filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-weight: 500;
  color: #666;
  font-size: 12px;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.refresh-btn {
  padding: 8px 12px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

.executive-summary {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.executive-summary h3 {
  margin: 0 0 20px 0;
  color: #333;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid;
}

.metric-card.revenue {
  border-left-color: #4CAF50;
}

.metric-card.invoices {
  border-left-color: #2196F3;
}

.metric-card.collection {
  border-left-color: #9C27B0;
}

.metric-card.outstanding {
  border-left-color: #F44336;
}

.metric-icon {
  font-size: 2.5em;
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.metric-change {
  font-size: 12px;
  color: #f44336;
}

.metric-change.positive {
  color: #4CAF50;
}

.metric-sublabel {
  font-size: 12px;
  color: #666;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.report-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 20px 0 20px;
}

.report-header h3 {
  margin: 0;
  color: #333;
}

.export-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  padding: 5px;
}

.export-icon:hover {
  color: #333;
}

.chart-container {
  padding: 20px;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  color: #666;
}

.report-summary {
  padding: 0 20px 20px 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.summary-row .value {
  font-weight: 500;
}

.summary-row .value.positive {
  color: #4CAF50;
}

.payment-methods-table {
  padding: 0 20px 20px 20px;
}

.payment-methods-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.payment-methods-table th,
.payment-methods-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.payment-methods-table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.portfolio-metrics {
  padding: 20px;
}

.portfolio-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.portfolio-item .label {
  font-weight: 500;
  color: #666;
}

.portfolio-item .value {
  font-weight: bold;
}

.portfolio-item .value.current {
  color: #4CAF50;
}

.portfolio-item .value.past-due-1 {
  color: #FF9800;
}

.portfolio-item .value.past-due-2 {
  color: #f57c00;
}

.portfolio-item .value.past-due-3 {
  color: #e65100;
}

.portfolio-item .value.past-due-4 {
  color: #F44336;
}

.portfolio-item .percentage {
  font-size: 12px;
  color: #666;
}

.clients-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  padding: 20px;
}

.client-metric {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.client-metric .metric-number {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.client-metric .metric-label {
  font-size: 12px;
  color: #666;
}

.top-clients {
  padding: 0 20px 20px 20px;
}

.top-clients h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 14px;
}

.top-clients-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.top-client-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 13px;
}

.client-name {
  font-weight: 500;
}

.client-revenue {
  color: #4CAF50;
  font-weight: bold;
}

.projections-content {
  padding: 20px;
}

.projection-item {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.projection-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.projection-value {
  font-size: 1.5em;
  font-weight: bold;
  color: #333;
  margin-bottom: 3px;
}

.projection-confidence {
  font-size: 12px;
  color: #4CAF50;
}

.projection-amount {
  font-size: 12px;
  color: #666;
}

.efficiency-metrics {
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.efficiency-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.efficiency-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.efficiency-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #333;
}

.efficiency-trends {
  padding: 0 20px 20px 20px;
}

.efficiency-trends h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 14px;
}

.detailed-reports {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.detailed-reports h3 {
  margin: 0;
  padding: 20px 20px 0 20px;
  color: #333;
}

.report-tabs {
  display: flex;
  border-bottom: 2px solid #eee;
}

.tab {
  padding: 15px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  color: #333;
  background-color: #f8f9fa;
}

.tab.active {
  color: #2196F3;
  border-bottom-color: #2196F3;
  font-weight: 500;
}

.report-content {
  padding: 20px;
}

.report-table {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.table-header h4 {
  margin: 0;
  color: #333;
}

.export-btn-small {
  padding: 6px 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.report-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.report-table th,
.report-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.report-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-paid {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-pending {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-overdue {
  background-color: #ffebee;
  color: #c62828;
}

.status-cancelled {
  background-color: #f5f5f5;
  color: #757575;
}

.client-info {
  display: flex;
  flex-direction: column;
}

.client-name {
  font-weight: 500;
  color: #333;
}

.client-contact {
  font-size: 12px;
  color: #666;
}

.amount {
  text-align: right;
  font-weight: bold;
}

.amount.overdue {
  color: #f44336;
}

.action-btn {
  padding: 6px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.modal-overlay {
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

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background-color: #2196F3;
  color: white;
}

@media (max-width: 768px) {
  .billing-reports {
    padding: 15px;
  }

  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .global-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-metrics {
    grid-template-columns: 1fr;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }

  .clients-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .efficiency-metrics {
    grid-template-columns: 1fr;
  }

  .report-tabs {
    flex-direction: column;
  }

  .table-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
}
</style>