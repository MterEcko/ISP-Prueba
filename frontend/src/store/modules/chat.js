import chatService from '@/services/chat.service';

const state = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  telegramStatus: {
    isActive: false,
    isLinked: false,
    telegramUsername: null
  },
  unreadCount: 0
};

const getters = {
  // Obtener todas las conversaciones
  allConversations: (state) => state.conversations,

  // Conversaciones ordenadas por última actividad
  sortedConversations: (state) => {
    return [...state.conversations].sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.createdAt);
      const dateB = new Date(b.lastMessageAt || b.createdAt);
      return dateB - dateA;
    });
  },

  // Conversación actual
  currentConversation: (state) => state.currentConversation,

  // Mensajes de la conversación actual
  currentMessages: (state) => state.messages,

  // Total de mensajes no leídos
  totalUnreadCount: (state) => {
    return state.conversations.reduce((total, conv) => {
      const userUnread = conv.unreadCount?.[state.currentUserId] || 0;
      return total + userUnread;
    }, 0);
  },

  // Estado de Telegram
  telegramStatus: (state) => state.telegramStatus,

  // Verificar si está cargando
  isLoading: (state) => state.loading
};

const mutations = {
  SET_CONVERSATIONS(state, conversations) {
    state.conversations = conversations;
  },

  SET_CURRENT_CONVERSATION(state, conversation) {
    state.currentConversation = conversation;
  },

  ADD_CONVERSATION(state, conversation) {
    state.conversations.unshift(conversation);
  },

  UPDATE_CONVERSATION(state, updatedConversation) {
    const index = state.conversations.findIndex(c => c.id === updatedConversation.id);
    if (index !== -1) {
      state.conversations.splice(index, 1, updatedConversation);
    }
  },

  SET_MESSAGES(state, messages) {
    state.messages = messages;
  },

  ADD_MESSAGE(state, message) {
    state.messages.push(message);
  },

  UPDATE_MESSAGE(state, updatedMessage) {
    const index = state.messages.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      state.messages.splice(index, 1, updatedMessage);
    }
  },

  SET_LOADING(state, loading) {
    state.loading = loading;
  },

  SET_ERROR(state, error) {
    state.error = error;
  },

  SET_TELEGRAM_STATUS(state, status) {
    state.telegramStatus = status;
  },

  INCREMENT_UNREAD(state, conversationId) {
    const conversation = state.conversations.find(c => c.id === conversationId);
    if (conversation && conversation.unreadCount) {
      const userId = state.currentUserId;
      conversation.unreadCount[userId] = (conversation.unreadCount[userId] || 0) + 1;
    }
  },

  CLEAR_UNREAD(state, conversationId) {
    const conversation = state.conversations.find(c => c.id === conversationId);
    if (conversation && conversation.unreadCount) {
      const userId = state.currentUserId;
      conversation.unreadCount[userId] = 0;
    }
  }
};

const actions = {
  /**
   * Cargar conversaciones
   */
  async fetchConversations({ commit }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await chatService.getConversations();
      if (response.success) {
        commit('SET_CONVERSATIONS', response.data);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching conversations:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Crear conversación
   */
  async createConversation({ commit }, { participantIds, name, type }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await chatService.createConversation(participantIds, name, type);
      if (response.success) {
        commit('ADD_CONVERSATION', response.data);
        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error creating conversation:', error);
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Seleccionar conversación
   */
  async selectConversation({ commit, dispatch }, conversation) {
    commit('SET_CURRENT_CONVERSATION', conversation);
    await dispatch('fetchMessages', conversation.id);
    await dispatch('markAsRead', conversation.id);
  },

  /**
   * Cargar mensajes
   */
  async fetchMessages({ commit }, conversationId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);

    try {
      const response = await chatService.getMessages(conversationId);
      if (response.success) {
        commit('SET_MESSAGES', response.data);
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error fetching messages:', error);
    } finally {
      commit('SET_LOADING', false);
    }
  },

  /**
   * Enviar mensaje
   */
  async sendMessage({ commit, state }, { content, messageType, attachments }) {
    if (!state.currentConversation) {
      throw new Error('No hay conversación seleccionada');
    }

    commit('SET_ERROR', null);

    try {
      const response = await chatService.sendMessage(
        state.currentConversation.id,
        content,
        messageType,
        attachments
      );

      if (response.success) {
        commit('ADD_MESSAGE', response.data);

        // Actualizar conversación en la lista
        const updatedConversation = {
          ...state.currentConversation,
          lastMessageAt: new Date(),
          lastMessagePreview: content.substring(0, 100)
        };
        commit('UPDATE_CONVERSATION', updatedConversation);

        return response.data;
      }
    } catch (error) {
      commit('SET_ERROR', error.message);
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Marcar como leído
   */
  async markAsRead({ commit }, conversationId) {
    try {
      await chatService.markAsRead(conversationId);
      commit('CLEAR_UNREAD', conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  /**
   * Recibir mensaje en tiempo real (WebSocket)
   */
  receiveMessage({ commit, state }, { message, sender }) {
    // Si es de la conversación actual, agregar a mensajes
    if (state.currentConversation && message.conversationId === state.currentConversation.id) {
      commit('ADD_MESSAGE', { ...message, sender });
    }

    // Actualizar conversación
    const conversation = state.conversations.find(c => c.id === message.conversationId);
    if (conversation) {
      const updatedConversation = {
        ...conversation,
        lastMessageAt: message.createdAt,
        lastMessagePreview: message.content.substring(0, 100)
      };
      commit('UPDATE_CONVERSATION', updatedConversation);

      // Incrementar no leídos si no es la conversación actual
      if (!state.currentConversation || message.conversationId !== state.currentConversation.id) {
        commit('INCREMENT_UNREAD', message.conversationId);
      }
    }
  },

  /**
   * Obtener estado de Telegram
   */
  async fetchTelegramStatus({ commit }) {
    try {
      const response = await chatService.getTelegramStatus();
      if (response.success) {
        commit('SET_TELEGRAM_STATUS', response.data);
      }
    } catch (error) {
      console.error('Error fetching telegram status:', error);
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
};
