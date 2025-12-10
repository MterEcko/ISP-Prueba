class OpenpayController {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async getConfig(req, res) {
    try {
      const config = this.plugin.config || {};
      const safeConfig = {
        country: config.country,
        sandboxMode: config.sandboxMode,
        enableCards: config.enableCards,
        enableStores: config.enableStores,
        enableBanks: config.enableBanks,
        expirationDays: config.expirationDays,
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

  async createCharge(req, res) {
    try {
      const result = await this.plugin.createCharge(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCharge(req, res) {
    try {
      const { chargeId } = req.params;
      const result = await this.plugin.getCharge(chargeId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createCustomer(req, res) {
    try {
      const result = await this.plugin.createCustomer(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async refund(req, res) {
    try {
      const { transactionId } = req.params;
      const { amount } = req.body;
      const result = await this.plugin.refund(transactionId, amount);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = OpenpayController;
