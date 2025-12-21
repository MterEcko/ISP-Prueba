<template>
  <div class="floating-chat-container">
    <!-- Botón flotante -->
    <transition name="bounce">
      <div
        v-if="!isOpen"
        @click="toggleChat"
        class="chat-bubble"
        :class="{ 'has-unread': totalUnread > 0 }"
      >
        <div class="chat-icon">💬</div>
        <div v-if="totalUnread > 0" class="unread-badge">{{ totalUnread > 99 ? '99+' : totalUnread }}</div>
      </div>
    </transition>

    <!-- Ventana de chat -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chat-window">
        <!-- Header -->
        <div class="chat-window-header">
          <div class="header-left">
            <div v-if="!currentConversation" class="header-title">
              <span>💬 Mensajes</span>
              <span v-if="totalUnread > 0" class="unread-count">({{ totalUnread }})</span>
            </div>
            <div v-else class="header-title">
              <button @click="backToList" class="btn-back">←</button>
              <span>{{ currentConversation.name }}</span>
            </div>
          </div>
          <div class="header-actions" v-if="currentConversation && !isClient">
            <button @click="startVoiceCall" class="btn-call" title="Llamada de voz">
              📞
            </button>
            <button @click="startVideoCall" class="btn-call" title="Videollamada">
              📹
            </button>
          </div>
          <div class="header-actions">
            <button @click="minimize" class="btn-minimize" title="Minimizar">−</button>
            <button @click="closeChat" class="btn-close" title="Cerrar">×</button>
          </div>
        </div>

        <!-- Body: Lista de conversaciones o chat activo -->
        <div class="chat-window-body">
          <!-- Lista de conversaciones -->
          <div v-if="!currentConversation" class="conversations-panel">
            <div class="search-box-mini">
              <input
                v-model="searchQuery"
                placeholder="Buscar conversaciones..."
                class="search-input-mini"
              />
            </div>

            <div class="conversations-list-mini">
              <div
                v-for="conv in filteredConversations"
                :key="conv.id"
                @click="openConversation(conv)"
                class="conversation-item-mini"
                :class="{ 'has-unread': conv.unreadCount > 0 }"
              >
                <div class="conv-avatar" :style="{ backgroundColor: getConversationColor(conv) }">
                  {{ getConversationInitials(conv) }}
                </div>
                <div class="conv-info">
                  <div class="conv-name">{{ conv.name || 'Sin nombre' }}</div>
                  <div class="conv-preview">{{ conv.lastMessagePreview || 'No hay mensajes' }}</div>
                </div>
                <div v-if="conv.unreadCount > 0" class="conv-unread">{{ conv.unreadCount }}</div>
              </div>

              <div v-if="filteredConversations.length === 0" class="no-conversations-mini">
                No hay conversaciones
              </div>
            </div>

            <button @click="showNewChatDialog = true" class="btn-new-conversation">
              ✉️ Nueva conversación
            </button>
          </div>

          <!-- Chat activo -->
          <div v-else class="active-chat-panel">
            <div class="messages-container-mini" ref="messagesContainer">
              <div v-if="loadingMessages" class="loading-mini">Cargando...</div>
              <div v-else-if="currentMessages.length === 0" class="no-messages-mini">
                No hay mensajes. ¡Empieza la conversación!
              </div>
              <div v-else class="messages-list-mini">
                <div
                  v-for="message in currentMessages"
                  :key="message.id"
                  :class="['message-mini', { 'own-message-mini': isOwnMessage(message) }]"
                >
                  <div class="message-bubble-mini">
                    <div v-if="!isOwnMessage(message)" class="message-sender-mini">
                      {{ message.sender?.fullName || message.sender?.username }}
                    </div>
                    <p>{{ message.content }}</p>
                    <div class="message-time-mini">{{ formatMessageTime(message.createdAt) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input de mensaje -->
            <div class="message-input-mini">
              <input
                v-model="newMessage"
                @keyup.enter="sendMessage"
                placeholder="Escribe un mensaje..."
                class="message-input-field"
              />
              <button @click="sendMessage" :disabled="!newMessage.trim()" class="btn-send-mini">
                ➤
              </button>
            </div>
          </div>
        </div>

        <!-- Dialog nueva conversación (versión mini) -->
        <div v-if="showNewChatDialog" class="dialog-overlay-mini" @click.self="closeNewChatDialog">
          <div class="dialog-content-mini">
            <div class="dialog-header-mini">
              <h4>Nueva conversación</h4>
              <button @click="closeNewChatDialog" class="btn-close-dialog">×</button>
            </div>
            <div class="dialog-body-mini">
              <input
                v-model="userSearchQuery"
                @input="searchUsers"
                placeholder="Buscar usuarios..."
                class="user-search-mini"
              />

              <div class="selected-users-mini">
                <span v-for="user in selectedUsers" :key="user.id" class="user-chip-mini">
                  {{ user.fullName || user.username }}
                  <button @click="removeUser(user)" class="chip-remove-mini">×</button>
                </span>
              </div>

              <div v-if="availableUsers.length > 0" class="user-results-mini">
                <div
                  v-for="user in filteredUsersForDialog"
                  :key="user.id"
                  @click="selectUser(user)"
                  class="user-result-mini"
                >
                  {{ user.fullName || user.username }}
                </div>
              </div>

              <button
                @click="createNewConversation"
                :disabled="selectedUsers.length === 0"
                class="btn-create-mini"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Componente de video llamada -->
    <VideoCallWindow
      ref="videoCall"
      @call-initiated="handleCallInitiated"
      @call-accepted="handleCallAccepted"
      @call-rejected="handleCallRejected"
      @call-ended="handleCallEnded"
      @ice-candidate="handleIceCandidate"
    />
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import chatService from '@/services/chat.service';
import userService from '@/services/user.service';
import socketService from '@/services/socket.service';
import VideoCallWindow from '@/components/VideoCallWindow.vue';

export default {
  name: 'FloatingChat',

  components: {
    VideoCallWindow
  },

  data() {
    return {
      isOpen: false,
      isMinimized: false,
      searchQuery: '',
      newMessage: '',
      loadingMessages: false,

      // Nueva conversación
      showNewChatDialog: false,
      userSearchQuery: '',
      selectedUsers: [],
      availableUsers: [],

      // Polling
      pollInterval: null,
      POLL_INTERVAL: 5000, // 5 segundos

      // WebRTC
      activeCallUserId: null
    };
  },

  computed: {
    ...mapState('chat', ['conversations', 'currentConversation', 'messages']),
    ...mapGetters('chat', ['sortedConversations', 'currentMessages']),

    filteredConversations() {
      if (!this.searchQuery) return this.sortedConversations;
      const query = this.searchQuery.toLowerCase();
      return this.sortedConversations.filter(conv =>
        conv.name?.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
      );
    },

    totalUnread() {
      return this.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
    },

    filteredUsersForDialog() {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return this.availableUsers.filter(user => {
        if (user.id === currentUser.id) return false;
        if (this.selectedUsers.some(selected => selected.id === user.id)) return false;
        return true;
      });
    },

    isClient() {
      // Verificar si es un cliente del portal
      const clientToken = localStorage.getItem('clientToken');
      const client = localStorage.getItem('client');
      return !!(clientToken && client);
    }
  },

  watch: {
    isOpen(newVal) {
      if (newVal) {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    }
  },

  mounted() {
    this.fetchConversations();

    // Conectar socket
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (currentUser.id) {
      socketService.connect(currentUser.id);

      // Registrar handlers de llamadas
      socketService.on('incoming-call', this.handleIncomingCall);
      socketService.on('call-answered', this.handleCallAnsweredFromSocket);
      socketService.on('call-rejected', this.handleCallRejectedFromSocket);
      socketService.on('call-ended', this.handleCallEndedFromSocket);
      socketService.on('ice-candidate', this.handleIceCandidateFromSocket);
    }
  },

  beforeUnmount() {
    this.stopPolling();

    // Desconectar socket y limpiar handlers
    socketService.off('incoming-call', this.handleIncomingCall);
    socketService.off('call-answered', this.handleCallAnsweredFromSocket);
    socketService.off('call-rejected', this.handleCallRejectedFromSocket);
    socketService.off('call-ended', this.handleCallEndedFromSocket);
    socketService.off('ice-candidate', this.handleIceCandidateFromSocket);
  },

  methods: {
    ...mapActions('chat', ['fetchConversations', 'selectConversation', 'sendMessage']),

    toggleChat() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.fetchConversations();
      }
    },

    minimize() {
      this.isOpen = false;
    },

    closeChat() {
      this.isOpen = false;
      this.$store.commit('chat/SET_CURRENT_CONVERSATION', null);
      this.searchQuery = '';
      this.newMessage = '';
    },

    backToList() {
      this.$store.commit('chat/SET_CURRENT_CONVERSATION', null);
      this.fetchConversations();
    },

    async openConversation(conversation) {
      this.loadingMessages = true;
      await this.$store.dispatch('chat/selectConversation', conversation);
      this.loadingMessages = false;
      this.$nextTick(() => this.scrollToBottom());
    },

    async sendMessage() {
      if (!this.newMessage.trim() || !this.currentConversation) return;

      try {
        await this.$store.dispatch('chat/sendMessage', {
          content: this.newMessage,
          messageType: 'text',
          attachments: []
        });
        this.newMessage = '';
        this.$nextTick(() => this.scrollToBottom());
      } catch (error) {
        console.error('Error sending message:', error);
      }
    },

    isOwnMessage(message) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return message.senderId === currentUser.id;
    },

    formatMessageTime(date) {
      return chatService.formatMessageTime(date);
    },

    getConversationInitials(conversation) {
      return conversation.name?.[0]?.toUpperCase() || '?';
    },

    getConversationColor(conversation) {
      const colors = ['#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c'];
      const hash = conversation.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[hash % colors.length];
    },

    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    // Polling para actualización automática
    startPolling() {
      this.pollInterval = setInterval(() => {
        this.fetchConversations();
        if (this.currentConversation) {
          this.$store.dispatch('chat/fetchMessages', this.currentConversation.id);
        }
      }, this.POLL_INTERVAL);
    },

    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    },

    // Nueva conversación
    async searchUsers() {
      if (!this.userSearchQuery || this.userSearchQuery.length < 2) {
        this.availableUsers = [];
        return;
      }

      try {
        const response = await userService.getAllUsers({
          username: this.userSearchQuery,
          size: 10
        });
        this.availableUsers = response.data.users || response.data.data || response.data || [];
      } catch (error) {
        console.error('Error searching users:', error);
        this.availableUsers = [];
      }
    },

    selectUser(user) {
      if (!this.selectedUsers.some(u => u.id === user.id)) {
        this.selectedUsers.push(user);
      }
      this.userSearchQuery = '';
      this.availableUsers = [];
    },

    removeUser(user) {
      this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    },

    async createNewConversation() {
      if (this.selectedUsers.length === 0) return;

      try {
        const participantIds = this.selectedUsers.map(u => u.id);
        const name = this.selectedUsers.length === 1
          ? this.selectedUsers[0].fullName || this.selectedUsers[0].username
          : this.selectedUsers.map(u => u.fullName || u.username).join(', ');
        const type = this.selectedUsers.length === 1 ? 'direct' : 'group';

        const response = await chatService.createConversation(participantIds, name, type);
        if (response.success) {
          await this.fetchConversations();
          await this.openConversation(response.data);
          this.closeNewChatDialog();
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    },

    closeNewChatDialog() {
      this.showNewChatDialog = false;
      this.userSearchQuery = '';
      this.selectedUsers = [];
      this.availableUsers = [];
    },

    // === MÉTODOS DE VIDEO LLAMADAS ===

    startVoiceCall() {
      if (!this.currentConversation) return;

      // Obtener ID del otro usuario (conversación directa)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const otherParticipant = this.currentConversation.participants?.find(
        p => p !== currentUser.id
      );

      if (otherParticipant) {
        this.$refs.videoCall.startCall(
          otherParticipant,
          this.currentConversation.name,
          'audio'
        );
      }
    },

    startVideoCall() {
      if (!this.currentConversation) return;

      // Obtener ID del otro usuario (conversación directa)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const otherParticipant = this.currentConversation.participants?.find(
        p => p !== currentUser.id
      );

      if (otherParticipant) {
        this.$refs.videoCall.startCall(
          otherParticipant,
          this.currentConversation.name,
          'video'
        );
      }
    },

    // Handlers de señalización WebRTC (enviar al servidor)
    handleCallInitiated(data) {
      this.activeCallUserId = data.userId;
      socketService.sendCallOffer(data.userId, data.offer, data.callType);
    },

    handleCallAccepted(data) {
      socketService.sendCallAnswer(data.userId, data.answer);
    },

    handleCallRejected(data) {
      socketService.sendCallReject(data.userId);
      this.activeCallUserId = null;
    },

    handleCallEnded(data) {
      if (data && data.userId) {
        socketService.sendCallEnd(data.userId);
      }
      this.activeCallUserId = null;
    },

    handleIceCandidate(data) {
      socketService.sendIceCandidate(data.userId, data.candidate);
    },

    // Handlers de señalización WebRTC (recibir del servidor)
    handleIncomingCall(data) {
      const { callerId, offer, callType } = data;
      this.activeCallUserId = callerId;

      // Buscar nombre del llamador
      const callerConv = this.conversations.find(c =>
        c.participants && c.participants.includes(callerId)
      );
      const callerName = callerConv ? callerConv.name : 'Usuario';

      // Mostrar llamada entrante en VideoCallWindow
      this.$refs.videoCall.receiveCall(callerId, callerName, offer, callType);
    },

    handleCallAnsweredFromSocket(data) {
      this.$refs.videoCall.handleAnswer(data.answer);
    },

    handleCallRejectedFromSocket() {
      this.$refs.videoCall.endCall();
      this.activeCallUserId = null;
    },

    handleCallEndedFromSocket() {
      this.$refs.videoCall.endCall();
      this.activeCallUserId = null;
    },

    handleIceCandidateFromSocket(data) {
      this.$refs.videoCall.addIceCandidate(data.candidate);
    }
  }
};
</script>

<style scoped>
/* Chat flotante */
.floating-chat-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
}

.chat-bubble {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
}

.chat-bubble:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.chat-bubble.has-unread {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.chat-icon {
  font-size: 28px;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #e74c3c;
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
}

.chat-window {
  width: 380px;
  height: 550px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-window-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-back {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px 0 0;
}

.unread-count {
  font-size: 13px;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-call {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-call:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.btn-minimize,
.btn-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-minimize:hover,
.btn-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-window-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Lista de conversaciones */
.conversations-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-box-mini {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.search-input-mini {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
}

.conversations-list-mini {
  flex: 1;
  overflow-y: auto;
}

.conversation-item-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.conversation-item-mini:hover {
  background: #f8f9fa;
}

.conversation-item-mini.has-unread {
  background: #e3f2fd;
}

.conv-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-preview {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-unread {
  background: #e74c3c;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: bold;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.no-conversations-mini {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.btn-new-conversation {
  margin: 12px;
  padding: 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background 0.2s;
}

.btn-new-conversation:hover {
  background: #5568d3;
}

/* Chat activo */
.active-chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.messages-container-mini {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f5f5f5;
}

.loading-mini,
.no-messages-mini {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.messages-list-mini {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-mini {
  display: flex;
}

.message-mini.own-message-mini {
  justify-content: flex-end;
}

.message-bubble-mini {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 12px;
  background: white;
  word-wrap: break-word;
}

.own-message-mini .message-bubble-mini {
  background: #667eea;
  color: white;
}

.message-sender-mini {
  font-size: 11px;
  color: #666;
  margin-bottom: 3px;
  font-weight: 600;
}

.own-message-mini .message-sender-mini {
  color: rgba(255, 255, 255, 0.8);
}

.message-bubble-mini p {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.message-time-mini {
  font-size: 10px;
  opacity: 0.6;
  margin-top: 3px;
}

.message-input-mini {
  display: flex;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.message-input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
}

.btn-send-mini {
  margin-left: 8px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-send-mini:hover:not(:disabled) {
  background: #5568d3;
}

.btn-send-mini:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

/* Dialog mini */
.dialog-overlay-mini {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.dialog-content-mini {
  background: white;
  border-radius: 12px;
  width: 320px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.dialog-header-mini {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header-mini h4 {
  margin: 0;
  font-size: 16px;
}

.btn-close-dialog {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.dialog-body-mini {
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.user-search-mini {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.selected-users-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.user-chip-mini {
  background: #667eea;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip-remove-mini {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.user-results-mini {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 12px;
}

.user-result-mini {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
}

.user-result-mini:hover {
  background: #f0f0f0;
}

.btn-create-mini {
  width: 100%;
  padding: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-create-mini:hover:not(:disabled) {
  background: #5568d3;
}

.btn-create-mini:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

/* Animations */
.bounce-enter-active {
  animation: bounce-in 0.5s;
}
.bounce-leave-active {
  animation: bounce-in 0.5s reverse;
}
@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Scrollbar personalizado */
.conversations-list-mini::-webkit-scrollbar,
.messages-container-mini::-webkit-scrollbar,
.user-results-mini::-webkit-scrollbar {
  width: 6px;
}

.conversations-list-mini::-webkit-scrollbar-track,
.messages-container-mini::-webkit-scrollbar-track,
.user-results-mini::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.conversations-list-mini::-webkit-scrollbar-thumb,
.messages-container-mini::-webkit-scrollbar-thumb,
.user-results-mini::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.conversations-list-mini::-webkit-scrollbar-thumb:hover,
.messages-container-mini::-webkit-scrollbar-thumb:hover,
.user-results-mini::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
