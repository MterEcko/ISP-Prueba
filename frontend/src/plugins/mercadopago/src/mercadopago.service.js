// backend/src/plugins/mercadopago/src/mercadopago.service.js
const mercadopago = require('mercadopago');
const crypto = require('crypto');
const logger = require('../../../utils/logger');

class MercadoPagoService {
  constructor() {
    this.version = '1.0.0';
    this.description = 'Plugin para procesamiento de pagos con MercadoPago';
    this.countries = ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY'];
    this.supportedMethods = ['credit_card', 'debit_card', 'pix', 'boleto', 'oxxo', 'spei'];
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
   * Inicializa el cliente de MercadoPago
   * @param {Object} config - Configuración del plugin
   * @returns {Promise<Object>} Cliente inicializado
   */
  async initialize(config) {
    try {
      logger.info('Inicializando plugin MercadoPago');

      // Validar configuración requerida
      this._validateConfig(config);

      this.config = config;

      // Configurar MercadoPago
      mercadopago.configure({
        access_token: config.accessToken,
        sandbox: config.sandbox === true
      });

      // Verificar credenciales
      const user = await mercadopago.users.get('me');
      
      if (!user.body || !user.body.id) {
        throw new Error('Credenciales de MercadoPago inválidas');
      }

      this.client = mercadopago;

      logger.info(`MercadoPago inicializado - Usuario: ${user.body.email} (${config.sandbox ? 'Sandbox' : 'Producción'})`);

      return this.client;

    } catch (error) {
      logger.error(`Error inicializando MercadoPago: ${error.message}`);
      throw new Error(`Error inicializando MercadoPago: ${error.message}`);
    }
  }

  /**
   * Procesa un pago
   * @param {Object} client - Cliente MercadoPago
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processPayment(client, paymentData) {
    try {
      logger.info(`Procesando pago MercadoPago: ${paymentData.reference}`);

      const {
        amount,
        currency,
        description,
        reference,
        customer,
        returnUrl,
        cancelUrl,
        paymentMethod,
        metadata
      } = paymentData;

      // Crear preferencia de pago
      const preferenceData = {
        items: [{
          title: description,
          unit_price: parseFloat(amount),
          quantity: 1,
          currency_id: currency || 'MXN'
        }],
        external_reference: reference,
        statement_descriptor: 'ISP-SISTEMA',
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        back_urls: {
          success: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          failure: cancelUrl || `${process.env.FRONTEND_URL}/payment/failed`,
          pending: returnUrl || `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: `${process.env.WEBHOOK_BASE_URL}/api/plugins/mercadopago/webhook`,
        payer: {
          name: customer.firstName,
          surname: customer.lastName,
          email: customer.email,
          phone: {
            area_code: this._extractAreaCode(customer.phone),
            number: this._extractPhoneNumber(customer.phone)
          },
          identification: {
            type: metadata.identificationType || 'RFC',
            number: metadata.identificationNumber || '00000000000'
          },
          address: {
            street_name: metadata.address || 'Sin dirección',
            street_number: metadata.streetNumber || '0',
            zip_code: metadata.zipCode || '00000'
          }
        },
        payment_methods: {
          excluded_payment_methods: this._getExcludedMethods(paymentMethod),
          excluded_payment_types: this._getExcludedTypes(paymentMethod),
          installments: paymentMethod === 'credit_card' ? 12 : 1
        },
        shipments: {
          mode: 'not_specified'
        },
        metadata: {
          client_id: customer.id,
          invoice_id: metadata.invoiceId,
          system: 'isp-sistema',
          version: this.version
        }
      };

      // Crear preferencia
      const preference = await client.preferences.create(preferenceData);

      if (!preference.body || !preference.body.id) {
        throw new Error('Error creando preferencia de MercadoPago');
      }

      // Actualizar estadísticas
      this.statistics.totalProcessed++;
      this.statistics.lastTransaction = new Date();

      const result = {
        status: 'pending',
        response: {
          preferenceId: preference.body.id,
          initPoint: preference.body.init_point,
          sandboxInitPoint: preference.body.sandbox_init_point
        },
        paymentUrl: this.config.sandbox ? preference.body.sandbox_init_point : preference.body.init_point,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        instructions: this._getPaymentInstructions(paymentMethod, currency)
      };

      logger.info(`Pago MercadoPago creado - Preferencia: ${preference.body.id}`);

      return result;

    } catch (error) {
      this.statistics.totalFailed++;
      logger.error(`Error procesando pago MercadoPago: ${error.message}`);
      throw new Error(`Error procesando pago: ${error.message}`);
    }
  }

  /**
   * Procesa webhook de MercadoPago
   * @param {Object} client - Cliente MercadoPago
   * @param {Object} webhookData - Datos del webhook
   * @returns {Promise<Object>} Información del pago
   */
  async processWebhook(client, webhookData) {
    try {
      logger.info(`Procesando webhook MercadoPago: ${JSON.stringify(webhookData)}`);

      // MercadoPago envía diferentes tipos de notificaciones
      if (webhookData.type !== 'payment') {
        logger.info(`Tipo de webhook ignorado: ${webhookData.type}`);
        return null;
      }

      const paymentId = webhookData.data?.id;
      if (!paymentId) {
        logger.warn('Webhook sin ID de pago');
        return null;
      }

      // Obtener información del pago
      const payment = await client.payment.findById(paymentId);

      if (!payment.body) {
        logger.warn(`Pago ${paymentId} no encontrado en MercadoPago`);
        return null;
      }

      const paymentInfo = payment.body;

      // Verificar que tenga referencia externa
      if (!paymentInfo.external_reference) {
        logger.warn(`Pago ${paymentId} sin referencia externa`);
        return null;
      }

      const result = {
        reference: paymentInfo.external_reference,
        status: this._mapMercadoPagoStatus(paymentInfo.status),
        paymentDate: paymentInfo.date_approved || paymentInfo.date_created,
        gatewayPaymentId: paymentInfo.id,
        amount: paymentInfo.transaction_amount,
        currency: paymentInfo.currency_id,
        paymentMethod: paymentInfo.payment_method_id,
        paymentType: paymentInfo.payment_type_id,
        fullResponse: paymentInfo
      };

      // Actualizar estadísticas según el estado
      if (result.status === 'completed') {
        this.statistics.totalSuccess++;
      } else if (result.status === 'failed') {
        this.statistics.totalFailed++;
      }

      logger.info(`Webhook MercadoPago procesado - Pago: ${paymentInfo.id}, Estado: ${result.status}`);

      return result;

    } catch (error) {
      logger.error(`Error procesando webhook MercadoPago: ${error.message}`);
      throw new Error(`Error procesando webhook: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado actual de un pago
   * @param {Object} client - Cliente MercadoPago
   * @param {string} reference - Referencia del pago
   * @returns {Promise<string>} Estado del pago
   */
  async getPaymentStatus(client, reference) {
    try {
      logger.info(`Consultando estado de pago MercadoPago: ${reference}`);

      // Buscar pagos por referencia externa
      const searchResult = await client.payment.search({
        external_reference: reference
      });

      if (!searchResult.body || !searchResult.body.results || searchResult.body.results.length === 0) {
        logger.warn(`No se encontraron pagos para referencia: ${reference}`);
        return 'pending';
      }

      // Tomar el último pago (más reciente)
      const latestPayment = searchResult.body.results[0];
      const status = this._mapMercadoPagoStatus(latestPayment.status);

      logger.info(`Estado MercadoPago para ${reference}: ${status}`);

      return status;

    } catch (error) {
      logger.error(`Error consultando estado MercadoPago: ${error.message}`);
      return 'pending';
    }
  }

  /**
   * Verifica la firma de un webhook
   * @param {Object} data - Datos del webhook
   * @param {string} signature - Firma del webhook
   * @param {string} secret - Secreto del webhook
   * @returns {boolean} Resultado de la verificación
   */
  async verifyWebhookSignature(data, signature, secret) {
    try {
      // MercadoPago usa x-signature header
      if (!signature || !secret) {
        logger.warn('Verificación de firma MercadoPago: falta signature o secret');
        return true; // Permitir si no está configurado
      }

      // Extraer timestamp y hash de la firma
      const parts = signature.split(',');
      let ts, hash;

      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') hash = value;
      }

      if (!ts || !hash) {
        logger.warn('Firma MercadoPago malformada');
        return false;
      }

      // Crear payload para verificación
      const payload = `id:${data.data?.id};request-id:${data.data?.id};ts:${ts};`;
      
      // Generar hash esperado
      const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = hash === expectedHash;

      if (!isValid) {
        logger.warn(`Firma MercadoPago inválida - Esperado: ${expectedHash}, Recibido: ${hash}`);
      }

      return isValid;

    } catch (error) {
      logger.error(`Error verificando firma MercadoPago: ${error.message}`);
      return false;
    }
  }

  /**
   * Reembolsa un pago
   * @param {Object} client - Cliente MercadoPago
   * @param {string} paymentId - ID del pago en MercadoPago
   * @param {number} amount - Monto a reembolsar (opcional, reembolso total por defecto)
   * @returns {Promise<Object>} Resultado del reembolso
   */
  async refundPayment(client, paymentId, amount = null) {
    try {
      logger.info(`Iniciando reembolso MercadoPago - Pago: ${paymentId}`);

      const refundData = {};
      if (amount) {
        refundData.amount = parseFloat(amount);
      }

      const refund = await client.payment.refund(paymentId, refundData);

      if (!refund.body) {
        throw new Error('Error creando reembolso en MercadoPago');
      }

      logger.info(`Reembolso MercadoPago creado - ID: ${refund.body.id}`);

      // Actualizar estadísticas
      this.statistics.totalRefunds++;

      return {
        success: true,
        refundId: refund.body.id,
        status: refund.body.status,
        amount: refund.body.amount,
        response: refund.body
      };

    } catch (error) {
      logger.error(`Error creando reembolso MercadoPago: ${error.message}`);
      throw new Error(`Error creando reembolso: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas del servicio
   * @returns {Promise<Object>} Estadísticas
   */
  async getStatistics() {
    return {
      ...this.statistics,
      provider: 'mercadopago',
      version: this.version,
      lastInitialized: this.config ? new Date() : null,
      environment: this.config?.sandbox ? 'sandbox' : 'production'
    };
  }

  /**
   * Limpiar recursos del servicio
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.client = null;
    this.config = null;
    logger.info('MercadoPago service limpiado');
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Valida la configuración del plugin
   * @private
   */
  _validateConfig(config) {
    const required = ['accessToken'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuración MercadoPago incompleta. Faltan: ${missing.join(', ')}`);
    }

    // Validar formato del access token
    if (!config.accessToken.startsWith('APP_USR-') && !config.accessToken.startsWith('TEST-')) {
      throw new Error('Access token de MercadoPago inválido');
    }
  }

  /**
   * Mapea estados de MercadoPago a estados internos
   * @private
   */
  _mapMercadoPagoStatus(status) {
    const statusMap = {
      'approved': 'completed',
      'pending': 'pending',
      'authorized': 'processing',
      'in_process': 'processing',
      'in_mediation': 'processing',
      'rejected': 'failed',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
      'charged_back': 'chargeback'
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Extrae código de área del teléfono
   * @private
   */
  _extractAreaCode(phone) {
    if (!phone) return '';
    
    // Para México, extraer primeros 2-3 dígitos
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      return cleanPhone.substring(0, 2);
    }
    return '';
  }

  /**
   * Extrae número de teléfono sin código de área
   * @private
   */
  _extractPhoneNumber(phone) {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      return cleanPhone.substring(2);
    }
    return cleanPhone;
  }

  /**
   * Obtiene métodos de pago excluidos
   * @private
   */
  _getExcludedMethods(paymentMethod) {
    if (!paymentMethod || paymentMethod === 'all') {
      return [];
    }

    const allMethods = ['visa', 'mastercard', 'amex', 'oxxo', 'spei', 'bancomer', 'banamex'];
    
    switch (paymentMethod) {
      case 'credit_card':
        return allMethods.filter(method => !['visa', 'mastercard', 'amex'].includes(method));
      case 'oxxo':
        return allMethods.filter(method => method !== 'oxxo');
      case 'spei':
        return allMethods.filter(method => method !== 'spei');
      default:
        return [];
    }
  }

  /**
   * Obtiene tipos de pago excluidos
   * @private
   */
  _getExcludedTypes(paymentMethod) {
    if (!paymentMethod || paymentMethod === 'all') {
      return [];
    }

    switch (paymentMethod) {
      case 'credit_card':
        return ['ticket', 'bank_transfer', 'account_money'];
      case 'oxxo':
        return ['credit_card', 'debit_card', 'bank_transfer', 'account_money'];
      case 'spei':
        return ['credit_card', 'debit_card', 'ticket', 'account_money'];
      default:
        return [];
    }
  }

  /**
   * Obtiene instrucciones de pago según el método
   * @private
   */
  _getPaymentInstructions(paymentMethod, currency) {
    const currencySymbol = currency === 'MXN' ? '$' : currency;

    switch (paymentMethod) {
      case 'oxxo':
        return [
          'Dirígete a cualquier tienda OXXO',
          'Proporciona el número de referencia en caja',
          'Realiza el pago en efectivo',
          'Conserva tu comprobante de pago'
        ];
      case 'spei':
        return [
          'Ingresa a tu banca en línea',
          'Realiza una transferencia SPEI',
          'Usa los datos bancarios proporcionados',
          'El pago se procesará en minutos'
        ];
      case 'credit_card':
        return [
          'Completa los datos de tu tarjeta',
          'Verifica que los datos sean correctos',
          'El cargo aparecerá como "ISP-SISTEMA"',
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
}

module.exports = new MercadoPagoService();