/**
 * Controlador para la gestión de backups del sistema
 * 
 * Este controlador maneja las operaciones relacionadas con la creación,
 * restauración y gestión de backups de la base de datos y configuraciones.
 */

const backupService = require('../services/backup.service');

/**
 * Crea un backup de la base de datos
 */
exports.createDatabaseBackup = async (req, res) => {
  try {
    const { description } = req.body;
    
    const result = await backupService.createDatabaseBackup(description);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al crear backup de base de datos:', error);
    return res.status(500).send({
      message: error.message || 'Error al crear backup de base de datos'
    });
  }
};

/**
 * Crea un backup de las configuraciones del sistema
 */
exports.createConfigBackup = async (req, res) => {
  try {
    const { description } = req.body;
    
    const result = await backupService.createConfigBackup(description);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al crear backup de configuración:', error);
    return res.status(500).send({
      message: error.message || 'Error al crear backup de configuración'
    });
  }
};

/**
 * Crea un backup completo del sistema
 */
exports.createFullBackup = async (req, res) => {
  try {
    const { description } = req.body;
    
    const result = await backupService.createFullBackup(description);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al crear backup completo:', error);
    return res.status(500).send({
      message: error.message || 'Error al crear backup completo'
    });
  }
};

/**
 * Obtiene la lista de backups disponibles
 */
exports.getBackupsList = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    
    const backups = await backupService.getBackupsList(type);
    
    return res.send(backups);
  } catch (error) {
    console.error('Error al obtener lista de backups:', error);
    return res.status(500).send({
      message: error.message || 'Error al obtener lista de backups'
    });
  }
};

/**
 * Restaura un backup de base de datos
 */
exports.restoreDatabaseBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const result = await backupService.restoreDatabaseBackup(backupId);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al restaurar backup de base de datos:', error);
    return res.status(500).send({
      message: error.message || 'Error al restaurar backup de base de datos'
    });
  }
};

/**
 * Restaura un backup de configuración
 */
exports.restoreConfigBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const result = await backupService.restoreConfigBackup(backupId);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al restaurar backup de configuración:', error);
    return res.status(500).send({
      message: error.message || 'Error al restaurar backup de configuración'
    });
  }
};

/**
 * Elimina un backup
 */
exports.deleteBackup = async (req, res) => {
  try {
    const { backupId } = req.params;
    
    const result = await backupService.deleteBackup(backupId);
    
    return res.send(result);
  } catch (error) {
    console.error('Error al eliminar backup:', error);
    return res.status(500).send({
      message: error.message || 'Error al eliminar backup'
    });
  }
};

/**
 * Limpia backups antiguos según criterios
 */
exports.cleanupOldBackups = async (req, res) => {
  try {
    const { keepLast, olderThan, type } = req.body;
    
    const result = await backupService.cleanupOldBackups({
      keepLast: parseInt(keepLast) || 5,
      olderThan: parseInt(olderThan) || 30,
      type: type || 'all'
    });
    
    return res.send(result);
  } catch (error) {
    console.error('Error al limpiar backups antiguos:', error);
    return res.status(500).send({
      message: error.message || 'Error al limpiar backups antiguos'
    });
  }
};
