// store/src/services/emailReport.service.js
const cron = require('node-cron');
const logger = require('../config/logger');
const emailAlertService = require('./emailAlert.service');
const db = require('../models');
const { Op } = require('sequelize');

class EmailReportService {
  constructor() {
    this.cronJob = null;
    this.isRunning = false;
    this.weeklySchedule = '0 9 * * 1'; // Lunes a las 9 AM
  }

  /**
   * Iniciar reportes semanales automáticos
   */
  start() {
    if (this.isRunning) {
      logger.warn('⚠️ Email report service ya está en ejecución');
      return;
    }

    // Programar reporte semanal
    this.cronJob = cron.schedule(this.weeklySchedule, async () => {
      try {
        await this.sendWeeklyReport();
      } catch (error) {
        logger.error('Error en reporte semanal automático:', error.message);
      }
    });

    this.isRunning = true;
    logger.info('📊 Servicio de reportes por email iniciado (semanales los lunes a las 9 AM)');
  }

  /**
   * Detener servicio
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('🛑 Servicio de reportes por email detenido');
  }

  /**
   * Generar y enviar reporte semanal
   */
  async sendWeeklyReport() {
    try {
      logger.info('📊 Generando reporte semanal...');

      const report = await this.generateWeeklyReport();
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

      const subject = `📊 Reporte Semanal ISP Store - Semana del ${new Date(report.period.start).toLocaleDateString()}`;

      const html = this.formatWeeklyReportHTML(report);
      const text = this.formatWeeklyReportText(report);

      const result = await emailAlertService.sendEmail({
        to: adminEmail,
        subject,
        html,
        text
      });

      if (result.success) {
        logger.info('✅ Reporte semanal enviado exitosamente');
      } else {
        logger.error(`❌ Error enviando reporte semanal: ${result.error || result.reason}`);
      }

      return result;

    } catch (error) {
      logger.error('Error generando reporte semanal:', error.message);
      throw error;
    }
  }

  /**
   * Generar reporte semanal (datos)
   */
  async generateWeeklyReport() {
    const { License, Installation, RemoteCommand } = db;

    // Período: última semana
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // ========== ESTADÍSTICAS GENERALES ==========

    const totalLicenses = await License.count();
    const activeLicenses = await License.count({ where: { status: 'active' } });
    const suspendedLicenses = await License.count({ where: { status: 'suspended' } });
    const pendingLicenses = await License.count({ where: { status: 'pending' } });
    const expiredLicenses = await License.count({ where: { status: 'expired' } });

    // ========== LICENCIAS NUEVAS (ÚLTIMA SEMANA) ==========

    const newLicenses = await License.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    // ========== INSTALACIONES ACTIVAS ==========

    const totalInstallations = await Installation.count();
    const onlineInstallations = await Installation.count({ where: { isOnline: true } });
    const offlineInstallations = totalInstallations - onlineInstallations;

    // Instalaciones con heartbeat reciente (últimas 24 horas)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const recentHeartbeats = await Installation.count({
      where: {
        lastHeartbeat: {
          [Op.gte]: oneDayAgo
        }
      }
    });

    // ========== EVENTOS DE SEGURIDAD (ÚLTIMA SEMANA) ==========

    // Suspensiones en la última semana
    const recentSuspensions = await License.count({
      where: {
        status: 'suspended',
        updatedAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    // Licencias con intentos de activación duplicada
    const duplicateAttempts = await License.count({
      where: {
        'metadata.duplicateActivationAttempts': {
          [Op.ne]: null
        }
      }
    });

    // Detección de clonación
    const cloningDetections = await License.count({
      where: {
        'metadata.clonedDatabaseId': {
          [Op.ne]: null
        }
      }
    });

    // Manipulación de fecha
    const dateManipulations = await License.count({
      where: {
        'metadata.dateManipulation': {
          [Op.ne]: null
        }
      }
    });

    // ========== COMANDOS REMOTOS (ÚLTIMA SEMANA) ==========

    const remoteCommandsIssued = await RemoteCommand.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    const remoteCommandsExecuted = await RemoteCommand.count({
      where: {
        status: 'executed',
        executedAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    const remoteCommandsFailed = await RemoteCommand.count({
      where: {
        status: 'failed',
        executedAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    // ========== LICENCIAS POR EXPIRAR (PRÓXIMOS 30 DÍAS) ==========

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringLicenses = await License.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [Op.gte]: new Date(),
          [Op.lte]: thirtyDaysFromNow
        }
      },
      include: [
        { model: Installation, as: 'installation' }
      ],
      order: [['expiresAt', 'ASC']],
      limit: 10
    });

    // ========== TOP INSTALACIONES POR USO ==========

    const topInstallations = await Installation.findAll({
      where: {
        isOnline: true
      },
      order: [
        ['totalClients', 'DESC'],
        ['totalUsers', 'DESC']
      ],
      limit: 5
    });

    return {
      period: {
        start: startDate,
        end: endDate
      },
      general: {
        totalLicenses,
        activeLicenses,
        suspendedLicenses,
        pendingLicenses,
        expiredLicenses,
        newLicenses
      },
      installations: {
        total: totalInstallations,
        online: onlineInstallations,
        offline: offlineInstallations,
        recentHeartbeats
      },
      security: {
        recentSuspensions,
        duplicateAttempts,
        cloningDetections,
        dateManipulations
      },
      remoteCommands: {
        issued: remoteCommandsIssued,
        executed: remoteCommandsExecuted,
        failed: remoteCommandsFailed
      },
      expiringLicenses,
      topInstallations
    };
  }

  /**
   * Formatear reporte en HTML
   */
  formatWeeklyReportHTML(report) {
    const expiringList = report.expiringLicenses.map(lic => {
      const daysRemaining = Math.ceil((new Date(lic.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
      return `<li>${lic.installation?.companyName || lic.licenseKey} - ${daysRemaining} días restantes</li>`;
    }).join('');

    const topInstallationsList = report.topInstallations.map(inst =>
      `<li>${inst.companyName} - ${inst.totalClients} clientes, ${inst.totalUsers} usuarios</li>`
    ).join('');

    return `
      <h1 style="color: #1976d2;">📊 Reporte Semanal ISP Store</h1>
      <p><strong>Período:</strong> ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}</p>

      <hr>

      <h2>📈 Estadísticas Generales</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total de Licencias</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.general.totalLicenses}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Licencias Activas</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: green;">${report.general.activeLicenses}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Licencias Suspendidas</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: red;">${report.general.suspendedLicenses}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Licencias Pendientes</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.general.pendingLicenses}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Licencias Expiradas</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.general.expiredLicenses}</td>
        </tr>
        <tr style="background-color: #e3f2fd;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Nuevas Esta Semana</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${report.general.newLicenses}</td>
        </tr>
      </table>

      <h2>💻 Instalaciones</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.installations.total}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Online</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: green;">${report.installations.online}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Offline</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: gray;">${report.installations.offline}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Heartbeats Recientes (24h)</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.installations.recentHeartbeats}</td>
        </tr>
      </table>

      <h2>🔒 Seguridad (Esta Semana)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Suspensiones</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.security.recentSuspensions}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Intentos de Activación Duplicada</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; ${report.security.duplicateAttempts > 0 ? 'color: orange;' : ''}">${report.security.duplicateAttempts}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Clonación Detectada</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; ${report.security.cloningDetections > 0 ? 'color: red;' : ''}">${report.security.cloningDetections}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Manipulación de Fecha</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; ${report.security.dateManipulations > 0 ? 'color: red;' : ''}">${report.security.dateManipulations}</td>
        </tr>
      </table>

      <h2>🎮 Comandos Remotos (Esta Semana)</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Emitidos</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${report.remoteCommands.issued}</td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Ejecutados</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; color: green;">${report.remoteCommands.executed}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Fallidos</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd; ${report.remoteCommands.failed > 0 ? 'color: red;' : ''}">${report.remoteCommands.failed}</td>
        </tr>
      </table>

      ${report.expiringLicenses.length > 0 ? `
        <h2>⏰ Licencias Por Expirar (Próximos 30 Días)</h2>
        <ul>
          ${expiringList}
        </ul>
      ` : ''}

      ${report.topInstallations.length > 0 ? `
        <h2>🏆 Top 5 Instalaciones por Uso</h2>
        <ul>
          ${topInstallationsList}
        </ul>
      ` : ''}

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un reporte automático del sistema ISP Store.<br>
        Generado: ${new Date().toLocaleString()}
      </p>
    `;
  }

  /**
   * Formatear reporte en texto plano
   */
  formatWeeklyReportText(report) {
    return `
📊 REPORTE SEMANAL ISP STORE
Período: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}

========================================
📈 ESTADÍSTICAS GENERALES
========================================
Total de Licencias: ${report.general.totalLicenses}
Licencias Activas: ${report.general.activeLicenses}
Licencias Suspendidas: ${report.general.suspendedLicenses}
Licencias Pendientes: ${report.general.pendingLicenses}
Licencias Expiradas: ${report.general.expiredLicenses}
Nuevas Esta Semana: ${report.general.newLicenses}

========================================
💻 INSTALACIONES
========================================
Total: ${report.installations.total}
Online: ${report.installations.online}
Offline: ${report.installations.offline}
Heartbeats Recientes (24h): ${report.installations.recentHeartbeats}

========================================
🔒 SEGURIDAD (ESTA SEMANA)
========================================
Suspensiones: ${report.security.recentSuspensions}
Intentos de Activación Duplicada: ${report.security.duplicateAttempts}
Clonación Detectada: ${report.security.cloningDetections}
Manipulación de Fecha: ${report.security.dateManipulations}

========================================
🎮 COMANDOS REMOTOS (ESTA SEMANA)
========================================
Emitidos: ${report.remoteCommands.issued}
Ejecutados: ${report.remoteCommands.executed}
Fallidos: ${report.remoteCommands.failed}

${report.expiringLicenses.length > 0 ? `
========================================
⏰ LICENCIAS POR EXPIRAR (PRÓXIMOS 30 DÍAS)
========================================
${report.expiringLicenses.map(lic => {
  const daysRemaining = Math.ceil((new Date(lic.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  return `- ${lic.installation?.companyName || lic.licenseKey} - ${daysRemaining} días restantes`;
}).join('\n')}
` : ''}

${report.topInstallations.length > 0 ? `
========================================
🏆 TOP 5 INSTALACIONES POR USO
========================================
${report.topInstallations.map(inst =>
  `- ${inst.companyName} - ${inst.totalClients} clientes, ${inst.totalUsers} usuarios`
).join('\n')}
` : ''}

========================================
Generado: ${new Date().toLocaleString()}
    `.trim();
  }

  /**
   * Generar y enviar reporte on-demand
   */
  async sendOnDemandReport(email) {
    try {
      logger.info(`📊 Generando reporte on-demand para ${email}...`);

      const report = await this.generateWeeklyReport();
      const subject = `📊 Reporte ISP Store - ${new Date().toLocaleDateString()}`;

      const html = this.formatWeeklyReportHTML(report);
      const text = this.formatWeeklyReportText(report);

      const result = await emailAlertService.sendEmail({
        to: email,
        subject,
        html,
        text
      });

      if (result.success) {
        logger.info('✅ Reporte on-demand enviado exitosamente');
      }

      return result;

    } catch (error) {
      logger.error('Error generando reporte on-demand:', error.message);
      throw error;
    }
  }
}

module.exports = new EmailReportService();
