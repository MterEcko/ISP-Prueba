// backend/src/utils/billing-utils.js
// Utilidades para el Sistema de Facturación

const billingConfig = require('../config/billing-config');

class BillingUtils {

  /**
   * Calcula el número de días entre dos fechas
   * @param {Date} startDate - Fecha inicial
   * @param {Date} endDate - Fecha final
   * @returns {number} Número de días (incluye ambas fechas)
   */
  static daysBetween(startDate, endDate) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Verifica si una fecha está dentro de un rango
   * @param {Date} date - Fecha a verificar
   * @param {Date} startDate - Inicio del rango
   * @param {Date} endDate - Fin del rango
   * @returns {boolean} True si está dentro del rango
   */
  static isDateInRange(date, startDate, endDate) {
    return date >= startDate && date <= endDate;
  }

  /**
   * Calcula el monto proporcional basado en días utilizados
   * @param {number} monthlyAmount - Monto mensual
   * @param {number} daysUsed - Días utilizados
   * @param {number} totalDays - Total de días del período (default: 30)
   * @returns {number} Monto proporcional redondeado
   */
  static calculateProportionalAmount(monthlyAmount, daysUsed, totalDays = 30) {
    const dailyRate = monthlyAmount / totalDays;
    const proportionalAmount = dailyRate * daysUsed;
    
    // Redondear a 2 decimales
    return Math.round(proportionalAmount * 100) / 100;
  }

  /**
   * Calcula la tarifa diaria de un servicio
   * @param {number} monthlyAmount - Monto mensual
   * @param {number} totalDays - Total de días del período (default: 30)
   * @returns {number} Tarifa diaria redondeada
   */
  static calculateDailyRate(monthlyAmount, totalDays = 30) {
    const dailyRate = monthlyAmount / totalDays;
    return Math.round(dailyRate * 100) / 100;
  }

  /**
   * Formatea un monto en moneda local
   * @param {number} amount - Cantidad a formatear
   * @param {string} currency - Código de moneda (default: MXN)
   * @param {string} locale - Locale para formateo (default: es-MX)
   * @returns {string} Cantidad formateada
   */
  static formatCurrency(amount, currency = 'MXN', locale = 'es-MX') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Formatea una fecha en formato local
   * @param {Date} date - Fecha a formatear
   * @param {string} locale - Locale para formateo (default: es-MX)
   * @returns {string} Fecha formateada
   */
  static formatDate(date, locale = 'es-MX') {
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatea fecha y hora en formato local
   * @param {Date} date - Fecha a formatear
   * @param {string} locale - Locale para formateo (default: es-MX)
   * @returns {string} Fecha y hora formateada
   */
  static formatDateTime(date, locale = 'es-MX') {
    return new Date(date).toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Genera un número de factura único
   * @param {number} clientId - ID del cliente
   * @param {Date} date - Fecha de la factura (opcional)
   * @returns {string} Número de factura generado
   */
  static generateInvoiceNumber(clientId, date = new Date()) {
    const prefix = billingConfig.AUTO_BILLING.invoicePrefix;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
    
    return `${prefix}-${year}${month}-${clientId}-${timestamp}`;
  }

  /**
   * Genera un número de pago único
   * @param {number} clientId - ID del cliente
   * @param {Date} date - Fecha del pago (opcional)
   * @returns {string} Número de pago generado
   */
  static generatePaymentNumber(clientId, date = new Date()) {
    const prefix = billingConfig.AUTO_BILLING.paymentPrefix;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}-${year}${month}-${clientId}-${timestamp}`;
  }

  /**
   * Valida los datos de un pago
   * @param {Object} paymentData - Datos del pago a validar
   * @returns {Object} Resultado de la validación
   */
  static validatePaymentData(paymentData) {
    const errors = [];
    const limits = billingConfig.VALIDATION_LIMITS;
    
    // Validar monto
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('El monto del pago debe ser mayor a 0');
    }
    
    if (paymentData.amount < limits.MIN_PAYMENT_AMOUNT) {
      errors.push(`El monto mínimo de pago es ${this.formatCurrency(limits.MIN_PAYMENT_AMOUNT)}`);
    }
    
    if (paymentData.amount > limits.MAX_PAYMENT_AMOUNT) {
      errors.push(`El monto máximo de pago es ${this.formatCurrency(limits.MAX_PAYMENT_AMOUNT)}`);
    }
    
    // Validar fecha de pago
    if (!paymentData.paymentDate) {
      errors.push('La fecha de pago es requerida');
    } else {
      const paymentDate = new Date(paymentData.paymentDate);
      const today = new Date();
      
      if (paymentDate > today) {
        errors.push('La fecha de pago no puede ser futura');
      }
      
      // No permitir pagos de más de 1 año atrás
      const oneYearAgo = new Date(today.getTime() - (365 * 24 * 60 * 60 * 1000));
      
      if (paymentDate < oneYearAgo) {
        errors.push('La fecha de pago no puede ser de más de 1 año atrás');
      }
    }
    
    // Validar método de pago
    const validPaymentMethods = Object.keys(billingConfig.PAYMENT_METHODS);
    if (!paymentData.paymentMethod || !validPaymentMethods.includes(paymentData.paymentMethod)) {
      errors.push(`Método de pago inválido. Métodos válidos: ${validPaymentMethods.join(', ')}`);
    }
    
    // Validar referencia si es requerida
    const paymentMethod = billingConfig.PAYMENT_METHODS[paymentData.paymentMethod];
    if (paymentMethod && paymentMethod.requiresReference && !paymentData.reference) {
      errors.push(`El método de pago ${paymentMethod.name} requiere una referencia`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcula la fecha de vencimiento de una factura
   * @param {Date} billingDate - Fecha de facturación
   * @param {number} graceDays - Días de gracia
   * @returns {Date} Fecha de vencimiento
   */
  static calculateDueDate(billingDate, graceDays) {
    const dueDate = new Date(billingDate);
    dueDate.setDate(dueDate.getDate() + graceDays);
    return dueDate;
  }

  /**
   * Verifica si una factura está vencida
   * @param {Date} dueDate - Fecha de vencimiento
   * @param {Date} currentDate - Fecha actual (opcional)
   * @returns {boolean} True si está vencida
   */
  static isInvoiceOverdue(dueDate, currentDate = new Date()) {
    return currentDate > dueDate;
  }

  /**
   * Calcula los días de retraso de una factura
   * @param {Date} dueDate - Fecha de vencimiento
   * @param {Date} currentDate - Fecha actual (opcional)
   * @returns {number} Días de retraso (0 si no está vencida)
   */
  static getDaysOverdue(dueDate, currentDate = new Date()) {
    if (!this.isInvoiceOverdue(dueDate, currentDate)) {
      return 0;
    }
    
    const timeDiff = currentDate.getTime() - dueDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el próximo día de facturación
   * @param {number} billingDay - Día del mes para facturar (1-28)
   * @param {Date} fromDate - Fecha de referencia (opcional)
   * @returns {Date} Próxima fecha de facturación
   */
  static getNextBillingDate(billingDay, fromDate = new Date()) {
    const nextBilling = new Date(fromDate);
    
    // Si ya pasó el día de facturación este mes, ir al siguiente mes
    if (fromDate.getDate() >= billingDay) {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }
    
    nextBilling.setDate(billingDay);
    nextBilling.setHours(0, 0, 0, 0); // Comenzar el día
    
    return nextBilling;
  }

  /**
   * Obtiene el período de facturación actual para un cliente
   * @param {number} billingDay - Día del mes para facturar
   * @param {Date} referenceDate - Fecha de referencia (opcional)
   * @returns {Object} Objeto con fechas de inicio y fin del período
   */
  static getCurrentBillingPeriod(billingDay, referenceDate = new Date()) {
    const currentDate = new Date(referenceDate);
    let periodStart, periodEnd;
    
    if (currentDate.getDate() >= billingDay) {
      // Estamos en el período actual
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, billingDay - 1);
    } else {
      // Estamos en el siguiente período
      periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, billingDay);
      periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), billingDay - 1);
    }
    
    return {
      startDate: periodStart,
      endDate: periodEnd,
      isCurrentPeriod: this.isDateInRange(currentDate, periodStart, periodEnd)
    };
  }

  /**
   * Reemplaza variables en una plantilla de mensaje
   * @param {string} template - Plantilla con variables {variable}
   * @param {Object} variables - Objeto con las variables a reemplazar
   * @returns {string} Mensaje con variables reemplazadas
   */
  static replaceTemplateVariables(template, variables) {
    let message = template;
    
    // Reemplazar variables en formato {variable}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      message = message.replace(regex, variables[key]);
    });
    
    return message;
  }

  /**
   * Crea un objeto de variables estándar para plantillas
   * @param {Object} client - Cliente
   * @param {Object} invoice - Factura (opcional)
   * @param {Object} payment - Pago (opcional)
   * @param {Object} additional - Variables adicionales (opcional)
   * @returns {Object} Variables para plantillas
   */
  static createTemplateVariables(client, invoice = null, payment = null, additional = {}) {
    const variables = {
      clientName: `${client.firstName} ${client.lastName}`,
      clientFirstName: client.firstName,
      clientLastName: client.lastName,
      clientId: client.id,
      currentDate: this.formatDate(new Date()),
      currentDateTime: this.formatDateTime(new Date()),
      ...additional
    };
    
    if (invoice) {
      variables.invoiceNumber = invoice.invoiceNumber;
      variables.invoiceAmount = this.formatCurrency(invoice.amount);
      variables.invoiceAmountRaw = invoice.amount;
      variables.invoiceDueDate = this.formatDate(invoice.dueDate);
      variables.invoiceStatus = invoice.status;
      
      if (this.isInvoiceOverdue(invoice.dueDate)) {
        variables.daysOverdue = this.getDaysOverdue(invoice.dueDate);
      }
    }
    
    if (payment) {
      variables.paymentAmount = this.formatCurrency(payment.amount);
      variables.paymentAmountRaw = payment.amount;
      variables.paymentDate = this.formatDate(payment.paymentDate);
      variables.paymentMethod = payment.paymentMethod;
      variables.paymentReference = payment.paymentReference;
    }
    
    return variables;
  }

  /**
   * Genera estadísticas de facturación para un período
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @param {Array} invoices - Array de facturas
   * @param {Array} payments - Array de pagos
   * @returns {Object} Estadísticas calculadas
   */
  static calculateBillingStats(startDate, endDate, invoices, payments) {
    const stats = {
      period: {
        start: this.formatDate(startDate),
        end: this.formatDate(endDate),
        days: this.daysBetween(startDate, endDate)
      },
      invoices: {
        total: invoices.length,
        paid: invoices.filter(inv => inv.status === 'paid').length,
        pending: invoices.filter(inv => inv.status === 'pending').length,
        overdue: invoices.filter(inv => inv.status === 'overdue').length,
        lostRevenue: invoices.filter(inv => inv.status === 'lost_revenue').length
      },
      amounts: {
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
        totalLost: 0
      },
      payments: {
        total: payments.length,
        byMethod: {}
      }
    };
    
    // Calcular montos
    invoices.forEach(invoice => {
      stats.amounts.totalBilled += invoice.amount;
      
      switch (invoice.status) {
        case 'paid':
          stats.amounts.totalPaid += invoice.amount;
          break;
        case 'pending':
        case 'overdue':
          stats.amounts.totalPending += invoice.amount;
          break;
        case 'lost_revenue':
          stats.amounts.totalLost += invoice.amount;
          break;
      }
    });
    
    // Agrupar pagos por método
    payments.forEach(payment => {
      const method = payment.paymentMethod;
      if (!stats.payments.byMethod[method]) {
        stats.payments.byMethod[method] = {
          count: 0,
          amount: 0
        };
      }
      stats.payments.byMethod[method].count++;
      stats.payments.byMethod[method].amount += payment.amount;
    });
    
    // Calcular eficiencia de cobranza
    if (stats.amounts.totalBilled > 0) {
      stats.collectionEfficiency = (
        (stats.amounts.totalPaid / stats.amounts.totalBilled) * 100
      ).toFixed(2);
    } else {
      stats.collectionEfficiency = 0;
    }
    
    // Formatear montos
    Object.keys(stats.amounts).forEach(key => {
      stats.amounts[key + 'Formatted'] = this.formatCurrency(stats.amounts[key]);
    });
    
    return stats;
  }

  /**
   * Valida si un día de facturación es válido
   * @param {number} billingDay - Día del mes (1-28)
   * @returns {boolean} True si es válido
   */
  static isValidBillingDay(billingDay) {
    const limits = billingConfig.VALIDATION_LIMITS;
    return billingDay >= limits.MIN_BILLING_DAY && billingDay <= limits.MAX_BILLING_DAY;
  }

  /**
   * Obtiene el estado de facturación de un cliente
   * @param {Object} client - Cliente con facturación
   * @param {Array} invoices - Facturas del cliente
   * @returns {Object} Estado de facturación
   */
  static getClientBillingStatus(client, invoices) {
    const currentDate = new Date();
    const billingPeriod = this.getCurrentBillingPeriod(client.ClientBilling.billingDay, currentDate);
    
    // Buscar factura del período actual
    const currentInvoice = invoices.find(invoice => 
      this.isDateInRange(invoice.billingPeriodStart, billingPeriod.startDate, billingPeriod.endDate)
    );
    
    let status = 'unknown';
    let daysUntilDue = 0;
    let daysOverdue = 0;
    
    if (currentInvoice) {
      switch (currentInvoice.status) {
        case 'paid':
          status = 'current';
          break;
        case 'pending':
          if (this.isInvoiceOverdue(currentInvoice.dueDate)) {
            status = 'overdue';
            daysOverdue = this.getDaysOverdue(currentInvoice.dueDate);
          } else {
            status = 'pending';
            daysUntilDue = this.daysBetween(currentDate, currentInvoice.dueDate);
          }
          break;
        case 'overdue':
          status = 'overdue';
          daysOverdue = this.getDaysOverdue(currentInvoice.dueDate);
          break;
        case 'lost_revenue':
          status = 'lost';
          break;
      }
    } else {
      // No hay factura para el período actual
      status = 'no_invoice';
    }
    
    return {
      status,
      daysUntilDue,
      daysOverdue,
      currentInvoice,
      billingPeriod,
      nextBillingDate: this.getNextBillingDate(client.ClientBilling.billingDay)
    };
  }

  /**
   * Crea un log estructurado para auditoría
   * @param {string} action - Acción realizada
   * @param {Object} details - Detalles de la acción
   * @param {number} userId - ID del usuario (opcional)
   * @returns {Object} Log estructurado
   */
  static createAuditLog(action, details, userId = null) {
    return {
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      system: 'billing',
      version: '1.0'
    };
  }

}

module.exports = BillingUtils;