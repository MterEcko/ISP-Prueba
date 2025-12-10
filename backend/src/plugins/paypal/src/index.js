const axios = require('axios');

class PayPalPlugin {
  constructor() {
    this.name = 'paypal';
    this.version = '1.0.0';
    this.description = 'Plugin para procesamiento de pagos con PayPal';
    this.config = null;
    this.isInitialized = false;
    this.accessToken = null;
    this.tokenExpires = 0;
  }

  async onActivate(config) {
    try {
      console.log('Activando plugin PayPal');

      this._validateConfig(config);
      this.config = config;

      const token = await this._getAccessToken();

      if (!token) {
        throw new Error('Credenciales de PayPal invalidas');
      }

      this.isInitialized = true;

      console.log(`PayPal activado (${config.testMode ? 'Sandbox' : 'Produccion'})`);

      return { success: true };

    } catch (error) {
      console.error(`Error activando PayPal: ${error.message}`);
      this.isInitialized = false;
      throw error;
    }
  }

  async onDeactivate() {
    try {
      console.log('Desactivando plugin PayPal');
      this.config = null;
      this.accessToken = null;
      this.tokenExpires = 0;
      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      console.error(`Error desactivando PayPal: ${error.message}`);
      throw error;
    }
  }

  registerRoutes(router) {
    const controller = require('./controller');
    const routes = require('./routes');
    routes(router, controller, this);
    return router;
  }

  async _getAccessToken() {
    if (this.accessToken && this.tokenExpires > Date.now()) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      const apiUrl = this.config.testMode
        ? 'https://api-m.sandbox.paypal.com/v1/oauth2/token'
        : 'https://api-m.paypal.com/v1/oauth2/token';

      const response = await axios.post(apiUrl, 'grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.status !== 200) {
        throw new Error('Error al obtener token de acceso');
      }

      this.accessToken = response.data.access_token;
      this.tokenExpires = Date.now() + (response.data.expires_in * 1000);

      return this.accessToken;

    } catch (error) {
      console.error('Error obteniendo token de PayPal:', error.message);
      throw error;
    }
  }

  async createOrder(orderData) {
    if (!this.isInitialized) {
      throw new Error('Plugin PayPal no inicializado');
    }

    try {
      const token = await this._getAccessToken();

      const apiUrl = this.config.testMode
        ? 'https://api-m.sandbox.paypal.com/v2/checkout/orders'
        : 'https://api-m.paypal.com/v2/checkout/orders';

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderData.reference,
            description: orderData.description,
            custom_id: orderData.customId,
            amount: {
              currency_code: orderData.currency || 'USD',
              value: orderData.amount.toString()
            }
          }
        ],
        application_context: {
          brand_name: 'Sistema ISP',
          landing_page: 'BILLING',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          return_url: this.config.returnUrl || orderData.returnUrl,
          cancel_url: this.config.cancelUrl || orderData.cancelUrl
        }
      };

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 201) {
        throw new Error('Error creando orden de PayPal');
      }

      const approveLink = response.data.links.find(link => link.rel === 'approve');

      return {
        orderId: response.data.id,
        paymentUrl: approveLink ? approveLink.href : null,
        status: response.data.status
      };

    } catch (error) {
      console.error(`Error creando orden PayPal: ${error.message}`);
      throw error;
    }
  }

  async captureOrder(orderId) {
    if (!this.isInitialized) {
      throw new Error('Plugin PayPal no inicializado');
    }

    try {
      const token = await this._getAccessToken();

      const apiUrl = this.config.testMode
        ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`
        : `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`;

      const response = await axios.post(apiUrl, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 201) {
        throw new Error('Error capturando orden de PayPal');
      }

      return {
        orderId: response.data.id,
        status: response.data.status,
        captureId: response.data.purchase_units[0]?.payments?.captures[0]?.id,
        amount: response.data.purchase_units[0]?.payments?.captures[0]?.amount
      };

    } catch (error) {
      console.error(`Error capturando orden PayPal: ${error.message}`);
      throw error;
    }
  }

  async getOrderDetails(orderId) {
    if (!this.isInitialized) {
      throw new Error('Plugin PayPal no inicializado');
    }

    try {
      const token = await this._getAccessToken();

      const apiUrl = this.config.testMode
        ? `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`
        : `https://api-m.paypal.com/v2/checkout/orders/${orderId}`;

      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;

    } catch (error) {
      console.error(`Error obteniendo detalles orden PayPal: ${error.message}`);
      throw error;
    }
  }

  async refundCapture(captureId, amount = null) {
    if (!this.isInitialized) {
      throw new Error('Plugin PayPal no inicializado');
    }

    try {
      const token = await this._getAccessToken();

      const apiUrl = this.config.testMode
        ? `https://api-m.sandbox.paypal.com/v2/payments/captures/${captureId}/refund`
        : `https://api-m.paypal.com/v2/payments/captures/${captureId}/refund`;

      const payload = amount ? {
        amount: {
          value: amount.toString(),
          currency_code: 'USD'
        }
      } : {};

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status,
        amount: response.data.amount
      };

    } catch (error) {
      console.error(`Error creando reembolso PayPal: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      const token = await this._getAccessToken();
      return {
        success: !!token,
        mode: this.config.testMode ? 'sandbox' : 'production'
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
      mode: this.config ? (this.config.testMode ? 'sandbox' : 'production') : null
    };
  }

  _validateConfig(config) {
    const required = ['clientId', 'clientSecret'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuracion PayPal incompleta. Faltan: ${missing.join(', ')}`);
    }
  }
}

module.exports = PayPalPlugin;
