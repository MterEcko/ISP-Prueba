const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// === EVENTOS ===
router.post('/events', calendarController.createEvent);
router.get('/events', calendarController.getEvents);
router.get('/events/:id', calendarController.getEventById);
router.put('/events/:id', calendarController.updateEvent);
router.delete('/events/:id', calendarController.deleteEvent);

// === GOOGLE CALENDAR ===
router.get('/google/auth-url', calendarController.getGoogleAuthUrl);
router.get('/google/callback', calendarController.googleCallback);
router.get('/google/calendars', calendarController.getGoogleCalendars);

// === MICROSOFT CALENDAR ===
router.get('/microsoft/auth-url', calendarController.getMicrosoftAuthUrl);
router.get('/microsoft/callback', calendarController.microsoftCallback);
router.get('/microsoft/calendars', calendarController.getMicrosoftCalendars);

// === INTEGRACIONES ===
router.get('/integrations', calendarController.getIntegrations);
router.delete('/integrations/:id', calendarController.disconnectIntegration);
router.post('/sync', calendarController.syncFromExternal);

module.exports = router;
