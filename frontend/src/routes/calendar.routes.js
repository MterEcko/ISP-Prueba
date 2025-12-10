const calendarController = require('../controllers/calendar.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // === EVENTOS ===
  app.post('/api/calendar/events', [authJwt.verifyToken], calendarController.createEvent);
  app.get('/api/calendar/events', [authJwt.verifyToken], calendarController.getEvents);
  app.get('/api/calendar/events/:id', [authJwt.verifyToken], calendarController.getEventById);
  app.put('/api/calendar/events/:id', [authJwt.verifyToken], calendarController.updateEvent);
  app.delete('/api/calendar/events/:id', [authJwt.verifyToken], calendarController.deleteEvent);

  // === GOOGLE CALENDAR ===
  app.get('/api/calendar/google/auth-url', [authJwt.verifyToken], calendarController.getGoogleAuthUrl);
  app.get('/api/calendar/google/callback', calendarController.googleCallback);
  app.get('/api/calendar/google/calendars', [authJwt.verifyToken], calendarController.getGoogleCalendars);

  // === MICROSOFT CALENDAR ===
  app.get('/api/calendar/microsoft/auth-url', [authJwt.verifyToken], calendarController.getMicrosoftAuthUrl);
  app.get('/api/calendar/microsoft/callback', calendarController.microsoftCallback);
  app.get('/api/calendar/microsoft/calendars', [authJwt.verifyToken], calendarController.getMicrosoftCalendars);

  // === INTEGRACIONES ===
  app.get('/api/calendar/integrations', [authJwt.verifyToken], calendarController.getIntegrations);
  app.delete('/api/calendar/integrations/:id', [authJwt.verifyToken], calendarController.disconnectIntegration);
  app.post('/api/calendar/sync', [authJwt.verifyToken], calendarController.syncFromExternal);
};
