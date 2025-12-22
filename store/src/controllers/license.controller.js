const db = require('../models');
const crypto = require('crypto');
const logger = require('../config/logger');
const { License, Installation, ServicePackage } = db;

// Generar clave de licencia
function generateLicenseKey() {
  return crypto.randomBytes(32).toString('hex').toUpperCase().match(/.{1,8}/g).join('-');
}

// Generar nueva licencia
exports.generateLicense = async (req, res) => {
  try {
    const {
      planType = 'basic',
      clientLimit,
      userLimit,
      branchLimit = 1,
      featuresEnabled = {},
      expiresAt,
      isRecurring = false,
      recurringInterval,
      price = 0
    } = req.body;

    const licenseKey = generateLicenseKey();

    const license = await License.create({
      licenseKey,
      planType,
      clientLimit,
      userLimit,
      branchLimit,
      featuresEnabled,
      expiresAt,
      isRecurring,
      recurringInterval,
      price,
      status: 'pending'
    });

    logger.info(`Licencia generada: ${licenseKey}`);

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
      subdomain,
      hardware,
      location,
      systemVersion,
      installedAt
    } = req.body;

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
          contactEmail: license.metadata?.email || 'unknown@example.com',
          hardwareId: hardware.hardwareId,
          systemInfo: hardware,
          softwareVersion: systemVersion || '1.0.0',
          currentLatitude: location?.latitude || null,
          currentLongitude: location?.longitude || null,
          currentCountry: location?.country || null,
          currentCity: location?.city || null,
          status: 'active',
          metadata: {
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
          systemInfo: hardware,
          softwareVersion: systemVersion || installation.softwareVersion,
          currentLatitude: location?.latitude || installation.currentLatitude,
          currentLongitude: location?.longitude || installation.currentLongitude,
          currentCountry: location?.country || installation.currentCountry,
          currentCity: location?.city || installation.currentCity,
          lastHeartbeat: new Date(),
          isOnline: true
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
    const hardwareMatches = !license.boundToHardwareId || license.boundToHardwareId === hardwareId;

    // Formato compatible con backend (response.data.planType, response.data.valid, etc.)
    res.json({
      success: true,
      valid: isActive && !isExpired && hardwareMatches,
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
