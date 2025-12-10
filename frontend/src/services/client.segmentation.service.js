// backend/src/services/client.segmentation.service.js
// Servicio para gestionar segmentación automática de clientes (morosos, etc.)

const db = require('../models');
const logger = require('../config/logger');

const ClientSegmentationService = {
  /**
   * Obtiene la configuración de segmentos desde SystemConfiguration
   */
  async getSegmentsConfig() {
    try {
      const config = await db.SystemConfiguration.findOne({
        where: { key: 'client_segments' }
      });

      if (!config || !config.value) {
        // Segmentos por defecto
        return [
          { name: 'Activo', color: '#4CAF50', autoMove: false, description: 'Clientes al día' },
          { name: 'Moroso', color: '#f44336', autoMove: true, daysOverdue: 5, description: 'Clientes con pagos vencidos' },
          { name: 'Suspendido', color: '#FF9800', autoMove: true, daysOverdue: 15, description: 'Servicio suspendido' },
          { name: 'Nuevo', color: '#2196F3', autoMove: false, description: 'Clientes nuevos' },
          { name: 'VIP', color: '#9C27B0', autoMove: false, description: 'Clientes preferentes' }
        ];
      }

      return JSON.parse(config.value);
    } catch (error) {
      logger.error('Error obteniendo configuración de segmentos:', error);
      return [];
    }
  },

  /**
   * Obtiene el segmento actual de un cliente
   */
  async getClientSegment(clientId) {
    try {
      const client = await db.Client.findByPk(clientId, {
        include: [
          {
            model: db.ClientBilling,
            as: 'billing'
          }
        ]
      });

      if (!client || !client.billing) {
        return null;
      }

      return client.billing.segment || 'Activo';
    } catch (error) {
      logger.error(`Error obteniendo segmento de cliente ${clientId}:`, error);
      return null;
    }
  },

  /**
   * Mueve un cliente a un segmento específico
   */
  async moveClientToSegment(clientId, segmentName, reason = null) {
    try {
      logger.info(`Moviendo cliente ${clientId} a segmento: ${segmentName}`);

      const billing = await db.ClientBilling.findOne({
        where: { clientId }
      });

      if (!billing) {
        throw new Error(`No se encontró información de facturación para cliente ${clientId}`);
      }

      const previousSegment = billing.segment || 'Activo';

      await billing.update({
        segment: segmentName,
        segmentChangedAt: new Date(),
        segmentChangeReason: reason
      });

      // Registrar el cambio en historial
      await this.logSegmentChange(clientId, previousSegment, segmentName, reason);

      // Crear notificación
      await this.createSegmentNotification(clientId, segmentName);

      logger.info(`✅ Cliente ${clientId} movido de "${previousSegment}" a "${segmentName}"`);

      return {
        success: true,
        clientId,
        previousSegment,
        newSegment: segmentName,
        movedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error moviendo cliente ${clientId} a segmento:`, error);
      throw error;
    }
  },

  /**
   * Proceso automático: mueve clientes morosos según días de retraso
   */
  async processAutoSegmentation() {
    logger.info('🔍 Iniciando proceso de segmentación automática...');

    try {
      const segments = await this.getSegmentsConfig();
      const autoMoveSegments = segments.filter(s => s.autoMove);

      if (autoMoveSegments.length === 0) {
        logger.info('No hay segmentos configurados para movimiento automático');
        return { processed: 0, moved: 0 };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let processed = 0;
      let moved = 0;

      // Obtener todos los clientes activos con información de facturación
      const clients = await db.ClientBilling.findAll({
        where: {
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

      logger.info(`Procesando ${clients.length} clientes activos...`);

      for (const clientBilling of clients) {
        processed++;

        // Calcular días de retraso
        const daysOverdue = this.calculateDaysOverdue(clientBilling.nextDueDate);

        if (daysOverdue <= 0) {
          // Cliente al día - mover a "Activo" si no está ya
          if (clientBilling.segment !== 'Activo') {
            await this.moveClientToSegment(
              clientBilling.clientId,
              'Activo',
              'Cliente al día en pagos'
            );
            moved++;
          }
          continue;
        }

        // Determinar segmento apropiado según días de retraso
        const appropriateSegment = this.determineSegmentByDaysOverdue(
          daysOverdue,
          autoMoveSegments
        );

        if (appropriateSegment && clientBilling.segment !== appropriateSegment.name) {
          await this.moveClientToSegment(
            clientBilling.clientId,
            appropriateSegment.name,
            `Movido automáticamente - ${daysOverdue} días de retraso`
          );
          moved++;
        }
      }

      logger.info(`✅ Segmentación automática completada: ${processed} procesados, ${moved} movidos`);

      return {
        processed,
        moved,
        segments: autoMoveSegments.map(s => s.name)
      };

    } catch (error) {
      logger.error('Error en proceso de segmentación automática:', error);
      throw error;
    }
  },

  /**
   * Calcula días de retraso desde fecha de vencimiento
   */
  calculateDaysOverdue(dueDate) {
    if (!dueDate) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  },

  /**
   * Determina el segmento apropiado según días de retraso
   */
  determineSegmentByDaysOverdue(daysOverdue, autoMoveSegments) {
    // Ordenar segmentos por días de retraso (mayor a menor)
    const sortedSegments = autoMoveSegments
      .filter(s => s.daysOverdue)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Encontrar el primer segmento que aplique
    for (const segment of sortedSegments) {
      if (daysOverdue >= segment.daysOverdue) {
        return segment;
      }
    }

    return null;
  },

  /**
   * Registra cambio de segmento en log
   */
  async logSegmentChange(clientId, previousSegment, newSegment, reason) {
    try {
      logger.info(`[HISTORIAL] Cliente ${clientId}: "${previousSegment}" → "${newSegment}". Razón: ${reason || 'N/A'}`);

      // Aquí podrías crear un registro en una tabla de historial si existe
      // await db.ClientSegmentHistory.create({
      //   clientId,
      //   previousSegment,
      //   newSegment,
      //   reason,
      //   changedAt: new Date()
      // });

    } catch (error) {
      logger.error('Error registrando cambio de segmento:', error);
    }
  },

  /**
   * Crea notificación de cambio de segmento
   */
  async createSegmentNotification(clientId, segmentName) {
    try {
      const client = await db.Client.findByPk(clientId);

      if (!client) return;

      await db.NotificationQueue.create({
        userId: null,
        title: `Cliente movido a segmento: ${segmentName}`,
        message: `${client.firstName} ${client.lastName} ha sido movido al segmento "${segmentName}"`,
        type: 'segment_change',
        priority: segmentName === 'Moroso' || segmentName === 'Suspendido' ? 'high' : 'normal',
        metadata: {
          clientId: client.id,
          segment: segmentName,
          changedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Error creando notificación de cambio de segmento:', error);
    }
  },

  /**
   * Obtiene estadísticas de clientes por segmento
   */
  async getSegmentStatistics() {
    try {
      const clients = await db.ClientBilling.findAll({
        attributes: [
          'segment',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('clientId')), 'count']
        ],
        group: ['segment']
      });

      const stats = {};
      clients.forEach(c => {
        stats[c.segment || 'Sin segmento'] = parseInt(c.dataValues.count);
      });

      return stats;

    } catch (error) {
      logger.error('Error obteniendo estadísticas de segmentos:', error);
      return {};
    }
  }
};

module.exports = ClientSegmentationService;
