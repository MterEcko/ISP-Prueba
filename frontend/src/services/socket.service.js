import { io } from 'socket.io-client';
import AuthService from './auth.service';
import { API_URL } from './frontend_apiConfig';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.eventHandlers = {};
  }

  connect(userId) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return;
    }

    // 1. Obtener el token ANTES de conectar (¡La lógica clave!)
    const user = AuthService.getCurrentUser();
    const token = user ? user.accessToken : null;

    if (!token) {
        console.error('Socket connection aborted: Authentication token not found. El usuario debe iniciar sesión.');
        return;
    }

    // 2. Convertir URL de API a URL base del socket (remover /api/)
    const SOCKET_URL = API_URL.replace(/\/api\/$/, '');

    console.log('🔌 Conectando socket a:', SOCKET_URL);
    console.log('🔑 Token presente:', !!token);

    this.socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.connected = true;

      if (userId) {
        this.userId = userId;
        this.socket.emit('register-user', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Eventos de llamadas
    this.socket.on('incoming-call', (data) => {
      this.emit('incoming-call', data);
    });

    this.socket.on('call-answered', (data) => {
      this.emit('call-answered', data);
    });

    this.socket.on('call-rejected', () => {
      this.emit('call-rejected');
    });

    this.socket.on('call-ended', () => {
      this.emit('call-ended');
    });

    this.socket.on('ice-candidate', (data) => {
      this.emit('ice-candidate', data);
    });

    this.socket.on('call-error', (data) => {
      this.emit('call-error', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.userId = null;
    }
  }

  // Emitir evento de llamada
  initiateCall(targetUserId, offer, callType = 'video') {
    if (this.socket) {
      console.log('📞 Emitiendo initiate-call a usuario:', targetUserId);
      this.socket.emit('initiate-call', {
        targetUserId: targetUserId,
        offer: offer,
        callType: callType
      });
    }
  }

  // Alias para compatibilidad con VideoCallWindow
  sendCallOffer(targetUserId, offer, callType = 'video') {
    return this.initiateCall(targetUserId, offer, callType);
  }

  // Responder llamada
  answerCall(callerId, answer) {
    if (this.socket) {
      console.log('📞 Emitiendo answer-call a usuario:', callerId);
      this.socket.emit('answer-call', {
        callerId: callerId,
        answer: answer
      });
    }
  }

  // Alias para compatibilidad
  sendCallAnswer(callerId, answer) {
    return this.answerCall(callerId, answer);
  }

  // Rechazar llamada
  rejectCall(callerId) {
    if (this.socket) {
      console.log('📞 Emitiendo reject-call a usuario:', callerId);
      this.socket.emit('reject-call', {
        callerId: callerId
      });
    }
  }

  // Finalizar llamada
  endCall(targetUserId) {
    if (this.socket) {
      console.log('📞 Emitiendo end-call a usuario:', targetUserId);
      this.socket.emit('end-call', {
        targetUserId: targetUserId
      });
    }
  }

  // Alias para compatibilidad
  sendCallEnd(targetUserId) {
    return this.endCall(targetUserId);
  }

  // Enviar ICE candidate
  sendIceCandidate(targetUserId, candidate) {
    if (this.socket) {
      this.socket.emit('ice-candidate', {
        targetUserId: targetUserId,
        candidate: candidate
      });
    }
  }

  // Sistema de eventos personalizado
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }
}

export default new SocketService();
