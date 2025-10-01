import axios from 'axios';
import authHeader from './auth-header';
import { API_URL } from './frontend_apiConfig';

class BackupService {


  /**
   * Obtiene la lista de backups disponibles
   * @param {string} type - Tipo de backup (database, config, full, all)
   * @returns {Promise} - Promesa con la lista de backups
   */
  getBackupsList(type = 'all') {
    return axios.get(
      `${API_URL}/backups?type=${type}`,
      { headers: authHeader() }
    );
  }

  /**
   * Limpia backups antiguos según criterios
   * @param {number} keepLast - Número de backups recientes a mantener
   * @param {number} olderThan - Eliminar backups más antiguos que esta cantidad de días
   * @param {string} type - Tipo de backup a limpiar (database, config, full, all)
   * @returns {Promise} - Promesa con el resultado de la limpieza
   */
  cleanupOldBackups(keepLast = 5, olderThan = 30, type = 'all') {
    return axios.post(
      `${API_URL}/backups/cleanup`,
      { keepLast, olderThan, type },
      { headers: authHeader() }
    );
  }

  /**
   * Crea un backup de la base de datos
   * @param {string} description - Descripción opcional del backup
   * @returns {Promise} - Promesa con el resultado de la creación del backup
   */
  createDatabaseBackup(description = '') {
    return axios.post(
      `${API_URL}backups/database`,
      { description },
      { headers: authHeader() }
    );
  }

  /**
   * Crea un backup de las configuraciones del sistema
   * @param {string} description - Descripción opcional del backup
   * @returns {Promise} - Promesa con el resultado de la creación del backup
   */
  createConfigBackup(description = '') {
    return axios.post(
      `${API_URL}backups/config`,
      { description },
      { headers: authHeader() }
    );
  }

  /**
   * Crea un backup completo del sistema
   * @param {string} description - Descripción opcional del backup
   * @returns {Promise} - Promesa con el resultado de la creación del backup
   */
  createFullBackup(description = '') {
    return axios.post(
      `${API_URL}backups/full`,
      { description },
      { headers: authHeader() }
    );
  }



  /**
   * Restaura un backup de base de datos
   * @param {number} backupId - ID del backup a restaurar
   * @returns {Promise} - Promesa con el resultado de la restauración
   */
  restoreDatabaseBackup(backupId) {
    return axios.post(
      `${API_URL}backups/database/${backupId}/restore`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Restaura un backup de configuración
   * @param {number} backupId - ID del backup a restaurar
   * @returns {Promise} - Promesa con el resultado de la restauración
   */
  restoreConfigBackup(backupId) {
    return axios.post(
      `${API_URL}backups/config/${backupId}/restore`,
      {},
      { headers: authHeader() }
    );
  }

  /**
   * Elimina un backup
   * @param {number} backupId - ID del backup a eliminar
   * @returns {Promise} - Promesa con el resultado de la eliminación
   */
  deleteBackup(backupId) {
    return axios.delete(
      `${API_URL}backups/${backupId}`,
      { headers: authHeader() }
    );
  }



  /**
   * Descarga un archivo de backup
   * @param {number} backupId - ID del backup a descargar
   * @returns {Promise} - Promesa con el archivo de backup
   */
  downloadBackup(backupId) {
    return axios.get(
      `${API_URL}backups/${backupId}/download`,
      { 
        headers: authHeader(),
        responseType: 'blob'
      }
    );
  }
}

export default new BackupService();
