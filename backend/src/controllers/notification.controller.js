// backend/src/controllers/notification.controller.js
const notificationService = require('../services/notification.service');

/**
 * Controlador de notificaciones
 */
class NotificationController {
  /**
   * Obtiene las notificaciones del usuario autenticado
   * GET /api/notifications?limit=50&offset=0&unreadOnly=false
   */
  async getMyNotifications(req, res) {
    try {
      const userId = req.userId; // Del middleware authJwt
      const { limit, offset, unreadOnly, types, priority, includeArchived } = req.query;

      const options = {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        unreadOnly: unreadOnly === 'true',
        types: types ? types.split(',') : null,
        priority: priority || null,
        includeArchived: includeArchived === 'true'
      };

      const result = await notificationService.getUserNotifications(userId, options);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error en getMyNotifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Error obteniendo notificaciones',
        error: error.message
      });
    }
  }

  /**
   * Marca una notificación como leída
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.userId;

      const notification = await notificationService.markAsRead(notificationId, userId);

      return res.status(200).json({
        success: true,
        data: notification,
        message: 'Notificación marcada como leída'
      });
    } catch (error) {
      console.error('Error en markAsRead:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.userId;

      const result = await notificationService.markAllAsRead(userId);

      return res.status(200).json({
        success: true,
        data: result,
        message: `${result.updated} notificaciones marcadas como leídas`
      });
    } catch (error) {
      console.error('Error en markAllAsRead:', error);
      return res.status(500).json({
        success: false,
        message: 'Error marcando notificaciones como leídas',
        error: error.message
      });
    }
  }

  /**
   * Archiva una notificación
   * PUT /api/notifications/:id/archive
   */
  async archiveNotification(req, res) {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.userId;

      const notification = await notificationService.archiveNotification(notificationId, userId);

      return res.status(200).json({
        success: true,
        data: notification,
        message: 'Notificación archivada'
      });
    } catch (error) {
      console.error('Error en archiveNotification:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Actualiza una notificación
   * PUT /api/notifications/:id
   */
  async updateNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const { title, message, priority, type, metadata } = req.body;

      const notification = await notificationService.getNotificationById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar que el usuario sea el propietario o admin
      if (notification.userId !== userId && !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para actualizar esta notificación'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (priority !== undefined) updateData.priority = priority;
      if (type !== undefined) updateData.type = type;
      if (metadata !== undefined) updateData.metadata = metadata;

      const updated = await notificationService.updateNotification(id, updateData);

      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Notificación actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error en updateNotification:', error);
      return res.status(500).json({
        success: false,
        message: 'Error actualizando notificación',
        error: error.message
      });
    }
  }

  /**
   * Elimina una notificación
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const notification = await notificationService.getNotificationById(id);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        });
      }

      // Verificar que el usuario sea el propietario o admin
      if (notification.userId !== userId && !req.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para eliminar esta notificación'
        });
      }

      await notificationService.deleteNotification(id);

      return res.status(200).json({
        success: true,
        message: 'Notificación eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error en deleteNotification:', error);
      return res.status(500).json({
        success: false,
        message: 'Error eliminando notificación',
        error: error.message
      });
    }
  }

  /**
   * Crea una notificación de prueba (solo admin)
   * POST /api/notifications/test
   */
  async createTestNotification(req, res) {
    try {
      const { userId, type, priority, title, message } = req.body;

      const notification = await notificationService.createAndSend({
        userId: userId || null,
        type: type || 'general',
        priority: priority || 'medium',
        title: title || 'Notificación de Prueba',
        message: message || 'Esta es una notificación de prueba del sistema',
        metadata: {
          test: true,
          createdBy: req.username
        },
        sendViaWebSocket: true
      });

      return res.status(201).json({
        success: true,
        data: notification,
        message: 'Notificación de prueba creada y enviada'
      });
    } catch (error) {
      console.error('Error en createTestNotification:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creando notificación de prueba',
        error: error.message
      });
    }
  }

  /**
   * Limpia notificaciones expiradas (solo admin)
   * POST /api/notifications/cleanup
   */
  async cleanupNotifications(req, res) {
    try {
      const expiredResult = await notificationService.cleanupExpiredNotifications();
      const archivedResult = await notificationService.cleanupOldArchivedNotifications(30);

      return res.status(200).json({
        success: true,
        data: {
          expiredDeleted: expiredResult,
          archivedDeleted: archivedResult
        },
        message: 'Limpieza de notificaciones completada'
      });
    } catch (error) {
      console.error('Error en cleanupNotifications:', error);
      return res.status(500).json({
        success: false,
        message: 'Error limpiando notificaciones',
        error: error.message
      });
    }
  }
}

module.exports = new NotificationController();
