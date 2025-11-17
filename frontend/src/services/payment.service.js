import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class PaymentService {
  // ===============================
  // GESTIÓN DE PAGOS - RUTAS REALES DEL BACKEND
  // ===============================

  // GET /api/payments - Obtener todos los pagos con filtros
  getAllPayments(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    return axios.get(`${API_URL}payments?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/payments/:id - Obtener pago por ID
  getPaymentById(id) {
    return axios.get(`${API_URL}payments/${id}`, { headers: authHeader() });
  }

  // POST /api/payments - Crear nuevo pago
  createPayment(paymentData) {
    return axios.post(`${API_URL}payments`, paymentData, { headers: authHeader() });
  }

  // PUT /api/payments/:id - Actualizar pago
  updatePayment(id, paymentData) {
    return axios.put(`${API_URL}payments/${id}`, paymentData, { headers: authHeader() });
  }

  // DELETE /api/payments/:id - Eliminar pago
  deletePayment(id) {
    return axios.delete(`${API_URL}payments/${id}`, { headers: authHeader() });
  }

  // ===============================
  // OPERACIONES DE ESTADO
  // ===============================

  // POST /api/payments/:id/confirm - Confirmar pago pendiente
  confirmPayment(id, confirmationData = {}) {
    return axios.post(`${API_URL}payments/${id}/confirm`, confirmationData, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // PAGOS MANUALES - RUTAS ESPECÍFICAS IMPLEMENTADAS
  // ===============================

 // POST /api/manual-payments - Registrar pago manual por operador
  submitManualPayment(paymentData, receiptFile = null) {
    const formData = new FormData();
    
    // Agregar datos del pago
    Object.keys(paymentData).forEach(key => {
      if (paymentData[key] !== null && paymentData[key] !== undefined) {
        formData.append(key, paymentData[key]);
      }
    });
    
    // Agregar archivo de comprobante si existe
    if (receiptFile) {
      // El nombre 'receipt' coincide con el que ya tienes en manual.payment.controller.js
      formData.append('receipt', receiptFile);
    }

    // ✅ La URL correcta, que ahora sí existirá en el backend
    return axios.post(`${API_URL}manual-payments`, formData, { 
      headers: {
        ...authHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  // GET /api/manual-payments/pending - Obtener pagos pendientes de aprobación
  getPendingManualPayments(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return axios.get(`${API_URL}manual-payments/pending?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/manual-payments/:id - Obtener detalles de un pago manual
  getManualPaymentDetails(id) {
    return axios.get(`${API_URL}manual-payments/${id}`, { headers: authHeader() });
  }

  // POST /api/manual-payments/:id/approve - Aprobar pago manual
  approveManualPayment(id, approvalData = {}) {
    return axios.post(`${API_URL}manual-payments/${id}/approve`, approvalData, { 
      headers: authHeader() 
    });
  }

  // POST /api/manual-payments/:id/reject - Rechazar pago manual
  rejectManualPayment(id, rejectionData) {
    return axios.post(`${API_URL}manual-payments/${id}/reject`, rejectionData, { 
      headers: authHeader() 
    });
  }

  // GET /api/manual-payments/:id/receipt - Descargar comprobante de pago
  downloadManualPaymentReceipt(id) {
    return axios.get(`${API_URL}manual-payments/${id}/receipt`, {
      headers: authHeader(),
      responseType: 'blob'
    });
  }

  // POST /api/manual-payments/bulk-approve - Aprobar múltiples pagos en lote
  bulkApprovePayments(paymentIds, bulkApprovalNotes = '') {
    return axios.post(`${API_URL}manual-payments/bulk-approve`, {
      paymentIds,
      bulkApprovalNotes
    }, { headers: authHeader() });
  }

  // ===============================
  // BÚSQUEDA PARA OPERADORES
  // ===============================

  // GET /api/manual-payments/client/search - Buscar clientes
  searchClients(searchTerm) {
    return axios.get(`${API_URL}manual-payments/client/search?q=${encodeURIComponent(searchTerm)}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/manual-payments/client/:clientId/invoices - Facturas pendientes de cliente
  getClientPendingInvoices(clientId) {
    return axios.get(`${API_URL}invoices/client/${clientId}`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // PASARELAS DE PAGO - RUTAS REALES
  // ===============================

  // GET /api/payment-gateways - Obtener pasarelas de pago
  getAllPaymentGateways(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.active !== undefined) queryParams.append('active', params.active);
    if (params.country) queryParams.append('country', params.country);
    if (params.gatewayType) queryParams.append('gatewayType', params.gatewayType);

    return axios.get(`${API_URL}payment-gateways?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // POST /api/payment-gateways - Crear nueva pasarela
  createGateway(gatewayData) {
    return axios.post(`${API_URL}payment-gateways`, gatewayData, { 
      headers: authHeader() 
    });
  }

  // PUT /api/payment-gateways/:id - Actualizar pasarela
  updateGateway(id, gatewayData) {
    return axios.put(`${API_URL}payment-gateways/${id}`, gatewayData, { 
      headers: authHeader() 
    });
  }

  // POST /api/payment-gateways/:id/activate - Activar/desactivar pasarela
  activateGateway(id, active) {
    return axios.post(`${API_URL}payment-gateways/${id}/activate`, { active }, { 
      headers: authHeader() 
    });
  }

  // GET /api/payment-gateways/plugins - Obtener plugins disponibles
  getAvailablePlugins() {
    return axios.get(`${API_URL}payment-gateways/plugins`, { 
      headers: authHeader() 
    });
  }

  // GET /api/payment-gateways/:id/stats - Estadísticas de pasarela específica
  getGatewayStatistics(id, period = '30') {
    return axios.get(`${API_URL}payment-gateways/${id}/stats?period=${period}`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // PROCESAMIENTO DE PAGOS
  // ===============================

  // POST /api/payments/process - Procesar pago con plugin específico
  processPayment(paymentData) {
    return axios.post(`${API_URL}payments/process`, paymentData, { 
      headers: authHeader() 
    });
  }

  // POST /api/payments/reconcile - Conciliar pagos pendientes
  reconcilePayments(reconcileData) {
    return axios.post(`${API_URL}payments/reconcile`, reconcileData, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // WEBHOOKS DE PASARELAS
  // ===============================

  // POST /api/payments/webhook/:gateway - Manejar webhook genérico de pasarelas
  // NOTA: Esta ruta es pública y se usa internamente por las pasarelas de pago
  // No requiere autenticación ya que las pasarelas envían los webhooks directamente
  handleWebhook(gateway, webhookData, signature = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Agregar firma si está disponible (para verificación de seguridad)
    if (signature) {
      headers['x-signature'] = signature;
    }

    return axios.post(`${API_URL}payments/webhook/${gateway}`, webhookData, { 
      headers 
    });
  }

  // Método auxiliar para generar URL de webhook para configurar en pasarelas
  generateWebhookUrl(gateway, baseUrl = window.location.origin) {
    return `${baseUrl}/api/payments/webhook/${gateway}`;
  }

  // Método para probar webhook (solo para desarrollo/testing)
  testWebhook(gateway, testData) {
    return axios.post(`${API_URL}payments/webhook/${gateway}`, testData, { 
      headers: {
        'Content-Type': 'application/json',
        'x-test-webhook': 'true'
      }
    });
  }

  // ===============================
  // RECORDATORIOS DE PAGO - RUTAS REALES
  // ===============================

  // GET /api/payment-reminders - Obtener recordatorios
  getAllPaymentReminders(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.reminderType) queryParams.append('reminderType', params.reminderType);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.invoiceId) queryParams.append('invoiceId', params.invoiceId);

    return axios.get(`${API_URL}payment-reminders?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // POST /api/payment-reminders - Crear recordatorio manual
  createReminder(reminderData) {
    return axios.post(`${API_URL}payment-reminders`, reminderData, { 
      headers: authHeader() 
    });
  }

  // POST /api/payment-reminders/:id/send - Enviar recordatorio específico
  sendReminder(reminderId, options = {}) {
    return axios.post(`${API_URL}payment-reminders/${reminderId}/send`, options, { 
      headers: authHeader() 
    });
  }

  // POST /api/payment-reminders/schedule - Programar recordatorios automáticos
  scheduleReminders(options = {}) {
    return axios.post(`${API_URL}payment-reminders/schedule`, options, { 
      headers: authHeader() 
    });
  }

  // GET /api/payment-reminders/history - Obtener historial de recordatorios
  getReminderHistory(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.status) queryParams.append('status', params.status);
    if (params.reminderType) queryParams.append('reminderType', params.reminderType);

    return axios.get(`${API_URL}payment-reminders/history?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // ESTADÍSTICAS Y REPORTES - RUTAS REALES
  // ===============================

  // GET /api/payments/statistics - Obtener estadísticas de pagos
  getPaymentStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.gatewayId) queryParams.append('gatewayId', params.gatewayId);

    return axios.get(`${API_URL}payments/statistics?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/manual-payments/statistics - Estadísticas de pagos manuales
  getManualPaymentStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    return axios.get(`${API_URL}manual-payments/statistics?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/manual-payments/admin/summary - Resumen administrativo
  getAdminSummary() {
    return axios.get(`${API_URL}manual-payments/admin/summary`, { 
      headers: authHeader() 
    });
  }

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  // Validar datos de pago manual
  validateManualPaymentData(paymentData) {
    const errors = [];

    if (!paymentData.invoiceId || isNaN(parseInt(paymentData.invoiceId))) {
      errors.push('ID de factura es requerido');
    }

    if (!paymentData.clientId || isNaN(parseInt(paymentData.clientId))) {
      errors.push('ID de cliente es requerido');
    }

    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount)) || parseFloat(paymentData.amount) <= 0) {
      errors.push('Monto debe ser un número válido mayor a 0');
    }

    if (!paymentData.paymentMethod || !['cash', 'transfer'].includes(paymentData.paymentMethod)) {
      errors.push('Método de pago debe ser "cash" o "transfer"');
    }

    if (paymentData.paymentMethod === 'transfer' && !paymentData.bankName) {
      errors.push('Nombre del banco es requerido para transferencias');
    }

    if (paymentData.paymentDate) {
      const paymentDate = new Date(paymentData.paymentDate);
      const today = new Date();
      
      if (paymentDate > today) {
        errors.push('Fecha de pago no puede ser futura');
      }
    }

    return errors;
  }

  // Formatear estado de pago para UI
  formatPaymentStatus(status) {
    const statusMap = {
      'pending': { label: 'Pendiente', class: 'status-pending', color: '#2196F3' },
      'completed': { label: 'Completado', class: 'status-completed', color: '#4CAF50' },
      'failed': { label: 'Fallido', class: 'status-failed', color: '#F44336' },
      'cancelled': { label: 'Cancelado', class: 'status-cancelled', color: '#757575' },
      'refunded': { label: 'Reembolsado', class: 'status-refunded', color: '#FF9800' },
      'processing': { label: 'Procesando', class: 'status-processing', color: '#9C27B0' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  // Formatear método de pago para UI
  formatPaymentMethod(method) {
    const methodMap = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'card': 'Tarjeta',
      'oxxo': 'OXXO',
      'spei': 'SPEI',
      'online': 'Pago en Línea',
      'other': 'Otro'
    };

    return methodMap[method] || method;
  }

  // Calcular total de pagos
  calculatePaymentTotal(payments) {
    if (!Array.isArray(payments)) return 0;
    
    return payments
      .filter(payment => payment.status === 'completed')
      .reduce((total, payment) => total + (parseFloat(payment.amount) || 0), 0);
  }

  // Generar referencia de pago
  generatePaymentReference(prefix = 'PAY') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
}

export default new PaymentService();