// backend/src/services/client.suspension.service.js
// Servicio para suspender/reactivar servicios de clientes integrando MikroTik y Configuración

const db = require('../models');
const logger = require('../utils/logger'); // Ajustado para coincidir con los otros servicios
const ClientMikrotikService = require('./client.mikrotik.service');
const configHelper = require('../helpers/configHelper');

const ClientSuspensionService = {
  /**
   * Suspende el servicio de un cliente
   * - Actualiza estado en BD (Billing)
   * - Ejecuta acción en Mikrotik (Desactivar o Pool de Corte)
   * - Crea notificación
   * - Registra en historial
   */
  async suspendClient(clientId, reason = 'non_payment') {
    logger.info(`Iniciando suspensión de cliente ${clientId}. Razón: ${reason}`);

    try {
      // 1. Obtener información del cliente y su estado de facturación
      const client = await db.Client.findByPk(clientId, {
        include: [
          {
            model: db.ClientBilling,
            as: 'clientBilling' // Alias consistente con el controlador
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // 2. Verificar si ya está suspendido para evitar llamadas innecesarias
      if (client.clientBilling && client.clientBilling.clientStatus === 'suspended') {
        logger.warn(`Cliente ${clientId} ya está suspendido`);
        return {
          success: true,
          alreadySuspended: true,
          message: 'Cliente ya estaba suspendido'
        };
      }

      // 3. Actualizar estado en la base de datos (Billing)
      // Esto detiene la generación de nuevas facturas si la lógica de facturación respeta el estado 'suspended'
      await db.ClientBilling.update(
        {
          clientStatus: 'suspended',
          suspensionDate: new Date(),
          suspensionReason: reason
        },
        { where: { clientId } }
      );

      // 4. Obtener configuración de suspensión (Setup)
      // 'disable_user' = Desactivar secreto (default)
      // 'change_pool'  = Mover a Address List / Pool de Corte
      const suspensionMethod = await configHelper.get('mikrotik_suspension_mode') || 'disable_user';

      // 5. Ejecutar acción en Mikrotik usando el servicio centralizado
      logger.info(`Aplicando suspensión en Mikrotik usando método: ${suspensionMethod}`);
      const mikrotikResult = await ClientMikrotikService.toggleServiceStatus(clientId, 'suspend', suspensionMethod);

      // 6. Crear notificación
      await this.createSuspensionNotification(client, reason);

      // 7. Registrar en historial
      await this.logSuspensionEvent(clientId, reason, mikrotikResult);

      // 8. Enviar comunicación al cliente (email/SMS)
      await this.sendSuspensionCommunication(client, reason);

      logger.info(`✅ Cliente ${clientId} suspendido correctamente`);

      return {
        success: true,
        clientId: clientId,
        reason: reason,
        method: suspensionMethod,
        suspendedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error suspendiendo cliente ${clientId}:`, error);
      throw error;
    }
  },

  /**
   * Reactiva el servicio de un cliente
   * - Actualiza estado en BD
   * - Reactiva usuario PPPoE en Mikrotik (Revierte acción anterior)
   * - Crea notificación
   */
  async reactivateClient(clientId, paymentId = null) {
    logger.info(`Iniciando reactivación de cliente ${clientId}`);

    try {
      // 1. Obtener información del cliente
      const client = await db.Client.findByPk(clientId, {
        include: [
          {
            model: db.ClientBilling,
            as: 'clientBilling'
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // 2. Verificar si está activo
      if (client.clientBilling && client.clientBilling.clientStatus === 'active') {
        logger.warn(`Cliente ${clientId} ya está activo`);
        return {
          success: true,
          alreadyActive: true,
          message: 'Cliente ya estaba activo'
        };
      }

      // 3. Actualizar estado en la base de datos
      await db.ClientBilling.update(
        {
          clientStatus: 'active',
          reactivationDate: new Date(),
          suspensionDate: null,
          suspensionReason: null
        },
        { where: { clientId } }
      );

      // 4. Obtener configuración para saber cómo reactivar (aunque 'activate' maneja ambos casos internamente)
      const suspensionMethod = await configHelper.get('mikrotik_suspension_mode') || 'disable_user';

      // 5. Reactivar usuario en Mikrotik
      logger.info(`Reactivando servicio en Mikrotik...`);
      const mikrotikResult = await ClientMikrotikService.toggleServiceStatus(clientId, 'activate', suspensionMethod);

      // 6. Crear notificación
      await this.createReactivationNotification(client, paymentId);

      // 7. Registrar en historial
      await this.logReactivationEvent(clientId, paymentId, mikrotikResult);

      // 8. Enviar comunicación al cliente
      await this.sendReactivationCommunication(client);

      logger.info(`✅ Cliente ${clientId} reactivado correctamente`);

      return {
        success: true,
        clientId: clientId,
        reactivatedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error reactivando cliente ${clientId}:`, error);
      throw error;
    }
  },

  /**
   * Crea notificación de suspensión
   */
  async createSuspensionNotification(client, reason) {
    const reasons = {
      non_payment: 'Falta de pago',
      abuse: 'Abuso de servicio',
      fraud: 'Fraude detectado',
      request: 'Solicitud del cliente',
      technical: 'Problemas técnicos'
    };

    const reasonText = reasons[reason] || reason;

    try {
      await db.NotificationQueue.create({
        userId: null,  // Notificación del sistema
        title: `Servicio Suspendido - ${client.firstName} ${client.lastName}`,
        message: `El servicio del cliente ha sido suspendido. Razón: ${reasonText}`,
        type: 'service_suspension',
        priority: 'high',
        metadata: {
          clientId: client.id,
          reason: reason,
          suspendedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error creando notificación de suspensión:', error);
    }
  },

  /**
   * Crea notificación de reactivación
   */
  async createReactivationNotification(client, paymentId) {
    try {
      await db.NotificationQueue.create({
        userId: null,
        title: `Servicio Reactivado - ${client.firstName} ${client.lastName}`,
        message: `El servicio del cliente ha sido reactivado exitosamente.`,
        type: 'service_reactivation',
        priority: 'normal',
        metadata: {
          clientId: client.id,
          paymentId: paymentId,
          reactivatedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error creando notificación de reactivación:', error);
    }
  },

  /**
   * Registra evento de suspensión en historial
   */
  async logSuspensionEvent(clientId, reason, mikrotikResult) {
    try {
      // Aquí podrías crear un log más detallado si tienes una tabla de historial
      logger.info(`[HISTORIAL] Cliente ${clientId} suspendido - Razón: ${reason}`);
    } catch (error) {
      logger.error('Error registrando evento de suspensión:', error);
    }
  },

  /**
   * Registra evento de reactivación en historial
   */
  async logReactivationEvent(clientId, paymentId, mikrotikResult) {
    try {
      logger.info(`[HISTORIAL] Cliente ${clientId} reactivado - Pago: ${paymentId || 'N/A'}`);
    } catch (error) {
      logger.error('Error registrando evento de reactivación:', error);
    }
  },

  /**
   * Envía comunicación de suspensión al cliente
   */
  async sendSuspensionCommunication(client, reason) {
    try {
      // Aquí integrarías con tu sistema de emails/SMS
      if (client.email) {
          logger.info(`📧 Enviando notificación de suspensión a ${client.email}`);
      }
      // TODO: Implementar envío real de email usando plantillas
    } catch (error) {
      logger.error('Error enviando comunicación de suspensión:', error);
    }
  },

  /**
   * Envía comunicación de reactivación al cliente
   */
  async sendReactivationCommunication(client) {
    try {
       if (client.email) {
          logger.info(`📧 Enviando notificación de reactivación a ${client.email}`);
       }
      // TODO: Implementar envío real de email usando plantillas
    } catch (error) {
      logger.error('Error enviando comunicación de reactivación:', error);
    }
  },

  /**
   * Suspende servicios vencidos (para usar en job automático)
   * Nota: Este método debe ser llamado por un CRON job diariamente.
   */
  async suspendOverdueServices() {
    logger.info('🔍 Buscando servicios vencidos para suspender...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar clientes activos cuya fecha de pago haya vencido
      const overdueClients = await db.ClientBilling.findAll({
        where: {
          nextDueDate: {
            [db.Sequelize.Op.lt]: today // Fecha menor a hoy
          },
          clientStatus: 'active' // Solo suspender si está activo
        },
        include: [
          {
            model: db.Client,
            as: 'client',
            where: { active: true } // Y el cliente general está activo
          }
        ]
      });

      logger.info(`Encontrados ${overdueClients.length} clientes vencidos`);

      const results = {
        total: overdueClients.length,
        suspended: 0,
        failed: 0,
        errors: []
      };

      for (const clientBilling of overdueClients) {
        try {
          // Usar la lógica centralizada de suspensión
          await this.suspendClient(clientBilling.clientId, 'non_payment');
          results.suspended++;
          logger.info(`✅ Cliente ${clientBilling.clientId} suspendido automáticamente por falta de pago`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            clientId: clientBilling.clientId,
            error: error.message
          });
          logger.error(`❌ Error suspendiendo cliente ${clientBilling.clientId}:`, error.message);
        }
      }

      logger.info(`Suspensión automática completada: ${results.suspended} suspendidos, ${results.failed} fallidos`);

      return results;

    } catch (error) {
      logger.error('Error en suspensión automática de servicios:', error);
      throw error;
    }
  }
};

module.exports = ClientSuspensionService;