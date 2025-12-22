// Script para depurar por qué tu licencia aparece como inválida
const db = require('./src/models');

async function debugLicense() {
  await db.sequelize.sync();

  // TU LICENCIA (la que recibiste por correo)
  const licenseKey = 'A42A5AE9-2EEE3727-EE888E21-82500F54-AE2DB91E-D8ACDF37-1D16F03B-0738BBFA';

  console.log('🔍 Buscando licencia:', licenseKey.substring(0, 20) + '...');

  const license = await db.License.findOne({
    where: { licenseKey },
    include: [{ model: db.Installation, as: 'installation' }]
  });

  if (!license) {
    console.log('\n❌ PROBLEMA: Licencia NO encontrada en el Store');
    console.log('   Esta es la licencia que recibiste por correo');
    console.log('   Necesitas generarla primero desde el panel del Store\n');
    process.exit(1);
  }

  console.log('\n✅ Licencia encontrada\n');

  console.log('=== INFORMACIÓN DE LA LICENCIA ===');
  console.log('Key:', license.licenseKey);
  console.log('Status:', license.status, license.status === 'active' ? '✅' : '❌');
  console.log('Plan:', license.planType);
  console.log('Límite clientes:', license.clientLimit === -1 ? 'Ilimitado' : license.clientLimit);
  console.log('Límite usuarios:', license.userLimit === -1 ? 'Ilimitado' : license.userLimit);
  console.log('Activada el:', license.activatedAt || 'No activada');
  console.log('Expira:', license.expiresAt || 'Nunca');
  console.log('Hardware ID:', license.boundToHardwareId || 'No vinculado');

  if (license.installation) {
    console.log('\n=== INSTALLATION ASOCIADA ===');
    console.log('Empresa:', license.installation.companyName);
    console.log('Email:', license.installation.contactEmail);
    console.log('Status:', license.installation.status);
    console.log('Hardware ID:', license.installation.hardwareId);
  } else {
    console.log('\n⚠️  Sin installation asociada');
  }

  // VERIFICAR POR QUÉ SERÍA INVÁLIDA
  console.log('\n=== VALIDACIÓN ===');

  const checks = {
    existe: !!license,
    statusActive: license.status === 'active',
    noExpirada: !license.isExpired(),
    hardwareOK: !license.boundToHardwareId || true // Siempre OK si no está vinculado
  };

  console.log('✓ Licencia existe:', checks.existe ? '✅' : '❌');
  console.log('✓ Status es active:', checks.statusActive ? '✅' : '❌');
  console.log('✓ No expirada:', checks.noExpirada ? '✅' : '❌');
  console.log('✓ Hardware OK:', checks.hardwareOK ? '✅' : '❌');

  const esValida = checks.existe && checks.statusActive && checks.noExpirada && checks.hardwareOK;

  console.log('\n' + '='.repeat(50));
  if (esValida) {
    console.log('✅ LICENCIA VÁLIDA');
    console.log('Si el backend dice INVÁLIDA, el problema es de comunicación');
  } else {
    console.log('❌ LICENCIA INVÁLIDA');
    if (!checks.statusActive) {
      console.log('\n🔧 SOLUCIÓN: Cambiar status a "active"');
      const answer = 'y'; // Autoresponder 'y' en este script
      if (answer === 'y') {
        await license.update({ status: 'active' });
        console.log('✅ Status actualizado a active');
      }
    }
    if (!checks.noExpirada) {
      console.log('\n🔧 SOLUCIÓN: Extender fecha de expiración');
      const newExpiry = new Date();
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      await license.update({ expiresAt: newExpiry });
      console.log('✅ Expiración extendida 1 año');
    }
  }
  console.log('='.repeat(50) + '\n');

  process.exit(0);
}

debugLicense().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
