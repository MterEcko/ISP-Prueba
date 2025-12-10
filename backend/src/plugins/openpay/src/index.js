const axios = require('axios');

class OpenpayPlugin {
  constructor() {
    this.name = 'openpay';
    this.version = '1.0.0';
    this.description = 'Plugin para procesamiento de pagos con Openpay';
    this.config = null;
    this.isInitialized = false;
  }

  async onActivate(config) {
    try {
      console.log('Activando plugin Openpay');

      this._validateConfig(config);
      this.config = config;

      const auth = Buffer.from(`${config.privateKey}:`).toString('base64');
      const apiUrl = config.sandboxMode
        ? `https://sandbox-api.openpay.mx/v1/${config.merchantId}/customers`
        : `https://api.openpay.mx/v1/${config.merchantId}/customers`;

      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Basic ${auth}` }
      });

      if (response.status !== 200) {
        throw new Error('Credenciales de Openpay invalidas');
      }

      this.isInitialized = true;

      console.log(`Openpay activado (${config.sandboxMode ? 'Sandbox' : 'Produccion'})`);

      return { success: true };

    } catch (error) {
      console.error(`Error activando Openpay: ${error.message}`);
      this.isInitialized = false;
      throw error;
    }
  }

  async onDeactivate() {
    try {
      console.log('Desactivando plugin Openpay');
      this.config = null;
      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      console.error(`Error desactivando Openpay: ${error.message}`);
      throw error;
    }
  }

  registerRoutes(router) {
    const controller = require('./controller');
    const routes = require('./routes');
    routes(router, controller, this);
    return router;
  }

  _getApiUrl(endpoint = '') {
    const baseUrl = this.config.sandboxMode
      ? 'https://sandbox-api.openpay.mx'
      : 'https://api.openpay.mx';
    return `${baseUrl}/v1/${this.config.merchantId}${endpoint}`;
  }

  _getHeaders() {
    const auth = Buffer.from(`${this.config.privateKey}:`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  async createCharge(chargeData) {
    if (!this.isInitialized) {
      throw new Error('Plugin Openpay no inicializado');
    }

    try {
      console.log(`Creando cargo Openpay: ${chargeData.order_id}`);

      const payload = {
        method: chargeData.method || 'store',
        amount: parseFloat(chargeData.amount),
        description: chargeData.description,
        order_id: chargeData.order_id,
        due_date: chargeData.due_date,
        customer: {
          name: chargeData.customer.name,
          email: chargeData.customer.email,
          phone_number: chargeData.customer.phone
        },
        redirect_url: this.config.successUrl || chargeData.redirect_url
      };

      const response = await axios.post(
        this._getApiUrl('/charges'),
        payload,
        { headers: this._getHeaders() }
      );

      return {
        chargeId: response.data.id,
        method: response.data.method,
        status: response.data.status,
        amount: response.data.amount,
        paymentUrl: response.data.payment_method?.url,
        reference: response.data.payment_method?.reference,
        barcodeUrl: response.data.payment_method?.barcode_url
      };

    } catch (error) {
      console.error(`Error creando cargo Openpay: ${error.message}`);
      throw error;
    }
  }

  async getCharge(chargeId) {
    if (!this.isInitialized) {
      throw new Error('Plugin Openpay no inicializado');
    }

    try {
      const response = await axios.get(
        this._getApiUrl(`/charges/${chargeId}`),
        { headers: this._getHeaders() }
      );

      return {
        chargeId: response.data.id,
        status: response.data.status,
        amount: response.data.amount,
        method: response.data.method,
        createdAt: response.data.creation_date
      };

    } catch (error) {
      console.error(`Error obteniendo cargo Openpay: ${error.message}`);
      throw error;
    }
  }

  async createCustomer(customerData) {
    if (!this.isInitialized) {
      throw new Error('Plugin Openpay no inicializado');
    }

    try {
      const payload = {
        name: customerData.name,
        email: customerData.email,
        phone_number: customerData.phone,
        external_id: customerData.external_id
      };

      const response = await axios.post(
        this._getApiUrl('/customers'),
        payload,
        { headers: this._getHeaders() }
      );

      return {
        customerId: response.data.id,
        externalId: response.data.external_id
      };

    } catch (error) {
      console.error(`Error creando cliente Openpay: ${error.message}`);
      throw error;
    }
  }

  async refund(transactionId, amount = null) {
    if (!this.isInitialized) {
      throw new Error('Plugin Openpay no inicializado');
    }

    try {
      const payload = amount ? { amount: parseFloat(amount) } : {};

      const response = await axios.post(
        this._getApiUrl(`/charges/${transactionId}/refund`),
        payload,
        { headers: this._getHeaders() }
      );

      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status,
        amount: response.data.amount
      };

    } catch (error) {
      console.error(`Error creando reembolso Openpay: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(
        this._getApiUrl('/customers'),
        { headers: this._getHeaders() }
      );

      return {
        success: response.status === 200,
        mode: this.config.sandboxMode ? 'sandbox' : 'production'
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
      merchantInfo: this.config ? {
        country: this.config.country,
        sandboxMode: this.config.sandboxMode
      } : null
    };
  }

  _validateConfig(config) {
    const required = ['merchantId', 'privateKey', 'publicKey'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuracion Openpay incompleta. Faltan: ${missing.join(', ')}`);
    }
  }
}

module.exports = OpenpayPlugin;
