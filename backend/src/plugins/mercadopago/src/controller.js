class MercadoPagoController {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async getConfig(req, res) {
    try {
      const config = this.plugin.config || {};
      const safeConfig = {
        country: config.country,
        sandbox: config.sandbox,
        expirationDays: config.expirationDays,
        notifyCustomer: config.notifyCustomer,
        webhookUrl: config.webhookUrl
      };

      res.json({ config: safeConfig });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async saveConfig(req, res) {
    try {
      await this.plugin.onActivate(req.body);
      res.json({ success: true, message: 'Configuracion guardada correctamente' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = this.plugin.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async testConnection(req, res) {
    try {
      const result = await this.plugin.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createPayment(req, res) {
    try {
      const result = await this.plugin.createPayment(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleWebhook(req, res) {
    try {
      const result = await this.plugin.processWebhook(req.body);

      if (result) {
        console.log('Webhook procesado:', result);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error en webhook:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { reference } = req.params;
      const status = await this.plugin.getPaymentStatus(reference);
      res.json({ status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount } = req.body;
      const result = await this.plugin.refundPayment(paymentId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = MercadoPagoController;
