const db = require('./src/models');

async function testCreateProfile() {
  try {
    console.log('=== VERIFICANDO DATOS ===');
    
    const routers = await db.MikrotikRouter.findAll();
    console.log('MikrotikRouters disponibles:');
    routers.forEach(r => console.log(`ID: ${r.id}, deviceId: ${r.deviceId}, name: ${r.name}`));
    
    const packages = await db.ServicePackage.findAll({ order: [['id', 'DESC']], limit: 3 });
    console.log('\nServicePackages recientes:');
    packages.forEach(p => console.log(`ID: ${p.id}, name: ${p.name}`));
    
    console.log('\n=== CREANDO PERFIL DIRECTO ===');
    const newProfile = await db.MikrotikProfile.create({
      servicePackageId: 18,
      mikrotikRouterId: 2,
      profileName: 'TEST_CONSOLA',
      rateLimit: '10M/5M',
      burstLimit: '12M/6M',
      burstThreshold: '8M/4M',
      burstTime: '8s/8s',
      priority: '8',
      active: true
    });
    
    console.log('✅ PERFIL CREADO:', newProfile.id);
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Error details:', error.original?.message);
  } finally {
    process.exit();
  }
}

testCreateProfile();