const db = require('../models');
const logger = require('../config/logger');
const { License, Installation, InstallationLocation, InstallationMetrics } = db;

/**
 * Registrar licencia con información completa de hardware y empresa
 * POST /api/licenses/register
 */
exports.registerLicense = async (req, res) => {
  try {
    const {
      licenseKey,
      companyId,
      companyName,
      subdomain,
      hardware,
      location,
      systemVersion
    } = req.body;

    // Buscar licencia
    const license = await License.findOne({ where: { licenseKey } });
    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    // Verificar que esté en estado pending o active
    if (!['pending', 'active'].includes(license.status)) {
      return res.status(400).json({
        success: false,
        message: `Licencia en estado ${license.status}. No se puede registrar.`
      });
    }

    // Crear o actualizar instalación
    let installation = await Installation.findOne({
      where: { hardwareId: hardware.hardwareId }
    });

    if (installation) {
      // Actualizar instalación existente
      await installation.update({
        companyName: companyName || installation.companyName,
        systemInfo: hardware,
        softwareVersion: systemVersion,
        currentLatitude: location?.latitude,
        currentLongitude: location?.longitude,
        currentCountry: location?.country,
        currentCity: location?.city,
        lastHeartbeat: new Date(),
        isOnline: true,
        currentLicenseId: license.id,
        status: 'active',
        metadata: {
          ...installation.metadata,
          subdomain,
          companyId,
          lastRegistration: new Date()
        }
      });
    } else {
      // Crear nueva instalación
      const installationKey = require('crypto').randomBytes(16).toString('hex');
      installation = await Installation.create({
        installationKey,
        companyName: companyName || 'Sin nombre',
        contactEmail: req.body.email || 'no-email@example.com',
        contactPhone: req.body.phone || '',
        hardwareId: hardware.hardwareId,
        systemInfo: hardware,
        softwareVersion: systemVersion,
        currentLatitude: location?.latitude,
        currentLongitude: location?.longitude,
        currentCountry: location?.country,
        currentCity: location?.city,
        currentLicenseId: license.id,
        status: 'active',
        lastHeartbeat: new Date(),
        isOnline: true,
        metadata: {
          subdomain,
          companyId,
          registeredAt: new Date()
        }
      });
    }

    // Actualizar licencia
    await license.update({
      status: 'active',
      activatedAt: license.activatedAt || new Date(),
      installationId: installation.id,
      boundToHardwareId: hardware.hardwareId,
      metadata: {
        ...license.metadata,
        companyId,
        companyName,
        subdomain,
        lastRegistration: new Date()
      }
    });

    // Guardar ubicación en historial
    if (location) {
      await InstallationLocation.create({
        installationId: installation.id,
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        region: location.region,
        country: location.country,
        countryCode: location.countryCode,
        timezone: location.timezone,
        isp: location.isp,
        ipAddress: location.ip
      });
    }

    logger.info(`✅ Licencia registrada: ${licenseKey} para ${companyName}`);

    return res.status(200).json({
      success: true,
      message: 'Licencia registrada exitosamente',
      data: {
        licenseKey,
        installationKey: installation.installationKey,
        status: 'active'
      }
    });

  } catch (error) {
    logger.error('Error registrando licencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registrando licencia',
      error: error.message
    });
  }
};

/**
 * Validar licencia con verificación completa
 * POST /api/licenses/validate
 */
exports.validateLicense = async (req, res) => {
  try {
    const { licenseKey, hardwareId, systemVersion } = req.body;

    const license = await License.findOne({
      where: { licenseKey },
      include: [{ model: Installation, as: 'installation' }]
    });

    if (!license) {
      return res.status(200).json({
        success: false,
        valid: false,
        error: 'Licencia no encontrada'
      });
    }

    // Verificaciones
    const isExpired = license.isExpired();
    const isActive = license.status === 'active';
    const hardwareMatches = !license.boundToHardwareId || license.boundToHardwareId === hardwareId;
    const isSuspended = license.status === 'suspended';

    const valid = isActive && !isExpired && hardwareMatches;

    // Calcular límites según el plan
    let limits = {
      clients: license.clientLimit || -1,
      users: license.userLimit || -1,
      plugins: -1, // Ilimitado por defecto
      includedPlugins: []
    };

    // Definir plugins incluidos según plan
    const includedPluginsByPlan = {
      freemium: ['email'],
      basic: ['email', 'whatsapp', 'telegram'],
      premium: ['email', 'whatsapp', 'telegram', 'mercadopago', 'openpay', 'n8n'],
      enterprise: ['*'],
      master: ['*']
    };

    limits.includedPlugins = includedPluginsByPlan[license.planType] || [];

    return res.status(200).json({
      success: true,
      valid: valid,
      status: license.status,
      suspended: isSuspended,
      suspensionReason: license.status === 'suspended' ? license.notes : null,
      planType: license.planType,
      expiresAt: license.expiresAt,
      limits: limits,
      features: license.featuresEnabled || {}
    });

  } catch (error) {
    logger.error('Error validando licencia:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      error: error.message
    });
  }
};

/**
 * Actualizar información de hardware
 * PUT /api/licenses/:licenseKey/hardware
 */
exports.updateHardware = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { hardware, location } = req.body;

    const license = await License.findOne({
      where: { licenseKey },
      include: [{ model: Installation, as: 'installation' }]
    });

    if (!license || !license.installation) {
      return res.status(404).json({
        success: false,
        message: 'Licencia o instalación no encontrada'
      });
    }

    // Actualizar instalación
    await license.installation.update({
      systemInfo: hardware,
      currentLatitude: location?.latitude,
      currentLongitude: location?.longitude,
      currentCountry: location?.country,
      currentCity: location?.city,
      lastHeartbeat: new Date(),
      isOnline: true
    });

    // Guardar ubicación en historial si cambió
    if (location) {
      await InstallationLocation.create({
        installationId: license.installation.id,
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city,
        region: location.region,
        country: location.country,
        countryCode: location.countryCode,
        timezone: location.timezone,
        isp: location.isp,
        ipAddress: location.ip
      });
    }

    logger.info(`📡 Hardware actualizado para licencia: ${licenseKey}`);

    return res.status(200).json({
      success: true,
      message: 'Hardware actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error actualizando hardware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error actualizando hardware',
      error: error.message
    });
  }
};

/**
 * Reportar métricas de uso
 * POST /api/licenses/:licenseKey/metrics
 */
exports.reportMetrics = async (req, res) => {
  try {
    const { licenseKey } = req.params;
    const { clients, users, activePlugins, invoices, payments, hardware, timestamp } = req.body;

    const license = await License.findOne({
      where: { licenseKey },
      include: [{ model: Installation, as: 'installation' }]
    });

    if (!license || !license.installation) {
      return res.status(404).json({
        success: false,
        message: 'Licencia o instalación no encontrada'
      });
    }

    // Actualizar contadores en instalación
    await license.installation.update({
      totalClients: clients || 0,
      totalUsers: users || 0,
      lastHeartbeat: new Date(),
      isOnline: true
    });

    // Guardar métricas detalladas
    await InstallationMetrics.create({
      installationId: license.installation.id,
      metricsData: {
        clients,
        users,
        activePlugins,
        invoices,
        payments,
        hardware
      },
      recordedAt: timestamp || new Date()
    });

    logger.info(`📊 Métricas reportadas para licencia: ${licenseKey}`);

    return res.status(200).json({
      success: true,
      message: 'Métricas reportadas exitosamente',
      data: {
        clientsCount: clients,
        usersCount: users,
        pluginsCount: activePlugins
      }
    });

  } catch (error) {
    logger.error('Error reportando métricas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error reportando métricas',
      error: error.message
    });
  }
};

/**
 * Suspender licencia
 * POST /api/licenses/:licenseKey/suspend
 */
exports.suspendLicense = async (req, res) => {
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

    await license.update({
      status: 'suspended',
      notes: reason || 'Suspendida por falta de pago'
    });

    // Suspender instalación asociada
    if (license.installationId) {
      await Installation.update(
        {
          status: 'suspended',
          blockedReason: reason || 'Licencia suspendida'
        },
        { where: { id: license.installationId } }
      );
    }

    logger.info(`🚫 Licencia suspendida: ${licenseKey}`);

    return res.status(200).json({
      success: true,
      message: 'Licencia suspendida'
    });

  } catch (error) {
    logger.error('Error suspendiendo licencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error suspendiendo licencia',
      error: error.message
    });
  }
};

/**
 * Reactivar licencia
 * POST /api/licenses/:licenseKey/reactivate
 */
exports.reactivateLicense = async (req, res) => {
  try {
    const { licenseKey } = req.params;

    const license = await License.findOne({ where: { licenseKey } });

    if (!license) {
      return res.status(404).json({
        success: false,
        message: 'Licencia no encontrada'
      });
    }

    await license.update({
      status: 'active',
      notes: 'Reactivada'
    });

    // Reactivar instalación asociada
    if (license.installationId) {
      await Installation.update(
        {
          status: 'active',
          blockedReason: null,
          blockedAt: null
        },
        { where: { id: license.installationId } }
      );
    }

    logger.info(`✅ Licencia reactivada: ${licenseKey}`);

    return res.status(200).json({
      success: true,
      message: 'Licencia reactivada'
    });

  } catch (error) {
    logger.error('Error reactivando licencia:', error);
    return res.status(500).json({
      success: false,
      message: 'Error reactivando licencia',
      error: error.message
    });
  }
};

module.exports = exports;
