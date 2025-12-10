// backend/src/routes/notification.routes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authJwt } = require('../middleware');

module.exports = function(app) {
  app.use('/api/notifications', router);

  /**
   * GET /api/notifications
   * Obtiene las notificaciones del usuario autenticado
   * Requiere: Usuario autenticado
   */
  router.get('/', [authJwt.verifyToken], notificationController.getMyNotifications);

  /**
   * PUT /api/notifications/read-all
   * Marca todas las notificaciones como leídas
   * Requiere: Usuario autenticado
   * IMPORTANTE: Debe ir ANTES que /:id/read
   */
  router.put('/read-all', [authJwt.verifyToken], notificationController.markAllAsRead);

  /**
   * PUT /api/notifications/:id/read
   * Marca una notificación como leída
   * Requiere: Usuario autenticado
   */
  router.put('/:id/read', [authJwt.verifyToken], notificationController.markAsRead);

  /**
   * PUT /api/notifications/:id/archive
   * Archiva una notificación
   * Requiere: Usuario autenticado
   */
  router.put('/:id/archive', [authJwt.verifyToken], notificationController.archiveNotification);

  /**
   * PUT /api/notifications/:id
   * Actualiza una notificación
   * Requiere: Usuario autenticado (propietario o admin)
   */
  router.put('/:id', [authJwt.verifyToken], notificationController.updateNotification);

  /**
   * DELETE /api/notifications/:id
   * Elimina una notificación
   * Requiere: Usuario autenticado (propietario o admin)
   */
  router.delete('/:id', [authJwt.verifyToken], notificationController.deleteNotification);

  /**
   * POST /api/notifications/test
   * Crea una notificación de prueba
   * Requiere: Admin
   */
  router.post('/test', [authJwt.verifyToken, authJwt.isAdmin], notificationController.createTestNotification);

  /**
   * POST /api/notifications/cleanup
   * Limpia notificaciones expiradas y archivadas antiguas
   * Requiere: Admin
   */
  router.post('/cleanup', [authJwt.verifyToken, authJwt.isAdmin], notificationController.cleanupNotifications);

  console.log('✅ Rutas de notificaciones configuradas');
};
