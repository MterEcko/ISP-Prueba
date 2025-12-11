const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailPlugin {
  constructor() {
    this.name = 'email';
    this.version = '1.0.0';
    this.description = 'Plugin para envio de correos electronicos';
    this.transporter = null;
    this.config = null;
    this.isInitialized = false;
    this.statistics = {
      sent: 0,
      failed: 0,
      lastSent: null
    };
  }

  async onActivate(config) {
    try {
      console.log('Activando plugin Email');

      this._validateConfig(config);
      this.config = config;

      switch (config.provider) {
        case 'smtp':
          await this._initializeSMTP();
          break;
        case 'sendgrid':
          await this._initializeSendGrid();
          break;
        case 'mailgun':
          await this._initializeMailgun();
          break;
        default:
          throw new Error(`Proveedor no soportado: ${config.provider}`);
      }

      await this._testConnection();

      this.isInitialized = true;

      console.log(`Email activado con proveedor: ${config.provider}`);

      return { success: true };

    } catch (error) {
      console.error(`Error activando Email: ${error.message}`);
      this.isInitialized = false;
      throw error;
    }
  }

  async onDeactivate() {
    try {
      console.log('Desactivando plugin Email');
      if (this.transporter && this.transporter.close) {
        this.transporter.close();
      }
      this.transporter = null;
      this.config = null;
      this.isInitialized = false;
      return { success: true };
    } catch (error) {
      console.error(`Error desactivando Email: ${error.message}`);
      throw error;
    }
  }

  registerRoutes(router) {
    const controller = require('./controller');
    const routes = require('./routes');
    routes(router, controller, this);
    return router;
  }

  async _initializeSMTP() {
    this.transporter = nodemailer.createTransporter({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure || false,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPassword
      }
    });
  }

  async _initializeSendGrid() {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.config.sendgridApiKey);

    this.transporter = {
      sendMail: async (mailOptions) => {
        const msg = {
          to: mailOptions.to,
          from: mailOptions.from,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text
        };

        const result = await sgMail.send(msg);
        return {
          messageId: result[0].headers['x-message-id'],
          accepted: [mailOptions.to],
          rejected: []
        };
      },
      close: () => {}
    };
  }

  async _initializeMailgun() {
    const mailgun = require('mailgun-js')({
      apiKey: this.config.mailgunApiKey,
      domain: this.config.mailgunDomain
    });

    this.transporter = {
      sendMail: async (mailOptions) => {
        const data = {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text
        };

        const result = await mailgun.messages().send(data);
        return {
          messageId: result.id,
          accepted: [mailOptions.to],
          rejected: []
        };
      },
      close: () => {}
    };
  }

  async _testConnection() {
    if (this.config.provider === 'smtp' && this.transporter.verify) {
      const isVerified = await this.transporter.verify();
      if (!isVerified) {
        throw new Error('No se pudo verificar la conexion SMTP');
      }
    }
  }

  async sendEmail(emailData) {
    if (!this.isInitialized) {
      throw new Error('Plugin Email no inicializado');
    }

    try {
      const { to, subject, message, html } = emailData;

      if (!to || (!message && !html)) {
        throw new Error('Destinatario y mensaje son requeridos');
      }

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to,
        subject: subject || 'Mensaje del ISP',
        html: html || this._formatMessage(message),
        text: message || this._stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.statistics.sent++;
      this.statistics.lastSent = new Date();

      console.log(`Email enviado exitosamente a ${to}`);

      return {
        success: true,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };

    } catch (error) {
      this.statistics.failed++;
      console.error(`Error enviando email: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    try {
      const testEmail = {
        to: this.config.fromEmail,
        subject: 'Test de conexion',
        message: 'Este es un correo de prueba para verificar la configuracion.'
      };

      await this.sendEmail(testEmail);

      return {
        success: true,
        provider: this.config.provider
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
      provider: this.config ? this.config.provider : null,
      statistics: this.statistics
    };
  }

  _validateConfig(config) {
    const required = ['provider', 'fromEmail', 'fromName'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
      throw new Error(`Configuracion Email incompleta. Faltan: ${missing.join(', ')}`);
    }

    if (config.provider === 'smtp') {
      const smtpRequired = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword'];
      const smtpMissing = smtpRequired.filter(field => !config[field]);
      if (smtpMissing.length > 0) {
        throw new Error(`Configuracion SMTP incompleta. Faltan: ${smtpMissing.join(', ')}`);
      }
    } else if (config.provider === 'sendgrid') {
      if (!config.sendgridApiKey) {
        throw new Error('Se requiere sendgridApiKey para usar SendGrid');
      }
    } else if (config.provider === 'mailgun') {
      if (!config.mailgunApiKey || !config.mailgunDomain) {
        throw new Error('Se requieren mailgunApiKey y mailgunDomain para usar Mailgun');
      }
    }
  }

  _formatMessage(message) {
    let formattedMessage = message.replace(/\n/g, '<br>');

    if (!formattedMessage.includes('<html>')) {
      formattedMessage = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              ${formattedMessage}
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                Este mensaje fue enviado automaticamente por nuestro sistema.
              </p>
            </div>
          </body>
        </html>
      `;
    }

    return formattedMessage;
  }

  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

// Cargar función de auto-migración
const { registerEmailMigrations } = require('./utils/auto-migration');

// Exportar plugin con función de auto-migración
module.exports = EmailPlugin;
module.exports.autoMigration = registerEmailMigrations;
