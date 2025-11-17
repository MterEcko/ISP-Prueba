<template>
  <div class="financial-reports">
    <div class="header">
      <h1>Reportes Financieros</h1>
      <div class="header-actions">
        <button @click="exportReport" class="btn btn-primary" :disabled="!currentReport">
          <span class="icon">📊</span>
          Exportar Reporte
        </button>
      </div>
    </div>

    <!-- Selector de reportes -->
    <div class="report-selector">
      <button
        v-for="type in reportTypes"
        :key="type.id"
        @click="selectReport(type.id)"
        class="report-btn"
        :class="{ active: selectedReportType === type.id }"
      >
        <span class="icon">{{ type.icon }}</span>
        <span class="label">{{ type.label }}</span>
      </button>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div v-if="selectedReportType === 'cash-flow'" class="filter-group">
        <label>Fecha Inicio:</label>
        <input type="date" v-model="filters.startDate" />
      </div>

      <div v-if="selectedReportType === 'cash-flow'" class="filter-group">
        <label>Fecha Fin:</label>
        <input type="date" v-model="filters.endDate" />
      </div>

      <div v-if="selectedReportType === 'profit-loss'" class="filter-group">
        <label>Mes:</label>
        <select v-model="filters.month">
          <option v-for="m in 12" :key="m" :value="m">
            {{ getMonthName(m) }}
          </option>
        </select>
      </div>

      <div v-if="['profit-loss', 'monthly-summary'].includes(selectedReportType)" class="filter-group">
        <label>Año:</label>
        <select v-model="filters.year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>

      <div v-if="selectedReportType === 'balance-sheet'" class="filter-group">
        <label>Fecha de Corte:</label>
        <input type="date" v-model="filters.balanceDate" />
      </div>

      <button @click="loadReport" class="btn btn-success">
        <span class="icon">🔍</span>
        Generar Reporte
      </button>
    </div>

    <!-- Contenido del reporte -->
    <div v-if="loading" class="loading">
      <p>Generando reporte...</p>
    </div>

    <div v-else-if="currentReport" class="report-content">
      <!-- Flujo de Efectivo -->
      <div v-if="selectedReportType === 'cash-flow'" class="report-section">
        <h2>📈 Flujo de Efectivo</h2>
        <p class="report-period">
          Del {{ formatDate(currentReport.startDate) }} al {{ formatDate(currentReport.endDate) }}
        </p>

        <div class="summary-boxes">
          <div class="summary-box income">
            <h4>Total Ingresos</h4>
            <p class="amount">{{ formatCurrency(currentReport.summary.totalIncome) }}</p>
          </div>
          <div class="summary-box expenses">
            <h4>Total Gastos</h4>
            <p class="amount">{{ formatCurrency(currentReport.summary.totalExpenses) }}</p>
          </div>
          <div class="summary-box payroll">
            <h4>Total Nómina</h4>
            <p class="amount">{{ formatCurrency(currentReport.summary.totalPayroll) }}</p>
          </div>
          <div class="summary-box net">
            <h4>Flujo Neto</h4>
            <p class="amount" :class="{ negative: currentReport.summary.netCashFlow < 0 }">
              {{ formatCurrency(currentReport.summary.netCashFlow) }}
            </p>
          </div>
        </div>

        <div class="cash-flow-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Nómina</th>
                <th>Flujo Neto</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(flow, index) in currentReport.cashFlow" :key="index">
                <td>{{ formatDate(flow.date) }}</td>
                <td class="income">{{ formatCurrency(flow.income) }}</td>
                <td class="expense">{{ formatCurrency(flow.expenses) }}</td>
                <td class="expense">{{ formatCurrency(flow.payroll) }}</td>
                <td :class="{ income: flow.net > 0, expense: flow.net < 0 }">
                  {{ formatCurrency(flow.net) }}
                </td>
                <td class="balance">{{ formatCurrency(flow.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Estado de Resultados -->
      <div v-if="selectedReportType === 'profit-loss'" class="report-section">
        <h2>💼 Estado de Resultados (P&L)</h2>
        <p class="report-period">
          {{ getMonthName(currentReport.period.month) }} {{ currentReport.period.year }}
        </p>

        <div class="profit-loss-container">
          <div class="pl-section">
            <h3>📥 Ingresos</h3>
            <div class="pl-row">
              <span>Ingresos por Servicios</span>
              <span class="income-amount">{{ formatCurrency(currentReport.revenue.total) }}</span>
            </div>
            <div class="pl-row total">
              <strong>Total Ingresos</strong>
              <strong class="income-amount">{{ formatCurrency(currentReport.revenue.total) }}</strong>
            </div>
          </div>

          <div class="pl-section">
            <h3>📤 Gastos Operativos</h3>
            <div class="pl-row">
              <span>Gastos Fijos</span>
              <span class="expense-amount">{{ formatCurrency(currentReport.expenses.operatingExpenses.fixed) }}</span>
            </div>
            <div class="pl-row">
              <span>Gastos Variables</span>
              <span class="expense-amount">{{ formatCurrency(currentReport.expenses.operatingExpenses.variable) }}</span>
            </div>
            <div class="pl-row subtotal">
              <span>Subtotal Gastos Operativos</span>
              <span class="expense-amount">{{ formatCurrency(currentReport.expenses.operatingExpenses.total) }}</span>
            </div>
          </div>

          <div class="pl-section">
            <h3>👥 Gastos de Nómina</h3>
            <div class="pl-row">
              <span>Nómina de Personal</span>
              <span class="expense-amount">{{ formatCurrency(currentReport.expenses.payroll) }}</span>
            </div>
          </div>

          <div class="pl-section">
            <h3>💰 Utilidad/Pérdida</h3>
            <div class="pl-row total">
              <strong>Total Gastos</strong>
              <strong class="expense-amount">{{ formatCurrency(currentReport.expenses.total) }}</strong>
            </div>
            <div class="pl-row final" :class="{ profit: currentReport.profit.gross >= 0, loss: currentReport.profit.gross < 0 }">
              <strong>{{ currentReport.profit.status === 'profit' ? 'UTILIDAD' : 'PÉRDIDA' }}</strong>
              <strong class="final-amount">{{ formatCurrency(currentReport.profit.gross) }}</strong>
            </div>
            <div class="pl-row">
              <span>Margen de Utilidad</span>
              <span :class="{ 'text-success': currentReport.profit.margin > 0, 'text-danger': currentReport.profit.margin < 0 }">
                {{ currentReport.profit.margin }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Balance General -->
      <div v-if="selectedReportType === 'balance-sheet'" class="report-section">
        <h2>⚖️ Balance General</h2>
        <p class="report-period">Fecha de Corte: {{ formatDate(currentReport.date) }}</p>

        <div class="balance-sheet-grid">
          <!-- Activos -->
          <div class="balance-column">
            <h3 class="column-header assets-header">ACTIVOS</h3>

            <div class="balance-group">
              <h4>Activos Circulantes</h4>
              <div class="balance-row">
                <span>Efectivo y Bancos</span>
                <span>{{ formatCurrency(currentReport.assets.current.cash) }}</span>
              </div>
              <div class="balance-row">
                <span>Cuentas por Cobrar</span>
                <span>{{ formatCurrency(currentReport.assets.current.receivables) }}</span>
              </div>
              <div class="balance-row subtotal">
                <strong>Total Activos Circulantes</strong>
                <strong>{{ formatCurrency(currentReport.assets.current.total) }}</strong>
              </div>
            </div>

            <div class="balance-group">
              <h4>Activos Fijos</h4>
              <div class="balance-row">
                <span>Equipos y Maquinaria</span>
                <span>{{ formatCurrency(currentReport.assets.fixed.equipment) }}</span>
              </div>
              <div class="balance-row subtotal">
                <strong>Total Activos Fijos</strong>
                <strong>{{ formatCurrency(currentReport.assets.fixed.total) }}</strong>
              </div>
            </div>

            <div class="balance-row total assets-total">
              <strong>TOTAL ACTIVOS</strong>
              <strong>{{ formatCurrency(currentReport.assets.total) }}</strong>
            </div>
          </div>

          <!-- Pasivos y Patrimonio -->
          <div class="balance-column">
            <h3 class="column-header liabilities-header">PASIVOS Y PATRIMONIO</h3>

            <div class="balance-group">
              <h4>Pasivos Circulantes</h4>
              <div class="balance-row">
                <span>Nómina por Pagar</span>
                <span>{{ formatCurrency(currentReport.liabilities.current.payroll) }}</span>
              </div>
              <div class="balance-row">
                <span>Otras Deudas</span>
                <span>{{ formatCurrency(currentReport.liabilities.current.other) }}</span>
              </div>
              <div class="balance-row subtotal">
                <strong>Total Pasivos</strong>
                <strong>{{ formatCurrency(currentReport.liabilities.total) }}</strong>
              </div>
            </div>

            <div class="balance-group">
              <h4>Patrimonio</h4>
              <div class="balance-row subtotal">
                <strong>Capital Contable</strong>
                <strong>{{ formatCurrency(currentReport.equity.total) }}</strong>
              </div>
            </div>

            <div class="balance-row total liabilities-total">
              <strong>TOTAL PASIVOS + PATRIMONIO</strong>
              <strong>{{ formatCurrency(currentReport.liabilities.total + currentReport.equity.total) }}</strong>
            </div>

            <div class="balance-verification" :class="{ balanced: currentReport.verification.balanced }">
              <span>{{ currentReport.verification.balanced ? '✓ Balance Correcto' : '⚠ Desbalanceado' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen Mensual -->
      <div v-if="selectedReportType === 'monthly-summary'" class="report-section">
        <h2>📅 Resumen Mensual Comparativo</h2>
        <p class="report-period">Año {{ currentReport.year }}</p>

        <div class="annual-summary">
          <div class="summary-card">
            <h4>Total Ingresos</h4>
            <p class="big-amount">{{ formatCurrency(currentReport.yearTotal.income) }}</p>
          </div>
          <div class="summary-card">
            <h4>Total Gastos</h4>
            <p class="big-amount expense">{{ formatCurrency(currentReport.yearTotal.totalExpenses) }}</p>
          </div>
          <div class="summary-card">
            <h4>Utilidad Anual</h4>
            <p class="big-amount" :class="{ income: currentReport.yearTotal.profit >= 0, expense: currentReport.yearTotal.profit < 0 }">
              {{ formatCurrency(currentReport.yearTotal.profit) }}
            </p>
          </div>
          <div class="summary-card">
            <h4>Margen Promedio</h4>
            <p class="big-amount">{{ currentReport.yearTotal.profitMargin }}%</p>
          </div>
        </div>

        <div class="monthly-table">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Nómina</th>
                <th>Total Gastos</th>
                <th>Utilidad</th>
                <th>Margen %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="monthData in currentReport.monthly" :key="monthData.month">
                <td><strong>{{ getMonthName(monthData.month) }}</strong></td>
                <td class="income">{{ formatCurrency(monthData.income) }}</td>
                <td class="expense">{{ formatCurrency(monthData.expenses) }}</td>
                <td class="expense">{{ formatCurrency(monthData.payroll) }}</td>
                <td class="expense">{{ formatCurrency(monthData.totalExpenses) }}</td>
                <td :class="{ income: monthData.profit >= 0, expense: monthData.profit < 0 }">
                  {{ formatCurrency(monthData.profit) }}
                </td>
                <td :class="{ 'text-success': monthData.profitMargin > 0, 'text-danger': monthData.profitMargin < 0 }">
                  {{ monthData.profitMargin }}%
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>TOTAL AÑO</strong></td>
                <td class="income"><strong>{{ formatCurrency(currentReport.yearTotal.income) }}</strong></td>
                <td class="expense"><strong>{{ formatCurrency(currentReport.yearTotal.expenses) }}</strong></td>
                <td class="expense"><strong>{{ formatCurrency(currentReport.yearTotal.payroll) }}</strong></td>
                <td class="expense"><strong>{{ formatCurrency(currentReport.yearTotal.totalExpenses) }}</strong></td>
                <td :class="{ income: currentReport.yearTotal.profit >= 0, expense: currentReport.yearTotal.profit < 0 }">
                  <strong>{{ formatCurrency(currentReport.yearTotal.profit) }}</strong>
                </td>
                <td><strong>{{ currentReport.yearTotal.profitMargin }}%</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="no-report">
      <p>Seleccione un tipo de reporte y haga clic en "Generar Reporte"</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'FinancialReports',
  data() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return {
      loading: false,
      selectedReportType: 'cash-flow',
      currentReport: null,
      reportTypes: [
        { id: 'cash-flow', label: 'Flujo de Efectivo', icon: '📈' },
        { id: 'profit-loss', label: 'Estado de Resultados', icon: '💼' },
        { id: 'balance-sheet', label: 'Balance General', icon: '⚖️' },
        { id: 'monthly-summary', label: 'Resumen Mensual', icon: '📅' }
      ],
      filters: {
        startDate: new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0],
        endDate: new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
        month: currentMonth,
        year: currentYear,
        balanceDate: new Date().toISOString().split('T')[0]
      },
      years: []
    };
  },
  mounted() {
    this.generateYears();
  },
  methods: {
    generateYears() {
      const currentYear = new Date().getFullYear();
      for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        this.years.push(i);
      }
    },
    selectReport(type) {
      this.selectedReportType = type;
      this.currentReport = null;
    },
    async loadReport() {
      this.loading = true;
      try {
        let endpoint = '';
        let params = {};

        switch (this.selectedReportType) {
          case 'cash-flow':
            endpoint = 'cash-flow';
            params = {
              startDate: this.filters.startDate,
              endDate: this.filters.endDate
            };
            break;
          case 'profit-loss':
            endpoint = 'profit-loss';
            params = {
              month: this.filters.month,
              year: this.filters.year
            };
            break;
          case 'balance-sheet':
            endpoint = 'balance-sheet';
            params = {
              date: this.filters.balanceDate
            };
            break;
          case 'monthly-summary':
            endpoint = 'monthly-summary';
            params = {
              year: this.filters.year
            };
            break;
        }

        const response = await axios.get(`${API_URL}accounting/${endpoint}`, {
          params,
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.currentReport = response.data;
      } catch (error) {
        console.error('Error al cargar reporte:', error);
        this.$toast?.error('Error al cargar reporte');
      } finally {
        this.loading = false;
      }
    },
    exportReport() {
      // TODO: Implementar exportación a PDF/Excel
      this.$toast?.info('Funcionalidad de exportación en desarrollo');
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('es-MX');
    },
    getMonthName(month) {
      const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return months[parseInt(month) - 1];
    }
  }
};
</script>

<style scoped>
.financial-reports {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #2c3e50;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.report-selector {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.report-btn {
  padding: 20px;
  border: 2px solid #ecf0f1;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.report-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.report-btn.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.report-btn .icon {
  font-size: 32px;
}

.report-btn .label {
  font-weight: 500;
  font-size: 14px;
}

.filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.loading {
  padding: 60px;
  text-align: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-report {
  padding: 60px;
  text-align: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  color: #999;
}

.report-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.report-section h2 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.report-period {
  color: #666;
  margin-bottom: 30px;
  font-style: italic;
}

.summary-boxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-box {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.summary-box.income {
  border-left-color: #27ae60;
}

.summary-box.expenses {
  border-left-color: #e74c3c;
}

.summary-box.payroll {
  border-left-color: #f39c12;
}

.summary-box.net {
  border-left-color: #9b59b6;
}

.summary-box h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.summary-box .amount {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.summary-box .amount.negative {
  color: #e74c3c;
}

.cash-flow-table,
.monthly-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

thead {
  background: #f8f9fa;
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #dee2e6;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f1f1;
}

.income {
  color: #27ae60;
  font-weight: 500;
}

.expense {
  color: #e74c3c;
  font-weight: 500;
}

.balance {
  font-weight: 700;
  color: #3498db;
}

.profit-loss-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pl-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.pl-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #2c3e50;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 10px;
}

.pl-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #ecf0f1;
}

.pl-row.subtotal {
  font-weight: 600;
  border-top: 1px solid #dee2e6;
  margin-top: 10px;
  padding-top: 10px;
}

.pl-row.total {
  font-size: 18px;
  border-top: 2px solid #2c3e50;
  margin-top: 10px;
  padding-top: 15px;
}

.pl-row.final {
  font-size: 22px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  border: none;
}

.pl-row.final.profit {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
}

.pl-row.final.loss {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
}

.income-amount {
  color: #27ae60;
  font-weight: 600;
}

.expense-amount {
  color: #e74c3c;
  font-weight: 600;
}

.final-amount {
  font-size: 26px;
}

.balance-sheet-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 30px;
  margin-top: 20px;
}

.balance-column {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.column-header {
  font-size: 20px;
  margin: 0 0 20px 0;
  padding: 15px;
  border-radius: 6px;
  text-align: center;
}

.assets-header {
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: white;
}

.liabilities-header {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
}

.balance-group {
  margin-bottom: 20px;
}

.balance-group h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.balance-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

.balance-row.subtotal {
  font-weight: 600;
  border-top: 1px solid #dee2e6;
  margin-top: 10px;
  padding-top: 10px;
}

.balance-row.total {
  font-size: 18px;
  font-weight: bold;
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: none;
  margin-top: 20px;
}

.assets-total {
  background: linear-gradient(135deg, #d6eaf8 0%, #aed6f1 100%);
  color: #1a5490;
}

.liabilities-total {
  background: linear-gradient(135deg, #fadbd8 0%, #f5b7b1 100%);
  color: #922b21;
}

.balance-verification {
  text-align: center;
  padding: 10px;
  margin-top: 20px;
  border-radius: 6px;
}

.balance-verification.balanced {
  background: #d4edda;
  color: #155724;
  font-weight: 600;
}

.annual-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.summary-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #666;
}

.big-amount {
  font-size: 28px;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.total-row {
  background: #f8f9fa;
  font-weight: bold;
}

.text-success {
  color: #27ae60;
}

.text-danger {
  color: #e74c3c;
}
</style>
