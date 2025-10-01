<template>
  <div class="payment-list">
    <div class="header">
      <h2>Gestión de Pagos</h2>
      <div class="header-actions">
        <button @click="openManualPaymentForm" class="add-button">
          💳 Registrar Pago Manual
        </button>
        <button @click="goToPendingPayments" class="pending-button">
          ⏳ Pagos Pendientes ({{ pendingCount }})
        </button>
      </div>
    </div>

    <!-- Navegación por pestañas -->
    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'all' }]"
        @click="setActiveTab('all')"
      >
        Todos los Pagos
      </button>
      <button
        :class="['tab', { active: activeTab === 'pending' }]"
        @click="setActiveTab('pending')"
      >
        Pendientes de Aprobación
      </button>
      <button
        :class="['tab', { active: activeTab === 'completed' }]"
        @click="setActiveTab('completed')"
      >
        Completados
      </button>
      <button
        :class="['tab', { active: activeTab === 'failed' }]"
        @click="setActiveTab('failed')"
      >
        Fallidos
      </button>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <input
          type="text"
          v-model="filters.search"
          placeholder="Buscar por cliente, referencia o número de factura..."
          @keyup.enter="loadPayments"
          class="search-input"
        />
        <button @click="loadPayments" class="search-btn">🔍</button>
      </div>

      <div class="filter-group">
        <select v-model="filters.paymentMethod" @change="loadPayments">
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="online">Pago en Línea</option>
          <option value="oxxo">OXXO</option>
          <option value="spei">SPEI</option>
        </select>

        <select v-model="filters.gatewayId" @change="loadPayments">
          <option value="">Todas las pasarelas</option>
          <option v-for="gateway in paymentGateways" :key="gateway.id" :value="gateway.id">
            {{ gateway.name }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <input
          type="date"
          v-model="filters.startDate"
          @change="loadPayments"
          class="date-input"
        />
        <span class="date-separator">a</span>
        <input
          type="date"
          v-model="filters.endDate"
          @change="loadPayments"
          class="date-input"
        />
      </div>
    </div>

    <!-- Resumen de estadísticas -->
    <div class="summary-cards">
      <div class="summary-card">
        <span class="label">Total Pagos</span>
        <span class="value">{{ pagination.totalItems }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Monto Total</span>
        <span class="value">${{ formatNumber(summary.totalAmount) }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Completados Hoy</span>
        <span class="value">{{ summary.todayCompleted }}</span>
      </div>
      <div class="summary-card">
        <span class="label">Pendientes</span>
        <span class="value">{{ summary.pendingCount }}</span>
      </div>
    </div>

    <div v-if="loading" class="loading">
      Cargando pagos...
    </div>

    <div v-else-if="payments.length === 0" class="no-data">
      No se encontraron pagos con los filtros aplicados.
    </div>

    <div v-else class="table-container">
      <table class="payment-table">
        <thead>
          <tr>
            <th v-if="activeTab === 'pending'">
              <input
                type="checkbox"
                @change="toggleSelectAll"
                :checked="selectedPayments.length === payments.length"
              />
            </th>
            <th>ID Pago</th>
            <th>Cliente</th>
            <th>Factura</th>
            <th>Monto</th>
            <th>Método</th>
            <th>Pasarela</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="payment in payments" :key="payment.id" :class="{ selected: selectedPayments.includes(payment.id) }">
            <td v-if="activeTab === 'pending'">
              <input
                type="checkbox"
                :value="payment.id"
                v-model="selectedPayments"
              />
            </td>
            <td class="payment-id">
              {{ payment.paymentReference || payment.id }}
            </td>
            <td>
              <div class="client-info">
                <span class="client-name">{{ payment.clientName }}</span>
                <span class="client-contact">{{ payment.clientPhone || payment.clientEmail }}</span>
              </div>
            </td>
            <td class="invoice-ref">
              <span v-if="payment.invoiceNumber" class="invoice-number">
                {{ payment.invoiceNumber }}
              </span>
              <span v-else class="no-invoice">Sin factura</span>
            </td>
            <td class="amount">${{ formatNumber(payment.amount) }}</td>
            <td>
              <span class="payment-method">
                {{ formatPaymentMethod(payment.paymentMethod) }}
              </span>
            </td>
            <td>
              <span v-if="payment.gatewayName" class="gateway-name">
                {{ payment.gatewayName }}
              </span>
              <span v-else class="manual-payment">Manual</span>
            </td>
            <td>{{ formatDateTime(payment.paymentDate || payment.createdAt) }}</td>
            <td>
              <span :class="['status-badge', getStatusInfo(payment.status).class]">
                {{ getStatusInfo(payment.status).label }}
              </span>
            </td>
            <td class="actions">
              <button @click="viewPayment(payment)" class="action-btn view" title="Ver detalles">
                👁️
              </button>
              <button
                v-if="payment.receiptPath"
                @click="downloadReceipt(payment)"
                class="action-btn download"
                title="Descargar comprobante"
              >
                📄
              </button>
              <button
                v-if="payment.status === 'pending' && activeTab === 'pending'"
                @click="approvePayment(payment)"
                class="action-btn approve"
                title="Aprobar"
              >
                ✅
              </button>
              <button
                v-if="payment.status === 'pending' && activeTab === 'pending'"
                @click="rejectPayment(payment)"
                class="action-btn reject"
                title="Rechazar"
              >
                ❌
              </button>
              <button
                v-if="payment.status === 'completed' && payment.paymentMethod !== 'online'"
                @click="refundPayment(payment)"
                class="action-btn refund"
                title="Reembolsar"
              >
                ↩️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Acciones en lote para pagos pendientes -->
    <div v-if="selectedPayments.length > 0 && activeTab === 'pending'" class="bulk-actions">
      <div class="bulk-info">
        {{ selectedPayments.length }} pago(s) seleccionado(s)
      </div>
      <div class="bulk-buttons">
        <button @click="bulkApprovePayments" class="bulk-btn approve">
          Aprobar Seleccionados
        </button>
        <button @click="bulkRejectPayments" class="bulk-btn reject">
          Rechazar Seleccionados
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
        ({{ pagination.totalItems }} pagos)
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
        <div v-if="confirmModal.showReason" class="form-group">
          <label for="rejectionReason">Motivo:</label>
          <textarea
            id="rejectionReason"
            v-model="rejectionReason"
            rows="3"
            placeholder="Escriba el motivo del rechazo..."
          ></textarea>
        </div>
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

    <!-- Modal de registro de pago manual -->
    <div v-if="showManualPaymentModal" class="modal-overlay" @click="closeManualPaymentModal">
      <div class="modal-content large" @click.stop>
        <h3>Registrar Pago Manual</h3>
        <form @submit.prevent="submitManualPayment">
          <div class="form-row">
            <div class="form-group">
              <label for="clientSearch">Cliente *</label>
              <input
                type="text"
                id="clientSearch"
                v-model="manualPayment.clientSearch"
                @input="searchClients"
                placeholder="Buscar cliente por nombre..."
                required
              />
              <div v-if="clientSearchResults.length > 0" class="search-results">
                <div
                  v-for="client in clientSearchResults"
                  :key="client.id"
                  @click="selectClient(client)"
                  class="search-result-item"
                >
                  <span class="client-name">{{ client.fullName }}</span>
                  <span class="client-details">{{ client.phone }} - {{ client.email }}</span>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="invoiceSelect">Factura *</label>
              <select
                id="invoiceSelect"
                v-model="manualPayment.invoiceId"
                :disabled="!manualPayment.clientId"
                required
              >
                <option value="">Seleccionar factura</option>
                <option
                  v-for="invoice in clientInvoices"
                  :key="invoice.id"
                  :value="invoice.id"
                >
                  {{ invoice.invoiceNumber }} - ${{ formatNumber(invoice.totalAmount) }}
                  ({{ getStatusInfo(invoice.status).label }})
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amount">Monto *</label>
              <input
                type="number"
                id="amount"
                v-model="manualPayment.amount"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div class="form-group">
              <label for="paymentMethod">Método de Pago *</label>
              <select id="paymentMethod" v-model="manualPayment.paymentMethod" required>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="paymentDate">Fecha de Pago *</label>
              <input
                type="date"
                id="paymentDate"
                v-model="manualPayment.paymentDate"
                required
              />
            </div>
            <div class="form-group" v-if="manualPayment.paymentMethod === 'transfer'">
              <label for="bankName">Banco</label>
              <input
                type="text"
                id="bankName"
                v-model="manualPayment.bankName"
                placeholder="Nombre del banco"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reference">Referencia</label>
            <input
              type="text"
              id="reference"
              v-model="manualPayment.reference"
              placeholder="Número de referencia o folio"
            />
          </div>

          <div class="form-group">
            <label for="notes">Notas</label>
            <textarea
              id="notes"
              v-model="manualPayment.notes"
              rows="3"
              placeholder="Notas adicionales sobre el pago..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="receipt">Comprobante</label>
            <input
              type="file"
              id="receipt"
              @change="handleReceiptUpload"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <small>Formatos: JPG, PNG, PDF (máx. 5MB)</small>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeManualPaymentModal" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-confirm" :disabled="submittingPayment">
              {{ submittingPayment ? 'Registrando...' : 'Registrar Pago' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import PaymentService from '../services/payment.service';
import InvoiceService from '../services/invoice.service';

export default {
  name: 'PaymentList',
  data() {
    return {
      payments: [],
      paymentGateways: [],
      loading: false,
      activeTab: 'all',
      selectedPayments: [],
      pendingCount: 0,
      filters: {
        search: '',
        paymentMethod: '',
        gatewayId: '',
        startDate: '',
        endDate: ''
      },
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 20
      },
      summary: {
        totalAmount: 0,
        todayCompleted: 0,
        pendingCount: 0
      },
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        showReason: false,
        action: null,
        data: null
      },
      rejectionReason: '',
      showManualPaymentModal: false,
      manualPayment: {
        clientId: '',
        clientSearch: '',
        invoiceId: '',
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        bankName: '',
        reference: '',
        notes: ''
      },
      clientSearchResults: [],
      clientInvoices: [],
      receiptFile: null,
      submittingPayment: false
    };
  },
  created() {
    this.loadPayments();
    this.loadPaymentGateways();
    this.loadSummary();
    this.setActiveTab(this.$route.query.tab || 'all');
  },
  methods: {
    async loadPayments() {
      this.loading = true;
      try {
        const params = {
          page: this.pagination.currentPage,
          limit: this.pagination.pageSize,
          search: this.filters.search || undefined,
          paymentMethod: this.filters.paymentMethod || undefined,
          gatewayId: this.filters.gatewayId || undefined,
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined
        };

        let response;
        if (this.activeTab === 'pending') {
          response = await PaymentService.getPendingManualPayments(params);
        } else {
          if (this.activeTab !== 'all') {
            params.status = this.activeTab;
          }
          response = await PaymentService.getAllPayments(params);
        }

        this.payments = response.data.payments || response.data;
        
        if (response.data.pagination) {
          this.pagination = {
            ...this.pagination,
            ...response.data.pagination
          };
        }

        this.selectedPayments = [];
      } catch (error) {
        console.error('Error cargando pagos:', error);
        this.payments = [];
      } finally {
        this.loading = false;
      }
    },

    async loadPaymentGateways() {
      try {
        const response = await PaymentService.getAllPaymentGateways({ active: true });
        this.paymentGateways = response.data;
      } catch (error) {
        console.error('Error cargando pasarelas:', error);
      }
    },

    async loadSummary() {
      try {
        const response = await PaymentService.getPaymentStatistics({
          startDate: this.filters.startDate || undefined,
          endDate: this.filters.endDate || undefined
        });

        this.summary = {
          totalAmount: response.data.totalAmount || 0,
          todayCompleted: response.data.todayCompleted || 0,
          pendingCount: response.data.pendingCount || 0
        };

        this.pendingCount = this.summary.pendingCount;
      } catch (error) {
        console.error('Error cargando resumen:', error);
      }
    },

    setActiveTab(tab) {
      this.activeTab = tab;
      this.pagination.currentPage = 1;
      this.selectedPayments = [];
      this.loadPayments();
    },

    changePage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.pagination.currentPage = page;
        this.loadPayments();
      }
    },

    toggleSelectAll() {
      if (this.selectedPayments.length === this.payments.length) {
        this.selectedPayments = [];
      } else {
        this.selectedPayments = this.payments.map(payment => payment.id);
      }
    },

    clearSelection() {
      this.selectedPayments = [];
    },

    viewPayment(payment) {
      this.$router.push(`/billing/payments/${payment.id}`);
    },

    async downloadReceipt(payment) {
      try {
        const response = await PaymentService.downloadManualPaymentReceipt(payment.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `comprobante-pago-${payment.paymentReference || payment.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error descargando comprobante:', error);
        alert('Error al descargar el comprobante');
      }
    },

    approvePayment(payment) {
      this.showConfirmation(
        'Aprobar Pago',
        `¿Está seguro que desea aprobar el pago de ${this.formatNumber(payment.amount)} del cliente ${payment.clientName}?`,
        'Aprobar',
        'approvePayment',
        payment,
        false
      );
    },

    rejectPayment(payment) {
      this.showConfirmation(
        'Rechazar Pago',
        `¿Está seguro que desea rechazar el pago de ${this.formatNumber(payment.amount)} del cliente ${payment.clientName}?`,
        'Rechazar',
        'rejectPayment',
        payment,
        true
      );
    },

    refundPayment(payment) {
      this.showConfirmation(
        'Reembolsar Pago',
        `¿Está seguro que desea reembolsar el pago de ${this.formatNumber(payment.amount)}? Esta acción no se puede deshacer.`,
        'Reembolsar',
        'refundPayment',
        payment,
        true
      );
    },

    bulkApprovePayments() {
      this.showConfirmation(
        'Aprobar Pagos',
        `¿Está seguro que desea aprobar ${this.selectedPayments.length} pago(s) seleccionado(s)?`,
        'Aprobar Todos',
        'bulkApprovePayments',
        this.selectedPayments,
        false
      );
    },

    bulkRejectPayments() {
      this.showConfirmation(
        'Rechazar Pagos',
        `¿Está seguro que desea rechazar ${this.selectedPayments.length} pago(s) seleccionado(s)?`,
        'Rechazar Todos',
        'bulkRejectPayments',
        this.selectedPayments,
        true
      );
    },

    openManualPaymentForm() {
      this.resetManualPaymentForm();
      this.showManualPaymentModal = true;
    },

    closeManualPaymentModal() {
      this.showManualPaymentModal = false;
      this.resetManualPaymentForm();
    },

    resetManualPaymentForm() {
      this.manualPayment = {
        clientId: '',
        clientSearch: '',
        invoiceId: '',
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        bankName: '',
        reference: '',
        notes: ''
      };
      this.clientSearchResults = [];
      this.clientInvoices = [];
      this.receiptFile = null;
    },

    async searchClients() {
      if (this.manualPayment.clientSearch.length >= 3) {
        try {
          const response = await PaymentService.searchClients(this.manualPayment.clientSearch);
          this.clientSearchResults = response.data;
        } catch (error) {
          console.error('Error buscando clientes:', error);
        }
      } else {
        this.clientSearchResults = [];
      }
    },

    async selectClient(client) {
      this.manualPayment.clientId = client.id;
      this.manualPayment.clientSearch = client.fullName;
      this.clientSearchResults = [];
      
      try {
        const response = await PaymentService.getClientPendingInvoices(client.id);
        this.clientInvoices = response.data;
      } catch (error) {
        console.error('Error cargando facturas del cliente:', error);
        this.clientInvoices = [];
      }
    },

    handleReceiptUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. Máximo 5MB.');
          return;
        }
        this.receiptFile = file;
      }
    },

    async submitManualPayment() {
      this.submittingPayment = true;
      try {
        const paymentData = {
          clientId: this.manualPayment.clientId,
          invoiceId: this.manualPayment.invoiceId,
          amount: parseFloat(this.manualPayment.amount),
          paymentMethod: this.manualPayment.paymentMethod,
          paymentDate: this.manualPayment.paymentDate,
          bankName: this.manualPayment.bankName,
          reference: this.manualPayment.reference,
          notes: this.manualPayment.notes
        };

        await PaymentService.submitManualPayment(paymentData, this.receiptFile);
        
        alert('Pago registrado exitosamente. Pendiente de aprobación.');
        this.closeManualPaymentModal();
        this.loadPayments();
        this.loadSummary();
      } catch (error) {
        console.error('Error registrando pago:', error);
        alert('Error registrando el pago. Verifique los datos e intente nuevamente.');
      } finally {
        this.submittingPayment = false;
      }
    },

    goToPendingPayments() {
      this.setActiveTab('pending');
    },

    showConfirmation(title, message, confirmText, action, data, showReason = false) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        showReason,
        action,
        data
      };
      this.rejectionReason = '';
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
      this.confirmModal = {
        title: '',
        message: '',
        confirmText: '',
        showReason: false,
        action: null,
        data: null
      };
      this.rejectionReason = '';
    },

    async confirmAction() {
      try {
        const { action, data } = this.confirmModal;

        switch (action) {
          case 'approvePayment':
            await PaymentService.approveManualPayment(data.id);
            break;
          case 'rejectPayment':
            await PaymentService.rejectManualPayment(data.id, {
              reason: this.rejectionReason
            });
            break;
          case 'refundPayment':
            // Implementar lógica de reembolso
            console.log('Reembolsar pago:', data.id, 'Razón:', this.rejectionReason);
            break;
          case 'bulkApprovePayments':
            await PaymentService.bulkApprovePayments(data);
            this.clearSelection();
            break;
          case 'bulkRejectPayments':
            for (const paymentId of data) {
              await PaymentService.rejectManualPayment(paymentId, {
                reason: this.rejectionReason
              });
            }
            this.clearSelection();
            break;
        }

        this.closeConfirmModal();
        this.loadPayments();
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

    formatDateTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('es-MX');
    },

    formatPaymentMethod(method) {
      return PaymentService.formatPaymentMethod(method);
    },

    getStatusInfo(status) {
      return PaymentService.formatPaymentStatus(status);
    }
  }
};
</script>

<style scoped>
.payment-list {
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

.add-button, .pending-button {
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

.pending-button {
  background-color: #FF9800;
  color: white;
}

.tabs {
  display: flex;
  border-bottom: 2px solid #eee;
  margin-bottom: 20px;
}

.tab {
  padding: 12px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: #333;
  background-color: #f5f5f5;
}

.tab.active {
  color: #2196F3;
  border-bottom-color: #2196F3;
  font-weight: 500;
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
  width: 350px;
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

.payment-table {
  width: 100%;
  border-collapse: collapse;
}

.payment-table th,
.payment-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.payment-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
}

.payment-table tr:hover {
  background-color: #f8f9fa;
}

.payment-table tr.selected {
  background-color: #e3f2fd;
}

.payment-id {
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

.invoice-ref .invoice-number {
  font-family: monospace;
  color: #1976d2;
}

.invoice-ref .no-invoice {
  color: #999;
  font-style: italic;
}

.amount {
  font-weight: bold;
  text-align: right;
}

.payment-method {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.gateway-name {
  color: #666;
  font-size: 12px;
}

.manual-payment {
  color: #9C27B0;
  font-weight: 500;
  font-size: 12px;
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

.status-completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-failed {
  background-color: #ffebee;
  color: #c62828;
}

.status-cancelled {
  background-color: #f5f5f5;
  color: #757575;
}

.status-refunded {
  background-color: #fff3e0;
  color: #ef6c00;
}

.status-processing {
  background-color: #f3e5f5;
  color: #7b1fa2;
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

.action-btn.approve {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.action-btn.reject {
  background-color: #ffebee;
  color: #c62828;
}

.action-btn.refund {
  background-color: #fff3e0;
  color: #ef6c00;
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

.bulk-btn.approve {
  background-color: #4CAF50;
  color: white;
}

.bulk-btn.reject {
  background-color: #F44336;
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
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-content.large {
  max-width: 700px;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  flex: 1;
  position: relative;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
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
</style>