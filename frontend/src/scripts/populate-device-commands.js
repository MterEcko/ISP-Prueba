// backend/src/scripts/populate-device-commands.js
// Script para poblar las tablas con comandos básicos por marca

const db = require('../models');

async function populateDeviceCommands() {
  try {
    console.log('🚀 Iniciando población de comandos de dispositivos...');
    
    // 1. CREAR MARCAS
    const brands = await db.DeviceBrand.bulkCreate([
      { name: 'mikrotik', description: 'Mikrotik RouterOS devices', active: true },
      { name: 'ubiquiti', description: 'Ubiquiti Networks devices', active: true },
      { name: 'tplink', description: 'TP-Link devices', active: true },
      { name: 'cambium', description: 'Cambium Networks devices', active: true },
      { name: 'mimosa', description: 'Mimosa Networks devices', active: true },
      { name: 'huawei', description: 'Huawei devices', active: true },
      { name: 'zte', description: 'ZTE devices', active: true }
    ], { ignoreDuplicates: true });
    
    console.log('✅ Marcas creadas');
    
    // 2. OBTENER IDs DE MARCAS
    const mikrotikBrand = await db.DeviceBrand.findOne({ where: { name: 'mikrotik' } });
    const ubiquitiBrand = await db.DeviceBrand.findOne({ where: { name: 'ubiquiti' } });
    const tplinkBrand = await db.DeviceBrand.findOne({ where: { name: 'tplink' } });
    const cambiumBrand = await db.DeviceBrand.findOne({ where: { name: 'cambium' } });
    const mimosaBrand = await db.DeviceBrand.findOne({ where: { name: 'mimosa' } });
    
    // 3. CREAR FAMILIAS DE DISPOSITIVOS
    const families = await db.DeviceFamily.bulkCreate([
      // Ubiquiti
      { brandId: ubiquitiBrand.id, name: 'UniFi', description: 'UniFi product line' },
      { brandId: ubiquitiBrand.id, name: 'AirOS', description: 'AirOS product line' },
      { brandId: ubiquitiBrand.id, name: 'UISP', description: 'UISP managed devices' },
      
      // TP-Link
      { brandId: tplinkBrand.id, name: 'Pharos', description: 'TP-Link Pharos outdoor devices' },
      { brandId: tplinkBrand.id, name: 'Omada', description: 'TP-Link Omada business line' },
      { brandId: tplinkBrand.id, name: 'EAP', description: 'TP-Link EAP access points' },
      
      // Cambium
      { brandId: cambiumBrand.id, name: 'ePMP', description: 'Cambium ePMP product line' },
      { brandId: cambiumBrand.id, name: 'cnPilot', description: 'Cambium cnPilot product line' },
      
      // Mimosa
      { brandId: mimosaBrand.id, name: 'A-Series', description: 'Mimosa A-Series backhaul' },
      { brandId: mimosaBrand.id, name: 'B-Series', description: 'Mimosa B-Series access' },
      { brandId: mimosaBrand.id, name: 'C-Series', description: 'Mimosa C-Series connectorized' }
    ], { ignoreDuplicates: true });
    
    console.log('✅ Familias de dispositivos creadas');
    
    // 4. CREAR COMANDOS COMUNES
    const commands = await db.CommonCommand.bulkCreate([
      {
        name: 'restart',
        description: 'Reiniciar dispositivo',
        category: 'system',
        requiresConfirmation: true,
        affectsService: true,
        permissionLevel: 3
      },
      {
        name: 'get_device_info',
        description: 'Obtener información del dispositivo',
        category: 'information',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 1
      },
      {
        name: 'get_system_info',
        description: 'Obtener información del sistema',
        category: 'information',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 1
      },
      {
        name: 'backup_config',
        description: 'Crear copia de seguridad de configuración',
        category: 'maintenance',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 2
      },
      {
        name: 'get_interfaces',
        description: 'Obtener lista de interfaces',
        category: 'network',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 1
      },
      {
        name: 'get_signal_strength',
        description: 'Obtener potencia de señal',
        category: 'wireless',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 1
      },
      {
        name: 'get_clients_connected',
        description: 'Obtener clientes conectados',
        category: 'network',
        requiresConfirmation: false,
        affectsService: false,
        permissionLevel: 1
      },
      {
        name: 'reset_to_defaults',
        description: 'Resetear a configuración de fábrica',
        category: 'maintenance',
        requiresConfirmation: true,
        affectsService: true,
        permissionLevel: 5
      }
    ], { ignoreDuplicates: true });
    
    console.log('✅ Comandos comunes creados');
    
    // 5. OBTENER IDs DE COMANDOS
    const restartCmd = await db.CommonCommand.findOne({ where: { name: 'restart' } });
    const deviceInfoCmd = await db.CommonCommand.findOne({ where: { name: 'get_device_info' } });
    const systemInfoCmd = await db.CommonCommand.findOne({ where: { name: 'get_system_info' } });
    const backupCmd = await db.CommonCommand.findOne({ where: { name: 'backup_config' } });
    const interfacesCmd = await db.CommonCommand.findOne({ where: { name: 'get_interfaces' } });
    const signalCmd = await db.CommonCommand.findOne({ where: { name: 'get_signal_strength' } });
    const clientsCmd = await db.CommonCommand.findOne({ where: { name: 'get_clients_connected' } });
    
    // 6. OBTENER IDs DE FAMILIAS
    const pharosFamily = await db.DeviceFamily.findOne({ where: { name: 'Pharos' } });
    const omadaFamily = await db.DeviceFamily.findOne({ where: { name: 'Omada' } });
    const unifiFamily = await db.DeviceFamily.findOne({ where: { name: 'UniFi' } });
    const airosFamily = await db.DeviceFamily.findOne({ where: { name: 'AirOS' } });
    const empMpFamily = await db.DeviceFamily.findOne({ where: { name: 'ePMP' } });
    
    // 7. CREAR IMPLEMENTACIONES DE COMANDOS
    const implementations = [
      // ===== TP-LINK PHAROS =====
      {
        commonCommandId: restartCmd.id,
        brandId: tplinkBrand.id,
        familyId: pharosFamily.id,
        type: 'SSH',
        implementation: 'reboot',
        parameters: {},
        expectedResponse: 'system is going down'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: tplinkBrand.id,
        familyId: pharosFamily.id,
        type: 'SNMP',
        implementation: '1.3.6.1.2.1.1.1.0',
        parameters: {},
        expectedResponse: 'STRING'
      },
      {
        commonCommandId: systemInfoCmd.id,
        brandId: tplinkBrand.id,
        familyId: pharosFamily.id,
        type: 'SSH',
        implementation: 'cat /proc/cpuinfo | head -5',
        parameters: {},
        expectedResponse: 'processor'
      },
      {
        commonCommandId: signalCmd.id,
        brandId: tplinkBrand.id,
        familyId: pharosFamily.id,
        type: 'SSH',
        implementation: 'iwconfig | grep "Signal level"',
        parameters: {},
        expectedResponse: 'Signal level'
      },
      
      // ===== TP-LINK OMADA =====
      {
        commonCommandId: restartCmd.id,
        brandId: tplinkBrand.id,
        familyId: omadaFamily.id,
        type: 'SSH',
        implementation: 'sudo reboot',
        parameters: {},
        expectedResponse: 'system is going down'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: tplinkBrand.id,
        familyId: omadaFamily.id,
        type: 'SNMP',
        implementation: '1.3.6.1.2.1.1.1.0',
        parameters: {},
        expectedResponse: 'STRING'
      },
      
      // ===== UBIQUITI UNIFI =====
      {
        commonCommandId: restartCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: unifiFamily.id,
        type: 'SSH',
        implementation: 'sudo reboot',
        parameters: {},
        expectedResponse: 'system is going down'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: unifiFamily.id,
        type: 'SSH',
        implementation: 'cat /etc/version',
        parameters: {},
        expectedResponse: 'version'
      },
      {
        commonCommandId: signalCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: unifiFamily.id,
        type: 'SSH',
        implementation: 'iwconfig ath0 | grep "Signal level"',
        parameters: {},
        expectedResponse: 'Signal level'
      },
      
      // ===== UBIQUITI AIROS =====
      {
        commonCommandId: restartCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: airosFamily.id,
        type: 'SSH',
        implementation: 'reboot',
        parameters: {},
        expectedResponse: 'system is going down'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: airosFamily.id,
        type: 'SSH',
        implementation: 'cat /etc/version',
        parameters: {},
        expectedResponse: 'version'
      },
      {
        commonCommandId: signalCmd.id,
        brandId: ubiquitiBrand.id,
        familyId: airosFamily.id,
        type: 'SSH',
        implementation: 'iwconfig ath0 | grep "Signal level"',
        parameters: {},
        expectedResponse: 'Signal level'
      },
      
      // ===== CAMBIUM ePMP =====
      {
        commonCommandId: restartCmd.id,
        brandId: cambiumBrand.id,
        familyId: empMpFamily.id,
        type: 'SSH',
        implementation: 'reboot',
        parameters: {},
        expectedResponse: 'Restarting system'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: cambiumBrand.id,
        familyId: empMpFamily.id,
        type: 'SNMP',
        implementation: '1.3.6.1.2.1.1.1.0',
        parameters: {},
        expectedResponse: 'STRING'
      },
      {
        commonCommandId: systemInfoCmd.id,
        brandId: cambiumBrand.id,
        familyId: empMpFamily.id,
        type: 'SSH',
        implementation: 'uptime',
        parameters: {},
        expectedResponse: 'up'
      },
      
      // ===== MIMOSA A-SERIES =====
      {
        commonCommandId: restartCmd.id,
        brandId: mimosaBrand.id,
        familyId: null, // Para toda la marca Mimosa
        type: 'SSH',
        implementation: 'reboot',
        parameters: {},
        expectedResponse: 'system is going down'
      },
      {
        commonCommandId: deviceInfoCmd.id,
        brandId: mimosaBrand.id,
        familyId: null,
        type: 'SNMP',
        implementation: '1.3.6.1.2.1.1.1.0',
        parameters: {},
        expectedResponse: 'STRING'
      },
      {
        commonCommandId: systemInfoCmd.id,
        brandId: mimosaBrand.id,
        familyId: null,
        type: 'SSH',
        implementation: 'uptime',
        parameters: {},
        expectedResponse: 'up'
      }
    ];
    
    await db.CommandImplementation.bulkCreate(implementations, { ignoreDuplicates: true });
    console.log('✅ Implementaciones de comandos creadas');
    
    // 8. CREAR OIDs SNMP ESTÁNDAR
    const snmpOids = [
      // OIDs estándar para todas las marcas
      { brandId: tplinkBrand.id, familyId: null, name: 'sysDescr', oid: '1.3.6.1.2.1.1.1.0', dataType: 'STRING', description: 'System Description' },
      { brandId: tplinkBrand.id, familyId: null, name: 'sysUpTime', oid: '1.3.6.1.2.1.1.3.0', dataType: 'TIMETICKS', description: 'System Uptime' },
      { brandId: tplinkBrand.id, familyId: null, name: 'sysName', oid: '1.3.6.1.2.1.1.5.0', dataType: 'STRING', description: 'System Name' },
      { brandId: tplinkBrand.id, familyId: null, name: 'ifNumber', oid: '1.3.6.1.2.1.2.1.0', dataType: 'INTEGER', description: 'Number of Interfaces' },
      
      { brandId: ubiquitiBrand.id, familyId: null, name: 'sysDescr', oid: '1.3.6.1.2.1.1.1.0', dataType: 'STRING', description: 'System Description' },
      { brandId: ubiquitiBrand.id, familyId: null, name: 'sysUpTime', oid: '1.3.6.1.2.1.1.3.0', dataType: 'TIMETICKS', description: 'System Uptime' },
      { brandId: ubiquitiBrand.id, familyId: null, name: 'sysName', oid: '1.3.6.1.2.1.1.5.0', dataType: 'STRING', description: 'System Name' },
      
      { brandId: cambiumBrand.id, familyId: null, name: 'sysDescr', oid: '1.3.6.1.2.1.1.1.0', dataType: 'STRING', description: 'System Description' },
      { brandId: cambiumBrand.id, familyId: null, name: 'sysUpTime', oid: '1.3.6.1.2.1.1.3.0', dataType: 'TIMETICKS', description: 'System Uptime' },
      
      { brandId: mimosaBrand.id, familyId: null, name: 'sysDescr', oid: '1.3.6.1.2.1.1.1.0', dataType: 'STRING', description: 'System Description' },
      { brandId: mimosaBrand.id, familyId: null, name: 'sysUpTime', oid: '1.3.6.1.2.1.1.3.0', dataType: 'TIMETICKS', description: 'System Uptime' }
    ];
    
    await db.SnmpOid.bulkCreate(snmpOids, { ignoreDuplicates: true });
    console.log('✅ OIDs SNMP creados');
    
    console.log('🎉 ¡Población de comandos completada exitosamente!');
    
    // Mostrar resumen
    const brandCount = await db.DeviceBrand.count();
    const familyCount = await db.DeviceFamily.count();
    const commandCount = await db.CommonCommand.count();
    const implementationCount = await db.CommandImplementation.count();
    const oidCount = await db.SnmpOid.count();
    
    console.log('\n📊 RESUMEN:');
    console.log(`   • ${brandCount} marcas creadas`);
    console.log(`   • ${familyCount} familias de dispositivos`);
    console.log(`   • ${commandCount} comandos comunes`);
    console.log(`   • ${implementationCount} implementaciones de comandos`);
    console.log(`   • ${oidCount} OIDs SNMP`);
    
  } catch (error) {
    console.error('❌ Error poblando comandos:', error);
    throw error;
  }
}

module.exports = { populateDeviceCommands };

// Si se ejecuta directamente
if (require.main === module) {
  populateDeviceCommands()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}