class EmailController {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async getConfig(req, res) {
    try {
      const config = this.plugin.config || {};
      const safeConfig = {
        provider: config.provider,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        mailgunDomain: config.mailgunDomain
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

  async sendEmail(req, res) {
    try {
      const result = await this.plugin.sendEmail(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = EmailController;
