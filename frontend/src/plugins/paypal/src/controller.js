class PayPalController {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async getConfig(req, res) {
    try {
      const config = this.plugin.config || {};
      const safeConfig = {
        testMode: config.testMode,
        currency: config.currency,
        returnUrl: config.returnUrl,
        cancelUrl: config.cancelUrl,
        webhookId: config.webhookId
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

  async createOrder(req, res) {
    try {
      const result = await this.plugin.createOrder(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async captureOrder(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.plugin.captureOrder(orderId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.plugin.getOrderDetails(orderId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async refundCapture(req, res) {
    try {
      const { captureId } = req.params;
      const { amount } = req.body;
      const result = await this.plugin.refundCapture(captureId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PayPalController;
