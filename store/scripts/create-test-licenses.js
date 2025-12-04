const db = require('../src/models');
const crypto = require('crypto');
const logger = require('../src/config/logger');

async function createTestLicenses() {
  try {
    await db.sequelize.sync();

    const licenses = [
      { planType: 'basic', company: 'ISP Test Basic' },
      { planType: 'medium', company: 'ISP Test Medium' },
      { planType: 'advanced', company: 'ISP Test Advanced' },
      { planType: 'enterprise', company: 'ISP Test Enterprise' }
    ];

    for (const lic of licenses) {
      const licenseKey = `TEST-${lic.planType.toUpperCase()}-${crypto.randomBytes(4).toString('hex')}`;
      const installation = await db.Installation.create({
        installationKey: `INSTALL-${crypto.randomBytes(8).toString('hex')}`,
        companyName: lic.company,
        contactEmail: `${lic.planType}@test.com`,
        phone: '1234567890',
        hardwareId: crypto.randomBytes(16).toString('hex'),
        status: 'active'
      });

      await db.License.create({
        licenseKey,
        installationId: installation.id,
        planType: lic.planType,
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 año
      });

      logger.info(`✓ Licencia creada: ${licenseKey} (${lic.planType})`);
    }

    logger.info('\n✅ 4 Licencias de prueba creadas exitosamente');
    process.exit(0);
  } catch (error) {
    logger.error('Error creando licencias:', error);
    process.exit(1);
  }
}

createTestLicenses();
