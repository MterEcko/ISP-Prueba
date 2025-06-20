// backend/src/models/deviceCommand.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const DeviceCommand = sequelize.define('DeviceCommand', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    brand: {
      type: Sequelize.ENUM('tplink', 'cambium', 'mimosa', 'ubiquiti', 'mikrotik', 'huawei', 'zte', 'other'),
      allowNull: false
    },
    deviceType: {
      type: Sequelize.ENUM('cpe', 'antenna', 'switch', 'router', 'ont', 'olt', 'other'),
      allowNull: false
    },
    commandName: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    // Comandos SSH
    sshCommand: {
      type: Sequelize.TEXT
    },
    // Comandos SNMP
    snmpOid: {
      type: Sequelize.STRING
    },
    snmpMode: {
      type: Sequelize.ENUM('get', 'set', 'walk'),
      defaultValue: 'get'
    },
    snmpDataType: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Tipo de datos SNMP (string, integer, gauge, counter, etc.)'
    },
    // Procesamiento de respuestas
    responseParser: {
      type: Sequelize.TEXT
    },
    expectedResponse: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Patrón de respuesta esperada para validación'
    },
    // Control de ejecución
    requiresConfirmation: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    affectsService: {
      type: Sequelize.BOOLEAN,
      //allowNull: false,
      defaultValue: false,
      comment: 'Indica si el comando afecta el servicio del cliente'
    },
    permissionLevel: {
      type: Sequelize.INTEGER,
      //allowNull: false,
      defaultValue: 1,
      comment: 'Nivel de permisos requerido (1=básico, 2=medio, 3=crítico)'
    },
    // Configuración técnica
    commandType: {
      type: Sequelize.ENUM('ssh', 'snmp', 'api', 'hybrid'),
      //allowNull: false,
      defaultValue: 'snmp'
      //comment: 'Tipo de conexión para ejecutar el comando'
    },
    parameters: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON con definición de parámetros del comando'
    },
    script: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Script complejo si el comando lo requiere'
    },
    errorHandling: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON para manejo de errores específicos'
    },
    timeout: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: 'Timeout en segundos para la ejecución'
    },
    retries: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número de reintentos en caso de fallo'
    },
    // Clasificación y compatibilidad
    active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true
    },
    category: {
      type: Sequelize.ENUM('system', 'information', 'maintenance', 'network', 'wireless', 'monitoring', 'diagnostic'),
      allowNull: false
    },
    family: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Familia específica del dispositivo (Pharos, Omada, RouterOS, etc.)'
    },
    version: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Versión específica de firmware/software compatible'
    },
    priority: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Prioridad de ejecución (1=alta, 10=baja)'
    },
    tags: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Tags JSON para clasificación y búsqueda'
    },
    documentation: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Documentación técnica del comando'
    },
    // Métricas y monitoreo
    lastTested: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Última fecha de prueba del comando'
    },
    successRate: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 100.0,
      comment: 'Porcentaje de éxito del comando'
    }
  }, {
    tableName: 'DeviceCommands',
    timestamps: true
  });

  return DeviceCommand;
};
