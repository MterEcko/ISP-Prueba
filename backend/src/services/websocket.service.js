// backend/src/services/websocket.service.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const metricsService = require('./metrics.service');

/**
 * Servicio de WebSocket para actualizaciones en tiempo real
 */
class WebSocketService {
  constructor() {
    this.io = null;
    this.metricsInterval = null;
    this.connectedClients = new Map(); // Map de socket.id -> { userId, username, roles }
  }

  /**
   * Inicializa Socket.io con el servidor HTTP
   * @param {Object} server - Servidor HTTP de Express
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8080',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Middleware de autenticación
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error: Invalid token'));
        }

        // Guardar información del usuario en el socket
        socket.userId = decoded.id;
        socket.username = decoded.username;
        socket.roles = decoded.roles || [];

        next();
      });
    });

    // Eventos de conexión
    this.io.on('connection', (socket) => {
      this._handleConnection(socket);
    });

    // Iniciar envío periódico de métricas
    this._startMetricsInterval();

    console.log('✅ WebSocket Service inicializado');
  }

  /**
   * Maneja una nueva conexión de cliente
   * @private
   */
  _handleConnection(socket) {
    console.log(`📡 Cliente conectado: ${socket.username} (ID: ${socket.id})`);

    // Guardar cliente conectado
    this.connectedClients.set(socket.id, {
      userId: socket.userId,
      username: socket.username,
      roles: socket.roles,
      connectedAt: new Date()
    });

    // Enviar métricas iniciales
    this._sendMetricsToClient(socket);

    // Eventos del cliente
    socket.on('request:metrics', () => {
      this._sendMetricsToClient(socket);
    });

    socket.on('request:historical', async (data) => {
      try {
        const days = data?.days || 7;
        const historicalMetrics = await metricsService.getHistoricalMetrics(days);

        socket.emit('metrics:historical', {
          success: true,
          data: historicalMetrics
        });
      } catch (error) {
        socket.emit('metrics:historical', {
          success: false,
          error: error.message
        });
      }
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`📡 Cliente desconectado: ${socket.username} (ID: ${socket.id})`);
      this.connectedClients.delete(socket.id);
    });

    // Errores
    socket.on('error', (error) => {
      console.error(`❌ Error en socket ${socket.id}:`, error);
    });
  }

  /**
   * Envía métricas a un cliente específico
   * @private
   */
  async _sendMetricsToClient(socket) {
    try {
      const metrics = await metricsService.getDashboardMetrics();

      // Verificar si el usuario tiene permisos para ver métricas del sistema
      const isAdminOrManager = socket.roles.includes('admin') || socket.roles.includes('manager');

      // Filtrar métricas sensibles si no es admin/manager
      const filteredMetrics = {
        ...metrics
      };

      if (!isAdminOrManager) {
        // Ocultar métricas del sistema para usuarios normales
        delete filteredMetrics.system;
        delete filteredMetrics.plugins;
      }

      socket.emit('metrics:dashboard', {
        success: true,
        data: filteredMetrics
      });
    } catch (error) {
      console.error('Error enviando métricas al cliente:', error);
      socket.emit('metrics:dashboard', {
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Inicia el envío periódico de métricas a todos los clientes
   * @private
   */
  _startMetricsInterval() {
    // Enviar métricas cada 5 segundos
    const METRICS_INTERVAL = 5000;

    this.metricsInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) {
        return; // No enviar si no hay clientes conectados
      }

      try {
        const metrics = await metricsService.getDashboardMetrics();

        // Enviar a cada cliente conectado (con filtrado según roles)
        this.connectedClients.forEach((clientInfo, socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);

          if (socket) {
            const isAdminOrManager = clientInfo.roles.includes('admin') || clientInfo.roles.includes('manager');

            const filteredMetrics = {
              ...metrics
            };

            if (!isAdminOrManager) {
              delete filteredMetrics.system;
              delete filteredMetrics.plugins;
            }

            socket.emit('metrics:dashboard', {
              success: true,
              data: filteredMetrics
            });
          }
        });
      } catch (error) {
        console.error('Error en intervalo de métricas:', error);
      }
    }, METRICS_INTERVAL);

    console.log(`⏱️  Intervalo de métricas iniciado (cada ${METRICS_INTERVAL / 1000}s)`);
  }

  /**
   * Detiene el envío periódico de métricas
   */
  stopMetricsInterval() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      console.log('⏱️  Intervalo de métricas detenido');
    }
  }

  /**
   * Emite un evento a todos los clientes conectados
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Emite un evento a clientes con roles específicos
   * @param {string[]} roles - Roles permitidos (ej: ['admin', 'manager'])
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  broadcastToRoles(roles, event, data) {
    if (!this.io) return;

    this.connectedClients.forEach((clientInfo, socketId) => {
      const hasRole = clientInfo.roles.some(role => roles.includes(role));

      if (hasRole) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    });
  }

  /**
   * Emite una notificación a un usuario específico
   * @param {number} userId - ID del usuario
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  emitToUser(userId, event, data) {
    if (!this.io) return;

    this.connectedClients.forEach((clientInfo, socketId) => {
      if (clientInfo.userId === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    });
  }

  /**
   * Obtiene estadísticas de clientes conectados
   */
  getConnectedClientsStats() {
    const stats = {
      total: this.connectedClients.size,
      byRole: {
        admin: 0,
        manager: 0,
        user: 0
      },
      clients: []
    };

    this.connectedClients.forEach((clientInfo) => {
      if (clientInfo.roles.includes('admin')) {
        stats.byRole.admin++;
      } else if (clientInfo.roles.includes('manager')) {
        stats.byRole.manager++;
      } else {
        stats.byRole.user++;
      }

      stats.clients.push({
        userId: clientInfo.userId,
        username: clientInfo.username,
        roles: clientInfo.roles,
        connectedAt: clientInfo.connectedAt
      });
    });

    return stats;
  }

  /**
   * Cierra todas las conexiones
   */
  close() {
    this.stopMetricsInterval();

    if (this.io) {
      this.io.close();
      console.log('🔌 WebSocket Service cerrado');
    }

    this.connectedClients.clear();
  }
}

// Exportar instancia singleton
module.exports = new WebSocketService();
