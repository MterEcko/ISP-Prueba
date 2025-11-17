<template>
  <div class="client-portal-invoices">
    <div class="header">
      <h1>Mis Facturas</h1>
      <button @click="goBack" class="btn-back">← Volver</button>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Estado:</label>
        <select v-model="filters.status" @change="loadInvoices">
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagado</option>
          <option value="overdue">Vencido</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Desde:</label>
        <input type="date" v-model="filters.startDate" @change="loadInvoices" />
      </div>
      <div class="filter-group">
        <label>Hasta:</label>
        <input type="date" v-model="filters.endDate" @change="loadInvoices" />
      </div>
    </div>

    <div v-if="loading" class="loading">
      <p>Cargando facturas...</p>
    </div>

    <div v-else-if="invoices.length > 0" class="invoices-container">
      <!-- Resumen -->
      <div class="summary-cards">
        <div class="summary-card total">
          <span class="icon">📊</span>
          <div class="info">
            <span class="label">Total</span>
            <span class="value">{{ formatCurrency(summary.total) }}</span>
          </div>
        </div>
        <div class="summary-card paid">
          <span class="icon">✅</span>
          <div class="info">
            <span class="label">Pagado</span>
            <span class="value">{{ formatCurrency(summary.paid) }}</span>
          </div>
        </div>
        <div class="summary-card pending">
          <span class="icon">⏳</span>
          <div class="info">
            <span class="label">Pendiente</span>
            <span class="value">{{ formatCurrency(summary.pending) }}</span>
          </div>
        </div>
      </div>

      <!-- Lista de facturas -->
      <div class="invoices-list">
        <div
          v-for="invoice in invoices"
          :key="invoice.id"
          class="invoice-card"
          :class="'status-' + invoice.status"
          @click="viewInvoiceDetail(invoice.id)"
        >
          <div class="invoice-header">
            <div class="invoice-number">
              <span class="label">Factura</span>
              <span class="number">#{{ invoice.invoiceNumber }}</span>
            </div>
            <span class="invoice-status" :class="'status-' + invoice.status">
              {{ getStatusText(invoice.status) }}
            </span>
          </div>

          <div class="invoice-body">
            <div class="invoice-dates">
              <div class="date-item">
                <span class="icon">📅</span>
                <div class="date-info">
                  <span class="date-label">Fecha de Emisión</span>
                  <span class="date-value">{{ formatDate(invoice.issueDate) }}</span>
                </div>
              </div>
              <div class="date-item">
                <span class="icon">⏰</span>
                <div class="date-info">
                  <span class="date-label">Fecha de Vencimiento</span>
                  <span class="date-value">{{ formatDate(invoice.dueDate) }}</span>
                </div>
              </div>
            </div>

            <div class="invoice-amounts">
              <div class="amount-row">
                <span class="label">Subtotal:</span>
                <span class="value">{{ formatCurrency(invoice.subtotal) }}</span>
              </div>
              <div class="amount-row" v-if="invoice.tax > 0">
                <span class="label">IVA:</span>
                <span class="value">{{ formatCurrency(invoice.tax) }}</span>
              </div>
              <div class="amount-row total">
                <span class="label">Total:</span>
                <span class="value">{{ formatCurrency(invoice.total) }}</span>
              </div>
            </div>
          </div>

          <div class="invoice-footer">
            <button @click.stop="viewInvoiceDetail(invoice.id)" class="btn-detail">
              Ver Detalle
            </button>
            <button
              v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
              @click.stop="payInvoice(invoice.id)"
              class="btn-pay"
            >
              💳 Pagar Ahora
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="no-invoices">
      <p>📭 No tienes facturas en este momento</p>
    </div>

    <!-- Modal de detalle -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Detalle de Factura #{{ selectedInvoice.invoiceNumber }}</h2>
          <button @click="closeDetailModal" class="btn-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="detail-section">
            <h3>Información General</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Estado:</span>
                <span class="value status" :class="'status-' + selectedInvoice.status">
                  {{ getStatusText(selectedInvoice.status) }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Emisión:</span>
                <span class="value">{{ formatDate(selectedInvoice.issueDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Fecha de Vencimiento:</span>
                <span class="value">{{ formatDate(selectedInvoice.dueDate) }}</span>
              </div>
              <div class="detail-item" v-if="selectedInvoice.paymentDate">
                <span class="label">Fecha de Pago:</span>
                <span class="value">{{ formatDate(selectedInvoice.paymentDate) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="selectedInvoice.items && selectedInvoice.items.length > 0">
            <h3>Detalle de Conceptos</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in selectedInvoice.items" :key="index">
                  <td>{{ item.description }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatCurrency(item.price) }}</td>
                  <td>{{ formatCurrency(item.quantity * item.price) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="detail-section totals">
            <div class="totals-row">
              <span class="label">Subtotal:</span>
              <span class="value">{{ formatCurrency(selectedInvoice.subtotal) }}</span>
            </div>
            <div class="totals-row" v-if="selectedInvoice.tax > 0">
              <span class="label">IVA ({{ selectedInvoice.taxRate || 16 }}%):</span>
              <span class="value">{{ formatCurrency(selectedInvoice.tax) }}</span>
            </div>
            <div class="totals-row total">
              <span class="label">Total:</span>
              <span class="value">{{ formatCurrency(selectedInvoice.total) }}</span>
            </div>
          </div>

          <div class="detail-section" v-if="selectedInvoice.notes">
            <h3>Notas</h3>
            <p>{{ selectedInvoice.notes }}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button @click="downloadInvoice(selectedInvoice.id)" class="btn-download">
            📥 Descargar PDF
          </button>
          <button
            v-if="selectedInvoice.status === 'pending' || selectedInvoice.status === 'overdue'"
            @click="payInvoice(selectedInvoice.id)"
            class="btn-pay"
          >
            💳 Pagar Ahora
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { API_URL } from '../../services/frontend_apiConfig';

export default {
  name: 'ClientPortalInvoices',
  data() {
    return {
      loading: false,
      invoices: [],
      filters: {
        status: '',
        startDate: '',
        endDate: ''
      },
      summary: {
        total: 0,
        paid: 0,
        pending: 0
      },
      showDetailModal: false,
      selectedInvoice: null
    };
  },
  mounted() {
    this.loadInvoices();
  },
  methods: {
    async loadInvoices() {
      this.loading = true;
      try {
        const response = await axios.get(`${API_URL}client-portal/invoices`, {
          params: this.filters,
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.invoices = response.data.invoices;
        this.calculateSummary();
      } catch (error) {
        console.error('Error al cargar facturas:', error);
        this.$toast?.error('Error al cargar las facturas');
      } finally {
        this.loading = false;
      }
    },
    calculateSummary() {
      this.summary = {
        total: this.invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0),
        paid: this.invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + parseFloat(inv.total), 0),
        pending: this.invoices
          .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
          .reduce((sum, inv) => sum + parseFloat(inv.total), 0)
      };
    },
    async viewInvoiceDetail(id) {
      try {
        const response = await axios.get(`${API_URL}client-portal/invoices/${id}`, {
          headers: {
            'x-access-token': localStorage.getItem('token')
          }
        });
        this.selectedInvoice = response.data.invoice;
        this.showDetailModal = true;
      } catch (error) {
        console.error('Error al cargar detalle:', error);
        this.$toast?.error('Error al cargar el detalle de la factura');
      }
    },
    closeDetailModal() {
      this.showDetailModal = false;
      this.selectedInvoice = null;
    },
    payInvoice(id) {
      this.$toast?.info('Redirigiendo a pasarela de pago...');
      // TODO: Integrar con pasarelas de pago reales
      this.$router.push(`/payment/${id}`);
    },
    downloadInvoice(id) {
      this.$toast?.info('Descargando factura...');
      // TODO: Implementar descarga de PDF
      window.open(`${API_URL}client-portal/invoices/${id}/pdf`, '_blank');
    },
    getStatusText(status) {
      const statusMap = {
        pending: 'Pendiente',
        paid: 'Pagado',
        overdue: 'Vencido',
        cancelled: 'Cancelado'
      };
      return statusMap[status] || status;
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(amount);
    },
    formatDate(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    goBack() {
      this.$router.push('/client-portal/dashboard');
    }
  }
};
</script>

<style scoped>
.client-portal-invoices {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
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

.btn-back {
  padding: 10px 20px;
  background: #ecf0f1;
  color: #2c3e50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-back:hover {
  background: #bdc3c7;
}

.filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-group label {
  font-size: 14px;
  color: #666;
}

.filter-group select,
.filter-group input {
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

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid;
}

.summary-card.total {
  border-left-color: #3498db;
}

.summary-card.paid {
  border-left-color: #27ae60;
}

.summary-card.pending {
  border-left-color: #e74c3c;
}

.summary-card .icon {
  font-size: 32px;
}

.summary-card .info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.summary-card .label {
  font-size: 14px;
  color: #666;
}

.summary-card .value {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
}

.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.invoice-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.invoice-card.status-pending {
  border-left-color: #f39c12;
}

.invoice-card.status-paid {
  border-left-color: #27ae60;
}

.invoice-card.status-overdue {
  border-left-color: #e74c3c;
}

.invoice-card.status-cancelled {
  border-left-color: #95a5a6;
}

.invoice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.invoice-number {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.invoice-number .label {
  font-size: 12px;
  color: #666;
}

.invoice-number .number {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
}

.invoice-status {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.invoice-status.status-pending {
  background: #fff3cd;
  color: #856404;
}

.invoice-status.status-paid {
  background: #d4edda;
  color: #155724;
}

.invoice-status.status-overdue {
  background: #f8d7da;
  color: #721c24;
}

.invoice-status.status-cancelled {
  background: #e2e3e5;
  color: #383d41;
}

.invoice-body {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 15px;
}

.invoice-dates {
  display: flex;
  gap: 20px;
}

.date-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-item .icon {
  font-size: 20px;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.date-label {
  font-size: 12px;
  color: #666;
}

.date-value {
  font-size: 14px;
  color: #2c3e50;
}

.invoice-amounts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-row.total {
  padding-top: 8px;
  border-top: 2px solid #dee2e6;
  font-weight: bold;
}

.amount-row .label {
  color: #666;
}

.amount-row .value {
  color: #2c3e50;
  font-weight: 500;
}

.amount-row.total .value {
  font-size: 18px;
  color: #e74c3c;
}

.invoice-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-detail {
  padding: 8px 15px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-detail:hover {
  background: #2980b9;
}

.btn-pay {
  padding: 8px 15px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.btn-pay:hover {
  background: #229954;
}

.no-invoices {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.no-invoices p {
  font-size: 18px;
  color: #666;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #2c3e50;
}

.btn-close {
  width: 30px;
  height: 30px;
  border: none;
  background: #e74c3c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}

.btn-close:hover {
  background: #c0392b;
}

.modal-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h3 {
  font-size: 18px;
  color: #2c3e50;
  margin: 0 0 15px 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item .label {
  font-size: 14px;
  color: #666;
}

.detail-item .value {
  font-size: 16px;
  color: #2c3e50;
  font-weight: 500;
}

.detail-item .value.status {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #dee2e6;
}

.items-table th {
  background: #f8f9fa;
  font-weight: 500;
  color: #666;
}

.items-table td {
  color: #2c3e50;
}

.detail-section.totals {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
}

.totals-row.total {
  padding-top: 10px;
  border-top: 2px solid #dee2e6;
  font-size: 18px;
  font-weight: bold;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #dee2e6;
}

.btn-download {
  padding: 10px 20px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-download:hover {
  background: #2980b9;
}
</style>
