const { google } = require('googleapis');
const db = require('../models');
const logger = require('../config/logger');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/google/callback'
    );
  }

  /**
   * Generar URL de autorización
   */
  getAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pasamos el userId en el state
      prompt: 'consent' // Forzar consent para obtener refresh token
    });
  }

  /**
   * Intercambiar código por tokens
   */
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error('Error obteniendo tokens de Google:', error);
      throw new Error('Error al obtener tokens de Google Calendar');
    }
  }

  /**
   * Obtener información del usuario
   */
  async getUserInfo(accessToken) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  }

  /**
   * Guardar integración
   */
  async saveIntegration(userId, tokens) {
    try {
      const userInfo = await this.getUserInfo(tokens.access_token);

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiry_date / 1000);

      const [integration, created] = await db.CalendarIntegration.findOrCreate({
        where: {
          userId,
          provider: 'google',
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
      logger.error('Error guardando integración de Google:', error);
      throw error;
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

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const { data } = await calendar.calendarList.list();

      const calendars = data.items.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        accessRole: cal.accessRole,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor
      }));

      // Guardar calendarios en la integración
      await integration.update({
        calendars,
        defaultCalendarId: data.items.find(c => c.primary)?.id || calendars[0]?.id
      });

      return calendars;
    } catch (error) {
      logger.error('Error obteniendo calendarios de Google:', error);
      throw error;
    }
  }

  /**
   * Refrescar token si es necesario
   */
  async refreshTokenIfNeeded(integration) {
    const now = new Date();
    const expiresAt = new Date(integration.tokenExpiresAt);

    // Renovar si expira en menos de 5 minutos
    if (expiresAt - now < 5 * 60 * 1000) {
      try {
        this.oauth2Client.setCredentials({
          refresh_token: integration.refreshToken
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();

        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + credentials.expiry_date / 1000);

        await integration.update({
          accessToken: credentials.access_token,
          tokenExpiresAt: newExpiresAt
        });

        logger.info(`Token de Google Calendar renovado para usuario ${integration.userId}`);
      } catch (error) {
        logger.error('Error renovando token de Google:', error);
        await integration.update({ isActive: false });
        throw new Error('Error renovando token. Por favor, vuelve a autorizar.');
      }
    }
  }

  /**
   * Crear evento en Google Calendar
   */
  async createEvent(integrationId, eventData) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: eventData.endDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        reminders: {
          useDefault: false,
          overrides: eventData.reminders || [
            { method: 'popup', minutes: 15 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId: integration.defaultCalendarId || 'primary',
        resource: event
      });

      return {
        googleEventId: response.data.id,
        googleCalendarId: integration.defaultCalendarId || 'primary',
        link: response.data.htmlLink
      };
    } catch (error) {
      logger.error('Error creando evento en Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Actualizar evento en Google Calendar
   */
  async updateEvent(integrationId, googleEventId, eventData) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start: {
          dateTime: eventData.startDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: eventData.endDate,
          timeZone: eventData.timezone || 'America/Mexico_City'
        }
      };

      const response = await calendar.events.update({
        calendarId: integration.defaultCalendarId || 'primary',
        eventId: googleEventId,
        resource: event
      });

      return response.data;
    } catch (error) {
      logger.error('Error actualizando evento en Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Eliminar evento de Google Calendar
   */
  async deleteEvent(integrationId, googleEventId) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: integration.defaultCalendarId || 'primary',
        eventId: googleEventId
      });

      return true;
    } catch (error) {
      logger.error('Error eliminando evento de Google Calendar:', error);
      throw error;
    }
  }

  /**
   * Sincronizar eventos desde Google Calendar
   */
  async syncFromGoogle(integrationId, startDate, endDate) {
    try {
      const integration = await db.CalendarIntegration.findByPk(integrationId);
      if (!integration || !integration.isActive) {
        throw new Error('Integración no activa');
      }

      await this.refreshTokenIfNeeded(integration);

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.list({
        calendarId: integration.defaultCalendarId || 'primary',
        timeMin: startDate || new Date().toISOString(),
        timeMax: endDate,
        singleEvents: true,
        orderBy: 'startTime'
      });

      await integration.update({ lastSyncedAt: new Date() });

      return response.data.items.map(event => ({
        googleEventId: event.id,
        title: event.summary,
        description: event.description,
        startDate: event.start.dateTime || event.start.date,
        endDate: event.end.dateTime || event.end.date,
        location: event.location,
        link: event.htmlLink
      }));
    } catch (error) {
      logger.error('Error sincronizando desde Google Calendar:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCalendarService();
