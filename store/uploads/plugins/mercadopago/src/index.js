// MercadoPago Payment Gateway Plugin
// Version: 2.1.5

const mercadopago = require('mercadopago');

class MercadoPagoPlugin {
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  async initialize() {
    mercadopago.configure({
      access_token: this.config.accessToken
    });
    this.client = mercadopago;
    console.log('✅ MercadoPago Plugin initialized');
  }

  async createPayment(data) {
    const preference = {
      items: [
        {
          title: data.title,
          unit_price: data.amount,
          quantity: 1
        }
      ],
      payer: {
        email: data.email
      },
      back_urls: {
        success: data.successUrl,
        failure: data.failureUrl,
        pending: data.pendingUrl
      },
      auto_return: 'approved',
      notification_url: data.webhookUrl
    };

    const response = await mercadopago.preferences.create(preference);
    return {
      id: response.body.id,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    };
  }

  async createSubscription(data) {
    const plan = {
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: data.amount,
        currency_id: data.currency || 'MXN'
      },
      back_url: data.backUrl,
      reason: data.description
    };

    const response = await mercadopago.preapproval.create(plan);
    return response.body;
  }

  async processWebhook(payload, signature) {
    // Verificar firma del webhook
    // Procesar notificación
    const { type, data } = payload;

    if (type === 'payment') {
      const payment = await mercadopago.payment.get(data.id);
      return {
        status: payment.body.status,
        amount: payment.body.transaction_amount,
        external_reference: payment.body.external_reference
      };
    }

    return null;
  }

  async refund(paymentId) {
    const response = await mercadopago.refund.create({
      payment_id: paymentId
    });
    return response.body;
  }
}

module.exports = MercadoPagoPlugin;
