<template>
  <div class="expense-management">
    <div class="header">
      <h1>Gestión de Gastos</h1>
      <div class="header-actions">
        <button @click="showCategoryModal = true" class="btn btn-secondary">
          <span class="icon">📂</span>
          Gestionar Categorías
        </button>
        <button @click="openExpenseModal()" class="btn btn-primary">
          <span class="icon">➕</span>
          Registrar Gasto
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Categoría:</label>
        <select v-model="filters.categoryId" @change="loadExpenses">
          <option value="">Todas</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.icon }} {{ cat.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>Fecha Inicio:</label>
        <input type="date" v-model="filters.startDate" @change="loadExpenses" />
      </div>

      <div class="filter-group">
        <label>Fecha Fin:</label>
        <input type="date" v-model="filters.endDate" @change="loadExpenses" />
      </div>

      <div class="filter-group">
        <label>Tipo:</label>
        <select v-model="filters.recurring" @change="loadExpenses">
          <option value="">Todos</option>
          <option value="true">Recurrentes</option>
          <option value="false">Únicos</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Activos:</label>
        <select v-model="filters.isAsset" @change="loadExpenses">
          <option value="">Todos</option>
          <option value="true">Equipos/Activos</option>
          <option value="false">Gastos normales</option>
        </select>
      </div>

      <button @click="clearFilters" class="btn btn-secondary">Limpiar Filtros</button>
    </div>

    <!-- Lista de gastos -->
    <div v-if="loading" class="loading">Cargando gastos...</div>

    <div v-else class="expenses-table">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Tipo</th>
            <th>Proveedor</th>
            <th>Método de Pago</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in expenses" :key="expense.id">
            <td>{{ formatDate(expense.expenseDate) }}</td>
            <td>
              <span class="category-badge">
                {{ expense.category.icon }} {{ expense.category.name }}
              </span>
            </td>
            <td>{{ expense.description }}</td>
            <td class="amount">{{ formatCurrency(expense.amount) }}</td>
            <td>
              <span v-if="expense.recurring" class="badge badge-info">🔄 Recurrente</span>
              <span v-else-if="expense.isAsset" class="badge badge-warning">💻 Activo</span>
              <span v-else class="badge badge-default">Único</span>
            </td>
            <td>{{ expense.supplier || '-' }}</td>
            <td>{{ getPaymentMethodLabel(expense.paymentMethod) }}</td>
            <td class="actions">
              <button @click="openExpenseModal(expense)" class="btn-icon" title="Editar">
                ✏️
              </button>
              <button @click="deleteExpense(expense.id)" class="btn-icon btn-danger" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="expenses.length === 0" class="no-data">
        No se encontraron gastos con los filtros seleccionados
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

    <!-- Modal de gasto -->
    <div v-if="showExpenseModal" class="modal-overlay" @click.self="closeExpenseModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingExpense ? 'Editar Gasto' : 'Registrar Nuevo Gasto' }}</h2>
          <button @click="closeExpenseModal" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Categoría *</label>
            <select v-model="expenseForm.categoryId" required>
              <option value="">Seleccionar categoría</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.icon }} {{ cat.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Monto *</label>
            <input type="number" v-model="expenseForm.amount" step="0.01" required />
          </div>

          <div class="form-group">
            <label>Descripción *</label>
            <textarea v-model="expenseForm.description" rows="3" required></textarea>
          </div>

          <div class="form-group">
            <label>Fecha del Gasto *</label>
            <input type="date" v-model="expenseForm.expenseDate" required />
          </div>

          <div class="form-group checkbox">
            <label>
              <input type="checkbox" v-model="expenseForm.recurring" />
              Gasto Recurrente
            </label>
          </div>

          <div v-if="expenseForm.recurring" class="form-group">
            <label>Periodo de Recurrencia</label>
            <select v-model="expenseForm.recurringPeriod">
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          <div class="form-group">
            <label>Proveedor</label>
            <input type="text" v-model="expenseForm.supplier" />
          </div>

          <div class="form-group">
            <label>Número de Factura</label>
            <input type="text" v-model="expenseForm.invoiceNumber" />
          </div>

          <div class="form-group">
            <label>Método de Pago</label>
            <select v-model="expenseForm.paymentMethod">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="check">Cheque</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div class="form-group">
            <label>Referencia de Pago</label>
            <input type="text" v-model="expenseForm.paymentReference" />
          </div>

          <div class="form-group checkbox">
            <label>
              <input type="checkbox" v-model="expenseForm.isAsset" />
              Es un Activo (Equipo/Inventario)
            </label>
          </div>

          <div v-if="expenseForm.isAsset" class="asset-fields">
            <div class="form-group">
              <label>Años de Depreciación</label>
              <input type="number" v-model="expenseForm.depreciationYears" min="1" />
            </div>

            <div class="form-group">
              <label>Número de Serie</label>
              <input type="text" v-model="expenseForm.assetSerialNumber" />
            </div>
          </div>

          <div class="form-group">
            <label>Notas</label>
            <textarea v-model="expenseForm.notes" rows="2"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeExpenseModal" class="btn btn-secondary">Cancelar</button>
          <button @click="saveExpense" class="btn btn-primary">
            {{ editingExpense ? 'Actualizar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de categorías -->
    <div v-if="showCategoryModal" class="modal-overlay" @click.self="showCategoryModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Gestión de Categorías</h2>
          <button @click="showCategoryModal = false" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <button @click="initializeCategories" class="btn btn-info mb-3">
            📂 Inicializar Categorías Predefinidas
          </button>

          <div class="categories-list">
            <div v-for="cat in categories" :key="cat.id" class="category-item">
              <span class="category-icon">{{ cat.icon }}</span>
              <span class="category-name">{{ cat.name }}</span>
              <span class="category-type" :class="cat.type">{{ cat.type }}</span>
              <span class="category-status" :class="{ active: cat.active }">
                {{ cat.active ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="showCategoryModal = false" class="btn btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ExpenseManagement',
  data() {
    return {
      loading: false,
      expenses: [],
      categories: [],
      showExpenseModal: false,
      showCategoryModal: false,
      editingExpense: null,
      expenseForm: {
        categoryId: '',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        recurring: false,
        recurringPeriod: 'monthly',
        supplier: '',
        invoiceNumber: '',
        paymentMethod: 'cash',
        paymentReference: '',
        notes: '',
        isAsset: false,
        depreciationYears: 5,
        assetSerialNumber: ''
      },
      filters: {
        categoryId: '',
        startDate: '',
        endDate: '',
        recurring: '',
        isAsset: ''
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
    this.loadCategories();
    this.loadExpenses();
  },
  methods: {
    async loadCategories() {
      try {
        const response = await axios.get(`${API_URL}expenses/categories/all`, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });
        this.categories = response.data;
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        this.$toast?.error('Error al cargar categorías');
      }
    },
    async loadExpenses() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit,
          ...this.filters
        };

        const response = await axios.get(`${API_URL}expenses`, {
          params,
          headers: { 'x-access-token': localStorage.getItem('token') }
        });

        this.expenses = response.data.expenses;
        this.pagination = response.data.pagination;
      } catch (error) {
        console.error('Error al cargar gastos:', error);
        this.$toast?.error('Error al cargar gastos');
      } finally {
        this.loading = false;
      }
    },
    openExpenseModal(expense = null) {
      if (expense) {
        this.editingExpense = expense;
        this.expenseForm = { ...expense };
      } else {
        this.editingExpense = null;
        this.resetForm();
      }
      this.showExpenseModal = true;
    },
    closeExpenseModal() {
      this.showExpenseModal = false;
      this.editingExpense = null;
      this.resetForm();
    },
    resetForm() {
      this.expenseForm = {
        categoryId: '',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        recurring: false,
        recurringPeriod: 'monthly',
        supplier: '',
        invoiceNumber: '',
        paymentMethod: 'cash',
        paymentReference: '',
        notes: '',
        isAsset: false,
        depreciationYears: 5,
        assetSerialNumber: ''
      };
    },
    async saveExpense() {
      try {
        if (!this.expenseForm.categoryId || !this.expenseForm.amount || !this.expenseForm.description) {
          this.$toast?.error('Por favor complete los campos requeridos');
          return;
        }

        if (this.editingExpense) {
          await axios.put(`${API_URL}expenses/${this.editingExpense.id}`, this.expenseForm, {
            headers: { 'x-access-token': localStorage.getItem('token') }
          });
          this.$toast?.success('Gasto actualizado exitosamente');
        } else {
          await axios.post(`${API_URL}expenses`, this.expenseForm, {
            headers: { 'x-access-token': localStorage.getItem('token') }
          });
          this.$toast?.success('Gasto registrado exitosamente');
        }

        this.closeExpenseModal();
        this.loadExpenses();
      } catch (error) {
        console.error('Error al guardar gasto:', error);
        this.$toast?.error('Error al guardar gasto');
      }
    },
    async deleteExpense(id) {
      if (!confirm('¿Está seguro de eliminar este gasto?')) return;

      try {
        await axios.delete(`${API_URL}expenses/${id}`, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });
        this.$toast?.success('Gasto eliminado exitosamente');
        this.loadExpenses();
      } catch (error) {
        console.error('Error al eliminar gasto:', error);
        this.$toast?.error('Error al eliminar gasto');
      }
    },
    async initializeCategories() {
      try {
        const response = await axios.post(`${API_URL}expenses/categories/initialize`, {}, {
          headers: { 'x-access-token': localStorage.getItem('token') }
        });
        this.$toast?.success(response.data.message);
        this.loadCategories();
      } catch (error) {
        console.error('Error al inicializar categorías:', error);
        this.$toast?.error('Error al inicializar categorías');
      }
    },
    clearFilters() {
      this.filters = {
        categoryId: '',
        startDate: '',
        endDate: '',
        recurring: '',
        isAsset: ''
      };
      this.loadExpenses();
    },
    changePage(page) {
      if (page >= 1 && page <= this.pagination.pages) {
        this.pagination.page = page;
        this.loadExpenses();
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
    getPaymentMethodLabel(method) {
      const labels = {
        cash: 'Efectivo',
        transfer: 'Transferencia',
        card: 'Tarjeta',
        check: 'Cheque',
        other: 'Otro'
      };
      return labels[method] || method;
    }
  }
};
</script>

<style scoped>
.expense-management {
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

.btn-info {
  background: #3498db;
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

.expenses-table {
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

.amount {
  font-weight: 600;
  color: #e74c3c;
}

.category-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #ecf0f1;
  border-radius: 4px;
  font-size: 13px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge-info {
  background: #d4e6f1;
  color: #2874a6;
}

.badge-warning {
  background: #fcf3cf;
  color: #b7950b;
}

.badge-default {
  background: #ecf0f1;
  color: #7f8c8d;
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

.btn-icon.btn-danger:hover {
  background: #fee;
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

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group.checkbox input {
  width: auto;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mb-3 {
  margin-bottom: 15px;
  width: 100%;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.category-icon {
  font-size: 20px;
}

.category-name {
  flex: 1;
  font-weight: 500;
}

.category-type {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.category-type.fixed {
  background: #d4e6f1;
  color: #2874a6;
}

.category-type.variable {
  background: #fcf3cf;
  color: #b7950b;
}

.category-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.category-status.active {
  background: #d5f4e6;
  color: #27ae60;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #666;
}
</style>
