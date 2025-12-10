// Comandos básicos para todos los equipos
const commands = [
  // TP-Link CPE
  {
    brand: 'tplink',
    deviceType: 'cpe',
    commandName: 'get_device_info',
    description: 'Obtener información del dispositivo',
    sshCommand: 'show system-info',
    responseParser: 'lines'
  },
  {
    brand: 'tplink',
    deviceType: 'cpe',
    commandName: 'get_signal_strength',
    description: 'Obtener nivel de señal',
    snmpOid: '1.3.6.1.4.1.11863.6.56.1.2.1.1.8',
    snmpMode: 'get'
  },
  {
    brand: 'tplink',
    deviceType: 'cpe',
    commandName: 'restart',
    description: 'Reiniciar dispositivo',
    sshCommand: 'system reboot',
    requiresConfirmation: true
  },
  
  // Cambium ePMP
  {
    brand: 'cambium',
    deviceType: 'cpe',
    commandName: 'get_device_info',
    description: 'Obtener información del dispositivo',
    snmpOid: '1.3.6.1.2.1.1.1.0',
    snmpMode: 'get'
  },
  {
    brand: 'cambium',
    deviceType: 'cpe',
    commandName: 'get_signal_strength',
    description: 'Obtener RSSI',
    snmpOid: '1.3.6.1.4.1.17713.21.3.4.2.2.0',
    snmpMode: 'get'
  },
  
  // Más comandos...
];