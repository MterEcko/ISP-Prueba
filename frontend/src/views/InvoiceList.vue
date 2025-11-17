Perfecto, te voy a dar el **código completo de InvoiceList.vue** con TODO incluido (template, script y CSS). Así evitamos errores de integración.

# 📄 InvoiceList.vue - CÓDIGO COMPLETO

```vue
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

    <div v-else-if="error" class="error-message">
      {{ error }}
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
                :checked="selectedInvoices.length === invoices.length && invoices.length > 0"
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
          <template v-for="invoice in invoices" :key="invoice.id">
            <!-- Fila principal de la factura -->
            <tr 
              :class="{ 
                selected: selectedInvoices.includes(invoice.id),
                'payment-row-active': activePaymentRow === invoice.id
              }"
            >
              <td>
                <input
                  type="checkbox"
                  :value="invoice.id"
                  v-model="selectedInvoices"
                />
              </td>
              <td class="invoice-number">{{ invoice.invoiceNumber || 'N/A' }}</td>
              <td>
                <div class="client-info">
                  <span class="client-name">{{ getClientName(invoice) }}</span>
                  <span class="client-contact">{{ getClientContact(invoice) }}</span>
                </div>
              </td>
              <td>{{ formatDate(invoice.createdAt) }}</td>
              <td :class="{ overdue: isOverdue(invoice.dueDate) && invoice.status !== 'paid' }">
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
                
                <!-- ✅ NUEVO: Botón para abrir/cerrar formulario de pago -->
                <button
                  v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
                  @click="togglePaymentForm(invoice)"
                  :class="['action-btn', 'paid', { active: activePaymentRow === invoice.id }]"
                  :title="activePaymentRow === invoice.id ? 'Cerrar formulario' : 'Registrar pago'"
                >
                  {{ activePaymentRow === invoice.id ? '❌' : '✅' }}
                </button>
                
                <button @click="editInvoice(invoice)" class="action-btn edit" title="Editar">
                  ✏️
                </button>
                <button
                  v-if="invoice.status !== 'cancelled' && invoice.status !== 'paid'"
                  @click="cancelInvoice(invoice)"
                  class="action-btn cancel"
                  title="Cancelar"
                >
                  ❌
                </button>
              </td>
            </tr>
            
            <!-- ✅ NUEVO: Fila expandible con formulario de pago inline -->
            <tr 
              v-if="activePaymentRow === invoice.id"
              :key="`payment-${invoice.id}`"
              class="payment-form-row"
            >
              <td colspan="9">
                <div class="inline-payment-form">
                  <h4>💳 Registrar Pago - Factura {{ invoice.invoiceNumber }}</h4>
                  
                  <div class="form-grid">
                    <!-- Selector de método de pago -->
                    <div class="form-group">
                      <label>Método de Pago *</label>
                      <select v-model="quickPaymentForm.gatewayId" @change="onGatewayChange" required>
                        <option 
                          v-for="gateway in paymentGateways" 
                          :key="gateway.id" 
                          :value="gateway.id"
                        >
                          {{ gateway.name }} ({{ formatGatewayType(gateway.gatewayType) }})
                        </option>
                      </select>
                    </div>

                    <!-- Monto -->
                    <div class="form-group">
                      <label>Monto *</label>
                      <input
                        type="number"
                        v-model="quickPaymentForm.amount"
                        :max="invoice.totalAmount"
                        step="0.01"
                        required
                      />
                      <small>Total factura: ${{ formatNumber(invoice.totalAmount) }}</small>
                    </div>

                    <!-- Referencia -->
                    <div class="form-group">
                      <label>Referencia</label>
                      <input
                        type="text"
                        v-model="quickPaymentForm.reference"
                        placeholder="Ej: TRANSFER-123456"
                      />
                    </div>

                    <!-- Fecha de pago -->
                    <div class="form-group">
                      <label>Fecha de Pago</label>
                      <input
                        type="date"
                        v-model="quickPaymentForm.paymentDate"
                      />
                    </div>
                  </div>

                  <!-- ✅ Comprobante (solo si es transferencia) -->
                  <div 
                    v-if="selectedGatewayType === 'transfer'" 
                    class="form-group full-width receipt-upload"
                  >
                    <label>📎 Comprobante de Transferencia</label>
                    <input
                      type="file"
                      @change="handleReceiptUpload"
                      accept=".jpg,.jpeg,.png,.pdf"
                      ref="receiptInput"
                    />
                    <small>Formatos: JPG, PNG, PDF (máx. 5MB) - Opcional pero recomendado</small>
                    
                    <div v-if="quickPaymentReceipt" class="file-preview">
                      <span class="file-name">📄 {{ quickPaymentReceipt.name }}</span>
                      <button @click="removeReceipt" class="remove-file" type="button">✕</button>
                    </div>
                  </div>

                  <!-- Notas -->
                  <div class="form-group full-width">
                    <label>Notas</label>
                    <textarea
                      v-model="quickPaymentForm.notes"
                      rows="2"
                      placeholder="Notas sobre el pago..."
                    ></textarea>
                  </div>

                  <!-- Botones de acción -->
                  <div class="form-actions">
                    <button 
                      type="button" 
                      @click="cancelQuickPayment" 
                      class="btn-cancel"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button" 
                      @click="submitQuickPayment(invoice)" 
                      class="btn-confirm"
                      :disabled="submittingQuickPayment"
                    >
                      {{ submittingQuickPayment ? 'Procesando...' : 'Registrar Pago' }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
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
import PaymentService from '../services/payment.service';

export default {
  name: 'InvoiceList',
  data() {
    return {
      invoices: [],
      loading: false,
      error: null,
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
      },
      
      // ✅ NUEVO: Datos para formulario inline de pago
      activePaymentRow: null,
      paymentGateways: [],
      selectedGatewayType: null,
      quickPaymentForm: {
        gatewayId: null,
        amount: null,
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      },
      quickPaymentReceipt: null,
      submittingQuickPayment: false
    };
  },

  created() {
    this.loadInvoices();
    this.loadSummary();
    this.loadPaymentGateways(); // ✅ NUEVO
  },

  methods: {
    // ✅ NUEVO: Cargar pasarelas de pago
    async loadPaymentGateways() {
      try {
        const response = await PaymentService.getAllPaymentGateways({ active: true });
        this.paymentGateways = response.data.data || response.data || [];
        
        // Si no hay gateways en BD, usar valores por defecto
        if (!this.paymentGateways || this.paymentGateways.length === 0) {
          this.paymentGateways = [
            { id: 1, name: 'Efectivo', gatewayType: 'cash' },
            { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' },
            { id: 3, name: 'Mercado Pago', gatewayType: 'mercadopago' },
            { id: 4, name: 'PayPal', gatewayType: 'paypal' }
          ];
        }
        
        // Seleccionar efectivo por defecto
        const cashGateway = this.paymentGateways.find(g => g.gatewayType === 'cash');
        if (cashGateway) {
          this.quickPaymentForm.gatewayId = cashGateway.id;
          this.selectedGatewayType = 'cash';
        }
      } catch (error) {
        console.error('Error cargando gateways:', error);
        // Gateways por defecto en caso de error
        this.paymentGateways = [
          { id: 1, name: 'Efectivo', gatewayType: 'cash' },
          { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' }
        ];
        this.quickPaymentForm.gatewayId = 1;
        this.selectedGatewayType = 'cash';
      }
    },

    // ✅ NUEVO: Mostrar/ocultar formulario inline
    togglePaymentForm(invoice) {
      if (this.activePaymentRow === invoice.id) {
        this.cancelQuickPayment();
      } else {
        this.activePaymentRow = invoice.id;
        this.quickPaymentForm.amount = invoice.totalAmount;
        this.quickPaymentForm.paymentDate = new Date().toISOString().split('T')[0];
        this.quickPaymentForm.reference = '';
        this.quickPaymentForm.notes = '';
        this.quickPaymentReceipt = null;
        
        // Seleccionar gateway por defecto (efectivo)
        const cashGateway = this.paymentGateways.find(g => g.gatewayType === 'cash');
        if (cashGateway) {
          this.quickPaymentForm.gatewayId = cashGateway.id;
          this.selectedGatewayType = 'cash';
        }
      }
    },

    // ✅ NUEVO: Cambio de gateway
    onGatewayChange() {
      const selectedGateway = this.paymentGateways.find(
        g => g.id === this.quickPaymentForm.gatewayId
      );
      this.selectedGatewayType = selectedGateway?.gatewayType || null;
      
      // Limpiar comprobante si cambia a no-transferencia
      if (this.selectedGatewayType !== 'transfer') {
        this.quickPaymentReceipt = null;
        if (this.$refs.receiptInput) {
          this.$refs.receiptInput.value = '';
        }
      }
    },

    // ✅ NUEVO: Manejar subida de comprobante
    handleReceiptUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. Máximo 5MB.');
          event.target.value = '';
          return;
        }
        this.quickPaymentReceipt = file;
      }
    },

    // ✅ NUEVO: Remover comprobante
    removeReceipt() {
      this.quickPaymentReceipt = null;
      if (this.$refs.receiptInput) {
        this.$refs.receiptInput.value = '';
      }
    },

    // ✅ NUEVO: Enviar pago rápido
    async submitQuickPayment(invoice) {
      this.submittingQuickPayment = true;
      
      try {
        const selectedGateway = this.paymentGateways.find(
          g => g.id === this.quickPaymentForm.gatewayId
        );
        
        if (!selectedGateway) {
          alert('Por favor seleccione un método de pago válido.');
          this.submittingQuickPayment = false;
          return;
        }
        
        if (!this.quickPaymentForm.amount || this.quickPaymentForm.amount <= 0) {
          alert('Por favor ingrese un monto válido.');
          this.submittingQuickPayment = false;
          return;
        }
        
        // ✅ Obtener usuario actual
        const currentUser = this.$store?.state?.auth?.user || 
                           JSON.parse(localStorage.getItem('user') || '{}');
        const submittedBy = currentUser.id || 1;
        
        const paymentData = {
          invoiceId: invoice.id,
          clientId: invoice.clientId,
          gatewayId: this.quickPaymentForm.gatewayId,
          amount: parseFloat(this.quickPaymentForm.amount),
          paymentMethod: this.getPaymentMethodFromGateway(selectedGateway),
          paymentDate: this.quickPaymentForm.paymentDate,
          paymentReference: this.quickPaymentForm.reference || 
                           `${selectedGateway.gatewayType.toUpperCase()}-${Date.now()}`,
          notes: this.quickPaymentForm.notes || `Pago registrado vía ${selectedGateway.name}`,
          submittedBy
        };
        
        console.log('📤 Registrando pago inline:', paymentData);
        
        // ✅ Determinar flujo según tipo de gateway
        if (selectedGateway.gatewayType === 'cash') {
          // ✅ EFECTIVO: Auto-aprobado
          await InvoiceService.markAsPaid(invoice.id, paymentData);
          alert(`✅ Pago en efectivo registrado y aprobado automáticamente.\n\nMonto: $${this.formatNumber(paymentData.amount)}\nRegistrado por: ${currentUser.fullName || 'Usuario'}`);
          
        } else if (selectedGateway.gatewayType === 'transfer') {
          // ✅ TRANSFERENCIA: Pendiente de aprobación
          if (!this.quickPaymentReceipt) {
            const confirmWithout = confirm(
              '⚠️ No ha adjuntado comprobante de transferencia.\n\n¿Desea continuar de todas formas?\n\nNota: Se recomienda adjuntar el comprobante para agilizar la aprobación.'
            );
            if (!confirmWithout) {
              this.submittingQuickPayment = false;
              return;
            }
          }
          
          await PaymentService.submitManualPayment(paymentData, this.quickPaymentReceipt);
          alert(`⏳ Pago por transferencia registrado exitosamente.\n\nMonto: $${this.formatNumber(paymentData.amount)}\nEstado: Pendiente de aprobación\n${this.quickPaymentReceipt ? 'Comprobante adjunto: ✓' : 'Sin comprobante adjunto'}`);
          
        } else {
          // ✅ PASARELAS ONLINE: Pendiente (se aprueba por webhook)
          await InvoiceService.markAsPaid(invoice.id, paymentData);
          alert(`⏳ Pago registrado exitosamente.\n\nMonto: $${this.formatNumber(paymentData.amount)}\nPasarela: ${selectedGateway.name}\n\nEsperando confirmación de la pasarela de pago...`);
        }
        
        // ✅ Cerrar formulario y recargar datos
        this.cancelQuickPayment();
        await this.loadInvoices();
        await this.loadSummary();
        
      } catch (error) {
        console.error('❌ Error registrando pago rápido:', error);
        const errorMsg = error.response?.data?.message || 
                        error.response?.data?.error ||
                        'Error registrando el pago. Por favor, intente nuevamente.';
        alert(`❌ ${errorMsg}`);
      } finally {
        this.submittingQuickPayment = false;
      }
    },

    // ✅ NUEVO: Cancelar formulario rápido
    cancelQuickPayment() {
      this.activePaymentRow = null;
      this.quickPaymentForm = {
        gatewayId: null,
        amount: null,
        reference: '',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      };
      this.quickPaymentReceipt = null;
      this.selectedGatewayType = null;
    },

    // ✅ NUEVO: Obtener método de pago desde gateway
    getPaymentMethodFromGateway(gateway) {
      if (!gateway) return 'cash';
      
      const methodMap = {
        'cash': 'cash',
        'transfer': 'transfer',
        'card': 'card',
        'oxxo': 'oxxo',
        'spei': 'spei',
        'paypal': 'online',
        'mercadopago': 'online'
      };
      
      return methodMap[gateway.gatewayType] || 'cash';
    },

    formatGatewayType(gatewayType) {
      const types = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'oxxo': 'OXXO',
        'spei': 'SPEI',
        'paypal': 'PayPal',
        'mercadopago': 'Mercado Pago'
      };
      return types[gatewayType] || gatewayType;
    },

    // ========== MÉTODOS EXISTENTES (SIN CAMBIOS) ==========

    async loadInvoices() {
      this.loading = true;
      this.error = null;
      
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
        
        let data;
        if (response.data.data) {
          data = response.data.data;
        } else if (response.data.invoices) {
          data = response.data;
        } else {
          throw new Error('Estructura de respuesta no reconocida');
        }
        
        if (data.invoices && Array.isArray(data.invoices)) {
          this.invoices = data.invoices;
          
          if (data.pagination) {
            this.pagination = {
              currentPage: data.pagination.currentPage || this.pagination.currentPage,
              totalPages: data.pagination.totalPages || 1,
              totalItems: data.pagination.totalItems || 0,
              pageSize: this.pagination.pageSize
            };
          }
          
          if (data.stats) {
            this.summary = {
              totalAmount: 0,
              pendingCount: data.stats.pending || 0,
              overdueCount: data.stats.overdue || 0
            };
          }
        } else {
          this.error = 'No se encontraron facturas';
          this.invoices = [];
        }

        this.selectedInvoices = [];
        
      } catch (error) {
        console.error('❌ Error cargando facturas:', error);
        this.error = error.response?.data?.message || 
                     'Error al cargar las facturas. Por favor, intente nuevamente.';
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
        console.error('❌ Error cargando resumen:', error);
      }
    },

    changePage(page) {
      if (page >= 1 && page <= this.pagination.totalPages) {
        this.pagination.currentPage = page;
        this.loadInvoices();
      }
    },

    toggleSelectAll() {
      if (this.selectedInvoices.length === this.invoices.length && this.invoices.length > 0) {
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
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `factura-${invoice.invoiceNumber || invoice.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('❌ Error descargando PDF:', error);
        alert('Error al descargar el PDF de la factura.');
      }
    },

    cancelInvoice(invoice) {
      this.showConfirmation(
        'Cancelar Factura',
        `¿Está seguro que desea cancelar la factura ${invoice.invoiceNumber || invoice.id}? Esta acción no se puede deshacer.`,
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
        console.log('📧 Enviando recordatorios a:', this.selectedInvoices);
        // TODO: Implementar en el backend
        alert(`Recordatorios enviados a ${this.selectedInvoices.length} cliente(s)`);
        this.clearSelection();
      } catch (error) {
        console.error('❌ Error enviando recordatorios:', error);
        alert('Error enviando recordatorios');
      }
    },

    async bulkDownloadPDF() {
      try {
        for (const invoiceId of this.selectedInvoices) {
          const invoice = this.invoices.find(inv => inv.id === invoiceId);
          if (invoice) {
            await this.downloadPDF(invoice);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        this.clearSelection();
      } catch (error) {
        console.error('❌ Error en descarga masiva:', error);
        alert('Error en la descarga masiva');
      }
    },

    async bulkProcessOverdue() {
      try {
        console.log('⚡ Procesando facturas vencidas...');
        const response = await InvoiceService.processOverdueInvoices();
        
        const processedCount = response.data.processedCount || 0;
        alert(`Se procesaron ${processedCount} facturas vencidas`);
        
        this.loadInvoices();
        this.loadSummary();
      } catch (error) {
        console.error('❌ Error procesando facturas vencidas:', error);
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

        console.log('🔄 Ejecutando acción:', action);

        switch (action) {
          case 'cancelInvoice': {
            await InvoiceService.cancelInvoice(data.id);
            console.log('✅ Factura cancelada');
            break;
          }
            
          case 'bulkMarkAsPaid': {
            const results = { success: 0, failed: 0 };
            for (const invoiceId of data) {
              try {
                const invoice = this.invoices.find(inv => inv.id === invoiceId);
                const currentUser = this.$store?.state?.auth?.user || 
                                   JSON.parse(localStorage.getItem('user') || '{}');
                
                const paymentData = {
                  gatewayId: 1, // Efectivo por defecto
                  paymentMethod: 'cash',
                  amount: parseFloat(invoice.totalAmount),
                  notes: 'Pago masivo registrado',
                  paymentDate: new Date().toISOString().split('T')[0],
                  paymentReference: `BULK-${Date.now()}-${invoiceId}`,
                  submittedBy: currentUser.id || 1
                };
                
                await InvoiceService.markAsPaid(invoiceId, paymentData);
                results.success++;
              } catch (err) {
                results.failed++;
                console.error(`Error marcando factura ${invoiceId}:`, err);
              }
            }
            console.log(`✅ Operación masiva: ${results.success} exitosas, ${results.failed} fallidas`);
            if (results.failed > 0) {
              alert(`${results.success} facturas marcadas correctamente.\n${results.failed} facturas fallaron.`);
            } else {
              alert(`✅ ${results.success} facturas marcadas como pagadas exitosamente.`);
            }
            this.clearSelection();
            break;
          }
        }

        this.closeConfirmModal();
        await this.loadInvoices();
        await this.loadSummary();
        
      } catch (error) {
        console.error('❌ Error ejecutando acción:', error);
        alert('Error ejecutando la acción');
      }
    },

    // Métodos de utilidad
    getClientName(invoice) {
      if (invoice.Client) {
        return `${invoice.Client.firstName} ${invoice.Client.lastName}`;
      }
      if (invoice.clientName) {
        return invoice.clientName;
      }
      return `Cliente #${invoice.clientId || 'N/A'}`;
    },

    getClientContact(invoice) {
      if (invoice.Client) {
        return invoice.Client.phone || invoice.Client.email || '';
      }
      if (invoice.clientPhone) {
        return invoice.clientPhone;
      }
      if (invoice.clientEmail) {
        return invoice.clientEmail;
      }
      return '';
    },

    formatNumber(value) {
      if (!value && value !== 0) return '0.00';
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
      return InvoiceService.calculateOverdueDays(dueDate);
    },

    getStatusInfo(status) {
      return InvoiceService.formatInvoiceStatus(status);
    }
  }
};
</script>

<style scoped>
/* ========== ESTILOS BASE (EXISTENTES) ========== */
.invoice-list {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.add-button,
.process-button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-button {
  background: #667eea;
  color: white;
}

.add-button:hover {
  background: #5568d3;
  transform: translateY(-1px);
}

.process-button {
  background: #f59e0b;
  color: white;
}

.process-button:hover {
  background: #d97706;
}

/* Filtros */
.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.filter-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 300px;
  font-size: 14px;
}

.search-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.date-input,
select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.date-separator {
  color: #666;
  font-weight: 500;
}

/* Resumen */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-card .label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.summary-card .value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

/* Estados */
.loading,
.error-message,
.no-data {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  color: #666;
}

.error-message {
  color: #dc2626;
}

/* Tabla */
.table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.invoice-table {
  width: 100%;
  border-collapse: collapse;
}

.invoice-table thead {
  background: #f8f9fa;
}

.invoice-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #555;
  font-size: 14px;
  border-bottom: 2px solid #e0e0e0;
}

.invoice-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.invoice-table tbody tr {
  transition: background-color 0.2s;
}

.invoice-table tbody tr:hover {
  background-color: #f8f9fa;
}

.invoice-table tbody tr.selected {
  background-color: #e3f2fd;
}

.invoice-number {
  font-weight: 600;
  color: #667eea;
}

.client-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.client-name {
  font-weight: 500;
  color: #333;
}

.client-contact {
  font-size: 12px;
  color: #888;
}

.amount {
  font-weight: 600;
  color: #059669;
}

.overdue {
  color: #dc2626;
  font-weight: 600;
}

.days-overdue {
  background: #fef2f2;
  color: #dc2626;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.paid {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.overdue {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.cancelled {
  background: #f3f4f6;
  color: #6b7280;
}

/* Acciones */
.actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-btn {
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #f0f0f0;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.action-btn.view {
  background: #dbeafe;
}

.action-btn.download {
  background: #e0e7ff;
}

.action-btn.edit {
  background: #fef3c7;
}

.action-btn.cancel {
  background: #fee2e2;
}

.action-btn.paid {
  background: #d1fae5;
}

.action-btn.paid.active {
  background: #fee2e2;
  color: #991b1b;
}

/* ✅ NUEVOS ESTILOS: Formulario inline de pago */
.payment-row-active {
  background-color: #f0f8ff !important;
  border-left: 4px solid #667eea;
}

.payment-form-row {
  background-color: #fafbfc;
}

.payment-form-row td {
  padding: 0 !important;
  border: none !important;
}

.inline-payment-form {
  padding: 24px;
  background: white;
  border-radius: 0;
  margin: 0;
  border-top: 3px solid #667eea;
  border-bottom: 2px solid #e0e0e0;
  box-shadow: inset 0 2px 8px rgba(102, 126, 234, 0.08);
}

.inline-payment-form h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
  font-weight: 700;
  padding-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  font-family: inherit;
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
  color: #888;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

/* Sección de comprobante */
.receipt-upload {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.receipt-upload input[type="file"] {
  padding: 8px;
  background: white;
  cursor: pointer;
}

.file-preview {
  margin-top: 12px;
  padding: 10px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-name {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.remove-file {
  background: #fee2e2;
  color: #991b1b;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.2s;
}

.remove-file:hover {
  background: #fecaca;
  transform: scale(1.1);
}

/* Botones del formulario */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e0e0e0;
  color: #333;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.btn-confirm {
  background: #667eea;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-confirm:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Acciones en lote */
.bulk-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  margin-top: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.bulk-info {
  font-weight: 600;
  color: #333;
}

.bulk-buttons {
  display: flex;
  gap: 8px;
}

.bulk-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn.paid {
  background: #d1fae5;
  color: #065f46;
}

.bulk-btn.remind {
  background: #fef3c7;
  color: #92400e;
}

.bulk-btn.download {
  background: #e0e7ff;
  color: #3730a3;
}

.bulk-btn.clear {
  background: #f3f4f6;
  color: #6b7280;
}

.bulk-btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

/* Paginación */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.page-btn {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #5568d3;
}

.page-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 20px;
}

.modal-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Responsive */
@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .invoice-list {
    padding: 12px;
  }

  .header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
  }

  .filters {
    flex-direction: column;
  }

  .filter-group {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .table-container {
    overflow-x: auto;
  }

  .invoice-table {
    min-width: 800px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .bulk-actions {
    flex-direction: column;
    gap: 12px;
  }

  .bulk-buttons {
    flex-direction: column;
    width: 100%;
  }

  .bulk-btn {
    width: 100%;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}

/* Animaciones */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.payment-form-row {
  animation: slideDown 0.3s ease-out;
}
</style>