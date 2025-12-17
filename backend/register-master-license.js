// Script para registrar licencia maestra enterprise en la base de datos local
const db = require('./src/models');

async function registerMasterLicense() {
  try {
    console.log('🔑 Registrando licencia maestra enterprise...\n');

    // Datos de la licencia maestra
    const masterLicenseData = {
      licenseKey: '0113-F8D3-9CDD-A5F2-9BB7-6475-7DF8-0BFB',
      planType: 'enterprise',
      companyName: 'ISP Master',
      active: true,
      expiresAt: null, // Nunca expira
      activatedAt: new Date(),
      lastValidated: new Date(),
      clientLimit: -1, // Ilimitado
      userLimit: -1, // Ilimitado
      pluginLimit: -1, // Ilimitado
      includedPlugins: [], // Todos los plugins disponibles
      features: {
        unlimitedClients: true,
        unlimitedUsers: true,
        unlimitedPlugins: true,
        cloudflareSubdomain: true,
        prioritySupport: true,
        customBranding: true,
        apiAccess: true,
        advancedReports: true
      },
      metadata: {
        licenseType: 'master',
        environment: 'production',
        registered: new Date().toISOString()
      }
    };

    // Verificar si ya existe una licencia con esta clave
    const existingLicense = await db.SystemLicense.findOne({
      where: { licenseKey: masterLicenseData.licenseKey }
    });

    if (existingLicense) {
      console.log('⚠️  La licencia ya existe. Actualizando...');
      await existingLicense.update(masterLicenseData);
      console.log('✅ Licencia actualizada exitosamente');
    } else {
      console.log('📝 Creando nueva licencia...');
      await db.SystemLicense.create(masterLicenseData);
      console.log('✅ Licencia creada exitosamente');
    }

    // Mostrar información de la licencia
    const license = await db.SystemLicense.findOne({
      where: { licenseKey: masterLicenseData.licenseKey }
    });

    console.log('\n========================================');
    console.log('✅ LICENCIA ENTERPRISE REGISTRADA');
    console.log('========================================');
    console.log(`Clave: ${license.licenseKey}`);
    console.log(`Plan: ${license.planType}`);
    console.log(`Empresa: ${license.companyName}`);
    console.log(`Estado: ${license.active ? 'ACTIVA' : 'INACTIVA'}`);
    console.log(`Clientes: ${license.clientLimit === -1 ? 'Ilimitados' : license.clientLimit}`);
    console.log(`Usuarios: ${license.userLimit === -1 ? 'Ilimitados' : license.userLimit}`);
    console.log(`Plugins: ${license.pluginLimit === -1 ? 'Ilimitados' : license.pluginLimit}`);
    console.log(`Expira: ${license.expiresAt || 'Nunca'}`);
    console.log('========================================\n');

    console.log('🎉 La licencia está lista para usar!');
    console.log('💡 Esta licencia desbloquea todas las funcionalidades del sistema.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error registrando licencia:', error);
    process.exit(1);
  }
}

registerMasterLicense();
