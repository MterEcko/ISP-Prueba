import { io } from 'socket.io-client';

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

    const API_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

    this.socket = io(API_URL, {
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
  sendCallOffer(userId, offer, callType) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('call-offer', {
      userId,
      offer,
      callType
    });
  }

  // Responder llamada
  sendCallAnswer(userId, answer) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('call-answer', {
      userId,
      answer
    });
  }

  // Enviar ICE candidate
  sendIceCandidate(userId, candidate) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('ice-candidate', {
      userId,
      candidate
    });
  }

  // Rechazar llamada
  sendCallReject(userId) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('call-reject', { userId });
  }

  // Terminar llamada
  sendCallEnd(userId) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit('call-end', { userId });
  }

  // Registrar manejador de eventos
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  // Remover manejador de eventos
  off(event, handler) {
    if (!this.eventHandlers[event]) return;

    this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
  }

  // Emitir eventos internos
  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  isConnected() {
    return this.connected;
  }
}

export default new SocketService();
