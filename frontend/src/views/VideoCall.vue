<template>
  <div class="video-call-container">
    <div class="call-header">
      <h2>=ù Videollamadas</h2>
      <button v-if="!inCall" @click="showCreateCallModal = true" class="btn-create-call">
        • Nueva Llamada
      </button>
      <button v-else @click="leaveCall" class="btn-leave-call">
        =Þ Salir de la Llamada
      </button>
    </div>

    <!-- Active Call -->
    <div v-if="inCall" class="active-call-section">
      <div class="call-info">
        <h3>{{ currentRoom.name }}</h3>
        <p>Sala: {{ currentRoom.roomId }}</p>
      </div>
      <div id="jitsi-meet-container" class="jitsi-container"></div>
    </div>

    <!-- Available Rooms / Create Call Section -->
    <div v-else class="calls-dashboard">
      <!-- Recent Rooms -->
      <div class="section">
        <h3><à Salas Recientes</h3>
        <div class="rooms-grid">
          <div
            v-for="room in recentRooms"
            :key="room.id"
            class="room-card"
            @click="joinRoom(room)"
          >
            <div class="room-icon">=ù</div>
            <div class="room-info">
              <h4>{{ room.name }}</h4>
              <p class="room-id">{{ room.roomId }}</p>
              <p class="room-time">{{ formatDate(room.createdAt) }}</p>
            </div>
            <div class="room-actions">
              <button @click.stop="joinRoom(room)" class="btn-join">
                Unirse
              </button>
              <button @click.stop="deleteRoom(room.id)" class="btn-delete">
                =Ñ
              </button>
            </div>
          </div>

          <div v-if="recentRooms.length === 0" class="empty-state">
            <p>=í No hay salas recientes</p>
            <p>Crea una nueva sala para iniciar una videollamada</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3>=€ Acciones Rápidas</h3>
        <div class="actions-grid">
          <div class="action-card" @click="createInstantMeeting">
            <div class="action-icon">¡</div>
            <h4>Reunión Instantánea</h4>
            <p>Iniciar una videollamada rápida</p>
          </div>

          <div class="action-card" @click="showJoinRoomModal = true">
            <div class="action-icon">=</div>
            <h4>Unirse con Código</h4>
            <p>Ingresar ID de sala manualmente</p>
          </div>

          <div class="action-card" @click="showScheduleModal = true">
            <div class="action-icon">=Å</div>
            <h4>Programar Reunión</h4>
            <p>Agendar para más tarde</p>
          </div>
        </div>
      </div>

      <!-- Call History -->
      <div class="section">
        <h3>=Ú Historial de Llamadas</h3>
        <div class="history-list">
          <div
            v-for="call in callHistory"
            :key="call.id"
            class="history-item"
          >
            <div class="history-icon">=Þ</div>
            <div class="history-info">
              <h4>{{ call.roomName }}</h4>
              <p>{{ formatDateTime(call.startedAt) }}</p>
              <p class="duration">Duración: {{ call.duration || 'N/A' }}</p>
            </div>
          </div>

          <div v-if="callHistory.length === 0" class="empty-state">
            <p>=í Sin historial de llamadas</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Call Modal -->
    <div v-if="showCreateCallModal" class="modal-overlay" @click.self="showCreateCallModal = false">
      <div class="modal-content">
        <h3>• Nueva Videollamada</h3>
        <form @submit.prevent="createCall">
          <div class="form-group">
            <label>Nombre de la Sala:</label>
            <input
              type="text"
              v-model="newCallForm.name"
              placeholder="Reunión de Equipo"
              required
            />
          </div>

          <div class="form-group">
            <label>Descripción (opcional):</label>
            <textarea
              v-model="newCallForm.description"
              placeholder="Detalles de la reunión..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" @click="showCreateCallModal = false" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-submit">
              Crear Sala
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Join Room Modal -->
    <div v-if="showJoinRoomModal" class="modal-overlay" @click.self="showJoinRoomModal = false">
      <div class="modal-content">
        <h3>= Unirse a Sala</h3>
        <form @submit.prevent="joinRoomById">
          <div class="form-group">
            <label>ID de la Sala:</label>
            <input
              type="text"
              v-model="joinRoomForm.roomId"
              placeholder="abc-def-ghi"
              required
            />
          </div>

          <div class="form-actions">
            <button type="button" @click="showJoinRoomModal = false" class="btn-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn-submit">
              Unirse
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Schedule Modal -->
    <div v-if="showScheduleModal" class="modal-overlay" @click.self="showScheduleModal = false">
      <div class="modal-content">
        <h3>=Å Programar Reunión</h3>
        <p class="info-text">Esta función estará disponible próximamente</p>
        <button @click="showScheduleModal = false" class="btn-submit">
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoCall',
  data() {
    return {
      // Jitsi
      jitsiApi: null,
      inCall: false,
      currentRoom: null,

      // Modals
      showCreateCallModal: false,
      showJoinRoomModal: false,
      showScheduleModal: false,

      // Forms
      newCallForm: {
        name: '',
        description: ''
      },
      joinRoomForm: {
        roomId: ''
      },

      // Data
      recentRooms: [],
      callHistory: [],

      // User info
      userInfo: {
        displayName: 'Usuario',
        email: ''
      }
    };
  },

  mounted() {
    this.loadUserInfo();
    this.loadRecentRooms();
    this.loadCallHistory();
    this.loadJitsiScript();
  },

  beforeUnmount() {
    if (this.jitsiApi) {
      this.jitsiApi.dispose();
    }
  },

  methods: {
    /**
     * Carga el script de Jitsi Meet
     */
    loadJitsiScript() {
      if (window.JitsiMeetExternalAPI) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      document.head.appendChild(script);
    },

    /**
     * Carga información del usuario
     */
    loadUserInfo() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        this.userInfo.displayName = user.username || user.nombre || 'Usuario';
        this.userInfo.email = user.email || '';
      }
    },

    /**
     * Carga salas recientes desde localStorage
     */
    loadRecentRooms() {
      const stored = localStorage.getItem('recentRooms');
      if (stored) {
        this.recentRooms = JSON.parse(stored);
      }
    },

    /**
     * Guarda salas recientes en localStorage
     */
    saveRecentRooms() {
      localStorage.setItem('recentRooms', JSON.stringify(this.recentRooms));
    },

    /**
     * Carga historial de llamadas desde localStorage
     */
    loadCallHistory() {
      const stored = localStorage.getItem('callHistory');
      if (stored) {
        this.callHistory = JSON.parse(stored);
      }
    },

    /**
     * Guarda historial de llamadas en localStorage
     */
    saveCallHistory() {
      localStorage.setItem('callHistory', JSON.stringify(this.callHistory));
    },

    /**
     * Crea una nueva sala de videollamada
     */
    createCall() {
      if (!this.newCallForm.name.trim()) {
        alert('Por favor ingresa un nombre para la sala');
        return;
      }

      const roomId = this.generateRoomId();
      const room = {
        id: Date.now(),
        name: this.newCallForm.name,
        description: this.newCallForm.description,
        roomId: roomId,
        createdAt: new Date().toISOString()
      };

      // Agregar a salas recientes
      this.recentRooms.unshift(room);
      if (this.recentRooms.length > 10) {
        this.recentRooms = this.recentRooms.slice(0, 10);
      }
      this.saveRecentRooms();

      // Cerrar modal y unirse a la sala
      this.showCreateCallModal = false;
      this.newCallForm = { name: '', description: '' };
      this.joinRoom(room);
    },

    /**
     * Crea una reunión instantánea
     */
    createInstantMeeting() {
      const roomId = this.generateRoomId();
      const room = {
        id: Date.now(),
        name: 'Reunión Instantánea',
        roomId: roomId,
        createdAt: new Date().toISOString()
      };

      this.recentRooms.unshift(room);
      if (this.recentRooms.length > 10) {
        this.recentRooms = this.recentRooms.slice(0, 10);
      }
      this.saveRecentRooms();

      this.joinRoom(room);
    },

    /**
     * Une a una sala por ID
     */
    joinRoomById() {
      if (!this.joinRoomForm.roomId.trim()) {
        alert('Por favor ingresa un ID de sala');
        return;
      }

      const room = {
        id: Date.now(),
        name: 'Sala ' + this.joinRoomForm.roomId,
        roomId: this.joinRoomForm.roomId,
        createdAt: new Date().toISOString()
      };

      this.showJoinRoomModal = false;
      this.joinRoomForm = { roomId: '' };
      this.joinRoom(room);
    },

    /**
     * Une a una sala de videollamada
     */
    joinRoom(room) {
      if (!window.JitsiMeetExternalAPI) {
        alert('Cargando Jitsi Meet... Por favor intenta de nuevo en unos segundos');
        return;
      }

      this.currentRoom = room;
      this.inCall = true;

      // Esperar a que el DOM se actualice
      this.$nextTick(() => {
        const domain = 'meet.jit.si'; // Puedes usar tu propio servidor
        const options = {
          roomName: room.roomId,
          width: '100%',
          height: '100%',
          parentNode: document.getElementById('jitsi-meet-container'),
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            enableWelcomePage: false
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'profile',
              'chat',
              'recording',
              'livestreaming',
              'etherpad',
              'sharedvideo',
              'settings',
              'raisehand',
              'videoquality',
              'filmstrip',
              'feedback',
              'stats',
              'shortcuts',
              'tileview',
              'download',
              'help',
              'mute-everyone'
            ]
          },
          userInfo: {
            displayName: this.userInfo.displayName,
            email: this.userInfo.email
          }
        };

        this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);

        // Eventos
        this.jitsiApi.addEventListener('videoConferenceJoined', () => {
          console.log('Unido a la videollamada');
          this.addToHistory(room);
        });

        this.jitsiApi.addEventListener('videoConferenceLeft', () => {
          console.log('Salió de la videollamada');
          this.leaveCall();
        });

        this.jitsiApi.addEventListener('readyToClose', () => {
          this.leaveCall();
        });
      });
    },

    /**
     * Sale de la videollamada
     */
    leaveCall() {
      if (this.jitsiApi) {
        this.jitsiApi.dispose();
        this.jitsiApi = null;
      }

      this.inCall = false;
      this.currentRoom = null;
    },

    /**
     * Agrega al historial de llamadas
     */
    addToHistory(room) {
      const historyItem = {
        id: Date.now(),
        roomName: room.name,
        roomId: room.roomId,
        startedAt: new Date().toISOString(),
        duration: null
      };

      this.callHistory.unshift(historyItem);
      if (this.callHistory.length > 20) {
        this.callHistory = this.callHistory.slice(0, 20);
      }
      this.saveCallHistory();
    },

    /**
     * Elimina una sala de las recientes
     */
    deleteRoom(roomId) {
      if (confirm('¿Eliminar esta sala de las recientes?')) {
        this.recentRooms = this.recentRooms.filter(r => r.id !== roomId);
        this.saveRecentRooms();
      }
    },

    /**
     * Genera un ID único para la sala
     */
    generateRoomId() {
      return `isp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Formatea una fecha
     */
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    },

    /**
     * Formatea fecha y hora
     */
    formatDateTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>

<style scoped>
.video-call-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.call-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
}

.btn-create-call,
.btn-leave-call {
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-create-call {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-create-call:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-leave-call {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.btn-leave-call:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

/* Active Call */
.active-call-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.call-info {
  margin-bottom: 15px;
  text-align: center;
}

.call-info h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.call-info p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.jitsi-container {
  width: 100%;
  height: 600px;
  border-radius: 8px;
  overflow: hidden;
}

/* Calls Dashboard */
.calls-dashboard {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

/* Rooms Grid */
.rooms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.room-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.room-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
}

.room-info {
  flex: 1;
}

.room-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.room-id {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin: 2px 0;
  font-family: monospace;
}

.room-time {
  font-size: 0.8rem;
  color: #95a5a6;
  margin: 2px 0;
}

.room-actions {
  display: flex;
  gap: 10px;
}

.btn-join,
.btn-delete {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.btn-join {
  background: #3498db;
  color: white;
}

.btn-join:hover {
  background: #2980b9;
}

.btn-delete {
  background: #e74c3c;
  color: white;
  padding: 8px 12px;
}

.btn-delete:hover {
  background: #c0392b;
}

/* Quick Actions */
.quick-actions {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 25px;
  border-radius: 12px;
  color: white;
}

.quick-actions h3 {
  margin: 0 0 20px 0;
  color: white;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.action-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.action-card:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.action-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.action-card h4 {
  margin: 0 0 10px 0;
  color: white;
}

.action-card p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

/* History */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.history-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 50%;
}

.history-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
}

.history-info p {
  margin: 2px 0;
  font-size: 0.85rem;
  color: #7f8c8d;
}

.duration {
  color: #3498db;
  font-weight: 600;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #95a5a6;
}

.empty-state p {
  margin: 10px 0;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #34495e;
  font-weight: 600;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dce4ec;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 25px;
}

.btn-cancel,
.btn-submit {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel {
  background: #95a5a6;
  color: white;
}

.btn-cancel:hover {
  background: #7f8c8d;
}

.btn-submit {
  background: #3498db;
  color: white;
}

.btn-submit:hover {
  background: #2980b9;
}

.info-text {
  text-align: center;
  color: #7f8c8d;
  margin: 20px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .rooms-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }

  .jitsi-container {
    height: 400px;
  }

  .room-card {
    flex-direction: column;
    text-align: center;
  }

  .room-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
