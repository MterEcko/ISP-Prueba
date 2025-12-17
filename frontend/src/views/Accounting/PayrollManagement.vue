<template>
  <div class="payroll-management">
    <div class="header">
      <h1>Gestión de Nómina</h1>
      <div class="header-actions">
        <button @click="showGenerateModal = true" class="btn btn-success">
          <span class="icon">🔄</span>
          Generar Nóminas Mensuales
        </button>
        <button @click="openPayrollModal()" class="btn btn-primary">
          <span class="icon">➕</span>
          Crear Nómina Individual
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Empleado:</label>
        <select v-model="filters.userId" @change="loadPayrolls">
          <option value="">Todos</option>
          <option v-for="emp in employees" :key="emp.id" :value="emp.id">
            {{ emp.fullName }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Periodo:</label>
        <input type="month" v-model="filters.period" @change="loadPayrolls" />
      </div>

      <div class="filter-group">
        <label>Estado:</label>
        <select v-model="filters.status" @change="loadPayrolls">
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Tipo:</label>
        <select v-model="filters.paymentType" @change="loadPayrolls">
          <option value="">Todos</option>
          <option value="monthly">Mensual</option>
          <option value="biweekly">Quincenal</option>
          <option value="weekly">Semanal</option>
          <option value="bonus">Bono</option>
        </select>
      </div>

      <button @click="clearFilters" class="btn btn-secondary">Limpiar Filtros</button>
    </div>

    <!-- Resumen rápido -->
    <div v-if="summary" class="summary-cards">
      <div class="summary-card total">
        <div class="icon">💰</div>
        <div class="info">
          <h3>Total Nómina</h3>
          <p class="amount">{{ formatCurrency(summary.amounts.totalNet) }}</p>
        </div>
      </div>

      <div class="summary-card paid">
        <div class="icon">✅</div>
        <div class="info">
          <h3>Pagado</h3>
          <p class="amount">{{ formatCurrency(summary.amounts.totalPaid) }}</p>
          <p class="subtitle">{{ summary.byStatus.paid }} nóminas</p>
        </div>
      </div>

      <div class="summary-card pending">
        <div class="icon">⏳</div>
        <div class="info">
          <h3>Pendiente</h3>
          <p class="amount">{{ formatCurrency(summary.amounts.totalPending) }}</p>
          <p class="subtitle">{{ summary.byStatus.pending }} nóminas</p>
        </div>
      </div>
    </div>

    <!-- Lista de nóminas -->
    <div v-if="loading" class="loading">Cargando nóminas...</div>

    <div v-else class="payrolls-table">
      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Periodo</th>
            <th>Tipo</th>
            <th>Salario Base</th>
            <th>Deducciones</th>
            <th>Salario Neto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payroll in payrolls" :key="payroll.id">
            <td>
              <div class="employee-info">
                <strong>{{ payroll.employee.fullName }}</strong>
                <small>{{ payroll.employee.position }}</small>
              </div>
            </td>
            <td>{{ formatPeriod(payroll.period) }}</td>
            <td>
              <span class="badge" :class="'type-' + payroll.paymentType">
                {{ getPaymentTypeLabel(payroll.paymentType) }}
              </span>
            </td>
            <td>{{ formatCurrency(payroll.baseSalary) }}</td>
            <td class="deductions">{{ formatCurrency(payroll.totalDeductions) }}</td>
            <td class="net-salary">{{ formatCurrency(payroll.netSalary) }}</td>
            <td>
              <span class="badge" :class="'status-' + payroll.status">
                {{ getStatusLabel(payroll.status) }}
              </span>
            </td>
            <td class="actions">
              <button
                v-if="payroll.status === 'pending'"
                @click="openPaymentModal(payroll)"
                class="btn-icon btn-success"
                title="Registrar Pago"
              >
                💵
              </button>
              <button
                @click="viewPayroll(payroll)"
                class="btn-icon"
                title="Ver Detalle"
              >
                👁️
              </button>
              <button
                v-if="payroll.status === 'pending'"
                @click="cancelPayroll(payroll.id)"
                class="btn-icon btn-danger"
                title="Cancelar"
              >
                ❌
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="payrolls.length === 0" class="no-data">
        No se encontraron nóminas con los filtros seleccionados
      </div>

      <!-- Paginación -->
      <div v-if="pagination.pages > 1" class="pagination">
        <button @click="changePage(pagination.page - 1)" :disabled="pagination.page === 1">
          Anterior
        </button>
        <span>Página {{ pagination.page }} de {{ pagination.pages }}</span>
        <button @click="changePage(pagination.page + 1)" :disabled="pagination.page === pagination.pages">
          Siguiente
        </button>
      </div>
    </div>

    <!-- Modal de generar nóminas -->
    <div v-if="showGenerateModal" class="modal-overlay" @click.self="showGenerateModal = false">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>Generar Nóminas Mensuales</h2>
          <button @click="showGenerateModal = false" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <p class="info-text">
            Esto generará automáticamente las nóminas para todos los empleados activos con salario configurado.
          </p>

          <div class="form-group">
            <label>Mes y Año</label>
            <input type="month" v-model="generateForm.monthYear" required />
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showGenerateModal = false" class="btn btn-secondary">Cancelar</button>
          <button @click="generateMonthlyPayrolls" class="btn btn-success">Generar</button>
        </div>
      </div>
    </div>

    <!-- Modal de registrar pago -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal modal-small">
        <div class="modal-header">
          <h2>Registrar Pago de Nómina</h2>
          <button @click="closePaymentModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedPayroll" class="payroll-summary-box">
            <p><strong>Empleado:</strong> {{ selectedPayroll.employee.fullName }}</p>
            <p><strong>Periodo:</strong> {{ formatPeriod(selectedPayroll.period) }}</p>
            <p><strong>Monto a Pagar:</strong>
              <span class="amount-highlight">{{ formatCurrency(selectedPayroll.netSalary) }}</span>
            </p>
          </div>

          <div class="form-group">
            <label>Método de Pago *</label>
            <select v-model="paymentForm.paymentMethod" required>
              <option value="transfer">Transferencia</option>
              <option value="cash">Efectivo</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          <div class="form-group">
            <label>Referencia de Pago</label>
            <input type="text" v-model="paymentForm.paymentReference"
                   placeholder="Ej: TRANSFER-12345, Cheque #001" />
          </div>

          <div class="form-group">
            <label>Notas</label>
            <textarea v-model="paymentForm.notes" rows="3"
                      placeholder="Notas adicionales sobre este pago"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closePaymentModal" class="btn btn-secondary">Cancelar</button>
          <button @click="registerPayment" class="btn btn-success">Registrar Pago</button>
        </div>
      </div>
    </div>

    <!-- Modal de crear nómina individual -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>Crear Nómina Individual</h2>
          <button @click="closeCreateModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-grid">
            <!-- Información básica -->
            <div class="form-section">
              <h3>Información Básica</h3>

              <div class="form-group">
                <label>Empleado *</label>
                <select v-model="createForm.userId" required @change="onEmployeeChange">
                  <option value="">Seleccionar empleado</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.fullName }} - {{ emp.position }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Periodo (Mes/Año) *</label>
                <input type="month" v-model="createForm.period" required />
              </div>

              <div class="form-group">
                <label>Tipo de Pago *</label>
                <select v-model="createForm.paymentType" required @change="onPaymentTypeChange">
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                  <option value="bonus">Bono Especial</option>
                </select>
              </div>
            </div>

            <!-- Ingresos -->
            <div class="form-section">
              <h3>💰 Ingresos</h3>

              <div class="form-group">
                <label>Salario Base *</label>
                <input
                  type="number"
                  v-model.number="createForm.baseSalary"
                  step="0.01"
                  @input="calculateTotals"
                  required
                />
              </div>

              <div class="form-group">
                <label>Horas Extras</label>
                <div class="input-group">
                  <input
                    type="number"
                    v-model.number="createForm.overtimeHours"
                    placeholder="Horas"
                    step="0.5"
                    @input="calculateOvertimeAmount"
                  />
                  <span class="input-addon">hrs</span>
                </div>
              </div>

              <div class="form-group">
                <label>Pago por Horas Extras</label>
                <input
                  type="number"
                  v-model.number="createForm.overtimeAmount"
                  step="0.01"
                  @input="calculateTotals"
                />
              </div>

              <div class="form-group">
                <label>💼 Comisiones (Soportes, Instalaciones, Ventas)</label>
                <input
                  type="number"
                  v-model.number="createForm.commissions"
                  step="0.01"
                  placeholder="Ej: 500.00"
                  @input="calculateTotals"
                />
                <small class="help-text">Comisiones por trabajos realizados</small>
              </div>

              <div class="form-group">
                <label>🎁 Bonos Adicionales</label>
                <input
                  type="number"
                  v-model.number="createForm.bonus"
                  step="0.01"
                  placeholder="Ej: 1000.00"
                  @input="calculateTotals"
                />
              </div>

              <div class="total-box income">
                <strong>Total Ingresos:</strong>
                <span>{{ formatCurrency(getTotalIncome()) }}</span>
              </div>
            </div>

            <!-- Deducciones -->
            <div class="form-section">
              <h3>📉 Deducciones</h3>

              <div class="form-group">
                <label>ISR (Impuesto Sobre la Renta)</label>
                <div class="input-group">
                  <input
                    type="number"
                    v-model.number="createForm.taxPercent"
                    min="0"
                    max="35"
                    step="0.1"
                    @input="calculateTaxes"
                  />
                  <span class="input-addon">%</span>
                  <input
                    type="number"
                    v-model.number="createForm.taxDeduction"
                    step="0.01"
                    @input="calculateTotals"
                    class="amount-input"
                  />
                </div>
                <small class="help-text">Sugerido: 10-16% según salario</small>
              </div>

              <div class="form-group">
                <label>IMSS (Seguro Social)</label>
                <div class="input-group">
                  <input
                    type="number"
                    v-model.number="createForm.socialSecurityPercent"
                    min="0"
                    max="10"
                    step="0.1"
                    @input="calculateSocialSecurity"
                  />
                  <span class="input-addon">%</span>
                  <input
                    type="number"
                    v-model.number="createForm.socialSecurityDeduction"
                    step="0.01"
                    @input="calculateTotals"
                    class="amount-input"
                  />
                </div>
                <small class="help-text">Típico: 2.5-3%</small>
              </div>

              <div class="form-group">
                <label>Otras Deducciones</label>
                <input
                  type="number"
                  v-model.number="createForm.otherDeductions"
                  step="0.01"
                  placeholder="Préstamos, descuentos, etc."
                  @input="calculateTotals"
                />
              </div>

              <div class="form-group">
                <label>Notas sobre Deducciones</label>
                <textarea
                  v-model="createForm.deductionNotes"
                  rows="2"
                  placeholder="Ej: Préstamo personal $500, Falta injustificada $200"
                ></textarea>
              </div>

              <div class="total-box deduction">
                <strong>Total Deducciones:</strong>
                <span>{{ formatCurrency(getTotalDeductions()) }}</span>
              </div>
            </div>

            <!-- Resumen y Notas -->
            <div class="form-section full-width">
              <div class="salary-summary">
                <div class="summary-row">
                  <span>Total Ingresos:</span>
                  <span class="income-amount">{{ formatCurrency(getTotalIncome()) }}</span>
                </div>
                <div class="summary-row">
                  <span>Total Deducciones:</span>
                  <span class="deduction-amount">{{ formatCurrency(getTotalDeductions()) }}</span>
                </div>
                <div class="summary-row final">
                  <strong>Salario Neto a Pagar:</strong>
                  <strong class="net-amount">{{ formatCurrency(getNetSalary()) }}</strong>
                </div>
              </div>

              <div class="form-group">
                <label>Notas Generales</label>
                <textarea
                  v-model="createForm.notes"
                  rows="3"
                  placeholder="Notas adicionales sobre esta nómina..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeCreateModal" class="btn btn-secondary">Cancelar</button>
          <button @click="createIndividualPayroll" class="btn btn-primary">
            💾 Crear Nómina
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de detalle de nómina -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Detalle de Nómina</h2>
          <button @click="showDetailModal = false" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="selectedPayroll" class="payroll-detail">
            <div class="detail-section">
              <h3>Información del Empleado</h3>
              <p><strong>Nombre:</strong> {{ selectedPayroll.employee.fullName }}</p>
              <p><strong>Puesto:</strong> {{ selectedPayroll.employee.position }}</p>
              <p><strong>Periodo:</strong> {{ formatPeriod(selectedPayroll.period) }}</p>
              <p><strong>Tipo:</strong> {{ getPaymentTypeLabel(selectedPayroll.paymentType) }}</p>
            </div>

            <div class="detail-section">
              <h3>Ingresos</h3>
              <div class="amount-row">
                <span>Salario Base:</span>
                <span>{{ formatCurrency(selectedPayroll.baseSalary) }}</span>
              </div>
              <div v-if="selectedPayroll.overtimeAmount > 0" class="amount-row">
                <span>Horas Extras ({{ selectedPayroll.overtimeHours }}h):</span>
                <span>{{ formatCurrency(selectedPayroll.overtimeAmount) }}</span>
              </div>
              <div v-if="selectedPayroll.bonus > 0" class="amount-row">
                <span>Bonos:</span>
                <span>{{ formatCurrency(selectedPayroll.bonus) }}</span>
              </div>
              <div class="amount-row total">
                <span>Total Ingresos:</span>
                <span>{{ formatCurrency(getTotalIncome(selectedPayroll)) }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h3>Deducciones</h3>
              <div class="amount-row">
                <span>ISR (Impuestos):</span>
                <span class="deduction">{{ formatCurrency(selectedPayroll.taxDeduction) }}</span>
              </div>
              <div class="amount-row">
                <span>IMSS (Seguro Social):</span>
                <span class="deduction">{{ formatCurrency(selectedPayroll.socialSecurityDeduction) }}</span>
              </div>
              <div v-if="selectedPayroll.otherDeductions > 0" class="amount-row">
                <span>Otras Deducciones:</span>
                <span class="deduction">{{ formatCurrency(selectedPayroll.otherDeductions) }}</span>
              </div>
              <div class="amount-row total">
                <span>Total Deducciones:</span>
                <span class="deduction">{{ formatCurrency(selectedPayroll.totalDeductions) }}</span>
              </div>
            </div>

            <div class="detail-section final-amount">
              <h3>Salario Neto a Pagar</h3>
              <p class="net-amount">{{ formatCurrency(selectedPayroll.netSalary) }}</p>
            </div>

            <div v-if="selectedPayroll.status === 'paid'" class="detail-section">
              <h3>Información de Pago</h3>
              <p><strong>Fecha de Pago:</strong> {{ formatDate(selectedPayroll.paymentDate) }}</p>
              <p><strong>Método:</strong> {{ getPaymentMethodLabel(selectedPayroll.paymentMethod) }}</p>
              <p v-if="selectedPayroll.paymentReference">
                <strong>Referencia:</strong> {{ selectedPayroll.paymentReference }}
              </p>
            </div>

            <div v-if="selectedPayroll.notes" class="detail-section">
              <h3>Notas</h3>
              <p>{{ selectedPayroll.notes }}</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showDetailModal = false" class="btn btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'PayrollManagement',
  data() {
    return {
      loading: false,
      payrolls: [],
      employees: [],
      summary: null,
      showGenerateModal: false,
      showPaymentModal: false,
      showDetailModal: false,
      showCreateModal: false,
      selectedPayroll: null,
      generateForm: {
        monthYear: new Date().toISOString().substring(0, 7) // YYYY-MM
      },
      paymentForm: {
        paymentMethod: 'transfer',
        paymentReference: '',
        notes: ''
      },
      createForm: {
        userId: '',
        period: new Date().toISOString().substring(0, 7),
        paymentType: 'monthly',
        baseSalary: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        commissions: 0,
        bonus: 0,
        taxPercent: 12,
        taxDeduction: 0,
        socialSecurityPercent: 3,
        socialSecurityDeduction: 0,
        otherDeductions: 0,
        deductionNotes: '',
        notes: ''
      },
      filters: {
        userId: '',
        period: '',
        status: '',
        paymentType: ''
      },
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
      }
    };
  },
  mounted() {
    this.loadEmployees();
    this.loadPayrolls();
    this.loadSummary();
  },
  methods: {
    async loadEmployees() {
      try {
        const response = await axios.get(`${API_URL}users`, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });
        this.employees = response.data.filter(u => u.role !== 'cliente');
      } catch (error) {
        console.error('Error al cargar empleados:', error);
      }
    },
    async loadPayrolls() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        };

        const response = await axios.get(`${API_URL}payroll`, {
          params,
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.payrolls = response.data.payrolls;
        this.pagination = response.data.pagination;
      } catch (error) {
        console.error('Error al cargar nóminas:', error);
        this.$toast?.error('Error al cargar nóminas');
      } finally {
        this.loading = false;
      }
    },
    async loadSummary() {
      try {
        const params = {};
        if (this.filters.period) {
          params.period = this.filters.period;
        }

        const response = await axios.get(`${API_URL}payroll/summary/totals`, {
          params,
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.summary = response.data;
      } catch (error) {
        console.error('Error al cargar resumen:', error);
      }
    },
    async generateMonthlyPayrolls() {
      try {
        if (!this.generateForm.monthYear) {
          this.$toast?.error('Por favor seleccione mes y año');
          return;
        }

        const [year, month] = this.generateForm.monthYear.split('-');

        const response = await axios.post(`${API_URL}payroll/generate-monthly`, {
          month: parseInt(month),
          year: parseInt(year)
        }, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.$toast?.success(response.data.message);
        this.showGenerateModal = false;
        this.loadPayrolls();
        this.loadSummary();
      } catch (error) {
        console.error('Error al generar nóminas:', error);
        this.$toast?.error('Error al generar nóminas');
      }
    },
    openPaymentModal(payroll) {
      this.selectedPayroll = payroll;
      this.paymentForm = {
        paymentMethod: 'transfer',
        paymentReference: '',
        notes: ''
      };
      this.showPaymentModal = true;
    },
    closePaymentModal() {
      this.showPaymentModal = false;
      this.selectedPayroll = null;
      this.paymentForm = {
        paymentMethod: 'transfer',
        paymentReference: '',
        notes: ''
      };
    },
    async registerPayment() {
      try {
        if (!this.paymentForm.paymentMethod) {
          this.$toast?.error('Por favor seleccione un método de pago');
          return;
        }

        await axios.post(`${API_URL}payroll/${this.selectedPayroll.id}/pay`, this.paymentForm, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.$toast?.success('Pago registrado exitosamente');
        this.closePaymentModal();
        this.loadPayrolls();
        this.loadSummary();
      } catch (error) {
        console.error('Error al registrar pago:', error);
        this.$toast?.error('Error al registrar pago');
      }
    },
    viewPayroll(payroll) {
      this.selectedPayroll = payroll;
      this.showDetailModal = true;
    },
    async cancelPayroll(id) {
      const reason = prompt('¿Por qué desea cancelar esta nómina?');
      if (!reason) return;

      try {
        await axios.post(`${API_URL}payroll/${id}/cancel`, { reason }, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.$toast?.success('Nómina cancelada exitosamente');
        this.loadPayrolls();
        this.loadSummary();
      } catch (error) {
        console.error('Error al cancelar nómina:', error);
        this.$toast?.error('Error al cancelar nómina');
      }
    },
    openPayrollModal() {
      this.resetCreateForm();
      this.showCreateModal = true;
    },
    closeCreateModal() {
      this.showCreateModal = false;
      this.resetCreateForm();
    },
    resetCreateForm() {
      this.createForm = {
        userId: '',
        period: new Date().toISOString().substring(0, 7),
        paymentType: 'monthly',
        baseSalary: 0,
        overtimeHours: 0,
        overtimeAmount: 0,
        commissions: 0,
        bonus: 0,
        taxPercent: 12,
        taxDeduction: 0,
        socialSecurityPercent: 3,
        socialSecurityDeduction: 0,
        otherDeductions: 0,
        deductionNotes: '',
        notes: ''
      };
    },
    onEmployeeChange() {
      const employee = this.employees.find(e => e.id === this.createForm.userId);
      if (employee && employee.salary) {
        this.createForm.baseSalary = parseFloat(employee.salary);
        this.calculateTotals();
      }
    },
    onPaymentTypeChange() {
      // Ajustar salario base según tipo de pago
      const employee = this.employees.find(e => e.id === this.createForm.userId);
      if (employee && employee.salary) {
        const monthlySalary = parseFloat(employee.salary);

        switch (this.createForm.paymentType) {
          case 'weekly':
            this.createForm.baseSalary = monthlySalary / 4;
            break;
          case 'biweekly':
            this.createForm.baseSalary = monthlySalary / 2;
            break;
          case 'monthly':
            this.createForm.baseSalary = monthlySalary;
            break;
          case 'bonus':
            this.createForm.baseSalary = 0;
            break;
        }

        this.calculateTotals();
      }
    },
    calculateOvertimeAmount() {
      const employee = this.employees.find(e => e.id === this.createForm.userId);
      if (employee && employee.salary && this.createForm.overtimeHours > 0) {
        const monthlySalary = parseFloat(employee.salary);
        const hourlyRate = monthlySalary / 160; // 160 horas al mes aproximadamente
        const overtimeRate = hourlyRate * 2; // Horas extras al doble
        this.createForm.overtimeAmount = this.createForm.overtimeHours * overtimeRate;
      }
      this.calculateTotals();
    },
    calculateTaxes() {
      const totalIncome = this.getTotalIncome();
      this.createForm.taxDeduction = totalIncome * (this.createForm.taxPercent / 100);
      this.calculateTotals();
    },
    calculateSocialSecurity() {
      const baseSalary = parseFloat(this.createForm.baseSalary) || 0;
      this.createForm.socialSecurityDeduction = baseSalary * (this.createForm.socialSecurityPercent / 100);
      this.calculateTotals();
    },
    calculateTotals() {
      // Calcular deducciones automáticas
      const totalIncome = this.getTotalIncome();
      const baseSalary = parseFloat(this.createForm.baseSalary) || 0;

      // Auto-calcular ISR y IMSS si no se han modificado manualmente
      this.createForm.taxDeduction = totalIncome * (this.createForm.taxPercent / 100);
      this.createForm.socialSecurityDeduction = baseSalary * (this.createForm.socialSecurityPercent / 100);
    },
    getTotalIncome() {
      return (parseFloat(this.createForm.baseSalary) || 0) +
             (parseFloat(this.createForm.overtimeAmount) || 0) +
             (parseFloat(this.createForm.commissions) || 0) +
             (parseFloat(this.createForm.bonus) || 0);
    },
    getTotalDeductions() {
      return (parseFloat(this.createForm.taxDeduction) || 0) +
             (parseFloat(this.createForm.socialSecurityDeduction) || 0) +
             (parseFloat(this.createForm.otherDeductions) || 0);
    },
    getNetSalary() {
      return this.getTotalIncome() - this.getTotalDeductions();
    },
    async createIndividualPayroll() {
      try {
        if (!this.createForm.userId || !this.createForm.period) {
          this.$toast?.error('Por favor complete los campos requeridos');
          return;
        }

        if (this.getTotalIncome() <= 0) {
          this.$toast?.error('El salario base debe ser mayor a cero');
          return;
        }

        // Preparar datos para enviar al backend
        const payrollData = {
          userId: this.createForm.userId,
          period: this.createForm.period,
          paymentType: this.createForm.paymentType,
          baseSalary: parseFloat(this.createForm.baseSalary) || 0,
          overtimeHours: parseFloat(this.createForm.overtimeHours) || 0,
          overtimeAmount: parseFloat(this.createForm.overtimeAmount) || 0,
          // Combinar comisiones y bonos en el campo bonus
          bonus: (parseFloat(this.createForm.commissions) || 0) + (parseFloat(this.createForm.bonus) || 0),
          taxDeduction: parseFloat(this.createForm.taxDeduction) || 0,
          socialSecurityDeduction: parseFloat(this.createForm.socialSecurityDeduction) || 0,
          otherDeductions: parseFloat(this.createForm.otherDeductions) || 0,
          deductionNotes: this.createForm.deductionNotes,
          notes: this.createForm.notes
        };

        // Agregar nota sobre comisiones si existen
        if (parseFloat(this.createForm.commissions) > 0) {
          payrollData.notes = (payrollData.notes ? payrollData.notes + '\n' : '') +
                             `Comisiones: ${this.formatCurrency(this.createForm.commissions)}`;
        }

        await axios.post(`${API_URL}payroll`, payrollData, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.$toast?.success('Nómina individual creada exitosamente');
        this.closeCreateModal();
        this.loadPayrolls();
        this.loadSummary();
      } catch (error) {
        console.error('Error al crear nómina individual:', error);
        const errorMsg = error.response?.data?.error || 'Error al crear nómina individual';
        this.$toast?.error(errorMsg);
      }
    },
    clearFilters() {
      this.filters = {
        userId: '',
        period: '',
        status: '',
        paymentType: ''
      };
      this.loadPayrolls();
      this.loadSummary();
    },
    changePage(page) {
      if (page >= 1 && page <= this.pagination.pages) {
        this.pagination.page = page;
        this.loadPayrolls();
      }
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
    formatPeriod(period) {
      const [year, month] = period.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${months[parseInt(month) - 1]} ${year}`;
    },
    getPaymentTypeLabel(type) {
      const labels = {
        monthly: 'Mensual',
        biweekly: 'Quincenal',
        weekly: 'Semanal',
        bonus: 'Bono'
      };
      return labels[type] || type;
    },
    getStatusLabel(status) {
      const labels = {
        pending: 'Pendiente',
        paid: 'Pagado',
        cancelled: 'Cancelado'
      };
      return labels[status] || status;
    },
    getPaymentMethodLabel(method) {
      const labels = {
        cash: 'Efectivo',
        transfer: 'Transferencia',
        check: 'Cheque'
      };
      return labels[method] || method;
    }
  }
};
</script>

<style scoped>
/* Uso los mismos estilos base de ExpenseManagement */
.payroll-management {
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

.header-actions {
  display: flex;
  gap: 10px;
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

.btn-secondary {
  background: #ecf0f1;
  color: #2c3e50;
}

.btn-success {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
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

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  gap: 15px;
  align-items: center;
}

.summary-card.total {
  border-left: 4px solid #3498db;
}

.summary-card.paid {
  border-left: 4px solid #27ae60;
}

.summary-card.pending {
  border-left: 4px solid #f39c12;
}

.summary-card .icon {
  font-size: 40px;
}

.summary-card .info h3 {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #666;
  font-weight: normal;
}

.summary-card .amount {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

.summary-card .subtitle {
  font-size: 12px;
  color: #999;
  margin: 5px 0 0 0;
}

.payrolls-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #dee2e6;
}

td {
  padding: 12px 15px;
  border-bottom: 1px solid #f1f1f1;
}

tr:hover {
  background: #f8f9fa;
}

.employee-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.employee-info small {
  color: #999;
  font-size: 12px;
}

.deductions {
  color: #e74c3c;
  font-weight: 500;
}

.net-salary {
  font-weight: 700;
  color: #27ae60;
  font-size: 15px;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge.status-pending {
  background: #fff3cd;
  color: #856404;
}

.badge.status-paid {
  background: #d4edda;
  color: #155724;
}

.badge.status-cancelled {
  background: #f8d7da;
  color: #721c24;
}

.badge.type-monthly {
  background: #d1ecf1;
  color: #0c5460;
}

.badge.type-biweekly {
  background: #e2e3e5;
  color: #383d41;
}

.badge.type-weekly {
  background: #f8d7da;
  color: #721c24;
}

.badge.type-bonus {
  background: #d4edda;
  color: #155724;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: #f8f9fa;
}

.btn-icon.btn-success:hover {
  background: #d4edda;
}

.btn-icon.btn-danger:hover {
  background: #f8d7da;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #666;
}

.no-data {
  padding: 40px;
  text-align: center;
  color: #999;
}

.pagination {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small {
  max-width: 500px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.info-text {
  background: #e7f3ff;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  color: #0c5460;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.payroll-summary-box {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.payroll-summary-box p {
  margin: 5px 0;
}

.amount-highlight {
  color: #27ae60;
  font-weight: bold;
  font-size: 18px;
}

.payroll-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.detail-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #2c3e50;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 8px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #ecf0f1;
}

.amount-row:last-child {
  border-bottom: none;
}

.amount-row.total {
  font-weight: bold;
  font-size: 16px;
  border-top: 2px solid #dee2e6;
  padding-top: 10px;
  margin-top: 5px;
}

.amount-row .deduction {
  color: #e74c3c;
}

.detail-section.final-amount {
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  color: white;
  text-align: center;
}

.detail-section.final-amount h3 {
  color: white;
  border-bottom-color: rgba(255,255,255,0.3);
}

.net-amount {
  font-size: 32px;
  font-weight: bold;
  margin: 10px 0 0 0;
}

/* Modal de crear nómina individual */
.modal-large {
  max-width: 900px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.form-section.full-width {
  grid-column: 1 / -1;
}

.form-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #2c3e50;
  border-bottom: 2px solid #dee2e6;
  padding-bottom: 10px;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-addon {
  background: #ecf0f1;
  padding: 8px 12px;
  border-radius: 4px;
  font-weight: 500;
  color: #7f8c8d;
  min-width: 50px;
  text-align: center;
}

.amount-input {
  flex: 2;
}

.help-text {
  display: block;
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 4px;
  font-style: italic;
}

.total-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
  font-size: 15px;
}

.total-box.income {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border: 1px solid #c3e6cb;
}

.total-box.deduction {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.salary-summary {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #ecf0f1;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.final {
  border-top: 2px solid #27ae60;
  padding-top: 15px;
  margin-top: 10px;
  font-size: 18px;
}

.income-amount {
  color: #27ae60;
  font-weight: 600;
}

.deduction-amount {
  color: #e74c3c;
  font-weight: 600;
}

.summary-row.final .net-amount {
  color: #27ae60;
  font-size: 24px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal-large {
    width: 95%;
    max-width: none;
  }

  .input-group {
    flex-wrap: wrap;
  }
}
</style>
