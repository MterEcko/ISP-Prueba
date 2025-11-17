const calendarService = require('../services/calendar.service');
const googleCalendarService = require('../services/googleCalendar.service');
const microsoftCalendarService = require('../services/microsoftCalendar.service');
const logger = require('../config/logger');

// Crear evento
exports.createEvent = async (req, res) => {
  try {
    const event = await calendarService.createEvent(req.body, req.user.id);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar evento
exports.updateEvent = async (req, res) => {
  try {
    const event = await calendarService.updateEvent(req.params.id, req.body, req.user.id);
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar evento
exports.deleteEvent = async (req, res) => {
  try {
    await calendarService.deleteEvent(req.params.id, req.user.id);
    res.json({ success: true, message: 'Evento eliminado' });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener eventos
exports.getEvents = async (req, res) => {
  try {
    const events = await calendarService.getEvents(req.query, req.user.id);
    res.json({ success: true, data: events });
  } catch (error) {
    logger.error('Error getting events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener evento por ID
exports.getEventById = async (req, res) => {
  try {
    const event = await db.CalendarEvent.findByPk(req.params.id, {
      include: ['creator']
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Evento no encontrado' });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    logger.error('Error getting event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// === GOOGLE CALENDAR ===

// Obtener URL de autorización de Google
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const authUrl = googleCalendarService.getAuthUrl(req.user.id);
    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    logger.error('Error getting Google auth URL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Callback de Google OAuth
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state; // El userId se pasa en el state

    const tokens = await googleCalendarService.getTokens(code);
    await googleCalendarService.saveIntegration(userId, tokens);

    res.redirect('/calendar?google=connected');
  } catch (error) {
    logger.error('Error in Google callback:', error);
    res.redirect('/calendar?google=error');
  }
};

// Obtener calendarios de Google
exports.getGoogleCalendars = async (req, res) => {
  try {
    const integration = await db.CalendarIntegration.findOne({
      where: { userId: req.user.id, provider: 'google', isActive: true }
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'No hay integración con Google Calendar' });
    }

    const calendars = await googleCalendarService.fetchCalendars(integration.id);
    res.json({ success: true, data: calendars });
  } catch (error) {
    logger.error('Error getting Google calendars:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// === MICROSOFT CALENDAR ===

// Obtener URL de autorización de Microsoft
exports.getMicrosoftAuthUrl = async (req, res) => {
  try {
    const authUrl = microsoftCalendarService.getAuthUrl(req.user.id);
    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    logger.error('Error getting Microsoft auth URL:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Callback de Microsoft OAuth
exports.microsoftCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    const tokens = await microsoftCalendarService.getTokens(code);
    await microsoftCalendarService.saveIntegration(userId, tokens);

    res.redirect('/calendar?microsoft=connected');
  } catch (error) {
    logger.error('Error in Microsoft callback:', error);
    res.redirect('/calendar?microsoft=error');
  }
};

// Obtener calendarios de Microsoft
exports.getMicrosoftCalendars = async (req, res) => {
  try {
    const integration = await db.CalendarIntegration.findOne({
      where: { userId: req.user.id, provider: 'microsoft', isActive: true }
    });

    if (!integration) {
      return res.status(404).json({ success: false, message: 'No hay integración con Microsoft Calendar' });
    }

    const calendars = await microsoftCalendarService.fetchCalendars(integration.id);
    res.json({ success: true, data: calendars });
  } catch (error) {
    logger.error('Error getting Microsoft calendars:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// === INTEGRACIONES ===

// Obtener integraciones del usuario
exports.getIntegrations = async (req, res) => {
  try {
    const integrations = await calendarService.getUserIntegrations(req.user.id);
    res.json({ success: true, data: integrations });
  } catch (error) {
    logger.error('Error getting integrations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Desconectar integración
exports.disconnectIntegration = async (req, res) => {
  try {
    await calendarService.disconnectIntegration(req.params.id, req.user.id);
    res.json({ success: true, message: 'Integración desconectada' });
  } catch (error) {
    logger.error('Error disconnecting integration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sincronizar desde calendarios externos
exports.syncFromExternal = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const result = await calendarService.syncFromExternalCalendars(
      req.user.id,
      startDate,
      endDate
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error syncing from external:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
