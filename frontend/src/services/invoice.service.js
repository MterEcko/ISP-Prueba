import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class InvoiceService {
  // ===============================
  // GESTIÓN DE FACTURAS - RUTAS REALES DEL BACKEND
  // ===============================

  // GET /api/invoices - Obtener todas las facturas con filtros
  getAllInvoices(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    return axios.get(`${API_URL}invoices?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/invoices/:id - Obtener factura por ID
  getInvoiceById(id) {
    return axios.get(`${API_URL}invoices/${id}`, { headers: authHeader() });
  }

  // POST /api/invoices - Crear nueva factura
  createInvoice(invoiceData) {
    return axios.post(`${API_URL}invoices`, invoiceData, { headers: authHeader() });
  }

  // PUT /api/invoices/:id - Actualizar factura
  updateInvoice(id, invoiceData) {
    return axios.put(`${API_URL}invoices/${id}`, invoiceData, { headers: authHeader() });
  }

  // DELETE /api/invoices/:id - Eliminar factura
  deleteInvoice(id, force = false) {
    const params = force ? '?force=true' : '';
    return axios.delete(`${API_URL}invoices/${id}${params}`, { headers: authHeader() });
  }

  // ===============================
  // OPERACIONES DE ESTADO - RUTAS ESPECÍFICAS
  // ===============================

  // POST /api/invoices/:id/mark-paid - Marcar factura como pagada
  markAsPaid(id, paymentData = {}) {
    return axios.post(`${API_URL}invoices/${id}/mark-paid`, paymentData, { 
      headers: authHeader() 
    });
  }

  // POST /api/invoices/:id/cancel - Cancelar factura
  cancelInvoice(id, reason = '') {
    return axios.post(`${API_URL}invoices/${id}/cancel`, { reason }, { 
      headers: authHeader() 
    });
  }

  // POST /api/invoices/:id/duplicate - Duplicar factura
  duplicateInvoice(id, options = {}) {
    return axios.post(`${API_URL}invoices/${id}/duplicate`, options, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // FACTURAS VENCIDAS Y PROCESAMIENTO
  // ===============================

  // GET /api/invoices/overdue - Obtener facturas vencidas
  getOverdueInvoices(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.days) queryParams.append('days', params.days);
    if (params.limit) queryParams.append('limit', params.limit);

    return axios.get(`${API_URL}invoices/overdue?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // POST /api/invoices/process-overdue - Procesar facturas vencidas
  processOverdueInvoices(options = {}) {
    return axios.post(`${API_URL}invoices/process-overdue`, options, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // FACTURAS POR CLIENTE
  // ===============================

  // GET /api/invoices/client/:clientId - Obtener facturas de un cliente
  getClientInvoices(clientId, params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);

    return axios.get(`${API_URL}invoices/client/${clientId}?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // DESCARGA Y EXPORTACIÓN
  // ===============================

  // GET /api/invoices/:id/pdf - Generar PDF de factura
  generatePDF(id) {
    return axios.get(`${API_URL}invoices/${id}/pdf`, {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  // GET /api/invoices/:id/pdf - Generar PDF de factura
  downloadInvoicePDF(id) {
    return axios.get(`${API_URL}invoices/${id}/pdf`, {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  // ===============================
  // ESTADÍSTICAS Y REPORTES - RUTAS REALES
  // ===============================

  // GET /api/invoices/statistics - Obtener estadísticas de facturación
  getInvoiceStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.period) queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return axios.get(`${API_URL}invoices/statistics?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  // Validar datos de factura
  validateInvoiceData(invoiceData) {
    const errors = [];

    if (!invoiceData.clientId || isNaN(parseInt(invoiceData.clientId))) {
      errors.push('Cliente es requerido');
    }

    if (!invoiceData.subscriptionId || isNaN(parseInt(invoiceData.subscriptionId))) {
      errors.push('Suscripción es requerida');
    }

    if (!invoiceData.amount || isNaN(parseFloat(invoiceData.amount)) || parseFloat(invoiceData.amount) <= 0) {
      errors.push('Monto debe ser un número válido mayor a 0');
    }

    if (!invoiceData.dueDate) {
      errors.push('Fecha de vencimiento es requerida');
    }

    if (invoiceData.billingPeriodStart && invoiceData.billingPeriodEnd) {
      const startDate = new Date(invoiceData.billingPeriodStart);
      const endDate = new Date(invoiceData.billingPeriodEnd);
      
      if (startDate >= endDate) {
        errors.push('Fecha de inicio debe ser anterior a fecha de fin del período');
      }
    }

    return errors;
  }

  // Formatear estado de factura para UI
  formatInvoiceStatus(status) {
    const statusMap = {
      'pending': { label: 'Pendiente', class: 'status-pending', color: '#2196F3' },
      'paid': { label: 'Pagada', class: 'status-paid', color: '#4CAF50' },
      'overdue': { label: 'Vencida', class: 'status-overdue', color: '#F44336' },
      'cancelled': { label: 'Cancelada', class: 'status-cancelled', color: '#757575' },
      'partial': { label: 'Pago Parcial', class: 'status-partial', color: '#FF9800' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  // Calcular días de vencimiento
  calculateOverdueDays(dueDate) {
    if (!dueDate) return 0;
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Formatear número de factura
  formatInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber) return 'N/A';
    
    // Si ya tiene formato, devolverlo tal como está
    if (invoiceNumber.includes('-')) return invoiceNumber;
    
    // Formatear número simple a formato estándar
    const padded = invoiceNumber.toString().padStart(6, '0');
    const year = new Date().getFullYear();
    return `INV-${year}-${padded}`;
  }

  // Calcular total con impuestos
  calculateTotalWithTax(amount, taxAmount = 0) {
    const baseAmount = parseFloat(amount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    return baseAmount + tax;
  }
}

export default new InvoiceService();