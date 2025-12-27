const db = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { License, Installation, ServicePackage, Customer } = db;
const emailAlertService = require('../services/emailAlert.service');

// Generar clave de licencia
function generateLicenseKey() {
  return crypto.randomBytes(32).toString('hex').toUpperCase().match(/.{1,8}/g).join('-');
}

// Generar nueva licencia
exports.generateLicense = async (req, res) => {
  try {
    const {
      planType = 'basic',
      servicePackageId,
      clientLimit,
      userLimit,
      branchLimit = 1,
      featuresEnabled = {},
      expiresAt,
      expiresInDays,
      isRecurring = false,
      recurringInterval,
      price = 0
    } = req.body;

    const licenseKey = generateLicenseKey();

    // Calcular fecha de expiración si se proporcionó expiresInDays
    let calculatedExpiresAt = expiresAt;
    if (expiresInDays && expiresInDays > 0) {
      const now = new Date();
      calculatedExpiresAt = new Date(now.getTime() + (expiresInDays * 24 * 60 * 60 * 1000));
    }

    const license = await License.create({
      licenseKey,
      planType,
      servicePackageId, // Vincular con el paquete
      clientLimit,
      userLimit,
      branchLimit,
      featuresEnabled,
      expiresAt: calculatedExpiresAt,
      isRecurring,
      recurringInterval,
      price,
      status: 'pending'
    });

    logger.info(`📝 Licencia generada: ${licenseKey} - Paquete: ${planType} - Package ID: ${servicePackageId}`);

    res.status(201).json({
      success: true,
      data: license
    });
  } catch (error) {
    logger.error('Error generando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Activar licencia
exports.activateLicense = async (req, res) => {
  try {
    const { licenseKey, hardwareId, installationKey } = req.body;

    const license = await License.findOne({ where: { licenseKey } });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    if (license.status !== 'pending' && license.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Licencia en estado: ${license.status}`
      });
    }

    // Buscar instalación
    const installation = await Installation.findOne({ where: { installationKey } });
    if (!installation) {
      return res.status(404).json({
        success: false,
        message: 'Instalación no encontrada'
      });
    }

    // Activar
    license.status = 'active';
    license.activatedAt = new Date();
    license.installationId = installation.id;
    license.boundToHardwareId = hardwareId;
    await license.save();

    // Actualizar instalación
    installation.currentLicenseId = license.id;
    installation.status = 'active';
    await installation.save();

    logger.info(`Licencia activada: ${licenseKey} para instalación ${installationKey}`);

    res.json({
      success: true,
      data: license
    });
  } catch (error) {
    logger.error('Error activando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Registrar licencia con información de instalación (llamado desde backend)
exports.registerLicense = async (req, res) => {
  try {
    const {
      licenseKey,
      companyId,
      companyName,
      companyRfc,
      companyEmail,
      companyPhone,
      companyAddress,
      contactName,
      subdomain,
      hardware,
      location,
      systemVersion,
      installedAt
    } = req.body;

    // 📋 Log detallado de datos recibidos
    logger.info(`📋 REGISTRO DE LICENCIA - Datos recibidos:`);
    logger.info(`  🔑 License Key: ${licenseKey}`);
    logger.info(`  🏢 Empresa: ${companyName}`);
    logger.info(`  📄 RFC: ${companyRfc || 'NO RECIBIDO'}`);
    logger.info(`  📧 Email: ${companyEmail || 'NO RECIBIDO'}`);
    logger.info(`  📱 Teléfono: ${companyPhone || 'NO RECIBIDO'}`);
    logger.info(`  📍 Dirección: ${companyAddress || 'NO RECIBIDO'}`);
    logger.info(`  👤 Contacto: ${contactName || 'NO RECIBIDO'}`);
    logger.info(`  🌐 Subdominio: ${subdomain || 'NO RECIBIDO'}`);
    logger.info(`  💻 Hardware ID: ${hardware?.hardwareId || 'NO RECIBIDO'}`);
    logger.info(`  📍 Ubicación: ${location?.city}, ${location?.country} (${location?.latitude}, ${location?.longitude})`);
    logger.info(`  📦 Versión: ${systemVersion || 'NO RECIBIDO'}`);

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'licenseKey es requerido'
      });
    }

    // Buscar la licencia
    const license = await License.findOne({ where: { licenseKey } });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    // ============================================
    // VERIFICAR SI LA LICENCIA YA ESTÁ EN USO
    // ============================================
    if (hardware && hardware.hardwareId) {
      // Buscar si la licencia ya está vinculada a otro hardware
      const existingInstallation = await Installation.findOne({
        where: {
          currentLicenseId: license.id,
          hardwareId: { [Op.ne]: hardware.hardwareId } // Hardware diferente
        }
      });

      if (existingInstallation) {
        logger.error(`🚨 LICENCIA EN USO: Intento de activar licencia ${licenseKey} en hardware ${hardware.hardwareId}`);
        logger.error(`   - Ya está activa en hardware: ${existingInstallation.hardwareId}`);
        logger.error(`   - Empresa actual: ${existingInstallation.companyName}`);

        // Registrar el intento en metadata de la licencia
        const attemptDetails = {
          attemptedHardwareId: hardware.hardwareId,
          attemptedBy: companyName || 'Unknown',
          attemptedAt: new Date().toISOString(),
          blockedReason: 'License already in use on different hardware'
        };

        await license.update({
          metadata: {
            ...license.metadata,
            duplicateActivationAttempts: [
              ...(license.metadata?.duplicateActivationAttempts || []),
              attemptDetails
            ]
          }
        });

        // Enviar alerta por email al administrador
        emailAlertService.alertDuplicateActivation({
          license,
          existingInstallation,
          attemptDetails
        }).catch(err => {
          logger.error('Error sending duplicate activation alert:', err.message);
        });

        return res.status(409).json({
          success: false,
          error: 'LICENSE_IN_USE',
          message: 'Esta licencia ya está en uso en otra instalación',
          details: {
            message: 'La licencia está actualmente activa en otro sistema. Si deseas transferirla a este equipo, primero debes desactivarla en la instalación anterior.',
            currentlyUsedBy: existingInstallation.companyName,
            contactSupport: 'Si necesitas ayuda para transferir tu licencia, contacta con soporte.'
          }
        });
      }

      // Verificar si el hardware ya tiene otra licencia activa
      const hardwareWithOtherLicense = await Installation.findOne({
        where: {
          hardwareId: hardware.hardwareId,
          currentLicenseId: { [Op.ne]: license.id },
          status: 'active'
        }
      });

      if (hardwareWithOtherLicense) {
        logger.warn(`⚠️ Hardware ${hardware.hardwareId} ya tiene otra licencia activa`);
        logger.warn(`   - Licencia anterior: ${hardwareWithOtherLicense.licenseKey || 'Unknown'}`);
        logger.warn(`   - Se va a reemplazar con nueva licencia: ${licenseKey}`);

        // Desactivar la licencia anterior en este hardware
        await hardwareWithOtherLicense.update({
          currentLicenseId: license.id,
          status: 'active'
        });
      }
    }

    // Buscar o crear instalación
    let installation;
    if (hardware && hardware.hardwareId) {
      [installation] = await Installation.findOrCreate({
        where: { hardwareId: hardware.hardwareId },
        defaults: {
          installationKey: `INST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`.toUpperCase(),
          companyName: companyName || 'Unknown',
          contactEmail: companyEmail || license.metadata?.email || 'unknown@example.com',
          contactPhone: companyPhone || null,
          hardwareId: hardware.hardwareId,
          systemInfo: hardware,
          softwareVersion: systemVersion || '1.0.0',
          currentLatitude: location?.latitude || null,
          currentLongitude: location?.longitude || null,
          currentCountry: location?.country || null,
          currentCity: location?.city || null,
          currentLicenseId: license.id,  // Vincular licencia desde la creación
          status: 'active',
          lastHeartbeat: new Date(),
          isOnline: true,
          metadata: {
            rfc: companyRfc,
            address: companyAddress,
            contactName: contactName,
            subdomain,
            installedAt,
            registeredVia: 'backend-api'
          }
        }
      });

      // Actualizar información si ya existía
      if (installation) {
        // Construir objeto de actualización solo con campos que tienen valor
        const updateData = {
          systemInfo: hardware,
          currentLicenseId: license.id,
          lastHeartbeat: new Date(),
          isOnline: true
        };

        // Solo actualizar datos de empresa si vienen
        if (companyName) updateData.companyName = companyName;
        if (companyEmail) updateData.contactEmail = companyEmail;
        if (companyPhone) updateData.contactPhone = companyPhone;
        if (systemVersion) updateData.softwareVersion = systemVersion;

        // Solo actualizar ubicación si viene
        if (location?.latitude) updateData.currentLatitude = location.latitude;
        if (location?.longitude) updateData.currentLongitude = location.longitude;
        if (location?.country) updateData.currentCountry = location.country;
        if (location?.city) updateData.currentCity = location.city;

        // Metadata: preservar existente y solo agregar nuevos valores
        const preservedMetadata = installation.metadata || {};
        const newMetadata = {};
        if (companyRfc) newMetadata.rfc = companyRfc;
        if (companyAddress) newMetadata.address = companyAddress;
        if (contactName) newMetadata.contactName = contactName;
        if (subdomain) newMetadata.subdomain = subdomain;

        updateData.metadata = {
          ...preservedMetadata,
          ...newMetadata
        };

        await installation.update(updateData);
        logger.info(`🔄 Instalación actualizada (datos de empresa preservados): ${installation.companyName}`);
      }
    }

    // Activar licencia y vincular a instalación
    await license.update({
      status: 'active',
      activatedAt: license.activatedAt || new Date(),
      installationId: installation?.id || null,
      boundToHardwareId: hardware?.hardwareId || null,
      metadata: {
        ...license.metadata,
        companyName,
        subdomain,
        registeredAt: new Date().toISOString(),
        location,
        systemVersion
      }
    });

    // Actualizar instalación con la licencia actual
    if (installation) {
      await installation.update({
        currentLicenseId: license.id
      });

      // 📊 Log de instalación guardada
      logger.info(`📊 INSTALACIÓN GUARDADA:`);
      logger.info(`  🆔 ID: ${installation.id}`);
      logger.info(`  🔑 Installation Key: ${installation.installationKey}`);
      logger.info(`  🏢 Empresa: ${installation.companyName}`);
      logger.info(`  📧 Email: ${installation.contactEmail}`);
      logger.info(`  📱 Teléfono: ${installation.contactPhone}`);
      logger.info(`  💻 Hardware ID: ${installation.hardwareId}`);
      logger.info(`  🎫 Current License ID: ${installation.currentLicenseId}`);
      logger.info(`  📍 GPS: ${installation.currentCity}, ${installation.currentCountry}`);
      logger.info(`  📦 Metadata: ${JSON.stringify(installation.metadata)}`);

      // 👤 Crear o actualizar Cliente en Customers
      if (companyEmail) {
        try {
          const [customer, customerCreated] = await Customer.findOrCreate({
            where: { email: companyEmail },
            defaults: {
              name: contactName || companyName || 'Cliente',
              email: companyEmail,
              phone: companyPhone,
              companyName: companyName,
              servicePackageId: license.servicePackageId,
              licenseKey: license.licenseKey,
              licenseId: license.id,
              status: 'active',
              registeredAt: new Date(),
              metadata: {
                rfc: companyRfc,
                address: companyAddress,
                subdomain,
                installedAt,
                installationId: installation.id,
                registeredVia: 'backend-api'
              }
            }
          });

          if (!customerCreated) {
            // Si ya existía, actualizar datos
            await customer.update({
              name: contactName || companyName || customer.name,
              phone: companyPhone || customer.phone,
              companyName: companyName || customer.companyName,
              servicePackageId: license.servicePackageId || customer.servicePackageId,
              licenseKey: license.licenseKey,
              licenseId: license.id,
              status: 'active',
              metadata: {
                ...customer.metadata,
                rfc: companyRfc || customer.metadata?.rfc,
                address: companyAddress || customer.metadata?.address,
                subdomain: subdomain || customer.metadata?.subdomain,
                installationId: installation.id
              }
            });
            logger.info(`👤 Cliente actualizado: ${customer.name} (${customer.email})`);
          } else {
            logger.info(`👤 Cliente creado: ${customer.name} (${customer.email})`);
          }
        } catch (customerError) {
          // Si hay error al crear el customer (ej: email duplicado), solo loguear pero no fallar el registro
          logger.warn(`⚠️  Error al crear/actualizar cliente: ${customerError.message}`);
        }
      }
    }

    logger.info(`✅ Licencia registrada: ${licenseKey} - Hardware: ${hardware?.hardwareId}`);

    res.json({
      success: true,
      message: 'Licencia registrada exitosamente',
      data: {
        licenseId: license.id,
        licenseKey: license.licenseKey,
        installationId: installation?.id,
        installationKey: installation?.installationKey,
        status: license.status,
        activatedAt: license.activatedAt
      }
    });

  } catch (error) {
    logger.error('Error registrando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Verificar licencia
exports.verifyLicense = async (req, res) => {
  try {
    const { licenseKey, hardwareId } = req.body;

    const license = await License.findOne({
      where: { licenseKey },
      include: [
        { model: Installation, as: 'installation' },
        { model: ServicePackage, as: 'servicePackage' }
      ]
    });

    if (!license) {
      return res.json({
        success: false,
        valid: false,
        message: 'Licencia no encontrada'
      });
    }

    const isExpired = license.isExpired();
    const isActive = license.status === 'active';
    const isPending = license.status === 'pending';
    const hardwareMatches = !license.boundToHardwareId || license.boundToHardwareId === hardwareId;

    // ============================================
    // VERIFICAR SI LA LICENCIA YA ESTÁ EN USO (solo si se proporciona hardwareId)
    // ============================================
    let licenseInUse = false;
    if (hardwareId) {
      const activeInstallation = await Installation.findOne({
        where: {
          currentLicenseId: license.id,
          hardwareId: { [Op.ne]: hardwareId }, // Hardware diferente
          status: 'active',
          isOnline: true
        }
      });

      if (activeInstallation) {
        licenseInUse = true;
        logger.warn(`⚠️ Licencia ${licenseKey} ya está en uso en otro hardware:`);
        logger.warn(`   - Hardware actual: ${activeInstallation.hardwareId}`);
        logger.warn(`   - Hardware solicitante: ${hardwareId}`);
      }
    }

    // Licencias 'pending' son válidas para registro inicial
    // Licencias 'active' son válidas si coincide hardware y no ha expirado
    // NUEVO: No permitir si la licencia ya está en uso en otro hardware
    const isValidForRegistration = !licenseInUse && ((isPending && !isExpired) || (isActive && !isExpired && hardwareMatches));

    logger.info(`🔍 Verificando licencia ${licenseKey}: status=${license.status}, expired=${isExpired}, hardwareMatches=${hardwareMatches}, inUse=${licenseInUse}, valid=${isValidForRegistration}`);

    // Buscar datos del cliente asociado a esta licencia
    let clientData = null;
    const customer = await Customer.findOne({
      where: { licenseId: license.id }
    });

    if (customer) {
      // Cliente encontrado en tabla Customers
      clientData = {
        companyName: customer.companyName || customer.name,
        contactName: customer.name,
        email: customer.email,
        phone: customer.phone,
        rfc: customer.metadata?.rfc || null,
        address: customer.metadata?.address || null,
        subdomain: customer.metadata?.subdomain || null
      };
      logger.info(`📋 Cliente encontrado: ${customer.companyName} (${customer.email})`);
    } else if (license.installation) {
      // Si no hay customer pero hay installation, usar esos datos
      clientData = {
        companyName: license.installation.companyName,
        contactName: license.installation.metadata?.contactName || null,
        email: license.installation.contactEmail,
        phone: license.installation.contactPhone,
        rfc: license.installation.metadata?.rfc || null,
        address: license.installation.metadata?.address || null,
        subdomain: license.installation.metadata?.subdomain || null
      };
      logger.info(`📋 Datos de instalación: ${license.installation.companyName}`);
    }

    // Obtener límites del ServicePackage asociado (dinámico)
    let limits = {
      clients: license.clientLimit,
      users: license.userLimit || null,
      services: null,
      plugins: -1,
      includedPlugins: []
    };

    // Si hay ServicePackage asociado, obtener límites de ahí
    if (license.servicePackage) {
      limits = {
        clients: license.servicePackage.clientLimit || license.clientLimit,
        users: license.servicePackage.userLimit || null,
        services: license.servicePackage.serviceLimit || null,
        branches: license.servicePackage.branchLimit || 1,
        plugins: -1,
        includedPlugins: []
      };
      logger.info(`📦 Límites desde ServicePackage: clients=${limits.clients}, users=${limits.users}, services=${limits.services}`);
    } else {
      logger.warn(`⚠️ Licencia sin ServicePackage asociado, usando límites de la licencia`);
    }

    // Formato compatible con backend (response.data.planType, response.data.valid, etc.)
    res.json({
      success: true,
      valid: isValidForRegistration,
      status: license.status,  // active, suspended, expired, etc.
      planType: license.planType,
      expiresAt: license.expiresAt,
      features: license.featuresEnabled || {},
      limits: limits,
      // NUEVO: Datos del cliente asociado
      clientData: clientData,
      // También incluir en formato anterior para compatibilidad
      license: {
        planType: license.planType,
        clientLimit: license.clientLimit,
        featuresEnabled: license.featuresEnabled,
        expiresAt: license.expiresAt,
        daysRemaining: license.daysRemaining()
      },
      verification: {
        isActive,
        isPending,
        isExpired,
        hardwareMatches
      }
    });
  } catch (error) {
    logger.error('Error verificando licencia:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener licencia
exports.getLicense = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const license = await License.findOne({
      where: { licenseKey },
      include: [{ model: Installation, as: 'installation' }]
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    res.json({
      success: true,
      data: license
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Revocar licencia
exports.revokeLicense = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { reason } = req.body;

    const license = await License.findOne({ where: { licenseKey } });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    license.status = 'revoked';
    license.notes = reason || 'Revocada';
    await license.save();

    // Bloquear instalación asociada
    if (license.installationId) {
      await Installation.update(
        { status: 'blocked', blockedReason: 'Licencia revocada' },
        { where: { id: license.installationId } }
      );
    }

    logger.info(`Licencia revocada: ${licenseKey}`);

    res.json({
      success: true,
      message: 'Licencia revocada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Obtener todas las licencias
exports.getAllLicenses = async (req, res) => {
  try {
    const licenses = await License.findAll({
      include: [
        { model: Installation, as: 'installation' },
        { model: ServicePackage, as: 'servicePackage' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: licenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Recibir heartbeat desde el backend
 */
exports.receiveHeartbeat = async (req, res) => {
  try {
    const {
      licenseKey,
      hardwareId,
      databaseId,
      hardware,
      location,
      metrics,
      limitsValidation,
      dateManipulation,
      systemVersion,
      timestamp,
      forced
    } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        message: 'License key is required'
      });
    }

    logger.info(`💓 Heartbeat recibido de licencia: ${licenseKey} (${forced ? 'FORZADO' : 'AUTOMÁTICO'}) DB: ${databaseId}`);

    // Buscar licencia
    const license = await License.findOne({
      where: { licenseKey },
      include: [
        { model: Installation, as: 'installation' },
        { model: ServicePackage, as: 'servicePackage' }
      ]
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // ============================================
    // DETECCIÓN DE CLONACIÓN DE BASE DE DATOS
    // ============================================
    if (databaseId) {
      // Buscar si este Database ID ya está registrado con otra licencia
      const otherInstallation = await Installation.findOne({
        where: {
          databaseId: databaseId,
          licenseKey: { [Op.ne]: licenseKey } // Diferente licencia
        }
      });

      if (otherInstallation) {
        logger.error(`🚨 CLONACIÓN DETECTADA: Database ID ${databaseId} usado en múltiples licencias`);
        logger.error(`   - Licencia actual: ${licenseKey}`);
        logger.error(`   - Otra licencia: ${otherInstallation.licenseKey}`);

        // Suspender la licencia automáticamente
        await license.update({
          status: 'suspended',
          metadata: {
            ...license.metadata,
            suspensionReason: 'Database cloning detected - same Database ID used in multiple licenses',
            suspendedAt: new Date().toISOString(),
            clonedDatabaseId: databaseId,
            otherLicenseKey: otherInstallation.licenseKey
          }
        });

        // Obtener todas las instalaciones con el mismo Database ID para el email
        const allInstallationsWithSameDB = await Installation.findAll({
          where: { databaseId: databaseId }
        });

        // Enviar alerta por email al administrador
        emailAlertService.alertMultipleInstallations({
          license,
          installations: allInstallationsWithSameDB,
          databaseId
        }).catch(err => {
          logger.error('Error sending multiple installations alert:', err.message);
        });

        return res.json({
          success: true,
          suspended: true,
          suspensionReason: 'Database cloning detected. This license has been suspended.',
          message: 'CRITICAL: Database cloning detected. Please contact support.'
        });
      }

      // Buscar si el Database ID cambió para esta instalación (posible manipulación)
      const existingInstallation = license.installation;
      if (existingInstallation && existingInstallation.databaseId && existingInstallation.databaseId !== databaseId) {
        logger.warn(`⚠️ Database ID cambió para licencia ${licenseKey}`);
        logger.warn(`   - Antiguo: ${existingInstallation.databaseId}`);
        logger.warn(`   - Nuevo: ${databaseId}`);
        // Esto podría ser normal (reinstalación) o sospechoso (clonación)
        // Por ahora solo lo registramos, no suspendemos automáticamente
      }
    }

    // ============================================
    // DETECCIÓN DE MANIPULACIÓN DE FECHA
    // ============================================
    if (dateManipulation && dateManipulation.manipulated) {
      logger.error(`⚠️ MANIPULACIÓN DE FECHA DETECTADA: Licencia ${licenseKey}`);
      logger.error(`   - Última fecha conocida: ${new Date(dateManipulation.lastKnownDate).toLocaleString()}`);
      logger.error(`   - Fecha actual del sistema: ${new Date(dateManipulation.currentDate).toLocaleString()}`);
      logger.error(`   - Diferencia: ${dateManipulation.daysDifference} días hacia atrás`);

      // Suspender la licencia automáticamente
      await license.update({
        status: 'suspended',
        metadata: {
          ...license.metadata,
          suspensionReason: 'Date manipulation detected - system date was set backwards',
          suspendedAt: new Date().toISOString(),
          dateManipulation: dateManipulation
        }
      });

      // Enviar alerta por email al administrador
      // Necesitamos obtener la instalación primero
      const installation = license.installation || await Installation.findOne({
        where: { licenseKey: licenseKey }
      });

      if (installation) {
        emailAlertService.alertDateManipulation({
          license,
          installation,
          details: dateManipulation
        }).catch(err => {
          logger.error('Error sending date manipulation alert:', err.message);
        });
      }

      return res.json({
        success: true,
        suspended: true,
        suspensionReason: 'Date manipulation detected. This license has been suspended.',
        message: 'CRITICAL: Date manipulation detected. Please contact support.'
      });
    }

    // Buscar o crear instalación
    let installation = license.installation;

    if (!installation) {
      installation = await Installation.create({
        licenseId: license.id,
        licenseKey: licenseKey,
        hardwareId: hardwareId,
        databaseId: databaseId,
        systemInfo: hardware,
        currentLicenseId: license.id,
        isOnline: true,
        lastHeartbeat: new Date()
      });
      logger.info(`📦 Nueva instalación creada para licencia: ${licenseKey}`);
    } else {
      // Actualizar instalación existente
      await installation.update({
        hardwareId: hardwareId,
        databaseId: databaseId,
        systemInfo: hardware,
        isOnline: true,
        lastHeartbeat: new Date(),
        location: location || installation.location
      });
    }

    // Actualizar licencia con la info más reciente
    await license.update({
      lastHeartbeat: new Date(),
      metadata: {
        ...license.metadata,
        lastHardware: hardware,
        lastLocation: location,
        lastMetrics: metrics,
        lastLimitsValidation: limitsValidation,
        systemVersion: systemVersion
      }
    });

    // Verificar si la licencia está suspendida
    if (license.status === 'suspended') {
      logger.warn(`⚠️ Licencia suspendida detectada en heartbeat: ${licenseKey}`);
      return res.json({
        success: true,
        suspended: true,
        suspensionReason: license.metadata?.suspensionReason || 'License suspended by administrator',
        message: 'License is suspended'
      });
    }

    // Verificar límites si vienen en el payload
    let limitsExceeded = false;
    if (limitsValidation && limitsValidation.limitsExceeded && limitsValidation.limitsExceeded.length > 0) {
      logger.warn(`⚠️ Límites excedidos en licencia ${licenseKey}:`, limitsValidation.limitsExceeded);
      limitsExceeded = true;

      // Enviar alerta por email (opcional, implementar después)
      // TODO: Implementar envío de email de alerta
    }

    logger.info(`✅ Heartbeat procesado exitosamente: ${licenseKey}`);

    res.json({
      success: true,
      message: 'Heartbeat received successfully',
      suspended: false,
      limitsExceeded: limitsExceeded,
      limitsValidation: limitsValidation,
      license: {
        status: license.status,
        planType: license.planType,
        expiresAt: license.expiresAt
      }
    });

  } catch (error) {
    logger.error('Error procesando heartbeat:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Suspender licencia manualmente desde el dashboard
 */
exports.suspendLicense = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    // Buscar licencia
    const license = await License.findOne({
      where: { licenseKey },
      include: [
        { model: Installation, as: 'installation' }
      ]
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // Verificar si ya está suspendida
    if (license.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'License is already suspended'
      });
    }

    // Suspender la licencia
    await license.update({
      status: 'suspended',
      metadata: {
        ...license.metadata,
        suspensionReason: reason,
        suspensionNotes: notes || '',
        suspendedAt: new Date().toISOString(),
        suspendedBy: 'admin', // TODO: Agregar autenticación y guardar usuario real
        manualSuspension: true
      }
    });

    logger.info(`🚫 Licencia ${licenseKey} suspendida manualmente. Razón: ${reason}`);

    // Enviar alerta por email
    emailAlertService.alertLicenseSuspended({
      license,
      installation: license.installation,
      reason: `${reason}${notes ? ` - ${notes}` : ''}`
    }).catch(err => {
      logger.error('Error sending suspension alert:', err.message);
    });

    res.json({
      success: true,
      message: 'License suspended successfully',
      license: {
        licenseKey: license.licenseKey,
        status: license.status,
        suspendedAt: license.metadata.suspendedAt,
        reason: reason
      }
    });

  } catch (error) {
    logger.error('Error suspending license:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reactivar licencia manualmente desde el dashboard
 */
exports.reactivateLicense = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { notes } = req.body;

    // Buscar licencia
    const license = await License.findOne({
      where: { licenseKey },
      include: [
        { model: Installation, as: 'installation' }
      ]
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // Verificar si está suspendida
    if (license.status !== 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'License is not suspended'
      });
    }

    // Determinar nuevo estado (active o pending según si tiene instalación)
    const newStatus = license.installation ? 'active' : 'pending';

    // Reactivar la licencia
    await license.update({
      status: newStatus,
      metadata: {
        ...license.metadata,
        reactivatedAt: new Date().toISOString(),
        reactivatedBy: 'admin', // TODO: Agregar autenticación y guardar usuario real
        reactivationNotes: notes || '',
        previousSuspensionReason: license.metadata?.suspensionReason
      }
    });

    logger.info(`✅ Licencia ${licenseKey} reactivada manualmente`);

    res.json({
      success: true,
      message: 'License reactivated successfully',
      license: {
        licenseKey: license.licenseKey,
        status: license.status,
        reactivatedAt: license.metadata.reactivatedAt
      }
    });

  } catch (error) {
    logger.error('Error reactivating license:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtener historial de suspensiones de una licencia
 */
exports.getSuspensionHistory = async (req, res) => {
  try {
    const { licenseKey } = req.params;

    // Buscar licencia
    const license = await License.findOne({
      where: { licenseKey }
    });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'License not found'
      });
    }

    // Extraer historial de suspensiones del metadata
    const history = [];

    if (license.metadata?.suspendedAt) {
      history.push({
        type: 'suspension',
        timestamp: license.metadata.suspendedAt,
        reason: license.metadata.suspensionReason,
        notes: license.metadata.suspensionNotes,
        by: license.metadata.suspendedBy || 'system',
        manual: license.metadata.manualSuspension || false
      });
    }

    if (license.metadata?.reactivatedAt) {
      history.push({
        type: 'reactivation',
        timestamp: license.metadata.reactivatedAt,
        notes: license.metadata.reactivationNotes,
        by: license.metadata.reactivatedBy || 'system'
      });
    }

    // Ordenar por fecha descendente
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      licenseKey: license.licenseKey,
      currentStatus: license.status,
      history: history
    });

  } catch (error) {
    logger.error('Error getting suspension history:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
