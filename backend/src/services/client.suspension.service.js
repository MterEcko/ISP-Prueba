// backend/src/services/client.suspension.service.js
// Servicio para suspender/reactivar servicios de clientes integrando MikroTik

const db = require('../models');
const logger = require('../config/logger');

// Importar servicio de MikroTik (usar mock si está habilitado)
const useMock = process.env.MIKROTIK_MOCK_MODE === 'true';
const mikrotikService = useMock
  ? require('./mikrotik.mock.service')
  : require('./mikrotik.service');

const ClientSuspensionService = {
  /**
   * Suspende el servicio de un cliente
   * - Actualiza estado en BD
   * - Desactiva usuario PPPoE en MikroTik o lo mueve de pool según configuración del paquete
   * - Crea notificación
   * - Registra en historial
   */
  async suspendClient(clientId, reason = 'non_payment') {
    logger.info(`Iniciando suspensión de cliente ${clientId}. Razón: ${reason}`);

    try {
      // 1. Obtener información del cliente con su paquete de servicio
      const client = await db.Client.findByPk(clientId, {
        include: [
          {
            model: db.ClientBilling,
            as: 'billing',
            include: [
              {
                model: db.ServicePackage,
                as: 'servicePackage'
              }
            ]
          },
          {
            model: db.ClientNetwork,
            as: 'network'
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // 2. Verificar si ya está suspendido
      if (client.billing && client.billing.clientStatus === 'suspended') {
        logger.warn(`Cliente ${clientId} ya está suspendido`);
        return {
          success: true,
          alreadySuspended: true,
          message: 'Cliente ya estaba suspendido'
        };
      }

      // 3. Actualizar estado en la base de datos
      await db.ClientBilling.update(
        {
          clientStatus: 'suspended',
          suspensionDate: new Date(),
          suspensionReason: reason
        },
        { where: { clientId } }
      );

      // 4. Aplicar acción de suspensión en MikroTik según configuración del paquete
      let mikrotikResult = null;
      if (client.network && client.network.pppoeUsername) {
        const servicePackage = client.billing?.servicePackage;
        const suspensionAction = servicePackage?.suspensionAction || 'disable';

        logger.info(`Configuración de suspensión del paquete: ${suspensionAction}`);

        if (suspensionAction === 'move_pool' && servicePackage?.suspendedPoolName) {
          // Mover usuario a pool de suspendidos
          mikrotikResult = await this.movePPPoEUserToPool(
            client.network,
            servicePackage.suspendedPoolName
          );
        } else {
          // Desactivar usuario (comportamiento por defecto)
          mikrotikResult = await this.disablePPPoEUser(client.network);
        }
      }

      // 5. Crear notificación
      await this.createSuspensionNotification(client, reason);

      // 6. Registrar en historial
      await this.logSuspensionEvent(clientId, reason, mikrotikResult);

      // 7. Enviar comunicación al cliente (email/SMS)
      await this.sendSuspensionCommunication(client, reason);

      logger.info(`✅ Cliente ${clientId} suspendido correctamente`);

      return {
        success: true,
        clientId: clientId,
        reason: reason,
        mikrotikDisabled: !!mikrotikResult,
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
   * - Reactiva usuario PPPoE en MikroTik
   * - Restaura pool original si fue movido durante la suspensión
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
            as: 'billing',
            include: [
              {
                model: db.ServicePackage,
                as: 'servicePackage'
              }
            ]
          },
          {
            model: db.ClientNetwork,
            as: 'network'
          }
        ]
      });

      if (!client) {
        throw new Error(`Cliente ${clientId} no encontrado`);
      }

      // 2. Verificar si está suspendido
      if (client.billing && client.billing.clientStatus !== 'suspended') {
        logger.warn(`Cliente ${clientId} no está suspendido`);
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

      // 4. Reactivar usuario PPPoE en MikroTik (si existe)
      let mikrotikResult = null;
      if (client.network && client.network.pppoeUsername) {
        const servicePackage = client.billing?.servicePackage;
        const wasMovedToPool = servicePackage?.suspensionAction === 'move_pool' && client.billing?.originalPoolName;

        if (wasMovedToPool) {
          // Restaurar pool original
          mikrotikResult = await this.restorePPPoEUserPool(
            client.network,
            client.billing.originalPoolName
          );

          // Limpiar el pool original después de restaurarlo
          await db.ClientBilling.update(
            { originalPoolName: null },
            { where: { clientId } }
          );
        } else {
          // Solo habilitar el usuario (comportamiento original)
          mikrotikResult = await this.enablePPPoEUser(client.network);
        }
      }

      // 5. Crear notificación
      await this.createReactivationNotification(client, paymentId);

      // 6. Registrar en historial
      await this.logReactivationEvent(clientId, paymentId, mikrotikResult);

      // 7. Enviar comunicación al cliente
      await this.sendReactivationCommunication(client);

      logger.info(`✅ Cliente ${clientId} reactivado correctamente`);

      return {
        success: true,
        clientId: clientId,
        mikrotikEnabled: !!mikrotikResult,
        reactivatedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error reactivando cliente ${clientId}:`, error);
      throw error;
    }
  },

  /**
   * Desactiva usuario PPPoE en MikroTik
   */
  async disablePPPoEUser(clientNetwork) {
    try {
      const router = await db.MikrotikRouter.findByPk(clientNetwork.routerId);

      if (!router) {
        logger.warn('Router MikroTik no encontrado, saltando desactivación PPPoE');
        return null;
      }

      logger.info(`Desactivando usuario PPPoE: ${clientNetwork.pppoeUsername} en ${router.ipAddress}`);

      // Actualizar usuario para deshabilitarlo
      const result = await mikrotikService.updatePPPoEUser(
        router.ipAddress,
        router.apiPort || 8728,
        router.username,
        router.password,
        clientNetwork.pppoeUsername,
        { disabled: true }  // Deshabilitar usuario
      );

      logger.info(`Usuario PPPoE ${clientNetwork.pppoeUsername} desactivado`);

      return result;

    } catch (error) {
      logger.error(`Error desactivando usuario PPPoE: ${error.message}`);
      // No lanzamos error para que la suspensión continúe aunque falle MikroTik
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Reactiva usuario PPPoE en MikroTik
   */
  async enablePPPoEUser(clientNetwork) {
    try {
      const router = await db.MikrotikRouter.findByPk(clientNetwork.routerId);

      if (!router) {
        logger.warn('Router MikroTik no encontrado, saltando reactivación PPPoE');
        return null;
      }

      logger.info(`Reactivando usuario PPPoE: ${clientNetwork.pppoeUsername} en ${router.ipAddress}`);

      // Actualizar usuario para habilitarlo
      const result = await mikrotikService.updatePPPoEUser(
        router.ipAddress,
        router.apiPort || 8728,
        router.username,
        router.password,
        clientNetwork.pppoeUsername,
        { disabled: false }  // Habilitar usuario
      );

      logger.info(`Usuario PPPoE ${clientNetwork.pppoeUsername} reactivado`);

      return result;

    } catch (error) {
      logger.error(`Error reactivando usuario PPPoE: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Restaura usuario PPPoE a su pool original
   */
  async restorePPPoEUserPool(clientNetwork, originalPoolName) {
    try {
      const router = await db.MikrotikRouter.findByPk(clientNetwork.routerId);

      if (!router) {
        logger.warn('Router MikroTik no encontrado, saltando restauración de pool');
        return null;
      }

      logger.info(`Restaurando usuario PPPoE: ${clientNetwork.pppoeUsername} al pool original: ${originalPoolName} en ${router.ipAddress}`);

      // Actualizar usuario para restaurar pool original y habilitarlo
      const result = await mikrotikService.updatePPPoEUser(
        router.ipAddress,
        router.apiPort || 8728,
        router.username,
        router.password,
        clientNetwork.pppoeUsername,
        {
          remoteAddress: originalPoolName,  // Restaurar pool original
          disabled: false  // Habilitar usuario
        }
      );

      logger.info(`Usuario PPPoE ${clientNetwork.pppoeUsername} restaurado al pool ${originalPoolName} y habilitado`);

      return result;

    } catch (error) {
      logger.error(`Error restaurando usuario PPPoE a pool original: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Mueve usuario PPPoE a un pool específico (para suspendidos)
   */
  async movePPPoEUserToPool(clientNetwork, poolName) {
    try {
      const router = await db.MikrotikRouter.findByPk(clientNetwork.routerId);

      if (!router) {
        logger.warn('Router MikroTik no encontrado, saltando movimiento de pool');
        return null;
      }

      logger.info(`Moviendo usuario PPPoE: ${clientNetwork.pppoeUsername} al pool: ${poolName} en ${router.ipAddress}`);

      // Obtener información actual del usuario para guardar el pool original
      const currentUser = await mikrotikService.getPPPoEUserByUsername(
        router.ipAddress,
        router.apiPort || 8728,
        router.username,
        router.password,
        clientNetwork.pppoeUsername
      );

      // Guardar pool original en ClientBilling para poder restaurarlo después
      if (currentUser && currentUser.remoteAddress) {
        const clientBilling = await db.ClientBilling.findOne({
          where: { clientId: clientNetwork.clientId }
        });

        if (clientBilling) {
          await clientBilling.update({
            originalPoolName: currentUser.remoteAddress
          });
          logger.info(`Pool original guardado: ${currentUser.remoteAddress}`);
        }
      }

      // Actualizar usuario para mover a pool de suspendidos
      const result = await mikrotikService.updatePPPoEUser(
        router.ipAddress,
        router.apiPort || 8728,
        router.username,
        router.password,
        clientNetwork.pppoeUsername,
        { remoteAddress: poolName }  // Mover a pool de suspendidos
      );

      logger.info(`Usuario PPPoE ${clientNetwork.pppoeUsername} movido al pool ${poolName}`);

      return result;

    } catch (error) {
      logger.error(`Error moviendo usuario PPPoE a pool: ${error.message}`);
      // No lanzamos error para que la suspensión continúe aunque falle MikroTik
      return {
        success: false,
        error: error.message
      };
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

      if (mikrotikResult) {
        logger.info(`[HISTORIAL] PPPoE desactivado: ${mikrotikResult.success ? 'Sí' : 'No'}`);
      }
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

      if (mikrotikResult) {
        logger.info(`[HISTORIAL] PPPoE reactivado: ${mikrotikResult.success ? 'Sí' : 'No'}`);
      }
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
      logger.info(`📧 Enviando notificación de suspensión a ${client.email}`);

      // TODO: Implementar envío real de email usando plantillas
      // const emailService = require('./email.service');
      // await emailService.sendTemplate('service_suspended', client.email, {
      //   firstName: client.firstName,
      //   reason: reason,
      //   suspensionDate: new Date()
      // });

    } catch (error) {
      logger.error('Error enviando comunicación de suspensión:', error);
    }
  },

  /**
   * Envía comunicación de reactivación al cliente
   */
  async sendReactivationCommunication(client) {
    try {
      logger.info(`📧 Enviando notificación de reactivación a ${client.email}`);

      // TODO: Implementar envío real de email usando plantillas

    } catch (error) {
      logger.error('Error enviando comunicación de reactivación:', error);
    }
  },

  /**
   * Suspende servicios vencidos (para usar en job automático)
   */
  async suspendOverdueServices() {
    logger.info('🔍 Buscando servicios vencidos para suspender...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueClients = await db.ClientBilling.findAll({
        where: {
          nextDueDate: {
            [db.Sequelize.Op.lt]: today
          },
          clientStatus: 'active'
        },
        include: [
          {
            model: db.Client,
            as: 'client',
            where: { active: true }
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
          await this.suspendClient(clientBilling.clientId, 'non_payment');
          results.suspended++;
          logger.info(`✅ Cliente ${clientBilling.clientId} suspendido`);
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
