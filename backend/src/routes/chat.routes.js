const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authJwt = require('../middleware/auth.jwt');

module.exports = function(app) {
  // === CONVERSACIONES ===
  app.get(
    '/api/chat/conversations', 
    //[authJwt.verifyToken], 
    chatController.getConversations
  );
  
  app.post(
    '/api/chat/conversations', 
    [authJwt.verifyToken], 
    chatController.createConversation
  );
  
  app.get(
    '/api/chat/conversations/:id/messages', 
    [authJwt.verifyToken], 
    chatController.getMessages
  );
  
  app.put(
    '/api/chat/conversations/:id/read', 
    [authJwt.verifyToken], 
    chatController.markAsRead
  );
  
  app.put(
    '/api/chat/conversations/:id', 
    [authJwt.verifyToken], 
    chatController.updateConversation
  );
  
  app.delete(
    '/api/chat/conversations/:id', 
    [authJwt.verifyToken], 
    chatController.deleteConversation
  );

  // === MENSAJES ===
  app.post(
    '/api/chat/messages', 
    [authJwt.verifyToken], 
    chatController.sendMessage
  );
  
  app.put(
    '/api/chat/messages/:id', 
    [authJwt.verifyToken], 
    chatController.updateMessage
  );
  
  app.delete(
    '/api/chat/messages/:id', 
    [authJwt.verifyToken], 
    chatController.deleteMessage
  );

  // === TELEGRAM ===
  app.get(
    '/api/chat/telegram/status', 
    //[authJwt.verifyToken], 
    chatController.getTelegramStatus
  );
  
};
