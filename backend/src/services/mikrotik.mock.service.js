// backend/src/services/mikrotik.mock.service.js
// Mock service para pruebas de MikroTik sin hardware real

const logger = console;

// Simulador de base de datos en memoria para usuarios PPPoE
const mockPPPoEUsers = new Map();
const mockActiveSessions = new Map();
const mockProfiles = new Map([
  ['1', { id: '1', name: '10Mbps', rate: '10M/10M' }],
  ['2', { id: '2', name: '20Mbps', rate: '20M/20M' }],
  ['3', { id: '3', name: '50Mbps', rate: '50M/50M' }]
]);

let userIdCounter = 1;
let sessionIdCounter = 1;

const MikrotikMockService = {
  // Test de conexión (siempre exitoso en mock)
  testConnection: async (ipAddress, apiPort = 8728, username, password) => {
    logger.info(`[MOCK] Simulando conexión a MikroTik ${ipAddress}`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simular delay
    return true;
  },

  // Información del dispositivo (datos simulados)
  getDeviceInfo: async (ipAddress, apiPort = 8728, username, password) => {
    logger.info(`[MOCK] Obteniendo info de dispositivo ${ipAddress}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      identity: 'MikroTik-TEST-ROUTER',
      model: 'RouterBOARD 1100AHx4',
      version: '7.12.1',
      serialNumber: 'ABCD-1234-EFGH',
      uptime: '3w2d12h45m',
      cpuLoad: Math.floor(Math.random() * 30) + 10,
      freeMemory: '2048MB',
      totalMemory: '4096MB',
      freeDisk: '128MB',
      totalDisk: '512MB'
    };
  },

  // Métricas del dispositivo
  getMetrics: async (ipAddress, apiPort = 8728, username, password) => {
    logger.info(`[MOCK] Obteniendo métricas de ${ipAddress}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      cpuLoad: Math.floor(Math.random() * 40) + 10,
      memoryUsage: Math.floor(Math.random() * 50) + 30,
      diskUsage: Math.floor(Math.random() * 30) + 20,
      uptime: '3w2d12h45m',
      activeSessions: mockActiveSessions.size,
      totalUsers: mockPPPoEUsers.size,
      interfaces: [
        { name: 'ether1', rxBytes: '1024MB', txBytes: '2048MB', running: true },
        { name: 'ether2', rxBytes: '512MB', txBytes: '1024MB', running: true },
        { name: 'bridge1', rxBytes: '5GB', txBytes: '10GB', running: true }
      ]
    };
  },

  // Crear usuario PPPoE
  createPPPoEUser: async (ipAddress, apiPort, username, password, pppoeUsername, pppoePassword, profile, ipAddress_user) => {
    logger.info(`[MOCK] Creando usuario PPPoE: ${pppoeUsername}`);
    await new Promise(resolve => setTimeout(resolve, 150));

    if (mockPPPoEUsers.has(pppoeUsername)) {
      throw new Error('Usuario ya existe');
    }

    const userId = (userIdCounter++).toString();
    const user = {
      id: userId,
      name: pppoeUsername,
      password: pppoePassword,
      profile: profile || 'default',
      localAddress: ipAddress_user || 'pool',
      disabled: false,
      service: 'pppoe',
      callerID: '',
      comment: 'Creado desde ISP System (MOCK)',
      createdAt: new Date().toISOString()
    };

    mockPPPoEUsers.set(pppoeUsername, user);

    return {
      success: true,
      userId: userId,
      user: user
    };
  },

  // Actualizar usuario PPPoE
  updatePPPoEUser: async (ipAddress, apiPort, username, password, pppoeUsername, updates) => {
    logger.info(`[MOCK] Actualizando usuario PPPoE: ${pppoeUsername}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!mockPPPoEUsers.has(pppoeUsername)) {
      throw new Error('Usuario no encontrado');
    }

    const user = mockPPPoEUsers.get(pppoeUsername);
    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    mockPPPoEUsers.set(pppoeUsername, user);

    return {
      success: true,
      user: user
    };
  },

  // Actualizar IP de usuario
  updatePPPoEUserIP: async (ipAddress, apiPort, username, password, pppoeUsername, newIP) => {
    logger.info(`[MOCK] Actualizando IP de ${pppoeUsername} a ${newIP}`);
    return await MikrotikMockService.updatePPPoEUser(ipAddress, apiPort, username, password, pppoeUsername, {
      localAddress: newIP
    });
  },

  // Eliminar usuario PPPoE
  deletePPPoEUser: async (ipAddress, apiPort, username, password, pppoeUsername) => {
    logger.info(`[MOCK] Eliminando usuario PPPoE: ${pppoeUsername}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!mockPPPoEUsers.has(pppoeUsername)) {
      throw new Error('Usuario no encontrado');
    }

    mockPPPoEUsers.delete(pppoeUsername);

    // También eliminar sesión activa si existe
    mockActiveSessions.delete(pppoeUsername);

    return {
      success: true,
      message: `Usuario ${pppoeUsername} eliminado correctamente`
    };
  },

  // Obtener usuarios PPPoE
  getPPPoEUsers: async (ipAddress, apiPort, username, password) => {
    logger.info(`[MOCK] Obteniendo lista de usuarios PPPoE`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return Array.from(mockPPPoEUsers.values());
  },

  // Obtener perfiles PPPoE
  getPPPoEProfiles: async (ipAddress, apiPort, username, password) => {
    logger.info(`[MOCK] Obteniendo perfiles PPPoE`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return Array.from(mockProfiles.values());
  },

  // Crear perfil PPPoE
  createPPPoEProfile: async (ipAddress, apiPort, username, password, profileName, rateLimit) => {
    logger.info(`[MOCK] Creando perfil PPPoE: ${profileName}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    const profileId = (mockProfiles.size + 1).toString();
    const profile = {
      id: profileId,
      name: profileName,
      rate: rateLimit,
      localAddress: 'pool',
      remoteAddress: 'pool'
    };

    mockProfiles.set(profileId, profile);

    return {
      success: true,
      profileId: profileId,
      profile: profile
    };
  },

  // Actualizar perfil PPPoE
  updatePPPoEProfile: async (ipAddress, apiPort, username, password, profileId, updates) => {
    logger.info(`[MOCK] Actualizando perfil ${profileId}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!mockProfiles.has(profileId)) {
      throw new Error('Perfil no encontrado');
    }

    const profile = mockProfiles.get(profileId);
    Object.assign(profile, updates);
    mockProfiles.set(profileId, profile);

    return {
      success: true,
      profile: profile
    };
  },

  // Sesiones activas
  getActivePPPoESessions: async (ipAddress, apiPort, username, password) => {
    logger.info(`[MOCK] Obteniendo sesiones activas PPPoE`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simular algunas sesiones activas
    const sessions = [];
    let count = 0;
    for (const [username, user] of mockPPPoEUsers.entries()) {
      if (count < 5 && !user.disabled) { // Simular que solo algunos están conectados
        const sessionId = `session-${sessionIdCounter++}`;
        const session = {
          id: sessionId,
          name: username,
          service: 'pppoe',
          callerID: `00:11:22:33:44:${count.toString().padStart(2, '0')}`,
          address: user.localAddress === 'pool' ? `10.0.0.${100 + count}` : user.localAddress,
          uptime: `${Math.floor(Math.random() * 24)}h${Math.floor(Math.random() * 60)}m`,
          encoding: 'mppe128',
          rxBytes: `${Math.floor(Math.random() * 1000)}MB`,
          txBytes: `${Math.floor(Math.random() * 2000)}MB`,
          rxPackets: Math.floor(Math.random() * 100000),
          txPackets: Math.floor(Math.random() * 150000)
        };

        sessions.push(session);
        mockActiveSessions.set(username, session);
        count++;
      }
    }

    return sessions;
  },

  // Reiniciar sesión PPPoE
  restartPPPoESession: async (ipAddress, apiPort, username, password, pppoeUsername) => {
    logger.info(`[MOCK] Reiniciando sesión de ${pppoeUsername}`);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Eliminar sesión activa
    mockActiveSessions.delete(pppoeUsername);

    // Simular reconexión después de un delay
    setTimeout(() => {
      const user = mockPPPoEUsers.get(pppoeUsername);
      if (user && !user.disabled) {
        const session = {
          id: `session-${sessionIdCounter++}`,
          name: pppoeUsername,
          service: 'pppoe',
          address: user.localAddress,
          uptime: '0s',
          rxBytes: '0',
          txBytes: '0'
        };
        mockActiveSessions.set(pppoeUsername, session);
      }
    }, 1000);

    return {
      success: true,
      message: `Sesión de ${pppoeUsername} reiniciada`
    };
  },

  // IP Pools
  getIPPools: async (ipAddress, apiPort, username, password) => {
    logger.info(`[MOCK] Obteniendo IP pools`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return [
      { name: 'pppoe-pool', ranges: '10.0.0.100-10.0.0.200' },
      { name: 'dhcp-pool', ranges: '192.168.1.100-192.168.1.200' },
      { name: 'static-pool', ranges: '10.10.10.1-10.10.10.50' }
    ];
  },

  // IPs disponibles en pool
  getPoolAvailableIPs: async (ipAddress, apiPort, username, password, poolName) => {
    logger.info(`[MOCK] Obteniendo IPs disponibles en pool ${poolName}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    const ips = [];
    for (let i = 100; i < 120; i++) {
      ips.push(`10.0.0.${i}`);
    }

    return ips;
  },

  // Estadísticas de tráfico
  getTrafficStatistics: async (ipAddress, apiPort, username, password, pppoeUsername) => {
    logger.info(`[MOCK] Obteniendo estadísticas de ${pppoeUsername}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    const session = mockActiveSessions.get(pppoeUsername);

    if (!session) {
      return {
        connected: false,
        message: 'Usuario no conectado actualmente'
      };
    }

    return {
      connected: true,
      uptime: session.uptime,
      rxBytes: session.rxBytes,
      txBytes: session.txBytes,
      rxPackets: session.rxPackets,
      txPackets: session.txPackets,
      address: session.address,
      callerID: session.callerID,
      currentRxRate: `${Math.floor(Math.random() * 10)}Mbps`,
      currentTxRate: `${Math.floor(Math.random() * 10)}Mbps`
    };
  },

  // Configurar QoS
  configureQoS: async (ipAddress, apiPort, username, password, targetIP, uploadLimit, downloadLimit) => {
    logger.info(`[MOCK] Configurando QoS para ${targetIP}: ${uploadLimit}/${downloadLimit}`);
    await new Promise(resolve => setTimeout(resolve, 150));

    return {
      success: true,
      queueId: `queue-${Date.now()}`,
      target: targetIP,
      maxLimit: `${uploadLimit}/${downloadLimit}`,
      message: 'QoS configurado correctamente'
    };
  },

  // Eliminar regla QoS
  deleteQoSRule: async (ipAddress, apiPort, username, password, queueId) => {
    logger.info(`[MOCK] Eliminando regla QoS ${queueId}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      message: 'Regla QoS eliminada'
    };
  },

  // Ejecutar acción genérica
  executeAction: async (ipAddress, apiPort, username, password, action, params = {}) => {
    logger.info(`[MOCK] Ejecutando acción: ${action}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      action: action,
      params: params,
      result: 'Acción simulada ejecutada correctamente',
      timestamp: new Date().toISOString()
    };
  }
};

module.exports = MikrotikMockService;
