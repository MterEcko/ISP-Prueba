// backend/src/seeders/20240101-device-commands.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const commands = [
      // ========== TP-LINK CPE COMMANDS ==========
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'get_device_info',
        description: 'Obtener información básica del dispositivo',
        category: 'system',
        snmpOid: '1.3.6.1.2.1.1.1.0', // sysDescr
        snmpMode: 'get',
        snmpDataType: 'STRING',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'get_system_uptime',
        description: 'Obtener tiempo de actividad del sistema',
        category: 'monitoring',
        snmpOid: '1.3.6.1.2.1.1.3.0', // sysUpTime
        snmpMode: 'get',
        snmpDataType: 'TimeTicks',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'get_metric_signal_strength',
        description: 'Obtener nivel de señal (RSSI)',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.11863.6.56.1.2.1.1.8.1', // TP-Link specific RSSI OID
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'restart',
        description: 'Reiniciar dispositivo',
        category: 'maintenance',
        sshCommand: 'reboot',
        requiresConfirmation: true,
        affectsService: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'get_interfaces',
        description: 'Obtener información de interfaces',
        category: 'network',
        sshCommand: 'ifconfig',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'get_connected_clients',
        description: 'Obtener clientes conectados',
        category: 'network',
        sshCommand: 'iwinfo ath0 assoclist',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== TP-LINK SWITCH COMMANDS ==========
      {
        brand: 'tplink',
        deviceType: 'switch',
        commandName: 'get_device_info',
        description: 'Obtener información del switch',
        category: 'system',
        snmpOid: '1.3.6.1.2.1.1.1.0',
        snmpMode: 'get',
        snmpDataType: 'STRING',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'tplink',
        deviceType: 'switch',
        commandName: 'get_port_status',
        description: 'Obtener estado de puertos',
        category: 'network',
        snmpOid: '1.3.6.1.2.1.2.2.1.8', // ifOperStatus
        snmpMode: 'walk',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== CAMBIUM CPE COMMANDS ==========
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'get_device_info',
        description: 'Obtener información del dispositivo',
        category: 'system',
        snmpOid: '1.3.6.1.2.1.1.1.0',
        snmpMode: 'get',
        snmpDataType: 'STRING',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'get_metric_signal_strength',
        description: 'Obtener RSSI',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.17713.21.3.4.2.2.0', // Cambium RSSI OID
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'get_metric_snr',
        description: 'Obtener SNR (Signal to Noise Ratio)',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.17713.21.3.4.2.3.0', // Cambium SNR OID
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'restart',
        description: 'Reiniciar dispositivo',
        category: 'maintenance',
        sshCommand: 'reboot',
        requiresConfirmation: true,
        affectsService: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'get_ethernet_status',
        description: 'Obtener estado del puerto ethernet',
        category: 'network',
        snmpOid: '1.3.6.1.4.1.17713.21.1.2.30.0',
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== MIMOSA CPE COMMANDS ==========
      {
        brand: 'mimosa',
        deviceType: 'cpe',
        commandName: 'get_device_info',
        description: 'Obtener información del dispositivo',
        category: 'system',
        snmpOid: '1.3.6.1.2.1.1.1.0',
        snmpMode: 'get',
        snmpDataType: 'STRING',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'mimosa',
        deviceType: 'cpe',
        commandName: 'get_metric_signal_strength',
        description: 'Obtener nivel de señal RX',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.43356.2.1.2.1.6.0', // Mimosa RX Power
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'mimosa',
        deviceType: 'cpe',
        commandName: 'get_metric_tx_power',
        description: 'Obtener potencia de transmisión',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.43356.2.1.2.1.8.0', // Mimosa TX Power
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'mimosa',
        deviceType: 'cpe',
        commandName: 'restart',
        description: 'Reiniciar dispositivo',
        category: 'maintenance',
        sshCommand: 'reboot',
        requiresConfirmation: true,
        affectsService: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== UBIQUITI CPE COMMANDS ==========
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'get_device_info',
        description: 'Obtener información del dispositivo',
        category: 'system',
        sshCommand: 'cat /etc/board.info',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'get_system_status',
        description: 'Obtener estado del sistema',
        category: 'monitoring',
        sshCommand: 'mca-status',
        responseParser: 'json',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'get_metric_signal_strength',
        description: 'Obtener nivel de señal',
        category: 'monitoring',
        sshCommand: 'iwconfig ath0 | grep "Signal level"',
        responseParser: '/Signal level[=:](-?\\d+)/',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'get_wireless_status',
        description: 'Obtener estado wireless',
        category: 'network',
        sshCommand: 'wstalist',
        responseParser: 'json',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'restart',
        description: 'Reiniciar dispositivo',
        category: 'maintenance',
        sshCommand: 'reboot',
        requiresConfirmation: true,
        affectsService: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'get_interfaces',
        description: 'Obtener información de interfaces',
        category: 'network',
        sshCommand: 'ifconfig',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== COMANDOS GENÉRICOS PARA ANTENAS ==========
      {
        brand: 'ubiquiti',
        deviceType: 'antenna',
        commandName: 'get_device_info',
        description: 'Obtener información de la antena',
        category: 'system',
        sshCommand: 'cat /etc/version',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'antenna',
        commandName: 'get_metric_temperature',
        description: 'Obtener temperatura del dispositivo',
        category: 'monitoring',
        snmpOid: '1.3.6.1.4.1.41112.1.4.7.1.3.1', // Ubiquiti temperature OID
        snmpMode: 'get',
        snmpDataType: 'INTEGER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== COMANDOS PARA SWITCHES ADMINISTRABLES ==========
      {
        brand: 'ubiquiti',
        deviceType: 'switch',
        commandName: 'get_device_info',
        description: 'Obtener información del switch',
        category: 'system',
        snmpOid: '1.3.6.1.2.1.1.1.0',
        snmpMode: 'get',
        snmpDataType: 'STRING',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'switch',
        commandName: 'get_port_statistics',
        description: 'Obtener estadísticas de puertos',
        category: 'monitoring',
        snmpOid: '1.3.6.1.2.1.2.2.1',
        snmpMode: 'walk',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'switch',
        commandName: 'get_vlan_config',
        description: 'Obtener configuración de VLANs',
        category: 'network',
        sshCommand: 'show vlan',
        responseParser: 'lines',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ========== COMANDOS PARA BACKUP Y CONFIGURACIÓN ==========
      {
        brand: 'tplink',
        deviceType: 'cpe',
        commandName: 'backup_config',
        description: 'Crear backup de configuración',
        category: 'maintenance',
        sshCommand: 'cfg export /tmp/backup.cfg && cat /tmp/backup.cfg',
        responseParser: 'raw',
        requiresConfirmation: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'cambium',
        deviceType: 'cpe',
        commandName: 'backup_config',
        description: 'Crear backup de configuración',
        category: 'maintenance',
        sshCommand: 'config show',
        responseParser: 'raw',
        requiresConfirmation: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        brand: 'ubiquiti',
        deviceType: 'cpe',
        commandName: 'backup_config',
        description: 'Crear backup de configuración',
        category: 'maintenance',
        sshCommand: 'cat /tmp/system.cfg',
        responseParser: 'raw',
        requiresConfirmation: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('DeviceCommands', commands, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('DeviceCommands', null, {});
  }
};