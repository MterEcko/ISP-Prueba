<template>
  <div class="chat-container">
    <!-- Sidebar de conversaciones -->
    <div class="chat-sidebar">
      <div class="chat-header">
        <h2>Mensajes</h2>
        <button @click="showNewChatDialog = true" class="btn-new-chat" title="Nueva conversación">
          ✉️
        </button>
      </div>

      <!-- Estado de Telegram -->
      <div v-if="telegramStatus.isActive" class="telegram-status">
        <div v-if="telegramStatus.isLinked" class="status-linked">
          ✅ Conectado a Telegram
          <small v-if="telegramStatus.telegramUsername">@{{ telegramStatus.telegramUsername }}</small>
        </div>
        <div v-else class="status-not-linked">
          ⚠️ No vinculado
          <small>Usa /link en Telegram</small>
        </div>
      </div>

      <!-- Búsqueda -->
      <div class="search-box">
        <input v-model="searchQuery" placeholder="Buscar conversaciones..." />
      </div>

      <!-- Lista de conversaciones -->
      <div class="conversations-list">
        <div
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          :class="['conversation-item', { active: currentConversation?.id === conversation.id }]"
          @click="selectConversation(conversation)"
        >
          <div class="conversation-avatar">
            <div
              class="avatar-circle"
              :style="{ backgroundColor: getConversationColor(conversation) }"
            >
              {{ getConversationInitials(conversation) }}
            </div>
            <div v-if="conversation.unreadCount > 0" class="unread-badge">
              {{ conversation.unreadCount }}
            </div>
          </div>

          <div class="conversation-info">
            <div class="conversation-name">{{ conversation.name || 'Sin nombre' }}</div>
            <div class="conversation-preview">{{ conversation.lastMessagePreview || 'No hay mensajes' }}</div>
          </div>

          <div class="conversation-time">
            {{ formatMessageTime(conversation.lastMessageAt) }}
          </div>
        </div>

        <div v-if="filteredConversations.length === 0" class="no-conversations">
          No hay conversaciones
        </div>
      </div>
    </div>

    <!-- Área de chat -->
    <div class="chat-main">
      <div v-if="!currentConversation" class="no-conversation-selected">
        <div class="placeholder">
          <div class="icon">💬</div>
          <h3>Selecciona una conversación</h3>
          <p>Elige una conversación de la lista o inicia una nueva</p>
        </div>
      </div>

      <div v-else class="conversation-view">
        <!-- Header de conversación -->
        <div class="conversation-header">
          <div class="conversation-info">
            <h3>{{ currentConversation.name || 'Sin nombre' }}</h3>
            <span class="participants-count">{{ getParticipantsText(currentConversation) }}</span>
          </div>
          <div class="conversation-actions">
            <button class="btn-icon" title="Información">ℹ️</button>
          </div>
        </div>

        <!-- Mensajes -->
        <div class="messages-container" ref="messagesContainer">
          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            <p>Cargando mensajes...</p>
          </div>

          <div v-else-if="currentMessages.length === 0" class="no-messages">
            No hay mensajes en esta conversación
          </div>

          <div v-else class="messages-list">
            <div
              v-for="message in currentMessages"
              :key="message.id"
              :class="['message', { 'own-message': isOwnMessage(message) }]"
            >
              <div v-if="!isOwnMessage(message)" class="message-avatar">
                <div
                  class="avatar-circle small"
                  :style="{ backgroundColor: getUserColor(message.sender) }"
                >
                  {{ getUserInitials(message.sender) }}
                </div>
              </div>

              <div class="message-content">
                <div v-if="!isOwnMessage(message)" class="message-sender">
                  {{ message.sender?.fullName || message.sender?.username }}
                </div>

                <div class="message-bubble">
                  <p>{{ message.content }}</p>

                  <!-- Attachments -->
                  <div v-if="message.attachments && message.attachments.length > 0" class="message-attachments">
                    <div v-for="(attachment, index) in message.attachments" :key="index" class="attachment">
                      📎 {{ attachment.fileName || 'Archivo adjunto' }}
                    </div>
                  </div>

                  <div class="message-time">{{ formatMessageTime(message.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input de mensaje -->
        <div class="message-input">
          <button class="btn-icon" title="Adjuntar">📎</button>

          <input
            v-model="newMessage"
            @keyup.enter="sendMessage"
            placeholder="Escribe un mensaje..."
            type="text"
          />

          <button @click="sendMessage" class="btn-send" :disabled="!newMessage.trim()">
            Enviar
          </button>
        </div>
      </div>
    </div>

    <!-- Dialog nueva conversación -->
    <div v-if="showNewChatDialog" class="dialog-overlay" @click.self="closeNewChatDialog">
      <div class="dialog-content new-chat-dialog">
        <div class="dialog-header">
          <h3>Nueva conversación</h3>
          <button @click="closeNewChatDialog" class="btn-close">✕</button>
        </div>
        <div class="dialog-body">
          <!-- Búsqueda de usuarios -->
          <div class="search-users">
            <div class="search-label">Para:</div>
            <div class="search-input-container">
              <!-- Usuarios seleccionados -->
              <div class="selected-users">
                <span
                  v-for="user in selectedUsers"
                  :key="user.id"
                  class="user-chip"
                >
                  {{ user.fullName || user.username }}
                  <button @click="removeUser(user)" class="chip-remove">×</button>
                </span>
              </div>

              <!-- Input de búsqueda -->
              <input
                v-model="userSearchQuery"
                @input="searchUsers"
                @focus="showUserResults = true"
                placeholder="Buscar personas..."
                class="user-search-input"
              />
            </div>
          </div>

          <!-- Resultados de búsqueda -->
          <div v-if="showUserResults && filteredUsers.length > 0" class="user-results">
            <div
              v-for="user in filteredUsers"
              :key="user.id"
              @click="selectUser(user)"
              class="user-result-item"
            >
              <div class="user-avatar" :style="{ backgroundColor: getUserColor(user) }">
                {{ getUserInitials(user) }}
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.fullName || user.username }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
            </div>
          </div>

          <!-- Mensaje cuando no hay resultados -->
          <div v-if="showUserResults && userSearchQuery && filteredUsers.length === 0" class="no-results">
            No se encontraron usuarios
          </div>

          <!-- Botón crear -->
          <div class="dialog-footer">
            <button
              @click="createNewConversation"
              :disabled="selectedUsers.length === 0 || creatingConversation"
              class="btn-create-chat"
            >
              {{ creatingConversation ? 'Creando...' : 'Crear conversación' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import chatService from '@/services/chat.service';
import userService from '@/services/user.service';

export default {
  name: 'ChatView',

  data() {
    return {
      searchQuery: '',
      newMessage: '',
      showNewChatDialog: false,
      // Nuevo diálogo de conversación
      userSearchQuery: '',
      selectedUsers: [],
      availableUsers: [],
      showUserResults: false,
      creatingConversation: false
    };
  },

  computed: {
    ...mapState('chat', ['conversations', 'currentConversation', 'messages', 'loading', 'telegramStatus']),
    ...mapGetters('chat', ['sortedConversations', 'currentMessages']),

    filteredConversations() {
      if (!this.searchQuery) {
        return this.sortedConversations;
      }

      const query = this.searchQuery.toLowerCase();
      return this.sortedConversations.filter(conv =>
        conv.name?.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
      );
    },

    filteredUsers() {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      return this.availableUsers.filter(user => {
        // Excluir usuario actual
        if (user.id === currentUser.id) return false;

        // Excluir usuarios ya seleccionados
        if (this.selectedUsers.some(selected => selected.id === user.id)) return false;

        return true;
      });
    }
  },

  mounted() {
    this.fetchConversations();
    this.fetchTelegramStatus();
  },

  updated() {
    this.scrollToBottom();
  },

  methods: {
    ...mapActions('chat', [
      'fetchConversations',
      'selectConversation',
      'sendMessage',
      'fetchTelegramStatus'
    ]),

    async selectConversation(conversation) {
      await this.$store.dispatch('chat/selectConversation', conversation);
    },

    async sendMessage() {
      if (!this.newMessage.trim()) return;

      try {
        await this.$store.dispatch('chat/sendMessage', {
          content: this.newMessage,
          messageType: 'text',
          attachments: []
        });

        this.newMessage = '';
      } catch (error) {
        console.error('Error sending message:', error);
        this.$notify({ type: 'error', message: 'Error al enviar mensaje' });
      }
    },

    isOwnMessage(message) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      return message.senderId === currentUser.id;
    },

    formatMessageTime(date) {
      return chatService.formatMessageTime(date);
    },

    getUserInitials(user) {
      return chatService.getUserInitials(user);
    },

    getUserColor(user) {
      return chatService.getAvatarColor(user);
    },

    getConversationInitials(conversation) {
      return conversation.name?.[0]?.toUpperCase() || '?';
    },

    getConversationColor(conversation) {
      const colors = ['#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c'];
      const hash = conversation.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[hash % colors.length];
    },

    getParticipantsText(conversation) {
      const count = conversation.participants?.length || 0;
      return count === 1 ? '1 participante' : `${count} participantes`;
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },

    // === MÉTODOS PARA NUEVA CONVERSACIÓN ===

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
      // Evitar duplicados
      if (!this.selectedUsers.some(u => u.id === user.id)) {
        this.selectedUsers.push(user);
      }

      // Limpiar búsqueda
      this.userSearchQuery = '';
      this.availableUsers = [];
      this.showUserResults = false;
    },

    removeUser(user) {
      this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    },

    async createNewConversation() {
      if (this.selectedUsers.length === 0) return;

      this.creatingConversation = true;

      try {
        const participantIds = this.selectedUsers.map(u => u.id);

        // Determinar nombre y tipo de conversación
        let name = null;
        let type = 'direct';

        if (this.selectedUsers.length === 1) {
          // Conversación directa
          name = this.selectedUsers[0].fullName || this.selectedUsers[0].username;
          type = 'direct';
        } else {
          // Conversación grupal
          const names = this.selectedUsers.map(u => u.fullName || u.username);
          name = names.join(', ');
          type = 'group';
        }

        // Crear conversación
        const response = await chatService.createConversation(participantIds, name, type);

        if (response.success) {
          // Recargar conversaciones
          await this.fetchConversations();

          // Seleccionar la nueva conversación
          const newConversation = response.data;
          await this.selectConversation(newConversation);

          // Cerrar diálogo
          this.closeNewChatDialog();

          this.$notify?.({ type: 'success', message: 'Conversación creada exitosamente' });
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        this.$notify?.({ type: 'error', message: 'Error al crear conversación' });
      } finally {
        this.creatingConversation = false;
      }
    },

    closeNewChatDialog() {
      this.showNewChatDialog = false;
      this.userSearchQuery = '';
      this.selectedUsers = [];
      this.availableUsers = [];
      this.showUserResults = false;
      this.creatingConversation = false;
    }
  }
};
</script>

<style scoped>
.chat-container {
  display: grid;
  grid-template-columns: 350px 1fr;
  height: calc(100vh - 100px);
  background: #f5f5f5;
}

.chat-sidebar {
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header h2 {
  margin: 0;
  font-size: 24px;
}

.btn-new-chat {
  background: #3498db;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
}

.telegram-status {
  padding: 10px 20px;
  background: #e8f4f8;
  font-size: 12px;
}

.status-linked {
  color: #27ae60;
}

.status-not-linked {
  color: #f39c12;
}

.search-box {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.search-box input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: 12px;
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: #f8f9fa;
}

.conversation-item.active {
  background: #e3f2fd;
}

.conversation-avatar {
  position: relative;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.avatar-circle.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.unread-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #e74c3c;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.conversation-preview {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-time {
  font-size: 12px;
  color: #999;
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: white;
}

.no-conversation-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder {
  text-align: center;
  color: #999;
}

.placeholder .icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.conversation-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.conversation-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-header h3 {
  margin: 0;
}

.participants-count {
  font-size: 12px;
  color: #666;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  gap: 10px;
}

.message.own-message {
  flex-direction: row-reverse;
}

.message.own-message .message-content {
  align-items: flex-end;
}

.message.own-message .message-bubble {
  background: #3498db;
  color: white;
}

.message-content {
  display: flex;
  flex-direction: column;
  max-width: 60%;
}

.message-sender {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  font-weight: 600;
}

.message-bubble {
  background: #f0f0f0;
  padding: 10px 15px;
  border-radius: 12px;
}

.message-bubble p {
  margin: 0;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
}

.message-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.message-input input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 24px;
  outline: none;
}

.btn-send {
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.no-conversations,
.no-messages {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.dialog-body {
  padding: 20px;
}

/* === ESTILOS NUEVA CONVERSACIÓN (Estilo Facebook) === */
.new-chat-dialog {
  min-height: 400px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.new-chat-dialog .dialog-body {
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-users {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
}

.search-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.search-input-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  min-height: 42px;
}

.selected-users {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #3498db;
  color: white;
  padding: 4px 8px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
}

.chip-remove {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.chip-remove:hover {
  background: rgba(255, 255, 255, 0.2);
}

.user-search-input {
  flex: 1;
  min-width: 150px;
  border: none;
  background: transparent;
  outline: none;
  padding: 4px;
  font-size: 14px;
}

.user-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.user-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-result-item:hover {
  background: #f0f2f5;
}

.user-avatar {
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

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #050505;
  margin-bottom: 2px;
}

.user-email {
  font-size: 13px;
  color: #65676b;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.dialog-footer {
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.btn-create-chat {
  width: 100%;
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-create-chat:hover:not(:disabled) {
  background: #2980b9;
}

.btn-create-chat:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

/* Ajustar tamaño del diálogo */
.new-chat-dialog.dialog-content {
  max-width: 550px;
}
</style>
