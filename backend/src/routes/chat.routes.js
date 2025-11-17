const chatController = require('../controllers/chat.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // === CONVERSACIONES ===
  app.get('/api/chat/conversations', [authJwt.verifyToken], chatController.getConversations);
  app.post('/api/chat/conversations', [authJwt.verifyToken], chatController.createConversation);
  app.get('/api/chat/conversations/:id/messages', [authJwt.verifyToken], chatController.getMessages);
  
  // === MENSAJES ===
  app.post('/api/chat/messages', [authJwt.verifyToken], chatController.sendMessage);
  app.put('/api/chat/conversations/:id/read', [authJwt.verifyToken], chatController.markAsRead);
  
  // === TELEGRAM ===
  app.get('/api/chat/telegram/status', [authJwt.verifyToken], chatController.getTelegramStatus);
};
