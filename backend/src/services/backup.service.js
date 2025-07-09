/**
 * Servicio para la gestión de backups del sistema
 * 
 * Este servicio maneja la creación, restauración y gestión de backups
 * de la base de datos y configuraciones del sistema.
 */

const db = require('../models');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const SystemConfiguration = db.SystemConfiguration;

// Directorio base para almacenar backups
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');

/**
 * Crea un backup de la base de datos
 * @param {string} description - Descripción opcional del backup
 * @returns {Promise<Object>} - Información del backup creado
 */
exports.createDatabaseBackup = async (description = '') => {
  try {
    // Asegurar que el directorio de backups existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Crear subdirectorio para backups de base de datos
    const dbBackupDir = path.join(BACKUP_DIR, 'database');
    if (!fs.existsSync(dbBackupDir)) {
      fs.mkdirSync(dbBackupDir, { recursive: true });
    }
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `db_backup_${timestamp}.sql`;
    const backupFilePath = path.join(dbBackupDir, backupFileName);
    
    // Obtener configuración de la base de datos
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = require('../config/db.config')[env];
    
    let command;
    
    if (dbConfig.dialect === 'postgres') {
      // Comando para PostgreSQL
      command = `PGPASSWORD=${dbConfig.password} pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -F p > ${backupFilePath}`;
    } else if (dbConfig.dialect === 'mysql') {
      // Comando para MySQL
      command = `mysqldump -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} > ${backupFilePath}`;
    } else if (dbConfig.dialect === 'sqlite') {
      // Comando para SQLite
      command = `sqlite3 ${dbConfig.storage} .dump > ${backupFilePath}`;
    } else {
      throw new Error(`Dialecto de base de datos no soportado: ${dbConfig.dialect}`);
    }
    
    // Ejecutar comando de backup
    await execPromise(command);
    
    // Verificar que el archivo se creó correctamente
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('El archivo de backup no se creó correctamente');
    }
    
    // Obtener tamaño del archivo
    const stats = fs.statSync(backupFilePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Registrar el backup en la base de datos
    const backupRecord = await db.SystemConfiguration.create({
      key: `backup_${timestamp}`,
      value: backupFilePath,
      description: description || `Backup de base de datos creado el ${new Date().toLocaleString()}`,
      metadata: JSON.stringify({
        type: 'database',
        timestamp,
        size: fileSizeInBytes,
        dialect: dbConfig.dialect
      })
    });
    
    return {
      success: true,
      message: `Backup de base de datos creado correctamente: ${backupFileName}`,
      path: backupFilePath,
      size: fileSizeInMB + ' MB',
      timestamp,
      id: backupRecord.id
    };
  } catch (error) {
    console.error('Error al crear backup de base de datos:', error);
    throw error;
  }
};

/**
 * Crea un backup de las configuraciones del sistema
 * @param {string} description - Descripción opcional del backup
 * @returns {Promise<Object>} - Información del backup creado
 */
exports.createConfigBackup = async (description = '') => {
  try {
    // Asegurar que el directorio de backups existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Crear subdirectorio para backups de configuración
    const configBackupDir = path.join(BACKUP_DIR, 'config');
    if (!fs.existsSync(configBackupDir)) {
      fs.mkdirSync(configBackupDir, { recursive: true });
    }
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `config_backup_${timestamp}.json`;
    const backupFilePath = path.join(configBackupDir, backupFileName);
    
    // Obtener todas las configuraciones del sistema
    const configurations = await SystemConfiguration.findAll();
    
    // Obtener configuración de plugins
    const plugins = await db.SystemPlugin.findAll();
    
    // Obtener configuración de pasarelas de pago
    const paymentGateways = await db.PaymentGateway.findAll();
    
    // Crear objeto de backup
    const backupData = {
      timestamp,
      systemConfigurations: configurations.map(config => ({
        key: config.key,
        value: config.value,
        description: config.description,
        metadata: config.metadata
      })),
      plugins: plugins.map(plugin => ({
        name: plugin.name,
        displayName: plugin.displayName,
        description: plugin.description,
        version: plugin.version,
        status: plugin.status,
        type: plugin.type,
        config: plugin.config
      })),
      paymentGateways: paymentGateways.map(gateway => ({
        name: gateway.name,
        pluginName: gateway.pluginName,
        isActive: gateway.isActive,
        config: gateway.config
      }))
    };
    
    // Guardar archivo de backup
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    
    // Verificar que el archivo se creó correctamente
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('El archivo de backup no se creó correctamente');
    }
    
    // Obtener tamaño del archivo
    const stats = fs.statSync(backupFilePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Registrar el backup en la base de datos
    const backupRecord = await db.SystemConfiguration.create({
      key: `config_backup_${timestamp}`,
      value: backupFilePath,
      description: description || `Backup de configuración creado el ${new Date().toLocaleString()}`,
      metadata: JSON.stringify({
        type: 'config',
        timestamp,
        size: fileSizeInBytes,
        items: {
          configurations: configurations.length,
          plugins: plugins.length,
          paymentGateways: paymentGateways.length
        }
      })
    });
    
    return {
      success: true,
      message: `Backup de configuración creado correctamente: ${backupFileName}`,
      path: backupFilePath,
      size: fileSizeInMB + ' MB',
      timestamp,
      id: backupRecord.id
    };
  } catch (error) {
    console.error('Error al crear backup de configuración:', error);
    throw error;
  }
};

/**
 * Crea un backup completo del sistema (base de datos y configuraciones)
 * @param {string} description - Descripción opcional del backup
 * @returns {Promise<Object>} - Información del backup creado
 */
exports.createFullBackup = async (description = '') => {
  try {
    // Crear backup de base de datos
    const dbBackup = await this.createDatabaseBackup(`Parte de backup completo: ${description}`);
    
    // Crear backup de configuración
    const configBackup = await this.createConfigBackup(`Parte de backup completo: ${description}`);
    
    // Asegurar que el directorio de backups existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Crear subdirectorio para backups completos
    const fullBackupDir = path.join(BACKUP_DIR, 'full');
    if (!fs.existsSync(fullBackupDir)) {
      fs.mkdirSync(fullBackupDir, { recursive: true });
    }
    
    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `full_backup_${timestamp}.tar.gz`;
    const backupFilePath = path.join(fullBackupDir, backupFileName);
    
    // Crear archivo tar.gz con ambos backups
    const command = `tar -czf ${backupFilePath} -C ${path.dirname(dbBackup.path)} ${path.basename(dbBackup.path)} -C ${path.dirname(configBackup.path)} ${path.basename(configBackup.path)}`;
    await execPromise(command);
    
    // Verificar que el archivo se creó correctamente
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('El archivo de backup completo no se creó correctamente');
    }
    
    // Obtener tamaño del archivo
    const stats = fs.statSync(backupFilePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    
    // Registrar el backup en la base de datos
    const backupRecord = await db.SystemConfiguration.create({
      key: `full_backup_${timestamp}`,
      value: backupFilePath,
      description: description || `Backup completo creado el ${new Date().toLocaleString()}`,
      metadata: JSON.stringify({
        type: 'full',
        timestamp,
        size: fileSizeInBytes,
        components: {
          database: dbBackup.id,
          config: configBackup.id
        }
      })
    });
    
    return {
      success: true,
      message: `Backup completo creado correctamente: ${backupFileName}`,
      path: backupFilePath,
      size: fileSizeInMB + ' MB',
      timestamp,
      id: backupRecord.id,
      components: {
        database: dbBackup,
        config: configBackup
      }
    };
  } catch (error) {
    console.error('Error al crear backup completo:', error);
    throw error;
  }
};

/**
 * Obtiene la lista de backups disponibles
 * @param {string} type - Tipo de backup (database, config, full, all)
 * @returns {Promise<Array>} - Lista de backups
 */
exports.getBackupsList = async (type = 'all') => {
  try {
    let whereClause = {};
    
    if (type !== 'all') {
      whereClause = {
        key: {
          [db.Sequelize.Op.like]: `${type}_backup_%`
        }
      };
    } else {
      whereClause = {
        key: {
          [db.Sequelize.Op.or]: [
            { [db.Sequelize.Op.like]: 'db_backup_%' },
            { [db.Sequelize.Op.like]: 'config_backup_%' },
            { [db.Sequelize.Op.like]: 'full_backup_%' }
          ]
        }
      };
    }
    
    const backups = await SystemConfiguration.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    return backups.map(backup => {
      let metadata = {};
      try {
        metadata = JSON.parse(backup.metadata || '{}');
      } catch (e) {
        console.error('Error al parsear metadata:', e);
      }
      
      return {
        id: backup.id,
        key: backup.key,
        path: backup.value,
        description: backup.description,
        type: metadata.type || 'unknown',
        timestamp: metadata.timestamp || '',
        size: metadata.size ? (metadata.size / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown',
        createdAt: backup.createdAt,
        metadata
      };
    });
  } catch (error) {
    console.error('Error al obtener lista de backups:', error);
    throw error;
  }
};

/**
 * Restaura un backup de base de datos
 * @param {number} backupId - ID del backup a restaurar
 * @returns {Promise<Object>} - Resultado de la restauración
 */
exports.restoreDatabaseBackup = async (backupId) => {
  try {
    // Obtener información del backup
    const backup = await SystemConfiguration.findByPk(backupId);
    
    if (!backup) {
      throw new Error(`Backup con ID ${backupId} no encontrado`);
    }
    
    let metadata = {};
    try {
      metadata = JSON.parse(backup.metadata || '{}');
    } catch (e) {
      console.error('Error al parsear metadata:', e);
    }
    
    if (metadata.type !== 'database') {
      throw new Error(`El backup con ID ${backupId} no es un backup de base de datos`);
    }
    
    const backupFilePath = backup.value;
    
    // Verificar que el archivo existe
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`El archivo de backup no existe: ${backupFilePath}`);
    }
    
    // Obtener configuración de la base de datos
    const env = process.env.NODE_ENV || 'development';
    const dbConfig = require('../config/db.config')[env];
    
    let command;
    
    if (dbConfig.dialect === 'postgres') {
      // Comando para PostgreSQL
      command = `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} < ${backupFilePath}`;
    } else if (dbConfig.dialect === 'mysql') {
      // Comando para MySQL
      command = `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p${dbConfig.password} ${dbConfig.database} < ${backupFilePath}`;
    } else if (dbConfig.dialect === 'sqlite') {
      // Para SQLite, primero crear un backup del archivo actual
      const currentDbPath = dbConfig.storage;
      const backupDbPath = `${currentDbPath}.bak.${Date.now()}`;
      fs.copyFileSync(currentDbPath, backupDbPath);
      
      // Restaurar desde el backup
      command = `sqlite3 ${currentDbPath} < ${backupFilePath}`;
    } else {
      throw new Error(`Dialecto de base de datos no soportado: ${dbConfig.dialect}`);
    }
    
    // Ejecutar comando de restauración
    await execPromise(command);
    
    return {
      success: true,
      message: `Backup de base de datos restaurado correctamente desde: ${path.basename(backupFilePath)}`,
      backupId,
      timestamp: metadata.timestamp || backup.createdAt.toISOString()
    };
  } catch (error) {
    console.error('Error al restaurar backup de base de datos:', error);
    throw error;
  }
};

/**
 * Restaura un backup de configuración
 * @param {number} backupId - ID del backup a restaurar
 * @returns {Promise<Object>} - Resultado de la restauración
 */
exports.restoreConfigBackup = async (backupId) => {
  try {
    // Obtener información del backup
    const backup = await SystemConfiguration.findByPk(backupId);
    
    if (!backup) {
      throw new Error(`Backup con ID ${backupId} no encontrado`);
    }
    
    let metadata = {};
    try {
      metadata = JSON.parse(backup.metadata || '{}');
    } catch (e) {
      console.error('Error al parsear metadata:', e);
    }
    
    if (metadata.type !== 'config') {
      throw new Error(`El backup con ID ${backupId} no es un backup de configuración`);
    }
    
    const backupFilePath = backup.value;
    
    // Verificar que el archivo existe
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`El archivo de backup no existe: ${backupFilePath}`);
    }
    
    // Leer archivo de backup
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    
    // Restaurar configuraciones del sistema
    if (backupData.systemConfigurations && Array.isArray(backupData.systemConfigurations)) {
      for (const config of backupData.systemConfigurations) {
        // No restaurar configuraciones de backup
        if (config.key.includes('_backup_')) {
          continue;
        }
        
        await SystemConfiguration.upsert({
          key: config.key,
          value: config.value,
          description: config.description,
          metadata: config.metadata
        });
      }
    }
    
    // Restaurar plugins
    if (backupData.plugins && Array.isArray(backupData.plugins)) {
      for (const plugin of backupData.plugins) {
        await db.SystemPlugin.upsert({
          name: plugin.name,
          displayName: plugin.displayName,
          description: plugin.description,
          version: plugin.version,
          status: plugin.status,
          type: plugin.type,
          config: plugin.config
        });
      }
    }
    
    // Restaurar pasarelas de pago
    if (backupData.paymentGateways && Array.isArray(backupData.paymentGateways)) {
      for (const gateway of backupData.paymentGateways) {
        await db.PaymentGateway.upsert({
          name: gateway.name,
          pluginName: gateway.pluginName,
          isActive: gateway.isActive,
          config: gateway.config
        });
      }
    }
    
    return {
      success: true,
      message: `Backup de configuración restaurado correctamente desde: ${path.basename(backupFilePath)}`,
      backupId,
      timestamp: metadata.timestamp || backup.createdAt.toISOString(),
      itemsRestored: {
        configurations: backupData.systemConfigurations ? backupData.systemConfigurations.length : 0,
        plugins: backupData.plugins ? backupData.plugins.length : 0,
        paymentGateways: backupData.paymentGateways ? backupData.paymentGateways.length : 0
      }
    };
  } catch (error) {
    console.error('Error al restaurar backup de configuración:', error);
    throw error;
  }
};

/**
 * Elimina un backup
 * @param {number} backupId - ID del backup a eliminar
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
exports.deleteBackup = async (backupId) => {
  try {
    // Obtener información del backup
    const backup = await SystemConfiguration.findByPk(backupId);
    
    if (!backup) {
      throw new Error(`Backup con ID ${backupId} no encontrado`);
    }
    
    const backupFilePath = backup.value;
    
    // Verificar que el archivo existe
    if (fs.existsSync(backupFilePath)) {
      // Eliminar archivo
      fs.unlinkSync(backupFilePath);
    }
    
    // Eliminar registro de la base de datos
    await backup.destroy();
    
    return {
      success: true,
      message: `Backup eliminado correctamente: ${backup.key}`,
      backupId
    };
  } catch (error) {
    console.error('Error al eliminar backup:', error);
    throw error;
  }
};

/**
 * Limpia backups antiguos según criterios
 * @param {Object} options - Opciones de limpieza
 * @param {number} options.keepLast - Número de backups recientes a mantener
 * @param {number} options.olderThan - Eliminar backups más antiguos que esta cantidad de días
 * @param {string} options.type - Tipo de backup a limpiar (database, config, full, all)
 * @returns {Promise<Object>} - Resultado de la limpieza
 */
exports.cleanupOldBackups = async (options = {}) => {
  try {
    const { keepLast = 5, olderThan = 30, type = 'all' } = options;
    
    let whereClause = {};
    
    if (type !== 'all') {
      whereClause = {
        key: {
          [db.Sequelize.Op.like]: `${type}_backup_%`
        }
      };
    } else {
      whereClause = {
        key: {
          [db.Sequelize.Op.or]: [
            { [db.Sequelize.Op.like]: 'db_backup_%' },
            { [db.Sequelize.Op.like]: 'config_backup_%' },
            { [db.Sequelize.Op.like]: 'full_backup_%' }
          ]
        }
      };
    }
    
    // Obtener todos los backups del tipo especificado
    const backups = await SystemConfiguration.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Separar backups a mantener y a eliminar
    const backupsToKeep = backups.slice(0, keepLast);
    let backupsToDelete = backups.slice(keepLast);
    
    // Filtrar por antigüedad
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThan);
    
    backupsToDelete = backupsToDelete.filter(backup => backup.createdAt < cutoffDate);
    
    // Eliminar backups
    const deletedBackups = [];
    for (const backup of backupsToDelete) {
      const backupFilePath = backup.value;
      
      // Verificar que el archivo existe
      if (fs.existsSync(backupFilePath)) {
        // Eliminar archivo
        fs.unlinkSync(backupFilePath);
      }
      
      // Eliminar registro de la base de datos
      await backup.destroy();
      
      deletedBackups.push({
        id: backup.id,
        key: backup.key,
        path: backup.value,
        createdAt: backup.createdAt
      });
    }
    
    return {
      success: true,
      message: `Se eliminaron ${deletedBackups.length} backups antiguos`,
      deleted: deletedBackups.length,
      kept: backupsToKeep.length,
      deletedBackups
    };
  } catch (error) {
    console.error('Error al limpiar backups antiguos:', error);
    throw error;
  }
};
