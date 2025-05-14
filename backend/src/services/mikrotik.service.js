// Servicio para interactuar con dispositivos Mikrotik a través de RouterOS API
const { RouterOSAPI } = require('routeros');
const logger = require('../utils/logger');


console.log('Cargando mikrotik.service.js con routeros versión:', require('../../package.json').dependencies.routeros);
// Servicio Mikrotik
const MikrotikService = {
  // Test de conexión a dispositivo Mikrotik
  testConnection: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 5000
      });
      
      // Intentar conectar
      await api.connect();
      logger.info(`Conexión exitosa a Mikrotik ${ipAddress}`);
      return true;
    } catch (error) {
      logger.error(`Error conectando a Mikrotik ${ipAddress}: ${error.message}`);
      return false;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener información del dispositivo
  getDeviceInfo: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar y obtener información
      await api.connect();
      
      // Obtener identidad del sistema
      const identity = await api.write('/system/identity/print');
      
      // Obtener recursos del sistema
      const resources = await api.write('/system/resource/print');
      
      // Obtener interfaces
      const interfaces = await api.write('/interface/print');
      
      // Obtener clientes conectados (puede variar según la configuración)
      let clients = [];
      try {
        // Intentar obtener clientes PPPoE activos
        const pppoeClients = await api.write('/ppp/active/print');
        clients = pppoeClients;
      } catch (clientError) {
        logger.warn(`No se pudieron obtener clientes PPPoE de ${ipAddress}: ${clientError.message}`);
      }
      
      // Obtener información de versión
      const version = resources[0].version;
      
      // Formatear uptime
      const uptimeSeconds = resources[0].uptime;
      const uptime = formatUptime(uptimeSeconds);
      
      return {
        connected: true,
        info: {
          name: identity[0].name,
          model: resources[0]['board-name'],
          serial: resources[0]['serial-number'],
          version: version,
          uptime: uptime,
          cpuLoad: resources[0]['cpu-load'],
          memoryUsage: calculateMemoryPercentage(resources[0]['free-memory'], resources[0]['total-memory']),
          interfaces: interfaces.length,
          clients: clients.length
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo info de Mikrotik ${ipAddress}: ${error.message}`);
      return {
        connected: false,
        info: null
      };
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener métricas del dispositivo
  getMetrics: async (ipAddress, apiPort = 8728, username, password, period = '1h') => {
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 15000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener recursos del sistema para CPU y memoria actuales
      const resources = await api.write('/system/resource/print');
      
      // Obtener datos actuales (RouterOS no guarda historial)
      const cpuData = [{
        time: new Date(),
        value: parseFloat(resources[0]['cpu-load'])
      }];
      
      // Memoria actual
      const memoryData = [{
        time: new Date(),
        value: calculateMemoryPercentage(resources[0]['free-memory'], resources[0]['total-memory'])
      }];
      
      // Obtener estadísticas de tráfico de interfaces
      const trafficData = [];
      const interfaces = await api.write('/interface/print');
      
      // Para cada interfaz activa, obtener estadísticas
      for (const iface of interfaces) {
        if (iface.disabled !== 'true' && iface.running === 'true') {
          try {
            // Obtener estadísticas de la interfaz
            const stats = await api.write('/interface/monitor-traffic', {
              'interface': iface.name,
              'once': ''
            });
            
            if (stats && stats.length > 0) {
              trafficData.push({
                time: new Date(),
                interface: iface.name,
                rx: parseInt(stats[0]['rx-bits-per-second'] || 0),
                tx: parseInt(stats[0]['tx-bits-per-second'] || 0)
              });
            }
          } catch (error) {
            logger.error(`Error obteniendo estadísticas de ${iface.name}: ${error.message}`);
          }
        }
      }
      
      return {
        cpu: cpuData,
        memory: memoryData,
        traffic: trafficData
      };
    } catch (error) {
      logger.error(`Error obteniendo métricas de Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener todos los usuarios PPPoE
  getPPPoEUsers: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
		logger.info(`Intentando obtener usuarios PPPoE de ${ipAddress}:${apiPort} con usuario ${username}`);
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener todos los secretos PPPoE
      const secrets = await api.write('/ppp/secret/print');
      
      // Formatear datos
      const users = secrets.map(secret => ({
        id: secret['.id'],
        name: secret.name,
        service: secret.service,
        profile: secret.profile,
        comment: secret.comment,
        remoteAddress: secret['remote-address'],
        callerId: secret['caller-id'],
        disabled: secret.disabled === 'true'
      }));
      
	
      return users;
    } catch (error) {
      logger.error(`Error obteniendo usuarios PPPoE de Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
		  
        api.close();
      }
    }
  },
  
  // Obtener sesiones PPPoE activas
  getActivePPPoESessions: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
		logger.info(`Intentando obtener sesiones PPPoE con estadísticas de ${ipAddress}:${apiPort} con usuario ${username}`);
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener sesiones activas
      const sessions = await api.write('/ppp/active/print');
      
      // Formatear datos
      const activeSessions = sessions.map(session => ({
        id: session['.id'],
        name: session.name,
        service: session.service,
        callerId: session['caller-id'],
        address: session.address,
        uptime: session.uptime,
        encoding: session.encoding
      }));
	  
      
      return activeSessions;
    } catch (error) {
      logger.error(`Error obteniendo sesiones PPPoE activas de Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener IP Pools disponibles con sus comentarios
  getIPPools: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
      logger.info(`Intentando obtener IP pools de ${ipAddress}:${apiPort}`);
      
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener todos los IP pools
      const pools = await api.write('/ip/pool/print');
      
      // Formatear datos
      const formattedPools = pools.map(pool => ({
        id: pool['.id'],
        name: pool.name,
        ranges: pool.ranges,
        comment: pool.comment || '',
        nextPool: pool['next-pool'] || null,
        // Información adicional útil
        usedIPs: pool['used-count'] || 0,
        totalIPs: pool['total-count'] || 0
      }));
      
      logger.info(`Encontrados ${formattedPools.length} IP pools`);
      return formattedPools;
    } catch (error) {
      logger.error(`Error obteniendo IP pools de Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  
  // Agregar al objeto MikrotikService en mikrotik.service.js

  // Obtener IPs disponibles de un pool específico
  getPoolAvailableIPs: async (ipAddress, apiPort = 8728, username, password, poolName) => {
    let api = null;
    try {
    logger.info(`Obteniendo IPs disponibles del pool ${poolName} en ${ipAddress}`);
    
    // Crear la conexión
    api = new RouterOSAPI({
      host: ipAddress,
      port: apiPort,
      user: username,
      password: password,
      timeout: 10000
    });
    
    // Conectar
    await api.connect();
    
    // Obtener información del pool específico
    const pools = await api.write('/ip/pool/print', [`?name=${poolName}`]);
    
    if (pools.length === 0) {
      throw new Error(`Pool ${poolName} no encontrado`);
    }
    
    const pool = pools[0];
    
    // Obtener IPs usadas del pool
    const usedIPs = await api.write('/ppp/secret/print', [`?pool=${poolName}`]);
    const usedIPAddresses = usedIPs.map(ip => ip.address);
    
    // Parsear el rango de IPs del pool
    const availableIPs = [];
    const ranges = pool.ranges.split(',');
    
    for (const range of ranges) {
      const trimmedRange = range.trim();
      
      if (trimmedRange.includes('-')) {
      // Es un rango (ej: 192.168.1.10-192.168.1.100)
      const [startIP, endIP] = trimmedRange.split('-');
      const startParts = startIP.trim().split('.').map(Number);
      const endParts = endIP.trim().split('.').map(Number);
      
      // Generar todas las IPs en el rango
      for (let i = startParts[3]; i <= endParts[3]; i++) {
        const ip = `${startParts[0]}.${startParts[1]}.${startParts[2]}.${i}`;
        
        // Omitir .1 y .254 como solicitado
        if (i === 1 || i === 254) continue;
        
        // Verificar si la IP no está usada
        if (!usedIPAddresses.includes(ip)) {
        availableIPs.push(ip);
        }
      }
      } else if (trimmedRange.includes('/')) {
      // Es una subred CIDR (ej: 192.168.1.0/24)
      const [network, cidr] = trimmedRange.split('/');
      const networkParts = network.split('.').map(Number);
      const subnetMask = parseInt(cidr);
      
      // Calcular rango de hosts
      const hostBits = 32 - subnetMask;
      const maxHosts = Math.pow(2, hostBits) - 2; // -2 para network y broadcast
      
      // Generar IPs disponibles (excluyendo .1 y .254)
      for (let i = 2; i < maxHosts + 1; i++) {
        if (i === 254) continue; // Omitir .254
        
        const ip = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${i}`;
        
        // Verificar si la IP no está usada
        if (!usedIPAddresses.includes(ip)) {
        availableIPs.push(ip);
        }
      }
      } else {
      // Es una IP única
      if (!usedIPAddresses.includes(trimmedRange)) {
        availableIPs.push(trimmedRange);
      }
      }
    }
    
    // Ordenar las IPs de menor a mayor
    availableIPs.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      
      for (let i = 0; i < 4; i++) {
      if (aParts[i] !== bParts[i]) {
        return aParts[i] - bParts[i];
      }
      }
      return 0;
    });
    
    logger.info(`Encontradas ${availableIPs.length} IPs disponibles en el pool ${poolName}`);
    
    return {
      poolName,
      totalAvailable: availableIPs.length,
      totalUsed: usedIPAddresses.length,
      availableIPs,
      usedIPs: usedIPAddresses
    };
    } catch (error) {
    logger.error(`Error obteniendo IPs disponibles del pool ${poolName}: ${error.message}`);
    throw error;
    } finally {
    if (api && api.connected) {
      api.close();
    }
    }
  },
  
  
  // Crear un nuevo usuario PPPoE
  // ALTERNATIVA: Crear usuarios con pool específico usando perfiles dinámicos
  createPPPoEUser: async (ipAddress, apiPort = 8728, username, password, userData) => {
    if (!userData.name || !userData.password || !userData.profile) {
    throw new Error('Se requieren name, password y profile para crear un usuario PPPoE');
    }

    let api = null;
    try {
    // Crear la conexión
    api = new RouterOSAPI({
      host: ipAddress,
      port: apiPort,
      user: username,
      password: password,
      timeout: 10000
    });
    
    // Conectar
    await api.connect();
    
    let finalProfile = userData.profile;
    
    // Si el usuario especificó un pool diferente, crear un perfil personalizado
    if (userData.remoteAddress && !userData.remoteAddress.includes('.')) {
      // Es un pool específico
      const customProfileName = `${userData.profile}_${userData.remoteAddress}`;
      
      // Verificar si el perfil personalizado ya existe
      const existingProfiles = await api.write('/ppp/profile/print', [`?name=${customProfileName}`]);
      
      if (existingProfiles.length === 0) {
      // El perfil personalizado no existe, crearlo basado en el perfil base
      const baseProfile = await api.write('/ppp/profile/print', [`?name=${userData.profile}`]);
      
      if (baseProfile.length > 0) {
        const profile = baseProfile[0];
        
        // Crear el perfil personalizado
        const profileParams = [
        `=name=${customProfileName}`,
        `=address-list=${profile['address-list'] || ''}`
        ];
        
        // Copiar todas las configuraciones del perfil base
        if (profile['local-address']) profileParams.push(`=local-address=${profile['local-address']}`);
        if (profile['rate-limit']) profileParams.push(`=rate-limit=${profile['rate-limit']}`);
        if (profile['only-one']) profileParams.push(`=only-one=${profile['only-one']}`);
        if (profile['interface-list']) profileParams.push(`=interface-list=${profile['interface-list']}`);
        if (profile['address-list']) profileParams.push(`=address-list=${profile['address-list']}`);
        if (profile['dns-server']) profileParams.push(`=dns-server=${profile['dns-server']}`);
        
        // IMPORTANTE: Asignar el pool específico
        profileParams.push(`=remote-address=${userData.remoteAddress}`);
        
        logger.info(`Creando perfil personalizado: ${customProfileName} con pool: ${userData.remoteAddress}`);
        await api.write('/ppp/profile/add', profileParams);
      }
      }
      
      finalProfile = customProfileName;
    }
    
    // Crear el usuario con el perfil (puede ser el original o el personalizado)
    const params = [
      `=name=${userData.name}`,
      `=password=${userData.password}`,
      `=profile=${finalProfile}`,
      `=service=pppoe`
    ];
    
    // Si es una IP específica (no un pool), agregarla
    if (userData.remoteAddress && userData.remoteAddress.includes('.')) {
      params.push(`=remote-address=${userData.remoteAddress}`);
    }
    
    // Agregar otros parámetros opcionales
    if (userData.callerId) params.push(`=caller-id=${userData.callerId}`);
    if (userData.comment) params.push(`=comment=${userData.comment}`);
    if (userData.disabled === true) params.push(`=disabled=yes`);
    
    logger.info(`Creando usuario con perfil: ${finalProfile}`);
    logger.info(`Parámetros finales: ${JSON.stringify(params)}`);

    // Crear usuario
    await api.write('/ppp/secret/add', params);
    logger.info(`Usuario PPPoE ${userData.name} creado exitosamente en ${ipAddress}`);
    
    // Obtener el usuario recién creado
    const users = await api.write('/ppp/secret/print', [`?name=${userData.name}`]);
    
    return users[0];
    } catch (error) {
    logger.error(`Error al crear usuario PPPoE en Mikrotik ${ipAddress}: ${error.message}`);
    throw error;
    } finally {
    // Cerrar conexión si se estableció
    if (api && api.connected) {
      api.close();
    }
    }
  },


  // Actualizar un usuario PPPoE existente
  // Actualizar un usuario PPPoE existente - VERSIÓN CORREGIDA
  updatePPPoEUser: async (ipAddress, apiPort = 8728, username, password, id, userData) => {
    if (!id) {
    throw new Error('Se requiere el ID para actualizar un usuario PPPoE');
    }

    let api = null;
    try {
    // Crear la conexión
    api = new RouterOSAPI({
      host: ipAddress,
      port: apiPort,
      user: username,
      password: password,
      timeout: 10000
    });
    
    // Conectar
    await api.connect();
    
    // Construir parámetros de actualización
    const params = [`=.id=${id}`];
    
    if (userData.name) params.push(`=name=${userData.name}`);
    if (userData.password) params.push(`=password=${userData.password}`);
    if (userData.profile) params.push(`=profile=${userData.profile}`);
    
    // MANEJAR remoteAddress (que puede ser IP específica o pool)
    if (userData.remoteAddress) {
      // Si remoteAddress no contiene puntos, asumimos que es un pool
      if (!userData.remoteAddress.includes('.')) {
      // Es un pool, usarlo directamente
      params.push(`=remote-address=${userData.remoteAddress}`);
      logger.info(`Usuario con ID ${id} será actualizado con pool: ${userData.remoteAddress}`);
      } else {
      // Es una IP específica
      params.push(`=remote-address=${userData.remoteAddress}`);
      logger.info(`Usuario con ID ${id} será actualizado con IP específica: ${userData.remoteAddress}`);
      }
    }
    
    if (userData.callerId) params.push(`=caller-id=${userData.callerId}`);
    if (userData.comment) params.push(`=comment=${userData.comment}`);
    if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled ? 'yes' : 'no'}`);

    // Actualizar usuario
    await api.write('/ppp/secret/set', params);
    logger.info(`Usuario PPPoE con ID ${id} actualizado correctamente en ${ipAddress}`);
    
    // Obtener el usuario actualizado
    const users = await api.write('/ppp/secret/print', [`?.id=${id}`]);
    
    return users[0];
    } catch (error) {
    logger.error(`Error al actualizar usuario PPPoE en Mikrotik ${ipAddress}: ${error.message}`);
    throw error;
    } finally {
    // Cerrar conexión si se estableció
    if (api && api.connected) {
      api.close();
    }
    }
  },
  
  
  // Eliminar un usuario PPPoE
  deletePPPoEUser: async (ipAddress, apiPort = 8728, username, password, id) => {
    if (!id) {
      throw new Error('Se requiere el ID para eliminar un usuario PPPoE');
    }

    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Eliminar usuario
      await api.write('/ppp/secret/remove', [`=.id=${id}`]);
      
      logger.info(`Usuario PPPoE con ID ${id} eliminado correctamente en ${ipAddress}`);
      return true;
    } catch (error) {
      logger.error(`Error al eliminar usuario PPPoE en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener estadísticas de tráfico para una interfaz
  getTrafficStatistics: async (ipAddress, apiPort = 8728, username, password, interfaceName) => {
    if (!interfaceName) {
      throw new Error('Se requiere el nombre de la interfaz');
    }

    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener información de la interfaz
      const interfaces = await api.write('/interface/print', [`?name=${interfaceName}`]);
      
      if (interfaces.length === 0) {
        throw new Error(`Interfaz ${interfaceName} no encontrada`);
      }
      
      // Obtener estadísticas detalladas
      const statistics = await api.write('/interface/monitor-traffic', {
        'interface': interfaceName,
        'once': ''
      });
      
      return {
        interface: interfaces[0],
        statistics: statistics[0]
      };
    } catch (error) {
      logger.error(`Error al obtener estadísticas de tráfico en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Configurar una regla de QoS para un cliente
  configureQoS: async (ipAddress, apiPort = 8728, username, password, qosData) => {
    if (!qosData.target || !qosData.maxLimit) {
      throw new Error('Se requiere target y maxLimit para la configuración de QoS');
    }

    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Crear regla de queue simple
      const params = [
        `=name=${qosData.name}`,
        `=target=${qosData.target}`,
        `=max-limit=${qosData.maxLimit}`
      ];
      
      // Parámetros opcionales
      if (qosData.parentQueueId) params.push(`=parent=${qosData.parentQueueId}`);
      if (qosData.priority) params.push(`=priority=${qosData.priority}`);
      if (qosData.burst) params.push(`=burst-limit=${qosData.burst}`);
      if (qosData.burstTime) params.push(`=burst-time=${qosData.burstTime}`);
      if (qosData.burstThreshold) params.push(`=burst-threshold=${qosData.burstThreshold}`);
      
      // Crear regla QoS
      await api.write('/queue/simple/add', params);
      logger.info(`Regla QoS para ${qosData.name} configurada correctamente en ${ipAddress}`);
      
      // Obtener la regla creada
      const rules = await api.write('/queue/simple/print', [`?name=${qosData.name}`]);
      
      return rules[0];
    } catch (error) {
      logger.error(`Error al configurar QoS en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Eliminar una regla de QoS (función auxiliar)
  deleteQoSRule: async (ipAddress, apiPort = 8728, username, password, qosId) => {
    if (!qosId) {
      throw new Error('Se requiere el ID para eliminar una regla QoS');
    }

    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Eliminar regla QoS
      await api.write('/queue/simple/remove', [`=.id=${qosId}`]);
      
      logger.info(`Regla QoS con ID ${qosId} eliminada correctamente en ${ipAddress}`);
      return true;
    } catch (error) {
      logger.error(`Error al eliminar regla QoS en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Obtener perfiles de PPPoE disponibles
  getPPPoEProfiles: async (ipAddress, apiPort = 8728, username, password) => {
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Obtener perfiles
      const profiles = await api.write('/ppp/profile/print');
      
      // Formatear datos
      const formattedProfiles = profiles.map(profile => ({
        id: profile['.id'],
        name: profile.name,
        localAddress: profile['local-address'],
        remoteAddress: profile['remote-address'],
        rateLimit: profile['rate-limit'],
        onlyOne: profile['only-one'] === 'yes'
      }));
      
      return formattedProfiles;
    } catch (error) {
      logger.error(`Error al obtener perfiles PPPoE de Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Reiniciar una sesión PPPoE activa
  restartPPPoESession: async (ipAddress, apiPort = 8728, username, password, id) => {
    if (!id) {
      throw new Error('Se requiere el ID de la sesión PPPoE');
    }

    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 10000
      });
      
      // Conectar
      await api.connect();
      
      // Eliminar sesión activa (esto forzará una reconexión)
      await api.write('/ppp/active/remove', [`=.id=${id}`]);
      
      logger.info(`Sesión PPPoE con ID ${id} reiniciada correctamente en ${ipAddress}`);
      return true;
    } catch (error) {
      logger.error(`Error al reiniciar sesión PPPoE en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  },
  
  // Ejecutar acción en el dispositivo
  executeAction: async (ipAddress, apiPort = 8728, username, password, action) => {
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: ipAddress,
        port: apiPort,
        user: username,
        password: password,
        timeout: 15000
      });
      
      // Conectar
      await api.connect();
      
      // Ejecutar acción según el tipo
      switch (action) {
        case 'reboot':
          // Reiniciar el router
          await api.write('/system/reboot');
          return {
            success: true,
            message: 'Comando de reinicio enviado exitosamente',
            details: null
          };
          
        case 'backup':
          // Crear backup
          const backupName = `backup-${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;
          await api.write('/system/backup/save', [`=name=${backupName}`]);
          
          return {
            success: true,
            message: 'Backup creado exitosamente',
            details: {
              fileName: `${backupName}.backup`
            }
          };
          
        case 'reset-configuration':
          // Resetear configuración (peligroso)
          await api.write('/system/reset-configuration', [
            '=no-defaults=no',
            '=skip-backup=no',
            '=run-after-reset='
          ]);
          
          return {
            success: true,
            message: 'Comando de reset de configuración enviado exitosamente',
            details: null
          };
          
        case 'check-update':
          // Verificar actualizaciones
          await api.write('/system/package/update/check-for-updates');
          const updates = await api.write('/system/package/update/print');
          
          return {
            success: true,
            message: 'Verificación de actualizaciones completada',
            details: updates.length > 0 ? {
              available: true,
              channel: updates[0].channel,
              version: updates[0]['latest-version']
            } : {
              available: false
            }
          };
          
        default:
          throw new Error(`Acción no soportada: ${action}`);
      }
    } catch (error) {
      logger.error(`Error ejecutando acción ${action} en Mikrotik ${ipAddress}: ${error.message}`);
      throw error;
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        api.close();
      }
    }
  }
};

// Funciones auxiliares
function calculateMemoryPercentage(freeMemory, totalMemory) {
  freeMemory = parseInt(freeMemory);
  totalMemory = parseInt(totalMemory);
  
  if (isNaN(freeMemory) || isNaN(totalMemory) || totalMemory === 0) {
    return 0;
  }
  
  const usedMemory = totalMemory - freeMemory;
  return Math.round((usedMemory / totalMemory) * 100);
}

function formatUptime(seconds) {
  if (typeof seconds === 'string') {
    // Si ya está en formato de texto, devolverlo
    if (seconds.includes('d') || seconds.includes('h') || seconds.includes('m')) {
      return seconds;
    }
    
    // Intentar convertir a número
    seconds = parseInt(seconds);
    if (isNaN(seconds)) {
      return '0d0h0m';
    }
  }
  
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  
  return `${days}d${hours}h${minutes}m`;
}

module.exports = MikrotikService;