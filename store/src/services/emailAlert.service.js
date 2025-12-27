// store/src/services/emailAlert.service.js
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailAlertService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@ispstore.com';
  }

  /**
   * Inicializar transporter de email
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Configuración de email (usar variables de entorno)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verificar configuración
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        logger.info('✅ Email service initialized successfully');
        this.initialized = true;
      } else {
        logger.warn('⚠️  Email service not configured (missing SMTP credentials)');
      }
    } catch (error) {
      logger.error('Error initializing email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Enviar email genérico
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.initialized) {
      logger.warn('Email service not initialized, skipping email send');
      return { success: false, reason: 'not_initialized' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"ISP Store Security" <${this.fromEmail}>`,
        to,
        subject,
        text,
        html
      });

      logger.info(`📧 Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Alerta: Detección de múltiples instalaciones (clonación de BD)
   */
  async alertMultipleInstallations({ license, installations, databaseId }) {
    const subject = `🚨 ALERTA DE SEGURIDAD: Múltiples instalaciones detectadas - Licencia ${license.licenseKey}`;

    const installationList = installations.map(inst =>
      `- ${inst.companyName} (Hardware: ${inst.hardwareId}, IP: ${inst.systemInfo?.ip || 'N/A'})`
    ).join('\n');

    const html = `
      <h2 style="color: #d32f2f;">🚨 Alerta de Seguridad: Clonación de Base de Datos</h2>

      <p><strong>Se ha detectado que el mismo Database ID está siendo usado por múltiples instalaciones.</strong></p>

      <h3>Detalles:</h3>
      <ul>
        <li><strong>Licencia:</strong> ${license.licenseKey}</li>
        <li><strong>Database ID:</strong> ${databaseId}</li>
        <li><strong>Número de instalaciones:</strong> ${installations.length}</li>
        <li><strong>Estado:</strong> Licencia suspendida automáticamente</li>
      </ul>

      <h3>Instalaciones detectadas:</h3>
      <pre>${installationList}</pre>

      <h3>Acción tomada:</h3>
      <p>La licencia ha sido suspendida automáticamente para prevenir uso no autorizado.</p>

      <h3>Próximos pasos:</h3>
      <ol>
        <li>Contactar con el cliente para verificar la situación</li>
        <li>Investigar si es un caso legítimo de migración o clonación no autorizada</li>
        <li>Tomar acciones según las políticas de la empresa</li>
      </ol>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema de seguridad de ISP Store.<br>
        Fecha: ${new Date().toLocaleString()}
      </p>
    `;

    const text = `
🚨 ALERTA DE SEGURIDAD: Múltiples instalaciones detectadas

Licencia: ${license.licenseKey}
Database ID: ${databaseId}
Instalaciones: ${installations.length}

Instalaciones detectadas:
${installationList}

La licencia ha sido suspendida automáticamente.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Alerta: Manipulación de fecha detectada
   */
  async alertDateManipulation({ license, installation, details }) {
    const subject = `⚠️ ALERTA: Manipulación de fecha detectada - ${installation.companyName}`;

    const html = `
      <h2 style="color: #f57c00;">⚠️ Alerta: Manipulación de Fecha del Sistema</h2>

      <p><strong>Se ha detectado que un cliente retrocedió la fecha del sistema.</strong></p>

      <h3>Detalles del cliente:</h3>
      <ul>
        <li><strong>Empresa:</strong> ${installation.companyName}</li>
        <li><strong>Email:</strong> ${installation.contactEmail}</li>
        <li><strong>Licencia:</strong> ${license.licenseKey}</li>
        <li><strong>Hardware ID:</strong> ${installation.hardwareId}</li>
      </ul>

      <h3>Detección de manipulación:</h3>
      <ul>
        <li><strong>Última fecha conocida:</strong> ${new Date(details.lastKnownDate).toLocaleString()}</li>
        <li><strong>Fecha actual del sistema:</strong> ${new Date(details.currentDate).toLocaleString()}</li>
        <li><strong>Diferencia:</strong> ${details.daysDifference} días hacia atrás</li>
      </ul>

      <h3>Acción tomada:</h3>
      <p>La licencia ha sido suspendida automáticamente por manipulación de fecha.</p>

      <h3>Próximos pasos:</h3>
      <ol>
        <li>Contactar con el cliente para entender la razón</li>
        <li>Verificar si fue un error o intento de evadir expiración</li>
        <li>Decidir si reactivar o mantener suspendida</li>
      </ol>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema de seguridad de ISP Store.<br>
        Fecha: ${new Date().toLocaleString()}
      </p>
    `;

    const text = `
⚠️ ALERTA: Manipulación de fecha detectada

Empresa: ${installation.companyName}
Email: ${installation.contactEmail}
Licencia: ${license.licenseKey}

Última fecha conocida: ${new Date(details.lastKnownDate).toLocaleString()}
Fecha actual: ${new Date(details.currentDate).toLocaleString()}
Diferencia: ${details.daysDifference} días hacia atrás

La licencia ha sido suspendida automáticamente.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Alerta: Intento de activación duplicada
   */
  async alertDuplicateActivation({ license, existingInstallation, attemptDetails }) {
    const subject = `🔒 ALERTA: Intento de activación duplicada - Licencia ${license.licenseKey}`;

    const html = `
      <h2 style="color: #1976d2;">🔒 Alerta: Intento de Activación Duplicada</h2>

      <p><strong>Se ha bloqueado un intento de activar una licencia que ya está en uso.</strong></p>

      <h3>Licencia actual:</h3>
      <ul>
        <li><strong>Licencia:</strong> ${license.licenseKey}</li>
        <li><strong>Cliente actual:</strong> ${existingInstallation.companyName}</li>
        <li><strong>Hardware actual:</strong> ${existingInstallation.hardwareId}</li>
        <li><strong>Email:</strong> ${existingInstallation.contactEmail}</li>
      </ul>

      <h3>Intento de activación:</h3>
      <ul>
        <li><strong>Intentado por:</strong> ${attemptDetails.attemptedBy}</li>
        <li><strong>Nuevo hardware:</strong> ${attemptDetails.attemptedHardwareId}</li>
        <li><strong>Fecha del intento:</strong> ${new Date(attemptDetails.attemptedAt).toLocaleString()}</li>
      </ul>

      <h3>Acción tomada:</h3>
      <p>El intento fue bloqueado automáticamente. La licencia sigue activa en la instalación original.</p>

      <h3>Próximos pasos:</h3>
      <ol>
        <li>Verificar si el cliente necesita transferir su licencia</li>
        <li>Confirmar que el intento no es uso no autorizado</li>
        <li>Asistir al cliente si necesita migrar a nuevo hardware</li>
      </ol>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema de seguridad de ISP Store.<br>
        Fecha: ${new Date().toLocaleString()}
      </p>
    `;

    const text = `
🔒 ALERTA: Intento de activación duplicada

Licencia: ${license.licenseKey}
Cliente actual: ${existingInstallation.companyName}
Hardware actual: ${existingInstallation.hardwareId}

Intento de activación:
- Intentado por: ${attemptDetails.attemptedBy}
- Nuevo hardware: ${attemptDetails.attemptedHardwareId}
- Fecha: ${new Date(attemptDetails.attemptedAt).toLocaleString()}

El intento fue bloqueado automáticamente.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Alerta: Licencia suspendida
   */
  async alertLicenseSuspended({ license, installation, reason }) {
    const subject = `🚫 ALERTA: Licencia suspendida - ${installation?.companyName || license.licenseKey}`;

    const html = `
      <h2 style="color: #d32f2f;">🚫 Licencia Suspendida</h2>

      <p><strong>Una licencia ha sido suspendida.</strong></p>

      <h3>Detalles:</h3>
      <ul>
        <li><strong>Licencia:</strong> ${license.licenseKey}</li>
        ${installation ? `<li><strong>Cliente:</strong> ${installation.companyName}</li>` : ''}
        ${installation ? `<li><strong>Email:</strong> ${installation.contactEmail}</li>` : ''}
        <li><strong>Razón:</strong> ${reason}</li>
        <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <h3>Próximos pasos:</h3>
      <ol>
        <li>Revisar la razón de la suspensión</li>
        <li>Contactar con el cliente si es necesario</li>
        <li>Determinar si requiere reactivación</li>
      </ol>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema de seguridad de ISP Store.<br>
        Fecha: ${new Date().toLocaleString()}
      </p>
    `;

    const text = `
🚫 ALERTA: Licencia suspendida

Licencia: ${license.licenseKey}
${installation ? `Cliente: ${installation.companyName}` : ''}
Razón: ${reason}
Fecha: ${new Date().toLocaleString()}
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject,
      html,
      text
    });
  }

  /**
   * Alerta: Licencia por expirar (próximos 7 días)
   */
  async alertLicenseExpiringSoon({ license, installation, daysRemaining }) {
    const subject = `⏰ Recordatorio: Licencia por expirar en ${daysRemaining} días - ${installation?.companyName}`;

    const html = `
      <h2 style="color: #f57c00;">⏰ Licencia Próxima a Expirar</h2>

      <p><strong>Una licencia está por expirar pronto.</strong></p>

      <h3>Detalles:</h3>
      <ul>
        <li><strong>Licencia:</strong> ${license.licenseKey}</li>
        ${installation ? `<li><strong>Cliente:</strong> ${installation.companyName}</li>` : ''}
        ${installation ? `<li><strong>Email:</strong> ${installation.contactEmail}</li>` : ''}
        <li><strong>Días restantes:</strong> ${daysRemaining}</li>
        <li><strong>Fecha de expiración:</strong> ${new Date(license.expiresAt).toLocaleString()}</li>
      </ul>

      <h3>Acciones recomendadas:</h3>
      <ol>
        <li>Contactar al cliente para renovación</li>
        <li>Ofrecer renovación anticipada</li>
        <li>Verificar estado de pago</li>
      </ol>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del sistema de ISP Store.<br>
        Fecha: ${new Date().toLocaleString()}
      </p>
    `;

    const text = `
⏰ Licencia próxima a expirar

Licencia: ${license.licenseKey}
${installation ? `Cliente: ${installation.companyName}` : ''}
Días restantes: ${daysRemaining}
Fecha de expiración: ${new Date(license.expiresAt).toLocaleString()}

Contactar al cliente para renovación.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject,
      html,
      text
    });
  }
}

module.exports = new EmailAlertService();
