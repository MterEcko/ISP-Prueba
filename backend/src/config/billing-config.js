// backend/src/config/billing-config.js
// Configuración del Sistema de Facturación

module.exports = {
  
  // ========================================
  // CONFIGURACIÓN PRINCIPAL
  // ========================================
  
  /**
   * Principio fundamental del sistema
   */
  BILLING_PRINCIPLE: 'LA_CASA_NUNCA_PIERDE',
  
  /**
   * Límites de regalo automático
   */
  GIFT_LIMITS: {
    autoGiftDaysLimit: 2,        // Solo regalar 1-2 días máximo
    minimumChargeableDays: 3,    // Siempre cobrar si quedan 3+ días
    maxGiftDaysPerYear: 10       // Máximo de días regalados por cliente al año
  },
  
  /**
   * Configuración de días de gracia por defecto
   */
  GRACE_PERIODS: {
    defaultGraceDays: 5,         // Días de gracia estándar
    maximumGraceDays: 15,        // Máximo permitido
    minimumGraceDays: 0          // Mínimo permitido
  },
  
  /**
   * Configuración de facturación automática
   */
  AUTO_BILLING: {
    invoiceGenerationDays: 5,    // Crear factura 5 días antes del vencimiento
    reminderDays: [3, 1],        // Enviar recordatorios 3 y 1 días antes
    suspensionCheckTime: '17:00', // Hora para verificar suspensiones diarias
    invoicePrefix: 'INV',        // Prefijo para números de factura
    paymentPrefix: 'PAY'         // Prefijo para números de pago
  },
  
  /**
   * Tipos de notificaciones del sistema
   */
  NOTIFICATION_TYPES: {
    // Requieren acción del operador
    BILLING_ADJUSTMENT_PENDING: {
      type: 'billing_adjustment_pending',
      priority: 'medium',
      category: 'billing',
      actionRequired: true,
      autoExpire: false,
      template: 'adjustment_required'
    },
    
    // Solo informativos
    PAYMENT_APPLIED_NEXT_MONTH: {
      type: 'payment_applied_next_month',
      priority: 'low',
      category: 'billing',
      actionRequired: false,
      autoExpire: true,
      expireDays: 7,
      template: 'payment_next_month'
    },
    
    LOST_REVENUE: {
      type: 'lost_revenue',
      priority: 'low',
      category: 'financial',
      actionRequired: false,
      autoExpire: true,
      expireDays: 30,
      template: 'lost_revenue'
    },
    
    SERVICE_SUSPENDED: {
      type: 'service_suspended',
      priority: 'high',
      category: 'service',
      actionRequired: false,
      autoExpire: false,
      template: 'service_suspended'
    },
    
    PAYMENT_REMINDER: {
      type: 'payment_reminder',
      priority: 'medium',
      category: 'reminder',
      actionRequired: false,
      autoExpire: true,
      expireDays: 3,
      template: 'payment_reminder'
    }
  },
  
  /**
   * Configuración de métodos de pago
   */
  PAYMENT_METHODS: {
    CASH: { id: 'cash', name: 'Efectivo', requiresReference: false },
    TRANSFER: { id: 'transfer', name: 'Transferencia', requiresReference: true },
    CARD: { id: 'card', name: 'Tarjeta', requiresReference: true },
    DEPOSIT: { id: 'deposit', name: 'Depósito', requiresReference: true },
    ONLINE: { id: 'online', name: 'Pago en línea', requiresReference: true }
  },
  
  /**
   * Estados de factura
   */
  INVOICE_STATUSES: {
    PENDING: 'pending',           // Pendiente de pago
    PAID: 'paid',                // Pagada completamente
    PARTIAL_PAID: 'partial_paid', // Pago parcial recibido
    OVERDUE: 'overdue',          // Vencida
    LOST_REVENUE: 'lost_revenue', // Pérdida - no pagada
    CANCELLED: 'cancelled'        // Cancelada
  },
  
  /**
   * Estados de servicio
   */
  SERVICE_STATUSES: {
    ACTIVE: 'active',             // Servicio activo
    SUSPENDED: 'suspended',       // Suspendido por falta de pago
    GRACE_PERIOD: 'grace_period', // En período de gracia
    CANCELLED: 'cancelled',       // Cancelado definitivamente
    PAUSED: 'paused'             // Pausado temporalmente
  },
  
  /**
   * Configuración de reportes
   */
  REPORTS: {
    COLLECTION_EFFICIENCY: {
      name: 'Eficiencia de Cobranza',
      description: 'Porcentaje de facturas cobradas vs emitidas',
      calculation: 'paid_invoices / total_invoices * 100'
    },
    LOST_REVENUE: {
      name: 'Ingresos Perdidos',
      description: 'Facturas marcadas como pérdida',
      calculation: 'sum(lost_revenue_invoices)'
    },
    GIFT_DAYS: {
      name: 'Días Regalados',
      description: 'Total de días cortesía por período',
      calculation: 'sum(gift_days_by_period)'
    },
    LATE_PAYMENT_REVENUE: {
      name: 'Ingresos por Pagos Tardíos',
      description: 'Dinero extra cobrado por retrasos',
      calculation: 'sum(proportional_adjustments)'
    }
  },
  
  /**
   * Plantillas de mensajes automáticos
   */
  MESSAGE_TEMPLATES: {
    ADJUSTMENT_REQUIRED: {
      title: '⚠️ AJUSTE REQUERIDO - {clientName}',
      message: 'Cliente reactivado por {daysRemaining} días. Requiere ajuste de ${adjustmentAmount} en próxima factura.',
      priority: 'medium'
    },
    
    PAYMENT_NEXT_MONTH: {
      title: 'Pago aplicado al siguiente período - {clientName}',
      message: 'Pago de ${paymentAmount} aplicado al siguiente período. {giftDays} días de cortesía.',
      priority: 'low'
    },
    
    SERVICE_SUSPENDED: {
      title: '🚫 SERVICIO SUSPENDIDO - {clientName}',
      message: 'Servicio suspendido por falta de pago. Factura vencida desde {daysOverdue} días.',
      priority: 'high'
    },
    
    PAYMENT_REMINDER: {
      title: '📅 Recordatorio de Pago - {clientName}',
      message: 'Su factura de ${invoiceAmount} vence en {daysUntilDue} días.',
      priority: 'medium'
    }
  },
  
  /**
   * Configuración de cálculos financieros
   */
  FINANCIAL_CALCULATIONS: {
    // Asumir meses de 30 días para cálculos proporcionales
    DAYS_PER_MONTH: 30,
    
    // Redondeo de montos (2 decimales)
    CURRENCY_DECIMALS: 2,
    
    // Moneda por defecto
    DEFAULT_CURRENCY: 'MXN',
    
    // Configuración de impuestos
    TAX_RATE: 0.16, // IVA 16% México
    INCLUDE_TAX: true
  },
  
  /**
   * Configuración de integración con Mikrotik
   */
  MIKROTIK_INTEGRATION: {
    ENABLE_AUTO_SUSPENSION: true,     // Suspender PPPoE automáticamente
    ENABLE_AUTO_REACTIVATION: true,   // Reactivar PPPoE automáticamente
    SUSPENSION_PROFILE: 'suspended',  // Perfil para clientes suspendidos
    DEFAULT_PROFILE: 'default',       // Perfil por defecto
    CONNECTION_TIMEOUT: 10000,        // Timeout de conexión en ms
    RETRY_ATTEMPTS: 3                 // Intentos de reconexión
  },
  
  /**
   * Configuración de logs y auditoría
   */
  LOGGING: {
    ENABLE_BILLING_LOGS: true,
    LOG_LEVEL: 'info', // debug, info, warn, error
    LOG_FILE_PATH: './logs/billing.log',
    ROTATE_LOGS: true,
    MAX_LOG_SIZE: '10MB',
    MAX_LOG_FILES: 30
  },
  
  /**
   * Configuración de desarrollo vs producción
   */
  ENVIRONMENT: {
    DEVELOPMENT: {
      ENABLE_FAKE_PAYMENTS: true,      // Permitir pagos de prueba
      SKIP_MIKROTIK_CALLS: true,       // No llamar Mikrotik en desarrollo
      MOCK_NOTIFICATIONS: true,        // Solo log notificaciones
      DEBUG_MODE: true
    },
    
    PRODUCTION: {
      ENABLE_FAKE_PAYMENTS: false,
      SKIP_MIKROTIK_CALLS: false,
      MOCK_NOTIFICATIONS: false,
      DEBUG_MODE: false,
      REQUIRE_PAYMENT_APPROVAL: true   // Requiere aprobación manual de pagos grandes
    }
  },
  
  /**
   * Límites y validaciones
   */
  VALIDATION_LIMITS: {
    MIN_PAYMENT_AMOUNT: 1,           // Pago mínimo $1
    MAX_PAYMENT_AMOUNT: 50000,       // Pago máximo $50,000
    MIN_MONTHLY_FEE: 100,            // Tarifa mínima mensual
    MAX_MONTHLY_FEE: 10000,          // Tarifa máxima mensual
    MAX_GRACE_DAYS_OVERRIDE: 30,     // Máximo de días de gracia en casos especiales
    MIN_BILLING_DAY: 1,              // Día mínimo de facturación
    MAX_BILLING_DAY: 28              // Día máximo de facturación (evitar problemas con febrero)
  },
  
  /**
   * Configuración de jobs/crons
   */
  SCHEDULED_JOBS: {
    DAILY_BILLING: {
      schedule: '26 15 * * *',          // Todos los días a las 9:00 AM
      timezone: 'America/Mexico_City',
      enabled: true,
      description: 'Procesamiento diario de facturación'
    },
    
    INVOICE_GENERATION: {
      schedule: '30 16 * * *',         // Todos los días a las 10:00 AM
      timezone: 'America/Mexico_City',
      enabled: true,
      description: 'Generación automática de facturas'
    },
    
    PAYMENT_REMINDERS: {
      schedule: '30 17 * * *',         // Todos los días a las 11:00 AM
      timezone: 'America/Mexico_City',
      enabled: true,
      description: 'Envío de recordatorios de pago'
    },
    
    SERVICE_SUSPENSION: {
      schedule: '29 18 * * *',         // Todos los días a las 12:00 PM
      timezone: 'America/Mexico_City',
      enabled: true,
      description: 'Suspensión automática de servicios vencidos'
    }
  },
  
  /**
   * Configuración de notificaciones por canal
   */
  NOTIFICATION_CHANNELS: {
    EMAIL: {
      enabled: true,
      priority: ['high', 'medium', 'low'],
      template_format: 'html'
    },
    
    WHATSAPP: {
      enabled: true,
      priority: ['high', 'medium'],
      template_format: 'text',
      character_limit: 1000
    },
    
    TELEGRAM: {
      enabled: true,
      priority: ['high'],
      template_format: 'markdown',
      channel_type: 'bot'
    },
    
    SYSTEM: {
      enabled: true,
      priority: ['high', 'medium', 'low'],
      template_format: 'json'
    }
  },
  
  /**
   * Configuración de cache
   */
  CACHE: {
    BILLING_CALCULATIONS: {
      ttl: 3600,                      // 1 hora
      key_prefix: 'billing_calc_'
    },
    
    CLIENT_DATA: {
      ttl: 1800,                      // 30 minutos
      key_prefix: 'client_data_'
    },
    
    INVOICE_DATA: {
      ttl: 7200,                      // 2 horas
      key_prefix: 'invoice_data_'
    }
  }
  
};

/**
 * Función helper para obtener configuración por ambiente
 */
function getConfig(environment = 'development') {
  const config = module.exports;
  const envConfig = config.ENVIRONMENT[environment.toUpperCase()] || config.ENVIRONMENT.DEVELOPMENT;
  
  return {
    ...config,
    current_environment: environment,
    ...envConfig
  };
}

module.exports.getConfig = getConfig;