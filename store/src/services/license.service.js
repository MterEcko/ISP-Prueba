const { Op } = require('sequelize');
const db = require('../models');
const logger = require('../config/logger');

const License = db.License;

/**
 * Verifica y actualiza el estado de licencias expiradas
 * Se ejecuta automáticamente mediante cron job cada 6 horas
 */
async function checkExpiredLicenses() {
  try {
    const now = new Date();

    // Buscar todas las licencias activas con fecha de expiración
    const expiredLicenses = await License.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [Op.not]: null,
          [Op.lt]: now // expiresAt menor que ahora
        }
      }
    });

    if (expiredLicenses.length === 0) {
      logger.info('✅ No hay licencias expiradas para actualizar');
      return {
        success: true,
        expiredCount: 0,
        message: 'No hay licencias expiradas'
      };
    }

    // Actualizar el estado de las licencias expiradas
    const updateResult = await License.update(
      { status: 'expired' },
      {
        where: {
          status: 'active',
          expiresAt: {
            [Op.not]: null,
            [Op.lt]: now
          }
        }
      }
    );

    const expiredCount = updateResult[0]; // Número de filas actualizadas

    logger.info(`✅ Se actualizaron ${expiredCount} licencias expiradas`);

    // Log de las licencias expiradas
    expiredLicenses.forEach(license => {
      logger.info(`   - Licencia ${license.licenseKey} expiró el ${license.expiresAt.toISOString()}`);
    });

    return {
      success: true,
      expiredCount,
      licenses: expiredLicenses.map(l => ({
        id: l.id,
        licenseKey: l.licenseKey,
        expiresAt: l.expiresAt
      }))
    };

  } catch (error) {
    logger.error('Error al verificar licencias expiradas:', error);
    throw error;
  }
}

/**
 * Verifica licencias próximas a expirar (en los próximos 7 días)
 * Útil para enviar notificaciones de renovación
 */
async function checkExpiringLicenses(daysBeforeExpiration = 7) {
  try {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiration);

    const expiringLicenses = await License.findAll({
      where: {
        status: 'active',
        expiresAt: {
          [Op.not]: null,
          [Op.between]: [now, futureDate]
        }
      },
      include: [
        {
          model: db.Installation,
          as: 'installation',
          attributes: ['companyName', 'id']
        }
      ]
    });

    return {
      success: true,
      count: expiringLicenses.length,
      licenses: expiringLicenses
    };

  } catch (error) {
    logger.error('Error al verificar licencias próximas a expirar:', error);
    throw error;
  }
}

module.exports = {
  checkExpiredLicenses,
  checkExpiringLicenses
};
