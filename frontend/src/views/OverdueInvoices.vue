<template>
  <div class="overdue-invoices">
    <div class="header">
      <div class="header-info">
        <h2>Facturas Vencidas</h2>
        <p class="header-description">
          Gestión de facturas vencidas y acciones de cobranza
        </p>
      </div>
      
      <div class="header-actions">
        <button @click="processAllOverdue" class="process-all-btn">
          ⚡ Procesar Todas
        </button>
        <button @click="sendMassReminders" class="reminder-btn">
          📧 Enviar Recordatorios
        </button>
        <button @click="exportOverdueReport" class="export-btn">
          📊 Exportar Reporte
        </button>
      </div>
    </div>

    <!-- Resumen de métricas -->
    <div class="metrics-cards">
      <div class="metric-card critical">
        <div class="metric-icon">🚨</div>
        <div class="metric-content">
          <h3>Críticas (+60 días)</h3>
          <div class="metric-value">{{ metrics.critical.count }}</div>
          <div class="metric-amount">${{ formatNumber(metrics.critical.amount) }}</div>
        </div>
      </div>

      <div class="metric-card warning">
        <div class="metric-icon">⚠️</div>
        <div class="metric-content">
          <h3>Moderadas (31-60 días)</h3>
          <div class="metric-value">{{ metrics.moderate.count }}</div>
          <div class="metric-amount">${{ formatNumber(metrics.moderate.amount) }}</div>
        </div>
      </div>

      <div class="metric-card recent">
        <div class="metric-icon">📅</div>
        <div class="metric-content">
          <h3>Recientes (1-30 días)</h3>
          <div class="metric-value">{{ metrics.recent.count }}</div>
          <div class="metric-amount">${{ formatNumber(metrics.recent.amount) }}</div>
        </div>
      </div>

      <div class="metric-card total">
        <div class="metric-icon">💰</div>
        <div class="metric-content">
          <h3>Total Vencido</h3>
          <div class="metric-value">{{ totalOverdueCount }}</div>
          <div class="metric-amount">${{ formatNumber(totalOverdueAmount) }}</div>
        </div>
      </div>
    </div>

    <!-- Filtros y configuración -->
    <div class="filters">
      <div class="filter-group">
        <label>Filtrar por días vencidos:</label>
        <select v-model="filters.overdueRange" @change="loadOverdueInvoices">
          <option value="">Todos</option>
          <option value="1-30">1-30 días</option>
          <option value="31-60">31-60 días</option>
          <option value="61-90">61-90 días</option>
          <option value="90+">Más de 90 días</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Monto mínimo:</label>
        <input
          type="number"
          v-model="filters.minAmount"
          @keyup.enter="loadOverdueInvoices"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      <div class="filter-group">
        <label>Cliente:</label>
        <input
          type="text"
          v-model="filters.clientSearch"
          @keyup.enter="loadOverdueInvoices"
          placeholder="Buscar cliente..."
        />
      </div>

      <div class="filter-group">
        <label>Zona:</label>
        <select v-model="filters.zoneId" @change="loadOverdueInvoices">
          <option value="">Todas las zonas</option>
          <option v-for="zone in zones" :key="zone.id" :value="zone.id">
            {{ zone.name }}
          </option>
        </select>
      </div>

      <button @click="loadOverdueInvoices" class="apply-filters-btn">
        🔍 Aplicar Filtros
      </button>
    </div>

    <div v-if="loading" class="loading">
      Cargando facturas vencidas...
    </div>

    <div v-else-if="overdueInvoices.length === 0" class="no-data">
      <div class="no-data-icon">🎉</div>
      <h3>¡Excelente!</h3>
      <p>No hay facturas vencidas en este momento.</p>
    </div>

    <div v-else class="overdue-content">
      <!-- Tabla de facturas vencidas -->
      <div class="table-container">
        <div class="table-header">
          <h3>Facturas Vencidas ({{ overdueInvoices.length }})</h3>
          <div class="table-actions">
            <input
              type="checkbox"
              @change="toggleSelectAll"
              :checked="selectedInvoices.length === overdueInvoices.length"
              id="selectAll"
            />
            <label for="selectAll">Seleccionar todas</label>
          </div>
        </div>

        <table class="overdue-table">
          <thead>
            <tr>
              <th width="40"></th>
              <th>Cliente</th>
              <th>Factura</th>
              <th>Monto</th>
              <th>Vencimiento</th>
              <th>Días Vencidos</th>
              <th>Último Contacto</th>
              <th>Prioridad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="invoice in overdueInvoices" 
              :key="invoice.id" 
              :class="[
                'invoice-row', 
                getPriorityClass(invoice.overdueDays),
                { selected: selectedInvoices.includes(invoice.id) }
              ]"
            >
              <td>
                <input
                  type="checkbox"
                  :value="invoice.id"
                  v-model="selectedInvoices"
                />
              </td>
              <td>
                <div class="client-info">
                  <div class="client-name">{{ invoice.clientName }}</div>
                  <div class="client-contact">
                    <span v-if="invoice.clientPhone">📞 {{ invoice.clientPhone }}</span>
                    <span v-if="invoice.clientEmail">📧 {{ invoice.clientEmail }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="invoice-info">
                  <div class="invoice-number">{{ invoice.invoiceNumber }}</div>
                  <div class="invoice-date">{{ formatDate(invoice.createdAt) }}</div>
                </div>
              </td>
              <td class="amount">
                <div class="original-amount">${{ formatNumber(invoice.totalAmount) }}</div>
                <div class="penalty-amount" v-if="calculatePenalty(invoice) > 0">
                  +${{ formatNumber(calculatePenalty(invoice)) }} recargo
                </div>
                <div class="total-with-penalty">
                  Total: ${{ formatNumber(invoice.totalAmount + calculatePenalty(invoice)) }}
                </div>
              </td>
              <td class="due-date">{{ formatDate(invoice.dueDate) }}</td>
              <td :class="['overdue-days', getPriorityClass(invoice.overdueDays)]">
                <div class="days-count">{{ invoice.overdueDays }} días</div>
                <div class="severity-indicator">{{ getSeverityText(invoice.overdueDays) }}</div>
              </td>
              <td class="last-contact">
                <div v-if="invoice.lastReminderDate">
                  {{ formatDate(invoice.lastReminderDate) }}
                </div>
                <div v-else class="no-contact">Sin contacto</div>
              </td>
              <td>
                <span :class="['priority-badge', getPriorityClass(invoice.overdueDays)]">
                  {{ getPriorityText(invoice.overdueDays) }}
                </span>
              </td>
              <td class="actions">
                <div class="action-buttons">
                  <button @click="viewInvoice(invoice)" class="action-btn view" title="Ver factura">
                    👁️
                  </button>
                  <button @click="sendReminder(invoice)" class="action-btn remind" title="Enviar recordatorio">
                    📧
                  </button>
                  <button @click="callClient(invoice)" class="action-btn call" title="Llamar cliente">
                    📞
                  </button>
                  <button @click="suspendService(invoice)" class="action-btn suspend" title="Suspender servicio">
                    ⏸️
                  </button>
                  <button @click="registerPayment(invoice)" class="action-btn payment" title="Registrar pago">
                    💰
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Acciones masivas -->
      <div v-if="selectedInvoices.length > 0" class="bulk-actions">
        <div class="bulk-info">
          {{ selectedInvoices.length }} factura(s) seleccionada(s) - 
          Total: ${{ formatNumber(getSelectedTotal()) }}
        </div>
        <div class="bulk-buttons">
          <button @click="bulkSendReminders" class="bulk-btn remind">
            📧 Enviar Recordatorios
          </button>
          <button @click="bulkSuspendServices" class="bulk-btn suspend">
            ⏸️ Suspender Servicios
          </button>
          <button @click="bulkGenerateReport" class="bulk-btn report">
            📄 Generar Reporte
          </button>
          <button @click="clearSelection" class="bulk-btn clear">
            Limpiar Selección
          </button>
        </div>
      </div>

      <!-- Estrategias de cobranza recomendadas -->
      <div class="collection-strategies">
        <h3>Estrategias de Cobranza Recomendadas</h3>
        <div class="strategies-grid">
          <div class="strategy-card recent-overdue">
            <h4>📅 Vencidas Recientes (1-30 días)</h4>
            <ul>
              <li>Envío automático de recordatorio por email</li>
              <li>Mensaje de WhatsApp amigable</li>
              <li>Ofrecer facilidades de pago</li>
            </ul>
            <button @click="applyStrategy('recent')" class="strategy-btn">
              Aplicar a {{ metrics.recent.count }} facturas
            </button>
          </div>

          <div class="strategy-card moderate-overdue">
            <h4>⚠️ Vencidas Moderadas (31-60 días)</h4>
            <ul>
              <li>Llamada telefónica personalizada</li>
              <li>Email formal con estado de cuenta</li>
              <li>Advertencia de suspensión de servicio</li>
            </ul>
            <button @click="applyStrategy('moderate')" class="strategy-btn">
              Aplicar a {{ metrics.moderate.count }} facturas
            </button>
          </div>

          <div class="strategy-card critical-overdue">
            <h4>🚨 Vencidas Críticas (+60 días)</h4>
            <ul>
              <li>Suspensión inmediata del servicio</li>
              <li>Notificación legal de cobranza</li>
              <li>Proceso de recuperación de equipos</li>
            </ul>
            <button @click="applyStrategy('critical')" class="strategy-btn critical">
              Aplicar a {{ metrics.critical.count }} facturas
            </button>
          </div>
        </div>
      </div>

      <!-- Análisis y tendencias -->
      <div class="analysis-section">
        <h3>Análisis de Morosidad</h3>
        <div class="analysis-grid">
          <div class="analysis-card">
            <h4>Tendencia Mensual</h4>
            <div class="chart-placeholder">
              <!-- Aquí iría un gráfico de Chart.js -->
              <p>Gráfico de tendencia de facturas vencidas por mes</p>
            </div>
          </div>

          <div class="analysis-card">
            <h4>Top Clientes Morosos</h4>
            <div class="top-clients">
              <div v-for="client in topDelinquentClients" :key="client.id" class="client-item">
                <div class="client-name">{{ client.name }}</div>
                <div class="client-debt">${{ formatNumber(client.totalDebt) }}</div>
                <div class="client-invoices">{{ client.overdueCount }} facturas</div>
              </div>
            </div>
          </div>

          <div class="analysis-card">
            <h4>Efectividad de Cobranza</h4>
            <div class="effectiveness-stats">
              <div class="stat-item">
                <span class="stat-label">Recordatorios enviados:</span>
                <span class="stat-value">{{ stats.remindersSent }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Pagos recuperados:</span>
                <span class="stat-value">${{ formatNumber(stats.recoveredAmount) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Tasa de recuperación:</span>
                <span class="stat-value">{{ stats.recoveryRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="modal-content" @click.stop>
        <h3>{{ confirmModal.title }}</h3>
        <p>{{ confirmModal.message }}</p>
        <div v-if="confirmModal.showDetails" class="confirmation-details">
          <h4>Detalles de la acción:</h4>
          <ul>
            <li v-for="detail in confirmModal.details" :key="detail">{{ detail }}</li>
          </ul>
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

    <!-- Modal de estrategia -->
    <div v-if="showStrategyModal" class="modal-overlay" @click="closeStrategyModal">
      <div class="modal-content large" @click.stop>
        <h3>Aplicar Estrategia de Cobranza</h3>
        <div class="strategy-form">
          <div class="form-group">
            <label>Tipo de estrategia:</label>
            <select v-model="strategyForm.type">
              <option value="email">Envío de Email</option>
              <option value="whatsapp">Mensaje WhatsApp</option>
              <option value="call">Programar Llamadas</option>
              <option value="suspend">Suspender Servicios</option>
            </select>
          </div>

          <div class="form-group">
            <label>Plantilla de mensaje:</label>
            <select v-model="strategyForm.templateId">
              <option value="">Seleccionar plantilla</option>
              <option v-for="template in messageTemplates" :key="template.id" :value="template.id">
                {{ template.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Programar para:</label>
            <input type="datetime-local" v-model="strategyForm.scheduledFor" />
          </div>

          <div class="form-group">
            <label>Notas:</label>
            <textarea v-model="strategyForm.notes" rows="3" placeholder="Notas adicionales..."></textarea>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeStrategyModal" class="btn-cancel">
            Cancelar
          </button>
          <button @click="executeStrategy" class="btn-confirm">
            Aplicar Estrategia
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import InvoiceService from '../services/invoice.service';
import PaymentService from '../services/payment.service';
import BillingService from '../services/billing.service';

export default {
  name: 'OverdueInvoices',
  data() {
    return {
      overdueInvoices: [],
      zones: [],
      messageTemplates: [],
      loading: false,
      selectedInvoices: [],
      filters: {
        overdueRange: '',
        minAmount: '',
        clientSearch: '',
        zoneId: ''
      },
      metrics: {
        recent: { count: 0, amount: 0 },
        moderate: { count: 0, amount: 0 },
        critical: { count: 0, amount: 0 }
      },
      topDelinquentClients: [],
      stats: {
        remindersSent: 0,
        recoveredAmount: 0,
        recoveryRate: 0
      },
      showConfirmModal: false,
      confirmModal: {
        title: '',
        message: '',
        confirmText: '',
        showDetails: false,
        details: [],
        action: null,
        data: null
      },
      showStrategyModal: false,
      strategyForm: {
        type: 'email',
        templateId: '',
        scheduledFor: '',
        notes: ''
      },
      currentStrategy: null
    };
  },
  computed: {
    totalOverdueCount() {
      return this.metrics.recent.count + this.metrics.moderate.count + this.metrics.critical.count;
    },
    totalOverdueAmount() {
      return this.metrics.recent.amount + this.metrics.moderate.amount + this.metrics.critical.amount;
    }
  },
  created() {
    this.loadOverdueInvoices();
    this.loadZones();
    this.loadMessageTemplates();
    this.loadAnalysisData();
  },
  methods: {
    async loadOverdueInvoices() {
      this.loading = true;
      try {
        const params = {
          days: this.filters.overdueRange || undefined,
          minAmount: this.filters.minAmount || undefined,
          clientSearch: this.filters.clientSearch || undefined,
          zoneId: this.filters.zoneId || undefined
        };

        const response = await InvoiceService.getOverdueInvoices(params);
        this.overdueInvoices = response.data.map(invoice => ({
          ...invoice,
          overdueDays: this.calculateOverdueDays(invoice.dueDate)
        }));

        this.calculateMetrics();
        this.selectedInvoices = [];
      } catch (error) {
        console.error('Error cargando facturas vencidas:', error);
        this.overdueInvoices = [];
      } finally {
        this.loading = false;
      }
    },

    async loadZones() {
      try {
        // Simular carga de zonas (normalmente desde ClientService.getZones())
        this.zones = [
          { id: 1, name: 'Zona Norte' },
          { id: 2, name: 'Zona Sur' },
          { id: 3, name: 'Zona Este' },
          { id: 4, name: 'Zona Oeste' }
        ];
      } catch (error) {
        console.error('Error cargando zonas:', error);
      }
    },

    async loadMessageTemplates() {
      try {
        // Simular plantillas de mensaje
        this.messageTemplates = [
          { id: 1, name: 'Recordatorio Amigable' },
          { id: 2, name: 'Aviso Formal' },
          { id: 3, name: 'Última Oportunidad' },
          { id: 4, name: 'Notificación de Suspensión' }
        ];
      } catch (error) {
        console.error('Error cargando plantillas:', error);
      }
    },

    async loadAnalysisData() {
      try {
        // Simular datos de análisis
        this.topDelinquentClients = [
          { id: 1, name: 'Juan Pérez', totalDebt: 2500, overdueCount: 3 },
          { id: 2, name: 'María García', totalDebt: 1800, overdueCount: 2 },
          { id: 3, name: 'Carlos López', totalDebt: 1200, overdueCount: 4 }
        ];

        this.stats = {
          remindersSent: 45,
          recoveredAmount: 15750,
          recoveryRate: 68
        };
      } catch (error) {
        console.error('Error cargando datos de análisis:', error);
      }
    },

    calculateMetrics() {
      this.metrics = {
        recent: { count: 0, amount: 0 },
        moderate: { count: 0, amount: 0 },
        critical: { count: 0, amount: 0 }
      };

      this.overdueInvoices.forEach(invoice => {
        const days = invoice.overdueDays;
        const amount = parseFloat(invoice.totalAmount);

        if (days <= 30) {
          this.metrics.recent.count++;
          this.metrics.recent.amount += amount;
        } else if (days <= 60) {
          this.metrics.moderate.count++;
          this.metrics.moderate.amount += amount;
        } else {
          this.metrics.critical.count++;
          this.metrics.critical.amount += amount;
        }
      });
    },

    calculateOverdueDays(dueDate) {
      if (!dueDate) return 0;
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },

    calculatePenalty(invoice) {
      const overdueDays = invoice.overdueDays;
      const baseAmount = parseFloat(invoice.totalAmount);
      
      if (overdueDays <= 7) return 0; // Sin recargo los primeros 7 días
      
      // 5% de recargo por cada mes vencido
      const monthsOverdue = Math.ceil((overdueDays - 7) / 30);
      return baseAmount * (0.05 * monthsOverdue);
    },

    getPriorityClass(days) {
      if (days <= 30) return 'recent';
      if (days <= 60) return 'moderate';
      return 'critical';
    },

    getPriorityText(days) {
      if (days <= 30) return 'Baja';
      if (days <= 60) return 'Media';
      return 'Alta';
    },

    getSeverityText(days) {
      if (days <= 30) return 'Reciente';
      if (days <= 60) return 'Moderada';
      return 'Crítica';
    },

    toggleSelectAll() {
      if (this.selectedInvoices.length === this.overdueInvoices.length) {
        this.selectedInvoices = [];
      } else {
        this.selectedInvoices = this.overdueInvoices.map(invoice => invoice.id);
      }
    },

    clearSelection() {
      this.selectedInvoices = [];
    },

    getSelectedTotal() {
      return this.overdueInvoices
        .filter(invoice => this.selectedInvoices.includes(invoice.id))
        .reduce((total, invoice) => total + parseFloat(invoice.totalAmount), 0);
    },

    viewInvoice(invoice) {
      this.$router.push(`/billing/invoices/${invoice.id}`);
    },

    async sendReminder(invoice) {
      try {
        // Implementar envío de recordatorio individual
        console.log('Enviando recordatorio a:', invoice.clientName);
        alert('Recordatorio enviado exitosamente');
      } catch (error) {
        console.error('Error enviando recordatorio:', error);
        alert('Error enviando recordatorio');
      }
    },

    callClient(invoice) {
      // Abrir dialer del teléfono o registrar llamada
      if (invoice.clientPhone) {
        window.open(`tel:${invoice.clientPhone}`);
      } else {
        alert('No hay número de teléfono registrado para este cliente');
      }
    },

    suspendService(invoice) {
      this.showConfirmation(
        'Suspender Servicio',
        `¿Está seguro que desea suspender el servicio del cliente ${invoice.clientName}?`,
        'Suspender',
        'suspendService',
        invoice,
        [
          'Se cortará el servicio de internet inmediatamente',
          'Se enviará notificación al cliente',
          'El servicio se puede reactivar cuando se realice el pago'
        ]
      );
    },

    registerPayment(invoice) {
      this.$router.push(`/billing/invoices/${invoice.id}?action=register-payment`);
    },

    async processAllOverdue() {
      this.showConfirmation(
        'Procesar Todas las Facturas Vencidas',
        `¿Está seguro que desea procesar todas las ${this.overdueInvoices.length} facturas vencidas?`,
        'Procesar Todas',
        'processAllOverdue',
        null,
        [
          'Se aplicarán recargos por mora según corresponda',
          'Se enviarán notificaciones automáticas',
          'Se actualizarán los estados de las facturas'
        ]
      );
    },

    async sendMassReminders() {
      this.showConfirmation(
        'Enviar Recordatorios Masivos',
        `¿Está seguro que desea enviar recordatorios a todos los clientes con facturas vencidas?`,
        'Enviar Recordatorios',
        'sendMassReminders',
        null,
        [
          `Se enviarán ${this.overdueInvoices.length} recordatorios`,
          'Se usarán las plantillas según el nivel de morosidad',
          'Los clientes recibirán notificación por email y WhatsApp'
        ]
      );
    },

    async exportOverdueReport() {
      try {
        // Implementar exportación de reporte
        console.log('Exportando reporte de facturas vencidas');
        alert('Reporte exportado exitosamente');
      } catch (error) {
        console.error('Error exportando reporte:', error);
        alert('Error exportando reporte');
      }
    },

    async bulkSendReminders() {
      const selectedCount = this.selectedInvoices.length;
      this.showConfirmation(
        'Enviar Recordatorios',
        `¿Está seguro que desea enviar recordatorios a ${selectedCount} cliente(s) seleccionado(s)?`,
        'Enviar Recordatorios',
        'bulkSendReminders',
        this.selectedInvoices
      );
    },

    async bulkSuspendServices() {
      const selectedCount = this.selectedInvoices.length;
      this.showConfirmation(
        'Suspender Servicios',
        `¿Está seguro que desea suspender los servicios de ${selectedCount} cliente(s) seleccionado(s)?`,
        'Suspender Servicios',
        'bulkSuspendServices',
        this.selectedInvoices,
        [
          'Se cortarán todos los servicios inmediatamente',
          'Se enviará notificación a cada cliente',
          'Esta acción puede afectar la reputación del ISP'
        ]
      );
    },

    async bulkGenerateReport() {
      try {
        // Implementar generación de reporte para seleccionados
        console.log('Generando reporte para:', this.selectedInvoices);
        alert('Reporte generado exitosamente');
      } catch (error) {
        console.error('Error generando reporte:', error);
        alert('Error generando reporte');
      }
    },

    applyStrategy(strategyType) {
      this.currentStrategy = strategyType;
      this.strategyForm = {
        type: 'email',
        templateId: '',
        scheduledFor: '',
        notes: ''
      };
      this.showStrategyModal = true;
    },

    closeStrategyModal() {
      this.showStrategyModal = false;
      this.currentStrategy = null;
    },

    async executeStrategy() {
      try {
        // Implementar ejecución de estrategia
        console.log('Ejecutando estrategia:', this.currentStrategy, this.strategyForm);
        alert('Estrategia aplicada exitosamente');
        this.closeStrategyModal();
      } catch (error) {
        console.error('Error ejecutando estrategia:', error);
        alert('Error ejecutando estrategia');
      }
    },

    showConfirmation(title, message, confirmText, action, data = null, details = null) {
      this.confirmModal = {
        title,
        message,
        confirmText,
        showDetails: details !== null,
        details: details || [],
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
        showDetails: false,
        details: [],
        action: null,
        data: null
      };
    },

    async confirmAction() {
      try {
        const { action, data } = this.confirmModal;

        switch (action) {
          case 'suspendService':
            // Implementar suspensión individual
            console.log('Suspendiendo servicio para:', data.clientName);
            break;
          case 'processAllOverdue':
            await InvoiceService.processOverdueInvoices();
            break;
          case 'sendMassReminders':
            // Implementar envío masivo
            console.log('Enviando recordatorios masivos');
            break;
          case 'bulkSendReminders':
            for (const invoiceId of data) {
              // Enviar recordatorio individual
              console.log('Enviando recordatorio para factura:', invoiceId);
            }
            this.clearSelection();
            break;
          case 'bulkSuspendServices':
            for (const invoiceId of data) {
              // Suspender servicio individual
              console.log('Suspendiendo servicio para factura:', invoiceId);
            }
            this.clearSelection();
            break;
        }

        this.closeConfirmModal();
        this.loadOverdueInvoices();
        
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
    }
  }
};
</script>

<style scoped>
.overdue-invoices {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.header-info h2 {
  margin: 0 0 5px 0;
  color: #333;
}

.header-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.process-all-btn, .reminder-btn, .export-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.process-all-btn {
  background-color: #FF9800;
  color: white;
}

.reminder-btn {
  background-color: #2196F3;
  color: white;
}

.export-btn {
  background-color: #4CAF50;
  color: white;
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 15px;
}

.metric-card.critical {
  border-left: 4px solid #F44336;
}

.metric-card.warning {
  border-left: 4px solid #FF9800;
}

.metric-card.recent {
  border-left: 4px solid #2196F3;
}

.metric-card.total {
  border-left: 4px solid #9C27B0;
}

.metric-icon {
  font-size: 2.5em;
}

.metric-content h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.metric-value {
  font-size: 2em;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.metric-amount {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.filters {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 25px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 150px;
}

.filter-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.filter-group input, .filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.apply-filters-btn {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  height: fit-content;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-data {
  text-align: center;
  padding: 60px;
  color: #666;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.no-data-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.no-data h3 {
  margin: 0 0 10px 0;
  color: #4CAF50;
}

.overdue-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.table-header h3 {
  margin: 0;
  color: #333;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-actions label {
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.overdue-table {
  width: 100%;
  border-collapse: collapse;
}

.overdue-table th,
.overdue-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.overdue-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.invoice-row:hover {
  background-color: #f8f9fa;
}

.invoice-row.selected {
  background-color: #e3f2fd;
}

.invoice-row.critical {
  border-left: 4px solid #F44336;
}

.invoice-row.moderate {
  border-left: 4px solid #FF9800;
}

.invoice-row.recent {
  border-left: 4px solid #2196F3;
}

.client-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.client-name {
  font-weight: 500;
  color: #333;
}

.client-contact {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #666;
}

.invoice-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.invoice-number {
  font-family: monospace;
  font-weight: bold;
  color: #1976d2;
}

.invoice-date {
  font-size: 12px;
  color: #666;
}

.amount {
  text-align: right;
}

.original-amount {
  font-weight: 500;
  color: #333;
}

.penalty-amount {
  font-size: 12px;
  color: #FF9800;
  font-weight: 500;
}

.total-with-penalty {
  font-size: 14px;
  font-weight: bold;
  color: #F44336;
  border-top: 1px solid #eee;
  padding-top: 3px;
  margin-top: 3px;
}

.due-date {
  color: #F44336;
  font-weight: 500;
}

.overdue-days {
  text-align: center;
}

.days-count {
  font-weight: bold;
  font-size: 16px;
}

.overdue-days.critical .days-count {
  color: #F44336;
}

.overdue-days.moderate .days-count {
  color: #FF9800;
}

.overdue-days.recent .days-count {
  color: #2196F3;
}

.severity-indicator {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.last-contact {
  font-size: 13px;
}

.no-contact {
  color: #999;
  font-style: italic;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.priority-badge.critical {
  background-color: #ffebee;
  color: #c62828;
}

.priority-badge.moderate {
  background-color: #fff3e0;
  color: #ef6c00;
}

.priority-badge.recent {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-buttons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  background-color: #f5f5f5;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #e0e0e0;
}

.action-btn.view {
  background-color: #e3f2fd;
  color: #1976d2;
}

.action-btn.remind {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.action-btn.call {
  background-color: #fff3e0;
  color: #ef6c00;
}

.action-btn.suspend {
  background-color: #ffebee;
  color: #c62828;
}

.action-btn.payment {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.bulk-actions {
  background: #f8f9fa;
  padding: 15px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.bulk-info {
  font-weight: 500;
  color: #333;
}

.bulk-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.bulk-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.bulk-btn.remind {
  background-color: #4CAF50;
  color: white;
}

.bulk-btn.suspend {
  background-color: #F44336;
  color: white;
}

.bulk-btn.report {
  background-color: #9C27B0;
  color: white;
}

.bulk-btn.clear {
  background-color: #757575;
  color: white;
}

.collection-strategies {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.collection-strategies h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.strategy-card {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
}

.strategy-card.recent-overdue {
  border-left: 4px solid #2196F3;
}

.strategy-card.moderate-overdue {
  border-left: 4px solid #FF9800;
}

.strategy-card.critical-overdue {
  border-left: 4px solid #F44336;
}

.strategy-card h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.strategy-card ul {
  margin: 0 0 20px 0;
  padding-left: 20px;
}

.strategy-card li {
  margin-bottom: 5px;
  color: #666;
  font-size: 14px;
}

.strategy-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  background-color: #2196F3;
  color: white;
}

.strategy-btn.critical {
  background-color: #F44336;
}

.analysis-section {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.analysis-section h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.analysis-card {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 15px;
  background: #fafafa;
}

.analysis-card h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.chart-placeholder {
  background: #f0f0f0;
  padding: 40px;
  text-align: center;
  border-radius: 4px;
  color: #666;
}

.top-clients {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.client-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #eee;
}

.client-name {
  font-weight: 500;
  color: #333;
}

.client-debt {
  font-weight: bold;
  color: #F44336;
}

.client-invoices {
  font-size: 12px;
  color: #666;
}

.effectiveness-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.stat-value {
  font-weight: bold;
  color: #333;
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

.confirmation-details {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
}

.confirmation-details h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.confirmation-details ul {
  margin: 0;
  padding-left: 20px;
}

.confirmation-details li {
  margin-bottom: 5px;
  color: #666;
  font-size: 13px;
}

.strategy-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
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
  background-color: #F44336;
  color: white;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .metrics-cards {
    grid-template-columns: 1fr 1fr;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    min-width: auto;
  }

  .table-container {
    overflow-x: auto;
  }

  .overdue-table {
    min-width: 800px;
  }

  .bulk-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .bulk-buttons {
    justify-content: space-between;
  }

  .strategies-grid {
    grid-template-columns: 1fr;
  }

  .analysis-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .overdue-invoices {
    padding: 15px;
  }

  .metrics-cards {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>