<template>
  <div class="accounting-dashboard">
    <div class="header">
      <div class="header-title">
        <h1>Dashboard Financiero</h1>
      </div>
      <div class="header-actions">
        <button @click="goToExpenses" class="btn btn-secondary">
          <span class="icon">💸</span>
          Gastos Fijos
        </button>
        <button @click="goToPayroll" class="btn btn-secondary">
          <span class="icon">👥</span>
          Nóminas
        </button>
        <button @click="goToReports" class="btn btn-secondary">
          <span class="icon">📊</span>
          Reportes
        </button>
      </div>
      <div class="period-selector">
        <select v-model="selectedMonth" @change="loadDashboard">
          <option value="1">Enero</option>
          <option value="2">Febrero</option>
          <option value="3">Marzo</option>
          <option value="4">Abril</option>
          <option value="5">Mayo</option>
          <option value="6">Junio</option>
          <option value="7">Julio</option>
          <option value="8">Agosto</option>
          <option value="9">Septiembre</option>
          <option value="10">Octubre</option>
          <option value="11">Noviembre</option>
          <option value="12">Diciembre</option>
        </select>
        <select v-model="selectedYear" @change="loadDashboard">
          <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando datos financieros...</p>
    </div>

    <div v-else-if="dashboard" class="dashboard-content">
      <!-- Resumen de métricas principales -->
      <div class="metrics-cards">
        <div class="metric-card income">
          <div class="metric-icon">💰</div>
          <div class="metric-info">
            <h3>Ingresos</h3>
            <p class="amount">{{ formatCurrency(dashboard.income.total) }}</p>
            <p class="subtitle">{{ dashboard.income.paymentsCount }} pagos</p>
          </div>
        </div>

        <div class="metric-card expenses">
          <div class="metric-icon">📊</div>
          <div class="metric-info">
            <h3>Gastos</h3>
            <p class="amount">{{ formatCurrency(dashboard.expenses.total) }}</p>
            <p class="subtitle">{{ dashboard.expenses.count }} registros</p>
          </div>
        </div>

        <div class="metric-card payroll">
          <div class="metric-icon">👥</div>
          <div class="metric-info">
            <h3>Nómina</h3>
            <p class="amount">{{ formatCurrency(dashboard.payroll.total) }}</p>
            <p class="subtitle">{{ dashboard.payroll.employeesCount }} empleados</p>
          </div>
        </div>

        <div class="metric-card profit" :class="{ negative: dashboard.profit.amount < 0 }">
          <div class="metric-icon">{{ dashboard.profit.amount >= 0 ? '📈' : '📉' }}</div>
          <div class="metric-info">
            <h3>Utilidad</h3>
            <p class="amount">{{ formatCurrency(dashboard.profit.amount) }}</p>
            <p class="subtitle">Margen: {{ dashboard.profit.margin }}%</p>
          </div>
        </div>
      </div>

      <!-- Gráfica de gastos por categoría -->
      <div class="expenses-chart-container">
        <h2>Top Gastos por Categoría</h2>
        <div class="expenses-list">
          <div
            v-for="expense in dashboard.topExpenses"
            :key="expense.category"
            class="expense-item"
          >
            <div class="expense-header">
              <span class="expense-icon">{{ expense.icon }}</span>
              <span class="expense-category">{{ expense.category }}</span>
              <span class="expense-amount">{{ formatCurrency(expense.amount) }}</span>
            </div>
            <div class="expense-bar">
              <div
                class="expense-bar-fill"
                :style="{ width: getExpensePercentage(expense.amount) + '%' }"
              ></div>
            </div>
            <div class="expense-count">{{ expense.count }} registro(s)</div>
          </div>
        </div>
      </div>

      <!-- Detalle de nómina -->
      <div class="payroll-summary">
        <h2>Resumen de Nómina</h2>
        <div class="payroll-stats">
          <div class="stat">
            <span class="label">Total:</span>
            <span class="value">{{ formatCurrency(dashboard.payroll.total) }}</span>
          </div>
          <div class="stat">
            <span class="label">Pagado:</span>
            <span class="value success">{{ formatCurrency(dashboard.payroll.paid) }}</span>
          </div>
          <div class="stat">
            <span class="label">Pendiente:</span>
            <span class="value warning">{{ formatCurrency(dashboard.payroll.pending) }}</span>
          </div>
          <div class="stat">
            <span class="label">Empleados:</span>
            <span class="value">{{ dashboard.payroll.employeesCount }}</span>
          </div>
        </div>
      </div>

      <!-- Botones de acceso rápido -->
      <div class="quick-actions">
        <button @click="goToExpenses" class="action-btn expenses-btn">
          <span class="icon">💸</span>
          <span>Gestionar Gastos</span>
        </button>
        <button @click="goToPayroll" class="action-btn payroll-btn">
          <span class="icon">💰</span>
          <span>Gestionar Nómina</span>
        </button>
        <button @click="goToReports" class="action-btn reports-btn">
          <span class="icon">📊</span>
          <span>Ver Reportes</span>
        </button>
      </div>
    </div>

    <div v-else class="error">
      <p>Error al cargar el dashboard financiero</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'AccountingDashboard',
  data() {
    return {
      loading: false,
      dashboard: null,
      selectedMonth: new Date().getMonth() + 1,
      selectedYear: new Date().getFullYear(),
      years: []
    };
  },
  mounted() {
    this.generateYears();
    this.loadDashboard();
  },
  methods: {
    generateYears() {
      const currentYear = new Date().getFullYear();
      for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        this.years.push(i);
      }
    },
    async loadDashboard() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_URL}accounting/dashboard`, {
          params: {
            month: this.selectedMonth,
            year: this.selectedYear
          },
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.dashboard = response.data;
      } catch (error) {
        console.error('Error al cargar dashboard:', error);
        this.$toast?.error('Error al cargar el dashboard financiero');
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    },
    getExpensePercentage(amount) {
      if (!this.dashboard || !this.dashboard.expenses.total) return 0;
      return (amount / this.dashboard.expenses.total) * 100;
    },
    goToExpenses() {
      this.$router.push('/accounting/expenses');
    },
    goToPayroll() {
      this.$router.push('/accounting/payroll');
    },
    goToReports() {
      this.$router.push('/accounting/reports');
    }
  }
};
</script>

<style scoped>
.accounting-dashboard {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-title h1 {
  font-size: 28px;
  color: #2c3e50;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.header-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.header-actions .btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.header-actions .btn-secondary:hover {
  background: #3498db;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(52, 152, 219, 0.3);
}

.header-actions .btn .icon {
  font-size: 16px;
}

.period-selector {
  display: flex;
  gap: 10px;
}

.period-selector select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.metric-card.income {
  border-left: 4px solid #27ae60;
}

.metric-card.expenses {
  border-left: 4px solid #e74c3c;
}

.metric-card.payroll {
  border-left: 4px solid #3498db;
}

.metric-card.profit {
  border-left: 4px solid #27ae60;
}

.metric-card.profit.negative {
  border-left: 4px solid #e74c3c;
}

.metric-icon {
  font-size: 40px;
}

.metric-info h3 {
  margin: 0;
  font-size: 14px;
  color: #666;
  font-weight: normal;
}

.metric-info .amount {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin: 5px 0;
}

.metric-info .subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.expenses-chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.expenses-chart-container h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #2c3e50;
}

.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.expense-item {
  padding: 10px 0;
}

.expense-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.expense-icon {
  font-size: 20px;
}

.expense-category {
  flex: 1;
  font-weight: 500;
  color: #2c3e50;
}

.expense-amount {
  font-weight: bold;
  color: #e74c3c;
}

.expense-bar {
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.expense-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #e74c3c, #c0392b);
  transition: width 0.3s ease;
}

.expense-count {
  font-size: 12px;
  color: #999;
}

.payroll-summary {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

.payroll-summary h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #2c3e50;
}

.payroll-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat .label {
  font-size: 14px;
  color: #666;
}

.stat .value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.stat .value.success {
  color: #27ae60;
}

.stat .value.warning {
  color: #f39c12;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.action-btn .icon {
  font-size: 24px;
}

.expenses-btn {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.payroll-btn {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.reports-btn {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}
</style>
