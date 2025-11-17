const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Conversaciones
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);

// Mensajes
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);
router.put('/conversations/:conversationId/read', chatController.markAsRead);

// Telegram
router.get('/telegram/status', chatController.getTelegramStatus);

module.exports = router;
