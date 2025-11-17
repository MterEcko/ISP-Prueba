const db = require('../models');
const googleCalendarService = require('./googleCalendar.service');
const microsoftCalendarService = require('./microsoftCalendar.service');
const logger = require('../config/logger');
const { Op } = require('sequelize');

class CalendarService {
  /**
   * Crear evento
   */
  async createEvent(eventData, userId) {
    try {
      // Crear evento local
      const event = await db.CalendarEvent.create({
        ...eventData,
        createdBy: userId
      });

      // Sincronizar con calendarios externos si está habilitado
      await this.syncEventToExternalCalendars(event, userId);

      return await db.CalendarEvent.findByPk(event.id, {
        include: [
          {
            model: db.User,
            as: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName', 'email']
          }
        ]
      });
    } catch (error) {
      logger.error('Error creando evento:', error);
      throw error;
    }
  }

  /**
   * Actualizar evento
   */
  async updateEvent(eventId, eventData, userId) {
    try {
      const event = await db.CalendarEvent.findByPk(eventId);
      if (!event) throw new Error('Evento no encontrado');

      // Verificar permisos
      if (event.createdBy !== userId) {
        throw new Error('No tienes permiso para modificar este evento');
      }

      await event.update(eventData);

      // Sincronizar actualización con calendarios externos
      await this.syncEventToExternalCalendars(event, userId);

      return await db.CalendarEvent.findByPk(event.id, {
        include: [
          {
            model: db.User,
            as: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName', 'email']
          }
        ]
      });
    } catch (error) {
      logger.error('Error actualizando evento:', error);
      throw error;
    }
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(eventId, userId) {
    try {
      const event = await db.CalendarEvent.findByPk(eventId);
      if (!event) throw new Error('Evento no encontrado');

      // Verificar permisos
      if (event.createdBy !== userId) {
        throw new Error('No tienes permiso para eliminar este evento');
      }

      // Eliminar de calendarios externos
      const integrations = await db.CalendarIntegration.findAll({
        where: { userId, isActive: true }
      });

      for (const integration of integrations) {
        try {
          if (integration.provider === 'google' && event.googleEventId) {
            await googleCalendarService.deleteEvent(integration.id, event.googleEventId);
          } else if (integration.provider === 'microsoft' && event.microsoftEventId) {
            await microsoftCalendarService.deleteEvent(integration.id, event.microsoftEventId);
          }
        } catch (error) {
          logger.error(`Error eliminando evento de ${integration.provider}:`, error);
        }
      }

      await event.destroy();
      return { success: true };
    } catch (error) {
      logger.error('Error eliminando evento:', error);
      throw error;
    }
  }

  /**
   * Obtener eventos
   */
  async getEvents(filters = {}, userId) {
    try {
      const where = {};

      // Filtros de fecha
      if (filters.startDate || filters.endDate) {
        where.startDate = {};
        if (filters.startDate) where.startDate[Op.gte] = filters.startDate;
        if (filters.endDate) where.startDate[Op.lte] = filters.endDate;
      }

      // Filtro por tipo de evento
      if (filters.eventType) {
        where.eventType = filters.eventType;
      }

      // Filtro por estado
      if (filters.status) {
        where.status = filters.status;
      }

      // Filtro por usuario (eventos creados o asignados)
      if (filters.userId || userId) {
        const userIdFilter = filters.userId || userId;
        where[Op.or] = [
          { createdBy: userIdFilter },
          { assignedTo: { [Op.contains]: [userIdFilter] } }
        ];
      }

      const events = await db.CalendarEvent.findAll({
        where,
        include: [
          {
            model: db.User,
            as: 'creator',
            attributes: ['id', 'username', 'firstName', 'lastName', 'email']
          }
        ],
        order: [['startDate', 'ASC']]
      });

      return events;
    } catch (error) {
      logger.error('Error obteniendo eventos:', error);
      throw error;
    }
  }

  /**
   * Sincronizar evento con calendarios externos
   */
  async syncEventToExternalCalendars(event, userId) {
    try {
      const integrations = await db.CalendarIntegration.findAll({
        where: {
          userId,
          isActive: true,
          syncEnabled: true
        }
      });

      const syncedWith = [];

      for (const integration of integrations) {
        try {
          if (integration.provider === 'google') {
            if (event.googleEventId) {
              // Actualizar evento existente
              await googleCalendarService.updateEvent(
                integration.id,
                event.googleEventId,
                {
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  reminders: event.reminders
                }
              );
            } else {
              // Crear nuevo evento
              const result = await googleCalendarService.createEvent(
                integration.id,
                {
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  reminders: event.reminders
                }
              );

              await event.update({
                googleEventId: result.googleEventId,
                googleCalendarId: result.googleCalendarId
              });
            }
            syncedWith.push('google');
          } else if (integration.provider === 'microsoft') {
            if (event.microsoftEventId) {
              // Actualizar evento existente
              await microsoftCalendarService.updateEvent(
                integration.id,
                event.microsoftEventId,
                {
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  reminders: event.reminders
                }
              );
            } else {
              // Crear nuevo evento
              const result = await microsoftCalendarService.createEvent(
                integration.id,
                {
                  title: event.title,
                  description: event.description,
                  location: event.location,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  reminders: event.reminders
                }
              );

              await event.update({
                microsoftEventId: result.microsoftEventId,
                microsoftCalendarId: result.microsoftCalendarId
              });
            }
            syncedWith.push('microsoft');
          }
        } catch (error) {
          logger.error(`Error sincronizando con ${integration.provider}:`, error);
        }
      }

      if (syncedWith.length > 0) {
        await event.update({
          syncedWith,
          lastSyncedAt: new Date()
        });
      }
    } catch (error) {
      logger.error('Error sincronizando evento:', error);
    }
  }

  /**
   * Sincronizar desde calendarios externos
   */
  async syncFromExternalCalendars(userId, startDate, endDate) {
    try {
      const integrations = await db.CalendarIntegration.findAll({
        where: {
          userId,
          isActive: true,
          syncEnabled: true
        }
      });

      const externalEvents = [];

      for (const integration of integrations) {
        try {
          let events = [];

          if (integration.provider === 'google') {
            events = await googleCalendarService.syncFromGoogle(
              integration.id,
              startDate,
              endDate
            );

            // Importar eventos que no existan localmente
            for (const extEvent of events) {
              const existing = await db.CalendarEvent.findOne({
                where: { googleEventId: extEvent.googleEventId }
              });

              if (!existing) {
                await db.CalendarEvent.create({
                  title: extEvent.title,
                  description: extEvent.description,
                  startDate: extEvent.startDate,
                  endDate: extEvent.endDate,
                  location: extEvent.location,
                  createdBy: userId,
                  googleEventId: extEvent.googleEventId,
                  syncedWith: ['google'],
                  lastSyncedAt: new Date()
                });
              }
            }
          } else if (integration.provider === 'microsoft') {
            events = await microsoftCalendarService.syncFromMicrosoft(
              integration.id,
              startDate,
              endDate
            );

            // Importar eventos que no existan localmente
            for (const extEvent of events) {
              const existing = await db.CalendarEvent.findOne({
                where: { microsoftEventId: extEvent.microsoftEventId }
              });

              if (!existing) {
                await db.CalendarEvent.create({
                  title: extEvent.title,
                  description: extEvent.description,
                  startDate: extEvent.startDate,
                  endDate: extEvent.endDate,
                  location: extEvent.location,
                  createdBy: userId,
                  microsoftEventId: extEvent.microsoftEventId,
                  syncedWith: ['microsoft'],
                  lastSyncedAt: new Date()
                });
              }
            }
          }

          externalEvents.push(...events);
        } catch (error) {
          logger.error(`Error sincronizando desde ${integration.provider}:`, error);
        }
      }

      return {
        imported: externalEvents.length,
        events: externalEvents
      };
    } catch (error) {
      logger.error('Error sincronizando desde calendarios externos:', error);
      throw error;
    }
  }

  /**
   * Obtener integraciones de usuario
   */
  async getUserIntegrations(userId) {
    return await db.CalendarIntegration.findAll({
      where: { userId },
      attributes: { exclude: ['accessToken', 'refreshToken'] }
    });
  }

  /**
   * Desconectar integración
   */
  async disconnectIntegration(integrationId, userId) {
    const integration = await db.CalendarIntegration.findOne({
      where: { id: integrationId, userId }
    });

    if (!integration) throw new Error('Integración no encontrada');

    await integration.update({ isActive: false, syncEnabled: false });

    return { success: true };
  }
}

module.exports = new CalendarService();
