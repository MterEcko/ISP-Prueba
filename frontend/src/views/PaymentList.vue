Perfecto, te voy a dar el código **COMPLETO** de `PaymentList.vue` con todos los cambios integrados, incluyendo el CSS.

---

# 📄 **PaymentList.vue** - Versión Completa

```vue
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
            <th>👤 Registrado por</th> <!-- ✅ NUEVA COLUMNA -->
            <th>📎</th> <!-- ✅ NUEVA COLUMNA: Comprobante -->
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
                <span class="client-name">{{ payment.Client.firstName }} {{ payment.Client.lastName }}</span>
                <span class="client-contact">{{ payment.Client.phone || payment.Client.email }}</span>
              </div>
            </td>
            <td class="invoice-ref">
              <span v-if="payment.Invoice && payment.Invoice.invoiceNumber" class="invoice-number">
                {{ payment.Invoice.invoiceNumber }}
              </span>
              <span v-else class="no-invoice">Sin factura</span>
            </td>
            <td class="amount">${{ formatNumber(payment.amount) }}</td>
            <td>
              <span class="payment-method">
                {{ formatPaymentMethod(payment.paymentMethod) }}
              </span>
              <!-- ✅ NUEVO: Badge especial para transferencias -->
              <span 
                v-if="payment.paymentMethod === 'transfer' && payment.status === 'pending'" 
                class="transfer-badge"
                title="Transferencia pendiente de validación"
              >
                🏦
              </span>
            </td>
            <td>
              <span v-if="payment.PaymentGateway" class="gateway-name">
                {{ payment.PaymentGateway.name }}
              </span>
              <span v-else class="manual-payment">Manual</span>
            </td>
            <td>{{ formatDateTime(payment.paymentDate || payment.createdAt) }}</td>
            <td>
              <span :class="['status-badge', getStatusInfo(payment.status).class]">
                {{ getStatusInfo(payment.status).label }}
              </span>
            </td>
            
            <!-- ✅ NUEVA COLUMNA: Usuario que registró el pago -->
            <td class="registered-by">
              <div class="user-info">
                <span class="user-name" :title="getSubmittedByName(payment)">
                  {{ getSubmittedByName(payment) }}
                </span>
                <span class="user-date">{{ formatDate(payment.createdAt) }}</span>
              </div>
            </td>
            
            <!-- ✅ NUEVA COLUMNA: Ícono de comprobante -->
            <td class="receipt-indicator">
              <button
                v-if="hasReceipt(payment)"
                @click="viewReceiptHistory(payment)"
                class="receipt-btn"
                :title="`${getReceiptCount(payment)} comprobante(s)`"
              >
                📎 {{ getReceiptCount(payment) }}
              </button>
              <span v-else class="no-receipt">-</span>
            </td>
            
            <td class="actions">
              <button @click="viewPayment(payment)" class="action-btn view" title="Ver detalles">
                👁️
              </button>
              <button
                v-if="hasReceipt(payment)"
                @click="downloadLatestReceipt(payment)"
                class="action-btn download"
                title="Descargar último comprobante"
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
                </div>
              </div>
            </div>
            <div class="form-group">
              <label for="invoiceSelect">Factura *</label>
              <select
                v-if="clientInvoices.length > 0"
                id="invoiceSelect"
                v-model="manualPayment.invoiceId"
                @change="onInvoiceSelect"
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

              <div v-else-if="manualPayment.clientId" class="no-invoices-message">
                Este cliente no tiene facturas pendientes de pago.
              </div>

              <div v-else class="no-invoices-message">
                Primero busque y seleccione un cliente.
              </div>
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

    <!-- ✅ NUEVO: Modal de historial de comprobantes -->
    <div v-if="showReceiptHistoryModal" class="modal-overlay" @click="closeReceiptHistoryModal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>📎 Historial de Comprobantes</h3>
          <button @click="closeReceiptHistoryModal" class="close-btn">×</button>
        </div>
        
        <div class="receipt-history-content">
          <div class="payment-info-summary">
            <p><strong>Pago:</strong> {{ selectedPaymentForReceipts?.paymentReference || selectedPaymentForReceipts?.id }}</p>
            <p><strong>Monto:</strong> ${{ formatNumber(selectedPaymentForReceipts?.amount) }}</p>
            <p><strong>Cliente:</strong> {{ getClientNameFromPayment(selectedPaymentForReceipts) }}</p>
          </div>

          <div class="receipts-list">
            <div 
              v-for="(receipt, index) in receiptHistory" 
              :key="index"
              class="receipt-item"
            >
              <div class="receipt-info">
                <div class="receipt-icon">📄</div>
                <div class="receipt-details">
                  <span class="receipt-name">{{ receipt.filename }}</span>
                  <span class="receipt-meta">
                    Subido: {{ formatDateTime(receipt.uploadedAt) }}
                    <span v-if="receipt.uploadedBy"> por {{ receipt.uploadedBy }}</span>
                  </span>
                  <span v-if="receipt.size" class="receipt-size">
                    Tamaño: {{ formatFileSize(receipt.size) }}
                  </span>
                </div>
              </div>
              <div class="receipt-actions">
                <button @click="downloadReceipt(receipt)" class="receipt-action-btn download">
                  📥 Descargar
                </button>
                <button 
                  v-if="canViewReceipt(receipt)" 
                  @click="viewReceiptImage(receipt)" 
                  class="receipt-action-btn view"
                >
                  👁️ Ver
                </button>
              </div>
            </div>
          </div>

          <div v-if="receiptHistory.length === 0" class="no-receipts">
            No hay comprobantes registrados para este pago.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BillingService from '../services/billing.service';
import PaymentService from '../services/payment.service';
import InvoiceService from '../services/invoice.service';

export default {
  name: 'PaymentList',
  data() {
    return {
      payments: [],
      paymentGateways: [],
      allClients: [],
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
        pendingCount: 0,
        totalItems: 0
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
      submittingPayment: false,
      invoicesWithPendingPayments: new Set(),
      
      // ✅ NUEVOS: Para historial de comprobantes
      showReceiptHistoryModal: false,
      selectedPaymentForReceipts: null,
      receiptHistory: []
    };
  },
  created() {
    this.loadPaymentGateways();
    this.loadAllClients();
    this.loadInvoicesWithPendingPayments();
    this.setActiveTab(this.$route.query.tab || 'all');
  },
  methods: {
    async loadAllClients() {
      try {
        const response = await BillingService.getAllClientBillings({ size: 10000 });
        this.allClients = response.data.data
          .filter(billing => billing && billing.client)
          .map(billing => ({
            id: billing.client.id,
            fullName: `${billing.client.firstName} ${billing.client.lastName}`,
            email: billing.client.email,
            phone: billing.client.phone
          }));
      } catch(error) {
        console.error("Error al cargar la lista de clientes:", error);
      }
    },

    searchClients() {
      const searchTerm = this.manualPayment.clientSearch.toLowerCase();
      if (searchTerm.length < 2) {
        this.clientSearchResults = [];
        return;
      }
      this.clientSearchResults = this.allClients.filter(client =>
        client.fullName.toLowerCase().includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm)) ||
        (client.phone && client.phone.includes(searchTerm))
      ).slice(0, 10);
    },

    async loadPayments() {
      this.loading = true;
      
      const params = {
        page: this.pagination.currentPage,
        limit: this.pagination.pageSize,
        search: this.filters.search || undefined,
        paymentMethod: this.filters.paymentMethod || undefined,
        gatewayId: this.filters.gatewayId || undefined,
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined,
        status: this.activeTab === 'all' ? undefined : this.activeTab
      };
      
      const statsParams = {
        startDate: this.filters.startDate || undefined,
        endDate: this.filters.endDate || undefined
      };

      const loadDataPromise = PaymentService.getAllPayments(params);
      const loadSummaryPromise = PaymentService.getPaymentStatistics(statsParams);

      try {
        const [paymentsResponse, summaryResponse] = await Promise.all([loadDataPromise, loadSummaryPromise]);
        
        const paymentsData = paymentsResponse.data.data || paymentsResponse.data;
        this.payments = paymentsData.payments || [];
        if (paymentsData.pagination) {
          this.pagination = paymentsData.pagination;
        }

        const summaryData = summaryResponse.data.data || summaryResponse.data;
        this.summary = {
          totalAmount: summaryData.summary.completedAmount || 0,
          todayCompleted: summaryData.todayCompleted || 0,
          pendingCount: summaryData.summary.pendingPayments || 0,
          totalItems: paymentsData.pagination ? paymentsData.pagination.totalItems : 0
        };
        this.pendingCount = this.summary.pendingCount;

      } catch (error) {
        console.error('❌ Error cargando los datos de pagos:', error);
        this.payments = [];
      } finally {
        this.loading = false;
      }
    },

    async loadPaymentGateways() {
      try {
        const response = await PaymentService.getAllPaymentGateways({ active: true });
        const data = response.data.data || response.data;
        this.paymentGateways = Array.isArray(data) ? data : (data.gateways || []);
      } catch (error) {
        console.error('❌ Error cargando pasarelas:', error);
        this.paymentGateways = [];
      }
    },

    async loadInvoicesWithPendingPayments() {
      try {
        console.log('2. EJECUTANDO loadInvoicesWithPendingPayments...');
        const response = await PaymentService.getAllPayments({ status: 'pending', limit: 10000 });
        const pendingPayments = response.data.data.payments || [];
        const invoiceIds = pendingPayments.map(p => p.invoiceId);
        this.invoicesWithPendingPayments = new Set(invoiceIds);

        console.log('3. LISTA ACTUALIZADA. IDs de facturas con pago pendiente:', this.invoicesWithPendingPayments);

      } catch (error) {
        console.error("Error al cargar facturas con pagos pendientes:", error);
      }
    },

    async selectClient(client) {
      this.manualPayment.clientId = client.id;
      this.manualPayment.clientSearch = client.fullName;
      this.clientSearchResults = [];
      this.clientInvoices = [];
      
      try {
        const response = await InvoiceService.getClientInvoices(client.id, {
          status: ['pending', 'overdue']
        });
        
        const data = response.data.data;
        let clientInvoicesRaw = data.invoices || [];
        
        this.clientInvoices = clientInvoicesRaw.filter(
          invoice => !this.invoicesWithPendingPayments.has(invoice.id)
        );

        if (this.clientInvoices.length > 0) {
          this.clientInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const newestInvoice = this.clientInvoices[0];
          this.manualPayment.invoiceId = newestInvoice.id;
          this.manualPayment.amount = newestInvoice.totalAmount;
        }

      } catch (error) {
        console.error('Error cargando las facturas del cliente:', error);
        this.clientInvoices = [];
        alert('No se pudieron cargar las facturas del cliente.');
      }
    },

    onInvoiceSelect() {
      const selectedInvoice = this.clientInvoices.find(inv => inv.id === this.manualPayment.invoiceId);
      if (selectedInvoice) {
        this.manualPayment.amount = selectedInvoice.totalAmount;
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

    async downloadLatestReceipt(payment) {
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
      this.showConfirmation('Aprobar Pago', `¿Está seguro de aprobar el pago de ${this.formatNumber(payment.amount)} del cliente ${payment.Client.firstName}?`, 'Aprobar', 'approvePayment', payment);
    },

    rejectPayment(payment) {
      this.showConfirmation('Rechazar Pago', `¿Está seguro de rechazar el pago de ${this.formatNumber(payment.amount)} del cliente ${payment.Client.firstName}?`, 'Rechazar', 'rejectPayment', payment, true);
    },

    refundPayment(payment) {
      this.showConfirmation('Reembolsar Pago', `¿Está seguro de reembolsar el pago de ${this.formatNumber(payment.amount)}?`, 'Reembolsar', 'refundPayment', payment, true);
    },

    bulkApprovePayments() {
      this.showConfirmation('Aprobar Pagos', `¿Está seguro de aprobar ${this.selectedPayments.length} pago(s)?`, 'Aprobar Todos', 'bulkApprovePayments', this.selectedPayments);
    },

    bulkRejectPayments() {
      this.showConfirmation('Rechazar Pagos', `¿Está seguro de rechazar ${this.selectedPayments.length} pago(s)?`, 'Rechazar Todos', 'bulkRejectPayments', this.selectedPayments, true);
    },

    openManualPaymentForm() {
      this.resetManualPaymentForm();
      this.showManualPaymentModal = true;
    },

closeManualPaymentModal() {
      this.showManualPaymentModal = false;
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

    handleReceiptUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. Máximo 5MB.');
          event.target.value = '';
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
        
        console.log('1. PAGO EXITOSO. Llamando a actualizar la lista de facturas con pagos pendientes...');
        this.loadPayments();
        this.loadInvoicesWithPendingPayments();

      } catch (error) {
        console.error('Error registrando pago:', error);
        const errorMessage = error.response?.data?.message || 'Error registrando el pago. Verifique los datos.';
        alert(errorMessage);
      } finally {
        this.submittingPayment = false;
      }
    },

    goToPendingPayments() {
      this.setActiveTab('pending');
    },

    showConfirmation(title, message, confirmText, action, data, showReason = false) {
      this.confirmModal = { title, message, confirmText, showReason, action, data };
      this.rejectionReason = '';
      this.showConfirmModal = true;
    },

    closeConfirmModal() {
      this.showConfirmModal = false;
    },

    async confirmAction() {
      try {
        const { action, data } = this.confirmModal;
        switch (action) {
          case 'approvePayment':
            await PaymentService.approveManualPayment(data.id);
            break;
          case 'rejectPayment':
            await PaymentService.rejectManualPayment(data.id, { reason: this.rejectionReason });
            break;
          case 'bulkApprovePayments':
            await PaymentService.bulkApprovePayments(data);
            break;
          case 'bulkRejectPayments':
            for (const paymentId of data) {
              await PaymentService.rejectManualPayment(paymentId, { reason: this.rejectionReason });
            }
            break;
        }
        this.clearSelection();
        this.closeConfirmModal();
        this.loadPayments();
      } catch (error) {
        console.error('Error ejecutando acción:', error);
        alert('Error ejecutando la acción');
      }
    },

    // ✅ NUEVOS MÉTODOS: Para columnas adicionales

    getSubmittedByName(payment) {
      // Intenta obtener el nombre del usuario que registró el pago
      if (payment.SubmittedBy) {
        return payment.SubmittedBy.fullName || payment.SubmittedBy.username || `Usuario #${payment.SubmittedBy.id}`;
      }
      if (payment.submittedBy) {
        return `Usuario #${payment.submittedBy}`;
      }
      return 'Sistema';
    },

    hasReceipt(payment) {
      // Verifica si el pago tiene comprobante(s)
      if (payment.receiptPath) return true;
      if (payment.receipts && payment.receipts.length > 0) return true;
      
      // Para pagos con paymentData JSON
      if (payment.paymentData) {
        try {
          const data = typeof payment.paymentData === 'string' 
            ? JSON.parse(payment.paymentData) 
            : payment.paymentData;
          if (data.receiptPath || (data.receipts && data.receipts.length > 0)) return true;
        } catch (e) {
          // Ignorar errores de parseo
        }
      }
      
      return false;
    },

    getReceiptCount(payment) {
      // Cuenta cuántos comprobantes tiene el pago
      let count = 0;
      
      if (payment.receipts && Array.isArray(payment.receipts)) {
        count = payment.receipts.length;
      } else if (payment.receiptPath) {
        count = 1;
      }
      
      // Revisar paymentData JSON
      if (payment.paymentData) {
        try {
          const data = typeof payment.paymentData === 'string' 
            ? JSON.parse(payment.paymentData) 
            : payment.paymentData;
          if (data.receipts && Array.isArray(data.receipts)) {
            count = Math.max(count, data.receipts.length);
          } else if (data.receiptPath && count === 0) {
            count = 1;
          }
        } catch (e) {
          // Ignorar
        }
      }
      
      return count;
    },

    async viewReceiptHistory(payment) {
      this.selectedPaymentForReceipts = payment;
      this.receiptHistory = [];
      
      try {
        // Intentar obtener historial de comprobantes
        // Simulación - adaptar según tu backend
        if (payment.receipts && Array.isArray(payment.receipts)) {
          this.receiptHistory = payment.receipts.map(r => ({
            filename: r.filename || r.originalName || 'comprobante.pdf',
            uploadedAt: r.uploadedAt || r.createdAt,
            uploadedBy: r.uploadedBy?.fullName || null,
            size: r.size,
            path: r.path,
            id: r.id
          }));
        } else if (payment.receiptPath) {
          // Solo un comprobante
          this.receiptHistory = [{
            filename: payment.receiptFileName || 'comprobante.pdf',
            uploadedAt: payment.receiptUploadedAt || payment.createdAt,
            uploadedBy: this.getSubmittedByName(payment),
            size: payment.receiptSize || null,
            path: payment.receiptPath,
            id: payment.id
          }];
        }
        
        // También revisar paymentData
        if (payment.paymentData) {
          try {
            const data = typeof payment.paymentData === 'string' 
              ? JSON.parse(payment.paymentData) 
              : payment.paymentData;
            
            if (data.receipts && Array.isArray(data.receipts) && this.receiptHistory.length === 0) {
              this.receiptHistory = data.receipts;
            }
          } catch (e) {
            // Ignorar
          }
        }
        
        this.showReceiptHistoryModal = true;
        
      } catch (error) {
        console.error('Error cargando historial de comprobantes:', error);
        alert('Error al cargar el historial de comprobantes');
      }
    },

    closeReceiptHistoryModal() {
      this.showReceiptHistoryModal = false;
      this.selectedPaymentForReceipts = null;
      this.receiptHistory = [];
    },

    async downloadReceipt(receipt) {
      try {
        // Adaptar según tu implementación
        const paymentId = this.selectedPaymentForReceipts.id;
        const response = await PaymentService.downloadManualPaymentReceipt(paymentId, receipt.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', receipt.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error descargando comprobante:', error);
        alert('Error al descargar el comprobante');
      }
    },

    canViewReceipt(receipt) {
      const filename = (receipt.filename || '').toLowerCase();
      return filename.endsWith('.jpg') || 
             filename.endsWith('.jpeg') || 
             filename.endsWith('.png');
    },

    async viewReceiptImage(receipt) {
      try {
        const paymentId = this.selectedPaymentForReceipts.id;
        const response = await PaymentService.downloadManualPaymentReceipt(paymentId, receipt.id);
        
        const imageUrl = URL.createObjectURL(response.data);
        
        // Abrir en nueva ventana o modal
        window.open(imageUrl, '_blank');
        
      } catch (error) {
        console.error('Error visualizando comprobante:', error);
        alert('Error al visualizar el comprobante');
      }
    },

    getClientNameFromPayment(payment) {
      if (!payment || !payment.Client) return 'N/A';
      return `${payment.Client.firstName} ${payment.Client.lastName}`;
    },

    // MÉTODOS DE UTILIDAD

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

    formatDateTime(dateString) {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleString('es-MX');
    },

    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
/* ===== ESTILOS GENERALES ===== */
.payment-list {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.add-button,
.pending-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.pending-button {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
}

.pending-button:hover {
  background: #ffc107;
  color: white;
}

/* ===== TABS ===== */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  background: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.tab:hover {
  background: #f1f3f5;
}

.tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* ===== FILTROS ===== */
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  background: white;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.filter-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  width: 300px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-btn {
  padding: 10px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.search-btn:hover {
  background: #5568d3;
}

select.date-input,
input.date-input {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
}

.date-separator {
  color: #6c757d;
  font-weight: 500;
}

/* ===== SUMMARY CARDS ===== */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card .label {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-card .value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
}

/* ===== LOADING / NO DATA ===== */
.loading,
.no-data {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  color: #6c757d;
  font-size: 16px;
}

/* ===== TABLE ===== */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.payment-table {
  width: 100%;
  border-collapse: collapse;
}

.payment-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.payment-table th,
.payment-table td {
  padding: 14px 12px;
  text-align: left;
  font-size: 13px;
}

.payment-table th {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 12px;
}

.payment-table tbody tr {
  border-bottom: 1px solid #f1f3f5;
  transition: background-color 0.2s;
}

.payment-table tbody tr:hover {
  background-color: #f8f9fa;
}

.payment-table tbody tr.selected {
  background-color: #e7f3ff;
}

/* ===== COLUMNAS ESPECÍFICAS ===== */
.payment-id {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #667eea;
}

.client-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.client-name {
  font-weight: 600;
  color: #2c3e50;
}

.client-contact {
  font-size: 12px;
  color: #6c757d;
}

.invoice-number {
  font-family: 'Courier New', monospace;
  color: #495057;
  font-weight: 500;
}

.no-invoice {
  color: #adb5bd;
  font-style: italic;
  font-size: 12px;
}

.amount {
  font-weight: 700;
  color: #28a745;
  font-size: 14px;
}

.payment-method {
  display: inline-block;
  padding: 4px 10px;
  background: #e9ecef;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* ✅ NUEVO: Badge para transferencias */
.transfer-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.gateway-name {
  font-size: 12px;
  color: #495057;
}

.manual-payment {
  font-size: 12px;
  color: #6c757d;
  font-style: italic;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.status-badge.completed {
  background: #d4edda;
  color: #155724;
}

.status-badge.failed {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.cancelled {
  background: #e2e3e5;
  color: #383d41;
}

/* ✅ NUEVAS COLUMNAS */
.registered-by {
  font-size: 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 500;
  color: #495057;
}

.user-date {
  font-size: 11px;
  color: #6c757d;
}

.receipt-indicator {
  text-align: center;
}

.receipt-btn {
  background: transparent;
  border: 1px solid #667eea;
  color: #667eea;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.receipt-btn:hover {
  background: #667eea;
  color: white;
}

.no-receipt {
  color: #adb5bd;
  font-size: 12px;
}

/* ===== ACTIONS ===== */
.actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.action-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  background: #e9ecef;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.view {
  background: #cfe2ff;
}

.action-btn.download {
  background: #d1e7dd;
}

.action-btn.approve {
  background: #d4edda;
}

.action-btn.reject {
  background: #f8d7da;
}

.action-btn.refund {
  background: #fff3cd;
}

/* ===== BULK ACTIONS ===== */
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  margin-top: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.bulk-info {
  font-weight: 600;
  color: #495057;
}

.bulk-buttons {
  display: flex;
  gap: 10px;
}

.bulk-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.approve {
  background: #28a745;
  color: white;
}

.bulk-btn.reject {
  background: #dc3545;
  color: white;
}

.bulk-btn.clear {
  background: #6c757d;
  color: white;
}

.bulk-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* ===== PAGINATION ===== */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.page-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
}

.page-btn:disabled {
  background: #e9ecef;
  color: #adb5bd;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #495057;
  font-weight: 500;
}

/* ===== MODALES ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content.large {
  max-width: 800px;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f1f3f5;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  color: #6c757d;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f1f3f5;
  color: #495057;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group small {
  font-size: 12px;
  color: #6c757d;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #dee2e6;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.search-result-item {
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background: #f8f9fa;
}

.no-invoices-message {
  padding: 10px;
  color: #6c757d;
  font-style: italic;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f3f5;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e9ecef;
  color: #495057;
}

.btn-cancel:hover {
  background: #dee2e6;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-confirm:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

/* ✅ MODAL DE HISTORIAL DE COMPROBANTES */
.receipt-history-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-info-summary {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.payment-info-summary p {
  margin: 4px 0;
  font-size: 14px;
  color: #495057;
}

.payment-info-summary strong {
  color: #2c3e50;
  font-weight: 600;
}

.receipts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.receipt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
border-radius: 8px;
  border: 1px solid #dee2e6;
  transition: all 0.2s;
}

.receipt-item:hover {
  background: #e9ecef;
  border-color: #667eea;
}

.receipt-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.receipt-icon {
  font-size: 32px;
  opacity: 0.7;
}

.receipt-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.receipt-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.receipt-meta {
  font-size: 12px;
  color: #6c757d;
}

.receipt-size {
  font-size: 11px;
  color: #adb5bd;
}

.receipt-actions {
  display: flex;
  gap: 8px;
}

.receipt-action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.receipt-action-btn.download {
  background: #d1e7dd;
  color: #0f5132;
}

.receipt-action-btn.download:hover {
  background: #badbcc;
}

.receipt-action-btn.view {
  background: #cfe2ff;
  color: #084298;
}

.receipt-action-btn.view:hover {
  background: #b6d4fe;
}

.no-receipts {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
  font-style: italic;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1200px) {
  .payment-table {
    font-size: 12px;
  }

  .payment-table th,
  .payment-table td {
    padding: 10px 8px;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions button {
    flex: 1;
  }

  .filters {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-container {
    overflow-x: auto;
  }

  .payment-table {
    min-width: 1200px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }

  .bulk-buttons {
    width: 100%;
    flex-direction: column;
  }

  .bulk-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-direction: column;
  }

  .tab {
    width: 100%;
    text-align: center;
  }

  .modal-content {
    padding: 20px;
  }

  .modal-content.large {
    max-width: 100%;
  }
}

/* ===== ANIMACIONES ===== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.payment-table tbody tr {
  animation: fadeIn 0.3s ease-in-out;
}

.modal-content {
  animation: fadeIn 0.2s ease-in-out;
}

/* ===== SCROLLBAR PERSONALIZADO ===== */
.modal-content::-webkit-scrollbar,
.table-container::-webkit-scrollbar,
.search-results::-webkit-scrollbar,
.receipts-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.modal-content::-webkit-scrollbar-track,
.table-container::-webkit-scrollbar-track,
.search-results::-webkit-scrollbar-track,
.receipts-list::-webkit-scrollbar-track {
  background: #f1f3f5;
  border-radius: 10px;
}

.modal-content::-webkit-scrollbar-thumb,
.table-container::-webkit-scrollbar-thumb,
.search-results::-webkit-scrollbar-thumb,
.receipts-list::-webkit-scrollbar-thumb {
  background: #adb5bd;
  border-radius: 10px;
}

.modal-content::-webkit-scrollbar-thumb:hover,
.table-container::-webkit-scrollbar-thumb:hover,
.search-results::-webkit-scrollbar-thumb:hover,
.receipts-list::-webkit-scrollbar-thumb:hover {
  background: #6c757d;
}

/* ===== ESTADOS DE HOVER MEJORADOS ===== */
.action-btn,
.bulk-btn,
.receipt-btn,
.page-btn,
.search-btn {
  position: relative;
  overflow: hidden;
}

.action-btn::before,
.bulk-btn::before,
.receipt-btn::before,
.page-btn::before,
.search-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.action-btn:hover::before,
.bulk-btn:hover::before,
.receipt-btn:hover::before,
.page-btn:hover::before,
.search-btn:hover::before {
  width: 300px;
  height: 300px;
}

/* ===== TOOLTIPS (si quieres agregarlos) ===== */
.action-btn[title],
.receipt-btn[title] {
  position: relative;
}

.action-btn[title]:hover::after,
.receipt-btn[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  background: #2c3e50;
  color: white;
  font-size: 11px;
  border-radius: 6px;
  white-space: nowrap;
  margin-bottom: 6px;
  z-index: 10;
  pointer-events: none;
}

.action-btn[title]:hover::before,
.receipt-btn[title]:hover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #2c3e50;
  z-index: 10;
  pointer-events: none;
}

/* ===== LOADING SPINNER (opcional) ===== */
.loading::after {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-left: 10px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== UTILIDADES ===== */
.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.mt-16 {
  margin-top: 16px;
}

.mb-16 {
  margin-bottom: 16px;
}

.p-20 {
  padding: 20px;
}

/* ===== ESTADOS ESPECIALES ===== */
.payment-table tbody tr.pending-approval {
  background-color: #fff3cd;
}

.payment-table tbody tr.pending-approval:hover {
  background-color: #ffe69c;
}

.status-badge.pending.urgent {
  background: #ff6b6b;
  color: white;
  animation: pulse 2s infinite;
}

/* ===== TRANSICIONES SUAVES ===== */
* {
  transition: background-color 0.2s ease, 
              color 0.2s ease, 
              border-color 0.2s ease,
              transform 0.2s ease,
              box-shadow 0.2s ease;
}

button,
input,
select,
textarea {
  transition: all 0.2s ease;
}

/* ===== ACCESIBILIDAD ===== */
.action-btn:focus,
.bulk-btn:focus,
.page-btn:focus,
.search-btn:focus,
.btn-confirm:focus,
.btn-cancel:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* ===== PRINT STYLES (opcional) ===== */
@media print {
  .header-actions,
  .tabs,
  .filters,
  .bulk-actions,
  .pagination,
  .actions {
    display: none !important;
  }

  .table-container {
    box-shadow: none;
  }

  .payment-table {
    border: 1px solid #dee2e6;
  }

  .payment-table th,
  .payment-table td {
    border: 1px solid #dee2e6;
  }
}
</style>