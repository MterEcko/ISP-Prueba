<template>
  <div v-if="isVisible" class="video-call-overlay">
    <div class="video-call-container">
      <!-- Header -->
      <div class="call-header">
        <div class="caller-info">
          <h3>{{ callerName }}</h3>
          <span class="call-status">{{ callStatus }}</span>
        </div>
        <button @click="endCall" class="btn-end-call" title="Terminar llamada">
          ✕
        </button>
      </div>

      <!-- Videos -->
      <div class="videos-container">
        <!-- Video remoto (principal) -->
        <div class="remote-video-wrapper">
          <video
            ref="remoteVideo"
            autoplay
            playsinline
            class="remote-video"
            :class="{ hidden: !remoteStreamActive }"
          ></video>
          <div v-if="!remoteStreamActive" class="video-placeholder">
            <div class="avatar-large" :style="{ backgroundColor: avatarColor }">
              {{ callerInitials }}
            </div>
            <p class="waiting-text">{{ waitingMessage }}</p>
          </div>
        </div>

        <!-- Video local (mini) -->
        <div class="local-video-wrapper" :class="{ hidden: !isVideoEnabled }">
          <video
            ref="localVideo"
            autoplay
            muted
            playsinline
            class="local-video"
          ></video>
          <div v-if="!localStreamActive" class="video-placeholder-local">
            <span>Tu</span>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="call-controls">
        <button
          @click="toggleMic"
          class="control-btn"
          :class="{ active: isMicEnabled }"
          title="Micrófono"
        >
          {{ isMicEnabled ? '🎤' : '🔇' }}
        </button>

        <button
          v-if="callType === 'video'"
          @click="toggleCamera"
          class="control-btn"
          :class="{ active: isVideoEnabled }"
          title="Cámara"
        >
          {{ isVideoEnabled ? '📹' : '📷' }}
        </button>

        <button
          @click="endCall"
          class="control-btn end-call-btn"
          title="Terminar llamada"
        >
          📞
        </button>
      </div>

      <!-- Llamada entrante -->
      <div v-if="isIncomingCall && !isCallActive" class="incoming-call">
        <div class="incoming-avatar" :style="{ backgroundColor: avatarColor }">
          {{ callerInitials }}
        </div>
        <h3>{{ callerName }}</h3>
        <p>{{ callType === 'video' ? 'Videollamada' : 'Llamada de voz' }} entrante...</p>
        <div class="incoming-actions">
          <button @click="acceptCall" class="btn-accept">
            {{ callType === 'video' ? '📹' : '📞' }} Aceptar
          </button>
          <button @click="rejectCall" class="btn-reject">
            ✕ Rechazar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VideoCallWindow',

  data() {
    return {
      isVisible: false,
      isCallActive: false,
      isIncomingCall: false,
      callType: 'video', // 'video' o 'audio'
      callerName: '',
      callerInitials: '',
      avatarColor: '#3498db',

      // WebRTC
      localStream: null,
      remoteStream: null,
      peerConnection: null,

      // Estados
      isMicEnabled: true,
      isVideoEnabled: true,
      localStreamActive: false,
      remoteStreamActive: false,
      callStatus: 'Llamando...',
      waitingMessage: 'Esperando respuesta...',

      // Configuración ICE servers (STUN/TURN)
      iceServers: [
        // Google STUN (gratis) - Para detectar IP pública
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },

        // Servidor TURN propio (para relay cuando peer-to-peer falla)
        {
          urls: 'turn:turn.isp.serviciosqbit.net:3478',
          username: 'ispuser',
          credential: 'SecurePassword2024!'
        },
        {
          urls: 'turns:turn.isp.serviciosqbit.net:5349',
          username: 'ispuser',
          credential: 'SecurePassword2024!'
        }
      ]
    };
  },

  methods: {
    // Iniciar llamada saliente
    async startCall(userId, userName, callType = 'video') {
      this.isVisible = true;
      this.isIncomingCall = false;
      this.isCallActive = false;
      this.callType = callType;
      this.callerName = userName;
      this.callerInitials = this.getInitials(userName);
      this.avatarColor = this.getAvatarColor(userId);
      this.callStatus = 'Llamando...';
      this.waitingMessage = 'Esperando respuesta...';

      try {
        // Obtener stream local
        await this.getLocalStream();

        // Crear peer connection
        this.createPeerConnection();

        // Agregar tracks al peer connection
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        // Crear oferta
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Enviar oferta al otro usuario (mediante señalización)
        this.$emit('call-initiated', {
          userId,
          offer: offer,
          callType: this.callType
        });

        this.isCallActive = true;
        this.callStatus = 'Conectando...';
      } catch (error) {
        console.error('Error iniciando llamada:', error);
        this.showError('No se pudo acceder a la cámara/micrófono');
        this.endCall();
      }
    },

    // Recibir llamada entrante
    async receiveCall(callerId, callerName, offer, callType = 'video') {
      this.isVisible = true;
      this.isIncomingCall = true;
      this.isCallActive = false;
      this.callType = callType;
      this.callerName = callerName;
      this.callerInitials = this.getInitials(callerName);
      this.avatarColor = this.getAvatarColor(callerId);
      this.waitingMessage = 'Llamada entrante...';

      // Guardar la oferta para procesarla si acepta
      this.pendingOffer = offer;
      this.callerId = callerId;
    },

    // Aceptar llamada entrante
    async acceptCall() {
      try {
        this.isIncomingCall = false;
        this.isCallActive = true;
        this.callStatus = 'Conectando...';

        // Obtener stream local
        await this.getLocalStream();

        // Crear peer connection
        this.createPeerConnection();

        // Agregar tracks locales
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });

        // Procesar oferta
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));

        // Crear respuesta
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Enviar respuesta
        this.$emit('call-accepted', {
          userId: this.callerId,
          answer: answer
        });

        this.callStatus = 'Conectado';
      } catch (error) {
        console.error('Error aceptando llamada:', error);
        this.showError('No se pudo aceptar la llamada');
        this.endCall();
      }
    },

    // Rechazar llamada
    rejectCall() {
      this.$emit('call-rejected', { userId: this.callerId });
      this.endCall();
    },

    // Recibir respuesta a la oferta
    async handleAnswer(answer) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.callStatus = 'Conectado';
      } catch (error) {
        console.error('Error procesando respuesta:', error);
      }
    },

    // Agregar candidato ICE
    async addIceCandidate(candidate) {
      try {
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error('Error agregando ICE candidate:', error);
      }
    },

    // Obtener stream local (cámara/micrófono)
    async getLocalStream() {
      const constraints = {
        audio: true,
        video: this.callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.$refs.localVideo.srcObject = this.localStream;
      this.localStreamActive = true;
    },

    // Crear conexión WebRTC
    createPeerConnection() {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10
      });

      // Manejar ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Mostrar tipo de conexion en consola
          console.log('ICE Candidate type:', event.candidate.type);
          console.log('Connection via:',
            event.candidate.type === 'host' ? 'LAN directa' :
            event.candidate.type === 'srflx' ? 'STUN (peer-to-peer via internet)' :
            event.candidate.type === 'relay' ? 'TURN (relay via servidor)' :
            'Desconocido'
          );

          this.$emit('ice-candidate', {
            userId: this.callerId,
            candidate: event.candidate
          });
        }
      };

      // Recibir stream remoto
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          this.$refs.remoteVideo.srcObject = this.remoteStream;
          this.remoteStreamActive = true;
          this.callStatus = 'Conectado';
          this.waitingMessage = '';
        }
      };

      // Monitorear estado de conexión
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('Connection state:', state);

        if (state === 'connected') {
          this.callStatus = 'Conectado';
        } else if (state === 'disconnected' || state === 'failed') {
          this.callStatus = 'Desconectado';
          setTimeout(() => this.endCall(), 2000);
        }
      };
    },

    // Alternar micrófono
    toggleMic() {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          this.isMicEnabled = audioTrack.enabled;
        }
      }
    },

    // Alternar cámara
    toggleCamera() {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          this.isVideoEnabled = videoTrack.enabled;
        }
      }
    },

    // Terminar llamada
    endCall() {
      // Detener tracks locales
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Cerrar peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Limpiar referencias
      if (this.$refs.localVideo) {
        this.$refs.localVideo.srcObject = null;
      }
      if (this.$refs.remoteVideo) {
        this.$refs.remoteVideo.srcObject = null;
      }

      this.remoteStream = null;
      this.localStreamActive = false;
      this.remoteStreamActive = false;

      // Emitir evento de finalización
      if (this.isCallActive || this.isIncomingCall) {
        this.$emit('call-ended', { userId: this.callerId });
      }

      // Ocultar ventana
      this.isVisible = false;
      this.isCallActive = false;
      this.isIncomingCall = false;
    },

    // Utilidades
    getInitials(name) {
      if (!name) return '?';
      const parts = name.split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    },

    getAvatarColor(userId) {
      const colors = ['#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c'];
      const hash = userId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[hash % colors.length];
    },

    showError(message) {
      // Mostrar notificación de error (puedes usar tu sistema de notificaciones)
      console.error(message);
      alert(message);
    }
  },

  beforeUnmount() {
    this.endCall();
  }
};
</script>

<style scoped>
.video-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-call-container {
  width: 100%;
  max-width: 1200px;
  height: 100vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
}

.call-header {
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.caller-info h3 {
  color: white;
  margin: 0 0 5px 0;
  font-size: 20px;
}

.call-status {
  color: #2ecc71;
  font-size: 14px;
}

.btn-end-call {
  background: #e74c3c;
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-end-call:hover {
  background: #c0392b;
}

.videos-container {
  flex: 1;
  position: relative;
  background: #000;
}

.remote-video-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.remote-video.hidden {
  display: none;
}

.video-placeholder {
  text-align: center;
  color: white;
}

.avatar-large {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 60px;
  font-weight: bold;
  margin: 0 auto 20px;
}

.waiting-text {
  font-size: 18px;
  color: #bbb;
}

.local-video-wrapper {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  background: #2c2c2c;
}

.local-video-wrapper.hidden {
  display: none;
}

.local-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Efecto espejo */
}

.video-placeholder-local {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  background: #3a3a3a;
}

.call-controls {
  background: rgba(0, 0, 0, 0.8);
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.control-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 28px;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn.active {
  background: #3498db;
}

.end-call-btn {
  background: #e74c3c;
}

.end-call-btn:hover {
  background: #c0392b;
}

/* Llamada entrante */
.incoming-call {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 10;
}

.incoming-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
  font-weight: bold;
  margin-bottom: 20px;
  animation: pulse-ring 2s infinite;
}

@keyframes pulse-ring {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
  }
  50% {
    box-shadow: 0 0 0 30px rgba(52, 152, 219, 0);
  }
}

.incoming-call h3 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.incoming-call p {
  margin: 0 0 30px 0;
  font-size: 16px;
  color: #bbb;
}

.incoming-actions {
  display: flex;
  gap: 20px;
}

.btn-accept,
.btn-reject {
  padding: 15px 30px;
  border: none;
  border-radius: 30px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-accept {
  background: #2ecc71;
  color: white;
}

.btn-accept:hover {
  background: #27ae60;
  transform: scale(1.05);
}

.btn-reject {
  background: #e74c3c;
  color: white;
}

.btn-reject:hover {
  background: #c0392b;
  transform: scale(1.05);
}

/* Responsive */
@media (max-width: 768px) {
  .local-video-wrapper {
    width: 120px;
    height: 90px;
    bottom: 10px;
    right: 10px;
  }

  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }
}
</style>
