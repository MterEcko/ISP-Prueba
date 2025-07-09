/**
 * Rutas para la gestión de backups del sistema
 */
module.exports = function(app) {
  const backupController = require('../controllers/backup.controller');
  const { authJwt } = require('../middleware');
  


  // Obtener lista de backups
  app.get(
    '/api/backups',
    //[authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.getBackupsList
  );
  
    // Limpiar backups antiguos
  app.post(
    '/api/backups/cleanup',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.cleanupOldBackups
  );
  // Crear backup de base de datos
  app.post(
    '/api/backups/database',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.createDatabaseBackup
  );
  
  // Crear backup de configuración
  app.post(
    '/api/backups/config',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.createConfigBackup
  );
  
  // Crear backup completo
  app.post(
    '/api/backups/full',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.createFullBackup
  );
  

  
  // Restaurar backup de base de datos
  app.post(
    '/api/backups/database/:backupId/restore',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.restoreDatabaseBackup
  );
  
  // Restaurar backup de configuración
  app.post(
    '/api/backups/config/:backupId/restore',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.restoreConfigBackup
  );
  

  
  // Eliminar backup
  app.delete(
    '/api/backups/:backupId',
    [authJwt.verifyToken, authJwt.checkPermission('manage_system')],
    backupController.deleteBackup
  );
  

};
