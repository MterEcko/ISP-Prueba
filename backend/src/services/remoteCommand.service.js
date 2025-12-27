// backend/src/services/remoteCommand.service.js
const cron = require('node-cron');
const logger = require('../utils/logger');
const storeApiClient = require('./storeApiClient.service');
const heartbeatService = require('./heartbeat.service');
const db = require('../models');

class RemoteCommandService {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.checkInterval = '*/5 * * * *'; // Cada 5 minutos
  }

  /**
   * Iniciar el servicio de verificación de comandos remotos
   */
  start() {
    if (this.isRunning) {
      logger.warn('⚠️ Remote command service ya está en ejecución');
      return;
    }

    // Verificar comandos inmediatamente al iniciar
    this.checkPendingCommands().catch(error => {
      logger.error('Error en verificación inicial de comandos remotos:', error.message);
    });

    // Programar verificación cada 5 minutos
    this.cronJob = cron.schedule(this.checkInterval, async () => {
      try {
        await this.checkPendingCommands();
      } catch (error) {
        logger.error('Error en verificación programada de comandos remotos:', error.message);
      }
    });

    this.isRunning = true;
    logger.info('🎮 Servicio de comandos remotos iniciado (cada 5 minutos)');
  }

  /**
   * Detener el servicio
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('🛑 Servicio de comandos remotos detenido');
  }

  /**
   * Verificar y ejecutar comandos pendientes
   */
  async checkPendingCommands() {
    try {
      // Obtener licencia activa
      const license = await db.SystemLicense.findOne({
        where: { active: true }
      });

      if (!license) {
        logger.debug('No hay licencia activa, saltando verificación de comandos remotos');
        return;
      }

      // Consultar comandos pendientes al Store
      const response = await storeApiClient.getPendingCommands(license.licenseKey);

      if (!response.success) {
        logger.warn('No se pudieron obtener comandos remotos del Store');
        return;
      }

      const commands = response.commands || [];

      if (commands.length === 0) {
        logger.debug('No hay comandos remotos pendientes');
        return;
      }

      logger.info(`📥 Recibidos ${commands.length} comando(s) remoto(s) del Store`);

      // Ejecutar cada comando
      for (const command of commands) {
        await this.executeCommand(command);
      }

    } catch (error) {
      logger.error('Error verificando comandos remotos:', error.message);
    }
  }

  /**
   * Ejecutar un comando remoto
   */
  async executeCommand(command) {
    try {
      logger.info(`🎯 Ejecutando comando remoto: ${command.command} (ID: ${command.id})`);

      let result = { success: false, response: null, error: null };

      switch (command.command) {
        case 'heartbeat':
          result = await this.executeHeartbeat(command);
          break;

        case 'block':
          result = await this.executeBlock(command);
          break;

        case 'unblock':
          result = await this.executeUnblock(command);
          break;

        case 'restart':
          result = await this.executeRestart(command);
          break;

        case 'collect_logs':
          result = await this.executeCollectLogs(command);
          break;

        case 'message':
          result = await this.executeMessage(command);
          break;

        default:
          logger.warn(`⚠️ Comando desconocido: ${command.command}`);
          result = {
            success: false,
            error: `Unknown command: ${command.command}`
          };
      }

      // Reportar resultado al Store
      await storeApiClient.reportCommandExecution(command.id, result);

      logger.info(`${result.success ? '✅' : '❌'} Comando ${command.id} ${result.success ? 'ejecutado' : 'falló'}`);

    } catch (error) {
      logger.error(`Error ejecutando comando ${command.id}:`, error.message);

      // Reportar error al Store
      await storeApiClient.reportCommandExecution(command.id, {
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ejecutar comando de heartbeat
   */
  async executeHeartbeat(command) {
    try {
      logger.info('💓 Ejecutando heartbeat forzado por comando remoto...');

      const result = await heartbeatService.sendHeartbeat(true); // forced = true

      return {
        success: result.success,
        response: {
          message: 'Heartbeat executed successfully',
          limitsExceeded: result.limitsExceeded,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecutar comando de bloqueo
   */
  async executeBlock(command) {
    try {
      logger.info('🚫 Ejecutando bloqueo del sistema...');

      // Obtener licencia activa y suspenderla localmente
      const license = await db.SystemLicense.findOne({
        where: { active: true }
      });

      if (license) {
        await license.update({
          status: 'suspended',
          active: false,
          metadata: {
            ...license.metadata,
            suspensionReason: command.parameters?.reason || 'Blocked by administrator',
            suspendedAt: new Date().toISOString(),
            remoteBlock: true
          }
        });
      }

      return {
        success: true,
        response: {
          message: 'System blocked successfully',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecutar comando de desbloqueo
   */
  async executeUnblock(command) {
    try {
      logger.info('✅ Ejecutando desbloqueo del sistema...');

      // Obtener licencia y reactivarla
      const license = await db.SystemLicense.findOne({
        where: { status: 'suspended' }
      });

      if (license) {
        await license.update({
          status: 'active',
          active: true,
          metadata: {
            ...license.metadata,
            reactivatedAt: new Date().toISOString(),
            remoteUnblock: true
          }
        });
      }

      return {
        success: true,
        response: {
          message: 'System unblocked successfully',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecutar comando de reinicio
   */
  async executeRestart(command) {
    logger.info('🔄 Comando de reinicio recibido (no implementado aún)');
    return {
      success: false,
      error: 'Restart command not implemented yet'
    };
  }

  /**
   * Ejecutar comando de recolección de logs
   */
  async executeCollectLogs(command) {
    logger.info('📋 Comando de recolección de logs recibido (no implementado aún)');
    return {
      success: false,
      error: 'Collect logs command not implemented yet'
    };
  }

  /**
   * Ejecutar comando de mensaje
   */
  async executeMessage(command) {
    try {
      const message = command.parameters?.message || 'Mensaje del administrador';
      logger.info(`💬 Mensaje remoto: ${message}`);

      // TODO: Mostrar mensaje en UI o enviar notificación

      return {
        success: true,
        response: {
          message: 'Message received',
          content: message,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RemoteCommandService();
