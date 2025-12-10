const db = require('../models');
const logger = require('../utils/logger');
const moment = require('moment');
const notificationService = require('./notification.service');
const inventoryService = require('./inventory.service');
const path = require('path');
const fs = require('fs').promises;

class TicketService {
  constructor() {
    this.assignmentQueue = [];
    this.escalationRules = {
      'critical': { hours: 2, escalateToRole: 'admin' },
      'high': { hours: 4, escalateToRole: 'admin' },
      'medium': { hours: 24, escalateToRole: 'tecnico' },
      'low': { hours: 48, escalateToRole: 'tecnico' }
    };
  }

  /**
   * Crea un nuevo ticket con archivos adjuntos
   * @param {Object} ticketData - Datos del ticket
   * @param {Array} attachments - Archivos adjuntos
   * @returns {Promise<Object>} Ticket creado
   */
  async createTicket(ticketData, attachments = []) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Validar cliente existe
      const client = await db.Client.findByPk(ticketData.clientId, { transaction });
      if (!client) {
        throw new Error(`Cliente ${ticketData.clientId} no encontrado`);
      }

      // Validar tipo de ticket
      const ticketType = await db.TicketType.findByPk(ticketData.ticketTypeId, { transaction });
      if (!ticketType) {
        throw new Error(`Tipo de ticket ${ticketData.ticketTypeId} no encontrado`);
      }

      // Generar número único de ticket
      const ticketNumber = await this.generateTicketNumber();

      // Crear ticket
      const ticket = await db.Ticket.create({
        ...ticketData,
        title: ticketData.title || `${ticketType.name} - ${client.firstName} ${client.lastName}`,
        status: 'open',
        priority: ticketData.priority || this.calculatePriorityByType(ticketType.category),
        estimatedCost: ticketType.estimatedDurationHours * 500, // $500/hora base
        ticketNumber: ticketNumber
      }, { transaction });

      // Procesar archivos adjuntos
      const processedAttachments = [];
      for (const attachment of attachments) {
        const savedAttachment = await this.saveAttachment(ticket.id, attachment, transaction);
        processedAttachments.push(savedAttachment);
      }

      // Auto-asignar técnico si es posible
      const assignedTechnician = await this.autoAssignTechnician(ticket, transaction);
      if (assignedTechnician) {
        await ticket.update({ assignedToId: assignedTechnician.id }, { transaction });
      }

      // Programar instalación si es ticket de instalación
      if (ticketType.category === 'installation') {
        const scheduledDate = await this.suggestInstallationDate();
        await ticket.update({ 
          scheduledDate: scheduledDate,
          scheduledTime: '09:00'
        }, { transaction });
      }

      await transaction.commit();

      // Cargar ticket completo
      const completeTicket = await this.getTicketById(ticket.id);

      // Enviar notificaciones
      await this.sendTicketNotifications(completeTicket, 'created');

      logger.info(`Ticket ${ticket.id} creado para cliente ${ticketData.clientId}`);

      return {
        success: true,
        data: completeTicket,
        message: 'Ticket creado exitosamente',
        attachments: processedAttachments
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Asigna técnico a un ticket
   * @param {number} ticketId - ID del ticket
   * @param {number} technicianId - ID del técnico
   * @param {number} assignedById - ID del usuario que asigna
   * @returns {Promise<Object>} Resultado de la asignación
   */
  async assignTechnician(ticketId, technicianId, assignedById) {
    const transaction = await db.sequelize.transaction();

    try {
      const ticket = await db.Ticket.findByPk(ticketId, { 
        include: [
          { model: db.Client, as: 'client' },
          { model: db.TicketType, as: 'ticketType' }
        ],
        transaction 
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      const technician = await db.User.findByPk(technicianId, {
        include: [{ model: db.Role }],
        transaction
      });

      if (!technician || !['tecnico', 'admin'].includes(technician.Role.name)) {
        throw new Error(`Técnico ${technicianId} no encontrado o sin permisos`);
      }

      // Verificar disponibilidad del técnico
      const isAvailable = await this.checkTechnicianAvailability(technicianId, ticket.scheduledDate);
      if (!isAvailable) {
        logger.warn(`Técnico ${technicianId} no disponible para la fecha programada`);
      }

      // Actualizar ticket
      await ticket.update({
        assignedToId: technicianId,
        status: ticket.status === 'open' ? 'inProgress' : ticket.status
      }, { transaction });

      // Crear comentario de asignación
      await db.TicketComment.create({
        ticketId: ticketId,
        userId: assignedById,
        content: `Ticket asignado a ${technician.fullName}`,
        isInternal: true
      }, { transaction });

      await transaction.commit();

      // Notificar al técnico
      await this.notifyTechnicianAssignment(ticket, technician);

      logger.info(`Ticket ${ticketId} asignado a técnico ${technicianId}`);

      return {
        success: true,
        message: 'Técnico asignado exitosamente',
        technician: {
          id: technician.id,
          name: technician.fullName,
          available: isAvailable
        }
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error asignando técnico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un ticket
   * @param {number} ticketId - ID del ticket
   * @param {string} status - Nuevo estado
   * @param {string} notes - Notas del cambio
   * @param {number} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateTicketStatus(ticketId, status, notes = '', userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const ticket = await db.Ticket.findByPk(ticketId, {
        include: [
          { model: db.Client, as: 'client' },
          { model: db.User, as: 'assignedTo' }
        ],
        transaction
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      const oldStatus = ticket.status;
      const updateData = { status };

      // Lógica específica por estado
      if (status === 'resolved') {
        updateData.resolvedAt = new Date();
        updateData.resolutionNotes = notes;
      } else if (status === 'closed') {
        updateData.closedAt = new Date();
        if (!ticket.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }

      await ticket.update(updateData, { transaction });

      // Crear comentario del cambio de estado
      await db.TicketComment.create({
        ticketId: ticketId,
        userId: userId,
        content: `Estado cambiado de ${oldStatus} a ${status}${notes ? `. Notas: ${notes}` : ''}`,
        isInternal: false
      }, { transaction });

      // Si se resuelve, calcular costo real si es instalación
      if (status === 'resolved' && ticket.category === 'installation') {
        const actualCost = await this.calculateActualInstallationCost(ticketId);
        await ticket.update({ actualCost }, { transaction });
      }

      await transaction.commit();

      // Enviar notificaciones
      await this.sendTicketNotifications(ticket, 'statusUpdated', { oldStatus, newStatus: status });

      logger.info(`Ticket ${ticketId} actualizado de ${oldStatus} a ${status}`);

      return {
        success: true,
        message: 'Estado del ticket actualizado',
        oldStatus: oldStatus,
        newStatus: status
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error actualizando estado del ticket: ${error.message}`);
      throw error;
    }
  }

  /**
   * Programa una cita para un ticket
   * @param {number} ticketId - ID del ticket
   * @param {string} date - Fecha de la cita (YYYY-MM-DD)
   * @param {string} time - Hora de la cita (HH:mm)
   * @param {number} userId - ID del usuario que programa
   * @returns {Promise<Object>} Resultado de la programación
   */
  async scheduleAppointment(ticketId, date, time, userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const ticket = await db.Ticket.findByPk(ticketId, {
        include: [
          { model: db.Client, as: 'client' },
          { model: db.User, as: 'assignedTo' }
        ],
        transaction
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      // Validar que la fecha no sea en el pasado
      const appointmentDate = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
      if (appointmentDate.isBefore(moment())) {
        throw new Error('No se puede programar una cita en el pasado');
      }

      // Verificar disponibilidad del técnico
      if (ticket.assignedToId) {
        const isAvailable = await this.checkTechnicianAvailability(ticket.assignedToId, date, time);
        if (!isAvailable) {
          throw new Error('El técnico no está disponible en esa fecha y hora');
        }
      }

      await ticket.update({
        scheduledDate: date,
        scheduledTime: time
      }, { transaction });

      // Crear comentario de programación
      await db.TicketComment.create({
        ticketId: ticketId,
        userId: userId,
        content: `Cita programada para ${appointmentDate.format('DD/MM/YYYY')} a las ${time}`,
        isInternal: false
      }, { transaction });

      await transaction.commit();

      // Enviar notificación de instalación programada
      if (ticket.client) {
        try {
          await notificationService.sendInstallationScheduled(ticket.clientId, ticketId);
        } catch (notificationError) {
          logger.warn(`Error enviando notificación de cita programada: ${notificationError.message}`);
        }
      }

      logger.info(`Cita programada para ticket ${ticketId}: ${date} ${time}`);

      return {
        success: true,
        message: 'Cita programada exitosamente',
        appointmentDate: appointmentDate.format('DD/MM/YYYY HH:mm')
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error programando cita: ${error.message}`);
      throw error;
    }
  }

  /**
   * Añade un comentario a un ticket
   * @param {number} ticketId - ID del ticket
   * @param {number} userId - ID del usuario que comenta
   * @param {string} content - Contenido del comentario
   * @param {boolean} isInternal - Si es comentario interno
   * @returns {Promise<Object>} Comentario creado
   */
  async addComment(ticketId, userId, content, isInternal = false) {
    try {
      const ticket = await db.Ticket.findByPk(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error(`Usuario ${userId} no encontrado`);
      }

      const comment = await db.TicketComment.create({
        ticketId: ticketId,
        userId: userId,
        content: content,
        isInternal: isInternal
      });

      // Cargar comentario con usuario
      const completeComment = await db.TicketComment.findByPk(comment.id, {
        include: [{ model: db.User, attributes: ['id', 'fullName'] }]
      });

      logger.info(`Comentario agregado al ticket ${ticketId} por usuario ${userId}`);

      return {
        success: true,
        data: completeComment,
        message: 'Comentario agregado exitosamente'
      };
    } catch (error) {
      logger.error(`Error agregando comentario: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene tickets con filtros y paginación
   * @param {Object} filters - Filtros de búsqueda
   * @param {Object} pagination - Parámetros de paginación
   * @returns {Promise<Object>} Lista de tickets
   */
  async getTickets(filters = {}, pagination = {}) {
    try {
      const { page = 1, size = 10 } = pagination;
      const limit = parseInt(size);
      const offset = (parseInt(page) - 1) * limit;

      // Construir condiciones de filtrado
      const where = {};
      
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.assignedToId) where.assignedToId = filters.assignedToId;
      if (filters.clientId) where.clientId = filters.clientId;
      if (filters.ticketTypeId) where.ticketTypeId = filters.ticketTypeId;
      
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt[db.Sequelize.Op.gte] = new Date(filters.dateFrom);
        if (filters.dateTo) where.createdAt[db.Sequelize.Op.lte] = new Date(filters.dateTo);
      }

      // Búsqueda por texto
      if (filters.search) {
        where[db.Sequelize.Op.or] = [
          { title: { [db.Sequelize.Op.iLike]: `%${filters.search}%` } },
          { description: { [db.Sequelize.Op.iLike]: `%${filters.search}%` } },
          { ticketNumber: { [db.Sequelize.Op.iLike]: `%${filters.search}%` } }
        ];
      }

      const { count, rows: tickets } = await db.Ticket.findAndCountAll({
        where,
        limit,
        offset,
        include: [
          { 
            model: db.Client, 
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'phone', 'address']
          },
          { 
            model: db.User, 
            as: 'assignedTo',
            attributes: ['id', 'fullName']
          },
          { 
            model: db.TicketType, 
            as: 'ticketType',
            attributes: ['id', 'name', 'category']
          }
        ],
        order: [
          ['priority', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });

      return {
        success: true,
        data: {
          tickets: tickets,
          totalItems: count,
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          pageSize: limit
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo tickets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula el costo real de un ticket
   * @param {number} ticketId - ID del ticket
   * @returns {Promise<number>} Costo calculado
   */
  async calculateTicketCost(ticketId) {
    try {
      const ticket = await db.Ticket.findByPk(ticketId, {
        include: [
          { model: db.TicketType, as: 'ticketType' },
          { model: db.InstallationMaterial, as: 'materials' }
        ]
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      let totalCost = 0;

      // Costo base por horas
      const hourlyRate = 500; // $500 por hora
      const estimatedHours = ticket.ticketType?.estimatedDurationHours || 2;
      totalCost += estimatedHours * hourlyRate;

      // Costo de materiales
      if (ticket.materials && ticket.materials.length > 0) {
        for (const material of ticket.materials) {
          const item = await inventoryService.getInventoryItem(material.itemId);
          if (item.data) {
            totalCost += item.data.unitPrice * material.quantityUsed;
          }
        }
      }

      return totalCost;
    } catch (error) {
      logger.error(`Error calculando costo del ticket ${ticketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera orden de trabajo para un ticket
   * @param {number} ticketId - ID del ticket
   * @returns {Promise<Object>} Orden de trabajo generada
   */
  async generateWorkOrder(ticketId) {
    try {
      const ticket = await db.Ticket.findByPk(ticketId, {
        include: [
          { model: db.Client, as: 'client' },
          { model: db.User, as: 'assignedTo' },
          { model: db.TicketType, as: 'ticketType' },
          { model: db.InstallationMaterial, as: 'materials' }
        ]
      });

      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      // Obtener materiales necesarios
      const requiredMaterials = await this.getRequiredMaterials(ticket.ticketTypeId);

      const workOrder = {
        ticketNumber: ticket.ticketNumber || `T-${ticket.id}`,
        client: {
          name: `${ticket.client.firstName} ${ticket.client.lastName}`,
          address: ticket.client.address,
          phone: ticket.client.phone,
          coordinates: {
            lat: ticket.client.latitude,
            lng: ticket.client.longitude
          }
        },
        technician: ticket.assignedTo ? {
          name: ticket.assignedTo.fullName,
          phone: ticket.assignedTo.phone
        } : null,
        schedule: {
          date: ticket.scheduledDate,
          time: ticket.scheduledTime
        },
        workDetails: {
          type: ticket.ticketType?.name || 'Servicio general',
          description: ticket.description,
          estimatedDuration: ticket.ticketType?.estimatedDurationHours || 2,
          priority: ticket.priority
        },
        materials: requiredMaterials,
        instructions: this.generateWorkInstructions(ticket.ticketType),
        estimatedCost: ticket.estimatedCost,
        generatedAt: new Date()
      };

      logger.info(`Orden de trabajo generada para ticket ${ticketId}`);

      return {
        success: true,
        data: workOrder,
        message: 'Orden de trabajo generada'
      };
    } catch (error) {
      logger.error(`Error generando orden de trabajo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene métricas de tickets por período
   * @param {string} period - Período (week, month, quarter, year)
   * @returns {Promise<Object>} Métricas calculadas
   */
  async getTicketMetrics(period = 'month') {
    try {
      const startDate = moment().subtract(1, period).toDate();
      const endDate = new Date();

      // Métricas básicas
      const totalTickets = await db.Ticket.count({
        where: {
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        }
      });

      const ticketsByStatus = await db.Ticket.findAll({
        attributes: [
          'status',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        },
        group: ['status'],
        raw: true
      });

      const ticketsByPriority = await db.Ticket.findAll({
        attributes: [
          'priority',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']
        ],
        where: {
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        },
        group: ['priority'],
        raw: true
      });

      // Tiempo promedio de resolución
      const resolvedTickets = await db.Ticket.findAll({
        attributes: [
          [db.Sequelize.fn('AVG', 
            db.Sequelize.literal('EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt"))/3600')
          ), 'avgResolutionHours']
        ],
        where: {
          resolvedAt: { [db.Sequelize.Op.not]: null },
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        },
        raw: true
      });

      // Tickets por técnico
      const ticketsByTechnician = await db.Ticket.findAll({
        attributes: [
          'assignedToId',
          [db.Sequelize.fn('COUNT', db.Sequelize.col('Ticket.id')), 'count']
        ],
        include: [{
          model: db.User,
          as: 'assignedTo',
          attributes: ['fullName']
        }],
        where: {
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] },
          assignedToId: { [db.Sequelize.Op.not]: null }
        },
        group: ['assignedToId', 'assignedTo.id', 'assignedTo.fullName']
      });

      return {
        success: true,
        data: {
          period: period,
          dateRange: { startDate, endDate },
          totalTickets: totalTickets,
          byStatus: ticketsByStatus,
          byPriority: ticketsByPriority,
          avgResolutionHours: parseFloat(resolvedTickets[0]?.avgResolutionHours || 0),
          byTechnician: ticketsByTechnician
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo métricas de tickets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene rendimiento de un técnico
   * @param {number} technicianId - ID del técnico
   * @param {string} period - Período a evaluar
   * @returns {Promise<Object>} Métricas del técnico
   */
  async getTechnicianPerformance(technicianId, period = 'month') {
    try {
      const startDate = moment().subtract(1, period).toDate();
      const endDate = new Date();

      const technician = await db.User.findByPk(technicianId);
      if (!technician) {
        throw new Error(`Técnico ${technicianId} no encontrado`);
      }

      const tickets = await db.Ticket.findAll({
        where: {
          assignedToId: technicianId,
          createdAt: { [db.Sequelize.Op.between]: [startDate, endDate] }
        },
        include: [{ model: db.TicketType, as: 'ticketType' }]
      });

      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      const resolutionRate = totalTickets > 0 ? (resolvedTickets.length / totalTickets * 100) : 0;

      // Tiempo promedio de resolución
      const avgResolutionTime = resolvedTickets
        .filter(t => t.resolvedAt)
        .reduce((sum, ticket) => {
          const hours = moment(ticket.resolvedAt).diff(moment(ticket.createdAt), 'hours');
          return sum + hours;
        }, 0) / resolvedTickets.length || 0;

      // Tickets por tipo
      const ticketsByType = tickets.reduce((acc, ticket) => {
        const type = ticket.ticketType?.name || 'Sin tipo';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        data: {
          technician: {
            id: technician.id,
            name: technician.fullName
          },
          period: period,
          totalTickets: totalTickets,
          resolvedTickets: resolvedTickets.length,
          resolutionRate: Math.round(resolutionRate * 100) / 100,
          avgResolutionHours: Math.round(avgResolutionTime * 100) / 100,
          ticketsByType: ticketsByType
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo rendimiento del técnico: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-asigna tickets basado en disponibilidad y carga de trabajo
   * @returns {Promise<Object>} Resultado de la auto-asignación
   */
  async autoAssignTickets() {
    try {
      // Obtener tickets sin asignar
      const unassignedTickets = await db.Ticket.findAll({
        where: {
          assignedToId: null,
          status: 'open'
        },
        include: [{ model: db.TicketType, as: 'ticketType' }],
        order: [['priority', 'DESC'], ['createdAt', 'ASC']]
      });

      if (unassignedTickets.length === 0) {
        return {
          success: true,
          message: 'No hay tickets sin asignar',
          assignedCount: 0
        };
      }

      // Obtener técnicos disponibles
      const technicians = await db.User.findAll({
        include: [{
          model: db.Role,
          where: { name: ['tecnico', 'admin'] }
        }],
        where: { active: true }
      });

      const results = [];
      
      for (const ticket of unassignedTickets) {
        try {
          const bestTechnician = await this.findBestTechnician(ticket, technicians);
          if (bestTechnician) {
            await this.assignTechnician(ticket.id, bestTechnician.id, 1); // Sistema auto-asigna
            results.push({ ticketId: ticket.id, technicianId: bestTechnician.id, success: true });
          } else {
            results.push({ ticketId: ticket.id, success: false, reason: 'No hay técnicos disponibles' });
          }
        } catch (error) {
          results.push({ ticketId: ticket.id, success: false, reason: error.message });
        }
      }

      const assignedCount = results.filter(r => r.success).length;

      logger.info(`Auto-asignación completada: ${assignedCount}/${unassignedTickets.length} tickets asignados`);

      return {
        success: true,
        message: 'Auto-asignación completada',
        assignedCount: assignedCount,
        totalTickets: unassignedTickets.length,
        results: results
      };
    } catch (error) {
      logger.error(`Error en auto-asignación de tickets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Escala tickets que han excedido el tiempo de respuesta
   * @returns {Promise<Object>} Resultado de la escalación
   */
  async escalateOverdueTickets() {
    try {
      const now = moment();
      const escalatedTickets = [];

      for (const [priority, rule] of Object.entries(this.escalationRules)) {
        const cutoffTime = now.clone().subtract(rule.hours, 'hours').toDate();

        const overdueTickets = await db.Ticket.findAll({
          where: {
            priority: priority,
            status: ['open', 'inProgress'],
            createdAt: { [db.Sequelize.Op.lt]: cutoffTime }
          },
          include: [
            { model: db.Client, as: 'client' },
            { model: db.User, as: 'assignedTo' }
          ]
        });

        for (const ticket of overdueTickets) {
          try {
            // Reasignar a rol superior si es necesario
            if (rule.escalateToRole === 'admin') {
              const admin = await this.findAvailableAdmin();
              if (admin && ticket.assignedToId !== admin.id) {
                await this.assignTechnician(ticket.id, admin.id, 1);
              }
            }

            // Crear comentario de escalación
            await db.TicketComment.create({
              ticketId: ticket.id,
              userId: 1, // Sistema
              content: `Ticket escalado por exceder tiempo de respuesta (${rule.hours} horas)`,
              isInternal: true
            });

            // Enviar alerta
            try {
              await notificationService.sendSystemAlert(
                `Ticket #${ticket.id} escalado por tiempo excedido (${priority})`,
                'warning',
                ['admins']
              );
            } catch (notificationError) {
              logger.warn(`Error enviando alerta de escalación: ${notificationError.message}`);
            }

            escalatedTickets.push(ticket.id);

          } catch (error) {
            logger.error(`Error escalando ticket ${ticket.id}: ${error.message}`);
          }
        }
      }

      logger.info(`Escalación completada: ${escalatedTickets.length} tickets escalados`);

      return {
        success: true,
        message: 'Escalación de tickets completada',
        escalatedCount: escalatedTickets.length,
        escalatedTickets: escalatedTickets
      };
    } catch (error) {
      logger.error(`Error escalando tickets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Registra materiales utilizados en una instalación
   * @param {number} ticketId - ID del ticket
   * @param {Array} materials - Lista de materiales utilizados
   * @param {number} userId - ID del usuario que registra
   * @returns {Promise<Object>} Resultado del registro
   */
  async recordMaterialsUsed(ticketId, materials, userId) {
    const transaction = await db.sequelize.transaction();

    try {
      const ticket = await db.Ticket.findByPk(ticketId, { transaction });
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} no encontrado`);
      }

      const recordedMaterials = [];

      for (const material of materials) {
        // Validar que el item existe
        const inventoryItem = await db.InventoryItem.findByPk(material.itemId, { transaction });
        if (!inventoryItem) {
          throw new Error(`Item de inventario ${material.itemId} no encontrado`);
        }

        // Registrar material usado
        const installationMaterial = await db.InstallationMaterial.create({
          ticketId: ticketId,
          itemId: material.itemId,
          quantityUsed: material.quantityUsed,
          scrapGenerated: material.scrapGenerated || 0,
          usageType: material.usageType || 'installation',
          notes: material.notes || '',
          usedAt: new Date()
        }, { transaction });

        // Actualizar inventario
        await inventoryService.recordMaterialUsage(
          material.itemId,
          material.quantityUsed,
          material.scrapGenerated || 0,
          userId,
          `Usado en ticket ${ticketId}`,
          transaction
        );

        recordedMaterials.push(installationMaterial);
      }

      await transaction.commit();

      logger.info(`Materiales registrados para ticket ${ticketId}: ${materials.length} items`);

      return {
        success: true,
        data: recordedMaterials,
        message: 'Materiales registrados exitosamente'
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error registrando materiales: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene tickets próximos a vencer SLA
   * @param {number} hoursAhead - Horas hacia adelante para revisar
   * @returns {Promise<Object>} Tickets próximos a vencer
   */
  async getTicketsNearSLA(hoursAhead = 2) {
    try {
      const now = moment();
      const tickets = [];

      for (const [priority, rule] of Object.entries(this.escalationRules)) {
        const slaDeadline = now.clone().add(hoursAhead, 'hours');
        const createdBefore = slaDeadline.clone().subtract(rule.hours, 'hours').toDate();

        const nearSLATickets = await db.Ticket.findAll({
          where: {
            priority: priority,
            status: ['open', 'inProgress'],
            createdAt: { [db.Sequelize.Op.lte]: createdBefore },
            resolvedAt: null
          },
          include: [
            { model: db.Client, as: 'client' },
            { model: db.User, as: 'assignedTo' },
            { model: db.TicketType, as: 'ticketType' }
          ]
        });

        for (const ticket of nearSLATickets) {
          const timeElapsed = now.diff(moment(ticket.createdAt), 'hours');
          const timeRemaining = rule.hours - timeElapsed;

          tickets.push({
            ...ticket.toJSON(),
            slaHours: rule.hours,
            timeElapsed: timeElapsed,
            timeRemaining: timeRemaining,
            isOverdue: timeRemaining <= 0
          });
        }
      }

      // Ordenar por tiempo restante
      tickets.sort((a, b) => a.timeRemaining - b.timeRemaining);

      return {
        success: true,
        data: tickets,
        message: `${tickets.length} tickets próximos a vencer SLA`
      };
    } catch (error) {
      logger.error(`Error obteniendo tickets próximos a SLA: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene dashboard de tickets para técnico específico
   * @param {number} technicianId - ID del técnico
   * @returns {Promise<Object>} Dashboard del técnico
   */
  async getTechnicianDashboard(technicianId) {
    try {
      const technician = await db.User.findByPk(technicianId);
      if (!technician) {
        throw new Error(`Técnico ${technicianId} no encontrado`);
      }

      // Tickets asignados por estado
      const assignedTickets = await db.Ticket.findAll({
        where: { assignedToId: technicianId },
        include: [
          { model: db.Client, as: 'client' },
          { model: db.TicketType, as: 'ticketType' }
        ],
        order: [['priority', 'DESC'], ['scheduledDate', 'ASC']]
      });

      const ticketsByStatus = assignedTickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Tickets programados para hoy
      const today = moment().format('YYYY-MM-DD');
      const todayTickets = assignedTickets.filter(t => 
        t.scheduledDate && moment(t.scheduledDate).format('YYYY-MM-DD') === today
      );

      // Tickets urgentes (alta prioridad sin resolver)
      const urgentTickets = assignedTickets.filter(t => 
        t.priority === 'high' && !['resolved', 'closed'].includes(t.status)
      );

      // Próximas citas programadas
      const upcomingAppointments = assignedTickets
        .filter(t => t.scheduledDate && moment(t.scheduledDate).isAfter(moment()))
        .slice(0, 5);

      return {
        success: true,
        data: {
          technician: {
            id: technician.id,
            name: technician.fullName
          },
          summary: {
            totalAssigned: assignedTickets.length,
            byStatus: ticketsByStatus,
            todayCount: todayTickets.length,
            urgentCount: urgentTickets.length
          },
          todayTickets: todayTickets,
          urgentTickets: urgentTickets,
          upcomingAppointments: upcomingAppointments
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo dashboard del técnico: ${error.message}`);
      throw error;
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Obtiene ticket por ID con todas las relaciones
   * @private
   */
  async getTicketById(ticketId) {
    return await db.Ticket.findByPk(ticketId, {
      include: [
        { model: db.Client, as: 'client' },
        { model: db.User, as: 'assignedTo' },
        { model: db.User, as: 'createdBy' },
        { model: db.TicketType, as: 'ticketType' },
        { model: db.TicketComment, as: 'comments', include: [{ model: db.User }] },
        { model: db.TicketAttachment, as: 'attachments' }
      ]
    });
  }

  /**
   * Genera número único de ticket
   * @private
   */
  async generateTicketNumber() {
    const today = moment().format('YYYYMMDD');
    const todayCount = await db.Ticket.count({
      where: {
        createdAt: {
          [db.Sequelize.Op.gte]: moment().startOf('day').toDate()
        }
      }
    });
    
    return `T${today}${String(todayCount + 1).padStart(3, '0')}`;
  }

  /**
   * Calcula prioridad basada en tipo de ticket
   * @private
   */
  calculatePriorityByType(category) {
    const priorityMap = {
      'installation': 'medium',
      'support': 'high',
      'maintenance': 'low'
    };
    return priorityMap[category] || 'medium';
  }

  /**
   * Auto-asigna técnico basado en disponibilidad y carga
   * @private
   */
  async autoAssignTechnician(ticket, transaction) {
    const technicians = await db.User.findAll({
      include: [{
        model: db.Role,
        where: { name: ['tecnico', 'admin'] }
      }],
      where: { active: true },
      transaction
    });

    return await this.findBestTechnician(ticket, technicians);
  }

  /**
   * Encuentra el mejor técnico para un ticket
   * @private
   */
  async findBestTechnician(ticket, technicians) {
    let bestTechnician = null;
    let lowestLoad = Infinity;

    for (const technician of technicians) {
      // Calcular carga actual
      const currentLoad = await db.Ticket.count({
        where: {
          assignedToId: technician.id,
          status: ['open', 'inProgress']
        }
      });

      // Verificar disponibilidad para la fecha programada
      const isAvailable = ticket.scheduledDate ? 
        await this.checkTechnicianAvailability(technician.id, ticket.scheduledDate) : true;

      if (isAvailable && currentLoad < lowestLoad) {
        lowestLoad = currentLoad;
        bestTechnician = technician;
      }
    }

    return bestTechnician;
  }

  /**
   * Verifica disponibilidad de técnico
   * @private
   */
  async checkTechnicianAvailability(technicianId, date, time = null) {
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    const conflictingTickets = await db.Ticket.count({
      where: {
        assignedToId: technicianId,
        scheduledDate: { [db.Sequelize.Op.between]: [startOfDay, endOfDay] },
        status: ['open', 'inProgress']
      }
    });

    // Simplificado: máximo 3 tickets por día por técnico
    return conflictingTickets < 3;
  }

  /**
   * Sugiere fecha de instalación
   * @private
   */
  async suggestInstallationDate() {
    // Sugerir fecha 2-3 días laborables adelante
    let suggestedDate = moment().add(2, 'days');
    
    // Evitar fines de semana
    while (suggestedDate.day() === 0 || suggestedDate.day() === 6) {
      suggestedDate.add(1, 'day');
    }

    return suggestedDate.format('YYYY-MM-DD');
  }

  /**
   * Guarda archivo adjunto
   * @private
   */
  async saveAttachment(ticketId, attachment, transaction) {
    const uploadsDir = path.join(__dirname, '../uploads/tickets');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `ticket-${ticketId}-${Date.now()}-${attachment.originalname}`;
    const filepath = path.join(uploadsDir, filename);

    await fs.writeFile(filepath, attachment.buffer);

    return await db.TicketAttachment.create({
      ticketId: ticketId,
      filename: attachment.originalname,
      filePath: filepath,
      attachmentType: this.getAttachmentType(attachment.mimetype),
      description: attachment.description || ''
    }, { transaction });
  }

  /**
   * Determina tipo de archivo adjunto
   * @private
   */
  getAttachmentType(mimetype) {
    if (mimetype.startsWith('image/')) return 'photo';
    if (mimetype.startsWith('video/')) return 'video';
    return 'document';
  }

  /**
   * Envía notificaciones relacionadas con tickets
   * @private
   */
  async sendTicketNotifications(ticket, event, extra = {}) {
    try {
      switch (event) {
        case 'created':
          if (ticket.assignedTo) {
            await this.notifyTechnicianAssignment(ticket, ticket.assignedTo);
          }
          break;
        case 'statusUpdated':
          if (ticket.client && ['resolved', 'closed'].includes(extra.newStatus)) {
            // Notificar cliente de resolución
            try {
              await notificationService.sendNotificationByChannel(
                'email', 
                ticket.client, 
                'ticket_resolved', 
                {
                  ticketNumber: ticket.ticketNumber,
                  clientName: `${ticket.client.firstName} ${ticket.client.lastName}`,
                  resolutionNotes: ticket.resolutionNotes || 'Ticket resuelto exitosamente'
                }
              );
            } catch (notificationError) {
              logger.warn(`Error enviando notificación de resolución: ${notificationError.message}`);
            }
          }
          break;
      }
    } catch (error) {
      logger.error(`Error enviando notificaciones de ticket: ${error.message}`);
    }
  }

  /**
   * Notifica asignación a técnico
   * @private
   */
  async notifyTechnicianAssignment(ticket, technician) {
    try {
      const variables = {
        technicianName: technician.fullName,
        ticketNumber: ticket.ticketNumber || `#${ticket.id}`,
        clientName: `${ticket.client.firstName} ${ticket.client.lastName}`,
        priority: ticket.priority.toUpperCase(),
        description: ticket.description,
        address: ticket.client.address || 'Dirección por confirmar',
        scheduledDate: ticket.scheduledDate ? moment(ticket.scheduledDate).format('DD/MM/YYYY') : 'Por programar'
      };

      await notificationService.sendTechnicianAlert(
        technician, 
        'ticket_assigned', 
        variables
      );
    } catch (error) {
      logger.warn(`Error notificando asignación a técnico: ${error.message}`);
    }
  }

  /**
   * Calcula costo real de instalación
   * @private
   */
  async calculateActualInstallationCost(ticketId) {
    try {
      const materials = await db.InstallationMaterial.findAll({
        where: { ticketId: ticketId },
        include: [{ model: db.InventoryItem, as: 'item' }]
      });

      let materialCost = 0;
      for (const material of materials) {
        materialCost += (material.item?.unitPrice || 0) * material.quantityUsed;
      }

      const laborCost = 500 * 2; // 2 horas base
      return materialCost + laborCost;
    } catch (error) {
      logger.warn(`Error calculando costo real de instalación: ${error.message}`);
      return 0;
    }
  }

  /**
   * Obtiene materiales requeridos por tipo de ticket
   * @private
   */
  async getRequiredMaterials(ticketTypeId) {
    try {
      // Esto se podría expandir con una tabla de materiales por tipo de ticket
      const basicMaterials = [
        { name: 'Cable UTP Cat6', quantity: 50, unit: 'metros' },
        { name: 'Conectores RJ45', quantity: 4, unit: 'piezas' },
        { name: 'Antena CPE', quantity: 1, unit: 'pieza' }
      ];

      return basicMaterials;
    } catch (error) {
      logger.warn(`Error obteniendo materiales requeridos: ${error.message}`);
      return [];
    }
  }

  /**
   * Genera instrucciones de trabajo
   * @private
   */
  generateWorkInstructions(ticketType) {
    const instructions = {
      'installation': [
        '1. Verificar ubicación y línea de vista',
        '2. Instalar antena CPE en ubicación óptima',
        '3. Configurar equipo con parámetros del cliente',
        '4. Realizar pruebas de conectividad',
        '5. Capacitar al cliente en uso básico'
      ],
      'support': [
        '1. Diagnosticar problema reportado',
        '2. Verificar configuración de equipos',
        '3. Realizar correcciones necesarias',
        '4. Documentar solución aplicada'
      ],
      'maintenance': [
        '1. Inspección visual de equipos',
        '2. Limpieza de conectores y antenas',
        '3. Verificar parámetros de señal',
        '4. Actualizar firmware si es necesario'
      ]
    };

    return instructions[ticketType?.category] || instructions['support'];
  }

  /**
   * Encuentra administrador disponible para escalación
   * @private
   */
  async findAvailableAdmin() {
    try {
      return await db.User.findOne({
        include: [{
          model: db.Role,
          where: { name: 'admin' }
        }],
        where: { active: true },
        order: [['lastLogin', 'DESC']]
      });
    } catch (error) {
      logger.warn(`Error encontrando administrador disponible: ${error.message}`);
      return null;
    }
  }
}

module.exports = new TicketService();