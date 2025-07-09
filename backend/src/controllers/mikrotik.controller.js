// Controlador para operaciones relacionadas con dispositivos Mikrotik
const MikrotikService = require('../services/mikrotik.service');
const logger = require('../utils/logger');
const db = require('../models'); // Importamos los modelos desde el index
const Device = db.Device; // Obtenemos el modelo Device
const DeviceCredential = db.DeviceCredential; // Obtenemos el modelo DeviceCredential

// ✅ AGREGAR DEBUGGING PARA VERIFICAR QUE EL SERVICIO SE IMPORTÓ CORRECTAMENTE
console.log('🔍 Verificando MikrotikService import:');
console.log('MikrotikService objeto:', typeof MikrotikService);
console.log('getPPPoEProfiles método:', typeof MikrotikService.getPPPoEProfiles);
console.log('Métodos disponibles:', Object.keys(MikrotikService));

// ===================================
// MÉTODO HELPER PARA OBTENER CREDENCIALES
// ===================================
async function getDeviceCredentials(deviceId) {
  const device = await Device.findByPk(deviceId);
  if (!device) {
    throw new Error(`Dispositivo con ID ${deviceId} no encontrado`);
  }
  
  const credentials = await DeviceCredential.findOne({
    where: { 
      deviceId: deviceId, 
      isActive: true 
    }
  });
  
  if (!credentials || !credentials.username) {
    throw new Error('El dispositivo no tiene credenciales configuradas');
  }
  
  return {
    device,
    credentials
  };
}

const MikrotikController = {
  // ===================================
  // MÉTODOS DE PRUEBA DE CONEXIÓN
  // ===================================
  
  // Probar conexión con un dispositivo Mikrotik
  testConnection: async (req, res) => {
    try {
      const { ipAddress, apiPort, username, password } = req.body;
      
      if (!ipAddress || !username ) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere dirección IP y usuario'
        });
      }
      
      const result = await MikrotikService.testConnection(
        ipAddress, 
        apiPort || 8728, 
        username, 
        password
      );
      
      return res.status(200).json({
        success: result,
        message: result ? 'Conexión exitosa' : 'No se pudo conectar al dispositivo'
      });
    } catch (error) {
      logger.error(`Error en testConnection: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al probar conexión',
        error: error.message
      });
    }
  },
  
  // Obtener información del dispositivo
  getDeviceInfo: async (req, res) => {
    try {
      const { ipAddress, apiPort, username, password } = req.body;
      
      if (!ipAddress || !username ) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere dirección IP y usuario '
        });
      }
      
      const result = await MikrotikService.getDeviceInfo(
        ipAddress, 
        apiPort || 8728, 
        username, 
        password
      );
      
      return res.status(200).json({
        success: result.connected,
        data: result.info
      });
    } catch (error) {
      logger.error(`Error en getDeviceInfo: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener información del dispositivo',
        error: error.message
      });
    }
  },
  
  // ===================================
  // MÉTODOS CON CREDENCIALES DE BASE DE DATOS
  // ===================================
  
// Obtener métricas del dispositivo (versión optimizada)
getMetrics: async (req, res) => {
  try {
    const { id } = req.params;
    const { period } = req.query;
    
    // ✅ AGREGAR TIMEOUT CORTO PARA EVITAR CUELGUES
    const timeoutMs = 15000; // 15 segundos máximo
    
    console.log(`📊 Obteniendo métricas para dispositivo ${id} con timeout ${timeoutMs}ms`);
    
    const { device, credentials } = await getDeviceCredentials(id);
    
    // ✅ IMPLEMENTACIÓN DIRECTA CON TIMEOUT
    const { RouterOSAPI } = require('routeros');
    let api = null;
    
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: timeoutMs, // ✅ TIMEOUT CONFIGURADO
      });
      
      // ✅ MÉTRICAS BÁSICAS RÁPIDAS SOLAMENTE
      await api.connect();
      console.log(`✅ Conectado para métricas a ${device.ipAddress}`);
      
      // Solo obtener recursos básicos (más rápido)
      const resources = await api.write('/system/resource/print');
      
      if (!resources || resources.length === 0) {
        throw new Error('No se pudieron obtener recursos del sistema');
      }
      
      const resource = resources[0];
      
      // ✅ RESPUESTA OPTIMIZADA - SOLO DATOS ESENCIALES
      const metricsData = {
        timestamp: new Date(),
        device: {
          name: device.name,
          ipAddress: device.ipAddress
        },
        system: {
          uptime: resource.uptime || 'N/A',
          version: resource.version || 'N/A',
          cpuLoad: parseFloat(resource['cpu-load']) || 0,
          freeMemory: parseInt(resource['free-memory']) || 0,
          totalMemory: parseInt(resource['total-memory']) || 0,
          memoryUsage: resource['total-memory'] ? 
            Math.round(((parseInt(resource['total-memory']) - parseInt(resource['free-memory'])) / parseInt(resource['total-memory'])) * 100) : 0
        }
      };
      
      // Actualizar último acceso
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      console.log(`✅ Métricas obtenidas: CPU ${metricsData.system.cpuLoad}%, RAM ${metricsData.system.memoryUsage}%`);
      
      return res.status(200).json({
        success: true,
        data: metricsData
      });
      
    } finally {
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión de métricas`);
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en métricas: ${error.message}`);
    logger.error(`Error en getMetrics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas del dispositivo',
      error: error.message
    });
  }
},

  
  // Obtener usuarios PPPoE
  getPPPoEUsers: async (req, res) => {
    try {
      const { id } = req.params;
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(id);
      
      const users = await MikrotikService.getPPPoEUsers(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || ''
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    } catch (error) {
      logger.error(`Error en getPPPoEUsers: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios PPPoE',
        error: error.message
      });
    }
  },
  
  // Obtener sesiones PPPoE activas
  getActivePPPoESessions: async (req, res) => {
    try {
      const { id } = req.params;
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(id);
      
      const sessions = await MikrotikService.getActivePPPoESessions(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || ''
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: sessions.length,
        data: sessions
      });
    } catch (error) {
      logger.error(`Error en getActivePPPoESessions: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener sesiones PPPoE activas',
        error: error.message
      });
    }
  },
  
// Crear usuario PPPoE
createPPPoEUser: async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    // Validar datos requeridos
    if (!userData.name || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren name y password para crear un usuario PPPoE'
      });
    }
    
    if (!userData.profile && !userData.profileName && !userData.profileId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere profile, profileName o profileId'
      });
    }
    
    console.log(`🔄 Creando usuario PPPoE: ${userData.name} en dispositivo ${id}`);
    console.log(`📋 Datos recibidos:`, userData);
    
    // ✅ Usar helper para obtener dispositivo y credenciales
    const { device, credentials } = await getDeviceCredentials(id);
    
    // ✅ IMPLEMENTACIÓN DIRECTA CON ROUTEROS API
    const { RouterOSAPI } = require('routeros');
    let api = null;
    
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 10000,
      });
      
      await api.connect();
      console.log(`✅ Conectado para crear usuario en ${device.ipAddress}`);
      
      // ✅ DETERMINAR EL PERFIL A USAR
      let finalProfile = userData.profile || userData.profileName;
      
      // Si se proporciona profileId, obtener el nombre del perfil
      if (userData.profileId && !finalProfile) {
        const profiles = await api.write('/ppp/profile/print', [`?.id=${userData.profileId}`]);
        if (profiles.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Perfil con ID ${userData.profileId} no encontrado`
          });
        }
        finalProfile = profiles[0].name;
        console.log(`📄 Usando perfil por ID: ${finalProfile} (ID: ${userData.profileId})`);
      }
      
      console.log(`📄 Perfil final: ${finalProfile}`);
      
      // ✅ CREAR USUARIO EN MIKROTIK
      const params = [
        `=name=${userData.name}`,
        `=password=${userData.password}`,
        `=profile=${finalProfile}`,
        `=service=pppoe`,
      ];
      
      // Agregar parámetros opcionales
      if (userData.remoteAddress) params.push(`=remote-address=${userData.remoteAddress}`);
      if (userData.callerId) params.push(`=caller-id=${userData.callerId}`);
      if (userData.comment) params.push(`=comment=${userData.comment}`);
      if (userData.disabled === true) params.push(`=disabled=yes`);
      
      console.log(`📤 Parámetros de creación:`, params);
      
      // Crear usuario
      await api.write('/ppp/secret/add', params);
      console.log(`✅ Usuario ${userData.name} creado exitosamente`);
      
      // Obtener el usuario recién creado
      const users = await api.write('/ppp/secret/print', [`?name=${userData.name}`]);
      
      let createdUser = null;
      if (users.length > 0) {
        const user = users[0];
        createdUser = {
          id: user['.id'], // ID inmutable del usuario
          mikrotikUserId: user['.id'],
          name: user.name,
          profile: user.profile,
          remoteAddress: user['remote-address'],
          service: user.service,
          disabled: user.disabled === 'true'
        };
      }
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      console.log(`🎉 Usuario creado con ID: ${createdUser?.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Usuario PPPoE creado exitosamente',
        data: createdUser || { name: userData.name, profile: finalProfile }
      });
      
    } finally {
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión de creación`);
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en createPPPoEUser: ${error.message}`);
    logger.error(`Error en createPPPoEUser: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al crear usuario PPPoE',
      error: error.message
    });
  }
},
  
// Actualizar usuario PPPoE
updatePPPoEUser: async (req, res) => {
  try {
    const { deviceId, userId } = req.params;
    const userData = req.body;
    
    console.log(`🔄 Actualizando usuario PPPoE: ${userId} en dispositivo ${deviceId}`);
    console.log(`📋 Datos de actualización:`, userData);
    
    // ✅ Usar helper para obtener dispositivo y credenciales
    const { device, credentials } = await getDeviceCredentials(deviceId);
    
    // ✅ IMPLEMENTACIÓN DIRECTA CON ROUTEROS API
    const { RouterOSAPI } = require('routeros');
    let api = null;
    
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 10000,
      });
      
      await api.connect();
      console.log(`✅ Conectado para actualizar usuario en ${device.ipAddress}`);
      
      // ✅ VERIFICAR QUE EL USUARIO EXISTE
      const existingUsers = await api.write('/ppp/secret/print', [`?.id=${userId}`]);
      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Usuario con ID ${userId} no encontrado`
        });
      }
      
      const existingUser = existingUsers[0];
      console.log(`👤 Usuario encontrado: ${existingUser.name}`);
      
      // ✅ CONSTRUIR PARÁMETROS DE ACTUALIZACIÓN
      const params = [`=.id=${userId}`];
      
      if (userData.name) params.push(`=name=${userData.name}`);
      if (userData.password) params.push(`=password=${userData.password}`);
      
      // Manejar profile, profileName o profileId
      if (userData.profile) {
        params.push(`=profile=${userData.profile}`);
        console.log(`📄 Actualizando perfil a: ${userData.profile}`);
      } else if (userData.profileName) {
        params.push(`=profile=${userData.profileName}`);
        console.log(`📄 Actualizando perfil a: ${userData.profileName}`);
      } else if (userData.profileId) {
        // Buscar el nombre del perfil por su ID
        const profiles = await api.write('/ppp/profile/print', [`?.id=${userData.profileId}`]);
        if (profiles.length > 0) {
          params.push(`=profile=${profiles[0].name}`);
          console.log(`📄 Actualizando perfil por ID: ${profiles[0].name} (ID: ${userData.profileId})`);
        } else {
          return res.status(400).json({
            success: false,
            message: `Perfil con ID ${userData.profileId} no encontrado`
          });
        }
      }
      
      if (userData.remoteAddress) params.push(`=remote-address=${userData.remoteAddress}`);
      if (userData.callerId) params.push(`=caller-id=${userData.callerId}`);
      if (userData.comment) params.push(`=comment=${userData.comment}`);
      if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled ? 'yes' : 'no'}`);

      console.log(`📤 Parámetros de actualización:`, params);
      
      // ✅ ACTUALIZAR USUARIO
      await api.write('/ppp/secret/set', params);
      console.log(`✅ Usuario ${existingUser.name} actualizado exitosamente`);
      
      // ✅ OBTENER EL USUARIO ACTUALIZADO
      const updatedUsers = await api.write('/ppp/secret/print', [`?.id=${userId}`]);
      
      let updatedUser = null;
      if (updatedUsers.length > 0) {
        const user = updatedUsers[0];
        updatedUser = {
          id: user['.id'],
          mikrotikUserId: user['.id'],
          name: user.name,
          profile: user.profile,
          remoteAddress: user['remote-address'],
          service: user.service,
          callerId: user['caller-id'],
          comment: user.comment,
          disabled: user.disabled === 'true'
        };
      }
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      console.log(`🎉 Usuario actualizado: ${updatedUser?.name}`);
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE actualizado exitosamente',
        data: updatedUser
      });
      
    } finally {
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión de actualización`);
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en updatePPPoEUser: ${error.message}`);
    logger.error(`Error en updatePPPoEUser: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario PPPoE',
      error: error.message
    });
  }
},
  
  // Eliminar usuario PPPoE
  deletePPPoEUser: async (req, res) => {
    try {
      const { deviceId, userId } = req.params;
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(deviceId);
      
      await MikrotikService.deletePPPoEUser(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || '',
        userId
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Usuario PPPoE eliminado exitosamente'
      });
    } catch (error) {
      logger.error(`Error en deletePPPoEUser: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario PPPoE',
        error: error.message
      });
    }
  },
  

// Obtener perfiles PPPoE desde base de datos + Mikrotik (basado en getPPPoEProfiles)
// EN: mikrotik.controller.js
// EN: mikrotik.controller.js
// EN: mikrotik.controller.js
getProfilesFromDatabase: async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Controlador: Obteniendo perfiles completos para router ${id}`);
    
    // ✅ 1. Verificar que el router existe y obtener credenciales
    const { device, credentials } = await getDeviceCredentials(id);
    console.log(`📡 Router: ${device.name} (${device.ipAddress}:${credentials.port || 8728})`);
    
    // ✅ 2. Obtener perfiles vinculados desde BD (SIN include que falla)
    const linkedProfiles = await db.MikrotikProfile.findAll({
      where: {
        mikrotikRouterId: id,
        active: true
      }
    });
    
    console.log(`📋 ${linkedProfiles.length} perfiles en BD para router ${id}`);
    
    // ✅ 3. Obtener información de ServicePackages por separado
    const servicePackageIds = linkedProfiles
      .map(p => p.servicePackageId)
      .filter(id => id !== null);
    
    console.log(`🔍 ServicePackage IDs a buscar:`, servicePackageIds);
    
    let servicePackages = [];
    if (servicePackageIds.length > 0) {
      // Consulta directa a ServicePackages
      servicePackages = await db.sequelize.query(
        'SELECT id, name, active FROM "servicePackages" WHERE id = ANY($1)',
        {
          bind: [servicePackageIds],
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      console.log(`✅ ServicePackages encontrados:`, servicePackages);
    }
    
    // ✅ 4. Crear mapa de ServicePackages
    const servicePackagesMap = new Map();
    servicePackages.forEach(pkg => {
      servicePackagesMap.set(pkg.id, pkg);
    });
    
    // ✅ 5. Obtener TODOS los perfiles desde Mikrotik
    const { RouterOSAPI } = require('routeros');
    let api = null;
    let allMikrotikProfiles = [];
    
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 10000,
      });
      
      await api.connect();
      console.log(`✅ Conectado a Mikrotik ${device.ipAddress}`);
      
      allMikrotikProfiles = await api.write('/ppp/profile/print');
      console.log(`📡 ${allMikrotikProfiles.length} perfiles en Mikrotik`);
      
    } finally {
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión con ${device.ipAddress}`);
        api.close();
      }
    }
    
    // ✅ 6. Crear mapa de perfiles vinculados (CON datos de ServicePackage)
    const linkedProfilesMap = new Map();
    linkedProfiles.forEach(profile => {
      // Buscar el paquete en el mapa separado
      const servicePackage = profile.servicePackageId 
        ? servicePackagesMap.get(profile.servicePackageId) 
        : null;
      
      console.log(`🔍 DEBUG: Perfil ${profile.profileName} (${profile.profileId}) -> servicePackageId: ${profile.servicePackageId}, paquete encontrado: ${servicePackage ? servicePackage.name : 'NULL'}`);
      
      linkedProfilesMap.set(profile.profileId, {
        dbId: profile.id,
        servicePackageId: profile.servicePackageId,
        servicePackage: servicePackage, // ✅ AHORA TENDRÁ DATOS
        rateLimit: profile.rateLimit,
        lastSync: profile.lastSync
      });
    });
    
    console.log(`🔍 DEBUG: Mapa de perfiles vinculados:`, Array.from(linkedProfilesMap.keys()));
    
    // ✅ 7. Formatear TODOS los perfiles con validación CORREGIDA
    const formattedProfiles = allMikrotikProfiles.map((mikrotikProfile, index) => {
      const profileId = mikrotikProfile['.id'];
      const profileName = mikrotikProfile.name;
      
      console.log(`🔍 DEBUG: Procesando perfil ${index + 1}: ID=${profileId}, Name=${profileName}`);
      
      const linkedInfo = linkedProfilesMap.get(profileId);
      const existsInDB = linkedProfilesMap.has(profileId);
      
      // ✅ VALIDACIÓN SIMPLIFICADA: Solo usar servicePackageId
      let linkedPackageInfo = null;
      let statusText = 'Disponible';
      let isActuallyLinked = false;
      let servicePackageId = null;
      
      if (existsInDB && linkedInfo) {
        servicePackageId = linkedInfo.servicePackageId;
        
        // ✅ VALIDACIÓN PRINCIPAL: Solo verificar servicePackageId
        if (linkedInfo.servicePackageId) {
          isActuallyLinked = true;
          
          // ✅ MOSTRAR NOMBRE SI ESTÁ DISPONIBLE
          if (linkedInfo.servicePackage) {
            linkedPackageInfo = {
              id: linkedInfo.servicePackage.id,
              name: linkedInfo.servicePackage.name,
              active: linkedInfo.servicePackage.active
            };
            
            if (linkedInfo.servicePackage.active) {
              statusText = `Prueba Vinculado a: ${linkedInfo.servicePackage.name}`;
            } else {
              statusText = `Vinculado a: ${linkedInfo.servicePackage.name} (inactivo)`;
            }
          } else {
            // ✅ FALLBACK: Mostrar ID si no se encuentra el nombre
            statusText = `Vinculado a paquete ID: ${linkedInfo.servicePackageId} (datos no encontrados)`;
          }
        } else {
          // ✅ Existe en BD pero sin servicePackageId = disponible
          isActuallyLinked = false;
          statusText = 'Disponible (sincronizado)';
        }
        
        console.log(`🔍 DEBUG: Perfil ${profileName} - servicePackageId: ${servicePackageId}, isLinked: ${isActuallyLinked}, statusText: ${statusText}`);
      } else {
        // ✅ No existe en BD = disponible
        isActuallyLinked = false;
        statusText = 'Disponible';
        console.log(`🔍 DEBUG: Perfil ${profileName} - No existe en BD, disponible`);
      }
      
      // ✅ 8. Crear objeto formateado
      const formattedProfile = {
        // IDs
        '.id': profileId,
        profileId: profileId,
        id: profileId,
        dbId: linkedInfo?.dbId || null,
        
        // Datos del perfil desde Mikrotik
        name: profileName,
        'rate-limit': mikrotikProfile['rate-limit'] || '',
        rateLimit: mikrotikProfile['rate-limit'] || '',
        burstLimit: mikrotikProfile['burst-limit'] || '',
        burstThreshold: mikrotikProfile['burst-threshold'] || '',
        burstTime: mikrotikProfile['burst-time'] || '',
        priority: mikrotikProfile.priority || '',
        localAddress: mikrotikProfile['local-address'] || '',
        remoteAddress: mikrotikProfile['remote-address'] || '',
        dnsServer: mikrotikProfile['dns-server'] || '',
        interfaceList: mikrotikProfile['interface-list'] || '',
        addressList: mikrotikProfile['address-list'] || '',
        onlyOne: mikrotikProfile['only-one'] === 'yes',
        
        // ✅ INFORMACIÓN DE VINCULACIÓN CORREGIDA
        isAvailable: !isActuallyLinked,
        isLinked: isActuallyLinked,
        isInDatabase: existsInDB,
        servicePackageId: servicePackageId,
        linkedPackage: linkedPackageInfo,
        
        // Estado visual
        status: !isActuallyLinked ? 'available' : 'linked_active',
        statusText: statusText,
        statusIcon: !isActuallyLinked ? '✅' : '🔒',
        
        // Metadatos
        lastSync: linkedInfo?.lastSync || null,
        source: 'mikrotik',
        raw: mikrotikProfile
      };
      
      console.log(`🔍 DEBUG: Perfil formateado - ${profileName}: isAvailable=${formattedProfile.isAvailable}, servicePackageId=${servicePackageId}`);
      
      return formattedProfile;
    });
    
    // ✅ 9. Estadísticas
    const availableCount = formattedProfiles.filter(p => p.isAvailable).length;
    const linkedCount = formattedProfiles.filter(p => p.isLinked).length;
    const inDatabaseCount = formattedProfiles.filter(p => p.isInDatabase).length;
    
    console.log(`✅ ${formattedProfiles.length} perfiles procesados: ${availableCount} disponibles, ${linkedCount} vinculados, ${inDatabaseCount} en BD`);
    
    // ✅ 10. Ordenar: disponibles primero, luego vinculados
    formattedProfiles.sort((a, b) => {
      if (a.isAvailable && !b.isAvailable) return -1;
      if (!a.isAvailable && b.isAvailable) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // ✅ 11. Actualizar lastSeen del dispositivo
    await db.Device.update(
      { lastSeen: new Date() },
      { where: { id: id } }
    );
    console.log(`✅ Device actualizado exitosamente`);
    
    return res.status(200).json({
      success: true,
      count: formattedProfiles.length,
      data: formattedProfiles,
      summary: {
        total: formattedProfiles.length,
        available: availableCount,
        linked: linkedCount,
        inDatabase: inDatabaseCount,
        router: {
          id: id,
          name: device.name,
          ipAddress: device.ipAddress
        }
      }
    });
    
  } catch (error) {
    console.error(`❌ Error en getProfilesFromDatabase: ${error.message}`);
    console.error(`❌ Stack completo:`, error.stack);
    logger.error(`Error en getProfilesFromDatabase: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener perfiles desde base de datos',
      error: error.message
    });
  }
},
  
// Obtener perfiles PPPoE
getPPPoEProfiles: async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Controlador: Obteniendo perfiles PPPoE para dispositivo ${id}`);
    
    // ✅ Usar helper para obtener dispositivo y credenciales
    const { device, credentials } = await getDeviceCredentials(id);
    
    console.log(`📡 Dispositivo: ${device.name} (${device.ipAddress}:${credentials.port || 8728})`);
    
    // ✅ IMPLEMENTACIÓN DIRECTA USANDO RouterOSAPI
    const { RouterOSAPI } = require('routeros');
    
    let api = null;
    try {
      // Crear la conexión
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 10000,
      });
      
      // Conectar
      await api.connect();
      console.log(`✅ Conectado exitosamente a ${device.ipAddress}`);
      
      // Obtener perfiles
      const profiles = await api.write('/ppp/profile/print');
      console.log(`📋 ${profiles.length} perfiles obtenidos`);
      
      // Formatear datos
      const formattedProfiles = profiles.map((profile) => {
        const profileId = profile['.id'];
        
        return {
          '.id': profileId,
          profileId: profileId,
          id: profileId,
          name: profile.name,
          localAddress: profile['local-address'] || '',
          remoteAddress: profile['remote-address'] || '',
          rateLimit: profile['rate-limit'] || '',
          onlyOne: profile['only-one'] === 'yes',
          burstLimit: profile['burst-limit'] || '',
          burstThreshold: profile['burst-threshold'] || '',
          burstTime: profile['burst-time'] || '',
          priority: profile.priority || '',
          dnsServer: profile['dns-server'] || '',
          interfaceList: profile['interface-list'] || '',
          addressList: profile['address-list'] || '',
          'rate-limit': profile['rate-limit'] || '',
          raw: profile
        };
      });
      
      console.log(`✅ ${formattedProfiles.length} perfiles formateados correctamente`);
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: formattedProfiles.length,
        data: formattedProfiles
      });
      
    } finally {
      // Cerrar conexión si se estableció
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión con ${device.ipAddress}`);
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en getPPPoEProfiles: ${error.message}`);
    logger.error(`Error en getPPPoEProfiles: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener perfiles PPPoE',
      error: error.message
    });
  }
},
  
  // Obtener IP Pools disponibles
  getIPPools: async (req, res) => {
    try {
      const { id } = req.params;
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(id);
      
      const pools = await MikrotikService.getIPPools(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || ''
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: id } }
      );
      
      return res.status(200).json({
        success: true,
        count: pools.length,
        data: pools
      });
    } catch (error) {
      logger.error(`Error en getIPPools: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener IP Pools',
        error: error.message
      });
    }
  },
  


// Obtener IPs disponibles de un pool específico (VERSIÓN CORREGIDA)
getPoolAvailableIPs: async (req, res) => {
  try {
    const { id, poolName } = req.params; // poolName puede ser nombre o ID (*1, *2, etc.)
    
    console.log(`🔍 Controlador: Obteniendo IPs disponibles del pool "${poolName}" en dispositivo ${id}`);
    
    if (!poolName) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el nombre o ID del pool en la URL'
      });
    }
    
    const { device, credentials } = await getDeviceCredentials(id);
    const { RouterOSAPI } = require('routeros');
    
    let api = null;
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 15000,
      });
      
      await api.connect();
      console.log(`✅ Conectado exitosamente a ${device.ipAddress}`);
      
      // ✅ PASO 1: Buscar pool por nombre O por ID
      let pools;
      if (poolName.startsWith('*')) {
        // Es un ID de pool (ej: *1, *2, *3)
        console.log(`🔍 Buscando pool por ID: ${poolName}`);
        pools = await api.write('/ip/pool/print', [`?.id=${poolName}`]);
      } else {
        // Es un nombre de pool
        console.log(`🔍 Buscando pool por nombre: ${poolName}`);
        pools = await api.write('/ip/pool/print', [`?name=${poolName}`]);
      }
      
      if (pools.length === 0) {
        // Obtener lista de pools disponibles para ayudar al usuario
        const allPools = await api.write('/ip/pool/print');
        const availablePools = allPools.map(pool => ({
          id: pool['.id'],
          name: pool.name,
          ranges: pool.ranges
        }));
        
        return res.status(404).json({
          success: false,
          message: `Pool '${poolName}' no encontrado`,
          availablePools: availablePools
        });
      }
      
      const pool = pools[0];
      console.log(`📋 Pool encontrado: ${pool.name} (ID: ${pool['.id']}) con rangos: ${pool.ranges}`);
      
      // ✅ PASO 2: Determinar rangos de IP del pool específico
      const poolRanges = [];
      const ranges = pool.ranges.split(',');
      
      for (const range of ranges) {
        const trimmedRange = range.trim();
        
        if (trimmedRange.includes('-')) {
          // Rango: 172.16.0.2-172.16.0.254
          const [startIP, endIP] = trimmedRange.split('-');
          const startParts = startIP.trim().split('.').map(Number);
          const endParts = endIP.trim().split('.').map(Number);
          
          poolRanges.push({
            type: 'range',
            start: startParts,
            end: endParts,
            subnet: `${startParts[0]}.${startParts[1]}.${startParts[2]}`, // Ej: "172.16.0"
            startIP: startIP.trim(),
            endIP: endIP.trim()
          });
        } else if (trimmedRange.includes('/')) {
          // CIDR: 172.16.0.0/24
          const [network, cidr] = trimmedRange.split('/');
          const networkParts = network.split('.').map(Number);
          
          poolRanges.push({
            type: 'cidr',
            network: networkParts,
            cidr: parseInt(cidr),
            subnet: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}` // Ej: "172.16.0"
          });
        }
      }
      
      console.log(`📐 Rangos del pool:`, poolRanges);
      
      // ✅ FUNCIÓN HELPER: Verificar si una IP pertenece a este pool
      function ipBelongsToPool(ip) {
        const ipParts = ip.split('.').map(Number);
        
        for (const range of poolRanges) {
          if (range.type === 'range') {
            // Verificar si la IP está dentro del rango
            const withinRange = (
              ipParts[0] >= range.start[0] && ipParts[0] <= range.end[0] &&
              ipParts[1] >= range.start[1] && ipParts[1] <= range.end[1] &&
              ipParts[2] >= range.start[2] && ipParts[2] <= range.end[2] &&
              ipParts[3] >= range.start[3] && ipParts[3] <= range.end[3]
            );
            if (withinRange) return true;
          } else if (range.type === 'cidr') {
            // Verificar si la IP está en la subred CIDR
            const subnetMask = 0xFFFFFFFF << (32 - range.cidr);
            const networkInt = (range.network[0] << 24) + (range.network[1] << 16) + (range.network[2] << 8) + range.network[3];
            const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
            
            if ((ipInt & subnetMask) === (networkInt & subnetMask)) return true;
          }
        }
        return false;
      }
      
      // ✅ PASO 3: Obtener IPs ocupadas SOLO del pool específico
      const occupiedIPs = new Set();
      
      // 3.1 IPs asignadas a usuarios PPPoE
      try {
        const pppoeUsers = await api.write('/ppp/secret/print');
        pppoeUsers.forEach(user => {
          if (user['remote-address'] && user['remote-address'].includes('.')) {
            const ip = user['remote-address'];
            if (ipBelongsToPool(ip)) {
              occupiedIPs.add(ip);
              console.log(`🔒 PPPoE ocupada (pool): ${ip} (usuario: ${user.name})`);
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ No se pudieron obtener usuarios PPPoE: ${error.message}`);
      }
      
      // 3.2 IPs asignadas por DHCP
      try {
        const dhcpLeases = await api.write('/ip/dhcp-server/lease/print');
        dhcpLeases.forEach(lease => {
          if (lease.address && lease.status !== 'free') {
            const ip = lease.address;
            if (ipBelongsToPool(ip)) {
              occupiedIPs.add(ip);
              console.log(`🔒 DHCP ocupada (pool): ${ip} (MAC: ${lease['mac-address']})`);
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ No se pudieron obtener leases DHCP: ${error.message}`);
      }
      
      // 3.3 IPs configuradas en interfaces
      try {
        const interfaces = await api.write('/ip/address/print');
        interfaces.forEach(iface => {
          if (iface.address) {
            const ip = iface.address.split('/')[0];
            if (ipBelongsToPool(ip)) {
              occupiedIPs.add(ip);
              console.log(`🔒 Interfaz ocupada (pool): ${ip} (interfaz: ${iface.interface})`);
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ No se pudieron obtener direcciones de interfaces: ${error.message}`);
      }
      
      // 3.4 IPs en ARP table
      try {
        const arpEntries = await api.write('/ip/arp/print');
        arpEntries.forEach(arp => {
          if (arp.address && arp.complete === 'true') {
            const ip = arp.address;
            if (ipBelongsToPool(ip)) {
              occupiedIPs.add(ip);
              console.log(`🔒 ARP activa (pool): ${ip} (MAC: ${arp['mac-address']})`);
            }
          }
        });
      } catch (error) {
        console.warn(`⚠️ No se pudieron obtener entradas ARP: ${error.message}`);
      }
      
      // ✅ PASO 4: Generar todas las IPs del pool
      const availableIPs = [];
      const allPoolIPs = [];
      
      for (const range of poolRanges) {
        if (range.type === 'range') {
          // Generar IPs del rango
          for (let i = range.start[3]; i <= range.end[3]; i++) {
            const ip = `${range.start[0]}.${range.start[1]}.${range.start[2]}.${i}`;
            allPoolIPs.push(ip);
            
            // Excluir IPs especiales
            if (i === 0 || i === 1 || i === 254 || i === 255) {
              console.log(`🚫 IP excluida por regla: ${ip}`);
              continue;
            }
            
            // Verificar si la IP no está ocupada
            if (!occupiedIPs.has(ip)) {
              availableIPs.push(ip);
            }
          }
        } else if (range.type === 'cidr') {
          // Generar IPs de la subred CIDR
          const hostBits = 32 - range.cidr;
          const maxHosts = Math.pow(2, hostBits);
          
          for (let i = 0; i < maxHosts; i++) {
            const d = range.network[3] + i;
            if (d > 255) break;
            
            const ip = `${range.network[0]}.${range.network[1]}.${range.network[2]}.${d}`;
            allPoolIPs.push(ip);
            
            // Excluir IPs especiales
            if (i === 0 || d === 1 || d === 254 || d === 255) {
              console.log(`🚫 IP excluida por regla CIDR: ${ip}`);
              continue;
            }
            
            if (!occupiedIPs.has(ip)) {
              availableIPs.push(ip);
            }
          }
        }
      }
      
      // ✅ PASO 5: Ordenar y preparar respuesta
      availableIPs.sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
        }
        return 0;
      });
      
      const occupiedArray = Array.from(occupiedIPs).sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
        }
        return 0;
      });
      
      await Device.update({ lastSeen: new Date() }, { where: { id: id } });
      
      const result = {
        poolInfo: {
          id: pool['.id'],
          name: pool.name,
          ranges: pool.ranges
        },
        totalIPsInPool: allPoolIPs.length,
        totalOccupied: occupiedArray.length,
        totalAvailable: availableIPs.length,
        totalExcludedByRules: allPoolIPs.length - occupiedArray.length - availableIPs.length,
        availableIPs: availableIPs.slice(0, 100), // Primeras 100
        occupiedIPs: occupiedArray, // ✅ AHORA SOLO LAS DEL POOL
        summary: {
          nextAvailableIP: availableIPs[0] || 'Ninguna disponible',
          lastAvailableIP: availableIPs[availableIPs.length - 1] || 'Ninguna disponible',
          poolSubnets: poolRanges.map(r => r.subnet || r.network?.join('.') || 'N/A'),
          excludedRules: ['.0 (network)', '.1 (gateway)', '.254 (alt gateway)', '.255 (broadcast)']
        }
      };
      
      console.log(`✅ Pool ${pool.name}: ${result.totalAvailable} disponibles de ${result.totalIPsInPool} totales`);
      console.log(`📊 Ocupadas en pool: ${result.totalOccupied}, Excluidas por reglas: ${result.totalExcludedByRules}`);
      
      return res.status(200).json({
        success: true,
        data: result
      });
      
    } finally {
      if (api && api.connected) {
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en getPoolAvailableIPs: ${error.message}`);
    logger.error(`Error en getPoolAvailableIPs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener IPs disponibles del pool',
      error: error.message
    });
  }
},



  
  // Configurar QoS
  configureQoS: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const qosData = req.body;
      
      // Validar datos requeridos
      if (!qosData.name || !qosData.target || !qosData.maxLimit) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren name, target y maxLimit para configurar QoS'
        });
      }
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(deviceId);
      
      const rule = await MikrotikService.configureQoS(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || '',
        qosData
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(201).json({
        success: true,
        message: 'Regla QoS configurada exitosamente',
        data: rule
      });
    } catch (error) {
      logger.error(`Error en configureQoS: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al configurar QoS',
        error: error.message
      });
    }
  },
  
// Obtener estadísticas de tráfico (versión optimizada)
getTrafficStatistics: async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { interfaceName } = req.query;
    
    if (!interfaceName) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el parámetro interfaceName. Ejemplo: ?interfaceName=ether1'
      });
    }
    
    console.log(`📈 Obteniendo tráfico de interfaz ${interfaceName} en dispositivo ${deviceId}`);
    
    const { device, credentials } = await getDeviceCredentials(deviceId);
    
    // ✅ IMPLEMENTACIÓN DIRECTA CON TIMEOUT CORTO
    const { RouterOSAPI } = require('routeros');
    let api = null;
    
    try {
      api = new RouterOSAPI({
        host: device.ipAddress,
        port: credentials.port || 8728,
        user: credentials.username,
        password: credentials.password || '',
        timeout: 10000, // ✅ 10 segundos máximo
      });
      
      await api.connect();
      console.log(`✅ Conectado para estadísticas de tráfico`);
      
      // ✅ VERIFICAR QUE LA INTERFAZ EXISTE PRIMERO
      const interfaces = await api.write('/interface/print', [`?name=${interfaceName}`]);
      
      if (interfaces.length === 0) {
        // Listar interfaces disponibles
        const allInterfaces = await api.write('/interface/print');
        const availableInterfaces = allInterfaces.map(iface => iface.name);
        
        return res.status(404).json({
          success: false,
          message: `Interfaz '${interfaceName}' no encontrada`,
          availableInterfaces: availableInterfaces
        });
      }
      
      const interfaceData = interfaces[0];
      
      // ✅ OBTENER ESTADÍSTICAS BÁSICAS SOLAMENTE
      const stats = {
        timestamp: new Date(),
        interface: {
          name: interfaceData.name,
          type: interfaceData.type,
          running: interfaceData.running === 'true',
          disabled: interfaceData.disabled === 'true',
          comment: interfaceData.comment || ''
        },
        counters: {
          rxBytes: parseInt(interfaceData['rx-byte']) || 0,
          txBytes: parseInt(interfaceData['tx-byte']) || 0,
          rxPackets: parseInt(interfaceData['rx-packet']) || 0,
          txPackets: parseInt(interfaceData['tx-packet']) || 0,
          rxErrors: parseInt(interfaceData['rx-error']) || 0,
          txErrors: parseInt(interfaceData['tx-error']) || 0
        }
      };
      
      console.log(`✅ Estadísticas obtenidas para ${interfaceName}`);
      
      // Actualizar último acceso
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        data: stats
      });
      
    } finally {
      if (api && api.connected) {
        console.log(`🔌 Cerrando conexión de tráfico`);
        api.close();
      }
    }
    
  } catch (error) {
    console.error(`❌ Error en estadísticas de tráfico: ${error.message}`);
    logger.error(`Error en getTrafficStatistics: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de tráfico',
      error: error.message
    });
  }
},

  
  // Reiniciar sesión PPPoE
  restartPPPoESession: async (req, res) => {
    try {
      const { deviceId, sessionId } = req.params;
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(deviceId);
      
      await MikrotikService.restartPPPoESession(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || '',
        sessionId
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Sesión PPPoE reiniciada exitosamente'
      });
    } catch (error) {
      logger.error(`Error en restartPPPoESession: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al reiniciar sesión PPPoE',
        error: error.message
      });
    }
  },
  
  // Ejecutar acción en el dispositivo
  executeAction: async (req, res) => {
    try {
      const { deviceId } = req.params;
      const { action } = req.body;
      
      // Validar acción
      if (!action) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere especificar la acción a ejecutar'
        });
      }
      
      // ✅ Usar helper para obtener dispositivo y credenciales
      const { device, credentials } = await getDeviceCredentials(deviceId);
      
      const result = await MikrotikService.executeAction(
        device.ipAddress, 
        credentials.port || 8728, 
        credentials.username, 
        credentials.password || '',
        action
      );
      
      // Actualizar último acceso al dispositivo
      await Device.update(
        { lastSeen: new Date() },
        { where: { id: deviceId } }
      );
      
      return res.status(200).json({
        success: true,
        message: result.message,
        details: result.details
      });
    } catch (error) {
      logger.error(`Error en executeAction: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error al ejecutar acción en el dispositivo',
        error: error.message
      });
    }
  }
};

module.exports = MikrotikController;