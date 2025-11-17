<template>
  <div class="reports-export">
    <div class="header">
      <h2>=Ê Exportar Reportes</h2>
      <p class="subtitle">Genera reportes de clientes y pagos en PDF o Excel</p>
    </div>

    <!-- Clientes Reports -->
    <div class="report-section">
      <div class="section-header">
        <h3>=e Reporte de Clientes</h3>
      </div>

      <div class="filters-container">
        <div class="filter-row">
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="clientFilters.estado">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="suspendido">Suspendido</option>
              <option value="cortado">Cortado</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Fecha desde:</label>
            <input type="date" v-model="clientFilters.dateFrom" />
          </div>

          <div class="filter-group">
            <label>Fecha hasta:</label>
            <input type="date" v-model="clientFilters.dateTo" />
          </div>

          <div class="filter-group">
            <label>Límite:</label>
            <input
              type="number"
              v-model.number="clientFilters.limit"
              min="1"
              max="10000"
              placeholder="1000"
            />
          </div>
        </div>

        <div class="export-buttons">
          <button
            @click="exportClients('pdf')"
            class="btn-export pdf"
            :disabled="exportingClients"
          >
            <span v-if="!exportingClients">=Ä Exportar PDF</span>
            <span v-else>ó Generando...</span>
          </button>

          <button
            @click="exportClients('excel')"
            class="btn-export excel"
            :disabled="exportingClients"
          >
            <span v-if="!exportingClients">=× Exportar Excel</span>
            <span v-else>ó Generando...</span>
          </button>
        </div>
      </div>

      <div v-if="clientExportStatus" class="status-message" :class="clientExportStatus.type">
        {{ clientExportStatus.message }}
      </div>
    </div>

    <!-- Payments Reports -->
    <div class="report-section">
      <div class="section-header">
        <h3>=° Reporte de Pagos</h3>
      </div>

      <div class="filters-container">
        <div class="filter-row">
          <div class="filter-group">
            <label>Estado:</label>
            <select v-model="paymentFilters.estado">
              <option value="">Todos</option>
              <option value="completado">Completado</option>
              <option value="pendiente">Pendiente</option>
              <option value="fallido">Fallido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Método de pago:</label>
            <select v-model="paymentFilters.metodo_pago">
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="mercadopago">MercadoPago</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Fecha desde:</label>
            <input type="date" v-model="paymentFilters.dateFrom" />
          </div>

          <div class="filter-group">
            <label>Fecha hasta:</label>
            <input type="date" v-model="paymentFilters.dateTo" />
          </div>

          <div class="filter-group">
            <label>Límite:</label>
            <input
              type="number"
              v-model.number="paymentFilters.limit"
              min="1"
              max="10000"
              placeholder="1000"
            />
          </div>
        </div>

        <div class="export-buttons">
          <button
            @click="exportPayments('pdf')"
            class="btn-export pdf"
            :disabled="exportingPayments"
          >
            <span v-if="!exportingPayments">=Ä Exportar PDF</span>
            <span v-else>ó Generando...</span>
          </button>

          <button
            @click="exportPayments('excel')"
            class="btn-export excel"
            :disabled="exportingPayments"
          >
            <span v-if="!exportingPayments">=× Exportar Excel</span>
            <span v-else>ó Generando...</span>
          </button>
        </div>
      </div>

      <div v-if="paymentExportStatus" class="status-message" :class="paymentExportStatus.type">
        {{ paymentExportStatus.message }}
      </div>
    </div>

    <!-- Info Section -->
    <div class="info-section">
      <h4>9 Información</h4>
      <ul>
        <li>Los reportes se generan con los filtros seleccionados</li>
        <li>El límite predeterminado es de 1000 registros</li>
        <li>Los archivos PDF son ideales para impresión y visualización</li>
        <li>Los archivos Excel permiten análisis y manipulación de datos</li>
        <li>Las fechas filtran por fecha de creación (clientes) o fecha de pago (pagos)</li>
      </ul>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import authHeader from '../services/auth-header';

export default {
  name: 'ReportsExport',
  data() {
    return {
      // Client filters
      clientFilters: {
        estado: '',
        dateFrom: '',
        dateTo: '',
        limit: 1000
      },

      // Payment filters
      paymentFilters: {
        estado: '',
        metodo_pago: '',
        dateFrom: '',
        dateTo: '',
        limit: 1000
      },

      // Loading states
      exportingClients: false,
      exportingPayments: false,

      // Status messages
      clientExportStatus: null,
      paymentExportStatus: null
    };
  },

  methods: {
    /**
     * Exporta reporte de clientes
     */
    async exportClients(format) {
      this.exportingClients = true;
      this.clientExportStatus = null;

      try {
        // Construir query params
        const params = new URLSearchParams();
        if (this.clientFilters.estado) params.append('estado', this.clientFilters.estado);
        if (this.clientFilters.dateFrom) params.append('dateFrom', this.clientFilters.dateFrom);
        if (this.clientFilters.dateTo) params.append('dateTo', this.clientFilters.dateTo);
        if (this.clientFilters.limit) params.append('limit', this.clientFilters.limit);

        const endpoint = format === 'pdf'
          ? '/api/reports/clients/pdf'
          : '/api/reports/clients/excel';

        const response = await axios.get(
          `${endpoint}?${params.toString()}`,
          {
            headers: authHeader(),
            responseType: 'blob'
          }
        );

        // Crear un enlace de descarga
        const blob = new Blob([response.data], {
          type: format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clientes_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.clientExportStatus = {
          type: 'success',
          message: ` Reporte de clientes exportado exitosamente en formato ${format.toUpperCase()}`
        };

        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
          this.clientExportStatus = null;
        }, 5000);

      } catch (error) {
        console.error('Error exportando clientes:', error);
        this.clientExportStatus = {
          type: 'error',
          message: `L Error al exportar reporte: ${error.response?.data?.message || error.message}`
        };
      } finally {
        this.exportingClients = false;
      }
    },

    /**
     * Exporta reporte de pagos
     */
    async exportPayments(format) {
      this.exportingPayments = true;
      this.paymentExportStatus = null;

      try {
        // Construir query params
        const params = new URLSearchParams();
        if (this.paymentFilters.estado) params.append('estado', this.paymentFilters.estado);
        if (this.paymentFilters.metodo_pago) params.append('metodo_pago', this.paymentFilters.metodo_pago);
        if (this.paymentFilters.dateFrom) params.append('dateFrom', this.paymentFilters.dateFrom);
        if (this.paymentFilters.dateTo) params.append('dateTo', this.paymentFilters.dateTo);
        if (this.paymentFilters.limit) params.append('limit', this.paymentFilters.limit);

        const endpoint = format === 'pdf'
          ? '/api/reports/payments/pdf'
          : '/api/reports/payments/excel';

        const response = await axios.get(
          `${endpoint}?${params.toString()}`,
          {
            headers: authHeader(),
            responseType: 'blob'
          }
        );

        // Crear un enlace de descarga
        const blob = new Blob([response.data], {
          type: format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pagos_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.paymentExportStatus = {
          type: 'success',
          message: ` Reporte de pagos exportado exitosamente en formato ${format.toUpperCase()}`
        };

        // Limpiar mensaje después de 5 segundos
        setTimeout(() => {
          this.paymentExportStatus = null;
        }, 5000);

      } catch (error) {
        console.error('Error exportando pagos:', error);
        this.paymentExportStatus = {
          type: 'error',
          message: `L Error al exportar reporte: ${error.response?.data?.message || error.message}`
        };
      } finally {
        this.exportingPayments = false;
      }
    }
  }
};
</script>

<style scoped>
.reports-export {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  margin-bottom: 30px;
  text-align: center;
}

.header h2 {
  font-size: 2rem;
  margin-bottom: 10px;
  color: #2c3e50;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1rem;
}

.report-section {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #ecf0f1;
}

.section-header h3 {
  font-size: 1.5rem;
  color: #34495e;
  margin: 0;
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group label {
  font-weight: 600;
  color: #34495e;
  font-size: 0.9rem;
}

.filter-group select,
.filter-group input {
  padding: 10px 12px;
  border: 1px solid #dce4ec;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.export-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 10px;
}

.btn-export {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  justify-content: center;
}

.btn-export.pdf {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.btn-export.pdf:hover:not(:disabled) {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.btn-export.excel {
  background: linear-gradient(135deg, #27ae60, #229954);
  color: white;
}

.btn-export.excel:hover:not(:disabled) {
  background: linear-gradient(135deg, #229954, #1e8449);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-message {
  margin-top: 15px;
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 0.95rem;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.status-message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.info-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.info-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

.info-section ul {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}

.info-section li {
  margin-bottom: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .export-buttons {
    flex-direction: column;
  }

  .btn-export {
    width: 100%;
  }
}
</style>
