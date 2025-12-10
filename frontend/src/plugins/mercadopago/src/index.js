const mercadopago = require('mercadopago');
const crypto = require('crypto');

class MercadoPagoPlugin {
  constructor() {
    this.name = 'mercadopago';
    this.version = '1.0.0';
    this.description = 'Plugin para procesamiento de pagos con MercadoPago';
    this.client = null;
    this.config = null;
    this.isInitialized = false;
    this.statistics = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      lastTransaction: null,
      totalRefunds: 0
    };
  }

  async onActivate(config) {
    try {
      console.log('Activando plugin MercadoPago');

      this._validateConfig(config);
      this.config = config;

      mercadopago.configure({
        access_token: config.accessToken,
        sandbox: config.sandbox === true
      });

      const user = await mercadopago.users.get('me');

      if (!user.body || !user.body.id) {
        throw new Error('Credenciales de MercadoPago invalidas');
      }

      this.client = mercadopago;
      this.isInitialized = true;

      console.log(`MercadoPago activado - Usuario: ${user.body.email} (${config.sandbox ? 'Sandbox' : 'Produccion'})`);

      return {
        success: true,
        accountInfo: {
          email: user.body.email,
          nickname: user.body.nickname
        }
      };

    } catch (error) {
      console.error(`Error activando MercadoPago: ${error.message}`);
      this.isInitialized = false;
      throw error;
    }
  }

  async onDeactivate() {
    try {
      console.log('Desactivando plugin MercadoPago');
      this.client = null;
      this.config = null;
      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      console.error(`Error desactivando MercadoPago: ${error.message}`);
      throw error;
    }
  }

  registerRoutes(router) {
    const controller = require('./controller');
    const routes = require('./routes');
    routes(router, controller, this);
    return router;
  }

  async createPayment(paymentData) {
    if (!this.isInitialized) {
      throw new Error('Plugin MercadoPago no inicializado');
    }

    try {
      console.log(`Creando pago MercadoPago: ${paymentData.reference}`);

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
        expiration_date_to: new Date(Date.now() + (this.config.expirationDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
        back_urls: {
          success: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          failure: cancelUrl || `${process.env.FRONTEND_URL}/payment/failed`,
          pending: returnUrl || `${process.env.FRONTEND_URL}/payment/pending`
        },
        auto_return: 'approved',
        notification_url: this.config.webhookUrl || `${process.env.BACKEND_URL}/api/plugins/mercadopago/webhook`,
        payer: {
          name: customer.firstName || customer.name,
          surname: customer.lastName || '',
          email: customer.email,
          phone: customer.phone ? {
            area_code: this._extractAreaCode(customer.phone),
            number: this._extractPhoneNumber(customer.phone)
          } : undefined,
          identification: metadata?.identificationType ? {
            type: metadata.identificationType,
            number: metadata.identificationNumber
          } : undefined
        },
        payment_methods: {
          excluded_payment_methods: this._getExcludedMethods(paymentMethod),
          excluded_payment_types: this._getExcludedTypes(paymentMethod),
          installments: paymentMethod === 'credit_card' ? 12 : 1
        },
        metadata: {
          client_id: customer.id,
          invoice_id: metadata?.invoiceId,
          system: 'isp-sistema',
          version: this.version
        }
      };

      const preference = await this.client.preferences.create(preferenceData);

      if (!preference.body || !preference.body.id) {
        throw new Error('Error creando preferencia de MercadoPago');
      }

      this.statistics.totalProcessed++;
      this.statistics.lastTransaction = new Date();

      return {
        status: 'pending',
        preferenceId: preference.body.id,
        paymentUrl: this.config.sandbox ? preference.body.sandbox_init_point : preference.body.init_point,
        expiresAt: new Date(Date.now() + (this.config.expirationDays || 7) * 24 * 60 * 60 * 1000).toISOString()
      };

    } catch (error) {
      this.statistics.totalFailed++;
      console.error(`Error creando pago MercadoPago: ${error.message}`);
      throw error;
    }
  }

  async processWebhook(webhookData) {
    try {
      console.log(`Procesando webhook MercadoPago`);

      if (webhookData.type !== 'payment') {
        return null;
      }

      const paymentId = webhookData.data?.id;
      if (!paymentId) {
        return null;
      }

      const payment = await this.client.payment.findById(paymentId);

      if (!payment.body || !payment.body.external_reference) {
        return null;
      }

      const paymentInfo = payment.body;

      const result = {
        reference: paymentInfo.external_reference,
        status: this._mapStatus(paymentInfo.status),
        paymentDate: paymentInfo.date_approved || paymentInfo.date_created,
        gatewayPaymentId: paymentInfo.id,
        amount: paymentInfo.transaction_amount,
        currency: paymentInfo.currency_id,
        paymentMethod: paymentInfo.payment_method_id,
        paymentType: paymentInfo.payment_type_id
      };

      if (result.status === 'completed') {
        this.statistics.totalSuccess++;
      } else if (result.status === 'failed') {
        this.statistics.totalFailed++;
      }

      return result;

    } catch (error) {
      console.error(`Error procesando webhook MercadoPago: ${error.message}`);
      throw error;
    }
  }

  async getPaymentStatus(reference) {
    try {
      const searchResult = await this.client.payment.search({
        external_reference: reference
      });

      if (!searchResult.body || !searchResult.body.results || searchResult.body.results.length === 0) {
        return 'pending';
      }

      const latestPayment = searchResult.body.results[0];
      return this._mapStatus(latestPayment.status);

    } catch (error) {
      console.error(`Error consultando estado MercadoPago: ${error.message}`);
      return 'pending';
    }
  }

  async refundPayment(paymentId, amount = null) {
    try {
      const refundData = amount ? { amount: parseFloat(amount) } : {};
      const refund = await this.client.payment.refund(paymentId, refundData);

      if (!refund.body) {
        throw new Error('Error creando reembolso en MercadoPago');
      }

      this.statistics.totalRefunds++;

      return {
        success: true,
        refundId: refund.body.id,
        status: refund.body.status,
        amount: refund.body.amount
      };

    } catch (error) {
      console.error(`Error creando reembolso MercadoPago: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      const user = await this.client.users.get('me');
      return {
        success: true,
        accountInfo: {
          email: user.body.email,
          nickname: user.body.nickname
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      accountInfo: this.config ? {
        country: this.config.country,
        sandbox: this.config.sandbox
      } : null,
      statistics: this.statistics
    };
  }

  _validateConfig(config) {
    const required = ['accessToken', 'country'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuracion MercadoPago incompleta. Faltan: ${missing.join(', ')}`);
    }

    if (!config.accessToken.startsWith('APP_USR-') && !config.accessToken.startsWith('TEST-')) {
      throw new Error('Access token de MercadoPago invalido');
    }
  }

  _mapStatus(status) {
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

  _extractAreaCode(phone) {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 ? cleanPhone.substring(0, 2) : '';
  }

  _extractPhoneNumber(phone) {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 ? cleanPhone.substring(2) : cleanPhone;
  }

  _getExcludedMethods(paymentMethod) {
    if (!paymentMethod || paymentMethod === 'all') return [];

    const allMethods = ['visa', 'mastercard', 'amex', 'oxxo', 'spei'];

    switch (paymentMethod) {
      case 'credit_card':
        return allMethods.filter(m => !['visa', 'mastercard', 'amex'].includes(m));
      case 'oxxo':
        return allMethods.filter(m => m !== 'oxxo');
      case 'spei':
        return allMethods.filter(m => m !== 'spei');
      default:
        return [];
    }
  }

  _getExcludedTypes(paymentMethod) {
    if (!paymentMethod || paymentMethod === 'all') return [];

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
}

module.exports = MercadoPagoPlugin;
