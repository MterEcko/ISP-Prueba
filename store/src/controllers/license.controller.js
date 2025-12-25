const db = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');
const { License, Installation, ServicePackage, Customer } = db;

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
        await installation.update({
          companyName: companyName || installation.companyName,
          contactEmail: companyEmail || installation.contactEmail,
          contactPhone: companyPhone || installation.contactPhone,
          systemInfo: hardware,
          softwareVersion: systemVersion || installation.softwareVersion,
          currentLatitude: location?.latitude || installation.currentLatitude,
          currentLongitude: location?.longitude || installation.currentLongitude,
          currentCountry: location?.country || installation.currentCountry,
          currentCity: location?.city || installation.currentCity,
          currentLicenseId: license.id,  // Actualizar licencia vinculada
          lastHeartbeat: new Date(),
          isOnline: true,
          metadata: {
            ...installation.metadata,
            rfc: companyRfc || installation.metadata?.rfc,
            address: companyAddress || installation.metadata?.address,
            contactName: contactName || installation.metadata?.contactName,
            subdomain: subdomain || installation.metadata?.subdomain
          }
        });
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
      include: [{ model: Installation, as: 'installation' }]
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

    // Licencias 'pending' son válidas para registro inicial
    // Licencias 'active' son válidas si coincide hardware y no ha expirado
    const isValidForRegistration = (isPending && !isExpired) || (isActive && !isExpired && hardwareMatches);

    logger.info(`🔍 Verificando licencia ${licenseKey}: status=${license.status}, expired=${isExpired}, hardwareMatches=${hardwareMatches}, valid=${isValidForRegistration}`);

    // Formato compatible con backend (response.data.planType, response.data.valid, etc.)
    res.json({
      success: true,
      valid: isValidForRegistration,
      status: license.status,  // active, suspended, expired, etc.
      planType: license.planType,
      expiresAt: license.expiresAt,
      features: license.featuresEnabled || {},
      limits: {
        clients: license.clientLimit,
        users: license.userLimit,
        plugins: -1,
        includedPlugins: []
      },
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
