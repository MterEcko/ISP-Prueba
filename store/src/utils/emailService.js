const nodemailer = require('nodemailer');
const logger = require('../config/logger');

/**
 * Servicio de envío de emails
 * Usado principalmente para enviar licencias a clientes
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transportador de nodemailer
   */
  initializeTransporter() {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.ionos.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para otros puertos
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false // Para desarrollo, en producción debería ser true
        }
      };

      // Solo crear transporter si hay credenciales
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransporter(emailConfig);
        logger.info('✅ Servicio de email inicializado correctamente');
      } else {
        logger.warn('⚠️  Credenciales de email no configuradas. El servicio de email no estará disponible.');
      }
    } catch (error) {
      logger.error('❌ Error al inicializar servicio de email:', error);
    }
  }

  /**
   * Verifica si el servicio de email está disponible
   */
  isAvailable() {
    return this.transporter !== null;
  }

  /**
   * Verifica la conexión con el servidor SMTP
   */
  async verifyConnection() {
    if (!this.isAvailable()) {
      throw new Error('Servicio de email no configurado');
    }

    try {
      await this.transporter.verify();
      logger.info('✅ Conexión con servidor SMTP verificada');
      return true;
    } catch (error) {
      logger.error('❌ Error al verificar conexión SMTP:', error);
      throw error;
    }
  }

  /**
   * Envía un email de licencia a un cliente
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Email del destinatario
   * @param {string} options.customerName - Nombre del cliente
   * @param {string} options.licenseKey - Clave de licencia
   * @param {Object} options.packageInfo - Información del paquete
   */
  async sendLicenseEmail({ to, customerName, licenseKey, packageInfo }) {
    if (!this.isAvailable()) {
      logger.warn('⚠️  Servicio de email no disponible. Email no enviado.');
      return {
        success: false,
        message: 'Servicio de email no configurado'
      };
    }

    try {
      const subject = process.env.EMAIL_TEMPLATE_LICENSE_SUBJECT || 'Tu licencia de ISP-Prueba';
      const fromName = process.env.EMAIL_FROM_NAME || 'ISP Store';
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

      const htmlContent = this.generateLicenseEmailHTML({
        customerName,
        licenseKey,
        packageInfo
      });

      const textContent = this.generateLicenseEmailText({
        customerName,
        licenseKey,
        packageInfo
      });

      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`✅ Email de licencia enviado a ${to} - ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      };
    } catch (error) {
      logger.error(`❌ Error enviando email a ${to}:`, error);
      throw error;
    }
  }

  /**
   * Genera el contenido HTML del email de licencia
   */
  generateLicenseEmailHTML({ customerName, licenseKey, packageInfo }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Licencia ISP-Prueba</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #3498db;
    }
    .header h1 {
      color: #3498db;
      margin: 0;
    }
    .content {
      padding: 20px 0;
    }
    .license-box {
      background-color: #f8f9fa;
      border: 2px solid #3498db;
      border-radius: 5px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .license-key {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      letter-spacing: 2px;
      word-break: break-all;
      font-family: 'Courier New', monospace;
    }
    .package-info {
      background-color: #e8f4f8;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #777;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #3498db;
      color: white !important;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 ¡Bienvenido a ISP-Prueba!</h1>
    </div>

    <div class="content">
      <p>Hola <strong>${customerName}</strong>,</p>

      <p>¡Gracias por registrarte! Tu licencia ha sido generada exitosamente.</p>

      <div class="package-info">
        <h3>📦 Paquete: ${packageInfo.name || 'N/A'}</h3>
        <p>${packageInfo.description || ''}</p>
      </div>

      <div class="license-box">
        <p style="margin-top: 0; color: #555;">Tu clave de licencia es:</p>
        <div class="license-key">${licenseKey}</div>
        <p style="margin-bottom: 0; color: #555; font-size: 12px;">Guarda esta clave en un lugar seguro</p>
      </div>

      <h3>🚀 Próximos pasos:</h3>
      <ol>
        <li>Descarga e instala el sistema ISP-Prueba</li>
        <li>Durante la instalación, ingresa tu clave de licencia</li>
        <li>¡Empieza a gestionar tu ISP!</li>
      </ol>

      <p style="text-align: center;">
        <a href="${process.env.STORE_API_URL || 'https://store.yourcompany.com'}" class="button">
          Ir al Store
        </a>
      </p>
    </div>

    <div class="footer">
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      <p>&copy; ${new Date().getFullYear()} ISP-Prueba Store. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Genera el contenido de texto plano del email de licencia
   */
  generateLicenseEmailText({ customerName, licenseKey, packageInfo }) {
    return `
¡Bienvenido a ISP-Prueba!

Hola ${customerName},

¡Gracias por registrarte! Tu licencia ha sido generada exitosamente.

PAQUETE: ${packageInfo.name || 'N/A'}
${packageInfo.description || ''}

TU CLAVE DE LICENCIA:
${licenseKey}

PRÓXIMOS PASOS:
1. Descarga e instala el sistema ISP-Prueba
2. Durante la instalación, ingresa tu clave de licencia
3. ¡Empieza a gestionar tu ISP!

Si tienes alguna pregunta, no dudes en contactarnos.

---
© ${new Date().getFullYear()} ISP-Prueba Store. Todos los derechos reservados.
    `.trim();
  }

  /**
   * Envía un email genérico
   * @param {Object} options - Opciones del email
   * @param {string} options.to - Email del destinatario
   * @param {string} options.subject - Asunto del email
   * @param {string} options.text - Contenido en texto plano
   * @param {string} options.html - Contenido HTML (opcional)
   */
  async sendEmail({ to, subject, text, html }) {
    if (!this.isAvailable()) {
      logger.warn('⚠️  Servicio de email no disponible. Email no enviado.');
      return {
        success: false,
        message: 'Servicio de email no configurado'
      };
    }

    try {
      const fromName = process.env.EMAIL_FROM_NAME || 'ISP Store';
      const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;

      const mailOptions = {
        from: `"${fromName}" <${fromAddress}>`,
        to: to,
        subject: subject,
        text: text,
        html: html || text
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`✅ Email enviado a ${to} - ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email enviado correctamente'
      };
    } catch (error) {
      logger.error(`❌ Error enviando email a ${to}:`, error);
      throw error;
    }
  }
}

// Exportar instancia singleton
module.exports = new EmailService();
