
<template>
  <div class="billing-tab">
    <div class="billing-grid">
      
      <!-- Resumen de Facturaci車n -->
      <div class="section-card resumen-facturacion">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">??</div>
            <h3>Resumen de Facturaci車n</h3>
          </div>
          <div class="section-actions">
            <button @click="refreshBilling" class="btn btn-secondary" :disabled="loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Actualizar
            </button>
            <button @click="editBillingConfig" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Configurar
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando informaci車n de facturaci車n...</span>
          </div>
          
          <div v-else-if="billingInfo" class="billing-summary">
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Estado Actual</span>
                <span :class="['summary-value', 'status-' + billingInfo.clientStatus]">
                  {{ formatClientStatus(billingInfo.clientStatus) }}
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">Cuota Mensual</span>
                <span class="summary-value price">
                  ${{ billingInfo.monthlyFee || '0.00' }}
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">D赤a de Facturaci車n</span>
                <span class="summary-value">
                  {{ billingInfo.billingDay || 'No definido' }} de cada mes
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">迆ltimo Pago</span>
                <span class="summary-value">
                  {{ formatDate(billingInfo.lastPaymentDate) || 'Sin pagos registrados' }}
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">Pr車ximo Vencimiento</span>
                <span :class="['summary-value', getPaymentStatusClass(billingInfo.nextDueDate)]">
                  {{ formatDate(billingInfo.nextDueDate) || 'No definido' }}
                  <span v-if="getDaysUntilDue(billingInfo.nextDueDate)" class="days-info">
                    ({{ getDaysUntilDue(billingInfo.nextDueDate) }})
                  </span>
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">M谷todo de Pago</span>
                <span class="summary-value">
                  {{ formatPaymentMethod(billingInfo.paymentMethod) }}
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">D赤as de Gracia</span>
                <span class="summary-value">
                  {{ billingInfo.graceDays || 0 }} d赤as
                </span>
              </div>

              <div class="summary-item">
                <span class="summary-label">Penalizaci車n</span>
                <span class="summary-value price">
                  ${{ billingInfo.penaltyFee || '0.00' }}
                </span>
              </div>
            </div>

            <div class="billing-actions">
              <button @click="registerPayment" class="btn btn-primary">
                ?? Registrar Pago
              </button>
              <button @click="downloadAccountStatement" class="btn btn-secondary">
                ?? Estado de Cuenta
              </button>
              <button @click="viewPaymentHistory" class="btn btn-secondary">
                ?? Historial Completo
              </button>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">??</div>
            <h4>Sin configuraci車n de facturaci車n</h4>
            <p>Este cliente no tiene configurada su informaci車n de facturaci車n</p>
            <button @click="setupBilling" class="btn btn-primary">
              Configurar Facturaci車n
            </button>
          </div>
        </div>
      </div>

      <!-- Historial de Pagos Recientes -->
      <div class="section-card historial-pagos">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">??</div>
            <h3>Pagos Recientes</h3>
            <span class="count-badge">{{ recentPayments.length }}</span>
          </div>
          <div class="section-actions">
            <button @click="registerPayment" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Registrar Pago
            </button>
            <button @click="viewAllPayments" class="btn btn-secondary">
              ??? Ver Todos
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loadingPayments" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando pagos...</span>
          </div>
          
          <div v-else-if="recentPayments.length > 0" class="payments-list">
            <div 
              v-for="payment in recentPayments" 
              :key="payment.id"
              class="payment-card"
            >
              <div class="payment-header">
                <div class="payment-info">
                  <h4>${{ payment.amount }}</h4>
                  <div class="payment-meta">
                    <span class="payment-date">{{ formatDate(payment.paymentDate) }}</span>
                    <span :class="['payment-status', 'status-' + payment.status]">
                      {{ formatPaymentStatus(payment.status) }}
                    </span>
                  </div>
                </div>
                <div class="payment-method">
                  <span class="method-badge">
                    {{ getPaymentMethodIcon(payment.paymentMethod) }}
                    {{ formatPaymentMethod(payment.paymentMethod) }}
                  </span>
                </div>
              </div>

              <div class="payment-details">
                <div v-if="payment.paymentReference" class="detail-item">
                  <span class="detail-label">Referencia:</span>
                  <span class="detail-value reference">{{ payment.paymentReference }}</span>
                </div>
                
                <div v-if="payment.gatewayResponse" class="detail-item">
                  <span class="detail-label">Gateway:</span>
                  <span class="detail-value">{{ payment.gatewayResponse.gateway || 'Cash' }}</span>
                </div>
              </div>

              <div class="payment-actions">
                <button @click="viewPaymentDetails(payment)" class="action-btn secondary">
                  ??? Ver
                </button>
                <button 
                  v-if="payment.status === 'completed'" 
                  @click="printReceipt(payment)" 
                  class="action-btn secondary"
                >
                  ??? Recibo
                </button>
                <button 
                  v-if="payment.status === 'pending'" 
                  @click="confirmPayment(payment)" 
                  class="action-btn primary"
                >
                  ? Confirmar
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">??</div>
            <h4>Sin pagos registrados</h4>
            <p>No hay pagos registrados para este cliente</p>
            <button @click="registerPayment" class="btn btn-primary">
              Registrar Primer Pago
            </button>
          </div>
        </div>
      </div>

      <!-- Facturas -->
      <div class="section-card facturas-cliente">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">??</div>
            <h3>Facturas</h3>
            <span class="count-badge">{{ clientInvoices.length }}</span>
          </div>
          <div class="section-actions">
            <button @click="generateInvoice" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
              </svg>
              Generar Factura
            </button>
            <button @click="refreshInvoices" class="btn btn-secondary">
              ?? Actualizar
            </button>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loadingInvoices" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando facturas...</span>
          </div>
          
          <div v-else-if="clientInvoices.length > 0" class="invoices-list">
            <div 
              v-for="invoice in displayedInvoices" 
              :key="invoice.id"
              class="invoice-card"
            >
              <div class="invoice-header">
                <div class="invoice-info">
                  <h4>Factura #{{ invoice.invoiceNumber || invoice.id }}</h4>
                  <div class="invoice-meta">
                    <span class="invoice-period">
                      {{ formatInvoicePeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd) }}
                    </span>
                    <span :class="['invoice-status', 'status-' + invoice.status]">
                      {{ formatInvoiceStatus(invoice.status) }}
                    </span>
                  </div>
                </div>
                <div class="invoice-amount">
                  <span class="amount">${{ invoice.totalAmount || invoice.amount }}</span>
                  <span class="due-date">Vence: {{ formatDate(invoice.dueDate) }}</span>
                </div>
              </div>

              <div class="invoice-details">
                <div class="detail-row">
                  <span class="detail-label">Subtotal:</span>
                  <span class="detail-value">${{ invoice.amount }}</span>
                </div>
                
                <div v-if="invoice.taxAmount" class="detail-row">
                  <span class="detail-label">Impuestos:</span>
                  <span class="detail-value">${{ invoice.taxAmount }}</span>
                </div>
                
                <div v-if="invoice.status === 'overdue'" class="detail-row overdue">
                  <span class="detail-label">D赤as de Retraso:</span>
                  <span class="detail-value">{{ calculateOverdueDays(invoice.dueDate) }} d赤as</span>
                </div>
              </div>

              <div class="invoice-actions">
                <button @click="viewInvoiceDetails(invoice)" class="action-btn secondary">
                  ??? Ver Detalles
                </button>
                <button @click="downloadInvoicePDF(invoice)" class="action-btn secondary">
                  ?? PDF
                </button>
                <button 
                  v-if="invoice.status === 'pending' || invoice.status === 'overdue'"
                  @click="openPaymentModal(invoice)" 
                  class="action-btn primary"
                >
                  ?? Marcar Pagada
                </button>
                <button 
                  v-if="invoice.status === 'pending'"
                  @click="sendInvoiceByEmail(invoice)" 
                  class="action-btn secondary"
                >
                  ?? Enviar
                </button>
              </div>
            </div>

            <div v-if="clientInvoices.length > 3" class="show-more">
              <button @click="toggleShowAllInvoices" class="btn btn-secondary">
                {{ showAllInvoices ? 'Mostrar menos' : `Ver todas (${clientInvoices.length})` }}
              </button>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">??</div>
            <h4>Sin facturas generadas</h4>
            <p>No hay facturas generadas para este cliente</p>
            <button @click="generateInvoice" class="btn btn-primary">
              Generar Primera Factura
            </button>
          </div>
        </div>
      </div>

      <!-- Estad赤sticas de Facturaci車n -->
      <div class="section-card estadisticas-billing">
        <div class="section-header">
          <div class="section-title">
            <div class="section-icon">??</div>
            <h3>Estad赤sticas</h3>
          </div>
          <div class="section-actions">
            <select v-model="statsFilter" @change="loadStats" class="filter-select">
              <option value="monthly">Este Mes</option>
              <option value="quarterly">Trimestre</option>
              <option value="yearly">Este A?o</option>
              <option value="all">Todo el Tiempo</option>
            </select>
          </div>
        </div>
        
        <div class="section-content">
          <div v-if="loadingStats" class="loading-state">
            <div class="loading-spinner"></div>
            <span>Cargando estad赤sticas...</span>
          </div>
          
          <div v-else class="stats-grid">
            <div class="stat-item">
              <div class="stat-icon">??</div>
              <div class="stat-info">
                <div class="stat-value">${{ billingStats.totalPaid || '0.00' }}</div>
                <div class="stat-label">Total Pagado</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">??</div>
              <div class="stat-info">
                <div class="stat-value">{{ billingStats.totalPayments || 0 }}</div>
                <div class="stat-label">Pagos Realizados</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">??</div>
              <div class="stat-info">
                <div class="stat-value">{{ billingStats.averageDaysLate || 0 }}</div>
                <div class="stat-label">D赤as Promedio de Retraso</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">?</div>
              <div class="stat-info">
                <div class="stat-value">{{ billingStats.paymentScore || 0 }}%</div>
                <div class="stat-label">Puntuaci車n de Pago</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">??</div>
              <div class="stat-info">
                <div class="stat-value">{{ billingStats.totalInvoices || 0 }}</div>
                <div class="stat-label">Facturas Generadas</div>
              </div>
            </div>

            <div class="stat-item">
              <div class="stat-icon">?</div>
              <div class="stat-info">
                <div class="stat-value">{{ billingStats.pendingInvoices || 0 }}</div>
                <div class="stat-label">Facturas Pendientes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ? NUEVO: Modal de Pago (igual que InvoiceDetail) -->
    <div v-if="showPaymentModal" class="modal-overlay" @click="closePaymentModal">
      <div class="modal-content" @click.stop>
        <h3>Registrar Pago - Factura #{{ selectedInvoice?.invoiceNumber || selectedInvoice?.id }}</h3>
        <p>Monto total: <strong>${{ selectedInvoice?.totalAmount || selectedInvoice?.amount }}</strong></p>
        
        <div class="payment-options">
          <div class="form-group">
            <label for="selectedGateway">M谷todo de Pago *</label>
            <select id="selectedGateway" v-model="paymentForm.gatewayId" @change="onGatewayChange" required>
              <option v-for="gateway in paymentGateways" :key="gateway.id" :value="gateway.id">
                {{ gateway.name }} ({{ formatGatewayType(gateway.gatewayType) }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="paymentAmount">Monto *</label>
            <input
              type="number"
              id="paymentAmount"
              v-model="paymentForm.amount"
              :max="selectedInvoice?.totalAmount || selectedInvoice?.amount"
              step="0.01"
              required
            />
            <small>M芍ximo: ${{ selectedInvoice?.totalAmount || selectedInvoice?.amount }}</small>
          </div>

          <div class="form-group">
            <label for="paymentRef">Referencia de Pago</label>
            <input
              type="text"
              id="paymentRef"
              v-model="paymentForm.reference"
              placeholder="Ej: TRANSFER-123456"
            />
          </div>

          <!-- ? Campo de comprobante (solo transferencias) -->
          <div v-if="selectedGatewayType === 'transfer'" class="form-group full-width">
            <label for="receiptFile">
              Comprobante de Transferencia 
              <span class="optional">(Recomendado)</span>
            </label>
            <input
              type="file"
              id="receiptFile"
              @change="handleReceiptUpload"
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <small>Formatos: JPG, PNG, PDF (m芍x. 5MB)</small>
            
            <div v-if="receiptFile" class="file-selected">
              <span class="file-icon">??</span>
              <span class="file-name">{{ receiptFile.name }}</span>
              <span class="file-size">({{ formatFileSize(receiptFile.size) }})</span>
            </div>
          </div>
          
          <!-- ? Info boxes -->
          <div class="gateway-info">
            <div v-if="selectedGatewayType === 'cash'" class="info-box info-success">
              <strong>?? Pago en Efectivo</strong>
              <p>El pago ser芍 aprobado autom芍ticamente al registrarse.</p>
            </div>
            
            <div v-else-if="selectedGatewayType === 'transfer'" class="info-box info-warning">
              <strong>?? Transferencia Bancaria</strong>
              <p>El pago entrar芍 en estado PENDIENTE y requerir芍 aprobaci車n manual.</p>
              <p>Se recomienda adjuntar el comprobante para agilizar la revisi車n.</p>
            </div>
            
            <div v-else-if="selectedGatewayType === 'mercadopago' || selectedGatewayType === 'paypal'" class="info-box info-primary">
              <strong>?? Pasarela de Pago</strong>
              <p>El pago ser芍 confirmado autom芍ticamente cuando la pasarela notifique el resultado.</p>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="paymentNotes">Notas</label>
          <textarea
            id="paymentNotes"
            v-model="paymentForm.notes"
            rows="3"
            placeholder="Notas sobre el pago..."
          ></textarea>
        </div>

        <div class="modal-actions">
          <button @click="closePaymentModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="submitPayment" class="btn-confirm" :disabled="isProcessing">
            {{ isProcessing ? 'Procesando...' : 'Registrar Pago' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ClientService from '../../services/client.service';
import BillingService from '../../services/billing.service';
import InvoiceService from '../../services/invoice.service';
import PaymentService from '../../services/payment.service';

export default {
  name: 'BillingTab',
  props: {
    clientId: {
      type: [Number, String],
      required: true
    },
    billingInfo: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      // Estados de carga
      loading: false,
      loadingPayments: false,
      loadingInvoices: false,
      loadingStats: false,
      isProcessing: false, // ? NUEVO
      
      // Datos principales
      recentPayments: [],
      clientInvoices: [],
      billingStats: {},
      
      // ? NUEVO: Pasarelas de pago
      paymentGateways: [],
      selectedGatewayType: null,
      
      // ? NUEVO: Modal de pago
      showPaymentModal: false,
      selectedInvoice: null,
      paymentForm: {
        gatewayId: null,
        amount: null,
        reference: '',
        notes: ''
      },
      receiptFile: null,
      
      // Configuraciones
      statsFilter: 'monthly',
      showAllInvoices: false
    };
  },
  
  computed: {
    displayedInvoices() {
      if (this.showAllInvoices) {
        return this.clientInvoices;
      }
      return this.clientInvoices.slice(0, 3);
    }
  },
  
  async mounted() {
    console.log('?? BillingTab mounted');
    console.log('?? ClientId recibido:', this.clientId);
    console.log('?? BillingInfo recibido:', this.billingInfo);
    
    if (this.clientId) {
      await this.loadPaymentGateways(); // ? NUEVO: Cargar primero las pasarelas
      this.loadAllBillingData();
    } else {
      console.error('? No se recibi車 clientId v芍lido');
    }
  },
  
  methods: {
    // ===============================
    // ? NUEVO: Cargar pasarelas de pago
    // ===============================
    async loadPaymentGateways() {
      try {
        console.log('?? Cargando pasarelas de pago...');
        const response = await PaymentService.getAllPaymentGateways({ active: true });
        this.paymentGateways = response.data.data || response.data || [];
        
        if (!this.paymentGateways || this.paymentGateways.length === 0) {
          console.log('?? No hay gateways en BD, usando valores por defecto');
          this.paymentGateways = [
            { id: 1, name: 'Efectivo', gatewayType: 'cash' },
            { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' },
            { id: 3, name: 'Mercado Pago', gatewayType: 'mercadopago' },
            { id: 4, name: 'PayPal', gatewayType: 'paypal' }
          ];
        }
        
        console.log('? Gateways cargados:', this.paymentGateways);
      } catch (error) {
        console.error('? Error cargando gateways:', error);
        this.paymentGateways = [
          { id: 1, name: 'Efectivo', gatewayType: 'cash' },
          { id: 2, name: 'Transferencia Bancaria', gatewayType: 'transfer' }
        ];
      }
    },

    // ===============================
    // CARGA DE DATOS
    // ===============================
    async loadAllBillingData() {
      await Promise.all([
        this.loadRecentPayments(),
        this.loadClientInvoices(),
        this.loadStats()
      ]);
    },

    async loadRecentPayments() {
      this.loadingPayments = true;
      try {
        console.log('?? Iniciando carga de pagos para clientId:', this.clientId);
        
        const response = await PaymentService.getAllPayments({ 
          clientId: this.clientId, 
          limit: 5 
        });
        
        console.log('?? Respuesta RAW de pagos:', response);
        
        const paymentsData = this.extractApiData(response);
        console.log('?? Datos extra赤dos:', paymentsData);
        
        this.recentPayments = paymentsData.payments || [];
        
        console.log('? Pagos recientes finales:', this.recentPayments.length);
        
      } catch (error) {
        console.error('? ERROR completo cargando pagos:', error);
        console.error('? Error response:', error.response?.data);
        this.recentPayments = [];
      } finally {
        this.loadingPayments = false;
      }
    },

    async loadClientInvoices() {
      this.loadingInvoices = true;
      try {
        console.log('?? Cargando facturas para clientId:', this.clientId);
        
        const response = await InvoiceService.getClientInvoices(this.clientId, { 
          page: 1,
          limit: 10
        });
        
        console.log('?? Respuesta de facturas:', response);
        
        const invoicesData = this.extractApiData(response);
        this.clientInvoices = invoicesData.invoices || invoicesData || [];
        
        console.log('? Facturas del cliente cargadas:', this.clientInvoices.length);
        
      } catch (error) {
        console.error('? Error cargando facturas del cliente:', error);
        console.error('? Response:', error.response?.data);
        this.clientInvoices = [];
      } finally {
        this.loadingInvoices = false;
      }
    },

    async loadStats() {
      this.loadingStats = true;
      try {
        console.log('?? Calculando estad赤sticas b芍sicas');
        
        let allPayments = [];
        try {
          const allPaymentsResponse = await PaymentService.getAllPayments({
            clientId: this.clientId,
            limit: 100
          });
          const allPaymentsData = this.extractApiData(allPaymentsResponse);
          allPayments = allPaymentsData.payments || [];
        } catch (error) {
          console.warn('?? No se pudieron cargar todos los pagos para estad赤sticas:', error);
        }
        
        this.billingStats = {
          totalPaid: this.calculateTotalPaidFromPayments(allPayments),
          totalPayments: allPayments.length,
totalInvoices: this.clientInvoices.length,
          pendingInvoices: this.clientInvoices.filter(inv => inv.status === 'pending').length,
          averageDaysLate: this.calculateAverageDaysLate(),
          paymentScore: this.calculatePaymentScore()
        };
        
        console.log('? Estad赤sticas calculadas:', this.billingStats);
        
      } catch (error) {
        console.error('? Error cargando estad赤sticas:', error);
        this.billingStats = {
          totalPaid: '0.00',
          totalPayments: 0,
          totalInvoices: 0,
          pendingInvoices: 0,
          averageDaysLate: 0,
          paymentScore: 100
        };
      } finally {
        this.loadingStats = false;
      }
    },

    calculateTotalPaidFromPayments(payments) {
      const completedPayments = payments.filter(payment => payment.status === 'completed');
      return completedPayments.reduce((total, payment) => total + parseFloat(payment.amount || 0), 0).toFixed(2);
    },

    calculateAverageDaysLate() {
      const overdueInvoices = this.clientInvoices.filter(inv => inv.status === 'overdue');
      if (overdueInvoices.length === 0) return 0;
      
      const totalDaysLate = overdueInvoices.reduce((total, inv) => {
        return total + this.calculateOverdueDays(inv.dueDate);
      }, 0);
      
      return Math.round(totalDaysLate / overdueInvoices.length);
    },

    calculatePaymentScore() {
      if (this.clientInvoices.length === 0) return 100;
      
      const paidOnTime = this.clientInvoices.filter(inv => 
        inv.status === 'paid' && !this.calculateOverdueDays(inv.dueDate)
      ).length;
      
      return Math.round((paidOnTime / this.clientInvoices.length) * 100);
    },

    extractApiData(response) {
      if (!response || !response.data) {
        console.warn('?? Respuesta vac赤a o inv芍lida:', response);
        return {};
      }
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    },

    // ===============================
    // ACCIONES DE FACTURACI車N
    // ===============================
    async refreshBilling() {
      await this.loadAllBillingData();
      this.$emit('show-notification', 'Informaci車n de facturaci車n actualizada', 'success');
    },

    setupBilling() {
      this.$router.push(`/clients/${this.clientId}/billing/setup`);
    },

    editBillingConfig() {
      this.setupBilling();
    },

    registerPayment() {
      this.$emit('register-payment', { id: this.clientId });
    },

    downloadAccountStatement() {
      this.$emit('show-notification', 'Generando estado de cuenta...', 'info');
    },

    viewPaymentHistory() {
      this.$router.push(`/payments?clientId=${this.clientId}`);
    },

    viewAllPayments() {
      this.$router.push(`/payments?clientId=${this.clientId}`);
    },

    // ===============================
    // ACCIONES DE PAGOS
    // ===============================
    viewPaymentDetails(payment) {
      this.$router.push(`/payments/${payment.id}`);
    },

    async printReceipt(payment) {
      try {
        this.$emit('show-notification', 'Generando recibo...', 'info');
        // TODO: Implementar descarga de recibo
      } catch (error) {
        console.error('? Error generando recibo:', error);
        this.$emit('show-notification', 'Error generando recibo', 'error');
      }
    },

    async confirmPayment(payment) {
      if (!confirm('?Confirmar este pago?')) return;
      
      try {
        this.$emit('show-notification', 'Funcionalidad en desarrollo', 'warning');
      } catch (error) {
        console.error('? Error confirmando pago:', error);
        this.$emit('show-notification', 'Error confirmando pago', 'error');
      }
    },

    // ===============================
    // ACCIONES DE FACTURAS
    // ===============================
    async generateInvoice() {
      try {
        if (!this.billingInfo) {
          this.$emit('show-notification', 'Configure primero la facturaci車n del cliente', 'warning');
          return;
        }

        this.$emit('show-notification', 'Generando factura...', 'info');
        
        const invoiceData = {
          period: new Date().toISOString().slice(0, 7) // YYYY-MM
        };
        
        const response = await BillingService.generateInvoice(this.clientId, invoiceData);
        
        await this.loadClientInvoices();
        
        this.$emit('show-notification', 'Factura generada correctamente', 'success');
        
      } catch (error) {
        console.error('? Error generando factura:', error);
        console.error('? Response:', error.response?.data);
        
        let errorMessage = 'Error generando factura';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        
        this.$emit('show-notification', errorMessage, 'error');
      }
    },

    async refreshInvoices() {
      await this.loadClientInvoices();
      this.$emit('show-notification', 'Facturas actualizadas', 'success');
    },

    viewInvoiceDetails(invoice) {
      this.$router.push(`/invoices/${invoice.id}`);
    },

    async downloadInvoicePDF(invoice) {
      try {
        this.$emit('show-notification', 'Descargando factura...', 'info');
        const response = await InvoiceService.downloadInvoicePDF(invoice.id);
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Factura-${invoice.invoiceNumber || invoice.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
      } catch (error) {
        console.error('? Error descargando factura:', error);
        this.$emit('show-notification', 'Error descargando factura', 'error');
      }
    },

    // ? NUEVO: Abrir modal de pago
    openPaymentModal(invoice) {
      this.selectedInvoice = invoice;
      
      // Seleccionar gateway por defecto (efectivo)
      const cashGateway = this.paymentGateways.find(g => g.gatewayType === 'cash');
      if (cashGateway) {
        this.paymentForm.gatewayId = cashGateway.id;
        this.selectedGatewayType = 'cash';
      }
      
      this.paymentForm.amount = invoice.totalAmount || invoice.amount;
      this.paymentForm.reference = '';
      this.paymentForm.notes = '';
      this.receiptFile = null;
      
      this.showPaymentModal = true;
    },

    // ? NUEVO: Cerrar modal de pago
    closePaymentModal() {
      this.showPaymentModal = false;
      this.selectedInvoice = null;
      this.paymentForm = {
        gatewayId: null,
        amount: null,
        reference: '',
        notes: ''
      };
      this.receiptFile = null;
      this.selectedGatewayType = null;
      this.isProcessing = false;
    },

    // ? NUEVO: Cambio de gateway
    onGatewayChange() {
      const selectedGateway = this.paymentGateways.find(
        g => g.id === this.paymentForm.gatewayId
      );
      this.selectedGatewayType = selectedGateway?.gatewayType || null;
      console.log('?? Gateway seleccionado:', selectedGateway?.name, '(' + this.selectedGatewayType + ')');
    },

    // ? NUEVO: Manejar subida de comprobante
    handleReceiptUpload(event) {
      const file = event.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('El archivo es demasiado grande. M芍ximo 5MB.');
          event.target.value = '';
          this.receiptFile = null;
          return;
        }
        this.receiptFile = file;
        console.log('?? Comprobante seleccionado:', file.name);
      }
    },

    // ? NUEVO: Enviar pago (l車gica diferenciada)
    async submitPayment() {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      
      try {
        const selectedGateway = this.paymentGateways.find(
          g => g.id === this.paymentForm.gatewayId
        );
        
        // ? Obtener usuario actual
        const currentUser = this.$store?.state?.auth?.user || 
                           JSON.parse(localStorage.getItem('user') || '{}');
        const submittedBy = currentUser.id || 1;
        
        console.log('?? Usuario actual:', currentUser);
        console.log('?? ID del usuario que registra:', submittedBy);
        
        const paymentData = {
          gatewayId: this.paymentForm.gatewayId,
          paymentMethod: this.getPaymentMethodFromGateway(selectedGateway),
          amount: parseFloat(this.paymentForm.amount),
          notes: this.paymentForm.notes || 'Pago registrado desde BillingTab',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentReference: this.paymentForm.reference || 
                           `${selectedGateway?.gatewayType?.toUpperCase()}-${Date.now()}`,
          submittedBy
        };
        
        console.log('?? Datos de pago a enviar:', paymentData);
        console.log('?? Comprobante adjunto:', this.receiptFile?.name || 'Ninguno');
        
        // ? L車gica diferenciada por tipo de gateway
        if (selectedGateway.gatewayType === 'cash') {
          // ? EFECTIVO: Auto-aprobado
          await InvoiceService.markAsPaid(this.selectedInvoice.id, paymentData);
          
          this.$emit('show-notification', 
            '? Pago en efectivo registrado y aprobado autom芍ticamente.', 
            'success'
          );
          
        } else if (selectedGateway.gatewayType === 'transfer') {
          // ? TRANSFERENCIA: Pendiente de aprobaci車n
          
          if (!this.receiptFile) {
            const confirmWithout = confirm(
              '?? No ha adjuntado comprobante de transferencia.\n' +
              'Se recomienda adjuntar el comprobante para agilizar la aprobaci車n.\n\n' +
              '?Desea continuar de todas formas?'
            );
            if (!confirmWithout) {
              this.isProcessing = false;
              return;
            }
          }
          
          await PaymentService.submitManualPayment(paymentData, this.receiptFile);
          
          this.$emit('show-notification', 
            '? Pago por transferencia registrado.\nPendiente de aprobaci車n por el administrador.', 
            'info'
          );
          
        } else {
          // ? PASARELAS: Pendiente hasta webhook
          await InvoiceService.markAsPaid(this.selectedInvoice.id, paymentData);
          
          this.$emit('show-notification', 
            '? Pago registrado en la pasarela.\nEsperando confirmaci車n autom芍tica.', 
            'info'
          );
        }
        
        this.closePaymentModal();
        
        // ? Recargar datos
        await Promise.all([
          this.loadClientInvoices(),
          this.loadRecentPayments(),
          this.loadStats()
        ]);
        
      } catch (error) {
        console.error('? Error registrando pago:', error);
        const errorMsg = error.response?.data?.message || 
                         error.response?.data?.error ||
                         'Error registrando el pago.';
        this.$emit('show-notification', `? ${errorMsg}`, 'error');
        this.isProcessing = false;
      }
    },

    async sendInvoiceByEmail(invoice) {
      try {
        this.$emit('show-notification', 'Funcionalidad de env赤o por email en desarrollo', 'info');
      } catch (error) {
        console.error('? Error enviando factura:', error);
        this.$emit('show-notification', 'Error enviando factura', 'error');
      }
    },

    toggleShowAllInvoices() {
      this.showAllInvoices = !this.showAllInvoices;
    },

    // ===============================
    // ? HELPERS
    // ===============================
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

    formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // ===============================
    // M谷TODOS DE FORMATO
    // ===============================
    formatDate(dateString) {
      if (!dateString) return null;
      
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    formatClientStatus(status) {
      const statusMap = {
        'active': 'Activo',
        'suspended': 'Suspendido',
        'overdue': 'Vencido',
        'cancelled': 'Cancelado',
        'pending': 'Pendiente',
        'grace_period': 'Per赤odo de Gracia'
      };
      return statusMap[status] || status;
    },

    formatPaymentMethod(method) {
      const methodMap = {
        'cash': 'Efectivo',
        'transfer': 'Transferencia',
        'card': 'Tarjeta',
        'check': 'Cheque',
        'online': 'Pago en L赤nea',
        'mercadopago': 'Mercado Pago',
        'paypal': 'PayPal',
        'spei': 'SPEI',
        'oxxo': 'OXXO'
      };
      return methodMap[method] || method;
    },

    formatPaymentStatus(status) {
      const statusMap = {
        'completed': 'Completado',
        'pending': 'Pendiente',
        'failed': 'Fallido',
        'cancelled': 'Cancelado',
        'processing': 'Procesando'
      };
      return statusMap[status] || status;
    },

    formatInvoiceStatus(status) {
      const statusMap = {
        'pending': 'Pendiente',
        'paid': 'Pagada',
        'overdue': 'Vencida',
        'cancelled': 'Cancelada',
        'partial': 'Pago Parcial'
      };
      return statusMap[status] || status;
    },

    formatInvoicePeriod(startDate, endDate) {
      if (!startDate || !endDate) return 'Per赤odo no definido';
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return `${start.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
    },

    getPaymentStatusClass(dueDate) {
      if (!dueDate) return '';
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'overdue';
      if (diffDays <= 3) return 'due-soon';
      return '';
    },

    getDaysUntilDue(dueDate) {
      if (!dueDate) return null;
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return `${Math.abs(diffDays)} d赤as vencido`;
      if (diffDays === 0) return 'Vence hoy';
      if (diffDays === 1) return 'Vence ma?ana';
      return `${diffDays} d赤as`;
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays > 0 ? diffDays : 0;
    },

    getPaymentMethodIcon(method) {
      const iconMap = {
        'cash': '??',
        'transfer': '??',
        'card': '??',
        'check': '??',
        'online': '??',
        'mercadopago': '??',
        'paypal': '???',
        'spei': '??',
        'oxxo': '??'
      };
      return iconMap[method] || '??';
    }
  }
};
</script>

<style scoped>
/* ===== BASE STYLES ===== */
.billing-tab {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ===== GRID PRINCIPAL ===== */
.billing-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ===== TARJETAS DE SECCI車N ===== */
.section-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);
}

.section-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.count-badge {
  background: #e2e8f0;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.section-actions {
  display: flex;
  gap: 8px;
}

.section-content {
  padding: 24px;
}

/* ===== BOTONES ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-primary {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(5, 150, 105, 0.3);
}

.btn-primary:disabled {
  background: #cccccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn svg {
  width: 16px;
  height: 16px;
}

/* ===== ESTADOS DE CARGA ===== */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: #64748b;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1f5f9;
  border-top: 3px solid #059669;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== RESUMEN DE FACTURACI車N ===== */
.billing-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #059669;
  transition: all 0.2s ease;
}

.summary-item:hover {
  background: #f0fdf4;
  border-left-color: #047857;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.15);
}

.summary-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value {
  font-size: 16px;
  color: #1e293b;
  font-weight: 600;
}

.summary-value.price {
  color: #059669;
  font-size: 18px;
}

.summary-value.status-active {
  color: #059669;
}

.summary-value.status-suspended {
  color: #f59e0b;
}

.summary-value.status-overdue {
  color: #ef4444;
}

.summary-value.status-cancelled {
  color: #94a3b8;
}

.summary-value.status-pending {
  color: #f59e0b;
}

.summary-value.status-grace_period {
  color: #3b82f6;
}

.summary-value.overdue {
  color: #ef4444;
  font-weight: 700;
}

.summary-value.due-soon {
  color: #f59e0b;
  font-weight: 600;
}

.days-info {
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
  margin-left: 4px;
}

.billing-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

/* ===== PAGOS RECIENTES ===== */
.payments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.payment-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: all 0.2s ease;
}

.payment-card:hover {
  border-color: #059669;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
  transform: translateY(-2px);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.payment-info h4 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #059669;
}

.payment-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.payment-date {
  font-size: 14px;
  color: #64748b;
}

.payment-status {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.payment-status.status-completed {
  background: #dcfce7;
  color: #166534;
}

.payment-status.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.payment-status.status-processing {
  background: #dbeafe;
  color: #1e40af;
}

.payment-status.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.payment-status.status-cancelled {
  background: #f1f5f9;
  color: #64748b;
}

.payment-method {
  display: flex;
  align-items: center;
}

.method-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  color: #475569;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}

.payment-details {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  margin-bottom: 4px;
  font-size: 14px;
}

.detail-label {
  font-weight: 500;
  color: #64748b;
  width: 100px;
  flex-shrink: 0;
}

.detail-value {
  color: #1e293b;
}

.detail-value.reference {
  font-family: 'Courier New', monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.payment-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== FACTURAS ===== */
.invoices-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.invoice-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  background: white;
  transition: all 0.2s ease;
}

.invoice-card:hover {
  border-color: #059669;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
  transform: translateY(-2px);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.invoice-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.invoice-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.invoice-period {
  font-size: 12px;
  color: #64748b;
}

.invoice-status {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.invoice-status.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.invoice-status.status-paid {
  background: #dcfce7;
  color: #166534;
}

.invoice-status.status-overdue {
  background: #fee2e2;
  color: #991b1b;
}

.invoice-status.status-cancelled {
  background: #f1f5f9;
  color: #64748b;
}

.invoice-status.status-partial {
  background: #dbeafe;
  color: #1e40af;
}

.invoice-amount {
  text-align: right;
}

.invoice-amount .amount {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #059669;
  margin-bottom: 4px;
}

.invoice-amount .due-date {
  font-size: 12px;
  color: #64748b;
}

.invoice-details {
  margin-bottom: 16px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 14px;
}

.detail-row.overdue {
  color: #ef4444;
  font-weight: 600;
}

.detail-row .detail-label {
  color: #64748b;
}

.detail-row .detail-value {
  color: #1e293b;
  font-weight: 500;
}

.invoice-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.show-more {
  text-align: center;
  margin-top: 16px;
}

/* ===== ACCIONES ===== */
.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.secondary {
  color: #475569;
}

.action-btn.secondary:hover {
  border-color: #059669;
  background: #f0fdf4;
  color: #059669;
  transform: translateY(-1px);
}

.action-btn.primary {
  background: #059669;
  color: white;
  border-color: #059669;
}

.action-btn.primary:hover {
  background: #047857;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
}

/* ===== ESTAD赤STICAS ===== */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: #f0fdf4;
  border-color: #059669;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.15);
}

.stat-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* ===== FILTROS ===== */
.filter-select {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:hover {
  border-color: #cbd5e1;
}

.filter-select:focus {
  outline: none;
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

/* ===== ESTADOS VAC赤OS ===== */
.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  filter: grayscale(20%);
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1e293b;
  font-weight: 600;
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 14px;
  line-height: 1.5;
}

/* ===== MODAL DE PAGO ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: #1e293b;
  font-weight: 600;
}

.modal-content p {
  margin: 0 0 20px 0;
  color: #64748b;
  line-height: 1.6;
}

.modal-content p strong {
  color: #059669;
  font-weight: 700;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
  margin-top: 12px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.form-group .optional {
  font-size: 12px;
  color: #94a3b8;
  font-weight: normal;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;
  background: white;
}

.form-group input:hover,
.form-group select:hover,
.form-group textarea:hover {
  border-color: #cbd5e1;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
}

.form-group small {
  font-size: 12px;
  color: #94a3b8;
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.file-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 13px;
}

.file-icon {
  font-size: 18px;
}

.file-name {
  flex: 1;
  font-weight: 500;
  color: #0c4a6e;
  word-break: break-all;
}

.file-size {
  color: #64748b;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  white-space: nowrap;
}

.gateway-info {
  margin-top: 16px;
}

.info-box {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.info-box strong {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
}

.info-box p {
  margin: 4px 0;
  color: #475569;
}

.info-success {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
}

.info-warning {
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.info-primary {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-confirm {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857 0%, #065f46 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-confirm:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
  box-shadow: none;
}

/* ===== SCROLLBAR PERSONALIZADO ===== */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* ===== RESPONSIVO ===== */
@media (max-width: 768px) {
  .billing-tab {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .section-actions {
    flex-direction: column;
  }
  
  .section-actions .btn {
    width: 100%;
    justify-content: center;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .payment-header,
  .invoice-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .payment-method {
    width: 100%;
  }
  
  .method-badge {
    width: 100%;
    justify-content: center;
  }
  
  .invoice-amount {
    text-align: left;
    width: 100%;
  }
  
  .billing-actions,
  .payment-actions,
  .invoice-actions {
    width: 100%;
  }
  
  .billing-actions .btn,
  .payment-actions .action-btn,
  .invoice-actions .action-btn {
    flex: 1;
    justify-content: center;
  }
  
  .modal-content {
    padding: 24px;
    max-width: 95%;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
  
  .btn-cancel,
  .btn-confirm {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .section-content {
    padding: 20px;
  }
  
  .payment-card,
  .invoice-card {
    padding: 16px;
  }
  
  .stat-item {
    padding: 16px;
  }
  
  .section-title h3 {
    font-size: 16px;
  }
  
  .payment-info h4 {
    font-size: 18px;
  }
  
  .invoice-amount .amount {
    font-size: 16px;
  }
  
  .stat-value {
    font-size: 18px;
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

.modal-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.payment-card,
.invoice-card {
  animation: slideIn 0.3s ease-out;
  animation-fill-mode: both;
}

.payment-card:nth-child(1) {
  animation-delay: 0.05s;
}

.payment-card:nth-child(2) {
  animation-delay: 0.1s;
}

.payment-card:nth-child(3) {
  animation-delay: 0.15s;
}

.invoice-card:nth-child(1) {
  animation-delay: 0.05s;
}

.invoice-card:nth-child(2) {
  animation-delay: 0.1s;
}

.invoice-card:nth-child(3) {
  animation-delay: 0.15s;
}
</style>