const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authJwt = require('../middleware/auth.jwt');

// === CONVERSACIONES ===
router.get('/conversations', [authJwt.verifyToken], chatController.getConversations);
router.post('/conversations', [authJwt.verifyToken], chatController.createConversation);
router.get('/conversations/:id/messages', [authJwt.verifyToken], chatController.getMessages);
router.put('/conversations/:id/read', [authJwt.verifyToken], chatController.markAsRead);
router.put('/conversations/:id', [authJwt.verifyToken], chatController.updateConversation);
router.delete('/conversations/:id', [authJwt.verifyToken], chatController.deleteConversation);

// === MENSAJES ===
router.post('/messages', [authJwt.verifyToken], chatController.sendMessage);
router.put('/messages/:id', [authJwt.verifyToken], chatController.updateMessage);
router.delete('/messages/:id', [authJwt.verifyToken], chatController.deleteMessage);

// === TELEGRAM ===
router.get('/telegram/status', [authJwt.verifyToken], chatController.getTelegramStatus);

module.exports = router;
