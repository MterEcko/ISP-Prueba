// backend/src/plugins/stripe/src/stripe.service.js
const Stripe = require('stripe');
const logger = require('../../../utils/logger');

class StripeService {
  constructor() {
    this.version = '1.0.0';
    this.description = 'Plugin para procesamiento de pagos con Stripe';
    this.countries = ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY', 'GB', 'EU'];
    this.supportedMethods = ['card', 'oxxo', 'spei', 'boleto', 'ach', 'sepa_debit'];
    this.client = null;
    this.config = null;
    this.statistics = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      lastTransaction: null,
      totalRefunds: 0
    };
  }

  /**
   * Inicializa el cliente de Stripe
   * @param {Object} config - Configuración del plugin
   * @returns {Promise<Object>} Cliente inicializado
   */
  async initialize(config) {
    try {
      logger.info('Inicializando plugin Stripe');

      // Validar configuración requerida
      this._validateConfig(config);

      this.config = config;

      // Inicializar cliente Stripe
      this.client = new Stripe(config.secretKey, {
        apiVersion: '2023-10-16',
        typescript: false
      });

      // Verificar credenciales
      const account = await this.client.account.retrieve();

      if (!account || !account.id) {
        throw new Error('Credenciales de Stripe inválidas');
      }

      logger.info(`Stripe inicializado - Cuenta: ${account.email || account.id} (${config.testMode ? 'Test' : 'Live'})`);

      return this.client;

    } catch (error) {
      logger.error(`Error inicializando Stripe: ${error.message}`);
      throw new Error(`Error inicializando Stripe: ${error.message}`);
    }
  }

  /**
   * Procesa un pago
   * @param {Object} client - Cliente Stripe
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processPayment(client, paymentData) {
    try {
      logger.info(`Procesando pago Stripe: ${paymentData.reference}`);

      const {
        amount,
        currency,
        description,
        reference,
        customer,
        returnUrl,
        paymentMethod,
        metadata
      } = paymentData;

      // Convertir a centavos (Stripe trabaja en centavos)
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // Crear Payment Intent
      const paymentIntentData = {
        amount: amountInCents,
        currency: (currency || this.config.currency).toLowerCase(),
        description: description,
        metadata: {
          client_id: customer.id,
          invoice_id: metadata.invoiceId,
          reference: reference,
          system: 'isp-sistema',
          version: this.version
        },
        statement_descriptor: this.config.statementDescriptor || 'ISP SISTEMA',
        capture_method: this.config.captureMethod || 'automatic'
      };

      // Configurar métodos de pago según el tipo
      if (paymentMethod && paymentMethod !== 'card') {
        paymentIntentData.payment_method_types = [paymentMethod];
      } else {
        paymentIntentData.automatic_payment_methods = {
          enabled: true
        };
      }

      // Añadir datos del cliente si existen
      if (customer.email) {
        paymentIntentData.receipt_email = customer.email;
      }

      // Para métodos que requieren confirmación
      if (['oxxo', 'spei', 'boleto'].includes(paymentMethod)) {
        paymentIntentData.confirm = false;
        paymentIntentData.payment_method_options = this._getPaymentMethodOptions(paymentMethod, returnUrl);
      }

      const paymentIntent = await client.paymentIntents.create(paymentIntentData);

      if (!paymentIntent || !paymentIntent.id) {
        throw new Error('Error creando Payment Intent en Stripe');
      }

      // Actualizar estadísticas
      this.statistics.totalProcessed++;
      this.statistics.lastTransaction = new Date();

      const result = {
        status: this._mapStripeStatus(paymentIntent.status),
        response: {
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status
        },
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        publicKey: this.config.publicKey,
        instructions: this._getPaymentInstructions(paymentMethod, currency),
        nextAction: paymentIntent.next_action
      };

      // Para OXXO y similares, incluir detalles adicionales
      if (paymentIntent.next_action?.oxxo_display_details) {
        result.voucher = {
          number: paymentIntent.next_action.oxxo_display_details.number,
          expiresAt: paymentIntent.next_action.oxxo_display_details.expires_after,
          hostedUrl: paymentIntent.next_action.oxxo_display_details.hosted_voucher_url
        };
      }

      logger.info(`Pago Stripe creado - Payment Intent: ${paymentIntent.id}`);

      return result;

    } catch (error) {
      this.statistics.totalFailed++;
      logger.error(`Error procesando pago Stripe: ${error.message}`);
      throw new Error(`Error procesando pago: ${error.message}`);
    }
  }

  /**
   * Procesa webhook de Stripe
   * @param {Object} client - Cliente Stripe
   * @param {Object} webhookData - Datos del webhook
   * @param {string} signature - Firma del webhook
   * @returns {Promise<Object>} Información del pago
   */
  async processWebhook(client, webhookData, signature) {
    try {
      logger.info(`Procesando webhook Stripe: ${webhookData.type}`);

      let event = webhookData;

      // Verificar firma si hay webhook secret configurado
      if (this.config.webhookSecret && signature) {
        try {
          event = client.webhooks.constructEvent(
            JSON.stringify(webhookData),
            signature,
            this.config.webhookSecret
          );
        } catch (err) {
          logger.error(`Error verificando firma de webhook Stripe: ${err.message}`);
          throw new Error('Firma de webhook inválida');
        }
      }

      // Procesar según el tipo de evento
      let result = null;

      switch (event.type) {
        case 'payment_intent.succeeded':
          result = await this._handlePaymentSuccess(event.data.object);
          this.statistics.totalSuccess++;
          break;

        case 'payment_intent.payment_failed':
          result = await this._handlePaymentFailed(event.data.object);
          this.statistics.totalFailed++;
          break;

        case 'charge.refunded':
          result = await this._handleRefund(event.data.object);
          this.statistics.totalRefunds++;
          break;

        case 'payment_intent.canceled':
          result = await this._handlePaymentCanceled(event.data.object);
          break;

        default:
          logger.info(`Tipo de webhook Stripe no manejado: ${event.type}`);
          return null;
      }

      logger.info(`Webhook Stripe procesado - Tipo: ${event.type}`);

      return result;

    } catch (error) {
      logger.error(`Error procesando webhook Stripe: ${error.message}`);
      throw new Error(`Error procesando webhook: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado actual de un pago
   * @param {Object} client - Cliente Stripe
   * @param {string} paymentIntentId - ID del Payment Intent
   * @returns {Promise<string>} Estado del pago
   */
  async getPaymentStatus(client, paymentIntentId) {
    try {
      logger.info(`Consultando estado de pago Stripe: ${paymentIntentId}`);

      const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        logger.warn(`Payment Intent ${paymentIntentId} no encontrado`);
        return 'pending';
      }

      const status = this._mapStripeStatus(paymentIntent.status);

      logger.info(`Estado Stripe para ${paymentIntentId}: ${status}`);

      return status;

    } catch (error) {
      logger.error(`Error consultando estado Stripe: ${error.message}`);
      return 'pending';
    }
  }

  /**
   * Verifica la firma de un webhook
   * @param {string} payload - Payload del webhook
   * @param {string} signature - Firma del webhook
   * @param {string} secret - Secreto del webhook
   * @returns {boolean} Resultado de la verificación
   */
  async verifyWebhookSignature(payload, signature, secret) {
    try {
      if (!signature || !secret) {
        logger.warn('Verificación de firma Stripe: falta signature o secret');
        return true; // Permitir si no está configurado
      }

      this.client.webhooks.constructEvent(payload, signature, secret);
      return true;

    } catch (error) {
      logger.error(`Error verificando firma Stripe: ${error.message}`);
      return false;
    }
  }

  /**
   * Reembolsa un pago
   * @param {Object} client - Cliente Stripe
   * @param {string} paymentIntentId - ID del Payment Intent
   * @param {number} amount - Monto a reembolsar (opcional, reembolso total por defecto)
   * @returns {Promise<Object>} Resultado del reembolso
   */
  async refundPayment(client, paymentIntentId, amount = null) {
    try {
      logger.info(`Iniciando reembolso Stripe - Payment Intent: ${paymentIntentId}`);

      const refundData = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(parseFloat(amount) * 100);
      }

      const refund = await client.refunds.create(refundData);

      if (!refund || !refund.id) {
        throw new Error('Error creando reembolso en Stripe');
      }

      logger.info(`Reembolso Stripe creado - ID: ${refund.id}`);

      // Actualizar estadísticas
      this.statistics.totalRefunds++;

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        response: refund
      };

    } catch (error) {
      logger.error(`Error creando reembolso Stripe: ${error.message}`);
      throw new Error(`Error creando reembolso: ${error.message}`);
    }
  }

  /**
   * Cancela un Payment Intent
   * @param {Object} client - Cliente Stripe
   * @param {string} paymentIntentId - ID del Payment Intent
   * @returns {Promise<Object>} Resultado de la cancelación
   */
  async cancelPayment(client, paymentIntentId) {
    try {
      logger.info(`Cancelando Payment Intent Stripe: ${paymentIntentId}`);

      const paymentIntent = await client.paymentIntents.cancel(paymentIntentId);

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };

    } catch (error) {
      logger.error(`Error cancelando Payment Intent Stripe: ${error.message}`);
      throw new Error(`Error cancelando pago: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas del servicio
   * @returns {Promise<Object>} Estadísticas
   */
  async getStatistics() {
    return {
      ...this.statistics,
      provider: 'stripe',
      version: this.version,
      lastInitialized: this.config ? new Date() : null,
      environment: this.config?.testMode ? 'test' : 'live'
    };
  }

  /**
   * Limpiar recursos del servicio
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.client = null;
    this.config = null;
    logger.info('Stripe service limpiado');
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Valida la configuración del plugin
   * @private
   */
  _validateConfig(config) {
    const required = ['publicKey', 'secretKey', 'currency', 'country'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuración Stripe incompleta. Faltan: ${missing.join(', ')}`);
    }

    // Validar formato de las claves
    if (!config.publicKey.startsWith('pk_')) {
      throw new Error('Public key de Stripe inválida');
    }

    if (!config.secretKey.startsWith('sk_')) {
      throw new Error('Secret key de Stripe inválida');
    }

    // Validar consistencia entre testMode y las claves
    const isTestKey = config.secretKey.startsWith('sk_test_');
    if (config.testMode && !isTestKey) {
      logger.warn('testMode está activado pero se está usando una clave de producción');
    }
  }

  /**
   * Mapea estados de Stripe a estados internos
   * @private
   */
  _mapStripeStatus(status) {
    const statusMap = {
      'succeeded': 'completed',
      'processing': 'processing',
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'requires_capture': 'processing',
      'canceled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Obtiene opciones específicas del método de pago
   * @private
   */
  _getPaymentMethodOptions(paymentMethod, returnUrl) {
    const options = {};

    switch (paymentMethod) {
      case 'oxxo':
        options.oxxo = {
          expires_after_days: 3
        };
        break;

      case 'boleto':
        options.boleto = {
          expires_after_days: 3
        };
        break;

      case 'spei':
        options.spei = {
          expires_after_hours: 24
        };
        break;
    }

    return options;
  }

  /**
   * Obtiene instrucciones de pago según el método
   * @private
   */
  _getPaymentInstructions(paymentMethod, currency) {
    switch (paymentMethod) {
      case 'oxxo':
        return [
          'Dirígete a cualquier tienda OXXO',
          'Proporciona el número de referencia en caja',
          'Realiza el pago en efectivo',
          'Conserva tu comprobante de pago',
          'El voucher es válido por 3 días'
        ];

      case 'spei':
        return [
          'Ingresa a tu banca en línea',
          'Realiza una transferencia SPEI',
          'Usa los datos bancarios proporcionados',
          'El pago se procesará automáticamente',
          'Válido por 24 horas'
        ];

      case 'boleto':
        return [
          'Descarga o imprime tu boleto bancário',
          'Paga en cualquier banco o lotérica',
          'También puedes pagar por internet banking',
          'El boleto es válido por 3 días'
        ];

      case 'card':
        return [
          'Completa los datos de tu tarjeta',
          'Verifica que la información sea correcta',
          'El cargo se procesará de inmediato',
          'Recibirás confirmación por email'
        ];

      default:
        return [
          'Sigue las instrucciones en pantalla',
          'Completa el proceso de pago',
          'Conserva tu comprobante',
          'Recibirás confirmación por email'
        ];
    }
  }

  /**
   * Maneja evento de pago exitoso
   * @private
   */
  async _handlePaymentSuccess(paymentIntent) {
    return {
      reference: paymentIntent.metadata.reference,
      status: 'completed',
      paymentDate: new Date(paymentIntent.created * 1000),
      gatewayPaymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      paymentMethod: paymentIntent.payment_method_types[0],
      fullResponse: paymentIntent
    };
  }

  /**
   * Maneja evento de pago fallido
   * @private
   */
  async _handlePaymentFailed(paymentIntent) {
    return {
      reference: paymentIntent.metadata.reference,
      status: 'failed',
      gatewayPaymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      errorMessage: paymentIntent.last_payment_error?.message || 'Pago fallido',
      fullResponse: paymentIntent
    };
  }

  /**
   * Maneja evento de reembolso
   * @private
   */
  async _handleRefund(charge) {
    return {
      reference: charge.metadata.reference,
      status: 'refunded',
      gatewayPaymentId: charge.payment_intent,
      refundId: charge.refunds.data[0]?.id,
      amount: charge.amount_refunded / 100,
      currency: charge.currency.toUpperCase(),
      fullResponse: charge
    };
  }

  /**
   * Maneja evento de pago cancelado
   * @private
   */
  async _handlePaymentCanceled(paymentIntent) {
    return {
      reference: paymentIntent.metadata.reference,
      status: 'cancelled',
      gatewayPaymentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      fullResponse: paymentIntent
    };
  }
}

module.exports = new StripeService();
