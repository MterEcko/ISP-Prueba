import axios from 'axios';
import authHeader from './auth-header';

import { API_URL } from './frontend_apiConfig';

class SubscriptionService {
  // ===============================
  // GESTIÓN DE SUSCRIPCIONES
  // ===============================

  // Obtener todas las suscripciones con filtros
  getAllSubscriptions(params = {}) {
    let queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.size) queryParams.append('size', params.size);
    if (params.clientId) queryParams.append('clientId', params.clientId);
    if (params.status) queryParams.append('status', params.status);
    if (params.zoneId) queryParams.append('zoneId', params.zoneId);
    if (params.servicePackageId) queryParams.append('servicePackageId', params.servicePackageId);
    if (params.includeInactive) queryParams.append('includeInactive', params.includeInactive);

    return axios.get(API_URL + 'subscriptions?' + queryParams.toString(), { 
      headers: authHeader() 
    });
  }

  // Crear nueva suscripción completa
  createSubscription(subscriptionData) {
    return axios.post(`${API_URL}subscriptions`, subscriptionData, {
      headers: authHeader()
    });
  }

  // Obtener detalles de una suscripción
  getSubscriptionDetails(subscriptionId) {
    return axios.get(`${API_URL}subscriptions/${subscriptionId}`, {
      headers: authHeader()
    });
  }

  // Actualizar suscripción
  updateSubscription(subscriptionId, subscriptionData) {
    return axios.put(`${API_URL}subscriptions/${subscriptionId}`, subscriptionData, {
      headers: authHeader()
    });
  }

  // Eliminar suscripción
  deleteSubscription(subscriptionId) {
    return axios.delete(`${API_URL}subscriptions/${subscriptionId}`, {
      headers: authHeader()
    });
  }

  // Obtener todas las suscripciones de un cliente
  getClientSubscriptions(clientId, includeInactive = false) {
    let queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append('includeInactive', 'true');

    return axios.get(`${API_URL}clients/${clientId}/subscriptions?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  // ===============================
  // OPERACIONES DE ESTADO
  // ===============================

  // Cambiar plan de servicio
  changeServicePlan(subscriptionId, newServicePackageId, effectiveDate = null) {
    const requestData = {
      newServicePackageId,
      effectiveDate: effectiveDate || new Date().toISOString()
    };

    return axios.put(`${API_URL}subscriptions/${subscriptionId}/change-plan`, requestData, {
      headers: authHeader()
    });
  }

  // Suspender suscripción
  suspendSubscription(subscriptionId, reason = 'Suspensión manual') {
    return axios.post(`${API_URL}subscriptions/${subscriptionId}/suspend`, {
      reason
    }, {
      headers: authHeader()
    });
  }

  // Reactivar suscripción
  reactivateSubscription(subscriptionId, paymentReference = null) {
    return axios.post(`${API_URL}subscriptions/${subscriptionId}/reactivate`, {
      paymentReference
    }, {
      headers: authHeader()
    });
  }

  // Cancelar suscripción permanentemente
  cancelSubscription(subscriptionId, reason = 'Cancelación solicitada', removeFromMikrotik = true) {
    return axios.post(`${API_URL}subscriptions/${subscriptionId}/cancel`, {
      reason,
      removeFromMikrotik
    }, {
      headers: authHeader()
    });
  }

  // ===============================
  // BÚSQUEDA Y ESTADÍSTICAS
  // ===============================

  // Búsqueda avanzada de suscripciones
  searchSubscriptions(searchParams = {}) {
    let queryParams = new URLSearchParams();
    
    if (searchParams.status) queryParams.append('status', searchParams.status);
    if (searchParams.zoneId) queryParams.append('zoneId', searchParams.zoneId);
    if (searchParams.servicePackageId) queryParams.append('servicePackageId', searchParams.servicePackageId);
    if (searchParams.clientName) queryParams.append('clientName', searchParams.clientName);
    if (searchParams.pppoeUsername) queryParams.append('pppoeUsername', searchParams.pppoeUsername);
    if (searchParams.page) queryParams.append('page', searchParams.page);
    if (searchParams.limit) queryParams.append('limit', searchParams.limit);

    return axios.get(`${API_URL}subscriptions/search?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  // Obtener estadísticas de suscripciones
  getStatistics(period = null, zoneId = null) {
    let queryParams = new URLSearchParams();
    if (period) queryParams.append('period', period);
    if (zoneId) queryParams.append('zoneId', zoneId);

    return axios.get(`${API_URL}subscriptions/statistics?${queryParams.toString()}`, {
      headers: authHeader()
    });
  }

  // ===============================
  // OPERACIONES ADMINISTRATIVAS
  // ===============================

  // Procesar suscripciones vencidas
  processOverdueSubscriptions(dryRun = false) {
    let queryParams = new URLSearchParams();
    if (dryRun) queryParams.append('dryRun', 'true');

    return axios.post(`${API_URL}subscriptions/process-overdue?${queryParams.toString()}`, {}, {
      headers: authHeader()
    });
  }

  // ===============================
  // MÉTODOS DE UTILIDAD
  // ===============================

  // Normalizar datos de suscripción para envío
  normalizeSubscriptionData(subscriptionData) {
    return {
      clientId: parseInt(subscriptionData.clientId),
      servicePackageId: parseInt(subscriptionData.servicePackageId),
      primaryRouterId: parseInt(subscriptionData.primaryRouterId),
      customPrice: subscriptionData.customPrice ? parseFloat(subscriptionData.customPrice) : null,
      promoDiscount: subscriptionData.promoDiscount ? parseFloat(subscriptionData.promoDiscount) : 0,
      billingDay: subscriptionData.billingDay ? parseInt(subscriptionData.billingDay) : 1,
      notes: subscriptionData.notes || '',
      pppoeConfig: subscriptionData.pppoeConfig || {},
      autoCreateBilling: subscriptionData.autoCreateBilling !== false
    };
  }

  // Formatear estado de suscripción para UI
  formatSubscriptionStatus(status) {
    const statusMap = {
      'active': { label: 'Activo', class: 'status-active', color: '#4CAF50' },
      'suspended': { label: 'Suspendido', class: 'status-suspended', color: '#FF9800' },
      'cancelled': { label: 'Cancelado', class: 'status-cancelled', color: '#F44336' },
      'cutService': { label: 'Corte de Servicio', class: 'status-cut', color: '#9C27B0' },
      'pending': { label: 'Pendiente', class: 'status-pending', color: '#2196F3' }
    };

    return statusMap[status] || { label: status, class: 'status-unknown', color: '#757575' };
  }

  // Calcular próxima fecha de pago
  calculateNextDueDate(lastPaymentDate, billingDay) {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
    
    if (lastPaymentDate) {
      const lastPayment = new Date(lastPaymentDate);
      const nextFromLast = new Date(lastPayment.getFullYear(), lastPayment.getMonth() + 1, billingDay);
      return nextFromLast > today ? nextFromLast : nextMonth;
    }

    return nextMonth;
  }

  // Validar datos de suscripción
  validateSubscriptionData(data) {
    const errors = [];

    if (!data.clientId || isNaN(parseInt(data.clientId))) {
      errors.push('Cliente es requerido');
    }

    if (!data.servicePackageId || isNaN(parseInt(data.servicePackageId))) {
      errors.push('Paquete de servicio es requerido');
    }

    if (!data.primaryRouterId || isNaN(parseInt(data.primaryRouterId))) {
      errors.push('Router principal es requerido');
    }

    if (data.customPrice && (isNaN(parseFloat(data.customPrice)) || parseFloat(data.customPrice) < 0)) {
      errors.push('Precio personalizado debe ser un número válido mayor a 0');
    }

    if (data.promoDiscount && (isNaN(parseFloat(data.promoDiscount)) || parseFloat(data.promoDiscount) < 0 || parseFloat(data.promoDiscount) > 100)) {
      errors.push('Descuento promocional debe estar entre 0 y 100');
    }

    if (data.billingDay && (isNaN(parseInt(data.billingDay)) || parseInt(data.billingDay) < 1 || parseInt(data.billingDay) > 31)) {
      errors.push('Día de facturación debe estar entre 1 y 31');
    }

    return errors;
  }
}

export default new SubscriptionService();