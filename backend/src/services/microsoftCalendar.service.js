const axios = require('axios');
const db = require('../models');
const logger = require('../config/logger');

class MicrosoftCalendarService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/calendar/microsoft/callback';
    this.authority = 'https://login.microsoftonline.com/common';
    this.graphEndpoint = 'https://graph.microsoft.com/v1.0';
  }

  /**
   * Generar URL de autorización
   */
  getAuthUrl(userId) {
    const scopes = [
      'User.Read',
      'Calendars.ReadWrite',
      'Calendars.ReadWrite.Shared'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: userId
    });

    return `${this.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Intercambiar código por tokens
   */
  async getTokens(code) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      });

      const response = await axios.post(
        `${this.authority}/oauth2/v2.0/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error obteniendo tokens de Microsoft:', error);
      throw new Error('Error al obtener tokens de Microsoft Calendar');
    }
  }

  /**
   * Refrescar token de acceso
   */
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await axios.post(
        `${this.authority}/oauth2/v2.0/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error refrescando token de Microsoft:', error);
      throw error;
    }
  }

  /**
   * Obtener información del usuario
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(`${this.graphEndpoint}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.id,
        email: response.data.userPrincipalName || response.data.mail,
        name: response.data.displayName
      };
    } catch (error) {
      logger.error('Error obteniendo info de usuario Microsoft:', error);
      throw error;
    }
  }

  /**
   * Guardar integración
   */
  async saveIntegration(userId, tokens) {
    try {
      const userInfo = await this.getUserInfo(tokens.access_token);

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

      const [integration, created] = await db.CalendarIntegration.findOrCreate({
        where: {
          userId,
          provider: 'microsoft',
          email: userInfo.email
        },
        defaults: {
          providerUserId: userInfo.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          scope: tokens.scope?.split(' ') || [],
          syncEnabled: true,
          isActive: true
        }
      });

      if (!created) {
        await integration.update({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || integration.refreshToken,
          tokenExpiresAt: expiresAt,
          isActive: true
        });
      }

      // Obtener calendarios del usuario
      await this.fetchCalendars(integration.id);

      return integration;
    } catch (error) {
      logger.error('Error guardando integración de Microsoft:', error);
      throw error;
    }
  }

  /**
   * Refrescar token si es necesario
   */
  async refreshTokenIfNeeded(integration) {
    const now = new Date();
    const expiresAt = new Date(integration.tokenExpiresAt);

    if (expiresAt - now < 5 * 60 * 1000) {
      try {
        const tokens = await this.refreshAccessToken(integration.refreshToken);

        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

        await integration.update({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || integration.refreshToken,
          tokenExpiresAt: newExpiresAt
        });

        logger.info(`Token de Microsoft Calendar renovado para usuario ${integration.userId}`);
      } catch (error) {
        logger.error('Error renovando token de Microsoft:', error);
        await integration.update({ isActive: false });
        throw new Error('Error renovando token. Por favor, vuelve a autorizar.');
      }
    }
  }

  /**
   * Obtener calendarios del usuario
   */
  async fetchCalendars(integrationId) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration) throw new Error('Integración no encontrada');

      await this.refreshTokenIfNeeded(integration);

      const response = await axios.get(`${this.graphEndpoint}/me/calendars`, {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`
        }
      });

      const calendars = response.data.value.map(cal => ({
        id: cal.id,
        name: cal.name,
        color: cal.color,
        isDefault: cal.isDefaultCalendar,
        canEdit: cal.canEdit,
        canShare: cal.canShare,
        owner: cal.owner
      }));

      const defaultCalendar = calendars.find(c => c.isDefault)?.id || calendars[0]?.id;

      await integration.update({
        calendars,
        defaultCalendarId: defaultCalendar
      });

      return calendars;
    } catch (error) {
      logger.error('Error obteniendo calendarios de Microsoft:', error);
      throw error;
    }
  }

  /**
   * Crear evento en Microsoft Calendar
   */
  async createEvent(integrationId, eventData) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      const event = {
        subject: eventData.title,
        body: {
          contentType: 'HTML',
          content: eventData.description || ''
        },
        start: {
          dateTime: eventData.startDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: eventData.endDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        location: {
          displayName: eventData.location || ''
        },
        reminderMinutesBeforeStart: eventData.reminders?.[0]?.minutes || 15
      };

      const response = await axios.post(
        `${this.graphEndpoint}/me/calendars/${integration.defaultCalendarId}/events`,
        event,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        microsoftEventId: response.data.id,
        microsoftCalendarId: integration.defaultCalendarId,
        link: response.data.webLink
      };
    } catch (error) {
      logger.error('Error creando evento en Microsoft Calendar:', error);
      throw error;
    }
  }

  /**
   * Actualizar evento en Microsoft Calendar
   */
  async updateEvent(integrationId, microsoftEventId, eventData) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      const event = {
        subject: eventData.title,
        body: {
          contentType: 'HTML',
          content: eventData.description || ''
        },
        start: {
          dateTime: eventData.startDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: eventData.endDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        location: {
          displayName: eventData.location || ''
        }
      };

      const response = await axios.patch(
        `${this.graphEndpoint}/me/events/${microsoftEventId}`,
        event,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error actualizando evento en Microsoft Calendar:', error);
      throw error;
    }
  }

  /**
   * Eliminar evento de Microsoft Calendar
   */
  async deleteEvent(integrationId, microsoftEventId) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      await axios.delete(
        `${this.graphEndpoint}/me/events/${microsoftEventId}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`
          }
        }
      );

      return true;
    } catch (error) {
      logger.error('Error eliminando evento de Microsoft Calendar:', error);
      throw error;
    }
  }

  /**
   * Sincronizar eventos desde Microsoft Calendar
   */
  async syncFromMicrosoft(integrationId, startDate, endDate) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      const start = startDate || new Date().toISOString();
      const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await axios.get(
        `${this.graphEndpoint}/me/calendarview?startDateTime=${start}&endDateTime=${end}`,
        {
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            Prefer: 'outlook.timezone="America/Mexico_City"'
          }
        }
      );

      await integration.update({ lastSyncedAt: new Date() });

      return response.data.value.map(event => ({
        microsoftEventId: event.id,
        title: event.subject,
        description: event.body?.content,
        startDate: event.start.dateTime,
        endDate: event.end.dateTime,
        location: event.location?.displayName,
        link: event.webLink
      }));
    } catch (error) {
      logger.error('Error sincronizando desde Microsoft Calendar:', error);
      throw error;
    }
  }
}

module.exports = new MicrosoftCalendarService();
