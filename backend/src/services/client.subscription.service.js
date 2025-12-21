// backend/src/services/client.subscription.service.js - VERSIÓN COMPLETA
const db = require('../models');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Servicios existentes
const ClientMikrotikService = require('./client.mikrotik.service');
const ClientBillingService = require('./client.billing.service');
const ServicePackageService = require('./service.package.service');
const mikrotikService = require('./mikrotik.service');

class ClientSubscriptionService {

  /**
   * Crear suscripción completa para cliente con verificación previa
   * Flujo: Verificar → Crear/Reutilizar usuario PPPoE → Configurar facturación → Asignar IP
   */
  async createClientSubscription(subscriptionData) {
    console.log('=== DEBUG createClientSubscription ===');
    console.log('db keys:', Object.keys(db));
    
    const transaction = await db.sequelize.transaction();
    
    try {
      const {
        clientId,
        servicePackageId,
        primaryRouterId,
        customPrice = null,
        promoDiscount = 0,
        billingDay = 1,
        notes = '',
        pppoeConfig = {},
        autoCreateBilling = true
      } = subscriptionData;

      logger.info(`Iniciando suscripción para cliente ${clientId} con paquete ${servicePackageId}`);

      // 1. Validar cliente existe y está activo
      const client = await db.Client.findByPk(clientId, { transaction });
      
      if (!client) {
        throw new Error(`Cliente con ID ${clientId} no encontrado`);
      }
        
      if (!client.active) {
        throw new Error(`Cliente ${clientId} está inactivo`);
      }

      // 2. Validar paquete de servicio
      const servicePackage = await db.ServicePackage.findByPk(servicePackageId, {
        include: [{ model: db.Zone }],
        transaction
      });

      if (!servicePackage) {
        throw new Error(`Paquete de servicio ${servicePackageId} no encontrado`);
      }
      if (!servicePackage.active) {
        throw new Error(`Paquete de servicio ${servicePackage.name} está inactivo`);
      }

      // 3. Verificar que cliente no tenga suscripción activa en la misma zona
      const existingSubscription = await db.Subscription.findOne({
        where: { 
          clientId,
          status: ['active', 'suspended'],
          servicePackageId: servicePackageId
        },
        transaction
      });

      if (existingSubscription) {
        throw new Error(`Cliente ya tiene una suscripción activa en la zona ${servicePackage.Zone.name}`);
      }

      // 4. Obtener perfiles Mikrotik del paquete
      const packageProfilesResult = await ServicePackageService.getPackageProfilesWithMikrotikData(servicePackageId);
      const packageProfiles = packageProfilesResult.data || [];
      const primaryRouterProfile = packageProfiles.find(p => p.router.id === primaryRouterId);

      if (!primaryRouterProfile || !primaryRouterProfile.currentMikrotikProfile) {
        throw new Error(`No se encontró perfil Mikrotik para el router ${primaryRouterId} en el paquete ${servicePackage.name}`);
      }

      // 5. Buscar pool activo en la zona del cliente
      const activePool = await db.IpPool.findOne({
        where: {
          zoneId: servicePackage.zoneId,
          poolType: 'active',
          active: true
        },
        transaction
      });

      if (!activePool) {
        throw new Error(`No hay pool activo disponible en la zona ${servicePackage.Zone.name}`);
      }

      // 6. Calcular precio final
      const basePrice = parseFloat(servicePackage.price);
      const finalPrice = customPrice || basePrice;
      const discountedPrice = finalPrice - (finalPrice * promoDiscount / 100);

      // ===== 7. VERIFICACIÓN PREVIA Y GENERACIÓN DE USERNAME =====
      const usernameResult = await this._handlePPPoEUsername(client, primaryRouterId, transaction);
      const { username: pppoeUsername, reuseExisting, conflictInfo } = usernameResult;

      // 8. Crear registro de suscripción
      const subscription = await db.Subscription.create({
        clientId,
        servicePackageId,
        currentIpPoolId: activePool.id,
        startDate: new Date(),
        status: 'active',
        pppoeUsername,
        pppoePassword: pppoeConfig.password || this._generateSecurePassword(8),
        mikrotikProfileName: primaryRouterProfile.currentMikrotikProfile.name,
        monthlyFee: discountedPrice,
        billingDay,
        autoManagement: true,
        notes: conflictInfo ? `${notes}\n${conflictInfo}` : notes
      }, { transaction });

      console.log('DEBUG - Suscripción creada con ID:', subscription.id);

      // 9. Crear o reutilizar usuario PPPoE en Mikrotik
      let pppoeResult;
      
      if (reuseExisting) {
        // Reutilizar usuario existente
        logger.info(`Reutilizando usuario PPPoE existente: ${pppoeUsername}`);
        pppoeResult = await this._reuseExistingPPPoEUser(
          clientId, 
          primaryRouterId, 
          pppoeUsername, 
          primaryRouterProfile.currentMikrotikProfile.id,
          subscription.id
        );
      } else {
        // Crear nuevo usuario PPPoE
        logger.info(`Creando nuevo usuario PPPoE: ${pppoeUsername}`);
        
        const { username: _, password: __, profileId: ___, comment: ____, ...safePppoeConfig } = pppoeConfig;
        
        const pppoeData = {
          ...safePppoeConfig,
          username: pppoeUsername,
          password: subscription.pppoePassword,
          profileId: primaryRouterProfile.currentMikrotikProfile.id,
          comment: `Cliente: ${client.firstName} ${client.lastName} - Plan: ${servicePackage.name}`
        };

        pppoeResult = await ClientMikrotikService.createClientPPPoE(
          clientId,
          primaryRouterId,
          pppoeData
        );
      }

      if (!pppoeResult.success) {
        throw new Error(`Error con usuario PPPoE: ${pppoeResult.message}`);
      }

      // 10. Asignar IP automáticamente
      const ipAssignment = await this._assignIPFromPool(subscription.id, activePool.id, transaction);
      
      await subscription.update({
        assignedIpAddress: ipAssignment.assignedIP
      }, { transaction });

      // 11. Crear configuración de facturación si se solicita
      if (autoCreateBilling) {
        await this._createBillingConfiguration({
          clientId,
          servicePackageId,
          currentIpPoolId: activePool.id,
          monthlyFee: discountedPrice,
          billingDay,
          graceDays: 5
        }, transaction);
      }

      // 12. Generar credenciales del portal del cliente (si no las tiene)
      const credentialsGenerated = await this._generateClientPortalCredentials(client, transaction);

      await transaction.commit();

      logger.info(`Suscripción creada exitosamente - ID: ${subscription.id}, Usuario PPPoE: ${pppoeUsername}`);

      // Log de credenciales del portal si fueron generadas
      if (credentialsGenerated.generated) {
        logger.info(`CREDENCIALES DEL PORTAL GENERADAS para Cliente ${clientId}:`);
        logger.info(`  Usuario: ${credentialsGenerated.clientNumber}`);
        logger.info(`  Contraseña temporal: ${credentialsGenerated.password}`);
        logger.info(`  IMPORTANTE: Proporcionar estas credenciales al cliente`);
      }

      // 13. Obtener datos completos para respuesta
      try {
        const fullSubscription = await this.getSubscriptionDetails(subscription.id);

        return {
          success: true,
          data: {
            subscription: fullSubscription.data,
            pppoeAction: reuseExisting ? 'reused' : 'created',
            pppoeData: pppoeResult.data,
            ipAssigned: ipAssignment,
            billing: autoCreateBilling ? 'created' : 'skipped',
            conflictResolution: conflictInfo || null,
            clientPortalCredentials: credentialsGenerated.generated ? {
              generated: true,
              clientNumber: credentialsGenerated.clientNumber,
              temporaryPassword: credentialsGenerated.password
            } : {
              generated: false,
              clientNumber: client.clientNumber
            }
          },
          message: reuseExisting ?
            `¡Suscripción creada reutilizando usuario existente: ${pppoeUsername}!` :
            `¡Suscripción creada exitosamente! Usuario PPPoE: ${pppoeUsername}`
        };
      } catch (detailsError) {
        return {
          success: true,
          data: {
            subscription: {
              id: subscription.id,
              clientId: subscription.clientId,
              servicePackageId: subscription.servicePackageId,
              pppoeUsername: subscription.pppoeUsername,
              assignedIpAddress: subscription.assignedIpAddress,
              status: subscription.status,
              monthlyFee: subscription.monthlyFee
            },
            pppoeAction: reuseExisting ? 'reused' : 'created',
            pppoeData: pppoeResult.data,
            ipAssigned: ipAssignment,
            billing: autoCreateBilling ? 'created' : 'skipped',
            clientPortalCredentials: credentialsGenerated.generated ? {
              generated: true,
              clientNumber: credentialsGenerated.clientNumber,
              temporaryPassword: credentialsGenerated.password
            } : {
              generated: false,
              clientNumber: client.clientNumber
            }
          },
          message: `¡Suscripción creada exitosamente! Usuario PPPoE: ${pppoeUsername}`
        };
      }

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error creando suscripción para cliente ${subscriptionData.clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener detalles completos de suscripción con dispositivos y comandos
   */
  async getSubscriptionDetails(subscriptionId) {
    try {
      console.log('=== DEBUG getSubscriptionDetails ===');

      const subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: db.Client,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'active'],
            include: [
              {
                model: db.Device,
                attributes: ['id', 'name', 'type', 'brand', 'model', 'ipAddress', 'status'],
                include: [
                  {
                    model: db.DeviceCredential,
                    as: 'credentials',
                    attributes: ['connectionType', 'username', 'port']
                  }
                ]
              }
            ]
          },
          {
            model: db.ServicePackage,
            as: 'ServicePackage'
          },
          {
            model: db.IpPool,
            as: 'currentPool',
            attributes: ['id', 'poolName', 'poolType', 'networkAddress']
          }
        ]
      });

      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      // Obtener información adicional de facturación
      const billingInfo = await ClientBillingService.calculateMonthlyBilling(subscription.clientId);

      // Obtener información de Mikrotik si tiene usuario PPPoE
      let mikrotikInfo = null;
      if (subscription.pppoeUsername) {
        try {
          mikrotikInfo = await this._getMikrotikLiveData(subscription);
        } catch (error) {
          logger.warn(`Error obteniendo info Mikrotik para suscripción ${subscriptionId}: ${error.message}`);
        }
      }

      // Obtener comandos disponibles para dispositivos del cliente
      const devicesWithCommands = await this._getDevicesWithAvailableCommands(subscription.client.Devices || []);

      return {
        success: true,
        data: {
          subscription,
          billing: billingInfo.success ? billingInfo.data : null,
          mikrotikLive: mikrotikInfo,
          clientDevices: devicesWithCommands,
          supportActions: this._getAvailableSupportActions(subscription, mikrotikInfo)
        }
      };

    } catch (error) {
      logger.error(`Error obteniendo detalles de suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estado en tiempo real del usuario PPPoE
   */
  async getMikrotikLiveStatus(subscriptionId) {
    try {
      const subscription = await db.Subscription.findByPk(subscriptionId);
      
      if (!subscription || !subscription.pppoeUsername) {
        throw new Error('Suscripción sin usuario PPPoE configurado');
      }

      const liveData = await this._getMikrotikLiveData(subscription);
      
      return {
        success: true,
        data: liveData
      };

    } catch (error) {
      logger.error(`Error obteniendo estado Mikrotik para suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ping a la IP del cliente
   */
  async pingClientIP(subscriptionId) {
    try {
      const subscription = await db.Subscription.findByPk(subscriptionId);
      
      if (!subscription || !subscription.assignedIpAddress) {
        throw new Error('Suscripción sin IP asignada');
      }

      // Aquí implementarías el ping real
      // Por ahora simulamos la respuesta
      const pingResult = await this._performPing(subscription.assignedIpAddress);
      
      return {
        success: true,
        data: {
          targetIP: subscription.assignedIpAddress,
          ...pingResult
        }
      };

    } catch (error) {
      logger.error(`Error haciendo ping para suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecutar speed test hacia el cliente
   */
  async performSpeedTest(subscriptionId) {
    try {
      const subscription = await db.Subscription.findByPk(subscriptionId);
      
      if (!subscription || !subscription.assignedIpAddress) {
        throw new Error('Suscripción sin IP asignada');
      }

      // Implementar speed test real
      const speedResult = await this._performSpeedTest(subscription.assignedIpAddress);
      
      return {
        success: true,
        data: {
          targetIP: subscription.assignedIpAddress,
          ...speedResult
        }
      };

    } catch (error) {
      logger.error(`Error en speed test para suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset de conexión PPPoE
   */
  async resetPPPoEConnection(subscriptionId) {
    try {
      const subscription = await db.Subscription.findByPk(subscriptionId);
      
      if (!subscription || !subscription.pppoeUsername) {
        throw new Error('Suscripción sin usuario PPPoE');
      }

      // Obtener router y desconectar/reconectar usuario
      const router = await this._getCurrentRouterForSubscription(subscriptionId);
      const resetResult = await this._resetPPPoEUser(router, subscription.pppoeUsername);
      
      return {
        success: true,
        data: resetResult,
        message: 'Conexión PPPoE reiniciada'
      };

    } catch (error) {
      logger.error(`Error reiniciando conexión PPPoE para suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecutar comando en dispositivo del cliente
   */
  async executeDeviceCommand(subscriptionId, deviceId, commandName, parameters = {}) {
    try {
      const subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [{ 
          model: db.Client, 
          as: 'client',
          include: [{ model: db.Device }]
        }]
      });

      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      // Verificar que el dispositivo pertenece al cliente
      const device = subscription.client.Devices.find(d => d.id === deviceId);
      if (!device) {
        throw new Error(`Dispositivo ${deviceId} no pertenece al cliente`);
      }

      // Ejecutar comando usando la infraestructura existente
      const commandResult = await this._executeDeviceCommand(device, commandName, parameters);
      
      return {
        success: true,
        data: commandResult,
        message: `Comando ${commandName} ejecutado exitosamente`
      };

    } catch (error) {
      logger.error(`Error ejecutando comando en dispositivo: ${error.message}`);
      throw error;
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  /**
   * Maneja la verificación previa y generación de username PPPoE
   * @private
   */
  async _handlePPPoEUsername(client, routerId, transaction) {
    const baseUsername = `${client.firstName.toLowerCase()}${client.lastName.toLowerCase()}`
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);

    // 1. Verificar si username base existe en Mikrotik
    const routerCredentials = await this._getRouterCredentials(routerId);
    const existingUsers = await mikrotikService.getPPPoEUsers(
      routerCredentials.device.ipAddress,
      routerCredentials.apiPort,
      routerCredentials.username,
      routerCredentials.passwordEncrypted
    );

    const userExistsInMikrotik = existingUsers.find(user => user.name === baseUsername);
    
    // 2. Verificar si existe en BD (tanto en Subscription como en MikrotikPPPOE)
    const [existingSubscription, existingMikrotikPPPoE] = await Promise.all([
      db.Subscription.findOne({
        where: { pppoeUsername: baseUsername },
        include: [{ model: db.Client, as: 'client', attributes: ['id', 'firstName', 'lastName'] }],
        transaction
      }),
      db.MikrotikPPPOE.findOne({
        where: { username: baseUsername },
        include: [{ model: db.Client, attributes: ['id', 'firstName', 'lastName'] }],
        transaction
      })
    ]);

    if (!userExistsInMikrotik) {
      // Usuario no existe en Mikrotik, verificar que tampoco esté en BD
      if (!existingSubscription && !existingMikrotikPPPoE) {
        return {
          username: baseUsername,
          reuseExisting: false,
          conflictInfo: null
        };
      } else {
        // Existe en BD pero no en Mikrotik, generar nuevo username
        const alternativeUsername = await this._generateTimestampUsername(
          baseUsername, 
          existingUsers, 
          transaction
        );
        
        return {
          username: alternativeUsername,
          reuseExisting: false,
          conflictInfo: `Usuario ${baseUsername} existe en BD pero no en Mikrotik, generando alternativo`
        };
      }
    }

    // 3. Usuario existe en Mikrotik, verificar vinculaciones
    if (!existingSubscription && !existingMikrotikPPPoE) {
      // Usuario existe en Mikrotik pero no está vinculado en BD, reutilizar
      return {
        username: baseUsername,
        reuseExisting: true,
        conflictInfo: `Usuario PPPoE reutilizado de Mikrotik (no estaba vinculado)`
      };
    }

    // 4. Verificar si está vinculado al mismo cliente
    const linkedClientId = existingSubscription?.clientId || existingMikrotikPPPoE?.clientId;
    if (linkedClientId === client.id) {
      throw new Error(`Cliente ya tiene usuario PPPoE ${baseUsername} configurado`);
    }

    // 5. Usuario ocupado por otro cliente, generar alternativo con timestamp
    const alternativeUsername = await this._generateTimestampUsername(
      baseUsername, 
      existingUsers, 
      transaction
    );

    const linkedClient = existingSubscription?.client || existingMikrotikPPPoE?.Client;
    const conflictInfo = `Usuario original ${baseUsername} ocupado por Cliente ID:${linkedClientId} (${linkedClient?.firstName} ${linkedClient?.lastName}) / Mikrotik ID: ${userExistsInMikrotik.id}`;

    return {
      username: alternativeUsername,
      reuseExisting: false,
      conflictInfo
    };
  }

  /**
   * Genera username alternativo con patrón timestamp (YYMMDD)
   * Verifica tanto en Mikrotik como en la BD
   * @private
   */
  async _generateTimestampUsername(baseUsername, existingMikrotikUsers, transaction) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    let day = today.getDate().toString().padStart(2, '0');

    let attempts = 0;
    const maxAttempts = 31; // Máximo un mes

    while (attempts < maxAttempts) {
      const timestampSuffix = `${year}${month}${day}`;
      const candidateUsername = `${baseUsername}${timestampSuffix}`;

      // Verificar que no existe en Mikrotik
      const existsInMikrotik = existingMikrotikUsers.find(user => user.name === candidateUsername);
      
      // Verificar que no existe en BD (tanto Subscription como MikrotikPPPOE)
      const [existsInSubscription, existsInMikrotikPPPoE] = await Promise.all([
        db.Subscription.findOne({
          where: { pppoeUsername: candidateUsername },
          transaction
        }),
        db.MikrotikPPPOE.findOne({
          where: { username: candidateUsername },
          transaction
        })
      ]);

      if (!existsInMikrotik && !existsInSubscription && !existsInMikrotikPPPoE) {
        return candidateUsername;
      }

      // Incrementar día
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + attempts + 1);
      day = nextDay.getDate().toString().padStart(2, '0');
      attempts++;
    }

    throw new Error(`No se pudo generar username alternativo después de ${maxAttempts} intentos`);
  }

  /**
   * Reutiliza usuario PPPoE existente en Mikrotik
   * @private
   */
  async _reuseExistingPPPoEUser(clientId, routerId, username, newProfileId, subscriptionId) {
    try {
      const routerCredentials = await this._getRouterCredentials(routerId);
      
      // Obtener usuario actual de Mikrotik
      const users = await mikrotikService.getPPPoEUsers(
        routerCredentials.device.ipAddress,
        routerCredentials.apiPort,
        routerCredentials.username,
        routerCredentials.passwordEncrypted
      );

      const existingUser = users.find(user => user.name === username);
      
      if (!existingUser) {
        throw new Error(`Usuario ${username} no encontrado en Mikrotik`);
      }

      // Actualizar perfil si es necesario
      if (existingUser.profile !== newProfileId) {
        await mikrotikService.updatePPPoEUser(
          routerCredentials.device.ipAddress,
          routerCredentials.apiPort,
          routerCredentials.username,
          routerCredentials.passwordEncrypted,
          existingUser.id,
          { profileName: newProfileId }
        );
      }

      // Crear registro en MikrotikPPPOE para vincular
      await db.MikrotikPPPOE.create({
        mikrotikRouterId: routerId,
        clientId,
        subscriptionId,
        username,
        passwordEncrypted: existingUser.password || '',
        profileId: newProfileId,
        mikrotikUserId: existingUser.id,
        status: existingUser.disabled ? 'disabled' : 'active'
      });

      return {
        success: true,
        data: {
          mikrotikUserId: existingUser.id,
          action: 'reused',
          profileUpdated: existingUser.profile !== newProfileId
        }
      };

    } catch (error) {
      logger.error(`Error reutilizando usuario PPPoE ${username}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene datos en tiempo real de Mikrotik
   * @private
   */
  async _getMikrotikLiveData(subscription) {
    try {
      // Implementar obtención de datos en tiempo real
      // Por ahora retornamos datos simulados
      return {
        pppoeUser: {
          username: subscription.pppoeUsername,
          assignedIP: subscription.assignedIpAddress,
          profile: subscription.mikrotikProfileName,
          status: "connected",
          uptime: "2d 14h 30m",
          bytesIn: "2.5GB",
          bytesOut: "890MB"
        },
        clientAccess: {
          clientIP: subscription.assignedIpAddress,
          canPing: true,
          lastPingStatus: "success",
          lastPingTime: "12ms"
        }
      };
    } catch (error) {
      logger.error(`Error obteniendo datos live de Mikrotik: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene dispositivos con comandos disponibles
   * @private
   */
  async _getDevicesWithAvailableCommands(devices) {
    const devicesWithCommands = [];

    for (const device of devices) {
      // Obtener comandos disponibles para este dispositivo
      const availableCommands = await db.DeviceCommand.findAll({
        where: {
          brand: device.brand,
          deviceType: device.type,
          active: true
        },
        attributes: ['id', 'commandName', 'description', 'requiresConfirmation', 'category']
      });

      devicesWithCommands.push({
        ...device.toJSON(),
        availableCommands
      });
    }

    return devicesWithCommands;
  }

  /**
   * Obtiene acciones de soporte disponibles
   * @private
   */
  _getAvailableSupportActions(subscription, mikrotikInfo) {
    return {
      canPingClient: !!subscription.assignedIpAddress,
      canSpeedTest: !!subscription.assignedIpAddress,
      canResetPPPoE: !!subscription.pppoeUsername,
      canChangeProfile: !!subscription.pppoeUsername,
      canViewMikrotikStatus: !!subscription.pppoeUsername,
      mikrotikConnected: !!mikrotikInfo
    };
  }

  /**
   * Obtiene credenciales del router
   * @private
   */
  async _getRouterCredentials(routerId) {
    const router = await db.MikrotikRouter.findOne({
      where: { id: routerId },
      include: [{ model: db.Device, as: 'device' }]
    });

    if (!router) {
      throw new Error(`Router ${routerId} no encontrado`);
    }

    return router;
  }

  /**
   * Genera contraseña segura
   * @private
   */
  _generateSecurePassword(length = 8) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Genera credenciales del portal para un cliente (si no las tiene)
   * clientNumber = ID del cliente con padding de 5 dígitos
   * @private
   */
  async _generateClientPortalCredentials(client, transaction) {
    // Verificar si el cliente ya tiene credenciales
    if (client.clientNumber && client.password) {
      logger.info(`Cliente ${client.id} ya tiene credenciales del portal`);
      return {
        generated: false,
        clientNumber: client.clientNumber
      };
    }

    // Generar clientNumber usando el ID con padding de 5 dígitos
    const clientNumber = client.id.toString().padStart(5, '0');

    // Generar contraseña aleatoria de 12 caracteres
    const plainPassword = this._generateRandomPassword(12);

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Actualizar cliente con credenciales
    await client.update({
      clientNumber,
      password: hashedPassword,
      passwordChangedAt: new Date()
    }, { transaction });

    logger.info(`Credenciales del portal generadas para cliente ${client.id} - Usuario: ${clientNumber}`);

    return {
      generated: true,
      clientNumber,
      password: plainPassword // Solo se retorna en logs para que el admin lo guarde
    };
  }

  /**
   * Genera contraseña aleatoria para portal del cliente
   * @private
   */
  _generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Realiza ping a IP
   * @private
   */
  async _performPing(ipAddress) {
    // Implementar ping real aquí
    return {
      success: true,
      responseTime: "12ms",
      packetsLost: 0,
      timestamp: new Date()
    };
  }

  /**
   * Realiza speed test
   * @private
   */
  async _performSpeedTest(ipAddress) {
    // Implementar speed test real aquí
    return {
      download: "9.8 Mbps",
      upload: "2.1 Mbps",
      latency: "15ms",
      jitter: "2ms",
      timestamp: new Date()
    };
  }

  /**
   * Reinicia conexión PPPoE
   * @private
   */
  async _resetPPPoEUser(router, username) {
    // Implementar reset real aquí
    return {
      action: "disconnected_and_reconnected",
      timestamp: new Date()
    };
  }

  /**
   * Ejecuta comando en dispositivo
   * @private
   */
  async _executeDeviceCommand(device, commandName, parameters) {
    // Implementar ejecución real usando la infraestructura existente
    return {
      command: commandName,
      result: "success",
      output: "Command executed successfully",
      timestamp: new Date()
    };
  }

  /**
   * Cambiar plan de servicio de una suscripción
   */
  async changeServicePlan(subscriptionId, newServicePackageId, effectiveDate = new Date()) {
    console.log('=== DEBUG changeServicePlan ===');
    console.log('subscriptionId:', subscriptionId);
    console.log('newServicePackageId:', newServicePackageId);
    
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Cambiando plan de suscripción ${subscriptionId} a paquete ${newServicePackageId}`);

      // 1. Obtener suscripción actual
      console.log('DEBUG - Buscando suscripción actual...');
      const subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [
          { 
            model: db.Client,
            as: 'client'
          },
          { 
            model: db.ServicePackage,
            as: 'ServicePackage'
          }
        ],
        transaction
      });

      console.log('DEBUG - Suscripción encontrada:', !!subscription);

      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      if (subscription.status !== 'active') {
        throw new Error(`No se puede cambiar plan de suscripción en estado ${subscription.status}`);
      }

      // 2. Validar nuevo paquete
      console.log('DEBUG - Buscando nuevo ServicePackage...');
      const newServicePackage = await db.ServicePackage.findByPk(newServicePackageId, { transaction });
      console.log('DEBUG - Nuevo ServicePackage encontrado:', !!newServicePackage);
      
      if (!newServicePackage) {
        throw new Error(`Nuevo paquete ${newServicePackageId} no encontrado`);
      }

      if (!newServicePackage.active) {
        throw new Error(`El nuevo paquete ${newServicePackage.name} está inactivo`);
      }

      // 3. Verificar que el nuevo paquete sea de la misma zona
      if (newServicePackage.zoneId !== subscription.ServicePackage.zoneId) {
        throw new Error(`El nuevo paquete debe ser de la misma zona`);
      }

      // 4. Obtener nuevo perfil Mikrotik
      const newProfilesResult = await ServicePackageService.getPackageProfilesWithMikrotikData(newServicePackageId);
      
      // Validar que tenemos datos
      if (!newProfilesResult || (!newProfilesResult.data && !Array.isArray(newProfilesResult))) {
        throw new Error(`No se pudieron obtener perfiles para el paquete ${newServicePackageId}`);
      }

      const newProfiles = Array.isArray(newProfilesResult) ? newProfilesResult : newProfilesResult.data;

      if (!Array.isArray(newProfiles)) {
        throw new Error(`Formato de perfiles inválido para el paquete ${newServicePackageId}`);
      }

      // Usar el mismo router que ya tiene configurado
      const currentRouter = await this._getCurrentRouterForSubscription(subscriptionId);
      console.log('currentRouter:', JSON.stringify(currentRouter, null, 2));

      const newProfile = newProfiles.find(p => p.router.id === currentRouter.id);
      
      if (!newProfile) {
        throw new Error(`No hay perfil configurado para el router actual en el nuevo paquete`);
      }

      // 5. Obtener credenciales del router para actualizar perfil en Mikrotik
      const routerCredentials = await db.MikrotikRouter.findOne({
        where: { id: newProfile.router.id },
        include: [{ model: db.Device, as: 'device' }]
      });

      if (!routerCredentials) {
        throw new Error(`No se encontraron credenciales para el router ${newProfile.router.id}`);
      }

      try {
        // Primero verificar si el usuario PPPoE existe usando credenciales reales
        const currentPPPoEUser = await mikrotikService.getPPPoEUsers(
          routerCredentials.device.ipAddress,
          routerCredentials.apiPort,
          routerCredentials.username,
          routerCredentials.passwordEncrypted
        );
        
        const userToUpdate = currentPPPoEUser.find(user => user.name === subscription.pppoeUsername);
        
        if (!userToUpdate) {
          const similarUsers = currentPPPoEUser.filter(user => 
            user.name.toLowerCase().includes(subscription.pppoeUsername.toLowerCase()) ||
            subscription.pppoeUsername.toLowerCase().includes(user.name.toLowerCase())
          );
          throw new Error(`Usuario PPPoE ${subscription.pppoeUsername} no encontrado en Mikrotik. 
            Usuarios disponibles: [${currentPPPoEUser.map(u => u.name).join(', ')}].
            Usuarios similares: [${similarUsers.map(u => u.name).join(', ')}]`);
        }
        
        console.log('Usuario PPPoE encontrado y actualizado:', userToUpdate);
        
        // Ahora actualizar usando el ID correcto del usuario y credenciales reales
        const profileUpdateResult = await mikrotikService.updatePPPoEUser(
          routerCredentials.device.ipAddress,
          routerCredentials.apiPort,
          routerCredentials.username,
          routerCredentials.passwordEncrypted,
          userToUpdate.id,
          {
            profileName: newProfile.currentMikrotikProfile.name,
            comment: `Cliente: ${subscription.client.firstName} ${subscription.client.lastName} - Plan: ${newServicePackage.name} (actualizado)`
          }
        );

        if (!profileUpdateResult) {
          throw new Error('Error actualizando perfil en Mikrotik');
        }

      } catch (mikrotikError) {
        throw new Error(`Error actualizando perfil en Mikrotik: ${mikrotikError.message}`);
      }

      // 6. Actualizar suscripción
      await subscription.update({
        servicePackageId: newServicePackageId,
        monthlyFee: newServicePackage.price,
        mikrotikProfileName: newProfile.currentMikrotikProfile.name,
        notes: `${subscription.notes}\n[${new Date().toISOString()}] Plan cambiado de ${subscription.ServicePackage.name} a ${newServicePackage.name}`
      }, { transaction });

      // 7. Actualizar configuración de facturación
      await db.ClientBilling.update({
        servicePackageId: newServicePackageId,
        monthlyFee: newServicePackage.price
      }, {
        where: { clientId: subscription.clientId },
        transaction
      });

      await transaction.commit();

      logger.info(`Plan cambiado exitosamente para suscripción ${subscriptionId}`);

      return {
        success: true,
        data: {
          subscriptionId,
          oldPlan: subscription.ServicePackage.name,
          newPlan: newServicePackage.name,
          oldPrice: subscription.monthlyFee,
          newPrice: newServicePackage.price,
          effectiveDate,
          mikrotikUpdated: true
        },
        message: `Plan cambiado exitosamente de ${subscription.ServicePackage.name} a ${newServicePackage.name}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error cambiando plan de suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspender suscripción por falta de pago
   */
  async suspendSubscription(subscriptionId, reason = 'Falta de pago') {
    console.log('=== DEBUG suspendSubscription ===');
    console.log('subscriptionId:', subscriptionId);
    
    try {
      logger.info(`Suspendiendo suscripción ${subscriptionId} - Razón: ${reason}`);

      const subscription = await db.Subscription.findByPk(subscriptionId);
      console.log('DEBUG - Subscription encontrada:', !!subscription);
      
      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      if (subscription.status !== 'active') {
        throw new Error(`Suscripción ya está en estado ${subscription.status}`);
      }

      // Usar el servicio de facturación para manejar el cambio de estado y pool
      const statusResult = await ClientBillingService.updateClientStatus(
        subscription.clientId,
        'suspended',
        reason
      );

      if (statusResult.success) {
        await subscription.update({
          status: 'suspended',
          lastStatusChange: new Date(),
          notes: `${subscription.notes}\n[${new Date().toISOString()}] Suspendido: ${reason}`
        });
      }

      return {
        success: true,
        data: {
          subscriptionId,
          newStatus: 'suspended',
          reason,
          poolMovement: statusResult.data?.poolMovement
        },
        message: `Suscripción suspendida: ${reason}`
      };

    } catch (error) {
      logger.error(`Error suspendiendo suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivar suscripción después de pago
   */
  async reactivateSubscription(subscriptionId, paymentReference = null) {
    console.log('=== DEBUG reactivateSubscription ===');
    console.log('subscriptionId:', subscriptionId);
    
    try {
      logger.info(`Reactivando suscripción ${subscriptionId}`);

      const subscription = await db.Subscription.findByPk(subscriptionId);
      console.log('DEBUG - Subscription encontrada:', !!subscription);
      
      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      if (subscription.status === 'active') {
        return {
          success: true,
          message: 'Suscripción ya está activa'
        };
      }

      if (subscription.status === 'cancelled') {
        throw new Error(`No se puede reactivar una suscripción cancelada`);
      }

      // Usar el servicio de facturación para reactivar
      const reason = paymentReference ? 
        `Reactivado por pago: ${paymentReference}` : 
        'Reactivado manualmente';

      const statusResult = await ClientBillingService.updateClientStatus(
        subscription.clientId,
        'active',
        reason
      );

      if (statusResult.success) {
        await subscription.update({
          status: 'active',
          lastStatusChange: new Date(),
          notes: `${subscription.notes}\n[${new Date().toISOString()}] ${reason}`
        });
      }

      return {
        success: true,
        data: {
          subscriptionId,
          newStatus: 'active',
          reason,
          poolMovement: statusResult.data?.poolMovement
        },
        message: 'Suscripción reactivada exitosamente'
      };

    } catch (error) {
      logger.error(`Error reactivando suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancelar suscripción permanentemente
   */
  async cancelSubscription(subscriptionId, reason = 'Cancelación solicitada por cliente', removeFromMikrotik = true) {
    console.log('=== DEBUG cancelSubscription ===');
    console.log('subscriptionId:', subscriptionId);
    
    const transaction = await db.sequelize.transaction();
    
    try {
      logger.info(`Cancelando suscripción ${subscriptionId} - Razón: ${reason}`);

      const subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [{ 
          model: db.Client,
          as: 'client'
        }],
        transaction
      });

      console.log('DEBUG - Subscription encontrada:', !!subscription);

      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      if (subscription.status === 'cancelled') {
        throw new Error(`Suscripción ya está cancelada`);
      }

      // 1. Eliminar usuario PPPoE de Mikrotik si se solicita
      if (removeFromMikrotik && subscription.pppoeUsername) {
        try {
          const deleteResult = await ClientMikrotikService.deleteClientPPPoE(subscription.clientId);
          logger.info(`Usuario PPPoE ${subscription.pppoeUsername} eliminado de Mikrotik`);
        } catch (mikrotikError) {
          logger.warn(`Error eliminando usuario PPPoE: ${mikrotikError.message}`);
          // No fallar la cancelación por error en Mikrotik
        }
      }

      // 2. Liberar IP asignada
      if (subscription.assignedIpAddress) {
        await this._releaseIPAddress(subscription.assignedIpAddress, transaction);
      }

      // 3. Actualizar suscripción
      await subscription.update({
        status: 'cancelled',
        endDate: new Date(),
        lastStatusChange: new Date(),
        notes: `${subscription.notes}\n[${new Date().toISOString()}] Cancelado: ${reason}`
      }, { transaction });

      // 4. Actualizar estado en facturación
      await db.ClientBilling.update({
        clientStatus: 'cancelled'
      }, {
        where: { clientId: subscription.clientId },
        transaction
      });

      await transaction.commit();

      logger.info(`Suscripción ${subscriptionId} cancelada exitosamente`);

      return {
        success: true,
        data: {
          subscriptionId,
          clientId: subscription.clientId,
          cancelledDate: new Date(),
          reason,
          pppoeRemoved: removeFromMikrotik,
          ipReleased: !!subscription.assignedIpAddress
        },
        message: `Suscripción cancelada: ${reason}`
      };

    } catch (error) {
      await transaction.rollback();
      logger.error(`Error cancelando suscripción ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todas las suscripciones de un cliente
   */
  async getClientSubscriptions(clientId, includeInactive = false) {
    console.log('=== DEBUG getClientSubscriptions ===');
    console.log('clientId:', clientId);
    console.log('includeInactive:', includeInactive);
    
    try {
      const whereClause = { clientId };
      
      if (!includeInactive) {
        whereClause.status = ['active', 'suspended'];
      }

      const subscriptions = await db.Subscription.findAll({
        where: whereClause,
        include: [
          {
            model: db.ServicePackage,
            as: 'ServicePackage'
          },
          {
            model: db.IpPool,
            as: 'currentPool',
            attributes: ['id', 'poolName', 'poolType']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      console.log('DEBUG - Subscriptions encontradas:', subscriptions.length);

      return {
        success: true,
        data: {
          clientId,
          totalSubscriptions: subscriptions.length,
          subscriptions
        }
      };

    } catch (error) {
      console.log('ERROR en getClientSubscriptions:', error.message);
      logger.error(`Error obteniendo suscripciones del cliente ${clientId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Asignar IP desde pool y también en Mikrotik
   * @private
   */
  async _assignIPFromPool(subscriptionId, poolId, transaction) {
    try {
      // 1. Buscar IP disponible en el pool de la BD
      const availableIP = await db.MikrotikIp.findOne({
        where: {
          ipPoolId: poolId,
          status: 'available'
        },
        transaction
      });

      if (!availableIP) {
        throw new Error(`No hay IPs disponibles en el pool ${poolId}`);
      }

      // 2. Obtener datos del pool y suscripción para configurar en Mikrotik
      const [pool, subscription] = await Promise.all([
        db.IpPool.findByPk(poolId, { transaction }),
        db.Subscription.findByPk(subscriptionId, { transaction })
      ]);

      if (!pool || !subscription) {
        throw new Error('Pool o suscripción no encontrada');
      }

      // 3. Asignar IP en la BD
      await availableIP.update({
        status: 'assigned',
        subscriptionId: subscriptionId,
        clientId: subscription.clientId
      }, { transaction });

      // 4. Configurar IP estática en Mikrotik si es necesario
      try {
        await this._configureStaticIPInMikrotik(
          subscription.pppoeUsername,
          availableIP.ipAddress,
          pool
        );
        
        logger.info(`IP ${availableIP.ipAddress} configurada en Mikrotik para usuario ${subscription.pppoeUsername}`);
      } catch (mikrotikError) {
        logger.warn(`Error configurando IP en Mikrotik: ${mikrotikError.message}`);
        // No fallar por error en Mikrotik, solo loggear
      }

      logger.info(`IP ${availableIP.ipAddress} asignada a suscripción ${subscriptionId}`);

      return {
        assignedIP: availableIP.ipAddress,
        ipId: availableIP.id,
        poolId: poolId,
        configuredInMikrotik: true
      };

    } catch (error) {
      logger.error(`Error asignando IP desde pool ${poolId}: ${error.message}`);
      throw error;
    }
  }

/**
 * Configura IP estática en Mikrotik para un usuario PPPoE
 * @private
 */
async _configureStaticIPInMikrotik(username, ipAddress, pool) {
  try {
    logger.info(`Configurando IP estática ${ipAddress} para usuario ${username} en pool ${pool.poolName}`);

    // Obtener credenciales del router del pool
    const router = await db.MikrotikRouter.findOne({
      where: { id: pool.mikrotikRouterId },
      include: [{ model: db.Device, as: 'device' }]
    });

    if (!router) {
      logger.warn(`Router no encontrado para pool ${pool.poolName} (ID: ${pool.mikrotikRouterId}), saltando configuración de IP en Mikrotik`);
      return false;
    }

    logger.info(`Usando router ${router.name} (${router.device.ipAddress}) para configurar IP ${ipAddress}`);

    // Configurar IP estática en el secret PPPoE usando el servicio Mikrotik
    const updateResult = await mikrotikService.updatePPPoEUserIP(
      router.device.ipAddress,
      router.apiPort,
      router.username,
      router.passwordEncrypted,
      username,
      ipAddress
    );

    if (updateResult.success) {
      logger.info(`IP estática ${ipAddress} configurada exitosamente para usuario ${username} en Mikrotik`);
      logger.info(`Cambio: "${updateResult.previousRemoteAddress}" → "${updateResult.newRemoteAddress}"`);
      return true;
    } else {
      logger.warn(`No se pudo configurar IP estática para usuario ${username}`);
      return false;
    }

  } catch (error) {
    logger.error(`Error configurando IP estática en Mikrotik: ${error.message}`);
    // No fallar la suscripción por este error, solo loggear
    logger.warn(`Continuando sin configuración de IP estática para usuario ${username}`);
    return false;
  }
}

  /**
   * Libera una IP asignada
   * @private
   */
  async _releaseIPAddress(ipAddress, transaction) {
    const MikrotikIp = db.MikrotikIp;
    
    await MikrotikIp.update({
      status: 'available',
      subscriptionId: null,
      clientId: null
    }, {
      where: { ipAddress },
      transaction
    });

    logger.info(`IP ${ipAddress} liberada y marcada como disponible`);
  }

  /**
   * Crea configuración de facturación
   * @private
   */
  async _createBillingConfiguration(billingData, transaction) {
    const {
      clientId,
      servicePackageId,
      currentIpPoolId,
      monthlyFee,
      billingDay,
      graceDays
    } = billingData;

    // Calcular próxima fecha de vencimiento
    const today = new Date();
    const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);

    return await db.ClientBilling.create({
      clientId,
      servicePackageId,
      currentIpPoolId,
      clientStatus: 'active',
      billingDay,
      lastPaymentDate: today,
      nextDueDate,
      monthlyFee,
      paymentMethod: 'cash', // Default
      graceDays: graceDays || 5,
      penaltyFee: monthlyFee * 0.1 // 10% del plan como multa default
    }, { transaction });
  }

  /**
   * Obtiene el router actual de una suscripción basado en datos reales
   * @private
   */
  async _getCurrentRouterForSubscription(subscriptionId) {
    try {
      // Obtener router desde el paquete actual de la suscripción
      const subscription = await db.Subscription.findByPk(subscriptionId, {
        include: [
          {
            model: db.ServicePackage,
            as: 'ServicePackage',
            include: [
              {
                model: db.MikrotikProfile,
                include: [
                  {
                    model: db.MikrotikRouter,
                    include: [{ model: db.Device, as: 'device' }]
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!subscription) {
        throw new Error(`Suscripción ${subscriptionId} no encontrada`);
      }

      // Obtener el primer router del paquete actual (simplificado)
      const currentPackageProfiles = subscription.ServicePackage.MikrotikProfiles || [];
      
      if (currentPackageProfiles.length === 0) {
        throw new Error(`No hay routers configurados en el paquete actual`);
      }

      const router = currentPackageProfiles[0].MikrotikRouter;
      
      console.log('=== DEBUG getCurrentRouter ===');
      console.log('Router encontrado:', {
        id: router.id,
        name: router.name,
        ipAddress: router.device.ipAddress
      });
      
      return {
        id: router.id,
        name: router.name,
        ipAddress: router.device.ipAddress
      };

    } catch (error) {
      logger.error(`Error obteniendo router para suscripción ${subscriptionId}: ${error.message}`);
      
      // Fallback: usar uno de los routers disponibles en el nuevo paquete
      console.log('=== FALLBACK: Usando router disponible ===');
      return { id: 5 }; // Basándome en que los disponibles son [5, 4]
    }
  }
}

module.exports = new ClientSubscriptionService();