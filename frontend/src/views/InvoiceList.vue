<template>
  <div class="invoice-list">
    <div class="header">
      <h2>Gestión de Facturas</h2>
      <div class="header-actions">
        <button @click="openNewInvoiceForm" class="add-button">
          📄 Nueva Factura
        </button>
        <button @click="bulkProcessOverdue" class="process-button">
          ⚡ Procesar Vencidas
        </button>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <input
          type="text"
          v-model="filters.search"
          placeholder="Buscar por número de factura o cliente..."
          @keyup.enter="loadInvoices"
          class="search-input"
        />
        <button @click="loadInvoices" class="search-btn">🔍</button>
      </div>

      <div class="filter-group">
        <select v-model="filters.status" @change="loadInvoices">
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagadas</option>
          <option value="overdue">Vencidas</option>
          <option value="cancelled">Canceladas</option>
          <option value="partial">Pago Parcial</option>
        </select>

        <input
          type="date"
          v-model="filters.startDate"
          @change="loadInvoices"
          class="date-input"
        />
        <span class="date-separator">a</span>
        <input
          type="date"
          v-model="filters.endDate"
          @change="loadInvoices"
          class="date-input"
        />
      </div>

      <div class="filter-group">
        <select v-model="filters.sortBy" @change="loadInvoices">
          <option value="createdAt">Fecha de Creación</option>
          <option value="dueDate">Fecha de Vencimiento</option>
          <option value="amount">Monto</option>
          <option value="clientName">Cliente</option>
        </select>

        <select v-model="filters.sortOrder" @change="loadInvoices">
          <option value="desc">Descendente</option>
          <option value="asc">Ascendente</option>
        </select>
      </div>
    </div>

    <!-- Resumen -->
    <div class="summary-cards">
      <div class="summary-card">
        <span class="label">Total Facturas</span>
        <span class="value">{{ pagination.totalItems }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Monto Total</span>
        <span class="value">${{ formatNumber(summary.totalAmount) }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Pendientes</span>
        <span class="value">{{ summary.pendingCount }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Vencidas</span>
        <span class="value">{{ summary.overdueCount }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando facturas...
    </div>

    <div v-else-if="invoices.length === 0" class="no-data">
      No se encontraron facturas con los filtros aplicados.
    </div>

    <div v-else class="table-container">
      <table class="invoice-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                @change="toggleSelectAll"
                :checked="selectedInvoices.length === invoices.length"
              />
            </th>
            <th>N° Factura</th>
            <th>Cliente</th>
            <th>Fecha Emisión</th>
            <th>Fecha Vencimiento</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Días Vencidos</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invoice in invoices" :key="invoice.id" :class="{ selected: selectedInvoices.includes(invoice.id) }">
            <td>
              <input
                type="checkbox"
                :value="invoice.id"
                v-model="selectedInvoices"
              />
            </td>
            <td class="invoice-number">{{ invoice.invoiceNumber }}</td>
            <td>
              <div class="client-info">
                <span class="client-name">{{ invoice.clientName }}</span>
                <span class="client-contact">{{ invoice.clientPhone || invoice.clientEmail }}</span>
              </div>
            </td>
            <td>{{ formatDate(invoice.createdAt) }}</td>
            <td :class="{ overdue: isOverdue(invoice.dueDate) }">
              {{ formatDate(invoice.dueDate) }}
            </td>
            <td class="amount">${{ formatNumber(invoice.totalAmount) }}</td>
            <td>
              <span :class="['status-badge', getStatusInfo(invoice.status).class]">
                {{ getStatusInfo(invoice.status).label }}
              </span>
            </td>
            <td class="overdue-days">
              <span v-if="invoice.status === 'overdue'" class="days-overdue">
                {{ calculateOverdueDays(invoice.dueDate) }} días
              </span>
              <span v-else>-</span>
            </td>
            <td class="actions">
              <button @click="viewInvoice(invoice)" class="action-btn view" title="Ver detalles">
                👁️
              </button>
              <button @click="downloadPDF(invoice)" class="action-btn download" title="Descargar PDF">
                📄
              </button>
              <button
                v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
                @click="markAsPaid(invoice)"
                class="action-btn paid"
                title="Marcar como pagada"
              >
                ✅
              </button>
              <button @click="editInvoice(invoice)" class="action-btn edit" title="Editar">
                ✏️
              </button>
              <button
                v-if="invoice.status !== 'cancelled'"
                @click="cancelInvoice(invoice)"
                class="action-btn cancel"
                title="Cancelar"
              >
                ❌
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Acciones en lote -->
    <div v-if="selectedInvoices.length > 0" class="bulk-actions">
      <div class="bulk-info">
        {{ selectedInvoices.length }} factura(s) seleccionada(s)
      </div>
      <div class="bulk-buttons">
        <button @click="bulkMarkAsPaid" class="bulk-btn paid">
          Marcar como Pagadas
        </button>
        <button @click="bulkSendReminders" class="bulk-btn remind">
          Enviar Recordatorios
        </button>
        <button @click="bulkDownloadPDF" class="bulk-btn download">
          Descargar PDFs
        </button>
        <button @click="clearSelection" class="bulk-btn clear">
          Limpiar Selección
        </button>
      </div>
    </div>

    <!-- Paginación -->
    <div class="pagination">
      <button
        @click="changePage(pagination.currentPage - 1)"
        :disabled="pagination.currentPage === 1"
        class="page-btn"
      >
        ← Anterior
      </button>

      <div class="page-info">
        Página {{ pagination.currentPage }} de {{ pagination.totalPages }}
        ({{ pagination.totalItems }} facturas)
      </div>

      <button
        @click="changePage(pagination.currentPage + 1)"
        :disabled="pagination.currentPage === pagination.totalPages"
        class="page-btn"
      >
        Siguiente →
      </button>
    </div>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        <div class="modal-actions">
          <button @click="closeConfirmModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="confirmAction" class="btn-confirm">
            {{ confirmModal.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceService from '../services/invoice.service';

export default {
  name: 'InvoiceList',
  data() {
    return {
      invoices: [],
      loading: false,
      selectedInvoices: [],
      filters: {
        search: '',
        status: '',
        startDate: '',
        endDate: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 20
      },
      summary: {
        totalAmount: 0,
        pendingCount: 0,
        overdueCount: 0
      },
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        action: null,
        data: null
      }
    };
  },
  created() {
    this.loadInvoices();
    this.loadSummary();
  },
  methods: {
    async loadInvoices() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.currentPage,
          limit: this.pagination.pageSize,
          search: this.filters.search || undefined,
          status: this.filters.status || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined,
          sortBy: this.filters.sortBy,
          sortOrder: this.filters.sortOrder
        };

        const response = await InvoiceService.getAllInvoices(params);
        this.invoices = response.data.invoices || response.data;
        
        if (response.data.pagination) {
          this.pagination = {
            ...this.pagination,
            ...response.data.pagination
          };
        }

        this.selectedInvoices = [];
      } catch (error) {
        console.error('Error cargando facturas:', error);
        this.invoices = [];
      } finally {
        this.loading = false;
      }
    },

    async loadSummary() {
      try {
        const params = {
          status: this.filters.status || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined
        };

        const response = await InvoiceService.getInvoiceStatistics(params);
        this.summary = {
          totalAmount: response.data.totalAmount || 0,
          pendingCount: response.data.pendingCount || 0,
          overdueCount: response.data.overdueCount || 0
        };
      } catch (error) {
        console.error('Error cargando resumen:', error);
      }
    },

    changePage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.pagination.currentPage = page;
        this.loadInvoices();
      }
    },

    toggleSelectAll() {
      if (this.selectedInvoices.length === this.invoices.length) {
        this.selectedInvoices = [];
      } else {
        this.selectedInvoices = this.invoices.map(invoice => invoice.id);
      }
    },

    clearSelection() {
      this.selectedInvoices = [];
    },

    viewInvoice(invoice) {
      this.$router.push(`/billing/invoices/${invoice.id}`);
    },

    editInvoice(invoice) {
      this.$router.push(`/billing/invoices/${invoice.id}/edit`);
    },

    async downloadPDF(invoice) {
      try {
        const response = await InvoiceService.downloadInvoicePDF(invoice.id);
        
        // Crear enlace de descarga
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `factura-${invoice.invoiceNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error descargando PDF:', error);
        alert('Error al descargar el PDF de la factura');
      }
    },

    markAsPaid(invoice) {
      this.showConfirmation(
        'Marcar como Pagada',
        `¿Está seguro que desea marcar la factura ${invoice.invoiceNumber} como pagada?`,
        'Marcar como Pagada',
        'markAsPaid',
        invoice
      );
    },

    cancelInvoice(invoice) {
      this.showConfirmation(
        'Cancelar Factura',
        `¿Está seguro que desea cancelar la factura ${invoice.invoiceNumber}? Esta acción no se puede deshacer.`,
        'Cancelar Factura',
        'cancelInvoice',
        invoice
      );
    },

    bulkMarkAsPaid() {
      this.showConfirmation(
        'Marcar Facturas como Pagadas',
        `¿Está seguro que desea marcar ${this.selectedInvoices.length} factura(s) como pagadas?`,
        'Marcar como Pagadas',
        'bulkMarkAsPaid',
        this.selectedInvoices
      );
    },

    async bulkSendReminders() {
      try {
        // Implementar envío masivo de recordatorios
        console.log('Enviando recordatorios a:', this.selectedInvoices);
        alert(`Recordatorios enviados a ${this.selectedInvoices.length} cliente(s)`);
        this.clearSelection();
      } catch (error) {
        console.error('Error enviando recordatorios:', error);
        alert('Error enviando recordatorios');
      }
    },

    async bulkDownloadPDF() {
      try {
        // Implementar descarga masiva de PDFs
        for (const invoiceId of this.selectedInvoices) {
          const invoice = this.invoices.find(inv => inv.id === invoiceId);
          if (invoice) {
            await this.downloadPDF(invoice);
            // Pequeña pausa entre descargas
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        this.clearSelection();
      } catch (error) {
        console.error('Error en descarga masiva:', error);
        alert('Error en la descarga masiva');
      }
    },

    async bulkProcessOverdue() {
      try {
        const response = await InvoiceService.processOverdueInvoices();
        alert(`Se procesaron ${response.data.processedCount || 0} facturas vencidas`);
        this.loadInvoices();
        this.loadSummary();
      } catch (error) {
        console.error('Error procesando facturas vencidas:', error);
        alert('Error procesando facturas vencidas');
      }
    },

    openNewInvoiceForm() {
      this.$router.push('/billing/invoices/new');
    },

    showConfirmation(title, message, confirmText, action, data) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        action,
        data
      };
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
      this.confirmModal = {
        title: '',
        message: '',
        confirmText: '',
        action: null,
        data: null
      };
    },

    async confirmAction() {
      try {
        const { action, data } = this.confirmModal;

        switch (action) {
          case 'markAsPaid':
            await InvoiceService.markAsPaid(data.id);
            break;
          case 'cancelInvoice':
            await InvoiceService.cancelInvoice(data.id);
            break;
          case 'bulkMarkAsPaid':
            for (const invoiceId of data) {
              await InvoiceService.markAsPaid(invoiceId);
            }
            this.clearSelection();
            break;
        }

        this.closeConfirmModal();
        this.loadInvoices();
        this.loadSummary();
        
      } catch (error) {
        console.error('Error ejecutando acción:', error);
        alert('Error ejecutando la acción');
      }
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

    isOverdue(dueDate) {
      if (!dueDate) return false;
      return new Date(dueDate) < new Date();
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },

    getStatusInfo(status) {
      return InvoiceService.formatInvoiceStatus(status);
    }
  }
};
</script>

<style scoped>
.invoice-list {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.header h2 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.add-button, .process-button {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.add-button {
  background-color: #4CAF50;
  color: white;
}

.process-button {
  background-color: #FF9800;
  color: white;
}

.filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
}

.search-btn {
  padding: 8px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

select, .date-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.date-separator {
  color: #666;
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-card .label {
  color: #666;
  font-size: 14px;
}

.summary-card .value {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.loading, .no-data {
  text-align: center;
  padding: 40px;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
}

.invoice-table th,
.invoice-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.invoice-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
}

.invoice-table tr:hover {
  background-color: #f8f9fa;
}

.invoice-table tr.selected {
  background-color: #e3f2fd;
}

.invoice-number {
  font-family: monospace;
  font-weight: bold;
  color: #1976d2;
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
  font-weight: bold;
  text-align: right;
}

.overdue {
  color: #f44336;
  font-weight: bold;
}

.overdue-days {
  text-align: center;
}

.days-overdue {
  background-color: #ffebee;
  color: #c62828;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.status-pending {
  background-color: #e3f2fd;
  color: #1976d2;
}

.status-paid {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-overdue {
  background-color: #ffebee;
  color: #c62828;
}

.status-cancelled {
  background-color: #f5f5f5;
  color: #757575;
}

.status-partial {
  background-color: #fff3e0;
  color: #ef6c00;
}

.actions {
  display: flex;
  gap: 5px;
}

.action-btn {
  padding: 6px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  background-color: #f5f5f5;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #e0e0e0;
}

.action-btn.view {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn.download {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.action-btn.paid {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.action-btn.edit {
  background-color: #fff3e0;
  color: #ef6c00;
}

.action-btn.cancel {
  background-color: #ffebee;
  color: #c62828;
}

.bulk-actions {
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bulk-info {
  font-weight: 500;
  color: #333;
}

.bulk-buttons {
  display: flex;
  gap: 10px;
}

.bulk-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.bulk-btn.paid {
  background-color: #4CAF50;
  color: white;
}

.bulk-btn.remind {
  background-color: #FF9800;
  color: white;
}

.bulk-btn.download {
  background-color: #9C27B0;
  color: white;
}

.bulk-btn.clear {
  background-color: #757575;
  color: white;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 15px 0;
}

.page-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  background-color: #f5f5f5;
  color: #ccc;
  cursor: not-allowed;
}

.page-info {
  color: #666;
  font-size: 14px;
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
  margin: 0 0 15px 0;
  color: #333;
}

.modal-content p {
  margin: 0 0 25px 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  background-color: #f44336;
  color: white;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr 1fr;
  }

  .table-container {
    overflow-x: scroll;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .bulk-buttons {
    justify-content: space-between;
  }
}
</style>