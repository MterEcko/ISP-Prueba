import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class BillingService {
  // ===============================
  // GESTIÓN DE FACTURACIÓN DE CLIENTES - RUTAS REALES
  // ===============================

  // GET /api/client-billing - Obtener todas las facturaciones de clientes
  getAllClientBillings(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.status) queryParams.append('status', params.status);
    if (params.paymentMethod) queryParams.append('paymentMethod', params.paymentMethod);
    
    return axios.get(`${API_URL}client-billing?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/client-billing/:id - Obtener facturación de cliente por ID
  getClientBillingById(id) {
    return axios.get(`${API_URL}client-billing/${id}`, { headers: authHeader() });
  }

  // GET /api/client-billing/by-client/:clientId - Obtener facturación por ID de cliente
  getClientBillingByClientId(clientId) {
    return axios.get(`${API_URL}client-billing/by-client/${clientId}`, { headers: authHeader() });
  }

  // POST /api/client-billing - Crear nueva facturación de cliente
  createClientBilling(billingData) {
    return axios.post(`${API_URL}client-billing`, billingData, { headers: authHeader() });
  }

  // PUT /api/client-billing/:id - Actualizar facturación de cliente
  updateClientBilling(id, billingData) {
    return axios.put(`${API_URL}client-billing/${id}`, billingData, { headers: authHeader() });
  }

  // DELETE /api/client-billing/:id - Eliminar facturación de cliente
  deleteClientBilling(id) {
    return axios.delete(`${API_URL}client-billing/${id}`, { headers: authHeader() });
  }

  // ===============================
  // OPERACIONES DE PROCESAMIENTO
  // ===============================

  // POST /api/client-billing/process-all - Procesar facturación de todos los clientes
  processAllClientsBilling(processData = {}) {
    return axios.post(`${API_URL}client-billing/process-all`, processData, { headers: authHeader() });
  }

  // GET /api/client-billing/:clientId/calculate - Calcular facturación mensual
  calculateMonthlyBilling(clientId) {
    return axios.get(`${API_URL}client-billing/${clientId}/calculate`, { headers: authHeader() });
  }

  // POST /api/client-billing/:clientId/invoice - Generar factura para cliente
  generateInvoice(clientId, invoiceData) {
    return axios.post(`${API_URL}client-billing/${clientId}/invoice`, invoiceData, { headers: authHeader() });
  }

  // ===============================
  // OPERACIONES DE ESTADO
  // ===============================

  // PUT /api/client-billing/:clientId/status - Actualizar estado del cliente
  updateClientStatus(clientId, status) {
    return axios.put(`${API_URL}client-billing/${clientId}/status`, { status }, { headers: authHeader() });
  }

  // ===============================
  // PAGOS
  // ===============================

  // POST /api/client-billing/:clientId/payment - Registrar pago para cliente
  registerPayment(clientId, paymentData) {
    return axios.post(`${API_URL}client-billing/${clientId}/payment`, paymentData, { headers: authHeader() });
  }

  // PUT /api/client-billing/:clientId/penalty - Aplicar penalización por pago tardío
  applyLatePaymentPenalty(clientId, penaltyData = {}) {
    return axios.put(`${API_URL}client-billing/${clientId}/penalty`, penaltyData, { headers: authHeader() });
  }

  // ===============================
  // REPORTES Y CONSULTAS ESPECÍFICAS
  // ===============================

  // GET /api/client-billing/overdue - Obtener clientes con pagos vencidos
  getOverdueClients(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.days) queryParams.append('days', params.days);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    
    return axios.get(`${API_URL}client-billing/overdue?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/client-billing/upcoming - Obtener próximos pagos
  getUpcomingPayments(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.days) queryParams.append('days', params.days);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    
    return axios.get(`${API_URL}client-billing/upcoming?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }

  // GET /api/client-billing/statistics - Obtener estadísticas de facturación
  getBillingStatistics(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    return axios.get(`${API_URL}client-billing/statistics?${queryParams.toString()}`, { 
      headers: authHeader() 
    });
  }
  
  getClientInvoices(clientId, params = {}) {
  let queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.size) queryParams.append('size', params.size);
  
  return axios.get(`${API_URL}invoices/client/${clientId}?${queryParams.toString()}`, { 
    headers: authHeader() 
  });
}

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  // Validar datos de facturación de cliente
  validateBillingData(billingData) {
    const errors = [];

    if (!billingData.clientId || isNaN(parseInt(billingData.clientId))) {
      errors.push('Cliente es requerido');
    }

    if (!billingData.servicePackageId || isNaN(parseInt(billingData.servicePackageId))) {
      errors.push('Paquete de servicio es requerido');
    }

    if (!billingData.currentIpPoolId || isNaN(parseInt(billingData.currentIpPoolId))) {
      errors.push('Pool de IPs es requerido');
    }

    if (!billingData.billingDay || isNaN(parseInt(billingData.billingDay)) || 
        parseInt(billingData.billingDay) < 1 || parseInt(billingData.billingDay) > 31) {
      errors.push('Día de facturación debe estar entre 1 y 31');
    }

    if (billingData.monthlyFee && (isNaN(parseFloat(billingData.monthlyFee)) || parseFloat(billingData.monthlyFee) < 0)) {
      errors.push('Tarifa mensual debe ser un número válido mayor o igual a 0');
    }

    if (billingData.graceDays && (isNaN(parseInt(billingData.graceDays)) || parseInt(billingData.graceDays) < 0)) {
      errors.push('Días de gracia debe ser un número válido mayor o igual a 0');
    }

    if (billingData.penaltyFee && (isNaN(parseFloat(billingData.penaltyFee)) || parseFloat(billingData.penaltyFee) < 0)) {
      errors.push('Tarifa de penalización debe ser un número válido mayor o igual a 0');
    }

    // Validar fechas
    if (billingData.lastPaymentDate && billingData.nextDueDate) {
      const lastPayment = new Date(billingData.lastPaymentDate);
      const nextDue = new Date(billingData.nextDueDate);
      
      if (lastPayment > nextDue) {
        errors.push('Fecha del último pago no puede ser posterior a la próxima fecha de vencimiento');
      }
    }

    return errors;
  }

  // Formatear estado de facturación para UI
  formatBillingStatus(status) {
    const statusMap = {
      'active': { label: 'Activo', class: 'status-active', color: '#4CAF50' },
      'suspended': { label: 'Suspendido', class: 'status-suspended', color: '#FF9800' },
      'cancelled': { label: 'Cancelado', class: 'status-cancelled', color: '#F44336' },
      'overdue': { label: 'Vencido', class: 'status-overdue', color: '#E91E63' },
      'pending': { label: 'Pendiente', class: 'status-pending', color: '#2196F3' },
      'grace_period': { label: 'Período de Gracia', class: 'status-grace', color: '#9C27B0' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  // Formatear método de pago para UI
  formatPaymentMethod(method) {
    const methodMap = {
      'cash': 'Efectivo',
      'transfer': 'Transferencia',
      'card': 'Tarjeta',
      'check': 'Cheque',
      'online': 'Pago en Línea',
      'mercadopago': 'Mercado Pago',
      'paypal': 'PayPal',
      'spei': 'SPEI',
      'oxxo': 'OXXO',
      'other': 'Otro'
    };

    return methodMap[method] || method;
  }

  // Calcular días de retraso
  calculateOverdueDays(dueDate) {
    if (!dueDate) return 0;
    
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Calcular total con penalizaciones
  calculateTotalWithPenalty(baseAmount, overdueDays, penaltyFee = 0, graceDays = 0) {
    if (overdueDays <= graceDays) return parseFloat(baseAmount);
    
    const effectiveOverdueDays = overdueDays - graceDays;
    const penaltyAmount = parseFloat(penaltyFee) || 0;
    
    // Si hay tarifa de penalización fija, aplicarla
    if (penaltyAmount > 0) {
      return parseFloat(baseAmount) + penaltyAmount;
    }
    
    // Si no, aplicar penalización por defecto (5% por mes)
    const monthsOverdue = Math.ceil(effectiveOverdueDays / 30);
    const penalty = parseFloat(baseAmount) * (0.05 * monthsOverdue);
    
    return parseFloat(baseAmount) + penalty;
  }

  // Calcular próxima fecha de facturación
  // eslint-disable-next-line no-unused-vars
  calculateNextBillingDate(billingDay, lastPaymentDate = null) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Crear fecha para este mes
    let nextBillingDate = new Date(currentYear, currentMonth, billingDay);
    
    // Si ya pasó el día de facturación de este mes, usar el siguiente mes
    if (nextBillingDate <= today) {
      nextBillingDate = new Date(currentYear, currentMonth + 1, billingDay);
    }
    
    return nextBillingDate;
  }

  // Determinar estado basado en fechas
  determineBillingStatus(nextDueDate, graceDays = 0) {
    if (!nextDueDate) return 'pending';
    
    const today = new Date();
    const dueDate = new Date(nextDueDate);
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return 'active'; // Aún no vence
    } else if (diffDays <= graceDays) {
      return 'grace_period'; // En período de gracia
    } else {
      return 'overdue'; // Vencido
    }
  }

  // Formatear información de facturación para mostrar
  formatBillingInfo(billing) {
    if (!billing) return null;
    
    const overdueDays = this.calculateOverdueDays(billing.nextDueDate);
    const status = this.determineBillingStatus(billing.nextDueDate, billing.graceDays);
    const totalWithPenalty = this.calculateTotalWithPenalty(
      billing.monthlyFee, 
      overdueDays, 
      billing.penaltyFee, 
      billing.graceDays
    );
    
    return {
      ...billing,
      overdueDays,
      status,
      totalWithPenalty,
      formattedStatus: this.formatBillingStatus(status),
      formattedPaymentMethod: this.formatPaymentMethod(billing.paymentMethod)
    };
  }
}

export default new BillingService();