import axios from 'axios';
import { API_URL } from './frontend_apiConfig';

class ChatService {
  /**
   * Obtener conversaciones
   */
  async getConversations() {
    try {
      const response = await axios.get(API_URL + 'chat/conversations');
      return response.data;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Crear conversación
   */
  async createConversation(participantIds, name = null, type = 'direct') {
    try {
      const response = await axios.post(API_URL + 'chat/conversations', {
        participantIds,
        name,
        type
      });
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de conversación
   */
  async getMessages(conversationId, limit = 50, offset = 0) {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje
   */
  async sendMessage(conversationId, content, messageType = 'text', attachments = []) {
    try {
      const response = await axios.post(API_URL + 'chat/messages', {
        conversationId,
        content,
        messageType,
        attachments
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId) {
    try {
      const response = await api.put(`/chat/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de Telegram
   */
  async getTelegramStatus() {
    try {
      const response = await axios.get(API_URL + 'chat/telegram/status');
      return response.data;
    } catch (error) {
      console.error('Error getting telegram status:', error);
      throw error;
    }
  }

  /**
   * Formatear fecha de mensaje
   */
  formatMessageTime(date) {
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now - messageDate;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days < 7) return `Hace ${days}d`;

    return messageDate.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  }

  /**
   * Formatear preview de mensaje
   */
  formatMessagePreview(content, maxLength = 50) {
    if (!content) return '';
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content;
  }

  /**
   * Obtener iniciales de usuario
   */
  getUserInitials(user) {
    if (!user) return '?';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  }

  /**
   * Obtener color de avatar basado en nombre
   */
  getAvatarColor(user) {
    if (!user || !user.id) return '#95a5a6';

    const colors = [
      '#3498db', // Blue
      '#2ecc71', // Green
      '#9b59b6', // Purple
      '#f39c12', // Orange
      '#e74c3c', // Red
      '#1abc9c', // Turquoise
      '#34495e', // Dark Gray
      '#e67e22'  // Carrot
    ];

    // Usar hash simple del ID para elegir color consistente
    const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

export default new ChatService();
